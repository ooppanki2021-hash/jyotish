# Генераторы печатных комплектов

Нужны: node (без пакетов), python3 + pip-пакеты fpdf2, pypdfium2.

## Джйотиш-комплект (13 файлов)
    node tools/daily.js --out /tmp/year.json --by 1984-04-27 --bt 00:40 --btz 4 \
      --lat 43.02 --lon 44.68 --from 2026-10-01 --to 2027-09-30 --lat2 43.02 --lon2 44.68 --tz2 3
    python3 tools/make_calendar_pdf.py --data /tmp/year.json --outdir OUT
    python3 tools/jyotish-set/instr_jyotish.py OUT
Файлы: jyotish-calendar-YYYY-MM.pdf (12 шт.) + jyotish-calendar-13-как-читать.pdf.

## Дараган-комплект (13 файлов)
    cd tools/daragan-set && node gen_set.js && python3 render_set.py
Файлы в set/: дараган-мухурта-YYYY-MM.pdf (12 шт.) + дараган-мухурта-13-как-читать.pdf.

Комплект отдаётся пользовательнице папкой с отдельными PDF (архив — необязательное дополнение).
