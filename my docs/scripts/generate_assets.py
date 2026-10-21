#!/usr/bin/env python3
"""Create GaadiPulse original SVG + PNG starter illustrations using CairoSVG.

Run from package root: python scripts/generate_assets.py
Requirements: pip install cairosvg pillow
User image uploads, model photographs and OCR are NOT implemented by these assets.
"""
from pathlib import Path
from io import BytesIO
import math
from PIL import Image
import cairosvg

ROOT=Path(__file__).resolve().parents[1]
A=ROOT/'assets'; (A/'vehicle-subtypes').mkdir(parents=True,exist_ok=True)

C={'dark':'#122C2A','forest':'#173E37','green':'#147D69','mint':'#24C48E','sky':'#A4E9D5','ivory':'#F5F7F6','line':'#C7D8D1','text':'#192725'}

def base(w,h,body,background='light'):
  back=('<rect width="100%" height="100%" fill="#F5F7F6"/>' if background=='light' else '''<rect width="100%" height="100%" fill="url(#bg)"/><circle cx="840" cy="190" r="420" fill="#147D69" opacity=".13"/><circle cx="100" cy="1050" r="400" fill="#24C48E" opacity=".06"/>''')
  return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0D2423"/><stop offset="1" stop-color="#173F38"/></linearGradient>
  <linearGradient id="car" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#25C58F"/><stop offset="1" stop-color="#0F715E"/></linearGradient>
  <linearGradient id="pale" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#D6F4E8"/><stop offset="1" stop-color="#ABDED2"/></linearGradient>
  <filter id="shadow" x="-35%" y="-35%" width="170%" height="180%"><feGaussianBlur stdDeviation="10"/></filter>
  </defs>{back}{body}</svg>'''

def save_pair(rel,svg,png_w=None,png_h=None):
  path=A/rel;path.parent.mkdir(parents=True,exist_ok=True)
  path.write_text(svg,encoding='utf-8')
  cairosvg.svg2png(bytestring=svg.encode(),write_to=str(path.with_suffix('.png')),output_width=png_w,output_height=png_h)

def logo(center_x=500,center_y=490,scale=1,stroke='#FFFFFF',pulse='#24C48E'):
  # white/emerald icon inspired by chosen brand, adapted for dark launcher background
  return f'''<g transform="translate({center_x} {center_y}) scale({scale})">
  <path d="M-260 76 A270 270 0 0 1 260 76" fill="none" stroke="{stroke}" stroke-width="36" stroke-linecap="round"/>
  <path d="M-186 -120 A255 255 0 0 1 -108 -201 M-85 -222 A260 260 0 0 1 5 -245 M33 -243 A260 260 0 0 1 114 -213 M139 -193 A270 270 0 0 1 205 -126" fill="none" stroke="{pulse}" stroke-width="30" stroke-linecap="butt"/>
  <path d="M-175 87 L-20 -35" stroke="{stroke}" stroke-width="28" stroke-linecap="round"/>
  <circle cx="-175" cy="87" r="39" fill="{stroke}"/><circle cx="-175" cy="87" r="18" fill="#122C2A"/>
  <path d="M0 81 H72 L98 18 L127 149 L154 64 L176 88 H258" fill="none" stroke="{pulse}" stroke-width="23" stroke-linecap="round" stroke-linejoin="round"/>
  </g>'''

# launcher art
launcher=base(1024,1024,'''<rect x="64" y="64" width="896" height="896" rx="214" fill="#122C2A"/>
<rect x="90" y="90" width="844" height="844" rx="188" fill="none" stroke="#1F5A4C" stroke-width="10"/>'''+logo(500,530,1.03),background='light')
save_pair('android-store-icon.svg',launcher,1024,1024)
# Transparent foreground (Android adaptive icon safe region, no background)
fg='''<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432" viewBox="0 0 1024 1024">'''+logo(500,535,.9)+'''</svg>'''
save_pair('adaptive-icon-foreground.svg',fg,432,432)
# Monochrome notification icon
notify='''<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 512 512"><path d="M48 345 A213 213 0 0 1 464 345" fill="none" stroke="white" stroke-width="47"/><path d="M107 349 L263 172" stroke="white" stroke-width="34" stroke-linecap="round"/><circle cx="107" cy="349" r="29" fill="white"/><path d="M259 347 H302 L320 298 L340 393 L359 326 L374 346 H462" stroke="white" fill="none" stroke-width="27" stroke-linecap="round" stroke-linejoin="round"/></svg>'''
save_pair('notification-icon.svg',notify,96,96)
# Splash for Android
road='''<path d="M320 1920 C390 1570 490 1320 520 960" stroke="#5FD6AD" stroke-opacity=".23" stroke-width="3" fill="none"/><path d="M770 1920 C676 1510 610 1290 570 960" stroke="#5FD6AD" stroke-opacity=".23" stroke-width="3" fill="none"/>'''
splash=base(1080,1920,road+'''<circle cx="540" cy="695" r="350" fill="#1C5649" opacity=".46"/><circle cx="540" cy="695" r="300" fill="none" stroke="#285D52" stroke-width="4"/>'''+logo(550,715,0.8)+'''<text x="540" y="1138" font-family="DejaVu Sans,sans-serif" font-weight="bold" font-size="100" text-anchor="middle" fill="#FFFFFF">GaadiPulse</text><text x="540" y="1215" font-family="DejaVu Sans,sans-serif" font-size="37" text-anchor="middle" fill="#BEE8D8">Every Vehicle. Every Detail.</text><path d="M480 1474 H600" stroke="#24C48E" stroke-width="10" stroke-linecap="round"/>''','dark')
save_pair('splash-screen.svg',splash,1080,1920)
# Splash illustration without forced branding for overlay
splash_hero=base(1080,1350,'''<circle cx="540" cy="590" r="368" fill="#246E5D" opacity=".3"/>'''+logo(545,610,0.93)+'''<path d="M100 1110 C365 1080 730 1105 980 1030" stroke="#24C48E" stroke-opacity=".4" stroke-width="4" fill="none"/><circle cx="914" cy="1033" r="12" fill="#24C48E"/>''','dark')
save_pair('splash-hero.svg',splash_hero,1080,1350)
# Auth hero paired artwork
city='''<rect x="130" y="290" width="130" height="280" rx="12" fill="#C9EBDF"/><rect x="275" y="210" width="160" height="360" rx="12" fill="#D6F5EA"/><rect x="460" y="300" width="190" height="270" rx="12" fill="#BAE9D8"/><rect x="670" y="246" width="130" height="324" rx="12" fill="#D6F5EA"/><path d="M90 575 H950" stroke="#1A6B58" stroke-width="12"/>'''
car='''<path d="M220 568 L285 486 H560 L654 554 L688 568 L688 625 H204 V581 Z" fill="url(#car)" stroke="#113D35" stroke-width="8"/><path d="M302 488 L340 439 H520 L580 500 Z" fill="#84C9B7" stroke="#173E37" stroke-width="7"/><circle cx="310" cy="620" r="49" fill="#163E38"/><circle cx="310" cy="620" r="24" fill="#E5F8F0"/><circle cx="593" cy="620" r="49" fill="#163E38"/><circle cx="593" cy="620" r="24" fill="#E5F8F0"/>'''
sv=base(1080,850,city+car)
save_pair('auth-hero.svg',sv,1080,850)

# vehicle subtype illustration in normalized 680x420 flat original shapes

def wheel(x,y,r=44): return f'<circle cx="{x}" cy="{y}" r="{r}" fill="#132C2B"/><circle cx="{x}" cy="{y}" r="{r*.54}" fill="#D7EBE3"/><circle cx="{x}" cy="{y}" r="{r*.23}" fill="#147D69"/>'

def veh_svg(kind):
  common='<ellipse cx="341" cy="350" rx="267" ry="23" fill="#173E37" opacity=".1" filter="url(#shadow)"/>'
  if kind in ('motorcycle','scooter'):
    if kind=='motorcycle':
      drawing='''<path d="M140 296 L215 221 H336 L416 298 H510" fill="none" stroke="#147D69" stroke-width="23" stroke-linecap="round"/><path d="M220 224 L282 292 L339 222" fill="none" stroke="#173E37" stroke-width="18"/><path d="M314 213 H390" stroke="#122C2A" stroke-width="18" stroke-linecap="round"/><path d="M416 290 L460 189 H513" stroke="#122C2A" stroke-width="15" fill="none"/><path d="M188 206 H238" stroke="#122C2A" stroke-width="12"/>'''
    else:
      drawing='''<path d="M166 297 H273 Q313 292 321 249 L341 170 Q354 137 398 143 L438 165 L427 297 H500" fill="url(#car)" stroke="#163E38" stroke-width="11"/><path d="M354 148 H418" stroke="#142E2C" stroke-width="15"/><path d="M334 218 H412" stroke="#E3F4ED" stroke-width="20"/>'''
    drawing+=wheel(175,302,54)+wheel(501,302,54)
  elif kind in ('hatchback','sedan','suv'):
    roofs={'hatchback':'M177 271 L249 203 Q267 191 287 192 H447 Q468 193 484 220 L542 278','sedan':'M138 271 L240 214 H410 Q432 214 459 256 L551 275','suv':'M142 271 L213 192 H477 L541 274'}
    drawing=f'''<path d="M105 281 L{ '177' if kind=='hatchback' else '140'} 269 {roofs[kind][1:]} L590 281 Q617 283 615 303 L604 333 H88 L84 300 Q85 278 105 281Z" fill="url(#car)" stroke="#163E38" stroke-width="9"/><path d="M248 226 H417 L477 270 H194 Z" fill="#BFEADC" stroke="#163E38" stroke-width="7"/>'''+wheel(193,334,43)+wheel(524,334,43)
  elif kind in ('pickup','tipper','bus'):
    if kind=='pickup':
      drawing='''<path d="M104 261 H271 L326 196 H429 V312 H584 V330 H90 V284Z" fill="url(#car)" stroke="#153E35" stroke-width="9"/><path d="M330 211 H407 V266 H290Z" fill="#BFEADC" stroke="#153E35" stroke-width="8"/><path d="M432 262 H584 V311 H432Z" fill="#184C42"/>'''
    elif kind=='tipper':
      drawing='''<path d="M70 249 H370 L486 178 L543 198 L453 288 H70Z" fill="#24C48E" stroke="#123C35" stroke-width="9"/><path d="M465 240 H550 L601 292 V327 H426 V279Z" fill="#147D69" stroke="#123C35" stroke-width="9"/><path d="M479 251 H538 L572 285 H479Z" fill="#C7EDE0"/>'''
    else:
      drawing='''<rect x="72" y="171" width="550" height="165" rx="25" fill="url(#car)" stroke="#123F37" stroke-width="9"/>'''+''.join(f'<rect x="{114+i*76}" y="198" width="56" height="76" rx="7" fill="#C4EBE0"/>' for i in range(6))
    drawing+=wheel(197,331,43)+wheel(513,331,43)
  elif kind=='tractor':
    drawing='''<path d="M202 252 H401 L467 293 H532 V331 H165 V279Z" fill="url(#car)" stroke="#143F34" stroke-width="9"/><path d="M277 251 V171 H383 V265" fill="#B8E8D9" stroke="#143F34" stroke-width="11"/><path d="M413 235 H526" stroke="#163F36" stroke-width="21"/>'''+wheel(217,336,61)+wheel(510,345,40)
  elif kind in ('excavator','loader'):
    drawing='''<path d="M205 250 H410 L455 298 H470 V328 H160 V290Z" fill="url(#car)" stroke="#163F37" stroke-width="8"/><path d="M276 250 V176 H388 V259Z" fill="#BCEADB" stroke="#163F37" stroke-width="9"/>'''
    if kind=='excavator': drawing+='''<path d="M391 193 L487 128 L551 211 L610 249" fill="none" stroke="#147D69" stroke-width="24" stroke-linecap="round"/><path d="M608 240 L622 290 L587 280" fill="none" stroke="#173E37" stroke-width="19"/>'''
    else: drawing+='''<path d="M438 275 L569 226 L587 267 L471 318" fill="none" stroke="#153F38" stroke-width="24"/><path d="M577 215 L636 221 L626 310 L563 286" fill="#147D69"/>'''
    drawing+='''<rect x="178" y="319" width="308" height="42" rx="20" fill="#1A302E"/><circle cx="241" cy="340" r="13" fill="#9ED7C6"/><circle cx="422" cy="340" r="13" fill="#9ED7C6"/>'''
  else:
    drawing='''<path d="M143 291 H210 L260 227 H448 L510 288 H547" fill="none" stroke="#147D69" stroke-width="30" stroke-linecap="round"/>'''+wheel(195,323)+wheel(512,323)
  body=common+'''<circle cx="530" cy="110" r="58" fill="#24C48E" opacity=".1"/><path d="M70 368 H610" stroke="#D4EAE1" stroke-width="8"/>'''+drawing
  return base(680,420,body)

for subtype in ['motorcycle','scooter','hatchback','sedan','suv','pickup','tipper','bus','tractor','excavator','loader','other']:
    save_pair(f'vehicle-subtypes/{subtype}.svg',veh_svg(subtype),680,420)

# contextual empty-states
def lineicon(key):
  common={'garage':'<path d="M100 235 L310 85 L518 235 V440 H100Z"/><path d="M177 440 V288 H443 V440"/><circle cx="240" cy="384" r="23"/><circle cx="390" cy="384" r="23"/>',
          'fuel':'<rect x="198" y="115" width="220" height="335" rx="24"/><rect x="228" y="145" width="157" height="103" rx="10"/><path d="M417 213 C487 217 507 263 498 342 L498 402"/><path d="M497 403 l35 -4"/>',
          'expenses':'<rect x="182" y="105" width="268" height="344" rx="28"/><path d="M224 200 H405 M224 260 H390 M224 320 H364"/><circle cx="317" cy="380" r="24"/>',
          'progress':'<rect x="176" y="116" width="276" height="325" rx="25"/><path d="M229 211 L249 231 L283 183 M313 212 H397 M229 302 L249 322 L283 274 M313 304 H397"/>',
          'documents':'<path d="M140 228 V155 H326 L367 204 H490 V435 H140Z"/><path d="M178 267 H451"/><path d="M220 316 H410 M220 365 H382"/>',
          'reminders':'<path d="M207 270 C207 176 255 152 310 152 C365 152 412 176 412 270 L452 354 H170Z"/><path d="M277 391 Q310 434 343 391"/><path d="M279 120 H345"/>',
          'offline':'<path d="M140 320 Q310 165 479 320 M203 364 Q310 278 417 364"/><path d="M310 416 v-3"/><path d="M160 146 L473 463"/>',
          'error':'<circle cx="312" cy="286" r="179"/><path d="M312 181 V310 M312 377 v-6"/>'}
  return common[key]

def empty_svg(key):
  content=f'''<ellipse cx="320" cy="428" rx="233" ry="20" fill="#1C6D59" opacity=".1" filter="url(#shadow)"/><circle cx="312" cy="258" r="207" fill="#DAF5E9"/><circle cx="312" cy="258" r="175" fill="#C9EEDD" opacity=".5"/>
  <g transform="translate(0 -20) scale(.9) translate(35 30)" fill="none" stroke="#147D69" stroke-width="22" stroke-linecap="round" stroke-linejoin="round">{lineicon(key)}</g>
  <circle cx="534" cy="137" r="13" fill="#24C48E"/><circle cx="99" cy="372" r="8" fill="#24C48E"/>'''
  return base(640,500,content)
for key in ['garage','fuel','expenses','progress','documents','reminders','offline','error']:
    save_pair(f'empty-{key}.svg',empty_svg(key),640,500)

# Save selected user-approved symbol for comparison / later art direction
source=ROOT.parent/'emerald_gauge_heartbeat_logo.png'
if source.is_file():
    import shutil
    shutil.copy2(source,A/'brand'/'selected-logo-reference.png')
print('Generated images:',len(list(A.rglob('*.png'))),'PNGs and',len(list(A.rglob('*.svg'))),'SVGs')
