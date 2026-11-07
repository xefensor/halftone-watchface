#!/usr/bin/env python3
"""Verify both committed library tarballs and lockfile before tests/builds."""
from pathlib import Path
import json,hashlib,base64,tarfile,io
from pinned_dependencies import DEPENDENCIES, verify_dependency


def main():
    root = Path(__file__).resolve().parents[1]
    ui=json.loads((root/'vendor/UI.json').read_text())
    raw=(root/'vendor'/ui['archive']).read_bytes()
    package=json.loads((root/'package.json').read_text());lock=json.loads((root/'package-lock.json').read_text())
    assert ui['version']=='0.1.1' and hashlib.sha256(raw).hexdigest()==ui['sha256']
    assert 'sha512-'+base64.b64encode(hashlib.sha512(raw).digest()).decode()==ui['integrity']
    assert package['dependencies']['pebble-xoce-ui']=='file:vendor/'+ui['archive']
    assert lock['packages']['node_modules/pebble-xoce-ui']['integrity']==ui['integrity']
    with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as archive:
        for member in archive.getmembers():
            if member.isfile():
                relative=member.name.removeprefix('package/')
                assert (root/'node_modules/pebble-xoce-ui'/relative).read_bytes()==archive.extractfile(member).read(),relative
    print('Pinned pebble-xoce-ui 0.1.1: verified')
    for specification in DEPENDENCIES:
        pin, files = verify_dependency(root, specification)
        for relative,data in files.items():
            assert (root/'node_modules'/pin['package']/relative).read_bytes()==data, relative
        print("Pinned " + pin["package"] + " " + pin["version"] + ": verified")


if __name__ == "__main__":
    main()
