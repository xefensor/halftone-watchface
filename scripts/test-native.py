#!/usr/bin/env python3
"""Run portable layout/protocol tests using the pinned core package headers."""
from pathlib import Path
import os, subprocess, sys, tempfile, zipfile
root = Path(__file__).resolve().parents[1]
core = root / 'node_modules/pebble-watchface-core'
activities = root / 'node_modules/pebble-activities'
if not (core / 'dist.zip').is_file():
    raise SystemExit('Run npm ci first')
with tempfile.TemporaryDirectory(prefix='watchface-tests-') as tmp:
    with zipfile.ZipFile(core / 'dist.zip') as archive:
        for info in archive.infolist():
            if info.filename.startswith('include/'):
                archive.extract(info, tmp)
    if not (activities / 'dist.zip').is_file():
        raise SystemExit('Install the pinned activity package first')
    with zipfile.ZipFile(activities / 'dist.zip') as archive:
        for info in archive.infolist():
            if info.filename.startswith('include/'):
                archive.extract(info, tmp)
    tests = sorted((root / 'tests').glob('*.c'))
    if not tests:
        raise SystemExit('No native tests found')
    for source in tests:
        output = Path(tmp) / source.stem
        command = [os.environ.get('CC', 'cc'), '-std=c99', '-I', str(root / 'node_modules'), '-Wall', '-Wextra', '-Werror',
            '-I' + str(Path(tmp) / 'include'), '-I' + str(core / 'include'),
            '-I' + str(activities / 'include'), str(source),
            *map(str, sorted((core / 'src/c').glob('*.c'))),
            *map(str, sorted((activities / 'src/c').glob('*.c'))), '-o', str(output)]
        subprocess.run(command, check=True)
        subprocess.run([str(output)], check=True, cwd=root)
        print(source.name + ': PASS')
subprocess.run([sys.executable, str(root / 'tests/test_native_lifecycle.py')], check=True)
