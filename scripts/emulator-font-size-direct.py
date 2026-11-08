#!/usr/bin/env python3
"""Verify individual Text Size keys repaint immediately and survive relaunch.
Native-only Emery execution; no real phone or watch.
"""
from pathlib import Path
import argparse,hashlib,json,os,sys,tempfile,time,uuid,zipfile
from repo_workflow import candidate
from pebble_tool.commands.install import ToolAppInstaller
from pebble_tool.commands.emucontrol import send_data_to_qemu
from libpebble2.protocol.apps import AppRunState,AppRunStateStart,AppRunStateStop
from libpebble2.protocol.system import TimeMessage,SetUTC
from libpebble2.communication.transports.qemu.protocol import QemuContentSize
from libpebble2.services.appmessage import AppMessageService,Uint32
from libpebble2.services.screenshot import Screenshot
from PIL import Image,ImageChops
ROOT=Path(__file__).resolve().parents[1];FACE='Halftone'if'halftone'in ROOT.name else'Dynamic'
parser=argparse.ArgumentParser();parser.add_argument('--pbw',type=Path,default=candidate(ROOT,FACE));parser.add_argument('--label',default='candidate');args=parser.parse_args()
OUT=ROOT/'build/qa/font-size-direct'/args.label;OUT.mkdir(parents=True,exist_ok=True)
os.environ['PEBBLE_QA_STATE']=tempfile.mkdtemp(prefix='face-font-direct-');sys.path.insert(0,str(ROOT.parent/'recovery-validation'))
from pipe_emulator import connect
with zipfile.ZipFile(args.pbw)as source,zipfile.ZipFile(OUT/'native.pbw','w')as native:
 info=json.loads(source.read('appinfo.json'));payload={n:hashlib.sha256(source.read(n)).hexdigest()for n in source.namelist()if n.startswith('emery/')}
 for n in source.namelist():
  if n=='appinfo.json'or n.startswith('emery/'):native.writestr(n,source.read(n))
p=connect();target=uuid.UUID(info['uuid']);keys=info['messageKeys'];service=AppMessageService(p);replies=[]
service.register_handler('appmessage',lambda tid,app,data:replies.append(bytes(data[keys['DISPLAY_PREFERENCES_RESULT']]))if app==target and keys['DISPLAY_PREFERENCES_RESULT']in data else None)
p.send_packet(TimeMessage(message=SetUTC(unix_time=1704112410,utc_offset=0,tz_name='UTC')))
send_data_to_qemu(p.transport,QemuContentSize(size=2));ToolAppInstaller(p,str(OUT/'native.pbw'),quiet=True).install();p.send_packet(AppRunState(data=AppRunStateStart(uuid=target)));time.sleep(.5)
box=(24,16,176,60)if FACE=='Halftone'else(0,0,200,40)
def shot(name):
 im=Image.frombytes('RGB',(200,228),b''.join(Screenshot(p).grab_image()));im.save(OUT/(name+'.png'));return im.crop(box)
frames={};checks=[]
for choice in (1,3,2,0):
 replies.clear();values={keys['TEXT_SIZE']:Uint32(choice)}
 if choice==0:values.update({keys['APPEARANCE_MODE']:Uint32(0),keys['MANUAL_APPEARANCE']:Uint32(0),keys['NIGHT_PALETTE']:Uint32(0)})
 service.send_message(target,values)
 end=time.monotonic()+4
 while not any(int.from_bytes(r[48:52],'little')==choice for r in replies)and time.monotonic()<end:time.sleep(.02)
 assert any(int.from_bytes(r[48:52],'little')==choice for r in replies),'No applied Text Size receipt for '+str(choice)
 if choice==0:assert any(int.from_bytes(r[52:56],'little')==0 for r in replies),'Legacy Night Palette overwrote explicit appearance mode'
 time.sleep(.15);frames[choice]=shot('immediate-'+str(choice))
 p.send_packet(AppRunState(data=AppRunStateStop(uuid=target)));time.sleep(.15);p.send_packet(AppRunState(data=AppRunStateStart(uuid=target)));time.sleep(.4)
 restored=shot('restored-'+str(choice));assert ImageChops.difference(frames[choice],restored).getbbox()is None,'Text Size changed after relaunch'
 checks.append({'choice':choice,'immediateNativeReceipt':True,'survivesRelaunch':True})
assert ImageChops.difference(frames[1],frames[3]).getbbox()is not None,'Small and Large pixels are identical'
assert ImageChops.difference(frames[2],frames[0]).getbbox()is None,'Follow Pebble does not match actual OS Medium'
report={'result':'PASS','pbwSha256':hashlib.sha256(args.pbw.read_bytes()).hexdigest(),'nativePayloadSha256':payload,'checks':checks,'scope':__doc__}
(OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'result':'PASS','path':str(OUT/'report.json')}));service.shutdown()
