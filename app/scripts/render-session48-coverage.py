from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json,math
p=Path('docs/redesign/session-48-lamp-coverage');data=json.loads((p/'candidate-coverage.json').read_text());f=ImageFont.truetype('/System/Library/Fonts/Menlo.ttc',15);canvas=Image.new('RGB',(1150,440),'#ededed');d=ImageDraw.Draw(canvas)
d.text((20,10),'ANALYTIC INPUT · upward-facing desktop grid · identical log color scale',font=f,fill='#222')
for k,name in enumerate(['before','B']):
 r=next(v for v in data['results'] if v['name']==name);x0=20+k*565;y0=78
 d.text((x0,42),('Before' if k==0 else 'After')+' · %.1f%% above 0.5'%(100*r['coverage']['0.5']),font=f,fill='#222')
 for pt in r['grid']:
  value=max(0,min(1,math.log1p(pt['value'])/math.log(34)));color=(round(18+237*value),round(24+164*value),round(31+61*value));x=x0+round((pt['x']+5.2)*50);y=y0+round((pt['z']+2.8)*50);d.rectangle((x,y,x+9,y+9),fill=color)
 for label,n in [('keys','keyboard'),('front','frontWork'),('printer','printerSide')]:
  a=r['samples'][n]['point'];x=x0+(a[0]+5.2)*50;y=y0+(a[2]+2.8)*50;d.ellipse((x-3,y-3,x+3,y+3),fill='white');d.text((x+5,y),label,font=f,fill='white')
d.text((20,386),'Pre-shadow/material/exposure: does NOT show observed brightness or blocked light.',font=f,fill='#222');d.text((20,410),'Actual geometry rays are reported separately; far-left/printer occlusion remains.',font=f,fill='#222');canvas.save(p/'coverage-comparison.png')
