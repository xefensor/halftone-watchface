"""Historical preview reuse must reject every rendering or artwork change."""
from pathlib import Path
import io
import struct
import sys
import unittest
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from historical_preview import compare_renderer, GNU_NOTE
from launcher_icon import audit_launcher, icon_pixels
from platform_audit import crc32
import json


def resource_pack(payloads):
    pack = bytearray(4108)
    struct.pack_into('<I', pack, 0, len(payloads))
    offset = 0
    for index, data in enumerate(payloads):
        struct.pack_into('<4I', pack, 12 + index * 16, index + 1, offset, len(data), crc32(data))
        pack.extend(data)
        offset += len(data)
    struct.pack_into('<I', pack, 4, crc32(pack[4108:]))
    return bytes(pack)


def binary(pack, icon):
    data = bytearray(range(200))
    data[:8] = b'PBLAPP\0\0'
    data[8:10] = b'\x10\x01'
    struct.pack_into('<H', data, 14, len(data))
    data[130:132] = b'\0\0'
    data[132:148] = GNU_NOTE
    struct.pack_into('<I', data, 88, icon)
    data[120:124] = pack[4:8]
    struct.pack_into('<I', data, 20, crc32(data[130:]))
    return data


class HistoricalPreview(unittest.TestCase):
    def setUp(self):
        self.fonts = [bytes([index]) * 4 for index in range(8)]
        self.old_pack = resource_pack(self.fonts)
        self.new_pack = resource_pack(self.fonts + [b'new launcher'])
        self.old = binary(self.old_pack, 0)
        self.new = binary(self.new_pack, 9)

    def test_only_reviewed_launcher_and_build_metadata_can_change(self):
        self.new[124:128] = b'new!'
        self.new[148:168] = b'B' * 20
        struct.pack_into('<I', self.new, 20, crc32(self.new[130:]))
        self.assertEqual(compare_renderer(self.old, self.old_pack, self.new, self.new_pack), b'new launcher')

    def test_executable_constants_header_and_relocations_cannot_change(self):
        for offset in (12, 24, 84, 92, 96, 104, 128, 170, 199):
            changed = bytearray(self.new)
            changed[offset] ^= 1
            struct.pack_into('<I', changed, 20, crc32(changed[130:]))
            with self.subTest(offset=offset), self.assertRaises(ValueError):
                compare_renderer(self.old, self.old_pack, changed, self.new_pack)

    def test_font_change_crc_failure_and_wrong_launcher_fail(self):
        changed = resource_pack([b'edit'] + self.fonts[1:] + [b'new launcher'])
        with self.assertRaisesRegex(ValueError, 'font payload'):
            compare_renderer(self.old, self.old_pack, binary(changed, 9), changed)
        for offset in (20, 88, 120):
            changed_binary = bytearray(self.new)
            changed_binary[offset] ^= 1
            with self.subTest(offset=offset), self.assertRaises(ValueError):
                compare_renderer(self.old, self.old_pack, changed_binary, self.new_pack)

    def test_approved_source_and_packaged_launcher_pixels(self):
        media = json.loads((ROOT / 'package.json').read_text())['pebble']['resources']['media']
        data = (ROOT / 'resources/images/menu-icon.png').read_bytes()
        self.assertTrue(audit_launcher(ROOT, media, data, self.new)['sourcePixelsMatch'])
        image = Image.open(io.BytesIO(data)).convert('RGBA')
        image.putpixel((0, 0), (0, 0, 0, 255))
        output = io.BytesIO()
        image.save(output, format='PNG')
        with self.assertRaisesRegex(ValueError, 'transparent'):
            icon_pixels(output.getvalue())
        image.putpixel((0, 0), (0, 0, 0, 128))
        output = io.BytesIO()
        image.save(output, format='PNG')
        with self.assertRaisesRegex(ValueError, 'binary'):
            icon_pixels(output.getvalue())


if __name__ == '__main__':
    unittest.main()
