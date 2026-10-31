#!/usr/bin/env python3
"""Verify the committed core tarball and lockfile before tests/builds."""
from pathlib import Path
import base64, hashlib, json, tarfile
root = Path(__file__).resolve().parents[1]
meta = json.loads((root / 'vendor/CORE.json').read_text())
archive = root / 'vendor' / meta['artifact']
data = archive.read_bytes()
assert hashlib.sha256(data).hexdigest() == meta['sha256'], 'Core archive checksum differs'
integrity = 'sha512-' + base64.b64encode(hashlib.sha512(data).digest()).decode()
assert integrity == meta['integrity'], 'Core archive integrity differs'
lock = json.loads((root / 'package-lock.json').read_text())
entry = lock['packages']['node_modules/pebble-watchface-core']
assert entry['version'] == meta['version'] and entry['integrity'] == integrity
with tarfile.open(archive, 'r:gz') as package:
    info = json.load(package.extractfile('package/package.json'))
    assert info['name'] == meta['package'] and info['version'] == meta['version']
print('Pinned Pebble Watchface Core ' + meta['version'] + ': verified')
