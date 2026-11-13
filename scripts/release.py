"""Publish a checked immutable release using stdlib and GITHUB_TOKEN; no external Actions."""
import argparse
import ast
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]


def version_tuple(value):
    match = re.fullmatch(r"v?(\d+)\.(\d+)\.(\d+)", value)
    if not match:
        raise ValueError("Version must be X.Y.Z")
    return tuple(map(int, match.groups()))


def validate_versions(root):
    manifest = json.loads((root / 'custom_components/pv_lab/manifest.json').read_text(encoding='utf-8'))
    version = manifest['version']
    version_tuple(version)
    package = json.loads((root / 'pv_lab/package.json').read_text(encoding='utf-8'))
    config = (root / 'pv_lab/config.yaml').read_text(encoding='utf-8')
    app = (root / 'pv_lab/src/version.mjs').read_text(encoding='utf-8')
    constants = ast.parse((root / 'custom_components/pv_lab/const.py').read_text(encoding='utf-8'))
    native = next(node.value.value for node in constants.body if isinstance(node, ast.Assign) and getattr(node.targets[0], 'id', '') == 'VERSION')
    if package['version'] != version or native != version or not re.search(r'^version:\s*["\x27]?' + re.escape(version) + r'["\x27]?\s*$', config, re.M) or not re.search(r"APP_VERSION\s*=\s*['\"]" + re.escape(version) + r"['\"]", app):
        raise ValueError('App and integration versions must match before release')
    notes = [(root / path).read_text(encoding='utf-8') for path in ('CHANGELOG.md', 'pv_lab/CHANGELOG.md', 'custom_components/pv_lab/CHANGELOG.md')]
    if len(set(notes)) != 1 or not notes[0].startswith('# ' + version + '\n'):
        raise ValueError('Release notes must match across app, integration and repository, and include the current version')
    if manifest.get('integration_type') != 'service':
        raise ValueError('Energy forecast integration must be a service')
    for path in ('hacs.json', 'repository.yaml', 'pv_lab/src/appliances.mjs', 'custom_components/pv_lab/select.py'):
        if not (root / path).is_file():
            raise ValueError('Missing required release file: ' + path)
    return version


def archive_files(root):
    for file in sorted(root.rglob('*')):
        relative = file.relative_to(root)
        if file.is_file() and not file.is_symlink() and not any(part in {'.git', '__pycache__', 'data', 'node_modules', 'release-dist'} for part in relative.parts) and file.suffix not in {'.pyc', '.zip'} and file.name != 'integration-key.json':
            yield file, relative.as_posix()


def create_archive(root, path):
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as archive:
        for file, name in archive_files(root):
            archive.write(file, name)
    with zipfile.ZipFile(path) as archive:
        if archive.testzip() is not None:
            raise ValueError('Corrupted release archive')


def run_tests(root):
    node = shutil.which('node')
    if not node or int(subprocess.check_output([node, '-p', 'process.versions.node.split(".")[0]'], text=True).strip()) < 22:
        raise RuntimeError('Node.js 22+ is required (included in ubuntu-24.04 runner)')
    env = {k: v for k, v in os.environ.items() if k not in {'GITHUB_TOKEN', 'GH_TOKEN', 'SUPERVISOR_TOKEN', 'HA_TOKEN', 'HA_URL', 'DATA_DIR', 'PORT'}}
    env['PYTHONDONTWRITEBYTECODE'] = '1'
    tests = sorted(str(p.relative_to(root)) for p in (root / 'pv_lab/test').glob('*.test.mjs'))
    subprocess.run([node, '--test', *tests], cwd=root, env=env, check=True)
    subprocess.run([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-v'], cwd=root, env=env, check=True)


class GitHub:
    def __init__(self, repository, token):
        if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repository):
            raise ValueError('Invalid repository')
        self.base = 'https://api.github.com/repos/' + repository
        self.token = token

    def request(self, path, payload=None, missing_ok=False, method=None):
        data = json.dumps(payload).encode() if payload is not None else None
        req = urllib.request.Request(self.base + path, data=data, method=method, headers={'Authorization': 'Bearer ' + self.token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'PV-Lab-release'})
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code == 404 and missing_ok:
                return None
            raise RuntimeError(f'GitHub API HTTP {error.code}; check Actions contents:write and repository rules') from None

    def upload(self, release, path):
        url = release['upload_url'].split('{')[0]
        if urllib.parse.urlparse(url).hostname != 'uploads.github.com':
            raise ValueError('Unexpected GitHub upload host')
        req = urllib.request.Request(url + '?name=' + urllib.parse.quote(path.name), data=path.read_bytes(), method='POST', headers={'Authorization': 'Bearer ' + self.token, 'Content-Type': 'application/zip', 'User-Agent': 'PV-Lab-release'})
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.load(response)


def release_notes(version, root=ROOT):
    text = (root / 'CHANGELOG.md').read_text(encoding='utf-8')
    prefix = '# ' + version + '\n'
    if not text.startswith(prefix):
        raise ValueError('Current release notes are missing')
    return text[len(prefix):].split('\n# ', 1)[0].strip()


def publish(api, version, commit, archive):
    if not re.fullmatch(r'[0-9a-f]{40}', commit):
        raise ValueError('Release must target an immutable commit SHA')
    tag = 'v' + version
    existing = api.request('/releases/tags/' + tag, missing_ok=True)
    if existing and not existing.get('draft'):
        print(tag + ' already exists; published versions are never overwritten. Bump version for new code.')
        return existing
    latest = api.request('/releases/latest', missing_ok=True)
    if latest:
        try:
            if version_tuple(version) <= version_tuple(latest['tag_name']):
                print('Not publishing an older version as latest')
                return latest
        except ValueError:
            pass
    ref = api.request('/git/ref/tags/' + tag, missing_ok=True)
    if ref:
        obj = ref['object']
        if obj.get('type') == 'tag':
            obj = api.request('/git/tags/' + obj['sha'])['object']
        if obj.get('sha') != commit:
            raise ValueError('Tag already points to another commit; use a new version')
    if existing and existing.get('target_commitish') != commit:
        raise ValueError('Draft release targets another commit; use a new version')
    body = release_notes(version) + '\n\nZaktualizuj aplikację oraz integrację PV Lab, następnie uruchom ponownie Home Assistant. Instrukcja: UPDATE-' + version + '.md w repozytorium.'
    release = existing or api.request('/releases', {'tag_name': tag, 'target_commitish': commit, 'name': 'PV Lab ' + version, 'body': body, 'draft': True, 'prerelease': False})
    if archive.name not in {a['name'] for a in release.get('assets', [])}:
        api.upload(release, archive)
    release = api.request('/releases/' + str(release['id']), {'draft': False, 'make_latest': 'true'}, method='PATCH')
    print('Published ' + tag)
    return release


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true', help='Check versions, run tests and build archive without GitHub writes')
    args = parser.parse_args()
    version = validate_versions(ROOT)
    run_tests(ROOT)
    with tempfile.TemporaryDirectory(prefix='pv-lab-package-') as directory:
        archive = pathlib.Path(directory) / ('pv-lab-update-' + version + '.zip')
        create_archive(ROOT, archive)
        if args.dry_run:
            print('Dry run OK: ' + archive.name + '; no GitHub changes')
            return
        token = os.environ.get('GITHUB_TOKEN')
        if not token:
            raise RuntimeError('GITHUB_TOKEN missing')
        publish(GitHub(os.environ['PV_REPOSITORY'], token), version, os.environ['PV_COMMIT'], archive)


if __name__ == '__main__':
    main()
