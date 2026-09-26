#!/usr/bin/env python3
# Конвертирует cities15000.txt (GeoNames) в компактный js/cities.js
# Русские названия берутся из alternateNames (тег ru)
import json, math

SRC = 'cities15000.txt (из дампа GeoNames)'
RU = 'ru_names.txt (русские имена из alternateNames, тег ru)'
OUT = '../js/cities.js'

# --- русские названия: при нескольких вариантах берём ближайший по длине к имени ---
ru_names, ru_all = {}, {}
with open(RU, encoding='utf-8') as f:
    for line in f:
        gid, _, name = line.partition('\t')
        name = name.strip()
        if not name:
            continue
        ru_all.setdefault(gid, []).append(name)
for gid, names in ru_all.items():
    ru_names[gid] = names  # выбор сделаем, зная основное имя

tzs, tzidx = [], {}
rows = []

with open(SRC, encoding='utf-8') as f:
    for line in f:
        p = line.rstrip('\n').split('\t')
        if len(p) < 19:
            continue
        gid, name, ascii_, alt = p[0], p[1].strip(), p[2].strip(), p[3]
        try:
            lat = round(float(p[4]), 2)
            lon = round(float(p[5]), 2)
        except ValueError:
            continue
        cc = p[8].strip().upper()[:2]
        feat = p[7].strip()
        try:
            pop = int(p[14] or 0)
        except ValueError:
            pop = 0
        tzid = p[17].strip()
        if not tzid:
            continue
        if tzid not in tzidx:
            tzidx[tzid] = len(tzs)
            tzs.append(tzid)
        # русское имя
        variants = ru_names.get(gid, [])
        if len(variants) == 1:
            ru = variants[0]
        elif variants:
            ru = min(variants, key=lambda v: (abs(len(v) - len(name)), variants.index(v)))
        else:
            ru = ''
        disp = ru or name
        # важность города для сортировки результатов
        base = int(math.log10(max(pop, 1)))
        bonus = 2 if feat == 'PPLC' else (1 if feat in ('PPLA', 'PPLA2') else 0)
        tier = min(9, base + bonus)
        # поле для поиска по латинице / исходному имени
        extra = ascii_ if ascii_.lower() != disp.lower() else ''
        extra2 = name if (name != disp and name != ascii_) else ''
        rows.append([disp, extra, extra2, cc, lat, lon, tzidx[tzid], tier])

rows.sort(key=lambda r: -r[7])

data = {'tz': tzs, 'c': rows}
js = 'window.JCITIES = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(js)

with_ru = sum(1 for r in rows if any('\u0400' <= ch <= '\u04FF' for ch in r[0]))
print('cities:', len(rows), '| timezones:', len(tzs), '| с русским именем:', with_ru, '| size:', len(js.encode('utf-8')), 'bytes')
