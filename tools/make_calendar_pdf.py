# -*- coding: utf-8 -*-
# Рендер 12 листов джйотиш-календаря из year.json (см. tools/README.md).
# Лист = заголовок «Месяц Год» + клетки: слева цветной список сфер, справа линованное поле.
import json, math, os, argparse
from fpdf import FPDF
FONT_DIR="/usr/share/fonts/truetype/dejavu"
A4W,A4H=210.0,297.0
MONTHS=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"]
WD=["Пн","Вт","Ср","Чт","Пт","Сб","Вс"]
INK=(30,28,26); GOLD=(139,98,20); MUTED=(118,112,104); LINEC=(178,168,150)
HAIRC=(214,206,190); NOTEC=(206,198,182); HEADBG=(245,236,214)
GOODC=(40,106,48); BADC=(176,46,36); MIDC=(160,120,0)
STARC={5:(44,108,50),4:(92,128,52),3:(122,114,96),2:(172,118,48),1:(162,58,44)}
GOODBG=(242,247,240); BADBG=(250,240,238); MIDBG=(252,250,244)
def stars(n): return "★"*n+"☆"*(5-n)
class Cal(FPDF):
    def __init__(self):
        super().__init__(orientation="P",unit="mm",format="A4")
        self.set_auto_page_break(False); self.set_margins(0,0,0)
        self.add_font("dv","",FONT_DIR+"/DejaVuSans.ttf")
        self.add_font("dv","B",FONT_DIR+"/DejaVuSans-Bold.ttf")
    def wrap(self,txt,w):
        words,lines,cur=txt.split(),[],""
        for x in words:
            t=(cur+" "+x).strip()
            if self.get_string_width(t)<=w or not cur: cur=t
            else: lines.append(cur); cur=x
        if cur: lines.append(cur)
        return lines
cfg=dict(head=17.0,headgap=3.0,colgap=4.5,rowgap=1.2,left_frac=0.57,midgap=2.4,note_lh=3.4,fs_list=5.6,lh_list=2.3,foot=6.0,mt=6.0,ml=7.0)

def day_lines(d):
    good=[s["name"] for s in d["spheres"] if s["cls"]=="good"]
    bad=[s["name"] for s in d["spheres"] if s["cls"]=="bad"]
    mid=[s["name"] for s in d["spheres"] if s["cls"]=="mid"]
    warns=[]
    for e in d.get("events",[]):
        if e.get("kind")=="eclipse-solar": warns.append("солнечное затмение — день тишины")
        elif e.get("kind")=="eclipse-lunar": warns.append("лунное затмение — эмоции на пределе")
    if d.get("chandrashtama"): warns.append("луна в конфликте с вашей картой")
    for w in d.get("warnTexts",[]) or []:
        if len(warns)<3: warns.append(w)
    for e in d.get("events",[]):
        if e.get("kind")=="sankranti": warns.append("солнце меняет знак")
    extras=[]
    for e in d.get("events",[]):
        if e.get("kind") in ("dasha-ad","dasha-md"): extras.append(str(e.get("short") or e.get("text")).lower())
    LB=d.get("labels") or {"good":"МОЖНО","bad":"НЕЛЬЗЯ","mid":"КАК ОБЫЧНО"}
    lines=[]
    if good: lines.append(("good",LB["good"]+": "+", ".join(good)))
    if bad or warns:
        t=(LB["bad"]+": "+", ".join(bad)) if bad else (LB["bad"]+": ничего важного")
        if warns: t+="  ⚠ "+"; ".join(warns[:2])
        lines.append(("bad",t))
    if mid or extras:
        t=(LB["mid"]+": "+", ".join(mid)) if mid else (LB["mid"]+": —")
        if extras: t+="  ·  "+"; ".join(extras)
        lines.append(("mid",t))
    return lines

def render_month(days,Y,M,outpath):
    pdf=Cal(); pdf.add_page()
    ML,MT=cfg["ml"],cfg["mt"]; W=A4W-2*ML
    cols=2 if len(days)>16 else 1
    gap=cfg["colgap"] if cols==2 else 0
    cw=(W-gap)/cols
    per_col=math.ceil(len(days)/cols) if cols==2 else len(days)
    hh=cfg["head"]
    pdf.set_fill_color(*HEADBG); pdf.rect(ML,MT,W,hh,style="F")
    pdf.set_draw_color(*GOLD); pdf.set_line_width(0.55); pdf.line(ML,MT+hh,ML+W,MT+hh); pdf.set_line_width(0.2)
    pdf.set_font("dv","B",16); pdf.set_text_color(*GOLD); pdf.text(ML+3,MT+7.5,f"{MONTHS[M-1]} {Y}")
    top=MT+hh+cfg["headgap"]; bottom=A4H-cfg["foot"]; rowh=(bottom-top)/per_col
    pad=1.5
    for i,d in enumerate(days):
        col=0 if (cols==1 or i<per_col) else 1
        row=i if (cols==1 or i<per_col) else i-per_col
        x=ML+col*(cw+gap); yy=top+row*rowh; ch=rowh-cfg["rowgap"]
        ix,iw=x+pad,cw-2*pad
        has_good=any(s["cls"]=="good" for s in d["spheres"]); has_bad=any(s["cls"]=="bad" for s in d["spheres"])
        pdf.set_fill_color(*(GOODBG if has_good else (BADBG if has_bad else MIDBG)))
        pdf.rect(x,yy,cw,ch,style="F")
        pdf.set_draw_color(*LINEC); pdf.set_line_width(0.25); pdf.rect(x,yy,cw,ch,style="D"); pdf.set_line_width(0.2)
        date_h=3.8; inner_h=ch-date_h-0.7; y0=yy+date_h+0.3
        starc=STARC.get(d["stars"],INK)
        pdf.set_font("dv","B",11.0); pdf.set_text_color(*starc)
        dd=f'{d["d"]:02d}'; pdf.text(ix,yy+3.3,dd); dw=pdf.get_string_width(dd)+1.6
        pdf.set_font("dv","",6.4); pdf.set_text_color(*MUTED)
        wd=WD[(d["vara"]+6)%7]; pdf.text(ix+dw,yy+3.2,wd); dw+=pdf.get_string_width(wd)+1.8
        pdf.set_font("dv","B",6.6); pdf.set_text_color(*starc)
        pdf.text(ix+dw,yy+3.2,stars(d["stars"])); dw+=pdf.get_string_width(stars(d["stars"]))+2.0
        pdf.set_font("dv","",6.2); pdf.set_text_color(*MUTED)
        rt=d.get("lunarText") or (f'{d["lunarDay"]}-е лунные сутки, {d["moonPhase"]}')
        rw=pdf.get_string_width(rt)
        if ix+dw+rw < x+cw-pad: pdf.text(x+cw-pad-rw,yy+3.2,rt)
        pdf.set_draw_color(*HAIRC); pdf.line(ix,yy+date_h,x+cw-pad,yy+date_h)
        lw=iw*cfg["left_frac"]
        laid=[]; nlines=0; cap=int((inner_h-0.2)/2.05)
        for kind,text in day_lines(d):
            pdf.set_font("dv","B" if kind in ("good","bad") else "",cfg["fs_list"])
            wr=pdf.wrap(text,lw)
            if nlines+len(wr) > cap:
                laid.append(("mid",["… ещё сферы — в приложении"])); nlines+=1; break
            laid.append((kind,wr)); nlines+=len(wr)
        tl=d.get("timeLine") or (f'окно удачи {d["abhijit"]} · плохое время {d["rahuKaal"]}')
        pdf.set_font("dv","",cfg["fs_list"]); wr=pdf.wrap(tl,lw)
        laid.append(("time",wr)); nlines+=len(wr)
        lh=min(cfg["lh_list"],(inner_h-0.2)/max(1,nlines)); lh=max(lh,2.05)
        yy2=y0
        for kind,wr in laid:
            colr={"good":GOODC,"bad":BADC,"mid":MIDC,"time":MUTED}[kind]
            style="B" if kind in ("good","bad") else ""
            fs=cfg["fs_list"] if kind!="time" else cfg["fs_list"]-0.3
            pdf.set_font("dv",style,fs); pdf.set_text_color(*colr)
            for ln in wr:
                pdf.text(ix,yy2+fs*0.35,ln); yy2+=lh
        rx=ix+lw+cfg["midgap"]; rw2=iw-lw-cfg["midgap"]
        pdf.set_draw_color(*NOTEC); pdf.set_line_width(0.15)
        k=1
        while True:
            ly=y0+k*cfg["note_lh"]
            if ly>yy+ch-0.8: break
            pdf.line(rx,ly,rx+rw2,ly); k+=1
        pdf.set_line_width(0.2)
    pdf.output(outpath)

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--data",required=True); ap.add_argument("--outdir",required=True)
    a=ap.parse_args()
    os.makedirs(a.outdir,exist_ok=True)
    data=json.load(open(a.data,encoding="utf-8"))
    days=data["days"] if isinstance(data,dict) else data
    months={}
    for d in days: months.setdefault((d["y"],d["m"]),[]).append(d)
    made=[]
    for (Y,M) in sorted(months):
        p=os.path.join(a.outdir,f"jyotish-calendar-{Y}-{M:02d}.pdf")
        render_month(months[(Y,M)],Y,M,p); made.append(p)
    print("\n".join(made)); print(f"готово: {len(made)} файлов -> {a.outdir}")
