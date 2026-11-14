"""Source releases retain the real audit baseline and reject disguised build outputs."""
from pathlib import Path
import importlib.util,sys,unittest
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from source_fixtures import HISTORICAL_FIXTURES,source_pbw_allowed
spec=importlib.util.spec_from_file_location('fixture_release',ROOT/'scripts/github-release.py')
release=importlib.util.module_from_spec(spec);spec.loader.exec_module(release)
class SourceFixtures(unittest.TestCase):
    def test_exact_pinned_fixture_only(self):
        name=next(iter(HISTORICAL_FIXTURES));data=(ROOT/name).read_bytes()
        self.assertTrue(source_pbw_allowed(name,data))
        with self.assertRaises(ValueError):source_pbw_allowed(name,data+b'changed')
        for other in ['build/candidate.pbw','tests/fixtures/historical-preview/other.pbw',name.upper(),'nested/'+name]:
            self.assertFalse(source_pbw_allowed(other,data))
    def test_source_validator_requires_committed_fixture_and_rejects_other_pbws(self):
        name=next(iter(HISTORICAL_FIXTURES));data=(ROOT/name).read_bytes()
        with patch.object(release,'git',return_value=(name+'\0').encode()),patch.object(release,'committed',return_value=data):
            with patch.object(release,'zip_files',return_value={name:data}):
                self.assertIn(name,release.validate_source(ROOT,'a'*40,b'archive'))
            for files in [{}, {name:data+b'changed'}, {name:data,'unexpected.PBW':data}]:
                with self.subTest(files=list(files)),patch.object(release,'zip_files',return_value=files),self.assertRaises(ValueError):
                    release.validate_source(ROOT,'a'*40,b'archive')
if __name__=='__main__':unittest.main()
