#!/usr/bin/env python3
"""Generate Clay HTML directly from the locked package, including fresh installs."""
from pathlib import Path
import os,subprocess,sys,tempfile,zipfile
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='halftone-config-') as tmp:
    bundle=Path(tmp)/'clay.js'
    with zipfile.ZipFile(root/'node_modules/@rebble/clay/dist.zip') as archive:
        bundle.write_bytes(archive.read('js/index.js'))
    subprocess.run(['node',str(root/'scripts/generate-config.cjs'),*sys.argv[1:]],check=True,cwd=root,
        env={**os.environ,'CLAY_GENERATOR_BUNDLE':str(bundle)})
