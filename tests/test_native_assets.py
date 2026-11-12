"""Equivalent bitmap/RLE fonts must yield the same complete glyph pixels."""
from pathlib import Path
import sys,struct,unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from native_assets_audit import font_glyphs

def font(compressed):
    header=struct.pack('<BBHHBBBB',3,2,1,32,1,2,10,2 if compressed else 0)
    table=struct.pack('<BBH',0,1,0)+struct.pack('<HI',65,0)
    glyph=struct.pack('<BBbbb',2,3 if compressed else 2,0,-2,3)
    return header+table+glyph+(b'\x18\x08' if compressed else b'\x09')

class Fonts(unittest.TestCase):
    def test_lossless_rle(self):
        self.assertEqual(font_glyphs(font(False)),font_glyphs(font(True)))
        self.assertEqual(font_glyphs(font(True))[65][-1],b'\x01\x00\x00\x01')
    def test_rejects_truncation_and_invalid_dimensions(self):
        for data in (font(True)[:-1],font(False)[:-1],font(True)[:21]+b'\x02'+font(True)[22:]):
            with self.subTest(data=data),self.assertRaises(ValueError):font_glyphs(data)

if __name__=='__main__':unittest.main()
