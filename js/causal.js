/* causal.js — «Причиные аспекты гороскопа» (кармический разбор).
   Основа: Е. А. Орлова, «Причинные аспекты астрологии», Тюмень, 2008 (2-е изд.).
   Идея книги — не предсказать «когда», а прочитать «программу» человека:
   где в карте напряжение (надо отработать), где защита, где творческие дары, где кармический груз.
   Классификация аспектов по углам (по книге):
     напряжённые (чёрные):  45, 90, 135, 180
     гармоничные (красные): 30, 60, 120, 150
     творческие (зелёные):  36, 72, 108, 144
     кармические (синие):   20, 40, 80, 100
   Плюс: конфигурации (большой крест, тау-квадрат, тригон, бисекстиль), Лунные узлы (Раху/Кету),
   кресты (кардинальный/фиксированный/подвижный), стихии, углы (ASC/DSC/MC/IC).
   Модуль отдельный, сидерическое ядро Jyotish НЕ трогает. Безопасно: при ошибке возвращает ''.
   Экспорт: Causal.analyze(chart) -> HTML. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(root || {}); }
  else { root.Causal = factory(root); }
})(typeof self !== 'undefined' ? self : this, function (root) {
  if (root.Causal) return root.Causal;
  var A = root.Astronomy;
  if (!A && typeof require === 'function') { try { A = require('./astronomy.min.js'); } catch (e) {} }
  if (!A) return { analyze: function () { return ''; } };

  // --- помощники ---
  function norm360(x){ x = x % 360; if (x < 0) x += 360; return x; }
  function rad(d){ return d * Math.PI / 180; }
  function deg(r){ return r * 180 / Math.PI; }
  function obliquity(jd){ var T=(jd-2451545)/36525; return 23.439291111 - 0.0130041667*T - 1.638e-7*T*T + 5.036e-7*T*T*T; }
  function jdFrom(dt){ return dt.getTime()/86400000 + 2440587.5; }
  function angDiff(a, b){ var d = Math.abs(norm360(a - b)); if (d > 180) d = 360 - d; return d; }
  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function plural(n, one, few, many){ n = Math.abs(n); var m10=n%10, m100=n%100; if(m10===1&&m100!==11) return one; if(m10>=2&&m10<=4&&(m100<10||m100>=20)) return few; return many; }

  var SIGNS = ['Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы'];
  var ELEM = ['Огонь','Земля','Воздух','Вода'];
  var CROSS = ['Кардинальный','Фиксированный','Подвижный'];
  function signElem(i){ return ELEM[[0,3,6,9].indexOf(i)>=0?0:([1,4,7,10].indexOf(i)>=0?1:([2,5,8,11].indexOf(i)>=0?2:3))]; }
  function signCross(i){ return CROSS[[0,3,6,9].indexOf(i)>=0?0:([1,4,7,10].indexOf(i)>=0?1:2)]; }

  // Группы аспектов по книге Орловой
  var ASPECT_GROUPS = [
    { key:'tense',    name:'напряжённые', emoji:'🔴', cls:'sk-hard',   angles:[45,90,135,180], tone:-2,
      plain:'такие углы — это «трение» в жизни. Они как камень на пути: требуют труда, терпения, а иногда — большой перестройки. Но по книге именно через них человек растёт и «отрабатывает» свои задачи.' },
    { key:'harm',     name:'гармоничные', emoji:'🟢', cls:'sk-good',   angles:[30,60,120,150], tone:2,
      plain:'такие углы — «подушка» и защита. Они дают везение, лёгкость и надёжность: на это можно опираться. Но важно помнить: если их много, жизнь может пойти «по накатанной» — без резкого роста.' },
    { key:'create',   name:'творческие',  emoji:'🟣', cls:'sk-create', angles:[36,72,108,144], tone:1,
      plain:'такие углы — редкий дар. По книге они показывают, где человек может не просто жить, а свободно творить и проявлять себя необычно. Это то, что можно превратить в талант и «изюминку».' },
    { key:'karmic',   name:'кармические', emoji:'🔵', cls:'sk-karmic', angles:[20,40,80,100], tone:-1,
      plain:'такие углы — «груз из прошлого». По книге они указывают, где приходят самые упрямые, будто «фатальные» события: это не наказание, а урок — то, что надо осознать и переработать. Понимание этого — и есть ключ.' }
  ];
  var ORB = 2.5; // допуск в градусах

  // название и смысл конкретного угла (для каталога ниже)
  var ANGLE_INFO = {
    30:{ n:'полусекстиль', kind:'harm', sense:'мягкий, добрый контакт: окружающие и «среда» помогают, противоречия в характере сглаживаются' },
    36:{ n:'дециль (творческий)', kind:'create', sense:'тонкая способность к творчеству и вдохновению, «нестандартный» внутренний свет' },
    40:{ n:'нонагон (кармический)', kind:'karmic', sense:'упрямо повторяющийся урок; что-то будто «не отпускает», пока не осознано' },
    45:{ n:'полуквадрат', kind:'tense', sense:'напряжение вокруг: мелкие, но частые помехи, заставляющие делать выбор' },
    60:{ n:'секстиль', kind:'harm', sense:'лёгкая помощь и удача, особенно в компании, дружбе, общении' },
    72:{ n:'квинтиль (творческий)', kind:'create', sense:'творческие способности, дар самовыражения, «особая жилка»' },
    80:{ n:'октиль (кармический)', kind:'karmic', sense:'напряжённый урок, связанный с прошлыми долгами' },
    90:{ n:'квадрат', kind:'tense', sense:'периодическая борьба: жизнь «подталкивает» и требует расти через усилие' },
    100:{ n:'дециль (кармический)', kind:'karmic', sense:'глубокий урок по теме дома; то, что надо переосмыслить' },
    108:{ n:'нонагон (творческий)', kind:'create', sense:'творческая переработка, возможность «играть по-своему»' },
    120:{ n:'трин', kind:'harm', sense:'защита, талант, устойчивость; то, что даётся легко и само' },
    135:{ n:'полутораквадрат', kind:'tense', sense:'кармическое напряжение: «возврат долгов», расплата за ошибки' },
    144:{ n:'квинтиль (творческий)', kind:'create', sense:'высокая одарённость, умение творить и «оживлять»' },
    150:{ n:'квиконс', kind:'harm', sense:'перед повторением старой ситуации снимает кризис, даёт понять её по-новому' },
    180:{ n:'оппозиция', kind:'tense', sense:'постоянное напряжение и необходимость выбора — как «две стороны одной медали»' }
  };

  // Планетная «суть» простыми словами
  var P_SENSE = {
    Sun:'ваши жизненные силы, воля, отец, начальство и здоровье',
    Moon:'ваши чувства, настроение, мама, дом и забота',
    Mercury:'ваш ум, речь, письма, учёба, мелкие договорённости',
    Venus:'ваша любовь, вкус, красота, деньги и удовольствия',
    Mars:'ваша сила, смелость, споры, работа и упорство',
    Jupiter:'ваша удача, учителя, вера, богатство и мудрость',
    Saturn:'ваш труд, терпение, ограничения, долг и серьёзность',
    Rahu:'притяжение к новому, «жажда» жизни, современность',
    Ketu:'отстранённость, уход внутрь, связь с прошлым и тонким миром'
  };
  var P_NAME = { Sun:'Солнце', Moon:'Луна', Mercury:'Меркурий', Venus:'Венера', Mars:'Марс', Jupiter:'Юпитер', Saturn:'Сатурн', Rahu:'Раху', Ketu:'Кету' };

  // Куда ведёт тема дома — простым языком
  var HOUSE_SENSE = {
    1:'вы сами, ваше тело и здоровье, как вас воспринимают люди',
    2:'деньги, имущество, семья, привычки',
    3:'братья и сёстры, поездки, письма, смелость, учёба',
    4:'дом, мама, недвижимость, сердце, «корни»',
    5:'дети, творчество, радость, любовь, увлечения',
    6:'работа, здоровье, служение, повседневные заботы',
    7:'брак, партнёры, близкие отношения, открытые союзы',
    8:'общие деньги, перемены, роды, тайны, чужие ресурсы',
    9:'вера, учителя, дальние страны, философия, высшее',
    10:'карьера, отец, начальство, общество, имя',
    11:'друзья, мечты, большие цели, доходы, сообщества',
    12:'уединение, дальние края, тайны, покой, больницы, монастырь'
  };

  // ---- Западные углы (MC/IC) по сидерической долготе (для согласованности с картой) ----
  function sidMC(chart){
    var t = A.MakeTime(chart.utc);
    var gmst = A.SiderealTime(t) * 15;
    var lst = gmst + chart.lon;
    var ramc = rad(lst);
    var eps = rad(obliquity(jdFrom(chart.utc)));
    var lam = Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps));
    var mcTrop = norm360(deg(lam));
    return norm360(mcTrop - (chart.ayanamsa || 0));
  }
  function angleSignLon(lon){ return Math.floor(norm360(lon) / 30); }
  function houseOfLon(lagnaSid, lon){ return Math.floor(norm360(lon - lagnaSid) / 30) + 1; }

  // ---- Аспекты между планетами (по классификации Орловой) ----
  function computeAspects(chart){
    var body = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Rahu','Ketu'];
    var out = [];
    for (var i = 0; i < body.length; i++) {
      for (var j = i + 1; j < body.length; j++) {
        var a = body[i], b = body[j];
        var diff = angDiff(chart.planets[a].sidLon, chart.planets[b].sidLon);
        // ближайший известный угол
        var bestGrade = null, bestDiff = Infinity;
        for (var g = 0; g < ASPECT_GROUPS.length; g++) {
          for (var k = 0; k < ASPECT_GROUPS[g].angles.length; k++) {
            var ang = ASPECT_GROUPS[g].angles[k];
            var d = Math.abs(diff - ang);
            if (d < bestDiff) { bestDiff = d; bestGrade = { group: ASPECT_GROUPS[g], angle: ang }; }
          }
        }
        if (bestGrade && Math.min(bestDiff, 360 - bestDiff) <= ORB) {
          var info = ANGLE_INFO[bestGrade.angle] || { n: bestGrade.angle + '°', kind: bestGrade.group.key, sense: '' };
          out.push({ a: a, b: b, angle: bestGrade.angle, orb: bestDiff, group: bestGrade.group, info: info });
        }
      }
    }
    return out;
  }

  // ---- Конфигурации ----
  function configurations(aspects){
    var res = { cross: false, tsq: false, trine: false, bisext: false };
    var nodes = {}; // каждый общий аспект-«ребро» уже в списке; ищем по наличию нужных углов
    // соберём пары по углам между конкретными планетами
    function has(a, b, ang){ return aspects.some(function(x){ return ((x.a===a&&x.b===b)||(x.a===b&&x.b===a)) && x.angle===ang; }); }
    var body = Object.keys(P_NAME);
    // Большой крест: две оппозиции (180) и четыре квадрата (90), 4 планеты крестом
    // упрощённо: ищем замкнутый квадрат из 4 планет (90-90-90-90)
    for (var ia = 0; ia < body.length; ia++) for (var ib = ia+1; ib < body.length; ib++)
      for (var ic = ib+1; ic < body.length; ic++) for (var id = ic+1; id < body.length; id++){
        if (has(body[ia],body[ib],90)&&has(body[ib],body[ic],90)&&has(body[ic],body[id],90)&&has(body[id],body[ia],90)) res.cross = true;
      }
    // Тау-квадрат: 180 + два 90 (3 планеты)
    for (var ia2 = 0; ia2 < body.length; ia2++) for (var ib2 = ia2+1; ib2 < body.length; ib2++)
      for (var ic2 = ib2+1; ic2 < body.length; ic2++){
        if ((has(body[ia2],body[ib2],180)&&has(body[ia2],body[ic2],90)&&has(body[ib2],body[ic2],90)) ||
            (has(body[ia2],body[ib2],90)&&has(body[ib2],body[ic2],180)&&has(body[ia2],body[ic2],90)) ||
            (has(body[ia2],body[ib2],90)&&has(body[ib2],body[ic2],90)&&has(body[ia2],body[ic2],180))) res.tsq = true;
      }
    // Тригон: три 120
    for (var ia3 = 0; ia3 < body.length; ia3++) for (var ib3 = ia3+1; ib3 < body.length; ib3++)
      for (var ic3 = ib3+1; ic3 < body.length; ic3++){
        if (has(body[ia3],body[ib3],120)&&has(body[ib3],body[ic3],120)&&has(body[ia3],body[ic3],120)) res.trine = true;
      }
    // Бисекстиль: 120 + два 60
    for (var ia4 = 0; ia4 < body.length; ia4++) for (var ib4 = ia4+1; ib4 < body.length; ib4++)
      for (var ic4 = ib4+1; ic4 < body.length; ic4++){
        if ((has(body[ia4],body[ib4],120)&&has(body[ib4],body[ic4],60)&&has(body[ia4],body[ic4],60)) ||
            (has(body[ia4],body[ib4],60)&&has(body[ib4],body[ic4],120)&&has(body[ia4],body[ic4],60)) ||
            (has(body[ia4],body[ib4],60)&&has(body[ib4],body[ic4],60)&&has(body[ia4],body[ic4],120))) res.bisext = true;
      }
    return res;
  }

  // ---- Главная функция ----
  function analyze(chart){
    if (!chart || !chart.planets || !chart.utc) return '';
    try {
      var asp = computeAspects(chart);
      var cfg = configurations(asp);
      var lagnaSign = chart.lagna.signIdx;
      var ascSign = SIGNS[lagnaSign];
      var dscSign = SIGNS[(lagnaSign + 6) % 12];
      var mcLon = sidMC(chart);
      var mcSign = SIGNS[angleSignLon(mcLon)];
      var icLon = norm360(mcLon + 180);
      var icSign = SIGNS[angleSignLon(icLon)];

      // счётчики групп + дома
      var byKey = { tense:[], harm:[], create:[], karmic:[] };
      asp.forEach(function(x){ byKey[x.group.key].push(x); });

      // стихии по планетам
      var elemCount = [0,0,0,0];
      var crossCount = [0,0,0];
      Object.keys(chart.planets).forEach(function(p){
        var i = chart.planets[p].signIdx;
        elemCount[[0,3,6,9].indexOf(i)>=0?0:([1,4,7,10].indexOf(i)>=0?1:([2,5,8,11].indexOf(i)>=0?2:3))]++;
        crossCount[[0,3,6,9].indexOf(i)>=0?0:([1,4,7,10].indexOf(i)>=0?1:2)]++;
      });
      var mainElem = ELEM[elemCount.indexOf(Math.max.apply(null, elemCount))];
      var mainCross = CROSS[crossCount.indexOf(Math.max.apply(null, crossCount))];

      // узлы
      var rahu = chart.planets['Rahu'], ketu = chart.planets['Ketu'];
      var rahuHouse = rahu.house, ketuHouse = ketu.house;

      // ---- процент напряжения/защиты ----
      var totTone = 0, cntT = 0, cntH = 0, cntC = 0, cntK = 0;
      asp.forEach(function(x){
        var t = x.group.tone;
        totTone += t;
        if (t > 0) cntH++;
        else if (t < 0) cntT++;
        else cntC++;
      });
      var aspCount = asp.length;
      var pctTense = aspCount ? Math.round(cntT / aspCount * 100) : 0;
      var pctHarm = aspCount ? Math.round(cntH / aspCount * 100) : 0;
      var pctCreate = aspCount ? Math.round(cntC / aspCount * 100) : 0;
      var pctKarmic = aspCount ? Math.round(cntK / aspCount * 100) : 0;
      // баланс: насколько защита перевешивает напряжение (-1..1)
      // условный баланс на -1..1 (нетто «плюсов» против «минусов»)
      var balance = aspCount ? (cntH - cntT) / aspCount : 0;
      var balPct = aspCount ? Math.max(2, Math.min(98, Math.round(50 + balance * 50))) : 50;

      function clsTone(t){ return t > 0.1 ? 'sk-good' : (t >= -0.1 ? 'sk-mid' : 'sk-hard'); }

      // ---- HTML ----
      var h = '<div class="card story-card causal-card">';
      h += '<h2>🕯️ Причинные аспекты вашего гороскопа</h2>';
      h += '<p class="muted" style="margin-top:0">Метод Е. А. Орловой «Причинные аспекты астрологии» (Тюмень, 2008). Это не предсказание «когда», а чтение <b>программы</b>: где напряжение, где защита, где дар, где кармический груз — и что над чем работать. Построено на вашей карте рождения, без вмешательства в основной разбор.</p>';

      // ---- Баланс ----
      h += '<div class="sk-tone">' +
        '<div class="sk-tone-head"><span class="sk-tone-label">🌡️ Общий баланс: защита против напряжения</span>' +
        '<span class="sk-tone-badge ' + clsTone((cntH - cntT) / Math.max(1, aspCount)) + '">' +
        ((cntH - cntT) >= 0 ? '🟢 спокойных связей больше' : '🔴 напряжённых связей больше') + '</span></div>' +
        '<div class="sk-tone-bar"><span class="sk-tone-fill ' + clsTone((cntH - cntT) / Math.max(1, aspCount)) + '" style="width:' + Math.max(6, balPct) + '%"></span>' +
        '<span class="sk-tone-marks"><i>0</i><i>25</i><i>50</i><i>75</i><i>100</i></span></div>' +
        '<div class="sk-tone-note">' + ((cntH - cntT) >= 0 ? 'У вас больше <b>мирных и добрых</b> связей, чем «трений». Это хорошая основа: на неё можно опираться. Но и «трения», если они есть, — не случайны: по книге это места роста.' : 'У вас заметно больше <b>напряжённых</b> связей. Само по себе это не плохо и не «приговор»: по книге именно через такие углы человек больше всего вырастает и «отрабатывает» своё. Главное — понять, в какой сфере.') + '</div>' +
        '<div class="sk-legend"><span class="sk-legend-item sk-good">🟢 защита/дар</span>' +
        '<span class="sk-legend-item sk-mid">смешанно</span>' +
        '<span class="sk-legend-item sk-hard">🔴 напряжение</span></div>' +
        '</div>';

      // ---- Вводный рассказ ----
      h += '<h3>📜 О чём этот разбор и что он вам даст</h3>';
      h += '<p class="muted" style="margin-top:0">Астрологи давно смотрят не только «какие у вас черты», но и <b>какую задачу человек принёс с собой</b>. Е. А. Орлова предложила раскрашивать аспекты (углы между планетами) в четыре цвета в зависимости от того, <b>что они «делают» с судьбой</b>:</p>';
      var legendRows = ASPECT_GROUPS.map(function(g){
        return '<li><span class="sk-badge ' + g.cls + '">' + g.emoji + ' ' + g.name + '</span> ' + g.plain + '</li>';
      }).join('');
      h += '<ul class="fs-month">' + legendRows + '</ul>';
      h += '<p style="margin-top:8px">Ниже я разложил именно <b>ваши</b> аспекты по этим краскам, нашёл главные «узлы» карты — и постарался объяснить <b>совсем простыми словами</b>, что это значит для вас.</p>';
      h += '<details class="fs-more" style="margin-top:8px"><summary>▸ Арсенал профессионала: как это посчитано (коротко)</summary>' +
        '<p class="muted" style="margin-top:0">Углы между планетами берутся в градусах. Каждый угол относится к одной из четырёх групп: напряжённые (45–90–135–180°), гармоничные (30–60–120–150°), творческие (36–72–108–144°), кармические (20–40–80–100°). Допуск точности — около 2,5°. Конфигурации (крест, тау-квадрат, тригон, бисекстиль) находим по наличию нужных углов между одними и теми же планетами. Лунные узлы (Раху/Кету) и их дома — из вашей карты.</p></details>';

      // ---- 1. Стихии и крест ----
      h += '<h3>🧬 1. Ваш характер: стихия и крест</h3>';
      var elemPlain = { Огонь:'Огненные люди горячие и инициативные — им важно начинать, вести и зажигать других.', Земля:'Земные люди практичные и надёжные — им важно осязаемое дело и ощутимый результат.', Воздух:'Воздушные люди общительные и думающие — им важны разговор, идеи и обмен мыслями.', Вода:'Водные люди чувствительные и глубокие — им важно чувствовать, сопереживать и понимать тонкое.' };
      var crossPlain = { Кардинальный:'кардинальный крест — это люди воли: они делают первый шаг и идут к цели напрямик.', Фиксированный:'фиксированный крест — это люди основательные: долго готовятся, но зато держатся крепко и доводят до конца.', Подвижный:'подвижный крест — это люди гибкие: умеют «поймать момент» и приспособиться к обстоятельствам.' };
      h += '<p>Среди планет в вашем гороскопе сильнее всего выражена стихия <b>' + mainElem + '</b>. ' + elemPlain[mainElem] + '</p>';
      h += '<p>А по «кресту» (то есть по тому, <b>как</b> вы двигаетесь по жизни) выделяется <b>' + mainCross + '</b>. ' + crossPlain[mainCross] + '</p>';
      h += '<p class="muted">Это основа, на которой лежит всё остальное: природный «фундамент», с которым вы живёте большую часть времени.</p>';

      // ---- 2. Углы ----
      h += '<h3>🧭 2. Четыре угла вашей карты (Асцендент-Десцендент, МС-IC)</h3>';
      var angs = [
        { title:'Асцендент (восход) — с чего вы начинаете', sign: ascSign,
          desc:'знак, который восходил на горизонте в момент вашего рождения. Это ваше «лицо», как вы проявляетесь, ваше тело, здоровье и то, как вас встречают люди. Ваш асцендент — <b>' + ascSign + '</b>.' },
        { title:'Десцендент (закат) — чему учиться в отношениях', sign: dscSign,
          desc:'знак напротив. Это то, чего вам не хватает для гармонии и к чему тянет в близости: черты партнёра, которые вам надо «принять» в себе. Ваш десцендент — <b>' + dscSign + '</b>.' },
        { title:'Середина неба (МС) — ваша цель и вершина', sign: mcSign,
          desc:'самая высокая точка. Это куда вы нацелены в жизни: карьера, призвание, «кем стать». Ваш МС — <b>' + mcSign + '</b>.' },
        { title:'Основание неба (IC) — откуда вы пришли', sign: icSign,
          desc:'самая нижняя точка. Это ваши корни, род, дом, мама, то, что заложено до вас. Ваш IC — <b>' + icSign + '</b>.' }
      ];
      h += "<ul class='fs-month'>" + angs.map(function(a){ return '<li><span class="sk-badge sk-mid">🧭</span> <b>' + a.title + '</b> — ' + a.desc + '</li>'; }).join('') + '</ul>';

      // ---- 3. Лунные узлы ----
      h += '<h3>🌗 3. Лунные узлы: «куда идти» и «что наработано»</h3>';
      var rahuSense = HOUSE_SENSE[rahuHouse], ketuSense = HOUSE_SENSE[ketuHouse];
      h += '<p>Лунные узлы — особая точка карты, их по книге рисуют как два сосуда: <b>Раху — пустой сосуд</b> (то, что предстоит наполнить, куда идти), а <b>Кету — полный сосуд</b> (то, что уже наработано, что можно использовать).</p>';
      h += '<p>По книге <b>Раху (восходящий узел)</b> в вашей карте стоит в <b>' + rahuHouse + '-м доме</b> — «' + rahuSense + '». Это <b>направление вашего роста</b>: вам стоит осваивать именно эту сферу.</p>';
      h += '<p><b>Кету (заходящий узел)</b> — в <b>' + ketuHouse + '-м доме</b> — «' + ketuSense + '». Это <b>ваш «багаж»</b>: то, что уже наработано в прошлых жизнях и должно, скорее, <b>отойти на второй план</b> (отработать, а не цепляться), чтобы освободить место для роста.</p>';
      h += '<p class="muted">Проще говоря: из дома Кету — «вынести» и отпустить, а в дом Раху — «наполнить» и научиться. Это две стороны одного рычага вашей судьбы.</p>';

      // ---- 4. Аспекты по группам ----
      function renderGroup(g){
        var list = byKey[g.key];
        if (!list.length) return '<h3>' + g.emoji + ' ' + g.name[0].toUpperCase() + g.name.slice(1) + ' аспекты</h3><p class="muted">Таких углов в вашем гороскопе не нашлось.</p>';
        var items = list.map(function(x){
          var houseA = chart.planets[x.a].house, houseB = chart.planets[x.b].house;
          return '<li><span class="sk-badge ' + g.cls + '">' + g.emoji + '</span> <b>' + P_NAME[x.a] + '</b> (' + chart.planets[x.a].sign + ', ' + houseA + '-й дом) — угол ' + x.angle + '° (' + x.info.n + ') — <b>' + P_NAME[x.b] + '</b> (' + chart.planets[x.b].sign + ', ' + houseB + '-й дом), точность ' + x.orb.toFixed(1) + '°.<br><span class="muted">Что это значит: ' + x.info.sense + '.</span> <span class="muted">Связь тем: ' + P_SENSE[x.a] + ' ↔ ' + P_SENSE[x.b] + '.</span></li>';
        }).join('');
        return '<h3>' + g.emoji + ' ' + g.name[0].toUpperCase() + g.name.slice(1) + ' аспекты (' + list.length + plural(list.length,' — один',' — найдено',' — найдено') + ')</h3>' +
          '<ul class="fs-month">' + items + '</ul>';
      }
      // порядок: сначала напряжение и гармония — самые важные, потом дар и карма
      h += '<h3>🧩 4. Ваши аспекты по краскам</h3>';
      h += renderGroup(ASPECT_GROUPS[1]); // гармония
      h += renderGroup(ASPECT_GROUPS[0]); // напряжение
      h += renderGroup(ASPECT_GROUPS[2]); // творческие
      h += renderGroup(ASPECT_GROUPS[3]); // кармические

      // ---- 5. Конфигурации ----
      h += '<h3>⚙️ 5. Рисунки из аспектов (главные «узлы» карты)</h3>';
      var cfgs = [];
      if (cfg.cross) cfgs.push({ cls:'sk-hard', head:'Большой крест', body:'крест из четырёх квадратов и двух оппозиций. По книге он действует постоянно, «держит» человека в критических ситуациях и заставляет расти через них. Это не наказание, а большая задача — и большая возможность выйти изменённым.' });
      if (cfg.tsq) cfgs.push({ cls:'sk-hard', head:'Тау-квадрат', body:'оппозиция и два квадрата — «замок на пути». Действует импульсно, резко и неожиданно: это испытание, которое надо пережить и понять.' });
      if (cfg.trine) cfgs.push({ cls:'sk-good', head:'Тригон', body:'треугольник из трёх тринов (120°). Это ваш «космический щит»: стабильность, защита, умение накапливать силу. Но осторожно — при избытке может дать и застой, когда жизнь идёт «по накатанной» без яркого роста.' });
      if (cfg.bisext) cfgs.push({ cls:'sk-good', head:'Бисекстиль', body:'трин и два секстиля — «амортизатор»: он смягчает жизненные трудности, даёт легкость и радость восприятия жизни.' });
      if (!cfgs.length) cfgs.push({ cls:'sk-mid', head:'Чёткой фигуры не сложилось', body:'В вашей карте нет ярко выраженного «большого» рисунка из аспектов — жизнь идёт более ровно, без одного постоянного «узла». Это не плохо: значит, главные уроки идут через отдельные углы, а не через одну общую фигуру.' });
      h += '<ul class="fs-month">' + cfgs.map(function(c){ return '<li><span class="sk-badge ' + c.cls + '">' + (c.cls==='sk-hard'?'🔴':'🟢') + '</span> <b>' + c.head + '</b> — ' + c.body + '</li>'; }).join('') + '</ul>';

      // ---- 6. Главный вывод ----
      h += '<h3>🔑 6. Главный вывод: что отрабатывать сейчас</h3>';
      // дом с наибольшим «напряжением»: считаем, куда ссылается больше всего напряжённых аспектов
      var houseLoad = {};
      var tenseHouses = [];
      byKey.tense.forEach(function(x){
        [chart.planets[x.a].house, chart.planets[x.b].house].forEach(function(hh){
          houseLoad[hh] = (houseLoad[hh] || 0) + 1;
        });
      });
      var maxLoadHouse = null, maxLoad = 0;
      for (var hh in houseLoad){ if (houseLoad[hh] > maxLoad){ maxLoad = houseLoad[hh]; maxLoadHouse = +hh; } }
      // также учитываем узлы
      var priorityHouses = [];
      if (rahuHouse) priorityHouses.push(rahuHouse);
      if (maxLoadHouse) priorityHouses.push(maxLoadHouse);
      if (ketuHouse) priorityHouses.push(ketuHouse);
      priorityHouses = priorityHouses.filter(function(v,i,a){ return a.indexOf(v)===i; });

      if (priorityHouses.length) {
        h += '<p>По сумме напряжённых углов и положению лунных узлов самые «заряженные» сферы вашей жизни:</p>';
        h += '<ul class="fs-month">' + priorityHouses.map(function(hh){
          var isRahu = hh === rahuHouse, isKetu = hh === ketuHouse;
          var tag = isRahu ? '🟢 сюда — расти (Раху)' : (isKetu ? '🌀 отсюда — отпустить (Кету)' : '⚡ здесь нагрузка');
          return '<li><span class="sk-badge ' + (isKetu ? 'sk-mid' : (isRahu ? 'sk-good' : 'sk-hard')) + '">' + tag + '</span> <b>' + hh + '-й дом</b> — «' + HOUSE_SENSE[hh] + '». ' +
            (isRahu ? 'Это то, куда стоит <b>научиться идти</b>: осваивать, наполнять.' :
            (isKetu ? 'Это то, что уже <b>наработано</b>: лучше использовать понемногу, но не цепляться за него — оно вас не «растит».' :
            'Здесь у вас больше всего «трений» — это <b>точка внимания</b>: осознанная работа даст самый большой рост.')) + '</li>';
        }).join('') + '</ul>';
      } else {
        h += '<p>По расчёту у вас нет резко выраженной «горячей» сферы — жизнь идёт ровно. Это хорошо: вы не «заперты» в одной задаче.</p>';
      }

      // рекомендация простыми словами (обязательная, независимо от данных
      var rec = byKey.tense.length > byKey.harm.length
        ? 'Поскольку напряжённых углов заметно больше, по книге главный совет — <b>не бороться с напряжением, а понять его</b>: в какой сфере оно сидит. Это и есть ваша «работа». Остальное — вопрос осознанности и терпения.'
        : (byKey.harm.length > 0
          ? 'У вас крепкий «тыл» из добрых аспектов. По книге важно не «плыть» на нём в застой: используйте защиту как опору, но обязательно — двигайтесь в сторону Раху (своего роста), иначе мера покоя может незаметно превратиться в остановку.'
          : 'В вашем гороскопе мало и «плюсов», и «минусов» — жизнь идёт ровно, без резких качелей. Главный совет: не ждать громких событий, а спокойно и упорно делать своё — именно так к вам приходит рост.');
      h += '<div class="sakoyan-narr"><p>' + rec + '</p></div>';

      h += '<p class="muted" style="margin-top:8px">⚠️ Этот разбор не предсказывает события и не «приговаривает» судьбу. По самой книге главное правило — <b>вы свободны</b>: карта показывает <i>где</i> и <i>что</i> надо осознать, а как с этим жить — решаете вы. Это ориентир, а не приговор.</p>';
      h += '<details class="fs-tech" style="margin-top:8px"><summary>🔍 Технические детали: все углы с орбисами</summary><div class="card">' +
        '<table class="mtable"><thead><tr><th>Планеты</th><th>Угол</th><th>Группа</th><th>Орб</th></tr></thead><tbody>' +
        asp.map(function(x){ return '<tr><td>' + P_NAME[x.a] + '–' + P_NAME[x.b] + '</td><td>' + x.angle + '°</td><td>' + x.group.emoji + ' ' + x.group.name + '</td><td>' + x.orb.toFixed(1) + '°</td></tr>'; }).join('') +
        '</tbody></table>' + (asp.length ? '' : '<p class="muted">Не найдено ни одного угла в пределах допуска.</p>') + '</div></details>';

      h += '</div>';
      return h;
    } catch (e) { return ''; }
  }

  return { analyze: analyze, THEORY: 'Орлова, Причинные аспекты' };
});
