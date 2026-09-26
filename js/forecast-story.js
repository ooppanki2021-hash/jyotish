/* forecast-story.js — «Рассказ о периоде»: живой текст вместо терминов.
   Строит повествование о текущей махадаше/антадаше, транзитах, годе
   (варшапхал) и план действий на день/неделю/месяц/год.
   Экспортирует ForecastStory.buildHTML(chart). UMD + защита от двойного подключения. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(root || {}); }
  else { root.ForecastStory = factory(root); }
})(typeof self !== 'undefined' ? self : this, function (root) {
  if (root.ForecastStory) return root.ForecastStory;

  var J = root.Jyotish;
  var VP = root.Varshaphal;
  if (!J && typeof require === 'function') { J = require('./jyotish.js'); }
  if (!VP && typeof require === 'function') { try { VP = require('./varshaphal.js'); } catch (e) {} }

  var HOUSE_T = {
    1:'характер и самопроявление', 2:'деньги и ценности', 3:'общение и навыки', 4:'дом и внутренний покой',
    5:'творчество, дети и любовь', 6:'работа и здоровье', 7:'брак и партнёрство', 8:'трансформации и общие ресурсы',
    9:'удача, учение и дороги', 10:'карьера и статус', 11:'доход и сообщество', 12:'уединение и завершение'
  };
  var RU2EN = { 'Солнце':'Sun','Луна':'Moon','Меркурий':'Mercury','Венера':'Venus','Марс':'Mars','Юпитер':'Jupiter','Сатурн':'Saturn','Раху':'Rahu','Кету':'Ketu' };
  var GEN = { 'Солнце':'Солнца','Луна':'Луны','Меркурий':'Меркурия','Венера':'Венеры','Марс':'Марса','Юпитер':'Юпитера','Сатурн':'Сатурна','Раху':'Раху','Кету':'Кету' };
  var THEME_SHORT = {
    'Солнце':'цели, статус и видимость', 'Луна':'дом, эмоции и забота', 'Меркурий':'ум, контакты и сделки',
    'Венера':'любовь, деньги и красота', 'Марс':'энергия и решительные действия', 'Юпитер':'рост, учёба и возможности',
    'Сатурн':'структура, зрелость и долгие проекты', 'Раху':'амбиции и новые направления', 'Кету':'завершение и глубина'
  };
  function g(ru){ return GEN[ru] || ru; }

  // Главная тема периода планеты
  var THEME = {
    'Солнце':'время целей, статуса и видимости: хочется, чтобы вас заметили, — и это нормально',
    'Луна':'время эмоций, дома и адаптации: настроение меняется чаще обычного',
    'Меркурий':'время ума, контактов и сделок: обучение, переговоры и документы идут легко',
    'Венера':'время любви, денег и красоты: отношения и финансы выходят на первый план',
    'Марс':'время энергии и рывка: сил много, главное — направить их в дело, а не в споры',
    'Юпитер':'время роста и возможностей: открываются двери — наставники, учёба, поездки',
    'Сатурн':'время взрослости и структуры: идёт медленнее, чем хочется, но построенное сейчас — долговечно',
    'Раху':'время амбиций и нового: тянет в непривычные направления',
    'Кету':'время переосмысления и отпускания: важно завершить лишнее и не держаться за отжившее'
  };

  // Что хорошо делать в период планеты / чего избегать
  var FITS = {
    'Солнце':{ do:'показывать результаты, просить статус и повышение, общаться с руководством', avoid:'конфликтов со старшими и самоуверенности' },
    'Луна':{ do:'дел дома и семьи, заботы о теле, мягко адаптироваться к переменам', avoid:'важных решений на эмоциональных качелях' },
    'Меркурий':{ do:'учёбы, переговоров, документов, торговли и коротких поездок', avoid:'распыления — не больше двух проектов одновременно' },
    'Венера':{ do:'отношений, покупок для дома и красоты, творческих проектов', avoid:'трат «на эмоциях»' },
    'Марс':{ do:'старта давно отложенного, спорта, решительных шагов', avoid:'спешки с документами и конфликтов на дороге' },
    'Юпитер':{ do:'учёбы, поездок, расширения, поиска наставников и поддержки', avoid:'обещаний сверх возможностей' },
    'Сатурн':{ do:'долгих проектов, недвижимости, режима и терпения', avoid:'ожидания быстрых результатов и срезания углов', nom:'долгие проекты, недвижимость, режим' },
    'Раху':{ do:'новых направлений, технологий, связей и смелых целей', avoid:'сомнительных сделок и «лёгких» денег', nom:'новые направления, технологии, смелые цели' },
    'Кету':{ do:'завершения старых дел, учёбы, практик осознанности', avoid:'давления там, где нет отклика', nom:'завершение дел, учёба, практики осознанности' }
  };
  // именительные формы для «что хорошо» остальных планет
  FITS['Солнце'].nom = 'цели, статус, публичность';
  FITS['Луна'].nom = 'дом, семья, забота о теле';
  FITS['Меркурий'].nom = 'учёба, переговоры, документы, торговля';
  FITS['Венера'].nom = 'отношения, красота, творческие проекты';
  FITS['Марс'].nom = 'старты, спорт, решительные шаги';
  FITS['Юпитер'].nom = 'учёба, поездки, расширение и наставники';

  // 🔴 Строго нельзя / 🟡 менее рисковано (с осторожностью) — по планете периода
  var STRICT = {
    'Солнце':'сжигать мосты с руководством и покровителями; принимать решения из уязвлённого самолюбия; конфликтовать с отцом и наставниками',
    'Луна':'принимать судьбоносные решения на эмоциях; рубить семейные связи в порыве гнева; жертвовать сном и отдыхом ради дел',
    'Меркурий':'подписывать документы не читая; распускать слухи и давать пустые обещания; хвататься за несколько важных дел сразу',
    'Венера':'крупные покупки «на эмоциях»; кредиты ради роскоши; ввязываться в любовные треугольники',
    'Марс':'ультиматумы и агрессия на словах; спешка с документами и за рулём; конфликты с заведомо более сильными',
    'Юпитер':'обещания сверх возможностей и долги «до последней копейки»; ставки на одну «верную» сделку; игнорировать законы и правила',
    'Сатурн':'искать лёгкие схемы и обходные пути; бросать начатое из-за медленных результатов; ломать режим ради сиюминутного желания',
    'Раху':'сомнительные сделки и финансовые пирамиды; скрывать факты в документах и переговорах; слепо гнаться за хайпом',
    'Кету':'навязывать события там, где нет отклика; реанимировать завершённые отношения и проекты; уходить в глухую изоляцию'
  };
  var CAUTION = {
    'Солнце':'просить повышения и статуса можно — но с фактами на руках и после подготовки; публичные выступления — после репетиции',
    'Луна':'начинать новое можно — только на спокойную голову; траты — по заранее составленному списку',
    'Меркурий':'менять планы на ходу допустимо — если всё фиксируете письменно; покупки для учёбы и связи — после сравнения вариантов',
    'Венера':'баловать себя можно — на заранее отложенную сумму; новые знакомства — без быстрых обещаний',
    'Марс':'резкие шаги возможны — после паузы «на десять вдохов»; спортивные рекорды — с разминкой и без рывков',
    'Юпитер':'расширение возможно — поэтапно и с запасом прочности; помощь другим — без ущерба своим ресурсам',
    'Сатурн':'долгие переговоры возможны — фиксируйте всё письменно; новую нагрузку берите, только сняв старую',
    'Раху':'новые направления возможны — после двойной проверки фактов; риск допустим мелкий и просчитанный',
    'Кету':'уединение полезно — дозированно; завершение старых дел — без сожалений о отпущенном'
  };

  var DAY_PLANETS = ['Солнце','Луна','Марс','Меркурий','Юпитер','Венера','Сатурн']; // вс..сб
  var DAY_NAMES = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
  var DAY_TIP = {
    'Солнце':{ do:'важные встречи, планирование, публичность', avoid:'суеты и хвастовства', must:'утверждать планы и держать достоинство' },
    'Луна':{ do:'семейных дел, заботы, домашних покупок', avoid:'стартов «на эмоциях»', must:'прислушиваться к интуиции и заботиться о доме и теле' },
    'Марс':{ do:'физической работы, спорта, решительных шагов', avoid:'споров и спешки', must:'действовать и сжигать энергию в движении' },
    'Меркурий':{ do:'документов, звонков, встреч и покупок', avoid:'подписывать не читая', must:'собирать информацию, договариваться и записывать мысли' },
    'Юпитер':{ do:'учёбы, встреч с наставниками, финансовых планов', avoid:'чрезмерной щедрости', must:'учиться, планировать расширение и просить поддержку' },
    'Венера':{ do:'отношений, красоты, покупок «для радости»', avoid:'импульсивных трат', must:'налаживать отношения и создавать уют' },
    'Сатурн':{ do:'планов, уборки, режима, бумажных дел', avoid:'начинать новое без плана', must:'наводить порядок, держать слово и режим' }
  };

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function fmt(d){ return d.getDate() + '.' + (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  function fmtLong(d){ return d.getDate() + ' ' + ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'][d.getMonth()] + ' ' + d.getFullYear(); }

  // Дата выхода транзитной планеты из текущего знака (шаг 1 день)
  function signExitDate(key, maxDays){
    var start = J.transits()[key].signIdx;
    var d = new Date();
    for (var i = 1; i <= maxDays; i++) {
      d = new Date(d.getTime() + 86400000);
      if (J.transits(d)[key].signIdx !== start) return new Date(d.getTime() - 86400000);
    }
    return null;
  }

  function houseOf(chart, signIdx){ return ((signIdx - chart.lagna.signIdx) + 12) % 12 + 1; }

  /* ---------- Сферы жизни (выбор сферы в личной прогностике) ---------- */
  // Знак -> хозяин дома (ключи планет как в chart.planets)
  var SIGN_LORD_EN = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
  var PH = root.PLANETS_RU || {};
  function ruOf(chart, key){ return (chart.planets[key] && chart.planets[key].ru) || PH[key] || key; }

  // Сфера -> дом и карточка текстов (можно менять/расширять формулировки)
  var SPHERES = {
    love:     { house:7, label:'Любовь, отношения, брак', what:'партнёрство, серьёзные отношения, знакомства, брак', do:'укреплять отношения, идти на сближение, обсуждать планы пары', caution:'не решать судьбоносные вопросы в спешке и не давить на партнёра' },
    children: { house:5, label:'Дети, творчество, вдохновение', what:'дети, творческие проекты, вдохновение', do:'время детей, творческих и учебных начинаний, лёгкого радостного дела', caution:'не ждать мгновенных плодов, если дом не в фокусе' },
    realty:   { house:4, label:'Недвижимость, дом, переезд', what:'дом, семья, недвижимость, внутренний покой', do:'заниматься домом, покупкой/арендой жилья, наводить «корни» и уют', caution:'сделки с недвижимостью оформлять внимательно и без лишней спешки' },
    money:    { house:2, label:'Деньги, доход, накопления', what:'доход, накопления, ценности', do:'зарабатывать, копить, приводить бюджет в порядок, справедливые сделки', caution:'не рисковать всем ради быстрой выгоды' },
    career:   { house:10, label:'Карьера, работа, статус', what:'работа, статус, признание, дело жизни', do:'строить карьеру, просить повышения, публично показывать результат', caution:'не торопить события там, где важны репутация и сроки' },
    travel:   { house:9, label:'Поездки, учёба, дальние дороги', what:'дальние поездки, учёба, наставники, расширение кругозора', do:'учиться, путешествовать, обращаться к наставникам, планировать дальние планы', caution:'заграничные поездки и большие планы согласовывать с реальными сроками' },
    health:   { house:6, label:'Здоровье, работа и профилактика', what:'здоровье, режим, ежедневная работа, преодоление препятствий', do:'лечиться, наладить режим и питание, системно решать рабочие задачи', caution:'«экзамен» тут требует терпения — без него не будет результата' },
    social:   { house:3, label:'Встречи, переговоры, общение', what:'общение, встречи, переговоры, навыки, короткие поездки', do:'назначать важные встречи, вести переговоры, учиться и заводить полезные контакты', caution:'не распыляться: делайте ставку на две-три ключевые встречи' },
    general:  { house:1, label:'Важное дело, самореализация', what:'личная инициатива, самопроявление, важное начинание', do:'стартовать главное дело, проявлять себя, брать ответственность', caution:'не начинать новое «в споре с собой» — сначала ясность цели' }
  };

  // Дата, когда транзитная планета войдёт в дату (дом) от Лагны. Шаг 3 дня, затем уточнение.
  function planetEnterHouse(planetKey, house, li, maxDays){
    function hv(dt){ try { var tr = J.transits(dt); return ((tr[planetKey].signIdx - li + 12) % 12) + 1; } catch (e) { return -1; } }
    var d = new Date();
    var step = 3;
    var coarse = null;
    for (var m = 0; m <= maxDays; m += step) {
      var dt2 = new Date(d.getTime() + m * 86400000);
      if (hv(dt2) === house) { coarse = dt2; break; }
    }
    if (!coarse) return null;
    // уточняем к самому раннему дню в этом доме (идём назад)
    var earliest = coarse;
    for (var b = 0; b <= step; b++) {
      var dt3 = new Date(coarse.getTime() - b * 86400000);
      if (hv(dt3) === house) earliest = dt3; else break;
    }
    return earliest;
  }

  // Блок «когда для сферы лучше время» в личной прогностике. Безопасно: при ошибке вернёт ''.
  function buildSphereHTML(chart, name, key){
    if (!chart || !chart.lagna || !chart.lagna.signIdx) return '';
    var s = SPHERES[key]; if (!s) return '';
    var li = chart.lagna.signIdx;
    function hh(x){ return (x - li + 12) % 12 + 1; }
    function enOf(ru){ return RU2EN[ru] || ru; }
    var lordKey = SIGN_LORD_EN[(li + s.house - 1) % 12];
    // планеты, «связанные» со сферой: в доме или хозяин дома
    var conn = {};
    conn[lordKey] = true;
    var inHouse = [];
    for (var k in chart.planets) { if (chart.planets[k].house === s.house) { conn[k] = true; inHouse.push(ruOf(chart, k)); } }
    var lordName = ruOf(chart, lordKey);
    var lordHouse = (chart.planets[lordKey] && chart.planets[lordKey].house) || null;

    var tr; try { tr = J.transits(); } catch (e) { tr = null; }
    var jH = tr ? hh(tr.Jupiter.signIdx) : null;
    var sH = tr ? hh(tr.Saturn.signIdx) : null;

    var score = 0, reasons = [];
    var maha = chart.currentMaha, antar = chart.currentAntar;
    if (maha && conn[enOf(maha.planet)]) { score += 1; reasons.push('текущая махадаша ' + maha.planet + ' связана с этой сферой'); }
    if (antar && conn[enOf(antar.planet)]) { score += 1; reasons.push('текущая антардаша ' + antar.planet + ' тоже в этой теме'); }
    if (jH === s.house) { score += 2; reasons.push('Юпитер сейчас в ' + s.house + '-м доме — поддержка'); }
    else if (jH != null && ((jH - s.house + 12) % 12 === 4 || (s.house - jH + 12) % 12 === 4)) { score += 1; reasons.push('Юпитер даёт поддерживающий тригон к ' + s.house + '-му дому'); }
    if (sH === s.house) { score -= 2; reasons.push('Сатурн сейчас в ' + s.house + '-м доме — требует зрелости и терпения'); }
    else if (sH != null && (sH - s.house + 12) % 12 === 6) { score -= 1; reasons.push('Сатурн даёт дополнительную нагрузку по этой сфере'); }

    var verdict = score >= 2 ? ['🟢', 'благоприятно — сфера активна сейчас']
      : score >= 0 ? ['🟡', 'нейтрально — можно действовать, но постепенно']
      : ['🔴', 'сейчас не сезон — лучше подготовить почву и дождаться подходящего окна'];

    // окна по датам — ближайшие и полезные (в горизонте ~20 лет)
    var windows = [];
    function connP(ruP){ return conn[enOf(ruP)]; }
    var now = new Date();
    var horizon = now.getTime() + 20 * 365.25 * 86400000;
    var cands = [];
    var list = chart.currentAntarList || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].start > now && connP(list[i].planet)) cands.push({ d: list[i].start, t: 'с ' + fmt(list[i].start) + ' по ' + fmt(list[i].end) + ' — подпериод ' + list[i].planet });
    }
    var ml = chart.mahadasha || [];
    for (var j = 0; j < ml.length; j++) {
      if (ml[j].start > now && ml[j].start.getTime() < horizon && connP(ml[j].planet)) cands.push({ d: ml[j].start, t: 'с ' + fmt(ml[j].start) + ' — большая глава ' + ml[j].planet });
    }
    cands.sort(function (a, b) { return a.d - b.d; });
    var jEntry = planetEnterHouse('Jupiter', s.house, li, 1095);
    var sEntry = planetEnterHouse('Saturn', s.house, li, 2190);
    if (jEntry) cands.push({ d: jEntry, t: 'Юпитер войдёт в ' + s.house + '-й дом около ' + fmt(jEntry) + ' — поддержка темы' });
    if (sEntry) cands.push({ d: sEntry, t: 'Сатурн войдёт в ' + s.house + '-й дом около ' + fmt(sEntry) + ' — время долгой работы и оформления темы' });
    cands.sort(function (a, b) { return a.d - b.d; });
    for (var c = 0; c < cands.length && windows.length < 4; c++) windows.push(cands[c].t);

    var vcls = verdict[0] === '🟢' ? 'v-ok' : verdict[0] === '🔴' ? 'v-no' : 'v-warn';
    var h = '<div class="sphere-block">';
    h += '<h3>🎯 Сфера: ' + esc(s.label) + '</h3>';
    h += '<p class="muted">Когда для этой сферы лучше время — по вашей карте: текущие периоды и транзиты, которые «включают» тему.</p>';
    h += '<p>Сфера связана с вашим <b>' + s.house + '-м домом</b> («' + HOUSE_T[s.house] + '»)' +
      (inHouse.length ? '. Стоит здесь: ' + inHouse.join(', ') : '') +
      (lordName ? '. Управитель — ' + lordName + (lordHouse ? ' (' + lordHouse + '-й дом)' : '') : '') + '.</p>';
    h += '<p class="sphere-verdict ' + vcls + '"><b>' + verdict[0] + ' ' + verdict[1] + '</b>' +
      (reasons.length ? ' <span class="muted">' + esc(reasons.join('; ')) + '</span>' : '') + '</p>';
    h += '<p><b>Что делать:</b> ' + esc(s.do) + '. <span class="muted">' + esc(s.caution) + '</span></p>';
    h += '<p class="muted" style="margin-top:6px">Это окна возможностей и фокус периодов, а не гарантия события — решение всегда за реальными обстоятельствами.</p>';
    if (windows.length) {
      h += '<details class="fs-more"><summary>▸ Когда сфера «включится» — окна по датам</summary><ul class="fs-month">' +
        windows.map(function (w) { return '<li>' + w + '</li>'; }).join('') + '</ul></details>';
    } else {
      h += '<p class="muted">В ближайшие годы явных «включающих» окон не видно — сфера больше требует поддержки и постепенности, чем большого старта.</p>';
    }
    h += '</div>';
    return h;
  }

  function buildHTML(chart, name){
    var who = name ? (', ' + name) : '';
    var maha = chart.currentMaha, antar = chart.currentAntar;
    var mahaKey = RU2EN[maha.planet], mahaPl = chart.planets[mahaKey];
    var out = [];

    /* ---------- 1. Рассказ о периоде ---------- */
    var years = Math.round((maha.end - maha.start) / (365.25 * 86400000) * 10) / 10;
    var p = [];
    p.push('Сейчас у вас идёт период <b>' + esc(g(maha.planet)) + '</b> — с ' + fmt(maha.start) + ' по <b>' + fmt(maha.end) + '</b> (' + years + ' лет). По-ведически это называется «махадаша», но суть простая: это глава жизни под управлением одной планеты. ' + THEME[maha.planet] + '.');

    // где стоит хозяин периода
    var lordLine = '';
    if (mahaPl) {
      lordLine = 'Хозяин периода стоит у вас в <b>' + mahaPl.house + '-м доме</b> — «' + HOUSE_T[mahaPl.house] + '», поэтому события этих лет разворачиваются в первую очередь через эту сферу';
      if (mahaPl.dignity === 'в экзальтации' || mahaPl.dignity === 'в собственном знаке') {
        lordLine += '. Хорошая новость: хозяин периода силён (' + mahaPl.dignity + ') — период скорее даёт, чем требует.';
      } else if (mahaPl.dignity === 'в падении') {
        lordLine += '. Хозяин периода ослаблен — результаты приходят с задержкой, и период требует дисциплины, но именно это делает вас сильнее.';
      } else if (mahaPl.combust) {
        lordLine += '. Хозяин периода сожжён Солнцем: не торопитесь, решения принимайте на свежую голову.';
      } else {
        lordLine += '.';
      }
    }
    if (lordLine) p.push(lordLine);

    var fits = FITS[maha.planet];
    if (fits) p.push('Что хорошо делать в эти годы: ' + fits.do + '.');
    if (STRICT[maha.planet]) p.push('<b style="color:#c0392b">🔴 Что строго нельзя в период ' + esc(g(maha.planet)) + ':</b> ' + STRICT[maha.planet] + '.');
    if (CAUTION[maha.planet]) p.push('<b style="color:#b7950b">🟡 Менее рисковано, но с осторожностью:</b> ' + CAUTION[maha.planet] + '.');

    // подпериод
    var antEnd = antar.end;
    p.push('Внутри периода до <b>' + fmt(antEnd) + '</b> идёт подпериод <b>' + esc(g(antar.planet)) + '</b> — ' + THEME[antar.planet] + '. Это и есть главный фокус прямо сейчас: события «окрашены» темой «' + (THEME_SHORT[antar.planet] || antar.planet) + '».');
    // что дальше в подпериодах
    var list = chart.currentAntarList || [];
    var next = null;
    for (var i = 0; i < list.length; i++) { if (list[i].start >= antEnd - 86400000) { next = list[i]; break; } }
    if (next) {
      p.push('Затем, с ' + fmt(next.start) + ', начнётся подпериод <b>' + esc(g(next.planet)) + '</b> (до ' + fmt(next.end) + ') — фокус сместится на «' + (THEME_SHORT[next.planet] || 'темы ' + next.planet) + '».');
    }
    // следующая махадаша
    var mlist = chart.mahadasha || [];
    var nextM = null;
    for (var j = 0; j < mlist.length; j++) { if (mlist[j].start >= maha.end - 86400000) { nextM = mlist[j]; break; } }
    p.push('Сам период ' + esc(g(maha.planet)) + ' закончится <b>' + fmt(maha.end) + '</b>' + (nextM ? ' — и тогда начнётся глава под управлением <b>' + esc(g(nextM.planet)) + '</b> (до ' + fmt(nextM.end) + ')' : '') + '.');
    out.push('<h3>🕰️ Какой период идёт сейчас</h3>' + p.map(function (x) { return '<p>' + x + '</p>'; }).join(''));

    /* ---------- 2. Транзиты простым языком ---------- */
    var tr = J.transits();
    var sH = houseOf(chart, tr.Saturn.signIdx);
    var jH = houseOf(chart, tr.Jupiter.signIdx);
    var rH = houseOf(chart, tr.Rahu.signIdx);
    var kH = houseOf(chart, tr.Ketu.signIdx);
    var sExit = signExitDate('Saturn', 1000);
    var jExit = signExitDate('Jupiter', 420);
    var nExit = signExitDate('Rahu', 600);
    var t = [];
    t.push('<p><b>Сатурн</b> до ' + (sExit ? fmt(sExit) : 'ближайших лет') + ' идёт по вашему <b>' + sH + '-му дому</b> («' + HOUSE_T[sH] + '»). Это «экзамен зрелости» в данной сфере: быстрых наград мало, зато всё, во что вы вложитесь системно, станет прочным. Рецепт: режим, план, без спешки.</p>');
    t.push('<p><b>Юпитер</b> до ' + (jExit ? fmt(jExit) : 'ближайшего года') + ' идёт по вашему <b>' + jH + '-му дому</b> («' + HOUSE_T[jH] + '») — это ваша зона удачи и роста на текущий год. Направляйте усилия сюда: здесь попутный ветер.</p>');
    t.push('<p>Ось <b>Раху–Кету</b> до ' + (nExit ? fmt(nExit) : 'ближайших полутора лет') + ' стоит на линии «' + rH + '-й дом — ' + kH + '-й дом»: растите через темы ' + rH + '-го дома («' + HOUSE_T[rH] + '») и не цепляйтесь за привычные схемы ' + kH + '-го («' + HOUSE_T[kH] + '»). Это направление развития души на ближайшие месяцы.</p>');
    out.push('<h3>🌤️ Небо прямо сейчас (транзиты)</h3>' + t.join(''));

    /* ---------- 3. Год (варшапхал) ---------- */
    if (VP) {
      try {
        var vf = VP.yearForecast(chart, chart.lat, chart.lon, new Date());
        if (vf && !vf.error) {
          var y = [];
          y.push('<p>Ваш личный год отсчитывается от солнечного возвращения — <b>' + fmt(vf.solarReturnDate) + '</b>. «Прожектор года» (мунтха) стоит в знаке <b>' + esc(vf.muntha) + '</b>: ' + esc(vf.munthaTheme) + '.</p>');
          y.push('<p>Управитель года — <b>' + esc(vf.yearLord) + '</b>: ' + esc(vf.yearLordTheme) + '</p>');
          out.push('<h3>📅 Ваш год простыми словами</h3>' + y.join(''));
        }
      } catch (e) {}
    }

    /* ---------- 4. План действий ---------- */
    var today = new Date();
    function dayCard(d, withTodayMark){
      var dp = DAY_PLANETS[d.getDay()];
      var dt = DAY_TIP[dp];
      return { dp: dp, dt: dt,
        head: '<b>' + d.getDate() + '.' + (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1) + '</b>, ' + DAY_NAMES[d.getDay()] + ' — день ' + esc(dp) + (withTodayMark ? ' <span class="fs-today">(сегодня)</span>' : ''),
        do: dt.do, must: dt.must, avoid: dt.avoid };
    }

    // сегодня
    var tcard = dayCard(today, true);
    var todayHtml = '<ul>' +
      '<li><b class="fs-ok">✅ Можно:</b> ' + tcard.do + '</li>' +
      '<li><b class="fs-need">⭐ Нужно:</b> ' + tcard.must + '</li>' +
      '<li><b class="fs-no">🚫 Не стоит:</b> ' + tcard.avoid + '</li>' +
      '<li class="muted">День несёт энергетику ' + esc(tcard.dp) + ': важное дело «по теме» дня пойдёт легче.</li>' +
      '</ul>';

    // неделя: каждый день с датами
    var weekDays = [];
    for (var di = 0; di < 7; di++) {
      var dc = dayCard(new Date(today.getTime() + di * 86400000), di === 0);
      weekDays.push('<div class="fs-day' + (di === 0 ? ' fs-day-today' : '') + '"><div class="fs-day-head">' + dc.head + '</div>' +
        '<div class="fs-day-tips"><span class="fs-ok">Можно: ' + dc.do + '</span>' +
        '<span class="fs-need">Нужно: ' + dc.must + '</span>' +
        '<span class="fs-no">Не стоит: ' + dc.avoid + '</span></div></div>');
    }
    var week = 'Главная тема недели — подпериод ' + esc(g(antar.planet)) + ': вкладывайтесь в «' + (THEME_SHORT[antar.planet] || 'темы ' + antar.planet) + '». Суббота — день Сатурна: не начинайте крупного, доделывайте начатое и наводите порядок.' +
      '<details class="fs-more"><summary>▸ Каждый день недели с датами: можно / нужно / не стоит</summary><div class="fs-days">' + weekDays.join('') + '</div></details>';

    // месяц: можно / нужно / нельзя / с осторожностью
    var monthLists =
      '<li><b class="fs-ok">✅ Можно:</b> ' + (FITS[antar.planet] ? FITS[antar.planet].do : 'дела по теме подпериода') + '</li>' +
      '<li><b class="fs-need">⭐ Нужно:</b> системно работать со сферой «' + HOUSE_T[sH] + '» (там Сатурн — он любит режим) и вкладываться в «' + HOUSE_T[jH] + '» (там Юпитер открывает возможности)</li>' +
      '<li><b class="fs-no">🚫 Нельзя:</b> ' + (FITS[antar.planet] ? FITS[antar.planet].avoid : 'форсировать события') + '</li>' +
      '<li><b class="fs-warn">🟡 С осторожностью:</b> всё, что связано с темами ' + rH + '-го дома («' + HOUSE_T[rH] + '», Раху) — проверяйте факты дважды и не раздувайте ожидания</li>';
    var month;
    var daysToAntar = Math.ceil((antEnd.getTime() - today.getTime()) / 86400000);
    if (daysToAntar <= 45) {
      month = 'Подпериод ' + esc(g(antar.planet)) + ' завершится ' + fmt(antEnd) + ' (через ' + daysToAntar + ' дн.) — финальный отрезок: завершайте начатое по теме «' + (THEME_SHORT[antar.planet] || antar.planet) + '», новое крупное лучше стартовать после ' + fmt(antEnd) + '.';
    } else {
      month = 'До ' + fmt(antEnd) + ' развивается подпериод ' + esc(g(antar.planet)) + ': месяц за месяцем укрепляйте «' + (THEME_SHORT[antar.planet] || 'темы ' + antar.planet) + '».';
    }
    month += '<details class="fs-more"><summary>▸ Подробно: что в этом месяце можно, нужно и нельзя</summary><ul class="fs-month">' + monthLists + '</ul></details>';

    var yearPlan = 'Направление задают период ' + esc(g(maha.planet)) + ' и управитель года' + (fits && fits.nom ? ': в фокусе — ' + fits.nom : '') + '.';
    // вехи года: смены подпериодов в ближайшие 365 дней
    var marks = [];
    var horizon = today.getTime() + 365 * 86400000;
    for (var k2 = 0; k2 < list.length && marks.length < 3; k2++) {
      var a = list[k2];
      if (a.start > today && a.start.getTime() < horizon) marks.push('<b>' + fmt(a.start) + '</b> — включается подпериод ' + esc(g(a.planet)) + ' («' + (THEME_SHORT[a.planet] || 'темы ' + a.planet) + '»)');
    }
    if (nextM && nextM.start.getTime() < horizon) marks.push('<b>' + fmt(nextM.start) + '</b> — смена большой главы: начинается период ' + esc(g(nextM.planet)));
    if (marks.length) yearPlan += ' Вехи ближайшего года: ' + marks.join('; ') + '.';

    var plan =
      '<div class="fs-plan">' +
        '<div class="fs-plan-card"><div class="fs-plan-head">📆 На сегодня <span class="muted">(' + DAY_NAMES[today.getDay()] + ')</span></div>' + todayHtml + '</div>' +
        '<div class="fs-plan-card"><div class="fs-plan-head">🗓️ На неделю</div><p style="margin:6px 0">' + week + '</p></div>' +
        '<div class="fs-plan-card"><div class="fs-plan-head">🌙 На месяц</div><p style="margin:6px 0">' + month + '</p></div>' +
        '<div class="fs-plan-card"><div class="fs-plan-head">🎯 На год</div><ul><li>' + yearPlan + '</li></ul></div>' +
      '</div>';
    out.push('<h3>🧭 План действий</h3>' + plan);

    out.push('<p class="muted" style="margin-top:10px">Рассказ построен на ваших положениях: махадаша/антадаша (периоды), транзиты Сатурна, Юпитера и Раху–Кету от Лагны, годовой карте (варшапхал). Ниже — технические таблицы, если захотите деталей.</p>');
    return out.join('');
  }

  var ForecastStory = { buildHTML: buildHTML, buildSphereHTML: buildSphereHTML, SPHERES: SPHERES };
  if (root && typeof root === 'object') root.ForecastStory = ForecastStory;
  return ForecastStory;
});
