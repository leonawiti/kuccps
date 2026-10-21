import json
import tempfile
from pathlib import Path

from django.test import SimpleTestCase

from .loader import CatalogueMissing, load_catalogue


class LoaderTests(SimpleTestCase):
    def test_a_built_catalogue_is_read_back(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'degrees.json'
            path.write_text(json.dumps({'programmes': [{'code': '1'}]}), encoding='utf-8')
            self.assertEqual(load_catalogue(path)['programmes'], [{'code': '1'}])

    def test_a_missing_catalogue_says_how_to_build_it(self):
        with self.assertRaisesMessage(CatalogueMissing, 'build_catalogue'):
            load_catalogue('no-such-file.json')
