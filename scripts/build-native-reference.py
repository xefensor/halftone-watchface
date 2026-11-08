#!/usr/bin/env python3
"""Build separate native locale-lookup fixtures; OS size remains a real preference."""
from pathlib import Path
import json,shutil,subprocess
from repo_workflow import candidate,check_build

root=Path(__file__).resolve().parents[1]
# Explicit lookup fixture built from current source; never a release candidate.
output=root/'build/qa/native-reference';project=output/'project'
project.mkdir(parents=True,exist_ok=True)
for directory in ('src','resources','vendor','node_modules'):
    shutil.copytree(root/directory,project/directory,dirs_exist_ok=True)
for name in ('package.json','package-lock.json','wscript'):
    shutil.copyfile(root/name,project/name)
for locale in ('cs_CZ','de_DE'):
    source=(root/'src/c/halftone.c').read_text().replace('i18n_get_system_locale()',json.dumps(locale))
    (project/'src/c/halftone.c').write_text(source)
    subprocess.run(['pebble','clean'],cwd=project,check=True)
    subprocess.run(['pebble','build'],cwd=project,check=True)
    shutil.copyfile(project/'build/project.pbw',output/('locale-'+locale[:2]+'.pbw'))
print(output)
