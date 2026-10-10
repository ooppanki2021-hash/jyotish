#!/usr/bin/env node
/* CLI-обёртка над js/daily.js: расчёт дней джйотиш-календаря в JSON.
   Пример: node tools/daily.js --out year.json --by 1984-04-27 --bt 00:40 --btz 4 \
     --lat 43.02 --lon 44.68 --from 2026-10-01 --to 2027-09-30 --lat2 43.02 --lon2 44.68 --tz2 3 */
const fs = require('fs');
const Daily = require('../js/daily.js');
function arg(n){ const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i+1] : null; }
const by = arg('--by').split('-').map(Number), bt = (arg('--bt')||'00:00').split(':').map(Number);
const from = arg('--from').split('-').map(Number), to = arg('--to').split('-').map(Number);
const params = {
  by: by[0], bm: by[1], bd: by[2], bhh: bt[0], bmm: bt[1], btz: +arg('--btz'),
  blat: +arg('--lat'), blon: +arg('--lon'),
  lat: +arg('--lat2'), lon: +arg('--lon2'), tz: +arg('--tz2'),
  fromY: from[0], fromM: from[1], fromD: from[2] || 1,
  toY: to[0], toM: to[1], toD: to[2] || new Date(Date.UTC(to[0], to[1], 0)).getUTCDate()
};
const res = Daily.compute(params);
fs.writeFileSync(arg('--out'), JSON.stringify(res));
console.log('days:', res.days.length, '->', arg('--out'));
