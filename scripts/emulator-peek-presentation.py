#!/usr/bin/env python3
"""Check native Peek receipt withdrawal without replacing the source snapshot."""
from pathlib import Path
import argparse,hashlib,importlib.util,json,os,sys,tempfile,threading,time,uuid
from repo_workflow import candidate

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--optics',type=int,choices=(0,1),default=0)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
output=root/('build/qa/native-peek-presentation'+('-optics-1' if args.optics else ''))
output.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(root.parent/'recovery-validation'))
os.environ.setdefault('PEBBLE_QA_STATE',tempfile.mkdtemp(prefix='halftone-peek-nav-'))
from pipe_emulator import connect
from libpebble2.services.appmessage import AppMessageService,Uint32,ByteArray
from libpebble2.services.screenshot import Screenshot
from libpebble2.protocol.apps import AppRunState,AppRunStateStart,AppRunStateStop
from libpebble2.protocol.system import TimeMessage,SetUTC
from libpebble2.communication.transports.qemu.protocol import QemuContentSize,QemuTimelinePeek,QemuBluetoothConnection
from pebble_tool.commands.emucontrol import send_data_to_qemu
from pebble_tool.commands.install import ToolAppInstaller
from PIL import Image
spec=importlib.util.spec_from_file_location('captures',root/'scripts/capture-native-previews.py')
capture=importlib.util.module_from_spec(spec);spec.loader.exec_module(capture)
pbw=candidate(root,'Halftone');info,payload=capture.native_candidate(pbw,output/'native.pbw')
target=uuid.UUID(info['uuid']);keys=info['messageKeys'];p=connect();service=AppMessageService(p)
condition=threading.Condition();sessions=[];presentations=[]
def receive(_tid,app,data):
    if app!=target:return
    with condition:
        token=data.get(keys['REQUEST_ACTIVITIES'],data.get(keys['REQUEST_CONTEXT'],0))
        if isinstance(token,int) and token>=2:sessions.append(token)
        value=data.get(keys['ACTIVITY_PRESENTED'])
        if isinstance(value,(bytes,bytearray)) and len(value)==24:
            presentations.append({'primary':value[1],'secondary':value[2],
                'session':int.from_bytes(value[4:8],'little'),'view':int.from_bytes(value[8:12],'little'),
                'sequence':int.from_bytes(value[12:16],'little'),'expiresAt':int.from_bytes(value[20:24],'little')})
        condition.notify_all()
service.register_handler('appmessage',receive)
send_data_to_qemu(p.transport,QemuBluetoothConnection(connected=True))
ToolAppInstaller(p,str(output/'native.pbw'),quiet=True).install();checks=[];frames=[]
def shot(name):
    path=output/(name+'.png');Image.frombytes('RGB',(200,228),b''.join(Screenshot(p).grab_image())).save(path)
    frames.append({'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'nativePixelsModified':False})
for size in (1,2,3):
    p.send_packet(AppRunState(data=AppRunStateStop(uuid=target)));time.sleep(.25)
    send_data_to_qemu(p.transport,QemuContentSize(size=size))
    send_data_to_qemu(p.transport,QemuTimelinePeek(enabled=False))
    p.send_packet(TimeMessage(message=SetUTC(unix_time=capture.SAMPLE_TIME,utc_offset=0,tz_name='UTC')))
    old=len(sessions);p.send_packet(AppRunState(data=AppRunStateStart(uuid=target)))
    with condition:assert condition.wait_for(lambda:len(sessions)>old,timeout=8)
    session=sessions[-1]
    preset=next(v for v in capture.fixture_plan(session,now=capture.SAMPLE_TIME)['presets'] if v['name']=='timer-24-light')
    preset['integers'].update({key:args.optics for key in ('LARGE_TEXT','DEPTH_EFFECT','TEXT_SHADOW')})
    values={keys[n]:Uint32(v) for n,v in preset['integers'].items()}
    values.update({keys[n]:ByteArray(bytes(v)) for n,v in preset['bytes'].items()})
    service.send_message(target,values)
    with condition:assert condition.wait_for(lambda:presentations and presentations[-1]['session']==session and presentations[-1]['primary']==0,timeout=8)
    before=presentations[-1];time.sleep(.3);shot(str(size)+'-before')
    send_data_to_qemu(p.transport,QemuTimelinePeek(enabled=True));time.sleep(.7);shot(str(size)+'-peek')
    assert presentations[-1]['primary']==255 and presentations[-1]['secondary']==255,presentations[-4:]
    hidden=presentations[-1]
    send_data_to_qemu(p.transport,QemuTimelinePeek(enabled=False))
    with condition:assert condition.wait_for(lambda:presentations[-1]['primary']==0,timeout=8)
    after=presentations[-1];time.sleep(.3);shot(str(size)+'-after')
    assert before['view']==hidden['view']==after['view']
    assert before['sequence']<hidden['sequence']<after['sequence']
    assert before['expiresAt']==after['expiresAt']
    checks.append({'osSize':size,'optics':args.optics,'before':before,'duringPeek':hidden,'after':after,'sourceSnapshotResent':False})
p.send_packet(AppRunState(data=AppRunStateStop(uuid=target)));time.sleep(.3)
(output/'report.json').write_text(json.dumps({'candidatePbwSha256':hashlib.sha256(pbw.read_bytes()).hexdigest(),
    'nativePayloadSha256':payload,'checks':checks,'captures':frames,
    'scope':'Actual native QEMU Peek geometry and navigation receipts with one unchanged synthetic Timer snapshot per OS size; no phone runtime, calendar payload or physical watch'},indent=2)+'\n')
print('Native Peek withdraws and restores presentation at all three actual OS sizes: PASS')
