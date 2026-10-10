# -*- coding: utf-8 -*-
from fpdf import FPDF
FONT_DIR="/usr/share/fonts/truetype/dejavu"
A4W=210.0
INK=(30,28,26); GOLD=(139,98,20); MUTED=(118,112,104); HEADBG=(245,236,214)
GOODC=(40,106,48); BADC=(176,46,36); MIDC=(160,120,0)
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
pdf=Cal(); pdf.add_page()
ML,MT=7.0,6.0; W=A4W-2*ML; hh=17.0
pdf.set_fill_color(*HEADBG); pdf.rect(ML,MT,W,hh,style="F")
pdf.set_draw_color(*GOLD); pdf.set_line_width(0.55); pdf.line(ML,MT+hh,ML+W,MT+hh); pdf.set_line_width(0.2)
pdf.set_font("dv","B",16); pdf.set_text_color(*GOLD); pdf.text(ML+3,MT+7.5,"Как читать этот календарь")
pdf.set_font("dv","",7.2); pdf.set_text_color(*MUTED)
pdf.text(ML+3,MT+10.6,"Персональный джйотиш-календарь: панчанга и ваша карта (сидерический зодиак).")
pdf.text(ML+3,MT+hh-2.0,"Один лист = один месяц, время местное. Без санскрита: только русские названия.")
y=MT+hh+6
def para(title,color,example,texts):
    global y
    pdf.set_font("dv","B",10); pdf.set_text_color(*INK); pdf.text(ML,y,title); y+=5.2
    if example:
        pdf.set_font("dv","B",7.5); pdf.set_text_color(*color)
        for ln in pdf.wrap(example,W-6):
            pdf.text(ML+3,y,ln); y+=3.6
    pdf.set_font("dv","",7.5); pdf.set_text_color(*INK)
    for t in texts:
        for ln in pdf.wrap(t,W-6):
            pdf.text(ML+3,y,ln); y+=3.6
    y+=3.0
para("1. Зелёная строка МОЖНО — сферы, благоприятные в этот день:",GOODC,
     "МОЖНО: дела и встречи, брак, деньги",
     ["По панчанге (титхи, день недели, накшатра) и вашей карте эти сферы дня поддержаны: начинайте и ведите дела из списка."])
para("2. Красная строка НЕЛЬЗЯ — сферы под напряжением, плюс предупреждения ⚠:",BADC,
     "НЕЛЬЗЯ: поездки, деньги  ⚠ солнечное затмение — день тишины",
     ["Эти сферы дня не поддержаны: новые шаги по ним отложите. Знак ⚠ добавляет события-предупреждения: затмения, Чандраштама (Луна в конфликте с картой), санкранти (Солнце меняет знак). В такие дни важен покой, а не старты."])
para("3. Жёлтая строка КАК ОБЫЧНО — нейтральные сферы:",MIDC,
     "КАК ОБЫЧНО: учёба, здоровье",
     ["Ни поддержки, ни напряжения: дела идут своим чередом, особых мер не нужно."])
para("4. Серая строка — окна дня, одинаковые для всех сфер:",MUTED,
     "окно удачи 11:07–12:36 · плохое время 16:20–17:50",
     ["Окно удачи (Абхиджит) — лучший промежуток для любых важных шагов; плохое время (Раху-кала) — не начинайте нового и не подписывайте. Остальные окна дня развернутся в приложении в мухурте."])
para("5. Строка даты: число, день недели, звёзды, лунные сутки:",INK,
     "16  Пт  ★★★★☆   6-е лунные сутки, Луна растёт",
     ["Звёзды (1–5) — итог дня: 4–5 — день-помощник, 3 — ровный, 1–2 — день-тишина. Лунные сутки и фаза: растущая Луна — на рост и начало, убывающая — на завершение, уборку, отпускание."])
para("6. Правая половина клетки — линованное поле:",INK,None,
     ["Для ваших записей: планы, факты, как прошло. Календарь настенный — печатайте и вешайте."])
para("7. Календарь персональный:",INK,None,
     ["Он посчитан на выбранную карту рождения и город: учитываются тара-бала, Чандраштама, саде-сати, дома Сатурна и Юпитера от вашей Луны и лагны. Для другой карты (близких) выберите её в приложении и соберите отдельный комплект."])
para("8. Связка с мухуртой и календарём Дарагана:",INK,None,
     ["Этот календарь — общий фон дня по сферам. Точные часы под конкретное дело даёт мухурта (вкладка в приложении), а второй взгляд — настенная мухурта по Дарагану со своей памяткой. Если все три согласны — это самый сильный день для старта."])
import sys,os
OUT=sys.argv[1] if len(sys.argv)>1 else os.path.dirname(os.path.abspath(__file__))
pdf.output(os.path.join(OUT,"jyotish-calendar-13-как-читать.pdf"))
print("instruction ok")
