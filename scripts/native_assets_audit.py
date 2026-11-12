"""Compare every packaged platform font pixel/metric and raw asset with source."""
import json,struct,subprocess,sys,zipfile
from pathlib import Path
from platform_audit import require

def font_glyphs(data):
    require(len(data)>=10,'Truncated font')
    version,_,count,wildcard,buckets,cpbytes,header,features=struct.unpack_from('<BBHHBBBB',data)
    require(version==3 and cpbytes in (2,4) and buckets and header>=10 and not features&~3,'Unsupported font format')
    offbytes=2 if features&1 else 4;table=header+buckets*4;base=table+count*(cpbytes+offbytes)
    glyphs={};total=0
    for bucket in range(buckets):
        _,number,position=struct.unpack_from('<BBH',data,header+bucket*4);total+=number
        rows=[]
        for j in range(number):
            at=table+position+j*(cpbytes+offbytes)
            code=int.from_bytes(data[at:at+cpbytes],'little')
            offset=int.from_bytes(data[at+cpbytes:at+cpbytes+offbytes],'little');rows.append((code,offset))
        require(rows==sorted(rows),'Unsorted font hash bucket')
        # Firmware lookup is a binary search, including duplicate wildcard entries.
        for code,_ in rows:
            low,high=0,len(rows)-1
            while low<=high:
                middle=(low+high)//2;candidate,offset=rows[middle]
                if candidate<code:low=middle+1
                elif candidate>code:high=middle-1
                else:break
            at=base+offset
            require(at+5<=len(data),'Truncated glyph metrics')
            width,height,left,top,advance=struct.unpack_from('<BBbbb',data,at)
            if features&2:
                units=height;size=(units+1)//2
                require(at+5+size<=len(data),'Truncated RLE glyph')
                bits=bytearray()
                for i in range(units):
                    unit=(data[at+5+i//2]>>(4*(i%2)))&15
                    bits.extend([unit>>3]*((unit&7)+1))
                require((width and len(bits)%width==0) or not bits,'Invalid RLE dimensions')
                height=len(bits)//width if width else 0
            else:
                size=(width*height+7)//8
                require(at+5+size<=len(data),'Truncated bitmap glyph')
                bits=bytes((data[at+5+i//8]>>(i%8))&1 for i in range(width*height))
            glyphs[code]=(width,height,left,top,advance,bytes(bits))
    require(total==count and glyphs,'Invalid font glyph count')
    return glyphs

def audit_assets(root,pbw):
    pkg=json.loads((root/'package.json').read_text());targets=pkg['pebble']['targetPlatforms'];all_media=pkg['pebble']['resources']['media'];reference={};report={}
    if 'flint' in targets:
        subprocess.run([sys.executable,str(root/'scripts/prepare-flint-assets.py'),'--check'],cwd=root,check=True,stdout=subprocess.DEVNULL)
    with zipfile.ZipFile(pbw) as z:
        for platform in ['emery']+[p for p in targets if p!='emery']:
            media=[m for m in all_media if platform in m.get('targetPlatforms',targets)]
            pack=z.read(platform+'/app_resources.pbpack');require(struct.unpack_from('<I',pack)[0]==len(media),'Resource declaration count differs')
            fonts=raw=0
            for i,item in enumerate(media):
                rid,offset,size,_=struct.unpack_from('<4I',pack,12+i*16);require(rid==i+1,'Resource ID differs')
                data=pack[4108+offset:4108+offset+size]
                if item['type']=='raw':
                    require(data==(root/'resources'/item['file']).read_bytes(),'Raw source asset differs '+item['name']);raw+=1
                elif item['type']=='font':
                    glyphs=font_glyphs(data);name=item['name'];fonts+=1
                    if platform=='emery':reference[name]=glyphs
                    else:require(glyphs==reference[name],'Font pixels/metrics differ: '+platform+'/'+name)
            report[platform]={'fontsWithIdenticalPixelsAndMetrics':fonts,'sourceIdenticalRawAssets':raw}
    return report
