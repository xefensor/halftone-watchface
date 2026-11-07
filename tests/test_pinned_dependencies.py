from pathlib import Path
import sys,unittest,tempfile,shutil,json
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from pinned_dependencies import DEPENDENCIES,verify_dependency
class Pins(unittest.TestCase):
    def test_current_archives_match_lock_and_provenance(self):
        for pin in DEPENDENCIES:verify_dependency(ROOT,pin)
    def test_changed_archive_cannot_pass_validation(self):
        for pin in DEPENDENCIES:
            with self.subTest(pin=pin),tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);(root/'vendor').mkdir()
                for name in ['package.json','package-lock.json']:shutil.copyfile(ROOT/name,root/name)
                shutil.copyfile(ROOT/'vendor'/pin[0],root/'vendor'/pin[0])
                metadata=json.loads((root/'vendor'/pin[0]).read_text())
                archive=metadata['artifact'];(root/'vendor'/archive).write_bytes((ROOT/'vendor'/archive).read_bytes()+b'changed')
                with self.assertRaisesRegex(ValueError,'checksum'):verify_dependency(root,pin)
if __name__=='__main__':unittest.main()
