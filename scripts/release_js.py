"""Deterministic release JavaScript and separate SDK/debug provenance."""
from pathlib import Path
import hashlib
import io
import json
import re
import subprocess
import tempfile
import zipfile


TOOL_VERSION = '5.46.0'
SCRIPTS = ('pebble-js-app.js', 'plugin.js')
DEBUG_FILES = {'manifest.json', 'sdk/pebble-js-app.js', 'sdk/pebble-js-app.js.map', 'sdk/plugin.js'} | {
    'runtime/' + name + suffix for name in SCRIPTS for suffix in ('', '.map')}


def digest(content):
    return hashlib.sha256(content).hexdigest()


def minify_js(root, name, code, source_map=None):
    """Parse/mangle code as data; never execute SDK/application input."""
    with tempfile.TemporaryDirectory(prefix='halftone-release-js-') as scratch:
        scratch = Path(scratch)
        source, target, target_map = scratch / 'input.js', scratch / name, scratch / (name + '.map')
        source.write_bytes(code)
        args = ['node', str(root / 'scripts/minify-js.cjs'), str(source), str(target), str(target_map)]
        if source_map is not None:
            input_map = scratch / 'input.js.map'
            input_map.write_bytes(source_map)
            args.append(str(input_map))
        result = subprocess.run(args, cwd=root, capture_output=True)
        if result.returncode:
            raise ValueError('JavaScript minification failed: ' + result.stderr.decode(errors='replace').strip())
        return target.read_bytes(), target_map.read_bytes()


def prepare_js(root, version, sdk_code, sdk_map, plugin):
    debug = {'sdk/pebble-js-app.js': sdk_code, 'sdk/pebble-js-app.js.map': sdk_map,
             'sdk/plugin.js': plugin}
    runtime, identities = {}, {}
    for name, code, source_map in (('pebble-js-app.js', sdk_code, sdk_map), ('plugin.js', plugin, None)):
        runtime[name], mapped = minify_js(root, name, code, source_map)
        debug['runtime/' + name] = runtime[name]
        debug['runtime/' + name + '.map'] = mapped
        identities[name] = {'sdkSha256': digest(code), 'runtimeSha256': digest(runtime[name]),
                            'runtimeMapSha256': digest(mapped)}
    debug['manifest.json'] = json.dumps({
        'version': version, 'tool': 'terser', 'toolVersion': TOOL_VERSION,
        'minifierSha256': digest((root / 'scripts/minify-js.cjs').read_bytes()),
        'policy': 'ES5 UTF-8; dollar-free local names; no compression/property mangling; keep function names and licence comments; no runtime map URL',
        'bundles': identities
    }, indent=2).encode() + b'\n'
    return runtime, debug


def zip_payloads(payloads):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, content in sorted(payloads.items()):
            info = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, content, compresslevel=9)
    return buffer.getvalue()


def audit_js(root, version, runtime, debug, *, sdk_code=None, sdk_map=None, plugin=None):
    if set(debug) != DEBUG_FILES:
        raise ValueError('Unexpected JavaScript debug archive inventory')
    manifest = json.loads(debug['manifest.json'])
    if (manifest.get('version') != version or manifest.get('tool') != 'terser' or
            manifest.get('toolVersion') != TOOL_VERSION or
            manifest.get('minifierSha256') != digest((root / 'scripts/minify-js.cjs').read_bytes())):
        raise ValueError('JavaScript minifier/debug provenance differs')
    for name, expected in (('sdk/pebble-js-app.js', sdk_code), ('sdk/pebble-js-app.js.map', sdk_map), ('sdk/plugin.js', plugin)):
        if expected is not None and debug[name] != expected:
            raise ValueError('Original SDK/source JavaScript differs: ' + name)
    # Recompute every byte instead of trusting hashes or a claimed tool version.
    expected_runtime, expected_debug = prepare_js(root, version, debug['sdk/pebble-js-app.js'],
                                                 debug['sdk/pebble-js-app.js.map'], debug['sdk/plugin.js'])
    if runtime != expected_runtime or debug != expected_debug:
        raise ValueError('Release JavaScript or source map differs from exact minification')
    if any(re.search(rb'(?:^|\n)//[#@]\s*sourceMappingURL=', content) for content in runtime.values()):
        raise ValueError('Release JavaScript references an absent map')
    return {'tool': 'terser', 'version': TOOL_VERSION, 'recomputedCodeAndMapsMatch': True,
            'sdkSourcesPreserved': True, 'runtimeMapUrlsAbsent': True,
            'originalBytes': {name: len(debug['sdk/' + name]) for name in SCRIPTS},
            'runtimeBytes': {name: len(runtime[name]) for name in SCRIPTS}}
