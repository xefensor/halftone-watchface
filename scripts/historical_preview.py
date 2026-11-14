"""Prove historical preview compatibility without claiming new captures.

Only the launcher ID, resource binding and SDK build metadata can differ.
Every executable/constant/relocation byte and all eight font payloads must match.
"""
import hashlib
import json
import struct
import zipfile
from launcher_icon import audit_launcher
from native_identity import GNU_NOTE, renderer_identity
from platform_audit import crc32, require

BASELINES = {
    'dynamic': ('1.0.1', '1.0.2', '94d68f69ead6131c00a3509140be542c257f4c52a19fd27aacc4f6311b7f7a41'),
    'halftone': ('1.10.2', '1.10.3', '2aebe161f36be2368b94ae52e84dce2be58ae6ccb8ac1dd6cf479a10f8848d1d'),
}


def resource_entries(pack, count):
    require(len(pack) >= 4108 and struct.unpack_from('<I', pack)[0] == count,
            'Historical preview resource count differs')
    require(struct.unpack_from('<I', pack, 4)[0] == crc32(pack[4108:]),
            'Historical preview resource CRC differs')
    entries, spans = [], []
    for index in range(count):
        rid, offset, size, checksum = struct.unpack_from('<4I', pack, 12 + index * 16)
        start = 4108 + offset
        require(rid == index + 1 and size > 0 and start + size <= len(pack),
                'Historical preview resource directory differs')
        payload = pack[start:start + size]
        require(crc32(payload) == checksum, 'Historical preview resource entry CRC differs')
        entries.append(payload)
        spans.append((start, start + size))
    spans.sort()
    require(all(left[1] <= right[0] for left, right in zip(spans, spans[1:])),
            'Historical preview resources overlap')
    return entries


def compare_renderer(reference_binary, reference_resources, binary, resources):
    require(len(reference_binary) == len(binary), 'Historical preview executable length differs')
    old_fonts = resource_entries(reference_resources, 8)
    entries = resource_entries(resources, 9)
    require(old_fonts == entries[:8], 'Historical preview font payload bytes differ')
    normalized = []
    for data, pack, icon in ((reference_binary, reference_resources, 0), (binary, resources, 9)):
        require(len(data) >= 168 and data[:8] == b'PBLAPP\0\0' and data[8:10] == b'\x10\x01'
                and data[132:148] == GNU_NOTE, 'Expected SDK 4.44 native header and GNU note')
        require(struct.unpack_from('<I', data, 88)[0] == icon, 'Unexpected launcher resource ID')
        loaded = struct.unpack_from('<H', data, 14)[0] | data[130] << 16
        require(168 <= loaded <= len(data) and crc32(data[130:loaded]) == struct.unpack_from('<I', data, 20)[0],
                'Historical preview native CRC differs')
        require(data[120:124] == pack[4:8], 'Historical preview native/resource binding differs')
        value = bytearray(data)
        # SDK 4.44 omits semver patch from the native header. Keep major/minor,
        # UUID, flags, entry point, lengths and every executable byte unchanged.
        for first, last in ((20, 24), (88, 92), (120, 128), (148, 168)):
            value[first:last] = b'\0' * (last - first)
        normalized.append(value)
    require(normalized[0] == normalized[1],
            'Historical preview executable/constants differ beyond the reviewed launcher and SDK metadata')
    return entries[-1]


def audit_historical_preview(root, platform, binary, resources):
    package = json.loads((root / 'package.json').read_text())
    old_version, new_version, digest = BASELINES[package['pebble']['displayName'].lower()]
    require(package['version'] == new_version, 'Historical preview review applies only to this candidate version')
    baseline = root / 'tests/fixtures/historical-preview' / (package['pebble']['displayName'] + '-' + old_version + '.pbw')
    require(hashlib.sha256(baseline.read_bytes()).hexdigest() == digest,
            'Historical preview baseline PBW differs from the reviewed supplied release')
    suffix = '-round' if platform == 'gabbro' else ''
    preview_path = root / ('src/pkjs/settings-preview' + suffix + '.js')
    preview = json.loads(preview_path.read_text().split('module.exports = ', 1)[1].strip().removesuffix(';'))
    require(preview['version'] == old_version and len(preview['frames']) == 24,
            'Keep the original historical preview version and all 24 frames')
    with zipfile.ZipFile(baseline) as archive:
        reference_binary = archive.read(platform + '/pebble-app.bin')
        reference_resources = archive.read(platform + '/app_resources.pbpack')
    require(preview['source']['nativeRendererIdentity'] == renderer_identity(reference_binary, reference_resources),
            'Known baseline does not match original preview capture renderer provenance')
    icon = compare_renderer(reference_binary, reference_resources, binary, resources)
    launcher = audit_launcher(root, package['pebble']['resources']['media'], icon, binary)
    return {'samples': 24, 'previewVersion': old_version, 'candidateVersion': new_version,
            'platform': platform, 'baselinePbwSha256': digest, 'freshCaptureClaimed': False,
            'historicalFramesRetained': True, 'executableAndConstantsByteIdentical': True,
            'fontPayloadsByteIdentical': True, 'launcher': launcher,
            'allowedDifferences': ['launcher resource ID 0 to 9', 'resource CRC binding',
                                   'SDK CRC/timestamp/GNU SHA1 build ID']}
