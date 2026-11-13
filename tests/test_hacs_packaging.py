"""Delivery regression: the repository layout HACS downloads must remain valid."""
import ast
import json
import pathlib
import struct
import unittest
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
COMPONENT = ROOT / 'custom_components' / 'pv_lab'


class HacsPackagingTests(unittest.TestCase):
    def test_root_manifest_and_standard_directory(self):
        manifest = json.loads((ROOT / 'hacs.json').read_text(encoding='utf-8'))
        self.assertEqual(manifest['name'], 'PV Lab')
        self.assertFalse(manifest['content_in_root'])
        self.assertFalse(manifest['zip_release'])
        self.assertEqual({p.name for p in (ROOT / 'custom_components').iterdir() if p.is_dir() and not p.name.startswith('.')}, {'pv_lab'})
        for name in ('manifest.json','__init__.py','config_flow.py','sensor.py'):
            self.assertTrue((COMPONENT / name).is_file(),name)

    def test_integration_metadata_and_device_version_match(self):
        manifest=json.loads((COMPONENT / 'manifest.json').read_text(encoding='utf-8'))
        for name in ('domain','documentation','issue_tracker','codeowners','name','version'):
            self.assertTrue(manifest.get(name),name)
        self.assertEqual(manifest['domain'],COMPONENT.name)
        self.assertTrue(all(owner.startswith('@') for owner in manifest['codeowners']))
        values={}
        for node in ast.parse((COMPONENT / 'const.py').read_text(encoding='utf-8')).body:
            if isinstance(node,ast.Assign) and isinstance(node.value,ast.Constant):
                values[node.targets[0].id]=node.value.value
        self.assertEqual(manifest['version'],values['VERSION'])
        self.assertEqual(manifest['version'],'0.7.2')

    def test_energy_dialog_can_list_integration_as_forecast_service(self):
        # HA's solar dialog requests config entries with type=["service"].
        # A working energy.py alone is insufficient: an omitted type defaults to hub.
        manifest=json.loads((COMPONENT/'manifest.json').read_text(encoding='utf-8'))
        self.assertEqual(manifest.get('integration_type'),'service')
        energy=ast.parse((COMPONENT/'energy.py').read_text(encoding='utf-8'))
        self.assertTrue(any(isinstance(node,ast.AsyncFunctionDef) and node.name=='async_get_solar_forecast' for node in energy.body))

    def test_local_brand_and_translation_fallback(self):
        png=(COMPONENT / 'brand' / 'icon.png').read_bytes()
        self.assertEqual(png[:8],b'\x89PNG\r\n\x1a\n')
        self.assertEqual(png[12:16],b'IHDR')
        self.assertEqual(struct.unpack('>II',png[16:24]),(256,256))
        self.assertEqual(json.loads((COMPONENT/'strings.json').read_text(encoding='utf-8')),json.loads((COMPONENT/'translations'/'en.json').read_text(encoding='utf-8')))

    def test_patch_has_no_extra_parent_folder(self):
        patch=ROOT.parent/'pv-lab-hacs-0.7.2.zip'
        if not patch.is_file():
            self.skipTest('Optional delivery ZIP is not present in this checkout')
        with zipfile.ZipFile(patch) as archive:
            names=set(archive.namelist())
            self.assertIn('hacs.json',names)
            self.assertIn('custom_components/pv_lab/manifest.json',names)
            self.assertIn('custom_components/pv_lab/brand/icon.png',names)
            manifest=json.loads(archive.read('custom_components/pv_lab/manifest.json'))
            self.assertEqual(manifest['integration_type'],'service')
            self.assertEqual(manifest['version'],'0.7.2')
            self.assertNotIn('repository.yaml',names)  # Existing app repository is preserved.
            self.assertFalse(any(n.startswith('pv_lab/') for n in names))
            self.assertEqual(json.loads(archive.read('hacs.json')),json.loads((ROOT/'hacs.json').read_text(encoding='utf-8')))
            self.assertIsNone(archive.testzip())


if __name__=='__main__':
    unittest.main()
