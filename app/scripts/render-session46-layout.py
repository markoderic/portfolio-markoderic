from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from html.parser import HTMLParser
import json,re
out=Path('docs/redesign/session-46-entry')
class Text(HTMLParser):
 def __init__(self):super().__init__();self.rows=[];self.curr=None
 def handle_starttag(self,t,a):
  if t=='span':self.curr=''
 def handle_data(self,d):
  if self.curr is not None:self.curr+=d
 def handle_endtag(self,t):
  if t=='span' and self.curr is not None:self.rows.append(self.curr);self.curr=None
p=Text();p.feed((out/'terminal-ready.html').read_text())
font=lambda n:ImageFont.truetype('/System/Library/Fonts/Menlo.ttc',round(n))
def wrap(s,f,w):
 rows=[];line=''
 for word in s.split(' '):
  candidate=(line+' '+word).lstrip()
  if f.getlength(candidate)<=w:line=candidate;continue
  if line:rows.append(line);line=''
  for ch in word:
   if f.getlength(line+ch)>w and line:rows.append(line);line=''
   line+=ch
 return rows+[line]

def entry(w,h,after):
 im=Image.new('RGB',(w,h),'#080808' if after else '#080a09');d=ImageDraw.Draw(im)
 px=max(24,min(w*.05,80));tw=min(672 if after else 600,w-2*px);x=(w-tw)/2 if after else px
 y=(48 if w<=520 else max(48,min(h*.15,128))) if after else max(28,min(h*.06,72))
 for i,row in enumerate(p.rows):
  size=(13 if i==5 else 16) if after else (11 if i==5 else 13);f=font(size)
  color='#b3b3b3' if after and i==5 else '#e3e3e3' if after else '#d9e1dc'
  if i==0:color='#ffffff'
  for line in wrap(row,f,tw):d.text((x,y),line,font=f,fill=color);y+=size*1.65
  y+=6+(14 if i==0 else 0)
 y+=24-6;action='> Enter workspace';f=font(16 if after else 13);hint=font(13 if after else 11);aw=f.getlength(action);hw=hint.getlength('Enter ↵');pad=0 if after else 14;bh=max(44 if after else 0,(16*1.65 if after else 13*1.4)+16 if after else 13*1.4+24)
 gap=24 if after else 28.45;bw=min(tw,aw+hw+gap+pad*2)
 if not after:d.rounded_rectangle((x,y,x+bw,y+bh),radius=3,fill='#111813',outline='#65756b')
 d.text((x+pad,y+(bh-f.size)/2-2),action,font=f,fill='white')
 if aw+hw+gap>tw:
  bh+=24;d.text((x,y+bh-22),'Enter ↵',font=hint,fill='#b3b3b3')
 else:d.text((x+pad+aw+gap,y+(bh-hint.size)/2-2),'Enter ↵',font=hint,fill='#b3b3b3' if after else '#aebcb3')
 # Show keyboard-focused confirmation; source also retains a neutral pointer hover.
 outline='#eeeeee' if after else '#a9c7b2';off=5 if after else 3
 d.rectangle((x-off,y-off,x+bw+off,y+bh+off),outline=outline,width=2)
 y+=bh+(12 if after else 14);tx=x;f=font(14 if after else 11);th=44 if after else 36
 for s in ['Sound on','Résumé','Simple view']:
  width=f.getlength(s)
  if tx+width>x+tw:tx=x;y+=th+8
  d.text((tx,y+(th-f.size)/2-2),s,font=f,fill='#c4c4c4' if after else '#b8c6bd');tx+=width+24
 return im,dict(width=w,height=h,terminalWidth=tw,terminalLeft=x,estimatedContentBottom=y+th,allTextWraps=True)
def labelled(im,title):
 canvas=Image.new('RGB',(im.width,im.height+34),'#dddddd');ImageDraw.Draw(canvas).text((12,8),title,font=font(13),fill='#222');canvas.paste(im,(0,34));return canvas
before,b=entry(1468,735,False);after,a=entry(1468,735,True)
compare=Image.new('RGB',(1468,1538));compare.paste(labelled(before,'BEFORE · current prechange CSS model · 1468 × 735 raster proxy'),(0,0));compare.paste(labelled(after,'AFTER · same proxy · actual SSR text, authored layout; NOT browser output'),(0,769));compare.save(out/'desktop-comparison.png')
nb,nm=entry(360,735,False);na,n=entry(360,735,True);narrow=Image.new('RGB',(720,769));narrow.paste(labelled(nb,'BEFORE · 360 px proxy'),(0,0));narrow.paste(labelled(na,'AFTER · 360 px proxy'),(360,0));narrow.save(out/'narrow-comparison.png')
ex=Image.new('RGB',(780,260),'#eeeeee');d=ImageDraw.Draw(ex)
for col,after in enumerate([False,True]):
 x=col*390;d.text((x+18,14),'AFTER · neutral' if after else 'BEFORE · green tint',font=font(16),fill='#222')
 for i,state in enumerate(['default','hover','keyboard focus']):
  y=55+i*60;d.text((x+18,y+13),state,font=font(12),fill='#222');bx=x+200;bg=('#292929' if after else '#25372b') if state=='hover' else '#111111' if after else '#101713'
  d.rounded_rectangle((bx,y,bx+110,y+(44 if after else 40)),radius=3,fill=bg,outline='#707070' if after else '#5d6e63');d.text((bx+16,y+14),'Explore',font=font(12),fill='#eeeeee' if after else '#e5eee8')
  if i==2:d.rectangle((bx-3,y-3,bx+113,y+47 if after else y+43),outline='#8c8c8c' if after else '#467257',width=2)
d.text((18,240),'Authored control samples from final CSS; not native focus rendering.',font=font(11),fill='#333');ex.save(out/'explore-comparison.png')
def lum(s):
 vals=[int(s[i:i+2],16)/255 for i in (1,3,5)];c=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in vals];return sum(a*b for a,b in zip(c,[.2126,.7152,.0722]))
def contrast(a,b):
 a,b=sorted([lum(a),lum(b)]);return round((b+.05)/(a+.05),2)
measurements={'evidence':'Pillow/Menlo authored illustrative layout, actual BootConsole SSR text. Not DOM, browser CSS cascade/layout, focus, WebGL or performance verification. 1468x735 is approximate recording content raster; CSS viewport/browser zoom unknown. Before models current prechange CSS rather than claiming to reproduce recorded runtime.', 'desktopBefore':b,'desktopAfter':a,'narrowBefore':nm,'narrowAfter':n,'contrast':{name:contrast(f,bg) for name,f,bg in [('body','#e3e3e3','#080808'),('status','#b3b3b3','#080808'),('options','#c4c4c4','#080808'),('Explore text','#eeeeee','#111111'),('Explore hover','#ffffff','#292929'),('focus on white','#8c8c8c','#ffffff'),('focus on black','#8c8c8c','#111111')]}}
(out/'layout-measurements.json').write_text(json.dumps(measurements,indent=2))
print(json.dumps(measurements,indent=2))
