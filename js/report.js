/* ============================================================
   ОТЧЁТ — формирует самодостаточный HTML разбор (для печати/сохранения)
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./jyotish.js'), require('./reading.js'));
  } else {
    root.Report = factory(root.Jyotish, root.Reading);
  }
}(typeof self !== 'undefined' ? self : this, function (J, R) {

  var SIGNS = J.SIGNS;
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function fmtDate(d){ return d.getDate()+'.'+(d.getMonth()+1<10?'0':'')+(d.getMonth()+1)+'.'+d.getFullYear(); }
  function pad(n){ return n<10?'0'+n:''+n; }
  function fmtTime(d){ return pad(d.getHours())+':'+pad(d.getMinutes()); }

  function planetTags(pl){
    var tags = [];
    if (pl.dignity) tags.push('<span class="tag">' + esc(pl.dignity) + '</span>');
    if (pl.retro) tags.push('<span class="tag retro">ретро</span>');
    if (pl.combust) tags.push('<span class="tag retro">сожжён</span>');
    return tags.join(' ') || '—';
  }

  var CSS = [
    'body{font-family:Georgia,"Times New Roman",serif;color:#1a1a1a;margin:0;padding:28px;line-height:1.5;font-size:14px}',
    'h1{font-size:24px;margin:0 0 4px;color:#8a5a00}',
    'h2{font-size:17px;color:#8a5a00;border-bottom:1px solid #d9c08a;padding-bottom:4px;margin:22px 0 10px}',
    'h3{font-size:15px;color:#6b4a00;margin:16px 0 6px}',
    'h4{font-size:13px;color:#8a6d2f;margin:12px 0 4px;text-transform:uppercase;letter-spacing:.4px}',
    'p{margin:6px 0}',
    'table{width:100%;border-collapse:collapse;font-size:12.5px;margin:8px 0}',
    'th,td{border:1px solid #d8cfbc;padding:5px 7px;text-align:left}',
    'th{background:#f4ead0;color:#5a4a1a}',
    '.meta{color:#666;font-size:13px}',
    '.tag{display:inline-block;border:1px solid #c9b98e;border-radius:4px;padding:0 5px;font-size:11px;background:#faf3e0;margin:1px}',
    '.tag.retro{background:#fdeaea;border-color:#e0b0b0;color:#a33}',
    '.score{font-size:30px;color:#8a5a00;font-weight:bold}',
    '.kuta{display:flex;gap:10px;padding:4px 0;border-bottom:1px solid #eee;font-size:12.5px}',
    '.disc{font-size:11px;color:#888;margin-top:24px;border-top:1px solid #eee;padding-top:8px}',
    '.pagebreak{page-break-before:always}',
    '.center{text-align:center}',
    '@media print{body{padding:10px}}'
  ].join('\n');

  function buildReportHTML(chart, meta, extra){
    meta = meta || {};
    extra = extra || {};
    var name = meta.name || '';
    var parts = [];
    parts.push('<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Джйотиш-разбор' + (name?' — '+esc(name):'') + '</title><style>' + CSS + '</style></head><body>');

    // Заголовок
    parts.push('<h1>Джйотиш-разбор' + (name ? ' — ' + esc(name) : '') + '</h1>');
    parts.push('<div class="meta">Дата рождения: ' + esc(meta.date||'') + ' ' + esc(meta.time||'') +
      ' · широта ' + esc(meta.lat!==undefined?meta.lat:'') + '°, долгота ' + esc(meta.lon!==undefined?meta.lon:'') +
      '° · UTC ' + esc(meta.tz!==undefined?(meta.tz>0?'+':'')+meta.tz:'') + '</div>');
    parts.push('<div class="meta">Составлено: ' + fmtDate(new Date()) + ' ' + fmtTime(new Date()) +
      ' · сидерический зодиак, аянамша Лахири</div>');

    // Сводка
    parts.push('<h2>Сводка</h2>');
    parts.push('<p><b>Лагна (асцендент):</b> ' + esc(chart.lagna.sign) + ' ' + esc(chart.lagna.degText) +
      ' · накшатра ' + esc(chart.lagna.nakshatra) + '</p>');
    parts.push('<p>Управитель Лагны: <b>' + esc(chart.lagnaLord) + '</b> · Атмакарака: <b>' +
      esc(chart.planets[chart.atmakaraka].ru) + '</b> · текущий период: <b>' +
      esc(chart.currentMaha.planet) + '/' + esc(chart.currentAntar.planet) + '</b></p>');

    // Таблица планет
    parts.push('<h2>Положения планет</h2><table><thead><tr><th>Планета</th><th>Знак</th><th>Градус</th><th>Дом</th><th>Накшатра</th><th>Пада</th><th>Статус</th></tr></thead><tbody>');
    var order = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Rahu','Ketu'];
    order.forEach(function(k){
      var pl = chart.planets[k];
      parts.push('<tr><td><b>'+esc(pl.ru)+'</b></td><td>'+esc(pl.sign)+'</td><td>'+esc(pl.degText)+'</td><td>'+pl.house+'</td><td>'+esc(pl.nakshatra)+'</td><td>'+pl.pada+'</td><td>'+planetTags(pl)+'</td></tr>');
    });
    parts.push('</tbody></table>');

    // Чтение
    var sections = R.generateReading(chart);
    sections.forEach(function(s){
      parts.push('<h2>' + esc(s.title) + '</h2>');
      parts.push('<p>' + s.brief + '</p>');
      s.items.forEach(function(it){ parts.push(it); });
    });

    // Варги
    parts.push('<h2 class="pagebreak">Варги (Д-9 навамша и Д-10 дашамша)</h2><table><thead><tr><th>Планета</th><th>Раши (Д-1)</th><th>Навамша (Д-9)</th><th>Дашамша (Д-10)</th></tr></thead><tbody>');
    ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'].forEach(function(k){
      var pl = chart.planets[k];
      parts.push('<tr><td><b>'+esc(pl.ru)+'</b></td><td>'+esc(pl.sign)+'</td><td>'+esc(SIGNS[pl.navamsaSign])+'</td><td>'+esc(SIGNS[pl.dashamsaSign])+'</td></tr>');
    });
    parts.push('</tbody></table>');

    // Даши
    parts.push('<h2>Вишоттари-даша (главные периоды)</h2>');
    parts.push('<p>Сейчас: <b>' + esc(chart.currentMaha.planet) + ' махадаша</b> (' + fmtDate(chart.currentMaha.start) + ' – ' + fmtDate(chart.currentMaha.end) + '), под-период <b>' + esc(chart.currentAntar.planet) + '</b>.</p>');
    parts.push('<table><thead><tr><th>Период</th><th>Начало</th><th>Конец</th><th>Длит., лет</th></tr></thead><tbody>');
    chart.mahadasha.forEach(function(m){
      var cur = m.planet === chart.currentMaha.planet;
      parts.push('<tr'+(cur?' style="background:#f4ead0"':'')+'><td><b>'+esc(m.planet)+'</b>'+(cur?' (сейчас)':'')+'</td><td>'+fmtDate(m.start)+'</td><td>'+fmtDate(m.end)+'</td><td>'+Math.round(m.years)+'</td></tr>');
    });
    parts.push('</tbody></table>');
    var ant = chart.currentAntarList || [];
    parts.push('<h3>Под-периоды текущей махадаши (' + esc(chart.currentMaha.planet) + ')</h3><table><thead><tr><th>Антарадаша</th><th>Начало</th><th>Конец</th></tr></thead><tbody>');
    ant.forEach(function(a){
      var cur = a.planet === chart.currentAntar.planet;
      parts.push('<tr'+(cur?' style="background:#f4ead0"':'')+'><td>'+esc(a.planet)+(cur?' (сейчас)':'')+'</td><td>'+fmtDate(a.start)+'</td><td>'+fmtDate(a.end)+'</td></tr>');
    });
    parts.push('</tbody></table>');

    // Транзиты
    if (J.transits){
      var tr = J.transits();
      var li = chart.lagna.signIdx;
      function house(si){ return (si - li + 12) % 12 + 1; }
      parts.push('<h2>Транзиты на ' + fmtDate(new Date()) + '</h2><table><thead><tr><th>Планета</th><th>Знак</th><th>Градус</th><th>Дом от Лагны</th></tr></thead><tbody>');
      [['Сатурн',tr.Saturn],['Юпитер',tr.Jupiter],['Раху',tr.Rahu],['Кету',tr.Ketu]].forEach(function(x){
        var p = x[1];
        parts.push('<tr><td><b>'+x[0]+'</b></td><td>'+esc(p.sign)+'</td><td>'+esc(p.degText)+'</td><td>'+house(p.signIdx)+'</td></tr>');
      });
      parts.push('</tbody></table>');
    }

    // Годовой прогноз (варшапхал)
    if (extra && extra.varshaphal && !extra.varshaphal.error){
      var vf = extra.varshaphal;
      parts.push('<h2>Годовой прогноз (варшапхал)</h2>');
      parts.push('<p>Солнечное возвращение: ' + fmtDate(vf.solarReturnDate) + ' · Лагна года: ' + esc(vf.solarReturnAsc) + '</p>');
      parts.push('<p>Мунтха: ' + esc(vf.muntha) + ' — ' + esc(vf.munthaTheme) + '</p>');
      parts.push('<p>Управитель года: ' + esc(vf.yearLord) + ' — ' + esc(vf.yearLordTheme) + '</p>');
      parts.push('<p class="meta">Планеты карты года: ' + ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'].map(function(k){
        return {Sun:'Солнце',Moon:'Луна',Mercury:'Меркурий',Venus:'Венера',Mars:'Марс',Jupiter:'Юпитер',Saturn:'Сатурн'}[k] + ' — ' + vf.solarReturnPlanets[k];
      }).join(' · ') + '</p>');
    }

    parts.push('<div class="disc">Джйотиш — традиционная система самопознания и духовной ориентации, а не точная наука. Сведения не являются медицинским, юридическим или финансовым советом. Расчёт выполнен по сидерическому зодиаку (аянамша Лахири), эфемериды Astronomy Engine (MIT).</div>');
    parts.push('</body></html>');
    return parts.join('\n');
  }

  // Тот же отчёт, но с блоком совместимости
  function buildCompatHTML(chart1, chart2, meta1, meta2, koota, synastry){
    var base = buildReportHTML(chart1, meta1);
    // вставляем блок совместимости перед закрытием body
    var block = '<h2 class="pagebreak">Совместимость (аштакота-гун-милан)</h2>';
    block += '<div class="score">' + koota.total + ' / 36</div><p>' + esc(koota.verdict) + '</p>';
    block += '<p class="meta">' + esc((meta1&&meta1.name)||'Партнёр 1') + ' — Луна в ' + esc(chart1.planets.Moon.sign) + ' ' + esc(chart1.planets.Moon.nakshatra) +
      '; ' + esc((meta2&&meta2.name)||'Партнёр 2') + ' — Луна в ' + esc(chart2.planets.Moon.sign) + ' ' + esc(chart2.planets.Moon.nakshatra) + '</p>';
    koota.kutas.forEach(function(k){
      block += '<div class="kuta"><span style="width:110px">'+esc(k.name)+'</span><span>'+k.score+' / '+k.max+'</span><span style="color:#666;flex:1;text-align:right">'+esc(k.detail)+'</span></div>';
    });
    // глубокая синастрия
    if (synastry && synastry.sections){
      synastry.sections.forEach(function(s){
        block += '<h3>'+esc(s.title)+'</h3>';
        s.items.forEach(function(it){ block += '<p>'+it+'</p>'; });
      });
    }
    base = base.replace('</body></html>', block + '</body></html>');
    return base;
  }

  return { buildReportHTML: buildReportHTML, buildCompatHTML: buildCompatHTML };
}));
