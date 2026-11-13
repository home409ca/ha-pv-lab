import ast
import importlib.util
import json
import pathlib
import tempfile
import textwrap
import unittest
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('release_tested', ROOT / 'scripts/release.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)
SHA = 'a' * 40


class FakeGitHub:
    def __init__(self, existing=None, latest=None, ref=None):
        self.existing, self.latest, self.ref = existing, latest, ref
        self.calls = []

    def request(self, path, payload=None, missing_ok=False, method=None):
        self.calls.append((path, payload, method))
        if path.startswith('/releases/tags/'):
            return self.existing
        if path == '/releases/latest':
            return self.latest
        if path.startswith('/git/ref/'):
            return self.ref
        if path == '/releases':
            return {'id': 1, 'draft': True, 'target_commitish': SHA, 'assets': []}
        if path == '/releases/1':
            return {'id': 1, **payload}
        raise AssertionError(path)

    def upload(self, result, archive):
        self.calls.append(('upload', archive.name, None))


class ReleaseTests(unittest.TestCase):
    def test_versions_match_and_workflow_has_no_external_actions(self):
        self.assertEqual(release.validate_versions(ROOT), '0.5.4')
        workflow = (ROOT / '.github/workflows/release.yml').read_text(encoding='utf-8')
        self.assertNotIn('uses:', workflow)
        self.assertIn('contents: write', workflow)
        self.assertIn('github.event.repository.default_branch', workflow)
        code = workflow.split("python3 - <<'PY'\n", 1)[1].rsplit('          PY', 1)[0]
        ast.parse(textwrap.dedent(code))
        self.assertTrue(json.loads((ROOT / 'hacs.json').read_text())['hide_default_branch'])

    def test_publish_creates_checked_commit_draft_uploads_then_patches_to_public(self):
        api = FakeGitHub()
        release.publish(api, '0.5.4', SHA, pathlib.Path('pv-lab-update-0.5.4.zip'))
        post = next(payload for path, payload, method in api.calls if path == '/releases')
        self.assertEqual(post['target_commitish'], SHA)
        self.assertTrue(post['draft'])
        self.assertEqual(api.calls[-1], ('/releases/1', {'draft': False, 'make_latest': 'true'}, 'PATCH'))

    def test_published_version_never_overwritten_and_older_not_latest(self):
        api = FakeGitHub(existing={'draft': False, 'tag_name': 'v0.5.4'})
        release.publish(api, '0.5.4', SHA, pathlib.Path('x.zip'))
        self.assertEqual(len(api.calls), 1)
        api = FakeGitHub(latest={'tag_name': 'v0.5.4'})
        release.publish(api, '0.5.4', SHA, pathlib.Path('x.zip'))
        self.assertFalse(any(payload is not None for path, payload, method in api.calls))

    def test_retry_resumes_draft_and_rejects_mismatched_tag(self):
        api = FakeGitHub(existing={'id': 1, 'draft': True, 'target_commitish': SHA, 'assets': [{'name': 'x.zip'}]})
        release.publish(api, '0.5.4', SHA, pathlib.Path('x.zip'))
        self.assertFalse(any(path == 'upload' for path, payload, method in api.calls))
        self.assertEqual(api.calls[-1][2], 'PATCH')
        api = FakeGitHub(ref={'object': {'type': 'commit', 'sha': 'b' * 40}})
        with self.assertRaises(ValueError):
            release.publish(api, '0.5.4', SHA, pathlib.Path('x.zip'))

    def test_archive_includes_workflow_and_excludes_runtime_data(self):
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / 'release.zip'
            release.create_archive(ROOT, path)
            with zipfile.ZipFile(path) as archive:
                self.assertIn('.github/workflows/release.yml', archive.namelist())
                self.assertIn('custom_components/pv_lab/manifest.json', archive.namelist())
                self.assertNotIn('data/integration-key.json', archive.namelist())
                self.assertIsNone(archive.testzip())
