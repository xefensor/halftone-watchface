#!/usr/bin/env python3
"""Actual OS-size native captures, with optional activity/tick and motion checks."""
from pathlib import Path
import argparse,importlib.util,json,os,sys,tempfile,time,uuid
from repo_workflow import candidate

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--pbw',type=Path,default=candidate(root,'Halftone'))
parser.add_argument('--size',type=int,choices=(1,2,3),required=True)
parser.add_argument('--output',type=Path,required=True)
parser.add_argument('--activities',action='store_true')
parser.add_argument('--activity-cases',nargs='+')
parser.add_argument('--motion',action='store_true')
parser.add_argument('--readings',nargs='+',help='Focused public-reading scenario names')
parser.add_argument('--readings-only',action='store_true')
parser.add_argument('--language',default='en',help='Phone fixture formatting language; native lookup is unchanged')
parser.add_argument('--sample-time',type=int,help='Synthetic UTC seconds for clock/date boundary cases')
parser.add_argument('--optics',type=int,choices=(0,1),default=0,help='Set Bigger Text, depth and shadow together')
parser.add_argument('--baseline',type=Path,help='Previous native-previews directory for exact clock-pixel comparison')
args=parser.parse_args()
sys.path.insert(0,str(root.parent/'recovery-validation'))
os.environ.setdefault('PEBBLE_QA_STATE',tempfile.mkdtemp(prefix='halftone-native-size-'))
from pipe_emulator import connect
from libpebble2.communication.transports.qemu.protocol import QemuContentSize
from pebble_tool.commands.emucontrol import send_data_to_qemu
from libpebble2.protocol.logs import AppLogMessage,AppLogShippingControl
from libpebble2.protocol.system import TimeMessage,SetUTC
from libpebble2.protocol.apps import AppRunState,AppRunStateStop
from PIL import Image
spec=importlib.util.spec_from_file_location('native_capture',root/'scripts/capture-native-previews.py')
capture=importlib.util.module_from_spec(spec);spec.loader.exec_module(capture)
if args.sample_time:capture.SAMPLE_TIME=args.sample_time
original_fixture=capture.fixture_plan
def fixture(*a,**kw):
    plan=original_fixture(*a,**kw)
    for entry in plan['presets']:
        entry['integers'].update({key:args.optics for key in ('LARGE_TEXT','DEPTH_EFFECT','TEXT_SHADOW')})
    return plan
capture.fixture_plan=fixture
p=connect();logs=[]
p.register_endpoint(AppLogMessage,lambda packet:logs.append(packet.message))
p.send_packet(AppLogShippingControl(enable=True))
send_data_to_qemu(p.transport,QemuContentSize(size=args.size))
if os.environ.get('PEBBLE_QA_HOST_RTC')!='1':
    # Set the fixture clock before native startup, so its initial clock cache
    # cannot retain the host date while the first time-change event is pending.
    p.send_packet(TimeMessage(message=SetUTC(unix_time=capture.SAMPLE_TIME,utc_offset=0,tz_name='UTC')))
    time.sleep(.2)
report=None if args.readings_only else capture.capture(p,args.pbw,args.output/'native-previews')
if args.activities:
    assert report,'Activity suite requires the standard previews'
    activities=capture.capture_activities(p,report['session'],args.output/'native-activities',names=args.activity_cases)
if args.motion:capture.capture_motion(p,args.pbw,args.output/'native-motion')
if args.readings:capture.capture_complications(p,args.pbw,args.output/'native-readings',names=args.readings,language=args.language)
assert any('Text OS='+str(args.size)+' ' in line for line in logs),logs
comparisons=[]
if args.baseline:
    assert report,'Clock comparisons require the standard previews'
    import math,re
    header=(root/'src/c/generated_clock_glyphs.h').read_text()
    rows=re.findall(r"\{(?:'(.)'|0x([0-9a-f]+)),([\d,-]+)\}",header.split('clock_glyphs[CLOCK_GLYPH_COUNT] = {',1)[1].split('};',1)[0])
    glyphs={ord(char) if char else int(code,16):list(map(int,values.split(','))) for char,code,values in rows}
    for entry in report['captures']:
        name=entry['name'];state=name.split('-')[0];clock='1:05' if '-12-' in name else '13:05'
        point,y=(68+4*args.optics,94) if state=='timeline' else (88+12*args.optics,111+12*args.optics) if state=='idle' else (52+4*args.optics,74+7*args.optics)
        # Advance,y_min,y_max are the actual committed Fira metrics. Compare
        # the entire antialiased clock rectangle, allowing only a y translation.
        width=sum(glyphs[ord(c)][0] for c in clock)*point/1000
        if width>152:point*=152/width
        top=math.floor(y-max(glyphs[ord(c)][6] for c in clock)*point/1000)-1
        bottom=math.ceil(y-min(glyphs[ord(c)][4] for c in clock)*point/1000)+2+args.optics
        old=Image.open(args.baseline/entry['file']).convert('RGB')
        new=Image.open(args.output/'native-previews'/entry['file']).convert('RGB')
        box=(24,top,177,bottom);patch=old.crop(box)
        shifts=[dy for dy in range(-24,25) if 0<=top+dy and bottom+dy<=171 and
            patch.tobytes()==new.crop((24,top+dy,177,bottom+dy)).tobytes()]
        assert shifts,('Fira clock changed beyond allowed vertical shift',name,box)
        border_boxes=[(0,0,23,171 if state=='timeline' else 228),(178,0,200,171 if state=='timeline' else 228)]
        for border in border_boxes:
            assert old.crop(border).tobytes()==new.crop(border).tobytes(),('Dot/corner changed',name,border)
        comparisons.append({'name':name,'clockRegion':box,'verticalShift':min(shifts,key=abs),
            'clockShapeAndSizeUnchanged':True,'dotBorderAndCornersUnchanged':True})
p.send_packet(AppRunState(data=AppRunStateStop(uuid=uuid.UUID(json.loads((root/'package.json').read_text())['pebble']['uuid']))))
time.sleep(.3)
(args.output/'size-checks.json').write_text(json.dumps({'actualOsSize':args.size,'optics':args.optics,'nativeLogs':logs,
    'clockPixelComparisons':comparisons,'physicalWatch':False,'phoneRuntime':False,
    'scope':'Exact packaged native payload in isolated Emery QEMU; synthetic source fixtures and actual OS content size'},indent=2)+'\n')
print('Actual native OS size',args.size,'PASS:',args.output)
