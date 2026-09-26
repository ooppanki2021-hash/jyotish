/* ============================================================
   UI — связывает формы, расчёт и отрисовку
   ============================================================ */
(function () {
  var state = { chart: null, personName: '', birth: null, chatHistory: [], compat: null, varshaphal: null, city: '' };

  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function fmtDate(d){ return d.getDate()+'.'+(d.getMonth()+1<10?'0':'')+(d.getMonth()+1)+'.'+d.getFullYear(); }

  // ---------- Вкладки ----------
  function initTabs(){
    var menu = $('om-menu'), nav = $('tabs');
    if (menu && nav) { menu.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); var open=nav.classList.toggle('menu-open'); menu.setAttribute('aria-expanded', open ? 'true' : 'false'); }); }
    var tabs = document.querySelectorAll('#tabs .tab');
    tabs.forEach(function(t){
      t.addEventListener('click', function(){
        tabs.forEach(function(x){ x.classList.remove('active'); });
        document.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('active'); });
        t.classList.add('active');
        $('tab-'+t.dataset.tab).classList.add('active');
        if (nav && nav.classList.contains('menu-open')) { nav.classList.remove('menu-open'); if (menu) menu.setAttribute('aria-expanded','false'); }
      });
    });
  }

  // ---------- Город: все города мира + автоопределение пояса ----------
  var autoTz = { natal: null }; // IANA-часовой пояс выбранного города

  function natalWall(){
    var d = $('f-date').value.split('-'), t = $('f-time').value.split(':');
    return { y:+d[0], m:+d[1], d:+d[2], hh:+(t[0]||0), mm:+(t[1]||0) };
  }
  function setNote(id, text){ var el = $(id); if (el) el.textContent = text; }

  function refreshNatalTz(){
    if (!autoTz.natal || !window.CitySearch) return;
    var w = natalWall();
    var off = CitySearch.offsetHoursForWall(w.y, w.m, w.d, w.hh, w.mm, autoTz.natal);
    if (off === null) return;
    $('f-tz').value = off;
    setNote('f-tz-note', 'Пояс ' + autoTz.natal + ' → UTC' + (off >= 0 ? '+' : '') + off +
      ' на указанную дату. Летнее время и переводы часов учтены автоматически.');
  }

  function initCity(){
    if (!window.CitySearch || !window.JCITIES) return; // база не загрузилась — остаются ручные координаты

    // --- Натальная форма
    CitySearch.attach($('f-city'), {
      getWall: natalWall,
      onPick: function(city){
        $('f-lat').value = city.lat; $('f-lon').value = city.lon;
        autoTz.natal = city.tz;
        state.city = city.label;
        refreshNatalTz();
      }
    });
    $('f-date').addEventListener('change', refreshNatalTz);
    $('f-time').addEventListener('change', refreshNatalTz);
    $('f-tz').addEventListener('input', function(){
      autoTz.natal = null;
      setNote('f-tz-note', 'Пояс задан вручную — автопересчёт при смене даты выключен.');
    });

    // --- Совместимость (оба партнёра)
    ['compat1', 'compat2'].forEach(function(id){
      var form = $(id);
      var inp = form.querySelector('.c-city');
      var dateEl = form.querySelector('.c-date'), timeEl = form.querySelector('.c-time');
      var latEl = form.querySelector('.c-lat'), lonEl = form.querySelector('.c-lon'), tzEl = form.querySelector('.c-tz');
      if (!inp) return;
      function wall(){
        var d = dateEl.value.split('-'), t = timeEl.value.split(':');
        return { y:+d[0], m:+d[1], d:+d[2], hh:+(t[0]||0), mm:+(t[1]||0) };
      }
      function refresh(){
        if (!form.dataset.cityTz) return;
        var w = wall();
        var off = CitySearch.offsetHoursForWall(w.y, w.m, w.d, w.hh, w.mm, form.dataset.cityTz);
        if (off !== null) tzEl.value = off;
      }
      CitySearch.attach(inp, {
        getWall: wall,
        onPick: function(city){
          latEl.value = city.lat; lonEl.value = city.lon;
          form.dataset.cityTz = city.tz;
          refresh();
        }
      });
      dateEl.addEventListener('change', refresh);
      timeEl.addEventListener('change', refresh);
      tzEl.addEventListener('input', function(){ form.dataset.cityTz = ''; });
    });

    // --- Мухурта
    CitySearch.attach($('m-city'), {
      onPick: function(city){
        $('m-lat').value = city.lat; $('m-lon').value = city.lon;
        var off = CitySearch.offsetHoursNow(city.tz);
        if (off !== null) $('m-tz').value = off;
      }
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

  // ---------- Сохранённые карты (хранятся в этом браузере/устройстве) ----------
  var SAVED_KEY = 'jy_saved_charts';
  function loadSaved(){ try { var a = JSON.parse(localStorage.getItem(SAVED_KEY)); return Array.isArray(a) ? a : []; } catch(e){ return []; } }
  function writeSaved(list){ try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch(e){} }
  function savedKey(r){ return ((r.name||'').trim().toLowerCase() + '|' + (r.date||'')); }
  function savedLabel(r){ return (r.name || 'Без имени') + ' · ' + r.date + (r.cityLabel ? ' · ' + r.cityLabel : ''); }
  function refreshSavedSelects(){
    var list = loadSaved();
    var opts = list.map(function(r, i){
      return '<option value="' + i + '">' + esc(savedLabel(r)) + '</option>';
    }).join('');
    var sel = $('f-saved');
    if (sel){
      var cur = sel.value;
      sel.innerHTML = '<option value="">— подставить сохранённую —</option>' + opts;
      sel.value = cur;
    }
    document.querySelectorAll('.c-saved').forEach(function(cs){
      cs.innerHTML = '<option value="">— подставить карту —</option>' + opts;
    });
    var rs = $('rank-saved');
    if (rs) rs.innerHTML = list.length ? list.map(function(r, i){ return '<option value="' + i + '">' + esc(savedLabel(r)) + '</option>'; }).join('') : '<option disabled>Нет сохранённых карт</option>';
  }

  function onRankPartners(){
    var result = $('rank-result'), sel = $('rank-saved');
    if (!result || !sel) return;
    var chosen = Array.prototype.slice.call(sel.selectedOptions || []).map(function(o){ return parseInt(o.value, 10); }).filter(function(i){ return !isNaN(i); });
    if (chosen.length < 2) { result.classList.remove('hidden'); result.innerHTML = '<p class="muted">Выберите минимум две сохранённые карты партнёров.</p>'; return; }
    var me = readCompat('compat1');
    if (!me.p.y || isNaN(me.p.lat) || isNaN(me.p.lon)) { result.classList.remove('hidden'); result.innerHTML = '<p class="muted">Сначала заполните данные Партнёра 1.</p>'; return; }
    var mine = Jyotish.computeChart(me.p), list = loadSaved(), rows = [];
    chosen.forEach(function(i){
      var r = list[i]; if (!r || !r.date) return;
      var d = r.date.split('-'), t = (r.time || '12:00').split(':');
      var p = {y:+d[0],m:+d[1],d:+d[2],hh:+t[0],mm:+t[1],lat:+r.lat,lon:+r.lon,tz:+r.tz};
      try { var ch = Jyotish.computeChart(p), story = CompatStory.analyze(mine, ch, me.name, r.name || 'Партнёр'); rows.push({r:r, story:story}); } catch(e) {}
    });
    rows.sort(function(a,b){ return b.story.total.score - a.story.total.score; });
    result.classList.remove('hidden');
    result.innerHTML = '<h3>Рейтинг совместимости</h3>' + rows.map(function(x, n){
      var t=x.story.total, cls=t.score>=6.5?'lm-good':(t.score<5?'lm-hard':'lm-mid');
      return '<div class="card" style="margin:10px 0;padding:12px"><b>#'+(n+1)+' '+esc(x.r.name||'Без имени')+'</b><div class="score '+cls+'">'+t.score+' / 10</div><p>'+esc(t.verdict)+'</p><p class="muted">Опоры: '+esc(t.strengths.join(' · '))+'<br>Зоны внимания: '+esc(t.weak.join(' · '))+'</p></div>';
    }).join('') + '<p class="muted">Рейтинг показывает, с кем легче по совокупности 19 сфер. Это ориентир, а не окончательный приговор отношениям.</p>';
  }
  function flashSaved(msg){
    var el = $('save-chart-status'); if (!el) return;
    el.textContent = msg;
    setTimeout(function(){ el.textContent = ''; }, 2500);
  }
  function onSaveChart(){
    var p = readForm();
    if (!p.y || !p.lat || isNaN(p.lat)) { flashSaved('Заполните данные перед сохранением.'); return; }
    var rec = { name: $('f-name').value.trim() || 'Без имени',
                date: $('f-date').value, time: $('f-time').value,
                lat: p.lat, lon: p.lon, tz: p.tz,
                cityLabel: state.city || $('f-city').value.trim(),
                cityTz: autoTz.natal || '' };
    var list = loadSaved().filter(function(r){ return savedKey(r) !== savedKey(rec); });
    list.unshift(rec);
    if (list.length > 50) list = list.slice(0, 50);
    writeSaved(list);
    refreshSavedSelects();
    flashSaved('Сохранено ✓ (' + list.length + ' карт на устройстве)');
  }
  function onExportCharts(){
    var data = {app:'jyotish-charts', version:1, exported:new Date().toISOString(), charts:loadSaved()};
    var blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'}), url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download='джйотиш_карты_'+data.charts.length+'.json'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},500); flashSaved('Экспортировано ✓');
  }
  function onImportCharts(e){
    var file=e.target.files&&e.target.files[0]; if(!file)return; var rd=new FileReader();
    rd.onload=function(){ try { var x=JSON.parse(rd.result), incoming=Array.isArray(x)?x:(x&&Array.isArray(x.charts)?x.charts:[]); var list=loadSaved(), keys={}; list.forEach(function(r){keys[savedKey(r)]=1;}); var added=0; incoming.forEach(function(r){ if(!r||!r.date||!r.lat||!r.lon||keys[savedKey(r)])return; list.push(r);keys[savedKey(r)]=1;added++; }); list=list.slice(0,50); writeSaved(list); refreshSavedSelects(); flashSaved('Импортировано: '+added+' карт ✓'); } catch(err){ flashSaved('Не удалось прочитать файл.'); } e.target.value=''; }; rd.readAsText(file);
  }

  function natalFormFromRecord(r){
    $('f-name').value = (r.name && r.name !== 'Без имени') ? r.name : '';
    $('f-date').value = r.date; $('f-time').value = r.time;
    $('f-lat').value = r.lat; $('f-lon').value = r.lon; $('f-tz').value = r.tz;
    $('f-city').value = r.cityLabel || '';
    state.city = r.cityLabel || '';
    autoTz.natal = r.cityTz || null;
    refreshNatalTz();
  }
  function onSavedChange(){
    var sel = $('f-saved');
    var idx = parseInt(sel.value, 10);
    if (isNaN(idx)) return;
    var r = loadSaved()[idx];
    if (!r) return;
    natalFormFromRecord(r);
    sel.value = '';
    $('natal-form').dispatchEvent(new Event('submit', { cancelable: true }));
  }
  function onDeleteSaved(){
    var sel = $('f-saved');
    var idx = parseInt(sel.value, 10);
    if (isNaN(idx)) { flashSaved('Сначала выберите карту в списке.'); return; }
    var list = loadSaved();
    list.splice(idx, 1);
    writeSaved(list);
    refreshSavedSelects();
    flashSaved('Удалено ✓');
  }
  function onCompatSavedChange(e){
    var cs = e.target;
    var form = cs.closest ? cs.closest('form') : null;
    var idx = parseInt(cs.value, 10);
    if (isNaN(idx) || !form) return;
    var r = loadSaved()[idx];
    if (!r) return;
    form.querySelector('.c-name').value = (r.name && r.name !== 'Без имени') ? r.name : '';
    form.querySelector('.c-date').value = r.date;
    form.querySelector('.c-time').value = r.time;
    form.querySelector('.c-lat').value = r.lat;
    form.querySelector('.c-lon').value = r.lon;
    form.querySelector('.c-tz').value = r.tz;
    form.querySelector('.c-city').value = r.cityLabel || '';
    form.dataset.cityTz = r.cityTz || '';
    cs.value = '';
  }

  // ---------- Расчёт натала ----------
  function onNatalSubmit(e){
    e.preventDefault();
    var p = readForm();
    if (!p.y || !p.lat || isNaN(p.lat)) { alert('Заполните дату, широту и долготу.'); return; }
    state.personName = $('f-name').value.trim();
    state.birth = { name: state.personName, date: $('f-date').value, time: $('f-time').value, lat: p.lat, lon: p.lon, tz: p.tz, city: state.city || '' };
    state.chart = Jyotish.computeChart(p);
    // один раз подставляем место рождения в мухурту (пояс — текущий для этого города)
    if (!state.mPreset){
      state.mPreset = true;
      var mL = $('m-lat');
      if (mL){
        mL.value = p.lat; $('m-lon').value = p.lon;
        var nowOff = (autoTz.natal && window.CitySearch) ? CitySearch.offsetHoursNow(autoTz.natal) : null;
        $('m-tz').value = (nowOff !== null) ? nowOff : p.tz;
        var mCity = $('m-city');
        if (mCity) mCity.value = state.city || $('f-city').value.trim();
      }
    }
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
    renderForecastStory(state.chart);
    renderCausal();
    renderNatalSak();
    renderProf();
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
    // Карта сфер жизни (после «Итога судьбы», перед словарём)
    renderLifeMap(chart);
    // словарь терминов
    renderGlossary();
  }

  function renderLifeMap(chart){
    if (typeof LifeMap === 'undefined') return;
    var data = LifeMap.analyze(chart);
    var rowsHtml = data.areas.map(function (a, i) {
      var pct = Math.round(a.score * 10);
      var factorsHtml = a.factors.map(function (f) {
        var cls = f.d > 0 ? 'plus' : (f.d < 0 ? 'minus' : 'zero');
        var dtxt = f.d === 0 ? '0' : ((f.d > 0 ? '+' : '') + f.d);
        return '<li><span class="lm-delta ' + cls + '">' + dtxt + '</span>' + esc(f.t) + '</li>';
      }).join('');
      var karmaNote = a.karmaNote ? '<div class="lm-karma-note">' + esc(a.karmaNote) + '</div>' : '';
      return '<div class="lm-row-wrap">' +
        '<div class="lm-row" data-lm="' + i + '" role="button" tabindex="0" aria-expanded="false">' +
          '<span class="lm-name">' + a.emoji + ' ' + esc(a.name) + '</span>' +
          '<span class="lm-bar"><span class="lm-fill ' + a.cls + '" style="width:' + pct + '%"></span></span>' +
          '<span class="lm-score">' + a.score + '</span>' +
          '<span class="lm-verdict ' + a.cls + '">' + esc(a.verdict) + ' · ' + esc(a.verdictNote) + '</span>' +
        '</div>' +
        '<div class="lm-detail" id="lm-detail-' + i + '" hidden>' +
          '<div class="muted" style="font-size:12px">Из чего сложилась оценка:</div>' +
          '<ul>' + factorsHtml + '</ul>' +
          '<div class="lm-action">✅ Что делать: ' + esc(a.action) + '</div>' +
          karmaNote +
        '</div>' +
      '</div>';
    }).join('');

    var karmaHtml = data.karma.map(function (k) {
      return '<tr><td><b>' + esc(k.title) + '</b></td><td>' + esc(k.why) + '</td><td>' + esc(k.action) + '</td></tr>';
    }).join('');

    var html =
      '<div class="card" id="lifemap-card">' +
        '<h2>🧭 Карта сфер жизни</h2>' +
        '<p class="muted" style="margin-top:0">Все 12 сфер по 10-балльной шкале: <b>1</b> — «тяжело, всё через усилие», <b>10</b> — «всё идёт само». Нажмите на сферу, чтобы увидеть, из чего сложилась оценка и что делать.</p>' +
        '<div class="lm-rows">' + rowsHtml + '</div>' +
        '<h3 style="margin-top:20px">Карма: на что обратить внимание</h3>' +
        '<table class="lm-karma"><thead><tr><th style="width:24%">Точка внимания</th><th>Почему важно</th><th style="width:28%">Что делать</th></tr></thead><tbody>' + karmaHtml + '</tbody></table>' +
        '<div class="lm-total">' +
          '<div class="lm-total-score">' + data.total.score + '<small>/10</small></div>' +
          '<div class="lm-total-text">' +
            '<div class="lm-total-verdict">Общее качество жизни по карте</div>' +
            '<div>' + esc(data.total.verdict) + '</div>' +
            '<div class="lm-total-sub">💪 Опоры: ' + esc(data.total.supports.join(' · ')) + '</div>' +
            '<div class="lm-total-sub">⚠️ Зоны риска: ' + esc(data.total.risks.join(' · ')) + '</div>' +
          '</div>' +
        '</div>' +
        '<p class="muted" style="margin-top:12px">Это тенденции карты, а не приговор: сильные сферы — то, на что стоит опираться, слабые — точки приложения усилий.</p>' +
      '</div>';
    $('reading').insertAdjacentHTML('beforeend', html);

    var card = $('lifemap-card');
    card.querySelectorAll('.lm-row').forEach(function (row) {
      function toggle(){
        var d = $('lm-detail-' + row.dataset.lm);
        var hidden = d.hidden;
        d.hidden = !hidden;
        row.setAttribute('aria-expanded', hidden ? 'true' : 'false');
      }
      row.addEventListener('click', toggle);
      row.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
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
    // Толкование транзитов
    var interp = transitInterpretation(tr, li);
    $('transits').innerHTML = '<table><thead><tr><th>Планета</th><th>Знак</th><th>Градус</th><th>Дом от Лагны</th></tr></thead><tbody>'+items+'</tbody></table>' +
      '<div class="transit-notes">' + interp + '</div>' +
      '<p class="muted" style="margin-top:10px">Транзиты считаются на текущую дату от места вашего рождения.</p>';
  }

  function renderForecastStory(chart){
    var el = $('forecast-story');
    if (!el || typeof ForecastStory === 'undefined') return;
    try {
      var sphereSel = '<div class="fs-sphere"><label class="fs-sphere-label">🎯 Сфера жизни</label><select id="fs-sphere">' +
        '<option value="">— не выбирать (общий рассказ) —</option>' +
        Object.keys(ForecastStory.SPHERES).map(function (k) {
          return '<option value="' + k + '">' + ForecastStory.SPHERES[k].label + '</option>';
        }).join('') + '</select></div>';
      function boolMethod(NS){ return (typeof NS !== 'undefined' && NS.forecast); }
      var darBtn = boolMethod(Daragan)
        ? '<div class="fs-daragan-wrap"><button type="button" id="btn-daragan" class="btn">🔮 Прогноз по Дарагану</button>' +
          '<span class="muted fs-daragan-hint">Метод: транзиты · прогрессии · дирекции · соляр (тропический зодиак). Отдельный расчёт, не заменяет основной.</span>' +
          '<div id="daragan-result"></div></div>'
        : '';
      var sakBtn = boolMethod(Sakoyan)
        ? '<div class="fs-daragan-wrap"><button type="button" id="btn-sakoyan" class="btn">📖 Прогнозы по Сакойян-Фенсис-Эккер-Луис</button>' +
          '<span class="muted fs-daragan-hint">Метод «Справочник астролога. Том II. Транзиты планет»: мажорные аспекты, орбис 1°/2°, транзиты по домам и углам, усиление натальных аспектов.</span>' +
          '<div id="sakoyan-result"></div></div>'
        : '';
      el.innerHTML = '<div class="card story-card"><h2>📖 Рассказ о вашем периоде</h2>' +
        '<p class="muted" style="margin-top:0">Без терминов: какой период жизни идёт сейчас, какую атмосферу он создаёт, чем лучше заниматься, когда закончится — и план действий.</p>' +
        sphereSel +
        '<div id="fs-sphere-block"></div>' +
        ForecastStory.buildHTML(chart, state.personName) + darBtn + sakBtn + '</div>';
      var sel = $('fs-sphere');
      if (sel) sel.addEventListener('change', function () {
        var blk = $('fs-sphere-block');
        var val = sel.value;
        try {
          blk.innerHTML = val ? ForecastStory.buildSphereHTML(chart, state.personName, val) : '';
          // если уже отображены прогнозы Дарагана/Сакойян — обновить под выбранную сферу
          var dres = $('daragan-result');
          if (dres && dres.dataset.shown && boolMethod(Daragan)) dres.innerHTML = Daragan.forecast(chart, val || 'general');
          var sres = $('sakoyan-result');
          if (sres && sres.dataset.shown && boolMethod(Sakoyan)) sres.innerHTML = Sakoyan.forecast(chart, val || 'general');
        } catch (e) { blk.innerHTML = ''; }
      });
      var dbtn = $('btn-daragan');
      if (dbtn) dbtn.addEventListener('click', function () {
        var dres = $('daragan-result');
        if (!dres) return;
        try {
          dres.innerHTML = Daragan.forecast(chart, (sel && sel.value) || 'general');
          dres.dataset.shown = '1';
          dres.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) { dres.innerHTML = ''; }
      });
      var sbtn = $('btn-sakoyan');
      if (sbtn) sbtn.addEventListener('click', function () {
        var sres = $('sakoyan-result');
        if (!sres) return;
        try {
          sres.innerHTML = Sakoyan.forecast(chart, (sel && sel.value) || 'general');
          sres.dataset.shown = '1';
          sres.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) { sres.innerHTML = ''; }
      });
    } catch (e) { el.innerHTML = ''; }
  }

  function transitInterpretation(tr, li){
    function h(si){ return (si - li + 12) % 12 + 1; }
    var notes = [];
    // Сатурн
    var satHouse = h(tr.Saturn.signIdx);
    var satMap = {
      1:'Сатурн идёт по вашей Лагне — период зрелости, пересмотра себя, «взросления». Больше ответственности, но и прочный фундамент.',
      2:'Сатурн во 2-м доме — фокус на финансах: учитесь копить, возможны временные стеснения в деньгах.',
      3:'Сатурн в 3-м — напряжённый ум, много работы с текстами/поездками; братьям/сёстрам нужна поддержка.',
      4:'Сатурн в 4-м — внимание к дому, недвижимости, матери; потребность в «внутренней опоре».',
      5:'Сатурн в 5-м — серьёзный период для детей/творчества/обучения; романтика уступает дисциплине.',
      6:'Сатурн в 6-м — благоприятно для здоровья и службы: системный труд и режим дают победу над болезнями и долгами.',
      7:'Сатурн в 7-м — проверка партнёрства/брака; серьёзные обязательства или пересмотр отношений.',
      8:'Сатурн в 8-м — глубокие трансформации, возможны страхи; осторожнее с долгами и чужими деньгами.',
      9:'Сатурн в 9-м — пересмотр убеждений, трудности с наставниками; зрелость через учёбу.',
      10:'Сатурн в 10-м — пик карьеры: упорный труд даёт статус, но требует терпения.',
      11:'Сатурн в 11-м — пересмотр круга друзей и доходов; доход через дисциплину.',
      12:'Сатурн в 12-м — период уединения, заграницы, расходов; «закрыть хвосты» и отпустить лишнее.'
    };
    notes.push('<p><b>Сатурн</b> (в ' + tr.Saturn.sign + ', ' + satHouse + '-й дом): ' + (satMap[satHouse]||'влияние на сферу '+satHouse+'-го дома') + '</p>');
    // Юпитер
    var jupHouse = h(tr.Jupiter.signIdx);
    var jupMap = {
      1:'Юпитер по вашей Лагне — лучший период: удача, рост, защита, оптимизм. Отличное время для новых начинаний.',
      2:'Юпитер во 2-м — рост доходов, хорошая речь, благоприятно для накоплений.',
      3:'Юпитер в 3-м — удача в общении, поездках, обучении, связях.',
      4:'Юпитер в 4-м — счастье в доме, хорошее время для недвижимости и семьи.',
      5:'Юпитер в 5-м — отличный период для детей, творчества, романтики и инвестиций.',
      6:'Юпитер в 6-м — защита от болезней и врагов, рост через службу.',
      7:'Юпитер в 7-м — благоприятно для брака и партнёрства, приходит хороший союз.',
      8:'Юпитер в 8-м — удача в «чужих деньгах»: наследства, страховки, кредиты, крупные суммы.',
      9:'Юпитер в 9-м — пик удачи и духовного роста, благословение наставников.',
      10:'Юпитер в 10-м — карьерный рост, признание, покровительство начальства.',
      11:'Юпитер в 11-м — рост доходов и круга друзей, исполнение желаний.',
      12:'Юпитер в 12-м — тихая удача, духовность, заграница; рост расходов.'
    };
    notes.push('<p><b>Юпитер</b> (в ' + tr.Jupiter.sign + ', ' + jupHouse + '-й дом): ' + (jupMap[jupHouse]||'благотворное влияние на сферу '+jupHouse+'-го дома') + '</p>');
    // Раху/Кету
    var rahuHouse = h(tr.Rahu.signIdx);
    notes.push('<p><b>Раху</b> (в ' + tr.Rahu.sign + ', ' + rahuHouse + '-й дом): сильное притяжение к новому и нестандартному в этой сфере — амбиции, перемены, иногда иллюзии. <b>Кету</b> — напротив, тянет к отпусканию и духовному в противоположной сфере.</p>');
    return notes.join('');
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
    renderCompatStory(ca, cb, a.name, b.name);
    document.getElementById('btn-save-compat').addEventListener('click', onSaveCompat);
  }

  // ---------- Толкование натальной карты по Сакойян-Эккер (Том I) ----------
  function renderNatalSak(){
    if (!state.chart) return;
    var el = $('natal-sak-result');
    if (!el || typeof SakoyanNatal === 'undefined') return;
    var html = SakoyanNatal.analyze(state.chart);
    if (!html) return;
    el.innerHTML = html + '<div class="toolbar" style="margin-top:12px"><button type="button" id="btn-save-natalsak" class="btn primary">⬇ Сохранить толкование (HTML)</button></div>';
    el.classList.remove('hidden');
    var prev = $('natal-sak-empty'); if (prev) prev.classList.add('hidden');
    var save = $('btn-save-natalsak');
    if (save) save.addEventListener('click', function(){
      var fname = 'натальная_карта_сакоян_' + safeName(state.personName || 'я') + '.html';
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a'); link.href = url; link.download = fname; document.body.appendChild(link); link.click();
      setTimeout(function(){ document.body.removeChild(link); URL.revokeObjectURL(url); }, 60);
    });
  }
  function onNatalSak(){ if (!state.chart){ alert('Сначала рассчитайте карту на вкладке «Кто я, мой путь».'); return; } renderNatalSak(); }

  // ---------- Профессия и бизнес (Дараган) ----------
  function renderProf(){
    if (!state.chart) return;
    var el = $('prof-result');
    if (!el || typeof DaraganProf === 'undefined') return;
    var html = DaraganProf.analyze(state.chart);
    if (!html) return;
    el.innerHTML = html + '<div class="toolbar" style="margin-top:12px"><button type="button" id="btn-save-prof" class="btn primary">⬇ Сохранить разбор (HTML)</button></div>';
    el.classList.remove('hidden');
    var prev = $('prof-empty'); if (prev) prev.classList.add('hidden');
    var save = $('btn-save-prof');
    if (save) save.addEventListener('click', function(){
      var fname = 'профессия_бизнес_дараган_' + safeName(state.personName || 'я') + '.html';
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a'); link.href = url; link.download = fname; document.body.appendChild(link); link.click();
      setTimeout(function(){ document.body.removeChild(link); URL.revokeObjectURL(url); }, 60);
    });
  }
  function onProf(){ if (!state.chart){ alert('Сначала рассчитайте карту на вкладке «Кто я, мой путь».'); return; } renderProf(); }

  // ---------- Спросить Дарагана (поиск по книге) ----------
  function onAsk(){
    var inp = $('ask-input'); if (!inp) return;
    var q = inp.value.trim();
    if (!q){ alert('Введите вопрос.'); return; }
    var el = $('daragan-ask-result');
    if (!el || typeof DaraganAsk === 'undefined'){ el.innerHTML = '<p class="muted">Модуль поиска не загружен.</p>'; return; }
    el.classList.remove('hidden');
    var html = DaraganAsk.answer(q);
    el.innerHTML = html || '<p class="muted">Не нашлось подходящего места в книге.</p>';
  }

  // ---------- Причинные аспекты (кармический разбор по Орловой) ----------
  function renderCausal(){
    if (!state.chart) return;
    var el = $('causal-result');
    if (!el || typeof Causal === 'undefined') return;
    var html = Causal.analyze(state.chart);
    if (!html) return;
    el.innerHTML = html + '<div class="toolbar" style="margin-top:12px"><button type="button" id="btn-save-causal" class="btn primary">⬇ Сохранить разбор (HTML)</button></div>';
    el.classList.remove('hidden');
    var prev = $('causal-empty'); if (prev) prev.classList.add('hidden');
    var save = $('btn-save-causal');
    if (save) save.addEventListener('click', function(){
      var fname = 'кармический_разбор_' + safeName(state.personName || 'я') + '.html';
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a'); link.href = url; link.download = fname; document.body.appendChild(link); link.click();
      setTimeout(function(){ document.body.removeChild(link); URL.revokeObjectURL(url); }, 60);
    });
  }
  function onCausal(){ if (!state.chart){ alert('Сначала рассчитайте карту на вкладке «Кто я, мой путь».'); return; } renderCausal(); }

  // ---------- Синастрия по Сакойян-Эккер (отдельный западный модуль) ----------
  function onSakoyanSyn(){
    var a = readCompat('compat1'), b = readCompat('compat2');
    if (!a.p.y || !b.p.y) { alert('Заполните обе даты рождения.'); return; }
    var ca = Jyotish.computeChart(a.p), cb = Jyotish.computeChart(b.p);
    var el = $('sakoyan-syn-result');
    if (!el || typeof SakoyanSyn === 'undefined') { alert('Модуль синастрии недоступен.'); return; }
    var html = SakoyanSyn.forecast(ca, cb, a.name, b.name);
    if (!html) { alert('Не удалось построить синастрию — проверьте данные.'); return; }
    el.classList.remove('hidden');
    el.innerHTML = html + '<div class="toolbar" style="margin-top:12px"><button type="button" id="btn-save-saksyn" class="btn primary">⬇ Сохранить синастрию (HTML)</button></div>';
    var save = $('btn-save-saksyn');
    if (save) save.addEventListener('click', function(){
      var fname = 'синастрия_' + safeName(a.name||'1') + '_' + safeName(b.name||'2') + '.html';
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a'); link.href = url; link.download = fname; document.body.appendChild(link); link.click();
      setTimeout(function(){ document.body.removeChild(link); URL.revokeObjectURL(url); }, 60);
    });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderCompatStory(ca, cb, nameA, nameB){
    var box = $('compat-story');
    if (!box || typeof CompatStory === 'undefined') return;
    var data;
    try { data = CompatStory.analyze(ca, cb, nameA, nameB); } catch (e) { box.classList.add('hidden'); return; }
    function pCls(x){ return x < 3.5 ? 'lm-bad' : (x < 5 ? 'lm-hard' : (x < 6.5 ? 'lm-mid' : (x < 8 ? 'lm-good' : 'lm-great'))); }
    var rowsHtml = data.spheres.map(function (s, i) {
      var pct = Math.round(s.score * 10);
      var pros = s.pros.length ? s.pros : ['явных «само идущих» плюсов нет — эту сферу паре придётся строить осознанно'];
      var cons = s.cons.length ? s.cons : ['жёстких минусов по расчётам не видно'];
      var risksHtml = s.risks.length ? '<div class="cs-risks"><b>⚠️ Опасности и риски</b><ul>' + s.risks.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' : '';
      var factorsHtml = s.factors.map(function (f) {
        var cls = f.d > 0 ? 'plus' : (f.d < 0 ? 'minus' : 'zero');
        var dt = f.d === 0 ? '0' : ((f.d > 0 ? '+' : '') + f.d);
        return '<li><span class="lm-delta ' + cls + '">' + dt + '</span>' + esc(f.t) + '</li>';
      }).join('');
      var personalHtml = s.personal.map(function (p) {
        return '<div class="cs-p">' +
          '<span class="cs-p-name">👤 ' + esc(p.name) + '</span>' +
          '<span class="cs-p-bar"><span class="lm-fill ' + pCls(p.score) + '" style="width:' + Math.round(p.score * 10) + '%"></span></span>' +
          '<span class="cs-p-score">' + p.score + '</span>' +
          '<span class="cs-p-note">' + esc(p.note) + '</span>' +
        '</div>';
      }).join('');
      var needHtml = (s.need && s.need.length) ? '<div class="cs-need">' + s.need.map(function (n) {
        var weakHtml = (n.weak && n.weak.length) ? '<ul class="cs-need-weak">' + n.weak.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : '';
        return '<div class="cs-need-card">' +
          '<div class="cs-need-h">🎯 Какой партнёр нужен: ' + esc(n.person) + '</div>' +
          '<p><b>Что нужно от партнёра:</b> ' + esc(n.needText) + '. Нужный уровень партнёра: <b>' + n.level + '+ из 10</b>.</p>' +
          '<p><b>Идеальный вариант в этой сфере:</b></p>' +
          '<ul class="cs-need-ideal">' + n.ideal.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ul>' +
          '<p class="' + (n.enough ? 'cs-need-ok' : 'cs-need-gap') + '"><b>Чего не хватает (' + esc(n.target) + '):</b> ' + esc(n.summary) + '</p>' +
          weakHtml +
        '</div>';
      }).join('') + '</div>' : '';
      return '<div class="cs-row-wrap">' +
        '<div class="lm-row" data-cs="' + i + '" role="button" tabindex="0" aria-expanded="false">' +
          '<span class="lm-name">' + s.emoji + ' ' + esc(s.name) + '</span>' +
          '<span class="lm-bar"><span class="lm-fill ' + s.cls + '" style="width:' + pct + '%"></span></span>' +
          '<span class="lm-score">' + s.score + '</span>' +
          '<span class="lm-verdict ' + s.cls + '">' + esc(s.verdict) + '</span>' +
        '</div>' +
        '<div class="cs-detail" id="cs-detail-' + i + '" hidden>' +
          '<div class="cs-personal">' + personalHtml + '</div>' +
          '<div class="cs-story"><b>Вместе: ' + s.score + '/10 — ' + esc(s.verdict) + '</b><p>' + esc(s.story) + '</p></div>' +
          needHtml +
          '<div class="cs-cols">' +
            '<div class="cs-pros"><b>✅ Где будет легко (плюсы)</b><ul>' + pros.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
            '<div class="cs-cons"><b>⛔ Где сложности (минусы)</b><ul>' + cons.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
          '</div>' + risksHtml +
          '<div class="lm-action">✅ Что делать паре: ' + esc(s.action) + '</div>' +
          '<details class="fs-more"><summary>▸ Из чего сложился балл (расчётные факторы)</summary><ul>' + factorsHtml + '</ul></details>' +
        '</div>' +
      '</div>';
    }).join('');
    var introHtml = data.intro.map(function (p) { return '<p>' + p + '</p>'; }).join('');
    var html = '<div class="card story-card" id="compat-story-card">' +
      '<h2>📖 Рассказ о совместимости: ' + esc(nameA) + ' и ' + esc(nameB) + '</h2>' +
      introHtml +
      '<p><b>Классическая проверка: ' + data.kootaTotal + ' / 36.</b> А ниже — то же самое, разложенное по ' + data.spheres.length + ' сферам жизни пары: где «всё само», где «через усилие», а где лёгкости ждать не стоит.</p>' +
      '<div class="lm-rows">' + rowsHtml + '</div>' +
      '<div class="lm-total">' +
        '<div class="lm-total-score">' + data.total.score + '<small>/10</small></div>' +
        '<div class="lm-total-text">' +
          '<div class="lm-total-verdict">Общая совместимость пары</div>' +
          '<div>' + esc(data.total.verdict) + '</div>' +
          '<div class="lm-total-sub">💪 Опоры союза: ' + esc(data.total.strengths.join(' · ')) + '</div>' +
          '<div class="lm-total-sub">⚠️ Зоны риска: ' + esc(data.total.weak.join(' · ')) + '</div>' +
        '</div>' +
      '</div>' +
      '<p class="muted" style="margin-top:10px">Все оценки посчитаны по реальным положениям карт: Луны и накшатры, 8 кут, наложение домов, дружба управителей, мангала-доша, навамша. Это тенденции, а не приговор: низкие сферы — то, над чем паре стоит работать осознанно.</p>' +
    '</div>';
    box.innerHTML = html;
    box.classList.remove('hidden');
    // технические детали — спрятать в раскрывашку
    var det = document.createElement('details');
    det.className = 'fs-tech';
    var sum = document.createElement('summary');
    sum.textContent = '🔍 Технические детали: таблица 36 баллов, мангала-доша, наложение домов, навамша';
    det.appendChild(sum);
    det.appendChild($('compat-result'));
    det.appendChild($('synastry-result'));
    box.appendChild(det);
    $('compat-result').classList.remove('hidden');
    $('synastry-result').classList.remove('hidden');
    box.querySelectorAll('.lm-row').forEach(function (row) {
      function toggle(){
        var d = $('cs-detail-' + row.dataset.cs);
        var h = d.hidden;
        d.hidden = !h;
        row.setAttribute('aria-expanded', h ? 'true' : 'false');
      }
      row.addEventListener('click', toggle);
      row.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
    box.scrollIntoView({ behavior:'smooth' });
  }

  // ---------- Чат ----------
  function refreshChatStatus(){
    var cfg = Chat.getConfig();
    var provName = (Chat.PROVIDERS[cfg.provider] || {}).label || cfg.provider;
    var status = $('chat-status');
    if (!status) return;
    if (cfg.provider === 'local'){
      status.innerHTML = 'Провайдер: <b>' + esc(provName) + '</b> · работает офлайн, ключ не нужен ✓';
    } else if (!cfg.key){
      status.innerHTML = 'Провайдер: <b>' + esc(provName) + '</b> · ключ не введён. <a href="#" id="chat-go-settings">Перейти к настройкам ↑</a>';
    } else {
      status.innerHTML = 'Провайдер: <b>' + esc(provName) + '</b> · модель ' + esc(cfg.model) + ' · ключ введён ✓';
    }
    var link = $('chat-go-settings');
    if (link) link.addEventListener('click', function(e){
      e.preventDefault();
      document.querySelector('.tab[data-tab="chat"]').scrollIntoView({ behavior:'smooth' });
      $('s-key').focus();
    });
  }
  function initChat(){
    var cfg = Chat.getConfig();
    $('s-key').value = cfg.key;
    $('s-provider').value = cfg.provider;
    $('s-model').value = cfg.model;
    $('s-baseurl').value = cfg.baseUrl;
    updateProviderUI();
    refreshChatStatus();
    function updateProviderUI(){
      var prov = Chat.PROVIDERS[$('s-provider').value] || Chat.PROVIDERS.cloudflare;
      $('s-key-hint').textContent = prov.keyHint || '';
      var noKey = $('s-provider').value === 'gigachat' || $('s-provider').value === 'cloudflare' || $('s-provider').value === 'local';
      $('s-baseurl-wrap').style.display = ((prov.defaultBaseUrl || noKey || $('s-provider').value==='custom') && $('s-provider').value!=='local') ? '' : 'none';
      if ($('s-baseurl').value === '' ) $('s-baseurl').placeholder = noKey ? 'https://ваш-worker.workers.dev' : (prov.defaultBaseUrl || '');
      var help = {
        local: '<b>Встроенный астролог:</b> отвечает мгновенно и без интернета, опираясь на встроенную базу интерпретаций вашей карты (знаки, дома, накшатры, йоги, даши). Идеален для базовых вопросов. Хотите живой диалог с нейросетью — выберите провайдера ниже.',
        cloudflare: '<b>Cloudflare Workers AI (бесплатно, проще всего):</b> 1) зарегистрируйтесь на <a href="https://dash.cloudflare.com/" target="_blank">dash.cloudflare.com</a> (бесплатно); 2) Workers & Pages → Create → Create Worker → имя (например astro-ai) → Deploy; 3) Edit code → вставьте целиком код из файла <b>cloudflare-ai-worker.js</b> (в архиве); 4) добавьте привязку (binding) типа <b>AI</b> с именем <b>AI</b>; 5) Deploy; 6) в поле «Base URL» ниже вставьте адрес Worker (вида https://astro-ai.ваш-логин.workers.dev). Поле «API-ключ» оставьте пустым. Бесплатный лимит — 10 000 токенов/день, для личного чата достаточно.',
        gigachat: '<b>GigaChat (Сбер, бесплатно):</b> 1 млн токенов/мес бесплатно. 1) на <a href="https://developers.sber.ru/" target="_blank">developers.sber.ru</a> создайте проект GigaChat API и получите Client ID + Client Secret; 2) на <a href="https://dash.cloudflare.com/" target="_blank">dash.cloudflare.com</a> создайте бесплатный Worker и вставьте код из файла <b>gigachat-worker.js</b>, в настройках укажите GIGACHAT_CLIENT_ID и GIGACHAT_CLIENT_SECRET; 3) в поле «Base URL» вставьте адрес Worker. Ключ можно оставить пустым.',
        deepseek: '<b>DeepSeek:</b> зарегистрируйтесь на <a href="https://platform.deepseek.com/" target="_blank">platform.deepseek.com</a> → «API keys» → Create. Ключ вида <b>sk-...</b>. Модель <b>deepseek-chat</b>. ⚠️ Требует небольшой баланс (пополнение), не бесплатен.',
        gemini: '<b>Google Gemini:</b> ключ — на <a href="https://aistudio.google.com/" target="_blank">aistudio.google.com</a> → «Get API key». ⚠️ Недоступен в некоторых регионах (в т.ч. в РФ).',
        openrouter: '<b>OpenRouter:</b> зарегистрируйтесь на <a href="https://openrouter.ai/" target="_blank">openrouter.ai</a> → Keys → Create key. ⚠️ С 2026 года ограничен для РФ — может не выдавать ключ.',
        groq: '<b>Groq:</b> зарегистрируйтесь на <a href="https://console.groq.com/" target="_blank">console.groq.com</a> → API Keys → Create. ⚠️ Может быть ограничен для РФ.',
        custom: '<b>Свой сервис:</b> любой OpenAI-совместимый API. Укажите Base URL (например https://api.deepseek.com) и модель.'
      }[$('s-provider').value] || '';
      $('s-help').innerHTML = help;
    }
    $('s-provider').addEventListener('change', function(){
      var prov = Chat.PROVIDERS[this.value] || Chat.PROVIDERS.gemini;
      $('s-model').value = prov.defaultModel || '';
      $('s-baseurl').value = prov.defaultBaseUrl || '';
      updateProviderUI();
    });
    $('s-save').addEventListener('click', function(){
      Chat.setConfig($('s-key').value.trim(), $('s-model').value.trim(), $('s-provider').value, $('s-baseurl').value.trim());
      refreshChatStatus();
      $('s-status').textContent = 'Сохранено ✓';
      setTimeout(function(){ $('s-status').textContent=''; }, 2000);
    });
    function send(){
      var input = $('chat-msg');
      var text = input.value.trim();
      if (!text) return;
      if (!state.chart){ alert('Сначала рассчитайте карту на вкладке «Кто я, мой путь».'); return; }
      var cfg = Chat.getConfig();
      var noKey = cfg.provider === 'gigachat' || cfg.provider === 'cloudflare' || cfg.provider === 'local';
      if (!noKey && !cfg.key){ alert('Введите API-ключ в настройках выше.'); return; }
      if (noKey && !cfg.baseUrl && cfg.provider !== 'local'){ alert('Вставьте адрес вашего Cloudflare Worker в поле «Base URL».'); return; }
      input.value = '';
      addMsg('user', text);
      state.chatHistory.push({ role:'user', text:text });
      addMsg('model', '<span class="spinner"></span>', true);
      Chat.send(text, state.chatHistory.slice(0,-1), state.chart, state.personName).then(function(reply){
        replaceLastMsg(reply);
        state.chatHistory.push({ role:'model', text:reply });
      }).catch(function(err){
        var msg = err.message === 'NO_KEY' ? 'Нужен API-ключ (введите в настройках).' :
          (err.message === 'GIGACHAT_NO_URL' || err.message === 'CF_NO_URL' ? 'Нужно указать адрес вашего Cloudflare Worker в поле «Base URL» (см. подсказку при выборе провайдера).' :
          'Ошибка запроса: ' + err.message + '. Проверьте ключ, провайдера и модель в настройках.');
        // умная подсказка: ключ не того провайдера
        if (err.message.indexOf('googleapis') >= 0 || err.message.indexOf('API_KEY_INVALID') >= 0 || err.message.indexOf('API key not valid') >= 0){
          msg = 'Похоже, ключ не подходит к выбранному провайдеру: запрос ушёл в Google Gemini, а ключ — от другого сервиса. Откройте настройки выше и в поле «Провайдер» выберите <b>DeepSeek</b> (или тот сервис, от которого у вас ключ), затем снова нажмите «Сохранить».';
        } else if (err.message.indexOf('401') >= 0 || err.message.indexOf('Unauthorized') >= 0){
          msg = 'Ошибка авторизации — похоже, ключ неверный или не подходит к выбранному провайдеру. Проверьте, что в поле «Провайдер» выбран тот сервис, от которого у вас ключ, и ключ скопирован целиком (без пробелов).';
        }
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
    var story = (typeof CompatStory !== 'undefined') ? CompatStory.analyze(state.compat.chart1, state.compat.chart2, state.compat.meta1.name, state.compat.meta2.name) : null;
    var html = Report.buildCompatHTML(state.compat.chart1, state.compat.chart2, state.compat.meta1, state.compat.meta2, state.compat.koota, state.compat.synastry, story);
    var fname = 'совместимость_' + safeName((state.compat.meta1.name||'1')) + '_' + safeName((state.compat.meta2.name||'2')) + '.html';
    downloadFile(fname, html);
  }

  function renderDeepSynastry(ca, cb, name1, name2){
    var syn = Synastry.deepSynastry(ca, cb, name1, name2);
    if (state.compat) state.compat.synastry = syn;
    var el = $('synastry-result');
    el.classList.remove('hidden');
    var html = syn.sections.map(function(s){
      var body = s.items.map(function(it){
        // если пункт уже содержит блочные теги (h4, ul, div, p) — вставляем как есть
        var t = it.trim();
        if (/^<(h4|ul|div|p|table|li)\b/i.test(t)) return it;
        return '<p>' + it + '</p>';
      }).join('');
      return '<div class="card reading-section"><h3>'+esc(s.title)+'</h3>' + body + '</div>';
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
  var ACT_HOUSE = {general:1,business:10,marriage:7,property:4,travel:9,education:9,finance:2,health:6};
  function personalForDay(chart, activity, date){
    if (!chart || !chart.lagna) return {score:0, label:'карта не рассчитана', reasons:[]};
    var house=ACT_HOUSE[activity]||1, tr=Jyotish.transits(new Date(date.getFullYear(),date.getMonth(),date.getDate(),12)), li=chart.lagna.signIdx;
    function h(x){return (x-li+12)%12+1;} var j=h(tr.Jupiter.signIdx), sat=h(tr.Saturn.signIdx), score=0, reasons=[];
    if(j===house){score+=2;reasons.push('Юпитер поддерживает дом дела');} else if(((j-house+12)%12===4)||((house-j+12)%12===4)){score+=1;reasons.push('Юпитер даёт поддерживающий тригон');}
    if(sat===house){score-=2;reasons.push('Сатурн требует задержек и дисциплины');} else if(((sat-house+12)%12===6)){score-=1;reasons.push('Сатурн создаёт дополнительную нагрузку');}
    // Ежедневный личный слой: транзит Луны от натальной Луны (трин = поддержка, 6/8/12 = напряжение)
    if (chart.planets && chart.planets.Moon && tr.Moon){
      var mn = chart.planets.Moon.signIdx;
      var mh = (tr.Moon.signIdx - mn + 12) % 12 + 1;
      if ([1,5,9].indexOf(mh) >= 0){ score += 3; reasons.push('Луна в поддержке (трин к вашей Луне)'); }
      else if ([6,8,12].indexOf(mh) >= 0){ score -= 3; reasons.push('Луна в напряжении (6/8/12 от вашей Луны)'); }
      else { score += 1; }
    }
    return {score:score,label:score>=2?'🟢 лично подходит':(score<0?'🔴 требует осторожности':'🟡 нейтрально'),reasons:reasons};
  }

  function onMuhurta(){
    var lat = parseFloat($('m-lat').value), lon = parseFloat($('m-lon').value), tz = parseFloat($('m-tz').value);
    var count = parseInt(($('m-count') || {}).value, 10) || 3;
    var activity = $('m-activity').value;
    if (isNaN(lat) || isNaN(lon) || isNaN(tz)){ alert('Укажите широту, долготу и часовой пояс.'); return; }
    try {
      var p = Muhurta.panchangaNow(lat, lon, tz);
      $('m-panchanga-body').innerHTML = renderPanchanga(p, tz);
    } catch(e){ $('m-panchanga-body').innerHTML = '<span class="muted">Ошибка панчанги: ' + esc(e.message) + '</span>'; }

    var r = null;
    var personalMode = false;
    if (state.chart && state.chart.lagna){
      var picked = [];
      for (var off = 0; off < 400 && picked.length < count; off++){
        var day = Muhurta.dayAt(lat, lon, tz, activity, off, 30);
        if (!day || !day.windows.length) continue;
        day.offset = off;
        var pp = personalForDay(state.chart, activity, day.date);
        if (pp.score >= 2){ day.personal = pp; picked.push(day); }
      }
      if (picked.length){
        r = { activity: (Muhurta.ACTIVITIES[activity] || Muhurta.ACTIVITIES.general).label, days: picked };
        personalMode = true;
      }
    }
    if (!r) r = Muhurta.findNextMuhurta(lat, lon, tz, activity, count, 400, 30);
    var el = $('m-result');
    el.classList.remove('hidden');
    var daysHtml = r.days.map(function(d){
      var winHtml;
      if (d.windows.length){
        var bestScore = -99, bestIdx = 0;
        d.windows.forEach(function(w, i){ if (w.score > bestScore){ bestScore = w.score; bestIdx = i; } });
        winHtml = d.windows.map(function(w, wi){
          return '<div class="win' + (wi === bestIdx ? ' best' : '') + '">' + (wi === bestIdx ? '<span class="best-tag">лучшее окно</span>' : '') + '<b>' + fmtLocal(w.start, tz) + ' – ' + fmtLocal(w.end, tz) + '</b>' +
            '<span class="muted"> · ' + esc(w.tithi) + ' · ' + esc(w.nak) + ' · балл ' + w.score + '</span></div>';
        }).join('');
      } else {
        winHtml = '<div class="muted">В этот день благоприятных окон не найдено.</div>';
      }
      var pd = d.personal || personalForDay(state.chart, activity, d.date);
      var badge = '<span class="pw-badge">' + esc(pd.label) + '</span>';
      var why = pd.reasons.length ? '<div class="muted pw-reasons">' + esc(pd.reasons.join('; ')) + '</div>' : '';
      var clarify = pd.score < 0 ? '<div class="muted pw-clarify">🔴 — личная пометка по вашей карте: общий календарь (окна выше) благоприятен, но транзит Сатурна/Юпитера даёт напряжённый фон. Если дело можно перенести — выберите дату с 🟢.</div>' : '';
      var offBadge = '<span class="in-days">' + (d.offset === 0 ? 'сегодня' : 'через ' + d.offset + ' дн') + '</span>';
      return '<div class="daycard' + (d.offset === 0 ? ' today' : '') + '"><div class="dayhead"><b>' + fmtLocalDay(d.date, tz) + '</b> ' + offBadge + ' ' + badge + why + clarify + ' <span class="muted">' + esc(d.varaName) + ' · ' + esc(d.tithi) + ' · ' + esc(d.nakshatra) + '</span></div>' + winHtml + '</div>';
    }).join('');
    var personal = r.days.map(function(d){return {d:d,p:personalForDay(state.chart,activity,d.date)};}).filter(function(x){return x.p.score>=2;});
    var personalText = state.chart ? '<div class="pw-summary"><b>Личная проверка по вашей карте:</b> транзитная Луна (ежедневно), Юпитер и Сатурн относительно домов дела. ' + (personalMode ? 'В списке только дни с зелёной меткой.' : 'Зелёных дней с окнами в горизонте 400 дней не нашлось, показан общий календарь.') + '</div>' : '<div class="pw-summary">Рассчитайте натальную карту, чтобы видеть только ваши личные благоприятные даты.</div>';
    el.innerHTML = '<div class="card"><h2>Ближайшие благоприятные даты: ' + esc(r.activity) + '</h2>' + personalText +
      '<p class="muted pw-legend">' + (personalMode ? 'Показаны ближайшие даты с окнами, которые лично для вас 🟢 (Луна, Юпитер и Сатурн к вашей карте). ' : (state.chart && state.chart.lagna ? 'За 400 дней лично-зелёных дат с окнами не нашлось — показан общий календарь. ' : 'Рассчитайте натальную карту — и список станет личным (только ваши 🟢 даты). Пока показан общий календарь. ')) + 'Метки у дат — личная проверка по вашей карте: 🟢 день подходит и общему календарю, и карте; 🟡 нейтрально; 🔴 общий календарь благоприятен, но по вашей карте день напряжён (Сатурн/Юпитер) — берите лучшее окно с запасом прочности или выберите зелёную дату.</p>' + daysHtml +
      '<p class="muted" style="margin-top:10px">Показаны ближайшие благоприятные даты (до ' + count + ' шт., горизонт поиска — до 400 дней). Поиск от восхода до захода с шагом 30 минут. Исключены Раху-кала, Ямаганда и Гулика. Порог «благоприятно» — хорошие титхи + день недели + накшатра.</p></div>';
    el.scrollIntoView({ behavior:'smooth' });
  }

  // ---------- Тёмная тема ----------
  function initTheme(){
    var key = 'jy_theme';
    var saved = ''; try { saved = localStorage.getItem(key) || ''; } catch(e) {}
    var dark = saved === 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var btn = $('theme-toggle');
    if (!btn) return;
    function paint(){ btn.textContent = dark ? '☀️ Светлая тема' : '🌙 Тёмная тема'; btn.setAttribute('aria-pressed', dark ? 'true' : 'false'); }
    paint();
    btn.addEventListener('click', function(){
      dark = !dark; document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      try { localStorage.setItem(key, dark ? 'dark' : 'light'); } catch(e) {}
      paint();
    });
  }

  // ---------- init ----------
  document.addEventListener('DOMContentLoaded', function(){
    initTheme();
    initTabs();
    initCity();
    initChat();
    $('natal-form').addEventListener('submit', onNatalSubmit);
    $('compat-btn').addEventListener('click', onCompat);
    if ($('btn-sakoyan-syn')) $('btn-sakoyan-syn').addEventListener('click', onSakoyanSyn);
    if ($('btn-causal')) $('btn-causal').addEventListener('click', onCausal);
    if ($('btn-natal-sak')) $('btn-natal-sak').addEventListener('click', onNatalSak);
    if ($('btn-prof')) $('btn-prof').addEventListener('click', onProf);
    if ($('btn-ask')) $('btn-ask').addEventListener('click', onAsk);
    var ai = $('ask-input'); if (ai) ai.addEventListener('keydown', function(e){ if (e.key==='Enter'){ e.preventDefault(); onAsk(); } });
    $('btn-print').addEventListener('click', onPrint);
    $('btn-save').addEventListener('click', onSave);
    $('m-go').addEventListener('click', onMuhurta);
    // сохранённые карты
    refreshSavedSelects();
    $('btn-save-chart').addEventListener('click', onSaveChart);
    $('btn-export-charts').addEventListener('click', onExportCharts);
    $('btn-import-charts').addEventListener('click', function(){ $('charts-file').click(); });
    $('charts-file').addEventListener('change', onImportCharts);
    $('f-saved').addEventListener('change', onSavedChange);
    $('f-saved-del').addEventListener('click', onDeleteSaved);
    document.querySelectorAll('.c-saved').forEach(function(cs){ cs.addEventListener('change', onCompatSavedChange); });
    if ($('rank-btn')) $('rank-btn').addEventListener('click', onRankPartners);
  });
})();
