"""Validate the reviewed non-inverting, transparent black launcher artwork."""
import hashlib
import io
import json
import struct
from PIL import Image
from platform_audit import require

ICON_DECLARATION = {
    'type': 'bitmap', 'name': 'IMAGE_MENU_ICON', 'file': 'images/menu-icon.png',
    'menuIcon': True, 'targetPlatforms': ['emery', 'gabbro'],
    'memoryFormat': 'SmallestPalette', 'storageFormat': 'png',
}
ICON_SHA256 = {
    'dynamic': 'e778c0f7507f7524dfb4eaa8dcc500247fa39fb71a53528b7be7758359f3b649',
    'halftone': 'e97c93d9c81582156f54b2086cb2629d460108d011b920f34261264fcd3af356',
}


def icon_pixels(data):
    with Image.open(io.BytesIO(data)) as image:
        require(image.size == (25, 25), 'Launcher icon must be exactly 25 by 25')
        rgba = list(image.convert('RGBA').get_flattened_data())
    require({pixel[3] for pixel in rgba} == {0, 255}, 'Launcher alpha must be binary')
    require({pixel[:3] for pixel in rgba if pixel[3]} == {(0, 0, 0)},
            'Launcher must contain only visible black ink')
    require(all(rgba[y * 25 + x][3] == 0 for x, y in ((0, 0), (24, 0), (0, 24), (24, 24))),
            'Launcher corners must remain transparent')
    # Invisible RGB is not meaningful and may be canonicalized by the SDK.
    return bytes(pixel[3] for pixel in rgba)


def audit_launcher(root, media, packed=None, binary=None):
    require(len(media) == 9 and media[-1] == ICON_DECLARATION and
            all(item.get('type') == 'font' and not item.get('menuIcon') for item in media[:-1]),
            'Expected the eight unchanged fonts followed by the exact launcher declaration')
    source = (root / 'resources' / ICON_DECLARATION['file']).read_bytes()
    digest = hashlib.sha256(source).hexdigest()
    slug = json.loads((root / 'package.json').read_text())['pebble']['displayName'].lower()
    require(digest == ICON_SHA256[slug], 'Launcher differs from approved source artwork')
    pixels = icon_pixels(source)
    if packed is not None:
        require(icon_pixels(packed) == pixels, 'Packaged launcher pixels differ from source')
    if binary is not None:
        require(len(binary) >= 132 and binary[:8] == b'PBLAPP\0\0' and
                struct.unpack_from('<I', binary, 88)[0] == 9,
                'Native header does not select launcher resource 9')
    return {'resourceId': 9, 'size': [25, 25], 'sourceSha256': digest,
            'visibleInk': 'black', 'alpha': 'binary', 'sourcePixelsMatch': packed is not None}
