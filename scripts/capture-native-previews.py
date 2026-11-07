#!/usr/bin/env python3
"""Capture all 24 Clay presets from an explicitly selected Emery emulator.

Example (run with the Python environment used by the Pebble CLI):
  python3 scripts/capture-native-previews.py --emulator emery --pbw build/pebble-watchface-halftone.pbw

A native-only copy of the candidate is installed through the phone bridge so
its PKJS cannot replace injected fixture states. Native payload bytes remain
identical. The actual installed copy and source candidate both receive hashes.

For an already initialized persistent shell, import this file and call
capture(pebble, pbw, output, appmessage=existing_appmessage_service). No emulator
is selected or opened merely by importing this module or using --plan.
"""
from __future__ import annotations
import argparse
import base64
import datetime
import hashlib
import json
import os
from pathlib import Path
from repo_workflow import candidate as candidate_pbw, qa_output
import subprocess
import threading
import time
import uuid
import zipfile

ROOT=Path(__file__).resolve().parents[1]
NATIVE_FILES=('emery/pebble-app.bin','emery/app_resources.pbpack','emery/manifest.json')
SAMPLE_TIME=int(datetime.datetime(2026,11,1,13,5,tzinfo=datetime.timezone.utc).timestamp())

def sha256(value):
    return hashlib.sha256(value).hexdigest()

def fixture_plan(session,now=SAMPLE_TIME-1,mode=None,sequence=None,names=None,language='en'):
    options={'session':session,'now':now,'mode':mode,'language':language}
    if sequence is not None:options['sequence']=sequence
    if names is not None:options['names']=names
    result=subprocess.run(['node',str(ROOT/'scripts/native-preview-fixtures.js')],
        input=json.dumps(options),capture_output=True,text=True,check=True,cwd=ROOT)
    return json.loads(result.stdout)

def native_candidate(pbw,output):
    """Omit phone JS while retaining exact candidate native bytes and metadata."""
    with zipfile.ZipFile(pbw) as source:
        appinfo=json.loads(source.read('appinfo.json'))
        native={name:source.read(name) for name in NATIVE_FILES}
        with zipfile.ZipFile(output,'w') as target:
            for info in source.infolist():
                if info.filename=='appinfo.json' or info.filename.startswith('emery/'):
                    target.writestr(info,source.read(info.filename))
    with zipfile.ZipFile(output) as target:
        assert 'pebble-js-app.js' not in target.namelist()
        assert all(target.read(name)==data for name,data in native.items())
    return appinfo,{name:sha256(data) for name,data in native.items()}

def capture(pebble,pbw,output,preview=None,appmessage=None):
    """Install a native-only candidate, inject fixtures, capture and embed PNGs.

    `pebble` must be a connected, asynchronously running libpebble2 connection
    to Emery/QEMU. An optional existing AppMessageService avoids registering a
    second service on a persistent shell's same endpoint. Other fixture senders
    should be stopped before calling this function.
    """
    from libpebble2.services.appmessage import AppMessageService,Uint32,ByteArray
    from libpebble2.services.screenshot import Screenshot
    from libpebble2.protocol.system import TimeMessage,SetUTC
    from libpebble2.protocol.apps import AppRunState,AppRunStateStart
    from libpebble2.communication.transports.qemu.protocol import QemuTimelinePeek,QemuTimeFormat,QemuBattery,QemuBluetoothConnection
    from pebble_tool.commands.emucontrol import send_data_to_qemu
    from pebble_tool.commands.install import ToolAppInstaller
    from PIL import Image

    pbw=Path(pbw).resolve();output=Path(output).resolve();output.mkdir(parents=True,exist_ok=True)
    preview=Path(preview or output/'settings-preview.js')
    preview.parent.mkdir(parents=True,exist_ok=True)
    native_pbw=output/'native-candidate.pbw'
    if native_pbw==pbw:raise ValueError('Source PBW must differ from the native-only output')
    appinfo,native_hashes=native_candidate(pbw,native_pbw)
    with zipfile.ZipFile(native_pbw) as captured:
        captured_binary=captured.read('emery/pebble-app.bin')
    # SDK4.33.1 injects only this four-byte resource timestamp. Preserve every
    # other byte and the binary length in an independently reproducible hash.
    if len(captured_binary)<128:raise ValueError('Truncated captured native binary')
    normalized_binary_sha256=sha256(captured_binary[:124]+b'\0'*4+captured_binary[128:])
    target=uuid.UUID(appinfo['uuid']);keys=appinfo['messageKeys']
    package=json.loads((ROOT/'package.json').read_text());version=package['version']
    if appinfo.get('versionLabel')!=version or appinfo['uuid']!=package['pebble']['uuid']:
        raise ValueError('Capture requires the current Halftone version and UUID')
    service=appmessage or AppMessageService(pebble)
    owned=appmessage is None
    condition=threading.Condition();receipts={};sessions=[]
    def receive(_tid,app_uuid,data):
        if app_uuid!=target:return
        token=data.get(keys['REQUEST_ACTIVITIES'],data.get(keys['REQUEST_CONTEXT'],0))
        if isinstance(token,int) and token>=2:
            with condition:
                sessions.append(token);condition.notify_all()
    def receipt(success):
        def callback(tid,app_uuid):
            if app_uuid==target:
                with condition:receipts[tid]=success;condition.notify_all()
        return callback
    handles=[service.register_handler('appmessage',receive),
        service.register_handler('ack',receipt(True)),service.register_handler('nack',receipt(False))]
    def send(dictionary):
        with condition:
            tid=service.send_message(target,dictionary)
            if not condition.wait_for(lambda:tid in receipts,timeout=10):raise RuntimeError('AppMessage ACK timed out')
            if not receipts.pop(tid):raise RuntimeError('Watch rejected capture fixture')
    host_rtc=os.environ.get('PEBBLE_QA_HOST_RTC')=='1'
    def set_time():
        if host_rtc:return
        pebble.send_packet(TimeMessage(message=SetUTC(unix_time=SAMPLE_TIME,utc_offset=0,tz_name='UTC')))
    def screenshot(path):
        rows=Screenshot(pebble).grab_image()
        if len(rows)!=228 or any(len(row)!=600 for row in rows):raise RuntimeError('Expected native 200×228 Screenshot-service RGB')
        pixels=b''.join(rows);Image.frombytes('RGB',(200,228),pixels).save(path)
        return pixels
    try:
        # The phone bridge replaces cached JS with a PBW whose JS source is
        # absent. Loading it stops the old JS runtime before native startup.
        send_data_to_qemu(pebble.transport,QemuBluetoothConnection(connected=True))
        ToolAppInstaller(pebble,str(native_pbw),quiet=True).install()
        # Some SDK bridge installs complete while the launcher/previous face
        # remains visible. Explicitly start this exact installed native UUID.
        pebble.send_packet(AppRunState(data=AppRunStateStart(uuid=target)))
        with condition:
            if not condition.wait_for(lambda:bool(sessions),timeout=8):
                raise RuntimeError('Native session request not received after install')
            session=sessions[-1]
        plan=fixture_plan(session,now=int(time.time()) if host_rtc else SAMPLE_TIME-1)
        (output/'fixtures.json').write_text(json.dumps(plan,indent=2)+'\n')
        send_data_to_qemu(pebble.transport,QemuBattery(percent=100,charging=False))
        frames={};captures=[]
        actual_presets=[]
        for preset_index,preset in enumerate(plan['presets']):
            if host_rtc:preset=fixture_plan(session,now=int(time.time()))['presets'][preset_index]
            actual_presets.append(preset)
            if any(token!=session for token in sessions):raise RuntimeError('Native session changed during capture')
            set_time()
            send_data_to_qemu(pebble.transport,QemuTimeFormat(is_24_hour=preset['format']==24))
            send_data_to_qemu(pebble.transport,QemuTimelinePeek(enabled=preset['state']=='timeline'))
            dictionary={keys[name]:Uint32(value) for name,value in preset['integers'].items()}
            dictionary.update({keys[name]:ByteArray(bytes(value)) for name,value in preset['bytes'].items()})
            send(dictionary)
            time.sleep(.8)
            path=output/(preset['name']+'.png');previous=None
            for attempt in range(3):
                pixels=screenshot(path)
                if previous==pixels:break
                previous=pixels;time.sleep(.15)
            else:raise RuntimeError('Native screenshot did not settle: '+preset['name'])
            png=path.read_bytes()
            frames[preset['name']]={'src':'data:image/png;base64,'+base64.b64encode(png).decode(),
                'sha256':sha256(png),'preserve':preset['preserve']}
            captures.append({'name':preset['name'],'file':path.name,'fixture_now_utc':preset.get('fixtureNow',plan['now']),'sha256':sha256(png),
                'rgb_sha256':sha256(pixels),'pixels':[200,228],'native_pixels_modified':False,
                'settled_native_rgb_equal':True})
            print('Captured '+preset['name'],flush=True)
        if len({row['rgb_sha256'] for row in captures})!=24:
            raise RuntimeError('Expected 24 distinct native state/clock/theme images; inspect captures before embedding')
        plan['presets']=actual_presets
        (output/'fixtures.json').write_text(json.dumps(plan,indent=2)+'\n')
        result={'version':version,'source':{'capturedFromCandidatePbwSha256':sha256(native_pbw.read_bytes()),
            'candidateSourcePbwSha256':sha256(pbw.read_bytes()),'nativePayloadSha256':native_hashes,
            'normalizedNativeBinarySha256':normalized_binary_sha256,
            'timelineSample':'Actual native unobstructed geometry; reserved OS panel, no event payload.'},'frames':frames}
        report={'version':version,'pbw_sha256':sha256(native_pbw.read_bytes()),
            'candidate_source_pbw_sha256':sha256(pbw.read_bytes()),'native_payload_sha256':native_hashes,
            'phone_javascript_executed':False,'fixture_encoder':{'core':plan['coreVersion'],
                'activities':plan['activitiesVersion'],'core_wire_version':4,'activity_wire_version':plan['activityWireVersion']},
            'fixture_time_utc':plan['now'],'fixture_time_mode':'host-rtc' if host_rtc else 'fixed-utc','session':session,'captures':captures,
            'scope':'24 actual native Screenshot-service presets; sample data, not live phone/provider verification.',
            'visual_review':{'reviewed':False}}
        # Write assets only after all twenty-four native captures settle successfully.
        preview.write_text("'use strict';\n\n// Actual native "+version+" samples; generated by scripts/capture-native-previews.py.\nmodule.exports = "+json.dumps(result,separators=(',',':'))+";\n")
        (output/'previews.json').write_text(json.dumps(report,indent=2)+'\n')
        return report
    finally:
        send_data_to_qemu(pebble.transport,QemuTimelinePeek(enabled=False))
        for handle in handles:service.unregister_handler(handle)
        if owned:service.shutdown()


def capture_activities(pebble,session,output,appmessage=None,verify_ticks=True):
    """Capture affected generic layouts on the existing native candidate.

    Call after capture() in the same emulator session. This function does not
    reinstall, launch, reconnect or modify the twenty-four Clay preview frames.
    """
    from libpebble2.services.appmessage import AppMessageService,Uint32,ByteArray
    from libpebble2.services.screenshot import Screenshot
    from libpebble2.protocol.system import TimeMessage,SetUTC
    from libpebble2.communication.transports.qemu.protocol import QemuTimelinePeek,QemuTimeFormat
    from pebble_tool.commands.emucontrol import send_data_to_qemu
    from PIL import Image

    host_rtc=os.environ.get('PEBBLE_QA_HOST_RTC')=='1'
    output=Path(output).resolve();output.mkdir(parents=True,exist_ok=True)
    exported=(output.parent/'native-previews/settings-preview.js').read_text().split('module.exports = ',1)[1].strip().removesuffix(';')
    preview=json.loads(exported)
    with zipfile.ZipFile(output.parent/'native-previews/native-candidate.pbw') if (output.parent/'native-previews/native-candidate.pbw').is_file() else zipfile.ZipFile(ROOT/'build'/(ROOT.name+'.pbw')) as archive:
        appinfo=json.loads(archive.read('appinfo.json'))
    target=uuid.UUID(appinfo['uuid']);keys=appinfo['messageKeys']
    if preview['version']!=json.loads((ROOT/'package.json').read_text())['version']:
        raise ValueError('Capture the current twenty-four native presets first')
    service=appmessage or AppMessageService(pebble);owned=appmessage is None
    condition=threading.Condition();receipts={};changed=[]
    def receipt(success):
        def callback(tid,app_uuid):
            if app_uuid==target:
                with condition:receipts[tid]=success;condition.notify_all()
        return callback
    def receive(_tid,app_uuid,data):
        if app_uuid!=target:return
        token=data.get(keys['REQUEST_ACTIVITIES'],data.get(keys['REQUEST_CONTEXT'],0))
        if isinstance(token,int) and token>=2 and token!=session:changed.append(token)
    handles=[service.register_handler('ack',receipt(True)),service.register_handler('nack',receipt(False)),
        service.register_handler('appmessage',receive)]
    sequence=100
    previous_plan=output/'fixtures.json'
    if previous_plan.is_file():
        previous=json.loads(previous_plan.read_text())
        if previous.get('session')==session:
            sequence=max([sequence]+[int.from_bytes(bytes(p['bytes']['ACTIVITY_DATA'])[16:20],'little') for p in previous['presets']])
    plan=fixture_plan(session,now=SAMPLE_TIME,mode='activities',sequence=sequence)
    (output/'fixtures.json').write_text(json.dumps(plan,indent=2)+'\n')
    captures=[]
    try:
        actual_presets=[]
        for preset_index,preset in enumerate(plan['presets']):
            if host_rtc:preset=fixture_plan(session,now=int(time.time()))['presets'][preset_index]
            actual_presets.append(preset)
            if changed:raise RuntimeError('Native session changed; repeat the twenty-four-preview capture first')
            pebble.send_packet(TimeMessage(message=SetUTC(unix_time=SAMPLE_TIME,utc_offset=0,tz_name='UTC')))
            send_data_to_qemu(pebble.transport,QemuTimeFormat(is_24_hour=True))
            send_data_to_qemu(pebble.transport,QemuTimelinePeek(enabled=preset['state']=='timeline'))
            dictionary={keys[name]:Uint32(value) for name,value in preset['integers'].items()}
            dictionary.update({keys[name]:ByteArray(bytes(value)) for name,value in preset['bytes'].items()})
            with condition:
                tid=service.send_message(target,dictionary)
                if not condition.wait_for(lambda:tid in receipts,timeout=10):raise RuntimeError('Activity fixture ACK timed out')
                if not receipts.pop(tid):raise RuntimeError('Watch rejected activity capture fixture')
            time.sleep(preset.get('captureDelaySeconds',.8))
            previous=None;path=output/(preset['name']+'.png')
            for attempt in range(3):
                rows=Screenshot(pebble).grab_image()
                if len(rows)!=228 or any(len(row)!=600 for row in rows):raise RuntimeError('Expected native 200×228 RGB')
                pixels=b''.join(rows)
                # ACT3 may have clocks in both item and activity positions.
                # Compare only the settled OS clock/date/readings region;
                # plain sample readings end above86px, where activity rows
                # and their live clocks can now begin.
                stable=pixels[:200*86*3]
                if previous==stable:break
                previous=stable;time.sleep(.15)
            else:raise RuntimeError('Activity header/readings did not settle: '+preset['name'])
            Image.frombytes('RGB',(200,228),pixels).save(path)
            background=bytes.fromhex(f"{preset['integers']['BACKGROUND_COLOR']:06x}")
            region_checks=[]
            for setting,expect_ink in [('expectInk',True),('expectBlank',False)]:
                for box in preset.get(setting,[]):
                    region=b''.join(pixels[(row*200+box['x'])*3:(row*200+box['x']+box['width'])*3]
                        for row in range(box['y'],box['y']+box['height']))
                    has_ink=any(region[at:at+3]!=background for at in range(0,len(region),3))
                    if has_ink!=expect_ink:raise RuntimeError('Native activity region expectation failed: '+preset['name']+' '+setting)
                    region_checks.append({'region':box,'has_ink':has_ink})
            captured={'name':preset['name'],'file':path.name,'sha256':sha256(path.read_bytes()),
                'rgb_sha256':sha256(pixels),'pixels':[200,228],'native_pixels_modified':False,
                'settled_header_readings_rgb_equal':True,'running_clock_changes_allowed':True,
                'capture_delay_seconds':preset.get('captureDelaySeconds',.8),
                'two_configured_readings':True,'region_checks':region_checks}
            if preset.get('verifyClockTick') and not verify_ticks:
                captured['clock_tick_check']='Not run: this is a layout-only capture'
            if preset.get('verifyClockTick') and verify_ticks:
                # Guest execution can trail host wall time while other build
                # jobs are busy. Observe one unchanged fixture for a bounded
                # interval; never resend it to manufacture a clock update.
                tick_started=time.monotonic()
                time.sleep(1.15)
                while True:
                    later=b''.join(Screenshot(pebble).grab_image())
                    if pixels[200*86*3:]!=later[200*86*3:]:break
                    remaining=3.0-(time.monotonic()-tick_started)
                    if remaining<=0:raise RuntimeError('Visible native clock did not advance within 3s: '+preset['name'])
                    time.sleep(min(.25,remaining))
                tick_wait=time.monotonic()-tick_started
                tick_path=output/(preset['name']+'-tick.png')
                Image.frombytes('RGB',(200,228),later).save(tick_path)
                captured['clock_tick']={'file':tick_path.name,'sha256':sha256(tick_path.read_bytes()),
                    'activity_rgb_changed':True,'fixture_resent':False,'wait_seconds':round(tick_wait,3),
                    'observation_limit_seconds':3,
                    'native_pixels_modified':False}
            captures.append(captured)
            print('Captured '+preset['name'],flush=True)
        # Native Peek hides the activity area, so different clock values must
        # intentionally produce the same unobstructed face above its OS panel.
        # Equivalent layouts are valid: retired LARGE_TEXT has no effect, and
        # native Peek intentionally hides differing activity content. Functional
        # regions and local tick proofs above establish the affected behavior.
        report={'version':preview['version'],'session':session,'source':preview['source'],
            'phone_javascript_executed':False,'candidate_install_unchanged':True,
            'fixture_encoder':{'core':plan['coreVersion'],'activities':plan['activitiesVersion'],
                'core_wire_version':4,'activity_wire_version':plan['activityWireVersion']},'captures':captures,
            'scope':str(len(captures))+' actual activity compositions with two configured sample readings and timed expiry. All source data is synthetic; elapsed workout is not native Workout integration.',
            'local_clock_checks_requested':verify_ticks,
            'visual_review':{'reviewed':False}}
        (output/'activities.json').write_text(json.dumps(report,indent=2)+'\n')
        return report
    finally:
        send_data_to_qemu(pebble.transport,QemuTimelinePeek(enabled=False))
        for handle in handles:service.unregister_handler(handle)
        if owned:service.shutdown()


def capture_complications(pebble,pbw,output,appmessage=None,names=None,language='en'):
    """Capture public reading cases through the production host/label/wire path.

    Installs an exact native-only copy of the supplied candidate. This focused
    mode never updates embedded Clay previews. `language` controls phone value
    formatting only; native captions follow the emulator's actual system locale.
    """
    from libpebble2.services.appmessage import AppMessageService,Uint32,ByteArray
    from libpebble2.services.screenshot import Screenshot
    from libpebble2.protocol.system import TimeMessage,SetUTC
    from libpebble2.protocol.apps import AppRunState,AppRunStateStart
    from libpebble2.communication.transports.qemu.protocol import QemuTimelinePeek,QemuTimeFormat,QemuBattery,QemuBluetoothConnection
    from pebble_tool.commands.emucontrol import send_data_to_qemu
    from pebble_tool.commands.install import ToolAppInstaller
    from PIL import Image

    pbw=Path(pbw).resolve();output=Path(output).resolve();output.mkdir(parents=True,exist_ok=True)
    native=output/'native-candidate.pbw'
    if native==pbw:raise ValueError('Source PBW must differ from the native-only output')
    info,payload=native_candidate(pbw,native)
    target=uuid.UUID(info['uuid']);keys=info['messageKeys']
    service=appmessage or AppMessageService(pebble);owned=appmessage is None
    condition=threading.Condition();sessions=[];receipts={}
    def receive(_tid,app_uuid,data):
        token=data.get(keys['REQUEST_ACTIVITIES'],data.get(keys['REQUEST_CONTEXT'],0))
        if app_uuid==target and isinstance(token,int) and token>=2:
            with condition:sessions.append(token);condition.notify_all()
    def receipt(success):
        def callback(tid,app_uuid):
            if app_uuid==target:
                with condition:receipts[tid]=success;condition.notify_all()
        return callback
    handles=[service.register_handler('appmessage',receive),service.register_handler('ack',receipt(True)),
        service.register_handler('nack',receipt(False))]
    try:
        send_data_to_qemu(pebble.transport,QemuBluetoothConnection(connected=True))
        send_data_to_qemu(pebble.transport,QemuTimelinePeek(enabled=False))
        ToolAppInstaller(pebble,str(native),quiet=True).install()
        pebble.send_packet(AppRunState(data=AppRunStateStart(uuid=target)))
        with condition:
            if not condition.wait_for(lambda:bool(sessions),timeout=8):raise RuntimeError('Native reading session not received')
            session=sessions[-1]
        host_rtc=os.environ.get('PEBBLE_QA_HOST_RTC')=='1'
        start=int(time.time()) if host_rtc else SAMPLE_TIME
        plan=fixture_plan(session,now=start,mode='complications',names=names,language=language)
        if not plan['presets']:raise ValueError('No complication cases matched')
        send_data_to_qemu(pebble.transport,QemuBattery(percent=100,charging=False))
        send_data_to_qemu(pebble.transport,QemuTimeFormat(is_24_hour=True))
        captures=[];actual=[]
        for index,preset in enumerate(plan['presets']):
            if host_rtc:preset=fixture_plan(session,now=int(time.time()),mode='complications',names=names,language=language)['presets'][index]
            if any(token!=session for token in sessions):raise RuntimeError('Native session changed during reading capture')
            actual.append(preset)
            if not host_rtc:
                pebble.send_packet(TimeMessage(message=SetUTC(unix_time=preset['fixtureNow'],utc_offset=0,tz_name='UTC')))
            send_data_to_qemu(pebble.transport,QemuTimelinePeek(enabled=preset['state']=='timeline'))
            values={keys[name]:Uint32(value) for name,value in preset['integers'].items()}
            values.update({keys[name]:ByteArray(bytes(value)) for name,value in preset['bytes'].items()})
            with condition:
                tid=service.send_message(target,values)
                if not condition.wait_for(lambda:tid in receipts,timeout=10):raise RuntimeError('Complication fixture ACK timed out')
                if not receipts.pop(tid):raise RuntimeError('Native complication fixture rejected')
            time.sleep(.8)
            previous=None
            for attempt in range(4):
                rows=Screenshot(pebble).grab_image()
                if len(rows)!=228 or any(len(row)!=600 for row in rows):raise RuntimeError('Expected native 200×228 RGB')
                pixels=b''.join(rows)
                # The active pose includes a genuine running Timer. Its clock
                # may tick while the header and both readings remain settled.
                stable=pixels[:200*106*3] if preset['state']=='active' else pixels
                if previous==stable:break
                previous=stable;time.sleep(.15)
            else:raise RuntimeError('Complication capture did not settle: '+preset['name'])
            destination=output/(preset['name']+'.png')
            Image.frombytes('RGB',(200,228),pixels).save(destination)
            captures.append({'name':preset['name'],'file':destination.name,'scenario':preset['scenario'],
                'theme':preset['theme'],'timelinePeek':preset['state']=='timeline','language':preset['language'],
                'fixture_now_utc':preset['fixtureNow'],'sha256':sha256(destination.read_bytes()),
                'rgb_sha256':sha256(pixels),'settled_native_rgb_equal':preset['state']!='active',
                'settled_header_readings_rgb_equal':True,'running_activity_clock_changes_allowed':preset['state']=='active',
                'native_pixels_modified':False})
            print('Captured '+preset['name'],flush=True)
        plan['presets']=actual
        (output/'fixtures.json').write_text(json.dumps(plan,indent=2)+'\n')
        report={'version':info['versionLabel'],'session':session,'candidate_source_pbw_sha256':sha256(pbw.read_bytes()),
            'captured_native_pbw_sha256':sha256(native.read_bytes()),'native_payload_sha256':payload,
            'fixture_encoder':{'core':plan['coreVersion'],'activities':plan['activitiesVersion'],
                'core_wire_version':4,'activity_wire_version':plan['activityWireVersion'],
                'production_reading_host':True,'halftone_label_adapter':True},
            'phone_javascript_executed':False,'native_locale':'Emulator system locale; not changed by these fixtures',
            'phone_fixture_language':language,'captures':captures,'visual_review':{'reviewed':False},
            'scope':'Focused actual native complication captures with synthetic public provider envelopes passed through the production phone host, Halftone label adapter and wire encoder in Node. No physical phone/provider/watch verification; no embedded preview assets modified.'}
        (output/'complications.json').write_text(json.dumps(report,indent=2)+'\n')
        return report
    finally:
        send_data_to_qemu(pebble.transport,QemuTimelinePeek(enabled=False))
        for handle in handles:service.unregister_handler(handle)
        if owned:service.shutdown()


def capture_motion(pebble,pbw,output):
    """Observe animated layout and genuine-item replacement as native frames.

    Serial screenshot transfer can miss a short transition. Two endpoint states
    are sufficient evidence; missing intermediate observations are reported,
    never generated. Acquisition times are not physical display latency.
    """
    from libpebble2.services.appmessage import AppMessageService,Uint32,ByteArray
    from libpebble2.services.screenshot import Screenshot
    from libpebble2.protocol.system import TimeMessage,SetUTC
    from libpebble2.protocol.apps import AppRunState,AppRunStateStart
    from libpebble2.communication.transports.qemu.protocol import QemuBluetoothConnection,QemuTimelinePeek,QemuTimeFormat,QemuBattery
    from pebble_tool.commands.emucontrol import send_data_to_qemu
    from pebble_tool.commands.install import ToolAppInstaller
    from PIL import Image
    output=Path(output).resolve();output.mkdir(parents=True,exist_ok=True)
    native=output/'native-candidate.pbw';info,payload=native_candidate(pbw,native)
    target=uuid.UUID(info['uuid']);keys=info['messageKeys']
    service=AppMessageService(pebble);condition=threading.Condition();sessions=[];receipts={}
    def receive(_tid,app_uuid,data):
        token=data.get(keys['REQUEST_ACTIVITIES'],data.get(keys['REQUEST_CONTEXT'],0))
        if app_uuid==target and isinstance(token,int) and token>=2:
            with condition:sessions.append(token);condition.notify_all()
    def receipt(tid,app_uuid):
        if app_uuid==target:
            with condition:receipts[tid]=True;condition.notify_all()
    handles=[service.register_handler('appmessage',receive),service.register_handler('ack',receipt)]
    captures=[];gifs=[]
    def grab(name,started):
        rows=Screenshot(pebble).grab_image()
        if len(rows)!=228 or any(len(row)!=600 for row in rows):raise RuntimeError('Expected native200x228RGB')
        pixels=b''.join(rows);image=Image.frombytes('RGB',(200,228),pixels)
        path=output/(name+'.png');image.save(path)
        meta={'file':path.name,'elapsedMs':round((time.monotonic()-started)*1000),
            'sha256':sha256(path.read_bytes()),'rgbSha256':sha256(pixels),'nativePixelsModified':False}
        captures.append(meta)
        return image,meta
    def sequence(prefix,before,preset):
        started=time.monotonic()
        frames=[before];metadata=[{'file':prefix+'-before.png','elapsedMs':0,
            'rgbSha256':sha256(before.tobytes()),'nativePixelsModified':False}]
        before.save(output/metadata[0]['file']);metadata[0]['sha256']=sha256((output/metadata[0]['file']).read_bytes())
        captures.append(metadata[0]);send(preset)
        for index,offset in enumerate([0,.033,.066,.099,.132,.20,.35,.50]):
            time.sleep(max(0,started+offset-time.monotonic()))
            image,meta=grab(prefix+'-%02d'%index,started);frames.append(image);metadata.append(meta)
        if frames[-1].tobytes()!=frames[-2].tobytes():raise RuntimeError(prefix+' did not settle')
        durations=[max(30,b['elapsedMs']-a['elapsedMs']) for a,b in zip(metadata,metadata[1:])]+[700]
        gif=output/(prefix+'.gif')
        frames[0].save(gif,save_all=True,append_images=frames[1:],duration=durations,loop=0,disposal=2)
        observed={frame.tobytes() for frame in frames}
        with Image.open(gif) as encoded:
            for index in range(encoded.n_frames):
                encoded.seek(index)
                if encoded.convert('RGB').tobytes() not in observed:
                    raise RuntimeError(prefix+' GIF differs from its captured native frames')
            gifs.append({'file':gif.name,'sha256':sha256(gif.read_bytes()),
                'encodedFrames':encoded.n_frames,'onlyObservedNativeRgb':True})
        return frames,metadata
    try:
        host_rtc=os.environ.get('PEBBLE_QA_HOST_RTC')=='1'
        send_data_to_qemu(pebble.transport,QemuTimelinePeek(enabled=False))
        send_data_to_qemu(pebble.transport,QemuBluetoothConnection(connected=True))
        send_data_to_qemu(pebble.transport,QemuTimeFormat(is_24_hour=True))
        send_data_to_qemu(pebble.transport,QemuBattery(percent=100,charging=False))
        if not host_rtc:
            # Apply fixed UTC before native startup as well as afterward. A
            # SetUTC immediately followed by time-bounded AppMessages can leave
            # one valid but unrelated host-RTC/expired frame in the baseline.
            pebble.send_packet(TimeMessage(message=SetUTC(unix_time=SAMPLE_TIME,utc_offset=0,tz_name='UTC')))
        ToolAppInstaller(pebble,str(native),quiet=True).install()
        pebble.send_packet(AppRunState(data=AppRunStateStart(uuid=target)))
        with condition:
            if not condition.wait_for(lambda:bool(sessions),timeout=8):raise RuntimeError('No native session')
        # Keep both short sequences in one clock minute so a legitimate minute
        # tick cannot masquerade as an intermediate header composition.
        remaining=60-time.time()%60
        if host_rtc and remaining<8:time.sleep(remaining+.1)
        now=int(time.time()) if host_rtc else SAMPLE_TIME
        plan=fixture_plan(sessions[-1],now=now);presets={p['name']:p for p in plan['presets']}
        (output/'fixtures.json').write_text(json.dumps(plan,indent=2)+'\n')
        def send(preset):
            values=dict(preset['integers']);values['ANIMATIONS']=1
            dictionary={keys[name]:Uint32(value) for name,value in values.items()}
            dictionary.update({keys[name]:ByteArray(bytes(value)) for name,value in preset['bytes'].items()})
            with condition:
                tid=service.send_message(target,dictionary)
                if not condition.wait_for(lambda:tid in receipts,timeout=8):raise RuntimeError('No fixture ACK')
        if not host_rtc:
            pebble.send_packet(TimeMessage(message=SetUTC(unix_time=now,utc_offset=0,tz_name='UTC')))
            time.sleep(.4)
        send(presets['idle-24-light']);time.sleep(.8)
        idle,_=grab('idle-before',time.monotonic())
        entry,entry_meta=sequence('panel-entry',idle,presets['music-24-light'])
        if entry[0].tobytes()==entry[-1].tobytes():raise RuntimeError('Idle and first Music panel are identical')
        music=entry[-1]
        replacement,replacement_meta=sequence('genuine-replacement',music,presets['notification-24-light'])
        endpoints={replacement[0].tobytes(),replacement[-1].tobytes()}
        if len(endpoints)!=2:raise RuntimeError('Music and Notification endpoints are identical')
        entry_endpoints={entry[0].tobytes(),entry[-1].tobytes()}
        intermediate=sum(frame.tobytes() not in entry_endpoints for frame in entry[1:-1])
        replacement_intermediate=sum(frame.tobytes() not in endpoints for frame in replacement[1:-1])
        report={'version':info['versionLabel'],'candidateSourcePbwSha256':sha256(Path(pbw).read_bytes()),
            'capturedNativePbwSha256':sha256(native.read_bytes()),'nativePayloadSha256':payload,
            'fixtureTimeUtc':now,'fixtureTimeMode':'host-rtc' if host_rtc else 'fixed-utc',
            'captures':captures,'gifs':gifs,'entry':{'gif':'panel-entry.gif','captures':entry_meta,
                'expectedDurationMs':250,'expectedCurve':'quadratic EaseInOut','expectedFrameIntervalMs':33,
                'animatedHeaderAndReadings':True,'endpointStatesObserved':2,'intermediateFramesObserved':intermediate,
                'settledNativeRgbEqual':True,
                'observation':'Only observed states are reported. Screenshot transfer may observe two endpoints without an intermediate frame; no extra frames are invented.'},
            'genuineReplacement':{'gif':'genuine-replacement.gif','captures':replacement_meta,
                'identityChanged':True,'expectedDistancePx':200,'expectedDurationMs':231,
                'expectedCurve':'quadratic EaseOut','expectedFrameIntervalMs':33,
                'endpointStatesObserved':2,'intermediateFramesObserved':replacement_intermediate,
                'settledNativeRgbEqual':True,'liveActivityClocks':False},
            'scope':'Actual native Screenshot-service frames using synthetic idle/Music/notification data. GIFs contain only captured frames with an added final hold; no interpolation. Host acquisition times are not physical-watch latency. No phone runtime or physical device verification.'}
        (output/'motion.json').write_text(json.dumps(report,indent=2)+'\n')
        return report
    finally:
        send_data_to_qemu(pebble.transport,QemuTimelinePeek(enabled=False))
        for handle in handles:service.unregister_handler(handle)
        service.shutdown()

def main():
    parser=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--emulator',choices=['emery'],help='Explicit emulator selection; never inferred')
    parser.add_argument('--pbw',type=Path,default=candidate_pbw(ROOT, 'Halftone'))
    parser.add_argument('--output',type=Path)
    parser.add_argument('--preview',type=Path,help='Explicit asset destination; defaults to the QA output directory')
    parser.add_argument('--plan',action='store_true',help='Print fixture plan only; no connection, installation or images')
    parser.add_argument('--motion',action='store_true',help='Capture incoming replacement frames instead of static presets')
    parser.add_argument('--complications',action='store_true',help='Capture focused production-host reading fixtures without updating Clay previews')
    parser.add_argument('--case',dest='cases',action='append',help='Complication scenario name; repeat to select several')
    parser.add_argument('--language',choices=['en','cs'],default='en',help='Phone fixture value language; native captions follow the emulator locale')
    args=parser.parse_args()
    if args.motion and args.complications:parser.error('Choose --motion or --complications')
    if args.cases and not args.complications:parser.error('--case requires --complications')
    if args.plan:
        print(json.dumps(fixture_plan(42,mode='complications' if args.complications else None,names=args.cases,language=args.language),indent=2));return
    if not args.emulator:parser.error('Capture requires explicit --emulator emery')
    from pebble_tool.commands.base import PebbleCommand
    class PreviewConnection(PebbleCommand):
        valid_connections={'emulator'}
    command=PreviewConnection();command._set_debugging(0)
    connection=command._connect(argparse.Namespace(v=0,emulator=args.emulator,sdk=None,vnc=False,sunlight=False))
    version=json.loads((ROOT/'package.json').read_text())['version']
    if args.complications:capture_complications(connection,args.pbw,args.output or qa_output(ROOT, '')/'native-complications',names=args.cases,language=args.language)
    elif args.motion:capture_motion(connection,args.pbw,args.output or qa_output(ROOT, '')/'native-motion')
    else:capture(connection,args.pbw,args.output or qa_output(ROOT, '')/'native-previews',args.preview)

if __name__=='__main__':main()
