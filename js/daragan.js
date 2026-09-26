/* daragan.js — «Прогноз по Дарагану» (методика К. Дарагана, курс «Астрологическое прогнозирование»).
   Реализует его общий алгоритм прогноза:
     1) выделяем сигнификатор темы (дом + планеты в доме + управитель + тематический сигнификатор);
     2) строим таблицу «методы прогноза × даты»: транзиты, прогрессии, дирекции, соляр;
     3) выписываем то, что касается сигнификатора;
     4) выделяем важные годы;
     5) формулируем текст прогноза.
   ВАЖНО: методика Дарагана строится в ТРОПИЧЕСКОМ зодиаке (так в его курсе), поэтому модуль
   считает отдельно от сидерического ядра Jyotish — и не трогает его.
   UMD + защита от двойного подключения. Безопасно: при ошибке возвращает ''.
   Экспорт: Daragan.forecast(chart, themeKey) -> HTML. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(root || {}); }
  else { root.Daragan = factory(root); }
})(typeof self !== 'undefined' ? self : this, function (root) {
  if (root.Daragan) return root.Daragan;

  var A = root.Astronomy;
  if (!A && typeof require === 'function') { try { A = require('./astronomy.min.js'); } catch (e) {} }
  if (!A) return { forecast: function () { return ''; } };

  // --- константы ---
  var SIGNS = ['Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы'];
  var SIGN_LORD_TROP = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
  var PLANET_RU = { Sun:'Солнце', Moon:'Луна', Mercury:'Меркурий', Venus:'Венера', Mars:'Марс', Jupiter:'Юпитер', Saturn:'Сатурн', Uranus:'Уран', Neptune:'Нептун', Pluto:'Плутон' };
  var BODY = { Sun:A.Body.Sun, Moon:A.Body.Moon, Mercury:A.Body.Mercury, Venus:A.Body.Venus, Mars:A.Body.Mars, Jupiter:A.Body.Jupiter, Saturn:A.Body.Saturn, Uranus:A.Body.Uranus, Neptune:A.Body.Neptune, Pluto:A.Body.Pluto };
  var HOUSE_T = {
    1:'личность, самопроявление, инициатива',2:'деньги и ценности',3:'общение, встречи, навыки',
    4:'дом, семья, недвижимость',5:'творчество, дети, любовь',6:'работа и здоровье',
    7:'партнёрство и брак',8:'трансформации и общие ресурсы',9:'учёба, дороги, наставники',
    10:'карьера и статус',11:'доход и сообщество',12:'уединение и завершение'
  };
  var THEME = {
    love:    { house:7,  sig:['Venus'],      label:'Любовь, отношения, брак' },
    children:{ house:5,  sig:['Jupiter','Sun'],label:'Дети, творчество' },
    realty:  { house:4,  sig:['Moon','Saturn'],label:'Недвижимость, дом, переезд' },
    money:   { house:2,  sig:['Jupiter','Venus'],label:'Деньги, доход' },
    career:  { house:10, sig:['Saturn','Mercury'],label:'Карьера, работа, статус' },
    travel:  { house:9,  sig:['Jupiter'],    label:'Поездки, учёба, дальние дороги' },
    health:  { house:6,  sig:['Mars','Saturn'],label:'Здоровье, работа, преодоление' },
    social:  { house:3,  sig:['Mercury'],    label:'Встречи, переговоры, общение' },
    general: { house:1,  sig:['Sun'],        label:'Важное дело, самореализация' }
  };
  // орбисы транзитных соединений (из курса Дарагана)
  var T_ORB = { Sun:6, Moon:6, Mercury:4.5, Venus:4.5, Mars:3.5, Jupiter:2.5, Saturn:2.5, Uranus:0.8, Neptune:0.8, Pluto:0.8 };
  // орбисы прогрессий
  var P_ORB = { Sun:1.2, Moon:2, Mercury:1, Venus:1, Mars:0.5, Jupiter:0.4, Saturn:0.4, Uranus:0.3, Neptune:0.3, Pluto:0.3 };

  // --- астрономические помощники ---
  function norm360(x){ x = x % 360; if (x < 0) x += 360; return x; }
  function rad(d){ return d * Math.PI / 180; }
  function deg(r){ return r * 180 / Math.PI; }
  function obliquity(jd){ var T=(jd-2451545)/36525; return 23.439291111 - 0.0130041667*T - 1.638e-7*T*T + 5.036e-7*T*T*T; }
  function jdFrom(dt){ return dt.getTime()/86400000 + 2440587.5; }
  function tropLon(body, dt){
    var t = A.MakeTime(dt);
    if (body === A.Body.Moon) return A.EclipticGeoMoon(t).lon;
    return A.Ecliptic(A.GeoVector(body, t, true)).elon;
  }
  function ascTrop(lat, lon, dt){
    var t = A.MakeTime(dt), jd = jdFrom(dt);
    var gmst = A.SiderealTime(t) * 15; var lst = gmst + lon;
    var eps = rad(obliquity(jd)), phi = rad(lat), ramc = rad(lst);
    var l0 = Math.atan2(-Math.cos(ramc), Math.sin(ramc)*Math.cos(eps) + Math.tan(phi)*Math.sin(eps));
    var c = [norm360(deg(l0)), norm360(deg(l0)+180)];
    function sinH(lam){ var r=rad(lam); var ra=Math.atan2(Math.sin(r)*Math.cos(eps),Math.cos(r)); return Math.sin(ramc-ra); }
    return sinH(c[0]) < 0 ? c[0] : c[1];
  }
  function mcTrop(lon, dt){ // МС — пересечение эклиптики с меридианом (звёздное время)
    var t = A.MakeTime(dt); var gmst = A.SiderealTime(t) * 15;
    return norm360(gmst + lon); }
  function aspectOf(a, b){
    var d = Math.abs((a - b) % 360); if (d > 180) d = 360 - d;
    var targets = [ [0,'соединение'], [60,'секстиль'], [90,'квадрат'], [120,'трин'], [180,'оппозиция'] ];
    var best = null, bd = 999;
    for (var i = 0; i < targets.length; i++) {
      var o = Math.abs(d - targets[i][0]);
      if (o < bd) { bd = o; best = targets[i]; }
    }
    return { aspect: best[1], target: best[0], orb: d - best[0], orbAbs: Math.abs(d - best[0]) };
  }
  function signLon(lon){ return Math.floor(norm360(lon) / 30); }
  function houseFromAsc(asc, lon){ return Math.floor(norm360(lon - asc) / 30) + 1; }
  function year(dt){ return dt.getFullYear(); }
  function fmtYear(dt){ return String(dt.getFullYear()); }
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function monthRu(m){ return ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'][m]; }
  function nice(dt){ return dt.getDate() + ' ' + monthRu(dt.getMonth()); }

  // --- натальная (тропическая) карта для методики ---
  function natalTrop(chart){
    var birth = new Date(chart.utc);
    var lat = chart.lat, lon = chart.lon;
    var asc = ascTrop(lat, lon, birth);
    var mc = mcTrop(lon, birth);
    var planets = {}, houses = {};
    for (var k in BODY) {
      var tl = tropLon(BODY[k], birth);
      planets[k] = tl;
      houses[k] = houseFromAsc(asc, tl);
    }
    return { asc: asc, mc: mc, lat: lat, lon: lon, birth: birth, planets: planets, houses: houses };
  }

  // сигнификаторы темы: планеты в доме + управитель дома + тематические
  function significators(themeKey, nat){
    var s = THEME[themeKey] || THEME.general;
    var house = s.house, li = signLon(nat.asc);
    var lord = SIGN_LORD_TROP[(li + house - 1) % 12];
    var sig = {}, order = [];
    function add(k){ if (!sig[k]) { sig[k] = 1; order.push(k); } }
    add(lord);
    for (var k in nat.planets) if (nat.houses[k] === house) add(k);
    for (var j = 0; j < s.sig.length; j++) add(s.sig[j]);
    var inHouse = [];
    for (var k2 in nat.planets) if (nat.houses[k2] === house) inHouse.push(k2);
    return { keys: order, house: house, inHouse: inHouse, lord: lord, theme: s };
  }

  // --- Транзиты (реальные движения) ---
  function transitEvents(nat, sig, now){
    var slow = ['Pluto','Neptune','Uranus','Saturn','Jupiter','Mars'];
    var out = [];
    // текущий снимок
    for (var i = 0; i < slow.length; i++) {
      var p = slow[i];
      var plc = tropLon(BODY[p], now);
      for (var j = 0; j < sig.keys.length; j++) {
        var sp = sig.keys[j];
        var a = aspectOf(plc, nat.planets[sp]);
        var orb = (T_ORB[p] || 1);
        if (a.aspect === 'соединение' && a.orbAbs <= orb) {
          out.push({ date: now, planet: p, target: sp, aspect: a.aspect, orb: a.orbAbs, by: a.orbAbs.toFixed(1) });
        }
      }
    }
    // ближайшие крупные соединения медленных планет с сигнификатором (горизонт 2 года)
    // детектируем вхождение в точку (переход через 0 орб)
    var horizon = 2 * 365.25 * 86400000;
    var d = new Date(now.getTime() + 3 * 86400000);
    var step = 5 * 86400000;
    var prev = {};
    slow.forEach(function (p) { prev[p] = null; });
    while (d.getTime() < now.getTime() + horizon) {
      for (var jj = 0; jj < slow.length; jj++) {
        var pp = slow[jj];
        var pl = tropLon(BODY[pp], d);
        for (var k = 0; k < sig.keys.length; k++) {
          var tg = sig.keys[k], natL = nat.planets[tg];
          var diff = norm360(pl - natL); if (diff > 180) diff -= 360; // -180..180
          var thisIs = Math.abs(diff);
          var key = pp + '_' + tg;
          var was = prev[key]; prev[key] = thisIs;
          if (was !== null && was > orbCode(pp) && thisIs <= orbCode(pp) && was !== null && thisIs < was) {
            out.push({ date: new Date(d.getTime()), planet: pp, target: tg, aspect: 'соединение', orb: thisIs, by: thisIs.toFixed(1) });
          }
        }
      }
      d = new Date(d.getTime() + step);
    }
    function orbCode(p){ return (T_ORB[p] || 1); }
    // дедуп по планетам: берём первое вхождение каждого
    var seen = {}, res = [];
    out.sort(function (x, y) { return x.date - y.date; });
    for (var m = 0; m < out.length; m++) {
      var e = out[m], kk = e.planet + '_' + e.target + '_' + e.aspect;
      if (!seen[kk]) { seen[kk] = 1; res.push(e); }
    }
    return res;
  }

  // --- Прогрессии (день за год) ---
  function progressionEvents(nat, sig, now){
    var ageYr = (now.getTime() - nat.birth.getTime()) / (365.25 * 86400000);
    var progDate = new Date(nat.birth.getTime() + ageYr * 86400000);
    var out = [];
    var keys = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
    for (var i = 0; i < keys.length; i++) {
      var p = keys[i];
      var plp = tropLon(BODY[p], progDate);
      var orb = (P_ORB[p] || 0.5);
      for (var j = 0; j < sig.keys.length; j++) {
        var sp = sig.keys[j];
        var a = aspectOf(plp, nat.planets[sp]);
        if ((a.aspect === 'соединение' || a.aspect === 'оппозиция' || a.aspect === 'квадрат' || a.aspect === 'трин') && a.orbAbs <= orb) {
          out.push({ planet: p, target: sp, aspect: a.aspect, orb: a.orbAbs, year: now.getFullYear() });
        }
      }
      // ингрессия в знак относительно натального знака планеты
      var signP = signLon(plp), signNat = signLon(nat.planets[p]);
      if (signP !== signNat) out.push({ planet: p, ingression: SIGNS[signP], year: now.getFullYear() });
    }
    // дедуп (одинаковые планет-аспект)
    var seen = {}, res = [];
    for (var m = 0; m < out.length; m++) {
      var e = out[m], k = e.planet + '_' + (e.ingression || e.aspect);
      if (!seen[k]) { seen[k] = 1; res.push(e); }
    }
    return res;
  }

  // --- Дирекции (градус за год) ---
  function directionEvents(nat, sig, now){
    var ageYr = (now.getTime() - nat.birth.getTime()) / (365.25 * 86400000);
    var out = [];
    var dirs = [ ['Asc', nat.asc], ['MC', nat.mc], ['Sun', nat.planets.Sun], ['Moon', nat.planets.Moon] ];
    // дирекционная точка = натальная + возраст (1° = 1 год)
    for (var i = 0; i < dirs.length; i++) {
      var dName = dirs[i][0], dVal = norm360(dirs[i][1] + ageYr);
      for (var j = 0; j < sig.keys.length; j++) {
        var sp = sig.keys[j];
        var a = aspectOf(dVal, nat.planets[sp]);
        // 1° = 1 год; орбис градус
        if (a.aspect === 'соединение' && a.orbAbs <= 1) {
          out.push({ from: dName, target: sp, aspect: a.aspect, orb: a.orbAbs, year: now.getFullYear() + Math.round(a.orbAbs) - Math.round(a.orbAbs) });
          out[out.length-1].year = now.getFullYear() + Math.round(-a.orb); // приблизительный сдвиг
        }
      }
    }
    // направленный Асц/МС в домах радикса
    var dAsc = norm360(nat.asc + ageYr), dMc = norm360(nat.mc + ageYr);
    out.push({ angle:'Асц', house: houseFromAsc(nat.asc, dAsc), year: now.getFullYear() });
    out.push({ angle:'МС',  house: houseFromAsc(nat.asc, dMc), year: now.getFullYear() });
    return out;
  }

  // --- Соляр (обращение Солнца) ---
  function solarReturn(nat, sig, now){
    // найти ближайший момент, когда троп. Солнце вернётся в натальную долготу
    var step = 2 * 86400000;
    var d = new Date(now.getTime());
    var target = nat.planets.Sun;
    var prev = tropLon(BODY.Sun, d);
    var sr = null;
    for (var i = 0; i < 400; i++) {
      d = new Date(d.getTime() + step);
      var cur = tropLon(BODY.Sun, d);
      var dv = norm360(cur - target); if (dv > 180) dv -= 360;
      if (Math.abs(dv) < 0.2 && dv <= 0) { sr = new Date(d.getTime()); break; }
      prev = cur;
    }
    if (!sr) return null;
    var asc = ascTrop(nat.lat, nat.lon, sr);
    var saHouse = houseFromAsc(nat.asc, asc);
    var mc = mcTrop(nat.lon, sr);
    var mcHouse = houseFromAsc(nat.asc, mc);
    // значимые солярные планеты в домах радикса / близкие аспекты к сигнификаторам
    var hits = [];
    var keys = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
    for (var j = 0; j < keys.length; j++) {
      var p = keys[j], pl = tropLon(BODY[p], sr);
      var h = houseFromAsc(nat.asc, pl);
      for (var k = 0; k < sig.keys.length; k++) {
        var a = aspectOf(pl, nat.planets[sig.keys[k]]);
        if (a.aspect === 'соединение' && a.orbAbs <= 2.5) hits.push({ planet: p, target: sig.keys[k], aspect: a.aspect, orb: a.orbAbs });
      }
    }
    return { date: sr, asc: asc, mc: mc, ascHouse: saHouse, mcHouse: mcHouse, hits: hits.slice(0, 4) };
  }

  // --- чтение транзита: природа(психология) - дом(события) - управление(причины) ---
  var NATURE = {
    Sun:'это время личной цели и видимости', Moon:'это время эмоций, дома и адаптации', Mercury:'это время ума, контактов и сделок',
    Venus:'это время любви, денег и красоты', Mars:'это время действия и энергии', Jupiter:'это время роста и возможностей',
    Saturn:'это время зрелости, структуры и задержек', Uranus:'это время перемен и неожиданностей', Neptune:'это время иллюзий и мечты', Pluto:'это время трансформации и глубоких перемен'
  };
  var TARGET_RU = {
    Sun:'Солнце', Moon:'Луна', Mercury:'Меркурий', Venus:'Венера', Mars:'Марс', Jupiter:'Юпитер', Saturn:'Сатурн', Uranus:'Уран', Neptune:'Нептун', Pluto:'Плутон'
  };
  // дательный падеж: «к Меркурию», «к Венере»
  var DAT = {
    Sun:'Солнцу', Moon:'Луне', Mercury:'Меркурию', Venus:'Венере', Mars:'Марсу', Jupiter:'Юпитеру', Saturn:'Сатурну', Uranus:'Урану', Neptune:'Нептуну', Pluto:'Плутону'
  };
  var DIR_NAME = { Asc:'Асц', MC:'МС', Sun:'Солнце', Moon:'Луна' };

  // --- Главная функция ---
  function forecast(chart, themeKey){
    if (!chart || !chart.utc || !chart.lat) return '';
    try {
      var theme = themeKey || 'general';
      var nat = natalTrop(chart);
      var sig = significators(theme, nat);
      var now = new Date();

      var transit = transitEvents(nat, sig, now);
      var prog = progressionEvents(nat, sig, now);
      var dir = directionEvents(nat, sig, now);
      var sr = solarReturn(nat, sig, now);

      var LB = 'Прогноз по методу Константина Дарагана';
      var h = '<div class="card story-card daragan-card">';
      h += '<h2>🔮 ' + LB + '</h2>';
      h += '<p class="muted" style="margin-top:0">Тропический зодиак · методика «Астрологическое прогнозирование» (транзиты, прогрессии, дирекции, соляр). Отдельный модуль, не заменяет ваш основной расчёт.</p>';

      // 1) сигнификатор темы
      var th = sig.theme;
      h += '<h3>🎯 Тема и сигнификаторы: ' + esc(th.label) + '</h3>';
      h += '<p>Тема связана с вашим <b>' + sig.house + '-м домом</b> («' + HOUSE_T[sig.house] + '»). Сигнификаторы: ' +
        sig.keys.map(function (k) { return '<b>' + TARGET_RU[k] + '</b>'; }).join(', ') + '.' +
        (sig.inHouse.length ? ' В этом доме стоят: ' + sig.inHouse.map(function (k) { return TARGET_RU[k]; }).join(', ') + '.' : '') +
        ' Управитель дома — <b>' + TARGET_RU[sig.lord] + '</b>.</p>';

      // 2) таблица методов × важное
      h += '<h3>🗂️ Что сейчас касается сигнификатора</h3>';
      function listMethod(title, items, render){
        h += '<details class="daragan-m" ' + (items.length ? 'open' : '') + '><summary>' + title + '</summary>';
        if (items.length) h += '<ul class="fs-month">' + items.map(render).join('') + '</ul>';
        else h += '<p class="muted">Явных наводок нет — тема идёт фоном.</p>';
        h += '</details>';
      }
      // транзиты
      listMethod('🌍 Транзиты (реальное движение)', transit, function (e) {
        return '<li><b>' + nice(e.date) + ' ' + e.date.getFullYear() + '</b> — ' + TARGET_RU[e.planet] + ' ' + e.aspect +
          ' к ' + (DAT[e.target] || TARGET_RU[e.target]) + ' (орб ' + e.by + '°). ' + NATURE[e.planet] + '.</li>';
      });
      // прогрессии
      listMethod('📈 Прогрессии (день за год)', prog, function (e) {
        if (e.ingression) return '<li>Прогрессивный <b>' + TARGET_RU[e.planet] + '</b> вошёл в знак ' + esc(e.ingression) + ' — смена фона темы.</li>';
        return '<li><b>' + TARGET_RU[e.planet] + '</b> ' + e.aspect + ' к ' + (DAT[e.target] || TARGET_RU[e.target]) + ' (орб ' + e.orb.toFixed(1) + '°). ' + NATURE[e.planet] + '.</li>';
      });
      // дирекции
      listMethod('🧭 Дирекции (градус за год)', dir, function (e) {
        if (e.angle) return '<li>Дирекционный <b>' + e.angle + '</b> перешёл в ' + e.house + '-й дом радикса («' + HOUSE_T[e.house] + '»).</li>';
        return '<li>Дирекционный <b>' + (DIR_NAME[e.from] || e.from) + '</b> — соединение с ' + TARGET_RU[e.target] + ' (орб ' + e.orb.toFixed(1) + '°).</li>';
      });
      // соляр
      if (sr) {
        h += '<details class="daragan-m" open><summary>☀️ Соляр (обращение Солнца)</summary>' +
          '<ul class="fs-month">' +
          '<li>Ближайший соляр — <b>' + nice(sr.date) + ' ' + sr.date.getFullYear() + '</b>.</li>' +
          '<li>Асц соляра попадает в ваш <b>' + sr.ascHouse + '-й дом</b> («' + HOUSE_T[sr.ascHouse] + '»), МС — в ' + sr.mcHouse + '-й.</li>' +
          (sr.hits.length ? '<li>В соляре соединения с сигнификаторами: ' + sr.hits.map(function (x) { return TARGET_RU[x.planet] + '—' + TARGET_RU[x.target]; }).join(', ') + '.</li>' : '<li>В соляре близких соединений к сигнификаторам не видно.</li>') +
          '</ul></details>';
      } else {
        h += '<p class="muted">Соляр не удалось рассчитать.</p>';
      }

      // 3) важные годы
      var years = {};
      function bump(y, what){ if (!years[y]) years[y] = []; years[y].push(what); }
      var big = [];
      transit.forEach(function (e, idx) { bump(e.date.getFullYear(), 'транзит ' + TARGET_RU[e.planet] + '—' + TARGET_RU[e.target]); });
      prog.forEach(function (e) { bump(e.year, 'прогрессия ' + (e.ingression ? TARGET_RU[e.planet] + ' знак ' + e.ingression : TARGET_RU[e.planet] + '—' + TARGET_RU[e.target])); });
      dir.forEach(function (e) { bump(e.year, 'дирекция ' + (e.angle || TARGET_RU[e.from])); });
      // важные годы: сортируем по количеству наводок, но показываем в хронологическом порядке
      var ranked = Object.keys(years).map(function (y) { return { y: y, n: years[y].length }; })
        .sort(function (a, b) { return b.n - a.n; }).slice(0, 6)
        .sort(function (a, b) { return Number(a.y) - Number(b.y); });
      var top = ranked.map(function (r) { return r.y; });
      h += '<h3>⭐ Акцентные годы</h3>';
      if (top.length) {
        h += '<ul class="fs-month">' + top.map(function (y) {
          return '<li><b>' + y + '</b> — ' + years[y].join('; ') + '.</li>';
        }).join('') + '</ul>';
      } else { h += '<p class="muted">Явных акцентных лет в ближайшем поле не видно.</p>'; }

      // 4) текст прогноза
      h += '<h3>📖 Что это значит простыми словами</h3><div class="daragan-narr"><p>';
      if (transit.length) {
        var t0 = transit[0];
        h += 'Сейчас на тему «' + esc(th.label) + '» указывает <b>' + TARGET_RU[t0.planet] + '</b> — ' + NATURE[t0.planet] +
          ' — на фоне вашего ' + sig.house + '-го дома. ' +
          (sig.inHouse.length ? 'В самом доме стоят ' + sig.inHouse.map(function (k) { return TARGET_RU[k]; }).join(', ') + ' — сфера уже «заряжена», и транзит к ней работает сильнее. ' : '') +
          'Это повод не форсировать, а идти по теме постепенно и осознанно: транзитная планета — причина, ваш натал — следствие. Читаем по цепочке: сначала психология планеты, потом дом (события), затем управление домами (причины).';
      } else {
        h += 'В ближайшее время значимых транзитов к сигнификаторам темы «' + esc(th.label) + '» нет — сфера идёт фоном, лучше заниматься ею по мере обстоятельств, а не форсировать.';
      }
      h += '</p><p>';
      h += 'Прогрессии и дирекции — «медленные» индикаторы тренда; соляр задаёт тон года. ' +
        'Совпадение хотя бы двух методов в одном году — самый веский аргумент: именно те годы выделены выше как акцентные.';
      h += '</p></div>';

      h += '<p class="muted" style="margin-top:8px">Метод построен на вашей карте в тропическом зодиаке по методике Дарагана (сигнификатор → 4 метода → важные годы). Это окна возможностей и фокус, а не гарантия события.</p>';
      h += '</div>';
      return h;
    } catch (e) {
      return '';
    }
  }

  // --- Посуточный слой методики (для календаря) ---
  var BEN = ['Jupiter', 'Venus', 'Sun', 'Moon'];
  var MAL = ['Saturn', 'Mars', 'Pluto'];
  function natureOf(p){ return BEN.indexOf(p) >= 0 ? 1 : (MAL.indexOf(p) >= 0 ? -1 : 0); }
  function aspWeight(aspect, nature){
    // соединение/трин/секстиль — поддержка, квадрат/оппозиция — напряжение
    var soft = (aspect === 'соединение' || aspect === 'трин' || aspect === 'секстиль');
    if (nature === 0) return 0;
    if (soft) return nature > 0 ? (aspect === 'соединение' ? 2 : 1) : (aspect === 'соединение' ? -2 : -1);
    return nature > 0 ? -1 : -2;
  }
  var PHASES = ['новолуние', 'растущий серп', 'первая четверть', 'растущая Луна', 'полнолуние', 'убывающая Луна', 'последняя четверть', 'убывающий серп'];
  function moonPhaseName(sunLon, moonLon){
    var e = norm360(moonLon - sunLon);
    return PHASES[Math.floor(((e + 22.5) % 360) / 45)];
  }

  /* Оценка темы на дату: транзиты (орбисы курса) + прогрессии + дирекции. */
  function dailyTheme(nat, themeKey, date){
    var sig = significators(themeKey, nat);
    var score = 0, reasons = [], warns = [];
    var P = ['Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
    var i, j, sp, a;
    // транзиты медленных планет (как в транзитной части методики)
    for (i = 0; i < P.length; i++){
      var pl = tropLon(BODY[P[i]], date);
      var orb = T_ORB[P[i]] || 1;
      for (j = 0; j < sig.keys.length; j++){
        sp = sig.keys[j];
        a = aspectOf(pl, nat.planets[sp]);
        if (a.orbAbs <= orb){
          var w = aspWeight(a.aspect, natureOf(P[i]));
          if (a.orbAbs > orb * 0.5 && w){ w = w > 0 ? Math.max(1, w - 1) : Math.min(-1, w + 1); }
          if (w){
            score += w;
            var txt = PLANET_RU[P[i]] + ' ' + a.aspect + ' ' + PLANET_RU[sp] + ' (орб ' + a.orbAbs.toFixed(1) + '°)';
            if (w > 0) reasons.push(txt); else warns.push(txt);
            if (natureOf(P[i]) < 0 && a.aspect === 'соединение' && a.orbAbs <= 0.5){
              warns.push('точное соединение ' + PLANET_RU[P[i]] + ' с сигнификатором темы');
            }
          }
        }
      }
    }
    // быстрый триггер: транзитная Луна к сигнификаторам (малый орбис)
    var ml = tropLon(BODY.Moon, date);
    for (j = 0; j < sig.keys.length; j++){
      sp = sig.keys[j];
      a = aspectOf(ml, nat.planets[sp]);
      if (a.orbAbs <= 2){
        var wm = (a.aspect === 'соединение' || a.aspect === 'трин' || a.aspect === 'секстиль') ? 1 : -1;
        score += wm;
        var tm = 'Луна ' + a.aspect + ' ' + PLANET_RU[sp] + ' (триггер дня)';
        if (wm > 0) reasons.push(tm); else warns.push(tm);
      }
    }
    // прогрессии (день за год)
    var ageYr = (date.getTime() - nat.birth.getTime()) / (365.25 * 86400000);
    var progDate = new Date(nat.birth.getTime() + ageYr * 86400000);
    for (i = 0; i < P.length; i++){
      var plp = tropLon(BODY[P[i]], progDate);
      var porb = P_ORB[P[i]] || 0.5;
      for (j = 0; j < sig.keys.length; j++){
        sp = sig.keys[j];
        a = aspectOf(plp, nat.planets[sp]);
        if (a.orbAbs <= porb && a.aspect !== 'секстиль'){
          var w2 = aspWeight(a.aspect === 'секстиль' ? 'трин' : a.aspect, natureOf(P[i]));
          if (a.orbAbs > porb * 0.5 && w2){ w2 = w2 > 0 ? Math.max(1, w2 - 1) : Math.min(-1, w2 + 1); }
          if (w2){
            score += w2;
            var t2 = 'прогр. ' + PLANET_RU[P[i]] + ' ' + a.aspect + ' ' + PLANET_RU[sp];
            if (w2 > 0) reasons.push(t2); else warns.push(t2);
          }
        }
      }
    }
    // дирекции (1° = 1 год): Asc, MC, Солнце, Луна
    var dirs = [['дир. Асц', nat.asc], ['дир. МС', nat.mc], ['дир. Солнце', nat.planets.Sun], ['дир. Луна', nat.planets.Moon]];
    for (i = 0; i < dirs.length; i++){
      var dVal = norm360(dirs[i][1] + ageYr);
      for (j = 0; j < sig.keys.length; j++){
        sp = sig.keys[j];
        a = aspectOf(dVal, nat.planets[sp]);
        if (a.aspect === 'соединение' && a.orbAbs <= 1){
          score += 1;
          reasons.push(dirs[i][0] + ' на ' + PLANET_RU[sp]);
        }
      }
    }
    return { key: themeKey, label: (THEME[themeKey] || THEME.general).label, score: score, reasons: reasons, warns: warns };
  }

  /* Полный снимок дня по Дарагану. */
  function daily(chart, date){
    var nat = natalTrop(chart);
    var themes = Object.keys(THEME).map(function (k) { return dailyTheme(nat, k, date); });
    var moonLon = tropLon(BODY.Moon, date);
    var sunLon = tropLon(BODY.Sun, date);
    return {
      themes: themes,
      moonSign: SIGNS[signLon(moonLon)],
      moonPhase: moonPhaseName(sunLon, moonLon),
      total: themes.reduce(function (s, t) { return s + t.score; }, 0)
    };
  }

  return { forecast: forecast, THEME: THEME, daily: daily, dailyTheme: dailyTheme, natalTrop: natalTrop };
});
