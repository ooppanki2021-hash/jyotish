/* sakoyan-synastry.js — «Синастрия по Сакойян-Фенсис-Эккер-Луис».
   Метод: «Справочник астролога. Книга III. Астрология взаимоотношений (Синастрия)»
   (Френсис Сакоян, Льюис С. Эккер; рос. изд.: Сакойян, Фенсис, Эккер, Луис).
   По книге делаем ГЛАВНОЕ:
     1) сравнительные аспекты планет двух карт (планета А к планете Б);
     2) «планета Партнёра в моих домах» (наложение карт по домам) и наоборот;
     3) диспозиторы и роль знаков/стихий.
   Всё — в ТРОПИЧЕСКОМ зодиаке (западная книга), мажорные аспекты ТОЛЬКО.
   Орбисы по книге: 10° для аспектов с Солнцем/Луной, 6° для аспектов планет.
   Модуль отдельный, сидерическое ядро Jyotish НЕ трогает. Безопасно: при ошибке возвращает ''.
   Экспорт: SakoyanSyn.forecast(chart1, chart2, name1, name2) -> HTML. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(root || {}); }
  else { root.SakoyanSyn = factory(root); }
})(typeof self !== 'undefined' ? self : this, function (root) {
  if (root.SakoyanSyn) return root.SakoyanSyn;

  var A = root.Astronomy;
  if (!A && typeof require === 'function') { try { A = require('./astronomy.min.js'); } catch (e) {} }
  if (!A) return { forecast: function () { return ''; } };

  // --- константы ---
  var SIGNS = ['Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы'];
  var ELEM = { fire:'Огонь', earth:'Земля', air:'Воздух', water:'Вода' };
  var SIGN_ELEM = ['fire','earth','air','water','fire','earth','air','water','fire','earth','air','water'];
  var SIGN_NAME = ['Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы'];
  var PRU = { Sun:'Солнце', Moon:'Луна', Mercury:'Меркурий', Venus:'Венера', Mars:'Марс', Jupiter:'Юпитер', Saturn:'Сатурн', Uranus:'Уран', Neptune:'Нептун', Pluto:'Плутон' };
  var BODY = { Sun:A.Body.Sun, Moon:A.Body.Moon, Mercury:A.Body.Mercury, Venus:A.Body.Venus, Mars:A.Body.Mars, Jupiter:A.Body.Jupiter, Saturn:A.Body.Saturn, Uranus:A.Body.Uranus, Neptune:A.Body.Neptune, Pluto:A.Body.Pluto };
  var BODY_ORDER = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];

  // мажорные аспекты (по книге: только они)
  var ASPECTS = [[0,'соединение'],[60,'секстиль'],[90,'квадратура'],[120,'трин'],[180,'оппозиция']];
  function aspectHappy(asp){ return asp === 'трин' || asp === 'секстиль'; }
  function aspectTense(asp){ return asp === 'квадратура' || asp === 'оппозиция'; }

  // суть планет (по книге) — для ролей в разных сферах отношений
  var NATURE_P = {
    Sun:'жизненная сила, личное достоинство, воля и самовыражение',
    Moon:'эмоции, дом, семья, привычки и подсознание',
    Mercury:'ум, общение, обмен информацией и сделки',
    Venus:'любовь, красота, гармония, деньги и дружба',
    Mars:'энергия, действие, страсть и решительность',
    Jupiter:'рост, удача, расширение, покровительство и высшие идеи',
    Saturn:'дисциплина, структура, ограничения, ответственность и долг',
    Uranus:'перемены, новизна, оригинальность и неожиданности',
    Neptune:'воображение, мечта, иллюзия, вдохновение и духовность',
    Pluto:'трансформация, глубинные перемены, власть и регенерация'
  };
  // для романтики/брака по книге: что важно
  var ROMANCE = { Venus:1, Mars:1, Sun:1, Moon:1 };
  var MARRIAGE = { Saturn:1 }; // Сатурн — правитель Весов и 7-го дома
  var BUSINESS = { Mercury:1, Saturn:1, Mars:1 };
  var MONEY = { Venus:1, Moon:1 };
  var FAMILY = { Moon:1, Jupiter:1, Neptune:1 };

  var HOUSE_T = {
    1:'личность и самопроявление',2:'деньги и ценности',3:'общение, встречи, навыки',4:'дом, семья, недвижимость',
    5:'творчество, дети, любовь, удовольствия',6:'работа и здоровье',7:'партнёрство и брак',8:'трансформации и общие ресурсы',
    9:'учёба, дороги, наставники, философия',10:'карьера и статус',11:'доход и сообщество',12:'уединение и завершение'
  };
  var HOUSE_LORD_NAT = ['Марс','Венера','Меркурий','Луна','Солнце','Меркурий','Венера','Марс','Юпитер','Сатурн','Сатурн','Юпитер'];

  // орбис по книге: 10° если в аспекте участвует Солнце или Луна, иначе 6°
  function orbFor(a, b){ return (a === 'Sun' || a === 'Moon' || b === 'Sun' || b === 'Moon') ? 10 : 6; }

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
  function houseOfLon(asc, lon){ return Math.floor(norm360(lon - asc) / 30) + 1; }
  function aspectOf(a, b){
    var d = Math.abs((a - b) % 360); if (d > 180) d = 360 - d;
    var best = null, bd = 999;
    for (var i = 0; i < ASPECTS.length; i++) { var od = Math.abs(d - ASPECTS[i][0]); if (od < bd) { bd = od; best = ASPECTS[i]; } }
    return { aspect: best[1], target: best[0], orb: d - best[0], orbAbs: Math.abs(d - best[0]) };
  }
  function signLon(lon){ return Math.floor(norm360(lon) / 30); }
  var SIGN_PREP = { '0':'в Овне','1':'в Тельце','2':'в Близнецах','3':'в Раке','4':'во Льве','5':'в Деве','6':'в Весах','7':'в Скорпионе','8':'в Стрельце','9':'в Козероге','10':'в Водолее','11':'в Рыбах' };
  function signPlace(lon){ return SIGN_PREP[signLon(lon)] || ('в знаке ' + SIGNS[signLon(lon)]); }
  function fdeg(x){ return x.toFixed(1).replace('.', ' °'); }
  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // натальная (тропическая) карта для западного метода
  function natalTrop(chart){
    var birth = new Date(chart.utc);
    var asc = ascTrop(chart.lat, chart.lon, birth);
    var planets = {}, houses = {};
    for (var k in BODY) { var tl = tropLon(BODY[k], birth); planets[k] = tl; houses[k] = houseOfLon(asc, tl); }
    return { asc: asc, birth: birth, lat: chart.lat, lon: chart.lon, planets: planets, houses: houses };
  }

  // --- сравнительные аспекты (планета А к планете Б, орбис по книге) ---
  function comparativeAspects(n1, n2){
    var out = [];
    BODY_ORDER.forEach(function (pa) {
      BODY_ORDER.forEach(function (pb) {
        var a = aspectOf(n1.planets[pa], n2.planets[pb]);
        var orb = orbFor(pa, pb);
        if (a.orbAbs <= orb) out.push({ a: pa, b: pb, aspect: a.aspect, orb: a.orbAbs });
      });
    });
    return out;
  }

  // --- планета Партнёра в моих домах (обе стороны) ---
  function houseOverlap(n1, n2){ // планеты n2 (Партнёра) в домах n1 (моего)
    var out = [];
    BODY_ORDER.forEach(function (p) { out.push({ planet: p, house: n1.houses[p] }); });
    return out;
  }

  // --- диспозиторы: планета = управитель знака другой карты ---
  function dispositors(n1, n2){
    var out = [];
    BODY_ORDER.forEach(function (db) {
      var sb = signLon(n2.planets[db]);
      var lord = HOUSE_LORD_NAT[sb];
      var lordKey = { 'Солнце':'Sun','Луна':'Moon','Меркурий':'Mercury','Венера':'Venus','Марс':'Mars','Юпитер':'Jupiter','Сатурн':'Saturn' }[lord];
      if (lordKey) out.push({ from: db, key: lordKey });
    });
    return out;
  }
  // родительный падеж имён планет («под властью Сатурна»)
  var PRU_GEN = { Sun:'Солнца', Moon:'Луны', Mercury:'Меркурия', Venus:'Венеры', Mars:'Марса', Jupiter:'Юпитера', Saturn:'Сатурна', Uranus:'Урана', Neptune:'Нептуна', Pluto:'Плутона' };
  function plural(n, one, few, many){ n = Math.abs(n); var m10=n%10, m100=n%100; if(m10===1&&m100!==11) return one; if(m10>=2&&m10<=4&&(m100<10||m100>=20)) return few; return many; }

  // --- тон отдельных аспектов/позиций ---
  function aspTone(a){
    if (aspectHappy(a.aspect)) return 2;
    if (aspectTense(a.aspect)) return -2;
    return 1; // соединение = фокус
  }
  function houseTone(house){
    // какие дома считаются «гармоничными» при наложении (по книге): 5,7,4,11,2,9 — мягкие; 6,8,12 — напряжённые
    var soft = [1,2,4,5,7,9,11], hard = [6,8,12];
    if (soft.indexOf(house) >= 0) return 1;
    if (hard.indexOf(house) >= 0) return -1;
    return 0;
  }

  // --- интерпретация отдельного сравнительного аспекта ---
  function aspectText(a){
    var happy = aspectHappy(a.aspect), tense = aspectTense(a.aspect);
    var p1 = NATURE_P[a.a], p2 = NATURE_P[a.b];
    var lead;
    if (a.aspect === 'соединение') lead = 'соединение — фокус и слияние: качества объединяются и работают как одно целое';
    else if (happy) lead = (a.aspect === 'трин' ? 'трин — гармония и лёгкость: здесь между вами «само» взаимопонимание' : 'секстиль — мягкая возможность: благоприятно, но требует участия');
    else if (tense) lead = (a.aspect === 'квадратура' ? 'квадратура — напряжение и вызов: между вами трение, которое надо прорабатывать' : 'оппозиция — полярность: вы «две стороны одной медали», нужен баланс');
    else lead = 'аспект';
    var domain = domainOfPair(a.a, a.b);
    return { lead: lead, domain: domain, happy: happy, tense: tense };
  }
  function domainOfPair(x, y){
    var set = (x === 'Venus' || y === 'Venus' || x === 'Mars' || y === 'Mars' || x === 'Sun' || y === 'Sun' || x === 'Moon' || y === 'Moon');
    if (set && (x === 'Venus' || y === 'Venus') && (x === 'Mars' || y === 'Mars')) return 'романтическое притяжение: любовь ↔ страсть';
    if (x === 'Moon' || y === 'Moon') return 'эмоциональный контакт и быт';
    if (x === 'Mercury' || y === 'Mercury') return 'общение, интеллект, сделки';
    if (x === 'Saturn' || y === 'Saturn') return 'серьёзность, обязательства, долг';
    if (x === 'Venus' || y === 'Venus') return 'любовь, гармония, деньги';
    if (x === 'Mars' || y === 'Mars') return 'действие, энергия, страсть';
    if (x === 'Jupiter' || y === 'Jupiter') return 'рост, удача, покровительство';
    if (x === 'Uranus' || y === 'Uranus') return 'перемены, свобода, неожиданность';
    if (x === 'Neptune' || y === 'Neptune') return 'мечта, воображение, духовность';
    if (x === 'Pluto' || y === 'Pluto') return 'глубинная трансформация и власть';
    return 'общая сфера взаимовлияния';
  }

  // --- интерпретация «планета Партнёра в моём доме» ---
  function houseOverlapText(item, partnerName){
    var h = item.house;
    var texts = {
      1:'оказывает прямое влияние на вашу личность и самопроявление — вы во многом становитесь похожи друг на друга',
      2:'активирует общую тему денег, ценностей и выгоды — возможен общий бизнес и взаимная материальная поддержка',
      3:'стимулирует общение, идеи и совместные поездки — между вами «игра умов» и живой обмен мыслями',
      4:'трогает дом и семью: партнёр влияет на ваш уют, быт и глубокую привязанность',
      5:'пробуждает романтику, удовольствия, творчество и тему детей — светлая, радостная сторона союза',
      6:'переводит партнёра в роль «опоры и помощника»: тема работы, быта и повседневного служения друг другу',
      7:'ядро партнёрства: партнёр для вас фигура «второй половины» — сильное влечение и тема брака',
      8:'глубинная, трансформирующая, но и ревнивая зона: общие ресурсы, страсть, внутренние перемены',
      9:'вносит общие идеалы, философию, веру и тему дальних дорог — вы вдохновляете мировоззрение друг друга',
      10:'влияет на вашу карьеру, статус и репутацию — возможен союз деловой или «наставнический»',
      11:'дружба + любовь: партнёр входит в ваш круг, общие цели, сообщество и мечты на будущее',
      12:'глубокое, уединённое, «тайное» измерение: подсознание, интуиция, кармическая связь'
    };
    var role = 'Партнёр';
    var p = PRU[item.planet];
    return p + ' «' + partnerName + '» попадает в ваш <b>' + h + '-й дом</b> (' + HOUSE_T[h] + ') — ' + texts[h] + '.';
  }

  // --- наложение стихий (как соотносится природа) ---
  function elemMatch(n1, n2, name1, name2){
    var s1 = signLon(n1.planets['Sun']), s2 = signLon(n2.planets['Sun']);
    var e1 = SIGN_ELEM[s1], e2 = SIGN_ELEM[s2];
    var eName = { fire:'Огонь', earth:'Земля', air:'Воздух', water:'Вода' };
    var same = e1 === e2;
    var compat = (e1 === 'fire' && e2 === 'air') || (e1 === 'air' && e2 === 'fire') ||
                 (e1 === 'earth' && e2 === 'water') || (e1 === 'water' && e2 === 'earth') ||
                 (e1 === 'fire' && e2 === 'fire') || (e1 === 'earth' && e2 === 'earth') ||
                 (e1 === 'air' && e2 === 'air') || (e1 === 'water' && e2 === 'water');
    var harsh = (e1 === 'fire' && e2 === 'water') || (e1 === 'water' && e2 === 'fire') ||
                (e1 === 'earth' && e2 === 'air') || (e1 === 'air' && e2 === 'earth');
    var note;
    if (compat) note = 'родственные стихии — природе легко резонировать, общий язык найден быстро.';
    else if (harsh) note = 'противоположные стихии — природа «не слышит» друг друга: нужно сознательно идти навстречу.';
    else note = 'соседние стихии — сочетание рабочее, но природа разная: придётся приспосабливаться.';
    return { e1: e1, e2: e2, note: note, compat: compat, harsh: harsh };
  }

  // --- общий тон/балл пары (0..100, с «разрешением», а не насыщение) ---
  // Ключевая идея по книге: главное — НЕ количество аспектов, а их УРАВНОВЕШЕННОСТЬ
  // (сколько гармонии против сколько напряжения) плюс наложение домов и стихии.
  function overall(aspList, ov1, ov2, elem){
    // доля «гармонии» среди сравнительных аспектов (0..1), точные аспекты весят больше
    var har = 0, ten = 0, wsum = 0;
    aspList.forEach(function (a) {
      var w = a.orb <= 2 ? 1 : (a.orb <= 4 ? 0.6 : 0.3); // точные аспекты важнее
      if (aspectHappy(a.aspect)) har += w;
      else if (aspectTense(a.aspect)) ten += w;
      wsum += w;
    });
    var bal = wsum ? (har - ten) / wsum : 0; // -1..1
    // наложение домов: мягкие vs напряжённые
    var hSoft = 0, hHard = 0, hCnt = 0;
    ov1.concat(ov2).forEach(function (o) {
      var t = houseTone(o.house);
      if (t > 0) hSoft++; else if (t < 0) hHard++;
      hCnt++;
    });
    var hBal = hCnt ? (hSoft - hHard) / hCnt : 0; // -1..1
    var elemVal = elem.compat ? 0.5 : (elem.harsh ? -0.5 : 0);
    // сводка
    var raw = bal * 0.55 + hBal * 0.30 + elemVal * 0.15; // -1..1
    var pct = Math.round(50 + raw * 50); // 0..100, среднее = 50
    pct = Math.max(4, Math.min(96, pct));
    return { tone: raw, pct: pct, bal: bal, hBal: hBal };
  }

  // --- Главная функция ---
  function forecast(chart1, chart2, name1, name2){
    if (!chart1 || !chart1.utc || !chart2 || !chart2.utc || !chart1.lat || !chart2.lat) return '';
    try {
      var n1 = natalTrop(chart1), n2 = natalTrop(chart2);
      var asp = comparativeAspects(n1, n2);
      var ov1 = houseOverlap(n1, n2); // планеты <name2> в домах <name1>
      var ov2 = houseOverlap(n2, n1); // планеты <name1> в домах <name2>
      var elem = elemMatch(n1, n2, name1, name2);
      var tot = overall(asp, ov1, ov2, elem);

      // для ОТДЕЛЬНЫХ аспектов/домов (тон -2..+2)
      function clsA(t){ return t >= 2 ? 'sk-good' : (t >= 0 ? 'sk-mid' : 'sk-hard'); }
      function labA(t){ return t >= 2 ? '🟢 гармонично' : (t >= 0 ? '🟡 нейтрально' : '🔴 напряжённо — с осторожностью'); }
      // для ОБЩЕГО тона (0..100)
      function clsP(p){ return p >= 60 ? 'sk-good' : (p >= 40 ? 'sk-mid' : 'sk-hard'); }
      function labP(p){ return p >= 60 ? '🟢 гармонично' : (p >= 40 ? '🟡 нейтрально/смешанно' : '🔴 напряжённо — с осторожностью'); }

      var h = '<div class="card story-card sakoyan-card">';
      h += '<h2>💞 Синастрия по Сакойян-Фенсис-Эккер-Луис: ' + esc(name1) + ' и ' + esc(name2) + '</h2>';
      h += '<p class="muted" style="margin-top:0">Метод «Справочник астролога. Том III. Астрология взаимоотношений» (Ф. Сакоян, Л. Эккер). Тропический зодиак, мажорные сравнительные аспекты, орбис 10° (Солнце/Луна) и 6° (планеты), планеты Партнёра в домах второй карты и наоборот, диспозиторы и стихии. Отдельный расчёт — не заменяет ваш основной.</p>';

      // ---- ИТОГОВАЯ ШКАЛА СОВМЕСТИМОСТИ ----
      var tcls = clsP(tot.pct);
      h += '<div class="sk-tone">' +
        '<div class="sk-tone-head"><span class="sk-tone-label">🌡️ Общий тон совместимости</span>' +
        '<span class="sk-tone-badge ' + tcls + '">' + labP(tot.pct) + ' <b>' + tot.pct + '%</b></span></div>' +
        '<div class="sk-tone-bar"><span class="sk-tone-fill ' + tcls + '" style="width:' + Math.max(6, tot.pct) + '%"></span>' +
        '<span class="sk-tone-marks"><i>0</i><i>25</i><i>50</i><i>75</i><i>100</i></span></div>' +
        '<div class="sk-tone-note">' + (tot.pct >= 60 ? 'Высокое созвучие: природа и планы во многом совпадают, союз «дышит сам».' :
          tot.pct >= 40 ? 'Смешанная картина: есть и сильные, и трудные стороны — союз строится осознанно.' :
          'Напряжённый фон: разный склад и много «трений» — важна осознанность и готовность работать над отношениями.') + '</div>' +
        '<div class="sk-legend"><span class="sk-legend-item sk-good">гармонично</span>' +
        '<span class="sk-legend-item sk-mid">нейтрально/смешанно</span>' +
        '<span class="sk-legend-item sk-hard">напряжённо/осторожно</span></div>' +
        '</div>';

      // ---- СТИХИИ ----
      h += '<h3>🔥 Стихия и природа</h3>';
      h += '<p>Солнце <b>' + esc(name1) + '</b> — ' + signPlace(n1.planets['Sun']) + ' (' + ELEM[elem.e1] + '), Солнце <b>' + esc(name2) + '</b> — ' + signPlace(n2.planets['Sun']) + ' (' + ELEM[elem.e2] + '). ' + elem.note + '</p>';
      h += '<p class="muted">По книге от стихии зависит, в какой сфере вы сможете успешно сотрудничать (например, Огонь+Воздух — инициатива и идеи; Земля+Вода — практика и чувства; противоположные стихии требуют большего терпения).</p>';

      // ---- КЛЮЧЕВЫЕ СФЕРЫ ОТНОШЕНИЙ (что по книге важно) ----
      h += '<h3>🧭 На что смотреть в этих отношениях (по книге)</h3>';
      h += '<ul class="fs-month">';

      // Романтика/брак: Venus-Mars, Venus-Moon, Venus-Sun, Venus-Uranus, Venus-Pluto
      var romancePairs = [['Venus','Mars'],['Venus','Moon'],['Venus','Sun'],['Venus','Uranus'],['Venus','Pluto']];
      var romHit = asp.filter(function(a){ return romancePairs.some(function(p){ return (a.a===p[0]&&a.b===p[1])||(a.a===p[1]&&a.b===p[0]); }); });
      if (romHit.length) {
        h += '<li><span class="sk-badge sk-good">💘 романтика</span> есть сравнительные аспекты <b>Венеры</b> (любовь) с ключевыми планетами партнёра: ' + romHit.slice(0,4).map(function(a){ return PRU[a.a]+' — '+a.aspect+' — '+PRU[a.b]+' ('+a.orb.toFixed(1)+'°)'; }).join('; ') + ' — это важные показатели для зарождения романтических отношений.</li>';
      } else {
        h += '<li><span class="sk-badge sk-mid">💘 романтика</span> ярких «венерианских» пар (Венера—Марс/Луна/Солнце/Уран/Плутон) не видно — романтика будет раскрываться через другие факторы, а не по «классической формуле» книги.</li>';
      }
      // Сатурн как основа прочности
      var sat = asp.filter(function(a){ return a.a==='Saturn' || a.b==='Saturn'; });
      h += '<li><span class="sk-badge ' + (sat.length?'sk-mid':'sk-good') + '">🛡️ прочность</span> Сатурн (правитель Весов и 7-го дома — «института семьи») ' + (sat.length?'образует сравнительные связи: ' + sat.slice(0,3).map(function(a){ return PRU[a.a]+'—'+a.aspect+'—'+PRU[a.b]; }).join('; ') + ' — эти аспекты во многом определяют прочность союза на долгосрок.':'в сравнительной картине не выражен — прочность будет определяться зрелостью и осознанным выбором, а не «заложена» в картах.') + '</li>';
      // Луна как эмоциональная гармония
      var moon = asp.filter(function(a){ return a.a==='Moon' || a.b==='Moon'; });
      h += '<li><span class="sk-badge ' + (moon.length?'sk-mid':'sk-mid') + '">🌙 эмоции</span> Луна (эмоциональная гармония): ' + (moon.length? moon.slice(0,3).map(function(a){ return PRU[a.a]+'—'+a.aspect+'—'+PRU[a.b]; }).join('; ') + ' — здесь закладывается, как вам комфортно чувствовать друг друга.' : 'сравнительных лунных связей мало — эмоциональную гармонию придётся строить самостоятельно.') + '</li>';
      // Дело/бизнес: Mercury, Saturn, Mars
      var biz = asp.filter(function(a){ return (a.a==='Mercury'||a.b==='Mercury') || (a.a==='Saturn'&&(a.b==='Mercury'||a.b==='Sun')) || (a.a==='Mars'&&(a.b==='Mercury'||a.b==='Saturn')); });
      h += '<li><span class="sk-badge ' + (biz.length?'sk-mid':'sk-mid') + '">💼 дело/бизнес</span> Меркурий (ум, сделки), Сатурн (структура), Марс (действие): ' + (biz.length? biz.slice(0,3).map(function(a){ return PRU[a.a]+'—'+a.aspect+'—'+PRU[a.b]; }).join('; ') : 'ярких «деловых» пар не видно') + '.</li>';

      h += '</ul>';

      // ---- СРАВНИТЕЛЬНЫЕ АСПЕКТЫ ----
      h += '<h3>🪐 Сравнительные аспекты планет двух карт (мажорные)</h3>';
      if (asp.length) {
        // сортировка по силе/тону, приоритет гармоничных и точных
        var sorted = asp.slice().sort(function (x, y) { return (aspTone(x) !== aspTone(y)) ? (aspTone(y) - aspTone(x)) : (x.orb - y.orb); });
        h += '<ul class="fs-month">' + sorted.map(function (a) {
          var t = aspTone(a); var tc = clsA(t);
          var text = aspectText(a);
          return '<li><span class="sk-badge ' + tc + '">' + labA(t) + '</span> <b>' + PRU[a.a] + '</b> (' + esc(name1) + ') — ' + a.aspect + ' — <b>' + PRU[a.b] + '</b> (' + esc(name2) + '), орб ' + a.orb.toFixed(1) + '°. ' + text.lead + '. <span class="muted">Сфера: ' + text.domain + '.</span></li>';
        }).join('') + '</ul>';
      } else {
        h += '<p class="muted">Значимых мажорных сравнительных аспектов не обнаружено — карты живут как бы «рядом», а не «вовнутрь»; связь строится через наложение домов.</p>';
      }

      // ---- ПЛАНЕТЫ ПАРТНЁРА В МОИХ ДОМАХ ----
      h += '<h3>🏠 ' + esc(name2) + ' в ваших домах (планеты Партнёра в моём гороскопе)</h3>';
      h += '<ul class="fs-month">' + ov1.map(function (o) {
        var t = houseTone(o.house); var tc = clsA(t);
        return '<li><span class="sk-badge ' + tc + '">' + labA(t) + '</span> ' + houseOverlapText(o, esc(name2)) + '</li>';
      }).join('') + '</ul>';

      h += '<h3>🏠 ' + esc(name1) + ' в ваших домах (планеты Партнёра в моём гороскопе)</h3>';
      h += '<p class="muted">То же с точностью до наоборот: как <b>' + esc(name1) + '</b> входит в сферы жизни <b>' + esc(name2) + '</b>.</p>';
      h += '<ul class="fs-month">' + ov2.map(function (o) {
        var t = houseTone(o.house); var tc = clsA(t);
        return '<li><span class="sk-badge ' + tc + '">' + labA(t) + '</span> ' + houseOverlapText(o, esc(name1)) + '</li>';
      }).join('') + '</ul>';

      // ---- ДИСПОЗИТОРЫ ----
      var disp = dispositors(n1, n2);
      h += '<h3>🔗 Диспозиторы (правители знаков второй карты)</h3>';
      if (disp.length) {
        h += '<p>По книге управитель знака, в котором стоит планета Партнёра, «управляет» её проявлением. Здесь: ' +
          disp.slice(0, 6).map(function (d) { return '<b>' + PRU[d.from] + '</b> (' + SIGNS[signLon(n2.planets[d.from])] + ') — под властью ' + PRU_GEN[d.key]; }).join('; ') +
          '.</p>';
        h += '<p class="muted">Смысл: если планета Партнёра стоит в знаке, которым управляет планета из <i>вашей</i> карты, — партнёр «встречает» в вас покровителя-управителя и наоборот.</p>';
      } else {
        h += '<p class="muted">Заметных диспозиторских связей (управитель знака одной карты = планета другой) нет.</p>';
      }

      // ---- ИТОГ ПРОСТЫМИ СЛОВАМИ ----
      var strong = asp.filter(function(a){ return a.orb <= 2 && aspTone(a) > 0; });
      var hard = asp.filter(function(a){ return aspTone(a) < 0; });
      h += '<h3>📖 Что это значит простыми словами</h3><div class="sakoyan-narr"><p>';
      h += 'Отношения ' + esc(name1) + ' и ' + esc(name2) + ' — по книге это союз, где ' +
        (strong.length ? 'есть ' + strong.length + plural(strong.length, ' точная гармоничная связь', ' точных гармоничные связи', ' точных гармоничных связей') + ': ' + strong.slice(0,3).map(function(a){ return PRU[a.a]+'—'+PRU[a.b]; }).join(', ') + ' — «опора», на которой держится взаимопонимание. ' :
        'ярких точных гармоничных связей мало — взаимопонимание строится через наложение домов, а не через сильные аспекты. ');
      if (hard.length) h += 'При этом есть ' + hard.length + plural(hard.length, ' напряжённая связь (квадрат/оппозиция)', ' напряжённые связи (квадраты/оппозиции)', ' напряжённых связей (квадраты/оппозиции)') + ', которые дают «трения» — это те зоны, где стоит работать осознанно. ';
      h += '</p><p>';
      if (elem.compat) h += 'Стихии родственные — природа резонирует, общий язык легче. ';
      else if (elem.harsh) h += 'Стихии противоположные — природа «не слышит» друг друга, потребуется особое терпение. ';
      h += 'Самый сильный показатель совместимости по книге — когда сравнительные аспекты и положение планет Партнёра в домах друг друга <b>совпадают</b> (например, Венера-Марс в гармонии <i>и</i> планеты Партнёра в вашем 5-м/7-м доме). ' +
        (asp.length ? 'Сравните блок выше: где карты «совпали» одновременно и по аспекту, и по дому — там настоящая основа союза.' : '');
      h += '</p></div>';

      h += '<p class="muted" style="margin-top:8px">Метод построен на тропических положениях обеих карт по книге «Астрология взаимоотношений» (сравнительные мажорные аспекты, орбисы, наложение домов, диспозиторы, стихии). Это тенденции и «печать» карт, а не приговор — отношения всегда строятся усилием обоих.</p>';
      h += '</div>';
      return h;
    } catch (e) { return ''; }
  }

  return { forecast: forecast, NATURE_P: NATURE_P };
});
