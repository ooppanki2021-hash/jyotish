import os
BASE=os.path.dirname(os.path.abspath(__file__))
# -*- coding: utf-8 -*-
import json, math, os
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
cfg=dict(head=17.0,headgap=3.0,colgap=4.5,rowgap=1.2,left_frac=0.62,midgap=2.4,note_lh=3.4,fs_list=5.6,lh_list=2.3,foot=6.0,mt=6.0,ml=7.0)

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
    pdf.set_font("dv","",7.2); pdf.set_text_color(*MUTED)
    pdf.text(ML+3,MT+10.6,"Настенная мухурта по Дарагану: темы и часы поддержки (тропический зодиак, его методика).")
    pdf.text(ML+3,MT+hh-2.0,"Зелёным — можно начинать; красным — не начинать новое; ⚠ — осторожность на благоприятном фоне.")
    top=MT+hh+cfg["headgap"]; bottom=A4H-cfg["foot"]; rowh=(bottom-top)/per_col
    pad=1.5
    for i,d in enumerate(days):
        col=0 if (cols==1 or i<per_col) else 1
        row=i if (cols==1 or i<per_col) else i-per_col
        x=ML+col*(cw+gap); yy=top+row*rowh; ch=rowh-cfg["rowgap"]
        ix,iw=x+pad,cw-2*pad
        has_good=any(l["kind"]=="good" for l in d["lines"]); has_bad=any(l["kind"]=="bad" for l in d["lines"])
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
        rt=d["lunarText"]; rw=pdf.get_string_width(rt)
        if ix+dw+rw < x+cw-pad: pdf.text(x+cw-pad-rw,yy+3.2,rt)
        pdf.set_draw_color(*HAIRC); pdf.line(ix,yy+date_h,x+cw-pad,yy+date_h)
        lw=iw*cfg["left_frac"]
        laid=[]; nlines=0; cap=int((inner_h-0.2)/2.05)
        for l in d["lines"]:
            pdf.set_font("dv","B" if l["kind"] in ("good","bad") else "",cfg["fs_list"])
            wr=pdf.wrap(l["text"],lw)
            if nlines+len(wr)+1 > cap:
                laid.append(("mid",["… ещё темы — в приложении"])); nlines+=1; break
            laid.append((l["kind"],wr)); nlines+=len(wr)
        pdf.set_font("dv","",cfg["fs_list"]-0.3); wr=pdf.wrap(d["timeLine"],lw); laid.append(("time",wr)); nlines+=len(wr)
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

def render_instruction(outpath):
    pdf=Cal(); pdf.add_page()
    ML,MT=7.0,6.0; W=A4W-2*ML
    hh=17.0
    pdf.set_fill_color(*HEADBG); pdf.rect(ML,MT,W,hh,style="F")
    pdf.set_draw_color(*GOLD); pdf.set_line_width(0.55); pdf.line(ML,MT+hh,ML+W,MT+hh); pdf.set_line_width(0.2)
    pdf.set_font("dv","B",16); pdf.set_text_color(*GOLD); pdf.text(ML+3,MT+7.5,"Как читать этот календарь")
    pdf.set_font("dv","",7.2); pdf.set_text_color(*MUTED)
    pdf.text(ML+3,MT+10.6,"Настенная мухурта по методике К. Дарагана: тропический зодиак, сигнификаторы тем,")
    pdf.text(ML+3,MT+hh-2.0,"транзиты / прогрессии / дирекции и Луна дня. Один лист = один месяц, время местное.")
    y=MT+hh+6
    def para(title, color, example, texts, bold_ex=True):
        nonlocal y
        if title:
            pdf.set_font("dv","B",10); pdf.set_text_color(*INK); pdf.text(ML,y,title); y+=5.2
        if example:
            pdf.set_font("dv","B" if bold_ex else "",7.5); pdf.set_text_color(*color)
            for ln in pdf.wrap(example, W-6):
                pdf.text(ML+3,y,ln); y+=3.6
        pdf.set_font("dv","",7.5); pdf.set_text_color(*INK)
        for t in texts:
            for ln in pdf.wrap(t, W-6):
                pdf.text(ML+3,y,ln); y+=3.6
        y+=3.0
    para("1. Зелёная строка — тема поддержана, дано время:", GOODC,
         "любовь: 09:29–13:59 (секстиль Венера)",
         ["В этот промежуток транзитная Луна стоит в мягком аспекте к сигнификаторам темы — начинайте дела темы внутри окна. В скобках — аспект Луны, который даёт окно."])
    para("2. Красная строка — не начинайте НОВОЕ по теме:", BADC,
         "не начинайте новое: важное дело, дети — Сатурн квадрат Юпитер (орб 0.6°)",
         ["Точный контакт вредителя к сигнификаторам: новые старты тем отложите, пока орбис не расползётся. ВАЖНО: рутину и начатое ранее продолжать можно — это не запрет на жизнь, а запрет на запуск нового. Недели красных строк — это период точного аспекта медленной планеты (Сатурн, Марс), он конечен."])
    para("3. Жёлтая строка со знаком ⚠ — осторожность на благоприятном фоне:", MIDC,
         "⚠ осторожность: карьера — Марс квадрат Сатурн (орб 0.6°)",
         ["Период темы благоприятен, но день даёт напряжённый акцент: дело идёт, но с двойной проверкой и без спешки."])
    para("4. Серая строка внизу клетки:", MUTED,
         "мухурта Дарагана: тем с поддержкой — 2",
         ["Сколько тем в дне получили поддержку. 0 — день ровный, без особых окон."], bold_ex=False)
    para("5. Строка даты: число, день недели, звёзды, Луна:", INK,
         "16  Пт  ★★★★☆   Луна: Стрелец · растущая Луна",
         ["Звёзды (1–5) — интегральная оценка дня по всем темам: 4–5 — день-помощник, 1–2 — день-тишина. Знак и фаза Луны — эмоциональный фон: растущая — на рост, убывающая — на завершение и уборку."])
    para("6. Правая половина клетки — линованное поле:", INK,
         None,
         ["Для ваших записей: что запланировали, что сделали, как прошло. Календарь настенный — печатайте и вешайте."])
    para("7. Если оба календаря (джйотиш и дараган) согласны:", INK,
         None,
         ["Это самый сильный день: разные зодиаки и правила дали одно и то же окно. Для важнейших стартов берите пересечение; для обычных дел достаточно одного метода, который вам удобнее читать."])
    para("8. Где взять другие месяцы и карты:", INK,
         None,
         ["В приложении «Джйотиш 2» и на сайте: Прогностика → «Скачать календарь на год» → логика «Дараган: мухурта по темам». Там же выбирается карта (ваша или близких) и стартовый месяц — 12 листов + эта инструкция."])
    pdf.output(outpath)

os.makedirs('set',exist_ok=True)
os.makedirs(os.path.join(BASE,'set'),exist_ok=True)
data=json.load(open(os.path.join(BASE,'set.json'),encoding='utf-8'))
made=[]
for key,days in data.items():
    Y,M=map(int,key.split('-'))
    p=os.path.join(BASE,'set',f'дараган-мухурта-{key}.pdf')
    render_month(days,Y,M,p); made.append(p)
render_instruction(os.path.join(BASE,'set','дараган-мухурта-13-как-читать.pdf'))
made.append(os.path.join(BASE,'set','дараган-мухурта-13-как-читать.pdf'))
print('\n'.join(made))
