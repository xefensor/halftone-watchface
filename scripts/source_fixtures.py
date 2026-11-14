"""The sole compiled binary allowed in source archives is a pinned audit fixture."""
import hashlib

HISTORICAL_FIXTURES = {'tests/fixtures/historical-preview/Halftone-1.10.2.pbw': '2aebe161f36be2368b94ae52e84dce2be58ae6ccb8ac1dd6cf479a10f8848d1d'}

def source_pbw_allowed(path, content):
    expected = HISTORICAL_FIXTURES.get(path)
    if expected is None:
        return False
    if hashlib.sha256(content).hexdigest() != expected:
        raise ValueError('Historical source fixture hash differs: ' + path)
    return True
