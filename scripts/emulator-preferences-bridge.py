#!/usr/bin/env python3
"""Exact packaged phone scripts -> native watch -> persisted application receipt.
Phone plugin/PKJS API is simulated over pipes; native app runs unmodified in QEMU.
"""
from pathlib import Path
import argparse,hashlib,json,os,queue,subprocess,sys,threading,time,uuid,zipfile
from repo_workflow import candidate,check_build
from pebble_tool.commands.install import ToolAppInstaller
from libpebble2.protocol.apps import AppRunState,AppRunStateStart,AppRunStateStop
from libpebble2.services.screenshot import Screenshot
from PIL import Image,ImageChops
from libpebble2.communication.transports.qemu.protocol import QemuContentSize
from pebble_tool.commands.emucontrol import send_data_to_qemu
from libpebble2.protocol.system import TimeMessage,SetUTC
from libpebble2.services.appmessage import AppMessageService,ByteArray,Uint32,CString
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--optics',type=int,choices=(0,1),default=0);args=parser.parse_args()
ROOT=Path(__file__).resolve().parents[1];PBW=candidate(ROOT,'Halftone');check_build(ROOT,PBW)
OUT=ROOT/'build/qa/preferences-bridge'/str(time.time_ns());OUT.mkdir(parents=True)
os.environ['PEBBLE_QA_STATE']=str(OUT/'emulator');sys.path.insert(0,str(ROOT.parent/'recovery-validation'))
from pipe_emulator import connect
with zipfile.ZipFile(PBW) as source,zipfile.ZipFile(OUT/'native.pbw','w') as native:
    info=json.loads(source.read('appinfo.json'))
    for name in ('plugin.js','pebble-js-app.js'):(OUT/name).write_bytes(source.read(name))
    for name in source.namelist():
        if name=='appinfo.json' or name.startswith('emery/'):native.writestr(name,source.read(name))
keys=info['messageKeys'];inverse={value:key for key,value in keys.items()};target=uuid.UUID(info['uuid'])
p=connect();service=AppMessageService(p);lines=queue.Queue();lock=threading.Lock();closing=threading.Event();transactions={};transport_lock=threading.Lock();transport_trace=[];acknowledged=set();replies=[];sessions=[];activity_fixtures=[];commands=0;responses={}
phone=subprocess.Popen(['node',str(ROOT/'scripts/emulator-preferences-phone.cjs'),str(OUT)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
def write(value):
    with lock:
        if closing.is_set():return
        phone.stdin.write(json.dumps(value)+'\n');phone.stdin.flush()
def read():
    for line in phone.stdout:lines.put(json.loads(line))
threading.Thread(target=read,daemon=True).start()
def receive(transaction,app,data):
    if app!=target:return
    payload={inverse[key]:list(value) if isinstance(value,(bytes,bytearray)) else value for key,value in data.items() if key in inverse}
    if payload.get('REQUEST_ACTIVITIES',0)>=2:sessions.append(payload['REQUEST_ACTIVITIES'])
    if keys['DISPLAY_PREFERENCES_RESULT'] in data:replies.append(list(data[keys['DISPLAY_PREFERENCES_RESULT']]))
    write({'type':'native','payload':payload})
def transport(transaction,app,ok):
    with transport_lock:
        identifier=transactions.pop(transaction,None)
        if ok:acknowledged.add(transaction)
        transport_trace.append({'event':'ack' if ok else 'nack','transaction':transaction,'phoneId':identifier})
    if identifier is not None:write({'type':'transport','id':identifier,'ok':ok})
handles=[service.register_handler('appmessage',receive),
 service.register_handler('ack',lambda tid,app:transport(tid,app,True)),
 service.register_handler('nack',lambda tid,app:transport(tid,app,False))]
def pump():
    try:line=lines.get(timeout=.1)
    except queue.Empty:return
    if line['type']=='response':responses[line['id']]=line['result'];return
    if line['type']=='send':
        values={(keys[key] if key in keys else int(key)):ByteArray(bytes(value)) if isinstance(value,list) else CString(value) if isinstance(value,str) else Uint32(value) for key,value in line['payload'].items()}
        # ACKs arrive on the protocol reader thread. Keep bookkeeping atomic
        # with the send so a fast SDK-shell ACK cannot be lost before registration.
        with transport_lock:
            transaction=service.send_message(target,values)
            transactions[transaction]=line['id']
            transport_trace.append({'event':'send','transaction':transaction,'phoneId':line['id'],'keys':list(line['payload'])})
def request(message=None,start=False):
    global commands
    commands+=1;write({'type':'start' if start else 'request','id':commands,'message':message})
    until=time.monotonic()+8
    while commands not in responses and time.monotonic()<until:pump()
    assert commands in responses,'Packaged phone response timed out'
    return responses.pop(commands)
try:
    cases=[]
    page=request({'type':'load_settings','language':'en'});assert page['ok']
    chosen=page['settings'];chosen.update({'BACKGROUND_COLOR':0x005555,'TEXT_COLOR':0xffffff,'ACCENT_COLOR':0x55aaff,'NIGHT_BACKGROUND_COLOR':0x550000,'NIGHT_TEXT_COLOR':0xffffff,'NIGHT_ACCENT_COLOR':0xffff55,'ANIMATIONS':False,'SHOW_STATUS':False})
    chosen.update({key:bool(args.optics) for key in ['LARGE_TEXT','DEPTH_EFFECT','TEXT_SHADOW','PANEL_TRANSITIONS']})
    p.send_packet(TimeMessage(message=SetUTC(unix_time=1704112410,utc_offset=0,tz_name='UTC')))
    def wait_applied():
        until=time.monotonic()+10
        while time.monotonic()<until:
            current=request({'type':'display_status'})
            if current['delivery']['applied']:
                assert current['settings']==chosen,current
                return current
            pump()
        raise AssertionError('Exact native application receipt missing: '+str(current))
    def inject_activity():
        if os.environ.get("PEBBLE_QA_IDLE_FONT")=="1":return
        until=time.monotonic()+4
        while not sessions and time.monotonic()<until:pump()
        assert sessions,'Native activity epoch missing'
        options={'session':sessions[-1],'now':1704112410,'sequence':9000}
        result=subprocess.run(['node',str(ROOT/'scripts/native-preview-fixtures.js')],input=json.dumps(options),text=True,capture_output=True,check=True,cwd=ROOT)
        preset=next(item for item in json.loads(result.stdout)['presets'] if item['name']=='music-24-light')
        frame=bytes(preset['bytes']['ACTIVITY_DATA']);activity_fixtures.append({'session':sessions[-1],'sha256':hashlib.sha256(frame).hexdigest(),'observedAt':1704112410})
        # The synthetic owner shares the single transport with PKJS.
        # Drain the real phone queue before injection, then wait for its ACK
        # before pumping another phone packet into the watch inbox.
        until=time.monotonic()+8
        while transactions and time.monotonic()<until:pump()
        assert not transactions,'Phone transport did not drain before fixture'
        with transport_lock:transaction=service.send_message(target,{keys['ACTIVITY_DATA']:ByteArray(frame)})
        until=time.monotonic()+8
        while transaction not in acknowledged and time.monotonic()<until:time.sleep(.01)
        assert transaction in acknowledged,'Native fixture ACK missing'
        until=time.monotonic()+.5
        while time.monotonic()<until:pump()
    def restart(size):
        previous=sessions[-1] if sessions else None
        p.send_packet(AppRunState(data=AppRunStateStop(uuid=target)));time.sleep(.15)
        send_data_to_qemu(p.transport,QemuContentSize(size=size))
        p.send_packet(AppRunState(data=AppRunStateStart(uuid=target)))
        until=time.monotonic()+6
        while time.monotonic()<until:
            pump()
            if any(frame[3]==1 for frame in replies):break
        assert any(frame[3]==1 for frame in replies),'Native relaunch hello missing'
        wait_applied();time.sleep(.25)
        until=time.monotonic()+4
        while (not sessions or sessions[-1]==previous) and time.monotonic()<until:pump()
        assert sessions and sessions[-1]!=previous,'Relaunch did not establish a new activity epoch'
        inject_activity()
    def capture(name):
        image=Image.frombytes('RGB',(200,228),b''.join(Screenshot(p).grab_image()));image.save(OUT/(name+'.png'));return image
    for index in range(1,4):
        chosen.update({'TEXT_SIZE':0,'APPEARANCE_MODE':2 if index<3 else 0,'MANUAL_APPEARANCE':0 if index==1 else 1,'NIGHT_PALETTE':False})
        saved=request({'type':'save_settings','settings':chosen})
        assert saved['ok'] and saved['delivery']['pending'] and not saved['delivery']['applied'],saved
        if index==1:
            ToolAppInstaller(p,str(OUT/'native.pbw'),quiet=True).install()
            send_data_to_qemu(p.transport,QemuContentSize(size=index))
            p.send_packet(AppRunState(data=AppRunStateStart(uuid=target)));time.sleep(.2);request(start=True)
        wait_applied();replies.clear();restart(index);baseline=capture('follow-size-'+str(index))
        chosen['TEXT_SIZE']=3 if index==1 else 1
        request({'type':'save_settings','settings':chosen});wait_applied();time.sleep(.2);other=capture('other-profile-before-'+str(index))
        date_box=(24,16,176,60)
        assert ImageChops.difference(baseline.crop(date_box),other.crop(date_box)).getbbox() is not None,'Saved text size did not repaint date/readings immediately'
        chosen['TEXT_SIZE']=index
        saved=request({'type':'save_settings','settings':chosen});assert saved['ok'] and saved['delivery']['pending'],saved
        applied=wait_applied();time.sleep(.2);manual=capture('manual-size-'+str(index))
        assert ImageChops.difference(baseline,manual).getbbox() is None,'Manual and matching OS size differ'
        replies.clear();restart(3 if index==1 else 1);restored=capture('manual-restored-'+str(index))
        assert ImageChops.difference(manual,restored).getbbox() is None,'Manual override did not survive conflicting OS size/relaunch'
        expected=0x005555 if index==1 else 0x550000
        assert restored.getpixel((100,210))==((expected>>16)&255,(expected>>8)&255,expected&255)
        cases.append({'size':index,'appearanceMode':chosen['APPEARANCE_MODE'],'manualAppearance':chosen['MANUAL_APPEARANCE'],'pendingBeforeReceipt':saved,'appliedAfterNativeReceipt':applied,'matchingOsPixels':True,'survivesConflictingOsSizeAndRelaunch':True})
    chosen.update({'BACKGROUND_COLOR':0x123456,'NIGHT_BACKGROUND_COLOR':0xabcdef,'APPEARANCE_MODE':1,'NIGHT_PALETTE':True})
    saved=request({'type':'save_settings','settings':chosen});assert saved['ok'];wait_applied();replies.clear();restart(2)
    words=[chosen[key] for key in ['BACKGROUND_COLOR','TEXT_COLOR','ACCENT_COLOR','NIGHT_BACKGROUND_COLOR','NIGHT_TEXT_COLOR','NIGHT_ACCENT_COLOR','CLOCK_FORMAT','SHOW_STATUS','ANIMATIONS','NOTIFICATION_VIBRATION','TEXT_SIZE','APPEARANCE_MODE','MANUAL_APPEARANCE','LARGE_TEXT','DEPTH_EFFECT','TEXT_SHADOW','PANEL_TRANSITIONS']]
    expected=[]
    for word in words:expected+=list(int(word).to_bytes(4,'little'))
    assert any(frame[3]==1 and frame[8:]==expected for frame in replies),'Relaunch lost original RGB/mode values'
    check_build(ROOT,PBW)
    report={'result':'PASS','pbwSha256':hashlib.sha256(PBW.read_bytes()).hexdigest(),'cases':cases,'optics':args.optics,'activityFixtures':activity_fixtures,'firmware':str(p.watch_info.running),'scope':'Exact optimized PBW plugin and PKJS, actual Emery AppMessage transport ACKs and native save/readback/application receipts. All three manual sizes match actual OS-size pixels and survive a conflicting OS size/relaunch. Both palettes, unsupported Follow Appearance fallback and raw RGB Quiet Time migration survive relaunch. Phone SDK/storage simulated;not a physical phone/watch test.'}
    (OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'result':'PASS','path':str(OUT/'report.json')}),flush=True)

finally:
    (OUT/'transport.json').write_text(json.dumps(transport_trace,indent=2)+'\n')
    closing.set()
    for handle in handles:service.unregister_handler(handle)
    phone.terminate();phone.wait(timeout=3)
