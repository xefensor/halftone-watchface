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
    require(info['manifestVersion']==2 and info['usesPermissions']==package['pebble']['usesPermissions'] and [p['name'] for p in info['usesPermissions']]==['ReadMusic','Notifications','Location','ReadWatchSettings'] and all(p['reason'] and p['required'] is False for p in info['usesPermissions']),'Permission manifest differs')
    require(info['messageKeys']==dict(zip(package['pebble']['messageKeys'],range(10000,10000+len(package['pebble']['messageKeys'])))),'Wire keys differ')
    require(info['plugin']==package['pebble']['plugin'],'Navigation plugin missing')
    require(built.read('config.html')==(root/'config.html').read_bytes(),'Stale packaged settings')
    for name in [p+'/'+n for p in package['pebble']['targetPlatforms'] for n in ('pebble-app.bin','app_resources.pbpack','manifest.json')]:
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
    from native_identity import renderer_identity
    renderer=source.get('nativeRendererIdentity')
    if renderer:require(renderer==renderer_identity(binary,built.read('emery/app_resources.pbpack')),'Native preview renderer/resources differ')
    else:
        require(sha(built.read('emery/app_resources.pbpack'))==native['emery/app_resources.pbpack'],'Native preview resources differ')
    if not renderer:require(sha(binary)==native['emery/pebble-app.bin'] or
        sha(binary[:124]+b'\0'*4+binary[128:])==source['normalizedNativeBinarySha256'],
        'Native previews describe a different renderer')
    body_fonts=audit_body_fonts(root,built.read('emery/app_resources.pbpack'),binary)
    report={'bodyFonts':body_fonts,'pbw':str(pbw),'sha256':sha(pbw.read_bytes()),'nativeBytes':len(binary),'nativePayloadsUnchanged':True,'firaGeometryMatches':True,'nativePreviewCodeAndResourcesMatch':True,'checks':'source fingerprints, package identity, keys, permissions, navigation, settings, native payloads, linked Fira tables'}
output=root/'build/qa/artifact.json';output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))

from platform_audit import audit_platforms
from native_assets_audit import audit_assets
print(audit_platforms(root,pbw))
print(audit_assets(root,pbw))

# Round previews have independent source identity; Emery pixels cannot stand in
# for Gabbro even when both targets share the same application version.
round_preview=json.loads((root/'src/pkjs/settings-preview-round.js').read_text().split('module.exports = ',1)[1].strip().removesuffix(';'))
from native_identity import renderer_identity as round_renderer_identity
with zipfile.ZipFile(pbw) as round_built:
    actual_round=round_renderer_identity(round_built.read('gabbro/pebble-app.bin'),round_built.read('gabbro/app_resources.pbpack'))
assert round_preview['source']['nativeRendererIdentity']==actual_round,'Round preview renderer/resources differ'
assert len(round_preview['frames'])==24 and round_preview['version']==package['version']
print('Round 2 preview renderer identity: PASS')
