/* sakoyan.js — «Прогнозы по Сакойян-Фенсис-Эккер-Луис».
   Метод: «Справочник астролога. Книга вторая. Предсказательная астрология. Транзиты планет»
   (Френсис Сакоян, Луис С. Эккер; рос. изд. переведи: Сакойян, Фенсис, Эккер, Луис).
   Чисто транзитный (тропический западный) анализ:
     * мажорные аспекты ТОЛЬКО: соединение 0°, секстиль 60°, квадрат 90°, трин 120°, оппозиция 180°;
     * орбис 1° (для транзита к Солнцу/Луне — 2°);
     * важно прохождение транзитной планеты по домам радикса (особенно угловые 1,4,7,10);
     * самый сильный транзит — тот, что усиливает УЖЕ существующий натальный аспект между теми же
       планетами (транзит не может дать того, чего не обещает натал);
     * сила транзитной планеты зависит от её силы в натале; ретроградность = повторный контакт
       (2–3 контакта), стационарные транзиты продолжительнее и важнее.
   Модуль отдельный, сидерическое ядро Jyotish НЕ трогает. Безопасно: при ошибке возвращает ''.
   Экспорт: Sakoyan.forecast(chart, themeKey) -> HTML. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(root || {}); }
  else { root.Sakoyan = factory(root); }
})(typeof self !== 'undefined' ? self : this, function (root) {
  if (root.Sakoyan) return root.Sakoyan;

  var A = root.Astronomy;
  if (!A && typeof require === 'function') { try { A = require('./astronomy.min.js'); } catch (e) {} }
  if (!A) return { forecast: function () { return ''; } };

  // --- константы ---
  var SIGNS = ['Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы'];
  var SIGN_LORD_TROP = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
  var PRU = { Sun:'Солнце', Moon:'Луна', Mercury:'Меркурий', Venus:'Венера', Mars:'Марс', Jupiter:'Юпитер', Saturn:'Сатурн', Uranus:'Уран', Neptune:'Нептун', Pluto:'Плутон' };
  var PDAT = { Sun:'Солнцу', Moon:'Луне', Mercury:'Меркурию', Venus:'Венере', Mars:'Марсу', Jupiter:'Юпитеру', Saturn:'Сатурну', Uranus:'Урану', Neptune:'Нептуну', Pluto:'Плутону' };
  var BODY = { Sun:A.Body.Sun, Moon:A.Body.Moon, Mercury:A.Body.Mercury, Venus:A.Body.Venus, Mars:A.Body.Mars, Jupiter:A.Body.Jupiter, Saturn:A.Body.Saturn, Uranus:A.Body.Uranus, Neptune:A.Body.Neptune, Pluto:A.Body.Pluto };

  // естественные дома (для темы) и сферы
  var THEME = {
    love:    { house:7,  sig:['Venus','Moon'],   label:'Любовь, отношения, брак' },
    children:{ house:5,  sig:['Jupiter','Sun'],  label:'Дети, творчество' },
    realty:  { house:4,  sig:['Moon','Saturn'],  label:'Недвижимость, дом, переезд' },
    money:   { house:2,  sig:['Venus','Jupiter'],label:'Деньги, доход' },
    career:  { house:10, sig:['Saturn','Mercury'],label:'Карьера, работа, статус' },
    travel:  { house:9,  sig:['Jupiter'],        label:'Поездки, учёба, дальние дороги' },
    health:  { house:6,  sig:['Mars','Saturn'],  label:'Здоровье, работа, преодоление' },
    social:  { house:3,  sig:['Mercury'],        label:'Встречи, переговоры, общение' },
    general: { house:1,  sig:['Sun'],            label:'Важное дело, самореализация' }
  };
  // мажорные аспекты (по книге: только они)
  var ASPECTS = [
    [0,'соединение'], [60,'секстиль'], [90,'квадратура'], [120,'трин'], [180,'оппозиция']
  ];
  // природа аспекта по книге (+ грам. форма для «в соединении/квадратуре с»)
  var ASPECT_NATURE = {
    'соединение':{in:'в соединении с', desc:'соединение — фокус и слияние: тема выходит на первый план, действует сильно и концентрированно'},
    'секстиль':{in:'в секстиле к', desc:'секстиль — лёгкая возможность: благоприятно, но требует вашего участия'},
    'квадратура':{in:'в квадратуре к', desc:'квадратура — напряжение и вызов: тема заявляет о себе через усилие, тревогу или трение'},
    'трин':{in:'в трине к', desc:'трин — гармония и лёгкость: тема идёт «сама», по-хорошему'},
    'оппозиция':{in:'в оппозиции к', desc:'оппозиция — полярность: тема проявляется через партнёра или «другую сторону», нужен баланс'}
  };
  function aname(a){ return (ASPECT_NATURE[a] || ASPECT_NATURE['соединение']); }
  function aIn(a){ return aname(a).in; }
  function aDesc(a){ return aname(a).desc; }

  // --- То, что даёт наглядность «где хорошо / где плохо» ---
  // Классификация аспекта по тону: гармоничные (трин/секстиль), напряжённые (квадратура/оппозиция),
  // соединение — «фокус» (нейтрально, зависит от усиления натала).
  function aspectHappy(asp){ return asp === 'трин' || asp === 'секстиль'; }
  function aspectTense(asp){ return asp === 'квадратура' || asp === 'оппозиция'; }
  // Оценка отдельного транзита: -2..+2. Усиление натального аспекта = «сильнее» по книге.
  function eventTone(e){
    var s = 0;
    if (aspectHappy(e.aspect)) s += 2;
    else if (aspectTense(e.aspect)) s -= 2;
    if (e.aspect === 'соединение') s += 1; // фокус, чуть позитивнее при точности
    if (e.natalRein) { s += (s >= 0 ? 1 : -1); } // натальное усиление усиливает и плюс, и минус
    if (e.orb <= 0.5) s += (s >= 0 ? 1 : -1);   // точный аспект — сильнее
    return s; // -4..+4
  }
  function toneClass(s){
    if (s >= 2) return 'sk-good';      // зелёный — благоприятно
    if (s >= 0) return 'sk-mid';       // жёлтый — нейтрально/смешанно
    return 'sk-hard';                  // красный — напряжённо/осторожно
  }
  function toneLabel(s){
    if (s >= 2) return '🟢 благоприятно';
    if (s >= 0) return '🟡 нейтрально';
    return '🔴 напряжённо — с осторожностью';
  }
  // суть планет (по книге)
  var NATURE_P = {
    Sun:'жизненная сила, личное достоинство, авторитет и инициатива',
    Moon:'эмоции, дом, семья и подсознание',
    Mercury:'ум, общение, сделки и обмен информацией',
    Venus:'любовь, красота, гармония и деньги',
    Mars:'энергия, действие, спорт и решительность',
    Jupiter:'рост, удача, расширение и покровительство',
    Saturn:'дисциплина, структура, ограничения и долгие дела',
    Uranus:'перемены, новизна, оригинальность и неожиданности',
    Neptune:'воображение, мечта, иллюзия и вдохновение',
    Pluto:'трансформация, глубинные перемены и власть'
  };
  var HOUSE_T = {
    1:'личность и самопроявление',2:'деньги и ценности',3:'общение, встречи, навыки',4:'дом, семья, недвижимость',
    5:'творчество, дети, любовь',6:'работа и здоровье',7:'партнёрство и брак',8:'трансформации и общие ресурсы',
    9:'учёба, дороги, наставники',10:'карьера и статус',11:'доход и сообщество',12:'уединение и завершение'
  };
  // орбис: 1°; для транзита к Солнцу/Луне — 2°
  function orbFor(target){ return (target === 'Sun' || target === 'Moon') ? 2 : 1; }

  // --- помощники ---
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
  function avatar(lon){ return norm360(lon); }
  function houseOfLon(asc, lon){ return Math.floor(norm360(lon - asc) / 30) + 1; }
  function aspectOf(a, b){
    var d = Math.abs((a - b) % 360); if (d > 180) d = 360 - d;
    var best = null, bd = 999;
    for (var i = 0; i < ASPECTS.length; i++) {
      var od = Math.abs(d - ASPECTS[i][0]);
      if (od < bd) { bd = od; best = ASPECTS[i]; }
    }
    return { aspect: best[1], target: best[0], orb: d - best[0], orbAbs: Math.abs(d - best[0]) };
  }
  function signLon(lon){ return Math.floor(norm360(lon) / 30); }
  function monthRu(m){ return ['янв','фев','мар','апр','мае','июн','июл','авг','сен','окт','ноя','дек'][m]; }
  function nice(dt){ return dt.getDate() + ' ' + monthRu(dt.getMonth()) + ' ' + dt.getFullYear(); }
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // --- натальная (тропическая) карта для западного метода ---
  function natalTrop(chart){
    var birth = new Date(chart.utc);
    var asc = ascTrop(chart.lat, chart.lon, birth);
    var planets = {}, houses = {};
    for (var k in BODY) {
      var tl = tropLon(BODY[k], birth);
      planets[k] = tl; houses[k] = houseOfLon(asc, tl);
    }
    return { asc: asc, birth: birth, lat: chart.lat, lon: chart.lon, planets: planets, houses: houses };
  }

  // --- сигнификаторы темы ---
  function significators(themeKey, nat){
    var s = THEME[themeKey] || THEME.general;
    var house = s.house;
    var li = signLon(nat.asc);
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

  // есть ли НАТАЛЬНЫЙ аспект между двумя планетами (по книге: самое важное усиление)
  function natalAspect(nat, p, t){
    var a = aspectOf(nat.planets[p], nat.planets[t]);
    // орбис для натала — чуть шире (книга говорит о «точных» аспектах), берём <2°
    if (a.orbAbs < 2) return a.aspect;
    return null;
  }

  // транзит-«событие» (мажорный аспект медленной планеты к сигнификатору)
  function transitEvents(nat, sig, now){
    var out = [];
    var slow = ['Pluto','Neptune','Uranus','Saturn','Jupiter','Mars'];
    var horizon = 2 * 365.25 * 86400000;
    var d = new Date(now.getTime());
    var step = 4 * 86400000;
    var prev = {};
    slow.forEach(function (p) { sig.keys.forEach(function (t) { prev[p+'_'+t] = null; }); });
    while (d.getTime() < now.getTime() + horizon) {
      for (var i = 0; i < slow.length; i++) {
        var p = slow[i];
        var pl = tropLon(BODY[p], d);
        var signP = signLon(pl);
        for (var j = 0; j < sig.keys.length; j++) {
          var t = sig.keys[j], natL = nat.planets[t];
          var a = aspectOf(pl, natL);
          if (ASPECTS_MAJOR.indexOf(a.aspect) < 0) continue;
          var orb = orbFor(t);
          var key = p + '_' + t + '_' + a.aspect;
          var within = a.orbAbs <= orb;
          if (within) {
            var ev = { date: new Date(d.getTime()), planet: p, target: t, aspect: a.aspect, orb: a.orbAbs, natalRein: natalAspect(nat, p, t) };
            if (!out.some(function (x) { return x.planet===ev.planet && x.target===ev.target && x.aspect===ev.aspect; })) out.push(ev);
          }
        }
      }
      d = new Date(d.getTime() + step);
    }
    // сортировка по дате + приоритет усиления натала
    out.sort(function (x, y) {
      if (x.natalRein && !y.natalRein) return -1;
      if (!x.natalRein && y.natalRein) return 1;
      return x.date - y.date;
    });
    return out;
  }
  var ASPECTS_MAJOR = ['соединение','секстиль','квадратура','трин','оппозиция'];

  // транзит планет по ДОМАМ радикса (осн.: углы 1,4,7,10; для темы — её дом)
  function houseTransits(nat, sig, now){
    var out = [];
    var slow = ['Jupiter','Saturn'];
    slow.forEach(function (p) {
      var h = houseOfLon(nat.asc, tropLon(BODY[p], now));
      var angular = (h === 1 || h === 4 || h === 7 || h === 10);
      out.push({ planet: p, house: h, angular: angular, isTheme: h === sig.house });
    });
    return out;
  }

  // --- Главная функция ---
  function forecast(chart, themeKey){
    if (!chart || !chart.utc || !chart.lat) return '';
    try {
      var theme = themeKey || 'general';
      var nat = natalTrop(chart);
      var sig = significators(theme, nat);
      var now = new Date();
      var ev = transitEvents(nat, sig, now);
      var houseTr = houseTransits(nat, sig, now);

      var h = '<div class="card story-card sakoyan-card">';
      h += '<h2>🔮 Прогнозы по Сакойян-Фенсис-Эккер-Луис</h2>';
      h += '<p class="muted" style="margin-top:0">Метод «Справочник астролога. Том II. Предсказательная астрология. Транзиты планет» (Ф. Сакоян, Л. Эккер). Чисто транзитный, в тропическом зодиаке: мажорные аспекты, орбис 1° (2° для Солнца/Луны), важны дома и угловые. Отдельный расчёт, не заменяет ваш основной.</p>';

      // сигнификатор темы
      var s = sig.theme;
      h += '<h3>🎯 Тема и сигнификаторы: ' + esc(s.label) + '</h3>';
      h += '<p>Тема связана с вашим <b>' + sig.house + '-м домом</b> («' + HOUSE_T[sig.house] + '»). Сигнификаторы: ' +
        sig.keys.map(function (k) { return '<b>' + PRU[k] + '</b>'; }).join(', ') + '.' +
        (sig.inHouse.length ? ' В этом доме стоят: ' + sig.inHouse.map(function (k) { return PRU[k]; }).join(', ') + '.' : '') +
        ' Управитель дома — <b>' + PRU[sig.lord] + '</b>.</p>';

      // ---- ИТОГОВАЯ ШКАЛА НАСТРОЕНИЯ СФЕРЫ ----
      // Складываем тон транзитов (каждый -4..+4), добавляем вклад медленных планет по дому темы,
      // нормализуем в шкалу 0..10 и показываем цветную ленту.
      var toneSum = 0;
      ev.slice(0, 8).forEach(function (e) { toneSum += eventTone(e); });
      // вклад домов: Юпитер по дому темы - плюс, Сатурн по дому темы - нагрузка; угловые усиливают знак
      houseTr.forEach(function (t) {
        if (t.isTheme) { toneSum += (t.planet === 'Jupiter') ? 2 : -2; }
        else if (t.angular) { toneSum += (t.planet === 'Jupiter') ? 1 : -1; }
      });
      // количество значимых транзитов усиливает счёт (и в плюс, и в минус)
      if (ev.length) toneSum = toneSum / ev.length; // средний тон события
      toneSum = Math.max(-4, Math.min(4, toneSum)); // в диапазоне
      var tone10 = Math.round(((toneSum + 4) / 8) * 10); // 0..10
      var tcls = toneClass(toneSum);
      var tlabel = toneLabel(toneSum);
      var tdesc = toneSum >= 2 ? 'Попутный ветер для этой сферы: события идут легче, есть поддержка и шанс реализоваться.'
        : toneSum >= 0 ? 'Смешанная картина: есть и плюсы, и «но» — сфера требует вашего участия и аккуратности.'
        : 'Напряжённый фон: тема проявляется через усилие, трения или вызовы — здесь важна осторожность и постепенность.';
      var pct = Math.max(6, Math.min(100, tone10 * 10)); // для видимости полоски
      h += '<div class="sk-tone">' +
        '<div class="sk-tone-head"><span class="sk-tone-label">🌡️ Итог по сфере сейчас</span>' +
        '<span class="sk-tone-badge ' + tcls + '">' + tlabel + ' <b>' + tone10 + '/10</b></span></div>' +
        '<div class="sk-tone-bar"><span class="sk-tone-fill ' + tcls + '" style="width:' + pct + '%"></span>' +
        '<span class="sk-tone-marks"><i>0</i><i>5</i><i>10</i></span></div>' +
        '<div class="sk-tone-note">' + tdesc + '</div>' +
        '<div class="sk-legend"><span class="sk-legend-item sk-good">0–3 · благоприятно</span>' +
        '<span class="sk-legend-item sk-mid">4–6 · нейтрально/смешанно</span>' +
        '<span class="sk-legend-item sk-hard">7–10 · напряжённо/осторожно</span></div>' +
        '</div>';

      // натальные аспекты между сигнификаторами (что «включает» транзит)
      var natAsp = [];
      for (var i = 0; i < sig.keys.length; i++) for (var j = i + 1; j < sig.keys.length; j++) {
        var asp = natalAspect(nat, sig.keys[i], sig.keys[j]);
        if (asp) natAsp.push(PRU[sig.keys[i]] + ' — ' + asp + ' — ' + PRU[sig.keys[j]]);
      }
      // планеты по домам (для темы — как «заряжена» сфера)
      var themePlanets = sig.inHouse.length ? sig.inHouse.map(function (k) { return PRU[k]; }).join(', ') : 'в этом доме планет нет';

      // транзиты к сигнификаторам
      h += '<h3>🗂️ Транзиты к сигнификаторам (мажорные)</h3>';
      if (ev.length) {
        h += '<ul class="fs-month">' + ev.slice(0, 8).map(function (e) {
          var tn = eventTone(e);
          var tcls = toneClass(tn);
          var rein = e.natalRein ? '<span class="muted"> · <b>усиливает ваш натальный аспект</b> (' + esc(e.natalRein) + ' − это важно по книге)</span>' : '';
          return '<li><span class="sk-badge ' + tcls + '">' + toneLabel(tn) + '</span> <b>' + nice(e.date) + '</b> — ' +
            PRU[e.planet] + ' ' + aIn(e.aspect) + ' ' + (PDAT[e.target] || PRU[e.target]) +
            ' (орб ' + e.orb.toFixed(1) + '°). ' + aDesc(e.aspect) + rein + '</li>';
        }).join('') + '</ul>';
      } else {
        h += '<p class="muted">Значимых мажорных транзитов к сигнификаторам в ближайшие 2 года нет — тема идёт фоном.</p>';
      }

      // транзит по домам радикса
      h += '<h3>🏠 Куда сейчас идут медленные планеты (дома радикса)</h3>';
      h += '<ul class="fs-month">' + houseTr.map(function (t) {
        var mark = t.isTheme ? ' <b><span class="muted">— это ваш дом темы</span></b>' : '';
        var ang = t.angular ? ' · <b>угловой дом</b> (важно)' : '';
        var tcls = (t.planet === 'Jupiter') ? 'sk-good' : 'sk-mid'; // Юпитер по умолч. благоприятен, Сатурн — структурный
        return '<li><span class="sk-badge ' + tcls + '">' + (t.planet === 'Jupiter' ? '🟢 поддержка' : '🟡 режим/структура') +
          '</span> <b>' + PRU[t.planet] + '</b> идёт по вашему <b>' + t.house + '-му дому</b> («' + HOUSE_T[t.house] + '»)' + ang + mark + '.</li>';
      }).join('') + '</ul>';

      // что «включает» натал
      h += '<h3>🌱 Что заложено в натале этой сферы</h3>';
      h += '<p>Сфера «<b>' + esc(s.label) + '</b>»: в натале в ' + sig.house + '-м доме ' + themePlanets +
        ', управитель — ' + PRU[sig.lord] + '.' +
        (natAsp.length ? ' Натальные аспекты внутри сферы: ' + natAsp.join('; ') + '. <b>По книге именно такие транзиты дают самые сильные события</b> — транзит «включает» то, что уже обещает натал.' : '') +
        '</p><p class="muted">Ключевое правило этой книги: транзит не может дать того, чего не обещает гороскоп рождения; он лишь пробуждает скрытое.</p>';

      // сводный прогноз
      h += '<h3>📖 Что это значит простыми словами</h3><div class="sakoyan-narr"><p>';
      var themeHouse = s.house;
      h += 'Сейчас по теме «' + esc(s.label) + '» ' + (ev.length
        ? 'активен транзит <b>' + PRU[ev[0].planet] + '</b> — ' + NATURE_P[ev[0].planet] + '. ' +
          (ev[0].natalRein ? 'Поскольку это усиление вашего натального аспекта, событие скорее реализуется — это самый сильный тип транзита по книге. ' :
          'Это самостоятельный транзит: тема пробуждается, но чтобы проявиться по-настоящему, ей нужна опора в натале. ')
        : 'значимых транзитов к её сигнификаторам нет — тема идёт фоном.');
      h += ' Тон темы задаёт аспект — ' + aDesc(ev.length ? ev[0].aspect : 'соединение') + '. ' +
        (ev[0] && ev[0].orb <= 0.5 ? 'Аспект практически точный — влияние сейчас максимально. ' : '');
      h += '</p><p>';
      h += 'Не забывайте про дома: ' + houseTr.map(function (t) { return PRU[t.planet] + ' в ' + t.house + '-м'; }).join(', ') +
        '. Если медленная планета идёт по угловому дому (1,4,7,10) или по дому самой темы — это усиливает проявление и удлиняет период.';
      h += '</p></div>';

      h += '<p class="muted" style="margin-top:8px">Метод построен на вашей карте в тропическом зодиаке по книге «Предсказательная астрология. Транзиты планет» (мажорные аспекты, орбисы, усиление натальных аспектов, транзиты по домам/углам). Это тенденции и «окна», а не гарантия события.</p>';
      h += '</div>';
      return h;
    } catch (e) { return ''; }
  }

  return { forecast: forecast, THEME: THEME };
});
