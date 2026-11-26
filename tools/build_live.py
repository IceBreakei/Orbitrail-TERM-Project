"""Build the current Alpha release from current Development without publishing logs or tooling."""
from pathlib import Path
import shutil,json,re,hashlib
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public'
release=json.loads((ROOT/'Development/release-version.json').read_text(encoding='utf-8'))
VERSION=f"{release['stage']} {release['version']}"
OUT.mkdir(exist_ok=True)
root_files=['secondary-account.js','account-service-config.js','username-login.js','index.html','style.css','script.js','login-splash.js','project.html','project.js','project.css','admin-access.js','guest-session.js','firebase-client.js','firebase-config.js','loading-screen.js','loading-screen.css']
for name in root_files:
 shutil.copy2(ROOT/name,OUT/name)
 if name.endswith('.html'):
  page=OUT/name
  page.write_text(re.sub(r'Alpha \d+\.\d+\.\d+',VERSION,page.read_text(encoding='utf-8')),encoding='utf-8')
for folder in ['sprites','Audio']:
 for source in (ROOT/folder).rglob('*'):
  if source.is_file() and source.suffix.lower() in {'.png','.gif','.jpg','.jpeg','.webp','.svg','.mp3','.ogg','.wav','.json'}:
   target=OUT/source.relative_to(ROOT);target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
for folder in ['Development','Game']:
 target=OUT/folder;target.mkdir(exist_ok=True)
 for source in (ROOT/'Development').iterdir():
  if source.is_file() and source.suffix.lower() in {'.js','.css','.html','.json','.png','.woff','.woff2'}:shutil.copy2(source,target/source.name)
 # Animation manifests reference nested generated PNGs beside the runtime modules.
 for source in (ROOT/'Development/generated').rglob('*'):
  if source.is_file() and source.suffix.lower() in {'.png','.gif','.jpg','.webp','.json'}:
   frame=target/'generated'/source.relative_to(ROOT/'Development/generated');frame.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,frame)
# Production defaults never inherit development's seed-0/one-HP test mode or invincibility.
config=OUT/'Game/game-config.js'
text=config.read_text(encoding='utf-8').replace('adminSeedByDefault: true, randomSpawning: false, invincible: true','adminSeedByDefault: false, randomSpawning: true, invincible: false')
config.write_text(text,encoding='utf-8')
for name in ['movement.html','movement-optimized.html']:
 page=OUT/'Game'/name;text=page.read_text(encoding='utf-8').replace('<html lang="en">','<html lang="en" data-runtime="live">').replace('<script src="dev-session.js"></script>','').replace('type="checkbox" checked> Invincibility','type="checkbox"> Invincibility').replace('<title>Schale | Movement preview</title>',f'<title>Operation Orbitrail | {VERSION}</title>')
 page.write_text(text,encoding='utf-8')
# Development entry stays admin-only; ordinary login always opens the production arena.
(OUT/'404.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>Not found</title><a href="/">Return to Operation Orbitrail</a></html>',encoding='utf-8')
# Validate string-based asset manifests as well as HTML/import references.
# These include boss/effect animation frames loaded through Image at startup.
from urllib.parse import unquote
asset_pattern=re.compile(r"""['"]((?:\.\.?/)[^'"\n]+\.(?:png|gif|jpg|jpeg|webp|mp3|ogg|wav|json|svg|woff2?))['"]""")
checked=0
for folder in ['Development','Game']:
 for module in (OUT/folder).glob('*.js'):
  for reference in asset_pattern.findall(module.read_text(encoding='utf-8',errors='replace')):
   if '${' in reference:continue
   # The unused font21 variant is retained for compatibility; no current UI requests it.
   if module.name=='bitmap-font.js' and reference=='../sprites/font2.1.png':continue
   asset=(module.parent/unquote(reference)).resolve()
   assert asset.is_relative_to(OUT.resolve()) and asset.is_file(),f'Missing release asset: {module.name}: {reference}'
   checked+=1
print(f'Validated {checked} runtime asset references')
files=[p for p in OUT.rglob('*') if p.is_file() and p.name!='release.json']
manifest={'version':VERSION,'source':'Development','files':len(files),'bytes':sum(p.stat().st_size for p in files),'runtimeSha256':hashlib.sha256((OUT/'Game/movement.js').read_bytes()).hexdigest()}
(OUT/'release.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
assert not any(p.name in {'chat_log.txt','Memory Activity Log.txt','AGENTS.md'} for p in files)
print(json.dumps(manifest,indent=2))
