"""Refresh tight font2 glyph bounds using the shared20px character-cell layout."""
from pathlib import Path
import json
from PIL import Image
root=Path(__file__).resolve().parents[2]
source=(root/'Development/font-metrics.js').read_text(encoding='utf-8')
original=json.loads(source[source.index('{'):source.rindex('}')+1])
image=Image.open(root/'sprites/font2.png').convert('RGBA')
assert image.size==(300,160),'Font2 layout changed; measure the new layout before rebuilding.'
metrics={}
for letter,glyph in original.items():
    x0=int((glyph['x']+glyph['width']/2)//20)*20
    y0=int((glyph['y']+glyph['height']/2)//20)*20
    bounds=image.crop((x0,y0,x0+20,y0+20)).getbbox()
    if bounds:
        x,y,right,bottom=bounds
        metrics[letter]={'x':x0+x,'y':y0+y,'width':right-x,'height':bottom-y,'offsetY':y}
    else: metrics[letter]=glyph
(root/'Development/font2-metrics.js').write_text('// Generated from updated font2.png; rebuild with tools/build-font2-metrics.py.\nexport const font2Metrics = '+json.dumps(metrics,indent=2)+';\n',encoding='utf-8')
print('Refreshed font2 glyph measurements.')
