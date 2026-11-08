"""Independently verify every packaged body glyph against committed metrics.

Resource/PFO decoding follows the existing XOCE Dynamic artifact checker.
"""
import hashlib,json,re,struct
RESOURCE_TABLE_BYTES=256*16
def require(ok,message):
    if not ok:raise ValueError(message)

def read_resource_pack(packed, expected_count):
    """Read SDK resource entries without treating pack padding as resources."""
    require(len(packed) >= 12, "Truncated resource pack")
    count = struct.unpack_from("<I", packed)[0]
    require(count == expected_count, "Packaged resource count differs from the manifest")
    require(0 < count <= 256, "Expected the declared body font resources")
    data_start = 12 + RESOURCE_TABLE_BYTES
    require(len(packed) >= data_start, "Truncated resource table")
    entries = {}
    spans = []
    for index in range(count):
        resource_id, offset, size, crc = struct.unpack_from("<IIII", packed, 12 + index * 16)
        require(resource_id == index + 1, "Nonsequential or duplicate resource ID")
        start = data_start + offset
        require(size > 0 and start >= data_start and start + size <= len(packed),
                "Resource extends beyond its pack")
        spans.append((start, start + size))
        entries[resource_id] = {"data": packed[start:start + size], "crc": crc,
                                "offset": offset, "bytes": size}
    spans.sort()
    require(all(before[1] <= after[0] for before, after in zip(spans, spans[1:])),
            "Overlapping resource bodies")
    return entries


def read_pfo(data):
    """Parse metrics/lookup structure of the SDK's raw-bitmap v3 font."""
    require(len(data) >= 10, "Truncated compiled font")
    version, height, count, wildcard, buckets, cp_bytes, header_size, features = struct.unpack_from(
        "<BBHHBBBB", data)
    require(version == 3 and cp_bytes in (2, 4) and header_size >= 10 and buckets > 0,
            "Unsupported compiled font header")
    require(features & ~1 == 0, "Unsupported compiled font encoding; review its reader")
    offset_bytes = 2 if features & 1 else 4
    table = header_size + buckets * 4
    require(table <= len(data), "Truncated compiled font bucket table")
    entries, total = {}, 0
    for bucket in range(buckets):
        _hash, number, position = struct.unpack_from("<BBH", data, header_size + bucket * 4)
        total += number
        row = []
        for index in range(number):
            at = table + position + index * (cp_bytes + offset_bytes)
            require(at + cp_bytes + offset_bytes <= len(data), "Truncated font lookup table")
            point = int.from_bytes(data[at:at + cp_bytes], "little")
            glyph_offset = int.from_bytes(data[at + cp_bytes:at + cp_bytes + offset_bytes], "little")
            require(point not in entries or point == wildcard, "Duplicate font codepoint")
            row.append((point, glyph_offset))
            entries.setdefault(point, glyph_offset)
        require(row == sorted(row, key=lambda entry: entry[0]), "Unsorted font lookup bucket")
        # Match the firmware's binary search, including the reserved fallback.
        for point in {entry[0] for entry in row}:
            left, right = 0, len(row) - 1
            while left <= right:
                middle = (left + right) // 2
                candidate, glyph_offset = row[middle]
                if candidate < point:
                    left = middle + 1
                elif candidate > point:
                    right = middle - 1
                else:
                    entries[point] = glyph_offset
                    break
    require(total == count, "Compiled glyph count differs from its lookup table")
    glyph_base = table + total * (cp_bytes + offset_bytes)
    metrics = {}
    for point, offset in entries.items():
        at = glyph_base + offset
        require(at + 5 <= len(data), "Truncated compiled glyph metrics")
        width, glyph_height, left, top, advance = struct.unpack_from("<BBbbb", data, at)
        size = (width * glyph_height + 7) // 8
        require(at + 5 + size <= len(data), "Truncated compiled glyph bitmap")
        bitmap = data[at + 5:at + 5 + size]
        metrics[point] = {"width": width, "height": glyph_height, "left": left,
                          "top": top, "advance": advance,
                          "hasInk": any(bitmap)}
    return {"height": height, "wildcard": wildcard, "lookupEntries": count,
            "metrics": metrics}


def audit_body_fonts(root,packed,binary):
    header=(root/'src/c/generated_body_metrics.h').read_text()
    sizes=[int(v) for v in re.search(r'body_metric_points\[BODY_METRIC_POINT_COUNT\] = \{([\d,]+)\}',header)[1].split(',')]
    require(sizes==[14,16,20,22,24,26,28,32],'Body font role sizes differ')
    points=[int(v,16) for v in re.findall(r'0x([0-9a-f]+)',header.split('body_metric_codepoints[BODY_METRIC_COUNT] = {')[1].split('};')[0])]
    require(len(points)==920 and points==sorted(set(points)),'Body glyph coverage differs')
    ranges=[tuple(map(int,row.split(','))) for row in re.findall(r'\{([\d,]+)\}',header.split('body_metric_ranges[BODY_METRIC_RANGE_COUNT][3] = {')[1].split('};')[0])]
    restored=[]
    for first,last,index in ranges:
        require(index==len(restored) and first<=last,'Invalid exact codepoint range')
        restored.extend(range(first,last+1))
    require(restored==points,'Compressed ranges change codepoint indices')
    linked=[b''.join(struct.pack('<HHH',*row) for row in ranges)]
    pools={};maps={}
    for metric in ['ascent','descent']:
        marker='body_metric_'+metric+'_rows[BODY_METRIC_'+metric.upper()+'_ROW_COUNT][BODY_METRIC_POINT_COUNT] = {'
        pools[metric]=[list(map(int,row.split(','))) for row in re.findall(r'\{([\d,-]+)\}',header.split(marker)[1].split('};')[0])]
        marker='body_metric_'+metric+'_index[BODY_METRIC_COUNT] = {'
        maps[metric]=list(map(int,re.findall(r'\d+',header.split(marker)[1].split('};')[0])))
        require(len(maps[metric])==len(points) and all(len(row)==8 for row in pools[metric]),'Invalid metric table')
        linked.extend([bytes(maps[metric]),bytes(v&255 for row in pools[metric] for v in row)])
    require(all(binary.count(table)==1 for table in linked),'Native binary lacks exact metric ranges/maps/pools')
    resources=read_resource_pack(packed,len(sizes));checks=0
    for column,size in enumerate(sizes):
        font=read_pfo(resources[column+1]['data'])
        require(font['height']==size and font['wildcard']==0x25af,'Wrong packaged font/fallback')
        require(set(font['metrics'])==set(points),'Packaged font repertoire differs')
        for index,point in enumerate(points):
            glyph=font['metrics'][point]
            descent=glyph['top']+glyph['height']-size
            ascent=size-glyph['top'] if glyph['hasInk'] else 0
            require(pools['ascent'][maps['ascent'][index]][column]==ascent and
                pools['descent'][maps['descent'][index]][column]==descent,
                'Packaged glyph metrics differ: %dpx U+%04X'%(size,point))
            checks+=1
    media=json.loads((root/'package.json').read_text())['pebble']['resources']['media']
    require([entry['name'] for entry in media]==['FONT_BODY_'+str(size) for size in sizes] and
        all(entry['type']=='font' and entry['file']=='fonts/RobotoCondensed-Bold.ttf' and
            entry.get('extended') is True for entry in media),'Body resource definitions differ')
    provenance=json.loads((root/'resources/fonts/font-provenance.json').read_text())
    require(provenance['bodyFont']['sha256']==hashlib.sha256((root/'resources/fonts/RobotoCondensed-Bold.ttf').read_bytes()).hexdigest()
        =='6e949e8aa3f6e0b4db88aacafccf0c0e55e708c4564c8f3d145792adbbf80ef6','Body font source differs')
    require(provenance['generatedBody']['sha256']==hashlib.sha256(header.encode()).hexdigest(),'Stale body metric provenance')
    return {'sizes':sizes,'glyphsPerSize':len(points),'exactAscentDescentPairs':checks,
        'codepointRanges':len(ranges),'linkedExactTables':True}
