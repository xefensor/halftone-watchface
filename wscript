#
# This file is the default set of rules to compile a Pebble application.
#
# Feel free to customize this to your needs.
#
import json
import os.path
from waflib.TaskGen import after_method, feature

top = '.'
out = 'build'


@feature('message_keys')
@after_method('process_message_keys')
def message_key_cache_inputs(task_gen):
    # SDK 4.33.1 sets the obsolete dep_vars field for these generated files.
    # Waf 2 uses vars: without it, its shared cache can restore another build's
    # old keys even after pebble clean, leaving C and JavaScript out of sync.
    for task in task_gen.tasks:
        if hasattr(task, 'message_keys') and 'MESSAGE_KEYS' not in task.vars:
            task.vars = list(task.vars) + ['MESSAGE_KEYS']


@feature('generate_resource_ball')
@after_method('process_resource_ball')
def font_cache_inputs(task_gen):
    # A font's regex and rendering options live on its resource definition,
    # outside the SDK task's normal signature. Include them so an older cached
    # font cannot silently omit newly requested glyphs, even after clean.
    for task in task_gen.tasks:
        definition = getattr(task, 'definition', None)
        if definition is not None and definition.type == 'font':
            task.env = task.env.derive()
            task.env.WATCHFACE_FONT_DEFINITION = json.dumps(
                definition.__dict__, sort_keys=True)
            task.vars = list(task.vars) + ['WATCHFACE_FONT_DEFINITION']


def options(ctx):
    ctx.load('pebble_sdk')


def configure(ctx):
    """
    This method is used to configure your build. ctx.load(`pebble_sdk`) automatically configures
    a build for each valid platform in `targetPlatforms`. Platform-specific configuration: add your
    change after calling ctx.load('pebble_sdk') and make sure to set the correct environment first.
    Universal configuration: add your change prior to calling ctx.load('pebble_sdk').
    """
    ctx.load('pebble_sdk')


def build(ctx):
    ctx.load('pebble_sdk')

    build_worker = os.path.exists('worker_src')
    binaries = []

    cached_env = ctx.env
    for platform in ctx.env.TARGET_PLATFORMS:
        ctx.env = ctx.all_envs[platform]
        # GCC 14 link-time optimization removes duplicate static helpers across
        # the host and its libraries. Fat objects retain ordinary archive use.
        ctx.env.append_unique('CFLAGS', ['-flto', '-ffat-lto-objects'])
        ctx.env.append_unique('LINKFLAGS', ['-flto'])
        ctx.set_group(ctx.env.PLATFORM_NAME)
        app_elf = '{}/pebble-app.elf'.format(ctx.env.BUILD_DIR)
        ctx.pbl_build(source=ctx.path.ant_glob('src/c/**/*.c'), target=app_elf, bin_type='app')

        if build_worker:
            worker_elf = '{}/pebble-worker.elf'.format(ctx.env.BUILD_DIR)
            binaries.append({'platform': platform, 'app_elf': app_elf, 'worker_elf': worker_elf})
            ctx.pbl_build(source=ctx.path.ant_glob('worker_src/c/**/*.c'),
                          target=worker_elf,
                          bin_type='worker')
        else:
            binaries.append({'platform': platform, 'app_elf': app_elf})
    ctx.env = cached_env

    ctx.set_group('bundle')
    ctx.pbl_bundle(binaries=binaries,
                   js=ctx.path.ant_glob(['src/pkjs/**/*.js',
                                         'src/pkjs/**/*.json',
                                         'src/common/**/*.js']),
                   js_entry_file='src/pkjs/index.js')
