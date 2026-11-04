"""Build a thin bitmap font without moving glyph cells or modifying the original sheet."""
from pathlib import Path
import numpy as np
from PIL import Image
root = Path(__file__).resolve().parents[2]
source = Image.open(root / 'sprites/font.png').convert('RGBA')
pixels = np.array(source)
ink = ((pixels[:, :, :3].min(axis=2) > 180) & (pixels[:, :, 3] > 128)).astype(np.uint8)
# Zhang-Suen thinning preserves connected strokes and endpoints, unlike erosion.
while True:
    changed = False
    for phase in range(2):
        p = np.pad(ink, 1)
        n = [p[:-2,1:-1],p[:-2,2:],p[1:-1,2:],p[2:,2:],p[2:,1:-1],p[2:,:-2],p[1:-1,:-2],p[:-2,:-2]]
        count = sum(n)
        turns = sum(((n[i] == 0) & (n[(i+1)%8] == 1)).astype(np.uint8) for i in range(8))
        guard = (n[0]*n[2]*n[4] == 0) & (n[2]*n[4]*n[6] == 0) if phase == 0 else (n[0]*n[2]*n[6] == 0) & (n[0]*n[4]*n[6] == 0)
        remove = (ink == 1) & (count >= 2) & (count <= 6) & (turns == 1) & guard
        if remove.any(): ink[remove] = 0; changed = True
    if not changed: break
mask = ink.astype(bool)
pad = np.pad(mask, 1)
outline = np.zeros_like(mask)
for y in range(3):
    for x in range(3): outline |= pad[y:y+mask.shape[0],x:x+mask.shape[1]]
# Retain source alpha bounds so neighboring cells cannot bleed into each other.
outline &= pixels[:,:,3] > 0
result = np.zeros_like(pixels)
result[outline] = [43, 38, 59, 255]
result[mask] = [255, 255, 255, 255]
Image.fromarray(result).save(root / 'sprites/font-thin.png')
print('Generated font-thin.png, original dimensions/cells preserved.')

# Tighten advances around the thinner glyphs rather than retaining heavy-outline spacing.
import json
metrics_source = (root / 'Development/font-metrics.js').read_text(encoding='utf-8')
metrics = json.loads(metrics_source[metrics_source.index('{'):metrics_source.rindex('}')+1])
thin_image = Image.fromarray(result)
for glyph in metrics.values():
    bounds = thin_image.crop((glyph['x'], glyph['y'], glyph['x']+glyph['width'], glyph['y']+glyph['height'])).getbbox()
    if bounds:
        left, top, right, bottom = bounds
        glyph['x'] += left; glyph['y'] += top
        glyph['width'] = right-left; glyph['height'] = bottom-top; glyph['offsetY'] += top
(root / 'Development/font-thin-metrics.js').write_text('// Generated thin glyph bounds; rebuild with tools/build-thin-font.py.\nexport const thinFontMetrics = '+json.dumps(metrics,indent=2)+';\n',encoding='utf-8')
