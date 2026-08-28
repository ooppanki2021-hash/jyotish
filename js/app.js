/* ============================================================
   UI — связывает формы, расчёт и отрисовку
   ============================================================ */
(function () {
  var CITIES = {
    vladikavkaz: { name:'Владикавказ', lat:43.02, lon:44.68, tz:3 },
    moscow:      { name:'Москва', lat:55.75, lon:37.62, tz:3 },
    spb:         { name:'Санкт-Петербург', lat:59.94, lon:30.31, tz:3 },
    ekb:         { name:'Екатеринбург', lat:56.84, lon:60.65, tz:5 },
    nsk:         { name:'Новосибирск', lat:55.03, lon:82.92, tz:7 },
    vladivostok: { name:'Владивосток', lat:43.12, lon:131.89, tz:10 },
    minsk:       { name:'Минск', lat:53.90, lon:27.57, tz:3 },
    kiev:        { name:'Киев', lat:50.45, lon:30.52, tz:2 },
    almaty:      { name:'Алматы', lat:43.24, lon:76.95, tz:6 },
    tashkent:    { name:'Ташкент', lat:41.31, lon:69.28, tz:5 }
  };

  var state = { chart: null, personName: '', birth: null, chatHistory: [], compat: null, varshaphal: null };

  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function fmtDate(d){ return d.getDate()+'.'+(d.getMonth()+1<10?'0':'')+(d.getMonth()+1)+'.'+d.getFullYear(); }

  // ---------- Вкладки ----------
  function initTabs(){
    var tabs = document.querySelectorAll('#tabs .tab');
    tabs.forEach(function(t){
      t.addEventListener('click', function(){
        tabs.forEach(function(x){ x.classList.remove('active'); });
        document.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('active'); });
        t.classList.add('active');
        $('tab-'+t.dataset.tab).classList.add('active');
      });
    });
  }

  // ---------- Город ----------
  function initCity(){
    $('f-city').addEventListener('change', function(){
      var c = CITIES[this.value];
      if (!c) return;
      $('f-lat').value = c.lat; $('f-lon').value = c.lon; $('f-tz').value = c.tz;
    });
  }

  // ---------- Чтение параметров ----------
  function readForm(){
    var d = $('f-date').value.split('-');
    var t = $('f-time').value.split(':');
    return {
      y:+d[0], m:+d[1], d:+d[2], hh:+t[0], mm:+t[1],
      lat:parseFloat($('f-lat').value), lon:parseFloat($('f-lon').value), tz:parseFloat($('f-tz').value)
    };
  }

  // ---------- Расчёт натала ----------
  function onNatalSubmit(e){
    e.preventDefault();
    var p = readForm();
    if (!p.y || !p.lat || isNaN(p.lat)) { alert('Заполните дату, широту и долготу.'); return; }
    state.personName = $('f-name').value.trim();
    state.birth = { name: state.personName, date: $('f-date').value, time: $('f-time').value, lat: p.lat, lon: p.lon, tz: p.tz };
    state.chart = Jyotish.computeChart(p);
    state.chatHistory = [];
    $('natal-result').classList.remove('hidden');
    $('predict-empty').classList.add('hidden');
    $('predict-result').classList.remove('hidden');
    renderSummary(state.chart);
    renderChartTable(state.chart);
    renderReading(state.chart);
    renderVargas(state.chart);
    renderDasha(state.chart);
    renderTransits(state.chart);
    renderVarshaphal(state.chart);
    // плавный скролл к результату
    $('natal-result').scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function renderSummary(chart){
    var el = $('chart-summary');
    el.innerHTML = '<div class="big">Лагна (асцендент): ' + esc(chart.lagna.sign) + ' ' + esc(chart.lagna.degText) + '</div>' +
      '<div class="muted">Накшатра Лагны: ' + esc(chart.lagna.nakshatra) + ' · управитель Лагны: ' + esc(chart.lagnaLord) +
      ' · Атмакарака: ' + esc(chart.planets[chart.atmakaraka].ru) +
      ' · текущий период: ' + esc(chart.currentMaha.planet) + '/' + esc(chart.currentAntar.planet) + '</div>';
  }

  function planetTags(pl){
    var tags = '';
    if (pl.dignity) tags += '<span class="tag ' + (pl.dignity==='в падении' ? 'combust' : (pl.dignity==='в собственном знаке'?'own':'exalt')) + '">' + esc(pl.dignity) + '</span>';
    if (pl.retro) tags += '<span class="tag retro">ретро</span>';
    if (pl.combust) tags += '<span class="tag combust">сожжён</span>';
    return tags || '—';
  }

  function renderChartTable(chart){
    var order = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Rahu','Ketu'];
    var rows = order.map(function(k){
      var pl = chart.planets[k];
      return '<tr><td><b>'+esc(pl.ru)+'</b></td><td>'+esc(pl.sign)+'</td><td>'+esc(pl.degText)+'</td><td>'+pl.house+'</td><td>'+esc(pl.nakshatra)+'</td><td>'+pl.pada+'</td><td>'+planetTags(pl)+'</td></tr>';
    }).join('');
    $('chart-table').innerHTML =
      '<table><thead><tr><th>Планета</th><th>Знак</th><th>Градус</th><th>Дом</th><th>Накшатра</th><th>Пада</th><th>Статус</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  var readingCounter = 0;
  function renderReading(chart){
    var sections = Reading.generateReading(chart);
    readingCounter = 0;
    var html = sections.map(function(s){
      var id = readingCounter++;
      var briefHtml = '<div class="brief">' + s.brief + '</div>';
      var humanHtml = s.human ? '<div class="human"><span class="human-icon">💡</span><div class="human-text"><span class="human-label">Простыми словами</span> ' + s.human + '</div></div>' : '';
      var detailHtml = '<div class="detail" id="rd-detail-'+id+'" style="display:none">' + s.items.join('') + '</div>';
      var btn = '<button type="button" class="read-more" data-target="'+id+'">читать подробно ▾</button>';
      return '<div class="card reading-section"><div class="sec-head"><h3>'+esc(s.title)+'</h3>'+btn+'</div>'+briefHtml+humanHtml+detailHtml+'</div>';
    }).join('');
    $('reading').innerHTML = html;
    // делегирование кликов по кнопкам «читать подробно»
    var readEl = $('reading');
    readEl.querySelectorAll('.read-more').forEach(function(btn){
      btn.addEventListener('click', function(){
        var target = $('rd-detail-' + btn.dataset.target);
        var hidden = target.style.display === 'none';
        target.style.display = hidden ? 'block' : 'none';
        btn.textContent = hidden ? 'свернуть ▴' : 'читать подробно ▾';
      });
    });
    // кнопка «развернуть всё»
    var allBtn = document.createElement('button');
    allBtn.type = 'button'; allBtn.className = 'btn primary';
    allBtn.textContent = 'Развернуть всё';
    allBtn.style.marginBottom = '14px';
    allBtn.addEventListener('click', function(){
      var all = readEl.querySelectorAll('.detail');
      var anyHidden = false;
      all.forEach(function(d){ if (d.style.display === 'none') anyHidden = true; });
      all.forEach(function(d){ d.style.display = anyHidden ? 'block' : 'none'; });
      readEl.querySelectorAll('.read-more').forEach(function(b){ b.textContent = anyHidden ? 'свернуть ▴' : 'читать подробно ▾'; });
      allBtn.textContent = anyHidden ? 'Свернуть всё' : 'Развернуть всё';
    });
    $('reading').insertBefore(allBtn, $('reading').firstChild);
    // словарь терминов
    renderGlossary();
  }

  function renderGlossary(){
    var terms = Reading.GLOSSARY || [];
    if (!terms.length) return;
    var rows = terms.map(function(t){
      return '<div class="gloss"><span class="gloss-term">' + esc(t[0]) + '</span><span class="gloss-meaning">' + esc(t[1]) + '</span></div>';
    }).join('');
    var html = '<div class="card" id="glossary-card"><h2>Словарь терминов</h2><p class="muted" style="margin-top:0">Коротко о том, что значат астрологические слова в вашем разборе:</p>' + rows + '</div>';
    $('reading').insertAdjacentHTML('beforeend', html);
  }

  function renderVargas(chart){
    var order = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
    var rows = order.map(function(k){
      var pl = chart.planets[k];
      return '<tr><td><b>'+esc(pl.ru)+'</b></td><td>'+esc(pl.sign)+'</td><td>'+esc(Jyotish.SIGNS[pl.navamsaSign])+'</td><td>'+esc(Jyotish.SIGNS[pl.dashamsaSign])+'</td></tr>';
    }).join('');
    $('vargas').innerHTML = '<table><thead><tr><th>Планета</th><th>Раши (Д-1)</th><th>Навамша (Д-9)</th><th>Дашамша (Д-10)</th></tr></thead><tbody>'+rows+'</tbody></table>';
  }

  function renderDasha(chart){
    var cur = chart.currentMaha;
    $('dasha-current').innerHTML = '<p>Сейчас идёт <b>'+esc(cur.planet)+' махадаша</b> ('+fmtDate(cur.start)+' – '+fmtDate(cur.end)+'), под-период <b>'+esc(chart.currentAntar.planet)+'</b>.</p>';
    var rows = chart.mahadasha.map(function(m){
      var isCur = (m.planet===cur.planet);
      return '<tr'+(isCur?' class="current"':'')+'><td><b>'+esc(m.planet)+'</b>'+(isCur?' <span class="tag exalt">сейчас</span>':'')+'</td><td>'+fmtDate(m.start)+'</td><td>'+fmtDate(m.end)+'</td><td>'+Math.round(m.years)+' лет</td></tr>';
    }).join('');
    $('dasha-table').innerHTML = '<table><thead><tr><th>Период</th><th>Начало</th><th>Конец</th><th>Длит.</th></tr></thead><tbody>'+rows+'</tbody></table>';
    // под-периоды текущей махадаши
    var ant = chart.currentAntarList || [];
    var antRows = ant.map(function(a){
      var isCur = (a.planet===chart.currentAntar.planet);
      return '<tr'+(isCur?' class="current"':'')+'><td>'+esc(a.planet)+'</td><td>'+fmtDate(a.start)+'</td><td>'+fmtDate(a.end)+'</td></tr>';
    }).join('');
    $('dasha-current').innerHTML += '<p class="muted" style="margin-top:12px">Под-периоды текущей махадаши ('+esc(cur.planet)+'):</p><table><thead><tr><th>Антарадаша</th><th>Начало</th><th>Конец</th></tr></thead><tbody>'+antRows+'</tbody></table>';
  }

  function renderVarshaphal(chart){
    var el = $('varshaphal');
    try {
      var vf = Varshaphal.yearForecast(chart, chart.lat, chart.lon, new Date());
      state.varshaphal = vf;
      if (vf.error){ el.innerHTML = '<span class="muted">' + esc(vf.error) + '</span>'; return; }
      var planets = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'].map(function(k){
        return esc({Sun:'Солнце',Moon:'Луна',Mercury:'Меркурий',Venus:'Венера',Mars:'Марс',Jupiter:'Юпитер',Saturn:'Сатурн'}[k]) + ' — ' + esc(vf.solarReturnPlanets[k]);
      }).join(' · ');
      el.innerHTML =
        '<p><b>Солнечное возвращение:</b> ' + fmtDate(vf.solarReturnDate) + ' · Лагна года: <b>' + esc(vf.solarReturnAsc) + '</b></p>' +
        '<p><b>Мунтха:</b> ' + esc(vf.muntha) + ' — ' + esc(vf.munthaTheme) + '.</p>' +
        '<p><b>Управитель года:</b> ' + esc(vf.yearLord) + ' — ' + esc(vf.yearLordTheme) + '.</p>' +
        '<p class="muted" style="margin-top:8px">Планеты в карте года: ' + planets + '.</p>' +
        '<p class="muted">Ключевые транзиты года: Сатурн в ' + esc(vf.transits.Saturn.sign) + ', Юпитер в ' + esc(vf.transits.Jupiter.sign) + ', Раху в ' + esc(vf.transits.Rahu.sign) + '.</p>';
    } catch(e){ el.innerHTML = '<span class="muted">Ошибка расчёта годового прогноза.</span>'; }
  }

  function renderTransits(chart){
    var tr = Jyotish.transits();
    var li = chart.lagna.signIdx;
    function house(signIdx){ return (signIdx - li + 12) % 12 + 1; }
    var items = [
      ['Сатурн', tr.Saturn], ['Юпитер', tr.Jupiter], ['Раху', tr.Rahu], ['Кету', tr.Ketu]
    ].map(function(x){
      var p = x[1];
      return '<tr><td><b>'+x[0]+'</b></td><td>'+esc(p.sign)+'</td><td>'+esc(p.degText)+'</td><td>'+house(p.signIdx)+'</td></tr>';
    }).join('');
    $('transits').innerHTML = '<table><thead><tr><th>Планета</th><th>Знак</th><th>Градус</th><th>Дом от Лагны</th></tr></thead><tbody>'+items+'</tbody></table>' +
      '<p class="muted" style="margin-top:10px">Транзиты считаются на текущую дату от места вашего рождения.</p>';
  }

  // ---------- Совместимость ----------
  function readCompat(formId){
    var f = $(formId);
    function v(cls){ return f.querySelector(cls).value; }
    var d = v('.c-date').split('-'); var t = v('.c-time').split(':');
    return {
      name: v('.c-name').trim() || 'Партнёр',
      p: { y:+d[0], m:+d[1], d:+d[2], hh:+t[0], mm:+t[1], lat:parseFloat(v('.c-lat')), lon:parseFloat(v('.c-lon')), tz:parseFloat(v('.c-tz')) }
    };
  }
  function onCompat(){
    var a = readCompat('compat1'), b = readCompat('compat2');
    if (!a.p.y || !b.p.y) { alert('Заполните обе даты рождения.'); return; }
    var ca = Jyotish.computeChart(a.p), cb = Jyotish.computeChart(b.p);
    var r = Compat.ashtakoota(ca, cb, a.name, b.name);
    state.compat = { chart1: ca, chart2: cb, meta1: a, meta2: b, koota: r };
    var el = $('compat-result');
    el.classList.remove('hidden');
    var kut = r.kutas.map(function(k){
      return '<div class="kuta"><span class="nm">'+esc(k.name)+'</span><div class="bar"><i style="width:'+(k.score/k.max*100)+'%"></i></div><span class="dt">'+k.score+'/'+k.max+' · '+esc(k.detail)+'</span></div>';
    }).join('');
    el.innerHTML =
      '<div class="card"><h2>Результат совместимости</h2>' +
      '<div class="score">'+r.total+' / 36</div><p>'+esc(r.verdict)+'</p>'+kut+
      '<div class="toolbar" style="margin-top:12px"><button type="button" id="btn-save-compat" class="btn primary">⬇ Сохранить (HTML)</button></div>' +
      '<p class="muted" style="margin-top:12px">Аштакота-гун-милан по Луне ('+esc(a.name)+' — Луна в '+esc(ca.planets.Moon.sign)+' '+esc(ca.planets.Moon.nakshatra)+'; '+esc(b.name)+' — Луна в '+esc(cb.planets.Moon.sign)+' '+esc(cb.planets.Moon.nakshatra)+').</p></div>';
    renderDeepSynastry(ca, cb, a.name, b.name);
    el.scrollIntoView({ behavior:'smooth' });
    document.getElementById('btn-save-compat').addEventListener('click', onSaveCompat);
  }

  // ---------- Чат ----------
  function initChat(){
    var cfg = Chat.getConfig();
    $('s-key').value = cfg.key; $('s-model').value = cfg.model;
    $('s-save').addEventListener('click', function(){
      Chat.setConfig($('s-key').value.trim(), $('s-model').value.trim());
      $('s-status').textContent = 'Сохранено ✓';
      setTimeout(function(){ $('s-status').textContent=''; }, 2000);
    });
    function send(){
      var input = $('chat-msg');
      var text = input.value.trim();
      if (!text) return;
      if (!state.chart){ alert('Сначала рассчитайте карту на вкладке «Карта и чтение».'); return; }
      var cfg = Chat.getConfig();
      if (!cfg.key){ alert('Введите API-ключ Gemini в настройках выше.'); return; }
      input.value = '';
      addMsg('user', text);
      state.chatHistory.push({ role:'user', text:text });
      addMsg('model', '<span class="spinner"></span>', true);
      Chat.send(text, state.chatHistory.slice(0,-1), state.chart, state.personName).then(function(reply){
        replaceLastMsg(reply);
        state.chatHistory.push({ role:'model', text:reply });
      }).catch(function(err){
        var msg = err.message === 'NO_KEY' ? 'Нужен API-ключ Gemini.' :
          'Ошибка запроса: ' + err.message + '. Проверьте ключ и модель в настройках.';
        replaceLastMsg('<i>'+esc(msg)+'</i>', true);
        state.chatHistory.pop();
      });
    }
    $('chat-send').addEventListener('click', send);
    $('chat-msg').addEventListener('keydown', function(e){ if (e.key==='Enter') send(); });
  }

  function addMsg(role, html, isLast){
    var log = $('chat-log');
    if (log.querySelector('.chat-empty')) log.innerHTML = '';
    var d = document.createElement('div');
    d.className = 'msg ' + role;
    d.innerHTML = html;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }
  function replaceLastMsg(html, isErr){
    var log = $('chat-log');
    var nodes = log.querySelectorAll('.msg');
    var last = nodes[nodes.length-1];
    if (!last) return;
    last.innerHTML = html;
    if (isErr) last.className = 'msg error';
    log.scrollTop = log.scrollHeight;
  }

  // ---------- Сохранение / печать ----------
  function downloadFile(filename, content, mime){
    var blob = new Blob([content], { type: mime || 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 100);
  }
  function safeName(s){
    s = (s||'разбор').trim().replace(/[\\/:*?"<>|]+/g,'').replace(/\s+/g,'_');
    return s || 'разбор';
  }
  function onSave(){
    if (!state.chart) return;
    var html = Report.buildReportHTML(state.chart, state.birth, { varshaphal: state.varshaphal });
    var fname = 'джйотиш_' + safeName(state.personName || 'разбор') + '.html';
    downloadFile(fname, html);
  }
  function onPrint(){
    if (!state.chart) return;
    var html = Report.buildReportHTML(state.chart, state.birth, { varshaphal: state.varshaphal });
    var frame = $('print-frame');
    frame.srcdoc = html;
    frame.onload = function(){
      try { frame.contentWindow.focus(); frame.contentWindow.print(); }
      catch(e){ alert('Печать не удалась в этом браузере. Сохраните разбор как HTML и откройте его для печати.'); }
    };
  }
  function onSaveCompat(){
    if (!state.compat) return;
    var html = Report.buildCompatHTML(state.compat.chart1, state.compat.chart2, state.compat.meta1, state.compat.meta2, state.compat.koota, state.compat.synastry);
    var fname = 'совместимость_' + safeName((state.compat.meta1.name||'1')) + '_' + safeName((state.compat.meta2.name||'2')) + '.html';
    downloadFile(fname, html);
  }

  function renderDeepSynastry(ca, cb, name1, name2){
    var syn = Synastry.deepSynastry(ca, cb, name1, name2);
    if (state.compat) state.compat.synastry = syn;
    var el = $('synastry-result');
    el.classList.remove('hidden');
    var html = syn.sections.map(function(s){
      return '<div class="card reading-section"><h3>'+esc(s.title)+'</h3>' + s.items.map(function(it){ return '<p>'+it+'</p>'; }).join('') + '</div>';
    }).join('');
    el.innerHTML = html;
  }

  // ---------- Мухурта ----------
  function fmtLocal(utcMs, tz){
    var d = new Date(utcMs + tz*3600000);
    function p2(n){ return n<10?'0'+n:''+n; }
    return p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes());
  }
  function fmtLocalDay(dateObj, tz){
    var d = new Date(dateObj.getTime() + tz*3600000);
    return d.getUTCDate() + '.' + (d.getUTCMonth()+1<10?'0':'') + (d.getUTCMonth()+1) + '.' + d.getUTCFullYear();
  }
  function kalaLine(k, label, tz){
    if (!k) return '';
    return '<div class="kala"><span class="nm">' + label + '</span><span>' + fmtLocal(k.start.getTime(), tz) + '–' + fmtLocal(k.end.getTime(), tz) + '</span></div>';
  }
  function renderPanchanga(p, tz){
    var kalas = p.kalas || {};
    var html = '<div class="panch-grid">' +
      '<div><span class="k">Титхи</span><span class="v">' + esc(p.tithi.name) + ' <span class="muted">(' + esc(p.tithi.paksha) + ')</span></span></div>' +
      '<div><span class="k">День недели</span><span class="v">' + esc(p.varaName) + ' <span class="muted">(' + esc(p.varaPlanet) + ')</span></span></div>' +
      '<div><span class="k">Накшатра</span><span class="v">' + esc(p.nakshatraName) + '</span></div>' +
      '<div><span class="k">Восход/заход</span><span class="v">' + (p.sunrise ? fmtLocal(p.sunrise.getTime(), tz) : '—') + ' / ' + (p.sunset ? fmtLocal(p.sunset.getTime(), tz) : '—') + '</span></div>' +
      '</div>';
    if (kalas.rahu || kalas.yamaganda || kalas.gulika){
      html += '<div class="kalas">' + kalaLine(kalas.rahu,'Раху-кала',tz) + kalaLine(kalas.yamaganda,'Ямаганда',tz) + kalaLine(kalas.gulika,'Гулика',tz) + '</div>';
    }
    return html;
  }
  function onMuhurta(){
    var lat = parseFloat($('m-lat').value), lon = parseFloat($('m-lon').value), tz = parseFloat($('m-tz').value);
    var days = parseInt($('m-days').value, 10) || 7;
    var activity = $('m-activity').value;
    if (isNaN(lat) || isNaN(lon) || isNaN(tz)){ alert('Укажите широту, долготу и часовой пояс.'); return; }
    try {
      var p = Muhurta.panchangaNow(lat, lon, tz);
      $('m-panchanga-body').innerHTML = renderPanchanga(p, tz);
    } catch(e){ $('m-panchanga-body').innerHTML = '<span class="muted">Ошибка панчанги: ' + esc(e.message) + '</span>'; }

    var r = Muhurta.findMuhurta(lat, lon, tz, activity, days, 30);
    var el = $('m-result');
    el.classList.remove('hidden');
    var daysHtml = r.days.map(function(d){
      var winHtml;
      if (d.windows.length){
        winHtml = d.windows.map(function(w){
          return '<div class="win"><b>' + fmtLocal(w.start, tz) + ' – ' + fmtLocal(w.end, tz) + '</b>' +
            '<span class="muted"> · ' + esc(w.tithi) + ' · ' + esc(w.nak) + ' · балл ' + w.score + '</span></div>';
        }).join('');
      } else {
        winHtml = '<div class="muted">В этот день благоприятных окон не найдено.</div>';
      }
      return '<div class="daycard"><div class="dayhead"><b>' + fmtLocalDay(d.date, tz) + '</b> <span class="muted">' + esc(d.varaName) + ' · ' + esc(d.tithi) + ' · ' + esc(d.nakshatra) + '</span></div>' + winHtml + '</div>';
    }).join('');
    el.innerHTML = '<div class="card"><h2>Благоприятные окна: ' + esc(r.activity) + '</h2>' + daysHtml +
      '<p class="muted" style="margin-top:10px">Поиск от восхода до захода с шагом 30 минут. Исключены Раху-кала, Ямаганда и Гулика. Порог «благоприятно» — хорошие титхи + день недели + накшатра.</p></div>';
    el.scrollIntoView({ behavior:'smooth' });
  }

  // ---------- init ----------
  document.addEventListener('DOMContentLoaded', function(){
    initTabs();
    initCity();
    initChat();
    $('natal-form').addEventListener('submit', onNatalSubmit);
    $('compat-btn').addEventListener('click', onCompat);
    $('btn-print').addEventListener('click', onPrint);
    $('btn-save').addEventListener('click', onSave);
    $('m-go').addEventListener('click', onMuhurta);
  });
})();
