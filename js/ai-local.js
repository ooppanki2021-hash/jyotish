/* ============================================================
   AiLocal — встроенный офлайн-ассистент-астролог.
   Отвечает на вопросы по рассчитанной карте, используя всю
   встроенную базу интерпретаций (разделы, взаимодействия,
   предназначение). Работает без интернета и без ключей.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./jyotish.js'), require('./reading.js'), require('./interactions.js'), require('./destiny.js'), require('./lifemap.js'), require('./forecast-story.js'));
  } else {
    root.AiLocal = factory(root.Jyotish, root.Reading, root.Interactions, root.Destiny, root.LifeMap, root.ForecastStory);
  }
}(typeof self !== 'undefined' ? self : this, function (J, Reading, Interactions, Destiny, LifeMap, ForecastStory) {
  'use strict';

  var cacheChart = null, cacheSecs = null;

  function secs(chart){
    if (cacheChart !== chart){ cacheSecs = Reading.generateReading(chart); cacheChart = chart; }
    return cacheSecs;
  }
  function sec(list, id){
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function plain(html){
    return String(html).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }
  // Разбить items секции на блоки (заголовок + текст)
  function blocks(s){
    var out = [], cur = { title: '', body: [] };
    (s.items || []).forEach(function (it){
      if (it.indexOf('<h4>') === 0){
        if (cur.title || cur.body.length) out.push(cur);
        var m = it.match(/<h4>([\s\S]*?)<\/h4>/);
        cur = { title: m ? plain(m[1]) : '', body: [it.replace(/^<h4>[\s\S]*?<\/h4>/, '')] };
      } else {
        cur.body.push(it);
      }
    });
    if (cur.title || cur.body.length) out.push(cur);
    return out;
  }
  function pick(s, keywords, max){
    if (!s) return '';
    var hits = blocks(s).filter(function (g){
      var hay = (g.title + ' ' + plain(g.body.join(' '))).toLowerCase();
      return keywords.some(function (k){ return hay.indexOf(k) >= 0; });
    });
    return hits.slice(0, max || 2).map(function (g){
      return '• ' + (g.title ? g.title + '. ' : '') + plain(g.body.join(' '));
    }).join('\n');
  }
  function has(q, arr){ return arr.some(function (k){ return q.indexOf(k) >= 0; }); }

  var HOUSE_T = {
    1:'характер и самопроявление', 2:'деньги и ценности', 3:'общение и навыки', 4:'дом и внутренний покой',
    5:'творчество, дети и любовь', 6:'работа и здоровье', 7:'брак и партнёрство', 8:'трансформации и общие ресурсы',
    9:'удача, учение и дороги', 10:'карьера и статус', 11:'доход и сообщество', 12:'уединение и завершение'
  };

  /* ---------- Тематический ответ по готовому разделу ---------- */
  function fromSection(list, id, opener, keywords, max){
    var s = sec(list, id);
    if (!s) return '';
    var parts = [opener, s.human ? s.human : ''];
    var d = keywords ? pick(s, keywords, max) : '';
    if (d) parts.push(d);
    return parts.filter(Boolean).join('\n\n');
  }

  /* ---------- Тайминг: даши + транзиты ---------- */
  function timing(chart){
    var out = [];
    var m = chart.currentMaha, a = chart.currentAntar;
    out.push('Сейчас у вас идёт махадаша ' + m.planet + ' (до ' + m.end.getFullYear() + ' года) — главные темы этих лет: ' +
      themeOf(m.planet) + '. Внутри неё подпериод ' + a.planet + ' (до ' + fmtDate(a.end) + ') — сейчас особенно активна сфера: ' + themeOf(a.planet) + '.');
    try {
      var tr = J.transits();
      var li = chart.lagna.signIdx;
      function houseOf(signIdx){ return ((signIdx - li) + 12) % 12 + 1; }
      var sH = houseOf(tr.Saturn.signIdx), jH = houseOf(tr.Jupiter.signIdx);
      out.push('Транзиты на сегодня: Сатурн идёт по вашему ' + sH + '-му дому (' + HOUSE_T[sH] + ') — время дисциплины и наведения порядка в этой сфере; Юпитер по ' + jH + '-му дому (' + HOUSE_T[jH] + ') — сюда приходит рост и удача. Раху в ' + tr.Rahu.sign + ', Кету в ' + tr.Ketu.sign + ' — ось «амбиции/отпускание» на ближайшие полтора года.');
    } catch (e) {}
    out.push('Подробный рассказ с планом действий на день/неделю/месяц/год — вкладка «Прогностика», блок «📖 Рассказ о вашем периоде». Можно спросить меня: «Какой у меня план действий?»');
    return out.join('\n\n');
  }
  function themeOf(ru){
    var T = {
      'Солнце':'достоинство, лидерство и видимость', 'Луна':'эмоции, дом и забота', 'Меркурий':'ум, речь, обучение и дела',
      'Венера':'отношения, деньги и красота', 'Марс':'энергия, смелость и достижения', 'Юпитер':'рост, мудрость и наставники',
      'Сатурн':'дисциплина, структура и долг', 'Раху':'амбиции и всё новое', 'Кету':'глубина, интуиция и отпускание'
    };
    return T[ru] || ru;
  }
  function fmtDate(d){ return d.getDate() + '.' + (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1) + '.' + d.getFullYear(); }

  var EVENTS = [
    {keys:['замуж','брак','женить','свадьб','отношен'], house:7, label:'брака и серьёзного союза'},
    {keys:['дет','ребён','ребен'], house:5, label:'детей и творчества'},
    {keys:['карьер','работ','професс'], house:10, label:'карьеры'},
    {keys:['деньг','доход','финанс'], house:2, label:'денег'},
    {keys:['жиль','дом','квартир','переезд'], house:4, label:'жилья и дома'},
    {keys:['поезд','путешеств','заграниц'], house:9, label:'поездок и дальних дорог'},
    {keys:['учеб','образован','экзамен'], house:9, label:'учёбы'}
  ];
  function relatedPlanets(chart, house){
    var found=[]; for(var k in chart.planets) if(chart.planets[k].house===house) found.push(chart.planets[k].ru||k);
    var lord = chart.lagna && chart.lagna.signIdx != null ? J.SIGNS[(chart.lagna.signIdx + house - 1) % 12] : '';
    return (found.length ? 'Планеты в этом доме: '+found.join(', ')+'. ' : '') + 'Сфера связана с '+house+'-м домом ('+HOUSE_T[house]+').';
  }
  function eventTimingLines(chart, house){
    var out=[]; if(chart.currentMaha) out.push('Текущая махадаша '+chart.currentMaha.planet+' до '+chart.currentMaha.end.getFullYear()+' года; её тема — '+themeOf(chart.currentMaha.planet)+'.');
    if(chart.currentAntar) out.push('Сейчас внутри неё антардаша '+chart.currentAntar.planet+' до '+fmtDate(chart.currentAntar.end)+'.');
    try { var tr=J.transits(new Date()), li=chart.lagna.signIdx; function h(x){return (x-li+12)%12+1;} var j=h(tr.Jupiter.signIdx), sat=h(tr.Saturn.signIdx); out.push('Сегодня Юпитер в '+j+'-м доме, Сатурн в '+sat+'-м. Когда Юпитер проходит дом '+house+', тема получает поддержку; Сатурн требует терпения и оформления.'); } catch(e){}
    return out;
  }
  function whenEvent(chart, house, label){
    return 'Когда тема '+label+' станет активнее:\n\n'+relatedPlanets(chart,house)+'\n'+eventTimingLines(chart,house).join('\n')+'\n\nЭто окна возможностей, а не гарантия события. Сроки лучше уточнять по полной прогностике и реальным обстоятельствам.';
  }
  function dateReading(chart, dateText){
    var m=dateText.match(/(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{2,4}))?/); if(!m)return ''; var y=m[3]?+m[3]:new Date().getFullYear(); if(y<100)y+=2000; var dt=new Date(y,+m[2]-1,+m[1],12);
    var days=['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота']; var tr=J.transits(dt), li=chart.lagna.signIdx; var lh=(tr.Moon?tr.Moon.signIdx:li);
    return 'Разбор даты '+fmtDate(dt)+': '+days[dt.getDay()]+'. '+(tr.Moon?'Луна в '+tr.Moon.sign+', от Лагны это '+(((lh-li+12)%12)+1)+'-й дом — эмоциональный фон дня. ':'')+'Юпитер в '+(((tr.Jupiter.signIdx-li+12)%12)+1)+'-м доме, Сатурн в '+(((tr.Saturn.signIdx-li+12)%12)+1)+'-м. Это общий фон дня; важные решения принимайте с учётом реальных обстоятельств.';
  }

  /* ---------- Дети (мини-интерпретация 5-го дома) ---------- */

  /* ---------- Главный ответ ---------- */
  function answer(question, chart, name){
    if (!chart) return 'Сначала рассчитайте карту на вкладке «Кто я, мой путь» — и я отвечу по вашим реальным положениям планет.';
    var q = String(question || '').toLowerCase();
    var dateMatch = q.match(/\d{1,2}[.\/-]\d{1,2}(?:[.\/-]\d{2,4})?/);
    if (dateMatch) return dateReading(chart, dateMatch[0]);
    for (var ei=0; ei<EVENTS.length; ei++) if (has(q, EVENTS[ei].keys) && has(q,['когда','срок','период','год'])) return whenEvent(chart, EVENTS[ei].house, EVENTS[ei].label);
    var list = secs(chart);
    var parts = [];
    var who = name ? (', ' + name) : '';

    if (has(q, ['привет', 'здравств', 'добрый', 'кто ты', 'что ты умеешь', 'помощь', 'help'])) {
      return 'Здравствуйте' + who + '! Я — встроенный астролог этого приложения: отвечаю по вашей карте мгновенно и без интернета.\n\nСпросите меня, например: «В чём моё призвание?», «Когда ждать улучшений в деньгах?», «Что по отношениям?», «Какое сейчас период и транзиты?», «Какие у меня кармические задачи?», «Над чем работать в характере?».\n\nЯ опираюсь на встроенную базу интерпретаций (знаки, дома, накшатры, йоги, даши) — то же знание, из которого собран ваш подробный разбор. Если нужен живой диалог с нейросетью — переключите провайдера в настройках ИИ.';
    }

    if (has(q, ['план действий', 'расписание', 'что делать сегодня', 'на сегодня', 'на эту неделю', 'на месяц', 'на этот год', 'рассказ о периоде', 'расскажи про период подробно', 'живой прогноз'])) {
      if (ForecastStory) return plain(ForecastStory.buildHTML(chart, name));
    }

    if (has(q, ['когда', 'период', 'даш', 'транзит', 'прогноз', 'год', 'времен', 'ближайш', 'улучшен'])) {
      parts.push(timing(chart));
      var money = has(q, ['деньг', 'финанс', 'доход']);
      if (money) parts.push(fromSection(list, 'money', 'Про деньги в этот период:', ['стиль', 'дхана', 'ловушк'], 2));
      return parts.filter(Boolean).join('\n\n');
    }

    if (has(q, ['над чем', 'проработ', 'слаб', 'недостатк', 'тень', 'сложн', 'проблем', 'страх', 'тревог']) && !has(q, ['деньг', 'доход', 'финанс', 'заработ'])) {
      var s1 = fromSection(list, 'weak', 'Ваши «зоны трения» и как с ними работать:', null, 3);
      var dd = Destiny.analyze(chart);
      if (dd.character.length) s1 += '\n\nВ характере рекомендую тренировать: ' + dd.character.map(function (c){ return c.title; }).join(', ') + '. Конкретные шаги — в финальном разделе «Ваш план».';
      return s1;
    }

    if (has(q, ['призван', 'работ', 'карьер', 'професс', 'дело', 'реализац', 'бизнес', 'начать своё'])) {
      return fromSection(list, 'career', 'Смотрю вашу карту по призванию' + who + '.', ['формула', 'современн', 'как расти'], 3);
    }

    if (has(q, ['деньг', 'доход', 'финанс', 'богат', 'заработ', 'накопл', 'бедн'])) {
      return fromSection(list, 'money', 'По деньгам у вас такая картина' + who + '.', ['стиль', 'дхана', 'ловушк', 'практическ', 'проблем'], 3);
    }

    if (has(q, ['брак', 'люб', 'отношен', 'партнёр', 'партнер', 'замуж', 'женить', 'роман', 'встреч'])) {
      return fromSection(list, 'love', 'Про любовь и партнёрство в вашей карте' + who + '.', ['портрет', 'притягив', 'строить'], 3);
    }

    if (has(q, ['здоров', 'болезн', 'недуг', 'тело', 'самочувств'])) {
      return fromSection(list, 'health', 'По здоровью карта показывает следующее (это тенденции, а не диагноз — за лечением к врачу):', ['рекомендац', 'питан', 'стресс', 'спорт'], 4);
    }

    if (has(q, ['спорт', 'тренир', 'активн', 'физич'])) {
      return fromSection(list, 'sport', 'Какая активность вам «заходит» по карте:', null, 3);
    }

    if (has(q, ['мать', 'отец', 'родител', 'семья', 'род ', 'домой', 'недвижим'])) {
      return fromSection(list, 'family', 'Про семью, дом и родителей:', null, 3);
    }

    if (has(q, ['ребён', 'ребен', 'дет', 'сын', 'доч'])) {
      var li = chart.lagna.signIdx;
      var h5 = (li + 4) % 12;
      var SIGNS = J.SIGNS;
      var in5 = [];
      for (var k in chart.planets){ if (chart.planets[k].house === 5) in5.push(chart.planets[k].ru); }
      return 'Тема детей и творчества описана 5-м домом: у вас он в знаке ' + SIGNS[h5] + '. ' +
        (in5.length ? 'В нём стоят ' + in5.join(', ') + ' — дети и творческие проекты будут заметной, энергичной частью жизни.' : 'Дом пуст — тема раскрывается через своего управителя и через Юпитер (карака детей): посмотрите, где стоит ваш Юпитер — ' + chart.planets.Jupiter.sign + ', ' + chart.planets.Jupiter.house + '-й дом.') +
        '\n\n' + (sec(list, 'education') ? 'Стиль обучения и общения с младшими хорошо виден в разделе «Образование» вашего разбора.' : '');
    }

    if (has(q, ['образован', 'учеб', 'учёб', 'изуч', 'экзамен', 'сдава'])) {
      return fromSection(list, 'education', 'Про обучение и стиль ума:', null, 3);
    }

    if (has(q, ['переезд', 'переех', 'за границ', 'заграниц', 'эмиграц', 'иностран', 'релокац', 'другой стран', 'в другую страну', 'уехать'])) {
      var out = [];
      var rahu = chart.planets.Rahu;
      var in12 = [];
      for (var k12 in chart.planets){ if (chart.planets[k12].house === 12) in12.push(chart.planets[k12].ru); }
      var h9 = (chart.lagna.signIdx + 8) % 12;
      out.push('9-й дом (дальние дороги) у вас в знаке ' + J.SIGNS[h9] + '; планет в 12-м доме (жизнь вдали от корней): ' + (in12.length ? in12.join(', ') : 'нет') + '. ' +
        (rahu.house === 9 || rahu.house === 12 || in12.length ? 'Карта поддерживает сценарий жизни или работы за границей — переезд может стать точкой роста.' : 'Явных «эмигрантских» маркеров немного: заграница будет важна скорее в путешествиях и обучении, чем как постоянное место.'));
      return out.join('\n\n');
    }

    if (has(q, ['карм', 'предназначен', 'урок', 'долг', 'мисси', 'зачем я', 'атмакарак', 'план ', 'задач'])) {
      var d = Destiny.analyze(chart);
      var t = [];
      t.push('Ваша кармическая ось: Кету в ' + d.axis.ketuHouse + '-м доме — это багаж прошлого, в нём вы «дома», но там не растут; Раху в ' + d.axis.rahuHouse + '-м доме — направление роста души.');
      t.push(d.axis.rahuText);
      t.push('Главный урок души (Атмакарака ' + d.soul.planet + '): ' + d.soul.text);
      if (d.debts.length) t.push('Кармические долги: ' + d.debts.map(function (x){ return x.planet + ' в ' + x.house + '-м'; }).join(', ') + '. Они закрываются осознанностью и добровольным вкладом в эти сферы, а не наказанием.');
      t.push('Первоочередные задачи сейчас: ' + d.priorities.map(function (p){ return p.n + ') ' + p.title; }).join('; ') + '.');
      return t.join('\n\n');
    }

    if (has(q, ['сфер', 'качество жизн', 'оцени жизнь', 'оцени мою жизнь', 'по сферам', 'баланс жизн', 'все стороны жизн', 'шкала жизн', 'рейтинг жизн'])) {
      if (!LifeMap) return 'Модуль «Карта сфер жизни» недоступен — пересоберите приложение.';
      var lm = LifeMap.analyze(chart);
      var lines = lm.areas.map(function (a) {
        return a.emoji + ' ' + a.name + ': ' + a.score + '/10 — ' + a.verdict.toLowerCase();
      });
      var karmaTop = lm.karma.slice(0, 2).map(function (k) { return k.title + ' → ' + k.action; });
      return 'Оцениваю все сферы жизни по вашей карте' + who + ':\n\n' + lines.join('\n') +
        '\n\nПо карме обратить внимание:\n• ' + karmaTop.join('\n• ') +
        '\n\nИтого качество жизни: ' + lm.total.score + '/10. ' + lm.total.verdict +
        '\n\nОпоры: ' + lm.total.supports.join(' · ') + '.\nЗоны риска: ' + lm.total.risks.join(' · ') + '.' +
        '\n\nПодробная таблица с пояснениями к каждой оценке — в разборе, блок «🧭 Карта сфер жизни».';
    }

    if (has(q, ['сильн', 'талант', 'опора', 'дар', 'способн', 'в чём я силён', 'в чем я силен'])) {
      return fromSection(list, 'strength', 'Ваши природные опоры по карте:', null, 3);
    }

    if (has(q, ['йог', 'комбинац', 'аспект', 'взаимодейств', 'соединен', 'соединён', 'сожжен', 'сожжён', 'паден', 'экзальтац'])) {
      return fromSection(list, 'interactions', 'Смотрю взаимодействия планет в вашей карте:', ['соединен', 'соединён', 'йоги', 'сожжен', 'сожжён', 'паден', 'экзальтац', 'не в своей'], 4);
    }

    if (has(q, ['кто я', 'характер', 'личност', 'портрет', 'о себе', 'расскажи', 'опиши меня', 'какой я', 'какая я'])) {
      return fromSection(list, 'portrait', 'Вот ваш портрет по карте' + who + ':', ['совет', 'выдающ'], 2);
    }

    // ---------- Не распознали ----------
    var synth = sec(list, 'synthesis');
    return 'Я — встроенный офлайн-ассистент и лучше всего отвечаю на темы: призвание, деньги, отношения, здоровье, характер и работа над собой, карма и задачи, периоды и транзиты, йоги и взаимодействия.\n\nПопробуйте спросить, например: «В чём моё призвание?», «Когда улучшения в деньгах?», «Что по браку?», «Над чем работать в характере?».\n\n' + (synth ? 'А если коротко о карте в целом: ' + plain(synth.human) : '');
  }

  return { answer: answer };
}));
