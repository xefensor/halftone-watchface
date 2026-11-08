#!/usr/bin/env python3
"""Native loading-art geometry and observed Dynamic outgoing/incoming motion."""
from pathlib import Path
import argparse,hashlib,json,os,subprocess,sys,tempfile,threading,time,uuid,zipfile
from repo_workflow import candidate
from pebble_tool.commands.install import ToolAppInstaller
from pebble_tool.commands.emucontrol import send_data_to_qemu
from libpebble2.protocol.apps import AppRunState,AppRunStateStart
from libpebble2.protocol.system import TimeMessage,SetUTC
from libpebble2.communication.transports.qemu.protocol import QemuContentSize,QemuBluetoothConnection,QemuTimelinePeek
from libpebble2.services.appmessage import AppMessageService,Uint32,ByteArray
from libpebble2.services.screenshot import Screenshot
from PIL import Image,ImageChops
ROOT=Path(__file__).resolve().parents[1];FACE='Halftone'if'halftone'in ROOT.name else'Dynamic'
parser=argparse.ArgumentParser();parser.add_argument('--size',type=int,choices=(1,2,3),default=2);parser.add_argument('--optics',type=int,choices=(0,1),default=0);parser.add_argument('--peek',action='store_true');args=parser.parse_args()
PBW=candidate(ROOT,FACE);OUT=ROOT/'build/qa/media-motion'/f's{args.size}-o{args.optics}{"-peek"if args.peek else""}'
OUT.mkdir(parents=True,exist_ok=True);os.environ['PEBBLE_QA_STATE']=tempfile.mkdtemp(prefix='face-media-motion-');sys.path.insert(0,str(ROOT.parent/'recovery-validation'))
from pipe_emulator import connect
with zipfile.ZipFile(PBW)as source,zipfile.ZipFile(OUT/'native.pbw','w')as native:
 info=json.loads(source.read('appinfo.json'));payload={n:hashlib.sha256(source.read(n)).hexdigest()for n in source.namelist()if n.startswith('emery/')}
 for n in source.namelist():
  if n=='appinfo.json'or n.startswith('emery/'):native.writestr(n,source.read(n))
p=connect();target=uuid.UUID(info['uuid']);keys=info['messageKeys'];service=AppMessageService(p);condition=threading.Condition();sessions=[];acks={}
def receive(tid,app,data):
 if app==target:
  token=data.get(keys['REQUEST_ACTIVITIES'],0)
  if token>=2:
   with condition:sessions.append(token);condition.notify_all()
def ack(tid,app):
 if app==target:
  with condition:acks[tid]=True;condition.notify_all()
service.register_handler('appmessage',receive);service.register_handler('ack',ack)
send_data_to_qemu(p.transport,QemuBluetoothConnection(connected=True));send_data_to_qemu(p.transport,QemuContentSize(size=args.size));p.send_packet(TimeMessage(message=SetUTC(unix_time=1704112410,utc_offset=0,tz_name='UTC')))
ToolAppInstaller(p,str(OUT/'native.pbw'),quiet=True).install();p.send_packet(AppRunState(data=AppRunStateStart(uuid=target)))
with condition:assert condition.wait_for(lambda:bool(sessions),timeout=8),'No activity epoch'
plan=json.loads(subprocess.check_output(['node',str(ROOT/'scripts/native-preview-fixtures.js')],input=json.dumps({'mode':'music-motion','session':sessions[-1],'now':1704112410}),text=True,cwd=ROOT));presets={x['name']:x for x in plan['presets']};sequence=12000
(OUT/'fixtures.json').write_text(json.dumps(plan,indent=2)+'\n')
def send(name):
 global sequence
 preset=presets[name];values={keys[k]:Uint32(v)for k,v in preset['integers'].items()}
 if FACE=='Halftone':values.update({keys[k]:Uint32(args.optics)for k in ('LARGE_TEXT','DEPTH_EFFECT','TEXT_SHADOW')})
 # Use the production encoder for every monotonic view/source revision.
 sequence+=1
 options={'mode':'music-motion','session':sessions[-1],'now':1704112410,'sequence':sequence*10}
 fresh=json.loads(subprocess.check_output(['node',str(ROOT/'scripts/native-preview-fixtures.js')],input=json.dumps(options),text=True,cwd=ROOT));selected=next(x for x in fresh['presets']if x['name']==name)
 values.update({keys[k]:ByteArray(bytes(v))for k,v in selected['bytes'].items()})
 with condition:
  tid=service.send_message(target,values);assert condition.wait_for(lambda:tid in acks,timeout=8),'No ACK'
checks=[];captures=[]
def shot(name):
 im=Image.frombytes('RGB',(200,228),b''.join(Screenshot(p).grab_image()));path=OUT/(name+'.png');im.save(path);captures.append(path.name);return im
for theme in ('light','dark'):
 send_data_to_qemu(p.transport,QemuTimelinePeek(enabled=args.peek))
 send('old-loading-'+theme);time.sleep(.7);pending=shot('old-loading-'+theme)
 send('old-ready-'+theme);time.sleep(.35);old=shot('old-ready-'+theme)
 # Inspect only permitted artwork pixels. Every other pixel must be unchanged.
 a=pending.copy();b=old.copy();art=(24,110 if args.peek else 160,52,171 if args.peek else 216)if FACE=='Halftone'else(10,110 if args.peek else 180,38,171 if args.peek else 216)
 for im in (a,b):im.paste((0,0,0),art)
 assert ImageChops.difference(a,b).getbbox()is None,(theme,'Artwork arrival moved text or replayed motion')
 if not args.peek:assert ImageChops.difference(pending.crop(art),old.crop(art)).getbbox()is not None,'Loading symbol and cover are identical'
 started=time.monotonic();send('new-loading-'+theme);frames=[]
 for i in range(7):frames.append(shot('switch-'+theme+'-'+str(i)))
 time.sleep(.25);new=shot('new-loading-'+theme)
 # The active secondary row has its own fixed home, outside the primary slide.
 if FACE=='Dynamic'and not args.peek:assert ImageChops.difference(old.crop((0,80,200,118)),new.crop((0,80,200,118))).getbbox()is None,'Secondary row moved'
 matched=[]
 if FACE=='Dynamic'and not args.peek:
  box=(0,128,200,228);oldpart=old.crop(box);newpart=new.crop(box);background=(0,0,0)if theme=='dark'else(255,255,255)
  for i,im in enumerate(frames):
   observed=im.crop(box);best=(10**9,None)
   for shift in range(201):
    expected=Image.new('RGB',observed.size,background);expected.paste(oldpart,(-shift,0));expected.paste(newpart,(200-shift,0))
    diff=ImageChops.difference(expected,observed);score=sum(diff.tobytes())
    if score<best[0]:best=(score,shift)
   if best[0]==0 and 0<best[1]<200:matched.append({'frame':i,'outgoingX':-best[1],'incomingX':200-best[1],'exactTranslatedPixels':True})
  # Screenshot transfers can span the entire short animation. Record only
  # observed intermediate frames; endpoints still verify the other theme.
 frames[0].save(OUT/('switch-'+theme+'.gif'),save_all=True,append_images=frames[1:]+[new],duration=[100]*len(frames)+[600],loop=0)
 send('new-ready-'+theme);time.sleep(.35);ready=shot('new-ready-'+theme);a=new.copy();b=ready.copy()
 for im in (a,b):im.paste((0,0,0),art)
 assert ImageChops.difference(a,b).getbbox()is None,'Incoming cover changed text geometry or restarted motion'
 checks.append({'theme':theme,'artworkOnlyChangesReservedHome':True,'secondaryStatic':not args.peek,'observedPairedMotion':matched})
if FACE=='Dynamic'and not args.peek:assert any(c['observedPairedMotion']for c in checks),'No paired intermediate frame was observed in either theme'
report={'result':'PASS','pbwSha256':hashlib.sha256(PBW.read_bytes()).hexdigest(),'nativePayloadSha256':payload,'osSize':args.size,'optics':args.optics,'peek':args.peek,'checks':checks,'captures':captures,'scope':__doc__+' Synthetic production Music adapter/ACT3 fixtures; no real phone or physical watch.'}
(OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'result':'PASS','path':str(OUT/'report.json')}));send_data_to_qemu(p.transport,QemuTimelinePeek(enabled=False));service.shutdown()
