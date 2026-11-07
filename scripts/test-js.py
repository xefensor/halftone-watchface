from pathlib import Path
import os,subprocess,tempfile,zipfile
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix="halftone-js-") as tmp:
    target=Path(tmp)/"clay.js"
    with zipfile.ZipFile(root/"node_modules/@rebble/clay/dist.zip") as archive:
        target.write_bytes(archive.read("js/index.js"))
    for test in sorted((root/"tests").glob("*.test.js")):
        subprocess.run(["node",str(test)],check=True,cwd=root,env={**os.environ,"CLAY_TEST_BUNDLE":str(target)})
