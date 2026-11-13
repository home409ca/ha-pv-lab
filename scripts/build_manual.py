"""Build the offline manual and verify release documentation using only stdlib."""
import argparse
import hashlib
import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]


def inputs(root):
    paths = [root / 'pv_lab/DOCS.md', root / 'pv_lab/config.yaml', root / 'pv_lab/package.json']
    for directory in ('pv_lab/src', 'pv_lab/public', 'custom_components/pv_lab'):
        paths.extend(p for p in (root / directory).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix in {'.mjs', '.js', '.py', '.json', '.html', '.css'} and p.name != 'manual.html')
    return {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}


def inline(value):
    value = html.escape(value)
    value = re.sub(r'`([^`]+)`', r'<code>\1</code>', value)
    return re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', value)


def render(source, version):
    out, toc, paragraph = [], [], []
    def flush():
        if paragraph:
            out.append('<p>' + inline(' '.join(paragraph)) + '</p>')
            paragraph.clear()
    lines = source.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line or line.startswith('<!--'):
            flush()
        elif line.startswith('#'):
            flush()
            m = re.fullmatch(r'(#{1,6}) (.+)', line)
            if not m:
                raise ValueError('Invalid heading: ' + line)
            level, label = len(m[1]), m[2]
            anchor = 'section-' + str(len(out))
            out.append(f'<h{level} id="{anchor}">{inline(label)}</h{level}>')
            if level == 2:
                toc.append(f'<a href="#{anchor}">{inline(label)}</a>')
        elif line.startswith('|'):
            flush()
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                cells = [x.strip() for x in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-+:?', x) for x in cells):
                    tag = 'th' if not rows else 'td'
                    rows.append('<tr>' + ''.join(f'<{tag}>{inline(x)}</{tag}>' for x in cells) + '</tr>')
                i += 1
            out.append('<div class="table-scroll"><table><thead>' + rows[0] + '</thead><tbody>' + ''.join(rows[1:]) + '</tbody></table></div>')
            continue
        elif re.match(r'^\d+\. ', line):
            flush()
            items = []
            while i < len(lines) and re.match(r'^\d+\. ', lines[i].strip()):
                items.append('<li>' + inline(re.sub(r'^\d+\. ', '', lines[i].strip())) + '</li>')
                i += 1
            out.append('<ol>' + ''.join(items) + '</ol>')
            continue
        else:
            paragraph.append(line)
        i += 1
    flush()
    css = 'html{scroll-behavior:smooth}body{margin:0;background:#f4f6f7;color:#1c2b37;font:17px/1.7 system-ui,sans-serif}header{background:#142631;color:white;padding:38px max(24px,calc((100vw - 1080px)/2))}header p{color:#d6e4e6}main{max-width:1080px;margin:auto;padding:24px}h1{font-size:2.3rem;line-height:1.2}h2{margin-top:48px;padding-top:14px;border-top:2px solid #c7d6d8;color:#164c43;scroll-margin-top:20px}h3{margin-top:28px}nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;background:white;padding:22px;border-radius:12px}nav a{color:#155d50;text-decoration:none;padding:4px}a:hover{text-decoration:underline}table{border-collapse:collapse;width:100%;background:white;font-size:.94rem}th,td{text-align:left;vertical-align:top;border:1px solid #cbd5db;padding:12px}th{background:#e5efeb}code{background:#e6ecef;padding:2px 5px;border-radius:4px;overflow-wrap:anywhere}.table-scroll{overflow-x:auto;margin:20px 0}button{font:inherit;padding:10px 18px;border:0;border-radius:8px;background:#c8ef9d;color:#132923;cursor:pointer}footer{margin-top:44px;border-top:1px solid #cbd5db;padding:20px;color:#52616a}@media(max-width:650px){body{font-size:16px}main{padding:16px}nav{grid-template-columns:1fr}th,td{padding:8px}h1{font-size:1.8rem}}@media print{body{background:white;font-size:10pt}header{background:white;color:black;padding:0}header p{color:black}main{max-width:none;padding:0}button{display:none}nav{display:block;columns:2;padding:0}nav a{display:block}h2{break-after:avoid}tr{break-inside:avoid}.table-scroll{overflow:visible}a{color:black;text-decoration:none}}'
    return '<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Instrukcja PV Lab ' + version + '</title><style>' + css + '</style></head><body><header><h1>Instrukcja PV Lab</h1><p>Wersja ' + version + ' · obliczenia, ekrany i interpretacja wyników</p><button onclick="window.print()">Drukuj / zapisz PDF</button></header><main><nav aria-label="Spis treści">' + ''.join(toc) + '</nav>' + '\n'.join(out) + '<footer>PV Lab ' + version + ' · Instrukcja działa również bez dostępu do internetu.</footer></main></body></html>\n'


def validate_manual(root, version):
    source = (root / 'pv_lab/DOCS.md').read_text(encoding='utf-8-sig')
    if f'<!-- pv-lab-manual-version: {version} -->' not in source:
        raise ValueError('Manual version must match the release')
    tabs = set(re.findall(r'data-tab="([a-z]+)"', (root / 'pv_lab/public/index.html').read_text(encoding='utf-8')))
    if not tabs <= set(re.findall(r'<!-- tab:([a-z]+) -->', source)):
        raise ValueError('Manual must describe every application tab')
    manifest = json.loads((root / 'pv_lab/documentation.json').read_text(encoding='utf-8'))
    if manifest != {'version': version, 'inputs': inputs(root)}:
        raise ValueError('Application changed: review the manual and run scripts/build_manual.py --refresh')
    if (root / 'pv_lab/public/manual.html').read_text(encoding='utf-8') != render(source, version):
        raise ValueError('Generated manual is outdated')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--refresh', action='store_true')
    args = parser.parse_args()
    version = json.loads((ROOT / 'pv_lab/package.json').read_text(encoding='utf-8'))['version']
    if args.refresh:
        source = (ROOT / 'pv_lab/DOCS.md').read_text(encoding='utf-8-sig')
        (ROOT / 'pv_lab/public/manual.html').write_text(render(source, version), encoding='utf-8')
        (ROOT / 'pv_lab/documentation.json').write_text(json.dumps({'version': version, 'inputs': inputs(ROOT)}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    validate_manual(ROOT, version)
    print('Manual checked: ' + version)


if __name__ == '__main__':
    main()
