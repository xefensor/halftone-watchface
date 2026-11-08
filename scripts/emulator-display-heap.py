#!/usr/bin/env python3
"""Measure exact-candidate native startup after loading every body font."""
from pathlib import Path
import sys,os,time,uuid,json,zipfile,tempfile,hashlib
root=Path(__file__).resolve().parents[1];out=root/'build/qa/preferences-heap';out.mkdir(parents=True,exist_ok=True)
os.environ['PEBBLE_QA_STATE']=tempfile.mkdtemp(prefix='halftone-display-heap-');sys.path.insert(0,str(root.parent/'recovery-validation'))
from pipe_emulator import connect
from pebble_tool.commands.install import ToolAppInstaller
from libpebble2.protocol.apps import AppRunState,AppRunStateStart
from libpebble2.protocol.logs import AppLogMessage,AppLogShippingControl
version=json.loads((root/'package.json').read_text())['version'];pbw=root/'build/candidate'/('Halftone-'+version+'.pbw')
with zipfile.ZipFile(pbw) as archive,zipfile.ZipFile(out/'native.pbw','w') as native:
 info=json.loads(archive.read('appinfo.json'))
 for name in archive.namelist():
  if name=='appinfo.json' or name.startswith('emery/'):native.writestr(name,archive.read(name))
p=connect();logs=[];p.register_endpoint(AppLogMessage,lambda packet:logs.append(packet.message));p.send_packet(AppLogShippingControl(enable=True))
ToolAppInstaller(p,str(out/'native.pbw'),quiet=True).install();p.send_packet(AppRunState(data=AppRunStateStart(uuid=uuid.UUID(info['uuid']))));time.sleep(1)
measurements=[line for line in logs if 'Native state' in line];assert measurements,logs
(out/'report.json').write_text(json.dumps({'result':'PASS','pbwSha256':hashlib.sha256(pbw.read_bytes()).hexdigest(),'firmware':str(p.watch_info.running),'measurements':measurements,'scope':'Exact candidate native payload; startup after loading all eight body fonts. No repeated-settings peak/leak measurement.'},indent=2)+'\n')
print(measurements)
