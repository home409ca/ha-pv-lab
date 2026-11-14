import importlib.util
import pathlib
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('manual_tested', ROOT / 'scripts/build_manual.py')
manual = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(manual)


class ManualTests(unittest.TestCase):
    def test_current_manual_covers_tabs_and_is_exactly_generated(self):
        manual.validate_manual(ROOT, '0.7.7')

    def test_changed_algorithm_requires_manual_review_before_release(self):
        original = pathlib.Path.read_bytes
        def read(path):
            data = original(path)
            return data + b'\n// changed algorithm' if path == ROOT / 'pv_lab/src/optimizer.mjs' else data
        with patch.object(pathlib.Path, 'read_bytes', read):
            with self.assertRaisesRegex(ValueError, 'Application changed'):
                manual.validate_manual(ROOT, '0.7.7')

    def test_wrong_manual_version_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Manual version'):
            manual.validate_manual(ROOT, '0.7.8')
