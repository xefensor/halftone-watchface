#!/usr/bin/env python3
"""Validate Halftone's disposable PBW, pinned inputs and native font geometry."""
from pathlib import Path
import hashlib,json,re,struct,zipfile
from repo_workflow import candidate,check_build
from pinned_dependencies import DEPENDENCIES,verify_dependency
from check_body_fonts import audit_body_fonts
root=Path(__file__).resolve().parents[1]
def sha(data):return hashlib.sha256(data).hexdigest()
def require(ok,message):
    if not ok:raise ValueError(message)
pbw=candidate(root,'Halftone');check_build(root,pbw)
package=json.loads((root/'package.json').read_text())
for pin in DEPENDENCIES:verify_dependency(root,pin)
with zipfile.ZipFile(pbw) as built,zipfile.ZipFile(root/'build'/(root.name+'.pbw')) as sdk:
    require(built.testzip() is None,'Damaged PBW')
    info=json.loads(built.read('appinfo.json'))
    require(info['uuid']=='d4dd5046-53be-4624-99e8-46e0b377fe66','Halftone UUID changed')
    require(info['versionLabel']==package['version'] and info['displayName']=='Halftone','Wrong app identity')
    require(info['manifestVersion']==2 and info['usesPermissions']==['ReadMusic'],'Permission manifest differs')
    require(info['messageKeys']==dict(zip(package['pebble']['messageKeys'],range(10000,10000+len(package['pebble']['messageKeys'])))),'Wire keys differ')
    require(info['plugin']==package['pebble']['plugin'],'Navigation plugin missing')
    require(built.read('config.html')==(root/'config.html').read_bytes(),'Stale packaged settings')
    for name in ['emery/pebble-app.bin','emery/app_resources.pbpack','emery/manifest.json']:
        require(built.read(name)==sdk.read(name),'Packaging altered SDK payload '+name)
    binary=built.read('emery/pebble-app.bin')
    header=(root/'src/c/generated_clock_glyphs.h').read_text()
    font=(root/'resources/fonts/FiraSansCondensed-Bold.ttf').read_bytes()
    require(sha(font) in header,'Stale Fira outlines')
    tables=[('clock_points[CLOCK_POINT_COUNT]','<hh',r'\{(-?\d+),(-?\d+)\}'),
            ('clock_contours[CLOCK_CONTOUR_COUNT]','<HH?x',r'\{(\d+),(\d+),(true|false)\}')]
    for marker,fmt,pattern in tables:
        text=header.split(marker+' = {',1)[1].split('};',1)[0]
        rows=re.findall(pattern,text)
        values=[[v=='true' if v in ('true','false') else int(v) for v in row] for row in rows]
        require(values and binary.count(b''.join(struct.pack(fmt,*row) for row in values))==1,'Linked Fira table differs '+marker)
    text=header.split('clock_glyphs[CLOCK_GLYPH_COUNT] = {',1)[1].split('};',1)[0]
    rows=re.findall(r"\{(?:'(.)'|0x([0-9a-f]+)),([\d,-]+)\}",text)
    packed=b''.join(struct.pack('<IHHHhhhh2x',ord(char) if char else int(code,16),*map(int,values.split(','))) for char,code,values in rows)
    require(binary.count(packed)==1,'Linked Fira metrics differ')
    require('licenses/OFL-FiraSans.txt' in built.namelist(),'Fira licence missing')
    preview=json.loads((root/'src/pkjs/settings-preview.js').read_text().split('module.exports = ',1)[1].strip().removesuffix(';'))
    require(preview['version']==package['version'],'Wrong native preview version')
    source=preview['source'];native=source['nativePayloadSha256']
    require(sha(built.read('emery/app_resources.pbpack'))==native['emery/app_resources.pbpack'],'Native preview resources differ')
    require(sha(binary)==native['emery/pebble-app.bin'] or
        sha(binary[:124]+b'\0'*4+binary[128:])==source['normalizedNativeBinarySha256'],
        'Native previews describe a different renderer')
    body_fonts=audit_body_fonts(root,built.read('emery/app_resources.pbpack'),binary)
    report={'bodyFonts':body_fonts,'pbw':str(pbw),'sha256':sha(pbw.read_bytes()),'nativeBytes':len(binary),'nativePayloadsUnchanged':True,'firaGeometryMatches':True,'nativePreviewCodeAndResourcesMatch':True,'checks':'source fingerprints, package identity, keys, permissions, navigation, settings, native payloads, linked Fira tables'}
output=root/'build/qa/artifact.json';output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
