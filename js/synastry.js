/* ============================================================
   ГЛУБОКАЯ СИНАСТРИЯ — сверх 36 баллов аштакота.
   Мангала-доша, 7-й дом, Венера, Луна, наложение домов, Д-9.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./jyotish.js'));
  } else {
    root.Synastry = factory(root.Jyotish);
  }
}(typeof self !== 'undefined' ? self : this, function (J) {

  var SIGNS = J.SIGNS;
  function esc(s){ return String(s==null?'':s); }

  // Марс в 1,4,7,8,12 от точки отсчёта (Лагна/Луна/Венера)
  function mangalDoshaFrom(marsHouse, refHouse){
    // дом Марса от refHouse
    var h = (marsHouse - refHouse + 12) % 12 + 1;
    return [1,4,7,8,12].indexOf(h) >= 0;
  }
  function mangalAnalysis(chart, label){
    var mars = chart.planets['Mars'];
    var moon = chart.planets['Moon'];
    var venus = chart.planets['Venus'];
    var out = [];
    var score = 0;
    // от Лагны
    if (mangalDoshaFrom(mars.house, 1)){ out.push('Марс в ' + mars.house + '-м доме от Лагны — мангала-доша (классическая)'); score++; }
    // от Луны
    if (mangalDoshaFrom(mars.house, moon.house)){ out.push('Марс в ' + mars.house + '-м доме от Луны — «чандра-мангала»'); score++; }
    // от Венеры
    if (mangalDoshaFrom(mars.house, venus.house)){ out.push('Марс в ' + mars.house + '-м доме от Венеры — «шукра-мангала»'); score++; }
    var verdict = score === 0 ? 'Мангала-доша не выражена — в отношениях меньше трений на тему агрессии/конфликтов.'
      : (score === 1 ? 'Слабо выраженная мангала-доша.'
      : (score === 2 ? 'Умеренная мангала-доша — возможны трения, вспышки, борьба за главенство.'
      : 'Сильная мангала-доша — классика «огненного» брака: споры, страсть, борьба. Традиционно смягчается браком с партнёром, у которого тоже есть мангала-доша.'));
    return { label: label, items: out, score: score, verdict: verdict };
  }

  function seventhHouse(chart, label){
    var out = [];
    // 7-й дом знак и управитель
    var h7sign = (chart.lagna.signIdx + 6) % 12;
    var lord = { 0:'Марс',1:'Венера',2:'Меркурий',3:'Луна',4:'Солнце',5:'Меркурий',6:'Венера',7:'Марс',8:'Юпитер',9:'Сатурн',10:'Сатурн',11:'Юпитер' }[h7sign];
    out.push('7-й дом (партнёрство) — ' + SIGNS[h7sign] + ', управитель ' + lord + '.');
    var lordP = null;
    for (var k in chart.planets){ if (chart.planets[k].ru === lord){ lordP = chart.planets[k]; } }
    if (lordP){
      out.push('Управитель 7-го дома стоит в ' + lordP.house + '-м доме (' + lordP.sign + ')' + (lordP.dignity ? ' — ' + lordP.dignity : '') + '.');
      if (lordP.combust) out.push('Управитель 7-го сожжён Солнцем — партнёру трудно «проявиться», возможны проблемы признания в паре.');
      if (lordP.retro) out.push('Управитель 7-го ретрограден — возвращение бывших партнёров/тем, переосмысление отношений.');
    }
    // планеты в 7-м доме
    var in7 = [];
    for (var p in chart.planets){
      if (chart.planets[p].house === 7) in7.push(chart.planets[p].ru);
    }
    if (in7.length) out.push('Планеты в 7-м доме: ' + in7.join(', ') + '.');
    else out.push('7-й дом пуст — тема партнёрства «чистая», но зависит от управителя.');
    // Кету/Раху
    if (chart.planets['Rahu'] && chart.planets['Rahu'].house === 7) out.push('Раху в 7-м — сильное притяжение, нестандартный/иностранный партнёр, но и иллюзии.');
    if (chart.planets['Ketu'] && chart.planets['Ketu'].house === 7) out.push('Кету в 7-м — отстранённость в близости, духовное измерение партнёрства.');
    return { label: label, items: out };
  }

  function venusLove(chart, label){
    var v = chart.planets['Venus'];
    var out = [];
    out.push('Венера (карака любви) в ' + v.sign + ' (' + v.house + '-й дом)' + (v.dignity ? ' — ' + v.dignity : '') + '.');
    if (v.combust) out.push('Венера сожжена — нежность «перегорает», в любви трудно проявить мягкость.');
    if (v.dignity === 'в экзальтации' || v.dignity === 'в собственном знаке') out.push('Сильная Венера — способность глубоко любить, дарить комфорт и красоту.');
    if (v.dignity === 'в падении') out.push('Венера в падении — трудности в выражении чувств, недооценка собственной привлекательности.');
    return { label: label, items: out };
  }

  // Наложение домов: планеты B в домах A
  function houseOverlay(A, B, nameA, nameB){
    var out = [];
    var key = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Rahu','Ketu'];
    key.forEach(function(k){
      var pl = B.planets[k];
      var house = (pl.signIdx - A.lagna.signIdx + 12) % 12 + 1;
      out.push({ planet: pl.ru, sign: pl.sign, house: house });
    });
    return out;
  }
  function overlayInterpretation(overlays, nameB){
    var notes = [];
    var map = overlays.map(function(o){ return { p:o.planet, h:o.house }; });
    function find(p){ for (var i=0;i<map.length;i++) if (map[i].p===p) return map[i]; return null; }
    var moon = find('Луна'), venus = find('Венера'), sun = find('Солнце'), rahu = find('Раху'), jup = find('Юпитер'), sat = find('Сатурн'), mars = find('Марс');
    if (moon) notes.push(('Луна ' + nameB + ' попадает в ваш ' + moon.h + '-й дом: ') + moonHouseMeaning(moon.h, nameB));
    if (venus) notes.push(('Венера ' + nameB + ' — в ваш ' + venus.h + '-й дом: ') + venusHouseMeaning(venus.h, nameB));
    if (sun) notes.push(('Солнце ' + nameB + ' — в ваш ' + sun.h + '-й дом: ') + sunHouseMeaning(sun.h, nameB));
    if (mars) notes.push(('Марс ' + nameB + ' — в ваш ' + mars.h + '-й дом: ') + marsHouseMeaning(mars.h, nameB));
    if (jup) notes.push(('Юпитер ' + nameB + ' — в ваш ' + jup.h + '-й дом: ') + jupHouseMeaning(jup.h, nameB));
    if (sat) notes.push(('Сатурн ' + nameB + ' — в ваш ' + sat.h + '-й дом: ') + satHouseMeaning(sat.h, nameB));
    if (rahu) notes.push(('Раху ' + nameB + ' — в ваш ' + rahu.h + '-й дом: ') + rahuHouseMeaning(rahu.h, nameB));
    return notes;
  }
  function moonHouseMeaning(h, name){ return {
    1:'партнёр глубоко чувствует вас, эмоциональная близость «с первого взгляда»',
    2:'партнёр заботится о вашем благополучии, семье, ресурсах',
    3:'лёгкость общения, дружеская и «братская» энергия',
    4:'партнёр трогает ваше сердце, тема дома и уюта, глубокая привязанность',
    5:'романтика, влюблённость, радость, тема детей',
    6:'забота переходит в служение/опеку, возможны споры о быте',
    7:'ЭМОЦИОНАЛЬНОЕ ЯДРО пары — партнёр чувствует «своим», сильная связь',
    8:'глубокая, трансформирующая, но и ревнивая эмоциональная связь',
    9:'общие идеалы, духовная близость, путешествия',
    10:'партнёр влияет на вашу карьеру и статус',
    11:'дружба + любовь, общие цели и круг общения',
    12:'таинственная, уединённая связь, потребность в пространстве'
  }[h] || 'умеренная эмоциональная связь'; }
  function venusHouseMeaning(h, name){ return {
    1:'партнёр находит вас привлекательным, физическая симпатия',
    4:'партнёр ценит ваш уют и «домашность»',
    5:'яркая романтика, творчество, удовольствие вдвоём',
    7:'любовь «по предназначению», партнёр видит в вас пару',
    8:'страсть, сильное физическое притяжение, интенсивность',
    10:'партнёр привлекает вас статусом, амбициями',
    11:'дружба и лёгкость, любовь через общие интересы',
    12:'нежная, уединённая, «тайная» привязанность'
  }[h] || 'приятная, тёплая симпатия'; }
  function sunHouseMeaning(h, name){ return {
    1:'партнёр усиливает вашу личность, но возможна борьба за «главного»',
    7:'сильное притяжение и сильное трение эго — классика «огня в паре»',
    10:'партнёр поднимает ваш статус, карьерный союз',
    4:'партнёр влияет на дом/семью, тёплая, но властная забота'
  }[h] || 'партнёр подсвечивает сферу ' + h + '-го дома'; }
  function marsHouseMeaning(h, name){ return {
    1:'партнёр заряжает энергией, но возможны стычки',
    7:'СТРАСТЬ и конфликты — сильная химия, риск ссор',
    8:'интенсивное физическое притяжение, ревность',
    12:'скрытые трения, энергия уходит «в тень»'
  }[h] || 'активное влияние на ' + h + '-й дом'; }
  function jupHouseMeaning(h, name){ return {
    1:'партнёр расширяет ваш кругозор, приносит удачу',
    7:'партнёр «мудрее» в союзе, благословение на брак',
    9:'духовный и учительский союз, общие ценности',
    2:'партнёр улучшает ваши финансы и речь'
  }[h] || 'благотворное влияние на ' + h + '-й дом'; }
  function satHouseMeaning(h, name){ return {
    7:'серьёзный, долгосрочный, «кармический» союз, но с чувством долга',
    4:'партнёр влияет на дом/недвижимость, тема обязательств',
    10:'деловой союз, партнёр и карьера связаны'
  }[h] || 'сдерживающее, структурирующее влияние на ' + h + '-й дом'; }
  function rahuHouseMeaning(h, name){ return {
    1:'сильное магнетическое притяжение, но с иллюзиями',
    7:'одержимость партнёром, нестандартный союз, кармическая связь',
    12:'заграничное/скрытое измерение отношений'
  }[h] || 'интригующее, будоражащее влияние на ' + h + '-й дом'; }

  // Управитель знака
  function signLord(signIdx){ return { 0:'Марс',1:'Венера',2:'Меркурий',3:'Луна',4:'Солнце',5:'Меркурий',6:'Венера',7:'Марс',8:'Юпитер',9:'Сатурн',10:'Сатурн',11:'Юпитер' }[signIdx]; }
  // Управитель дома (whole-sign)
  function houseLordOf(chart, house){ return signLord((chart.lagna.signIdx + house - 1) % 12); }

  // ===== ДЕНЕЖНАЯ СОВМЕСТИМОСТЬ =====
  // «Смогу ли я с этим человеком заработать много денег?»
  function moneySynastry(chart1, chart2, name1, name2){
    var MONEY_HOUSES = [2, 11];      // накопления и доход
    var SUPPORT_HOUSES = [1, 5, 9, 10]; // личность, инвестиции, удача, карьера
    var LOSS_HOUSES = [6, 8, 12];     // потери, чужие деньги, расходы

    // планеты B → дома A (whole-sign)
    function overlay(B, A){
      var key = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Rahu','Ketu'];
      var map = {};
      key.forEach(function(k){
        map[k] = { ru: B.planets[k].ru, house: (B.planets[k].signIdx - A.lagna.signIdx + 12) % 12 + 1 };
      });
      return map;
    }

    function analyze(B, A, nameB, nameA){
      var ov = overlay(B, A);
      var key = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Rahu','Ketu'];
      var gain = [], loss = [], support = [];
      var score = 0;
      key.forEach(function(k){
        var p = ov[k];
        var h = p.house;
        var isMoneyPlanet = (k==='Jupiter' || k==='Venus' || k==='Mercury'); // природные «денежные» планеты
        if (MONEY_HOUSES.indexOf(h) >= 0){
          var bonus = isMoneyPlanet ? 2 : 1;
          score += bonus;
          gain.push(p.ru + ' в ваш ' + h + '-й дом' + (isMoneyPlanet ? ' (денежная планета — сильный плюс)' : ''));
        } else if (SUPPORT_HOUSES.indexOf(h) >= 0){
          score += isMoneyPlanet ? 1 : 0;
          support.push(p.ru + ' в ваш ' + h + '-й дом');
        } else if (LOSS_HOUSES.indexOf(h) >= 0){
          score -= 1;
          loss.push(p.ru + ' в ваш ' + h + '-й дом');
        }
      });
      // управители денежных домов партнёра B — куда попали к A
      var b2 = houseLordOf(B, 2), b11 = houseLordOf(B, 11);
      [b2, b11].forEach(function(lord){
        var lp = null;
        for (var kk in B.planets){ if (B.planets[kk].ru === lord) lp = B.planets[kk]; }
        if (lp){
          var h = (lp.signIdx - A.lagna.signIdx + 12) % 12 + 1;
          if (MONEY_HOUSES.indexOf(h) >= 0){ score += 1; gain.push('управитель денег ' + nameB + ' (' + lord + ') — в ваш ' + h + '-й дом'); }
          else if (LOSS_HOUSES.indexOf(h) >= 0){ score -= 1; loss.push('управитель денег ' + nameB + ' (' + lord + ') — в ваш ' + h + '-й дом'); }
        }
      });
      return { gain: gain, loss: loss, support: support, score: score };
    }

    var a1 = analyze(chart2, chart1, name2, name1); // B → A
    var a2 = analyze(chart1, chart2, name1, name2); // A → B
    var total = a1.score + a2.score;

    var items = [];
    items.push('<p>Анализируем «денежные» дома (2-й — накопления, 11-й — доход) и то, куда попадают планеты партнёра, а также Юпитер (богатство), Венеру (деньги) и Меркурий (коммерция).</p>');

    items.push('<h4>Что приносит деньги в союз</h4>');
    var gains = a1.gain.concat(a2.gain);
    if (gains.length){
      items.push('<ul>' + gains.map(function(g){ return '<li>' + g + '</li>'; }).join('') + '</ul>');
    } else {
      items.push('<p>Ярких денежных связей между вашими картами не видно — доход в паре будет строиться на личных усилиях, а не на «химии» карт.</p>');
    }

    items.push('<h4>Что «протекает» или требует осторожности</h4>');
    var losses = a1.loss.concat(a2.loss);
    if (losses.length){
      items.push('<ul>' + losses.map(function(l){ return '<li>' + l + '</li>'; }).join('') + '</ul>');
    } else {
      items.push('<p>Нет «дыр» — партнёрские карты не создают взаимного оттока денег.</p>');
    }

    items.push('<h4>Поддерживающие факторы</h4>');
    var supp = a1.support.concat(a2.support);
    if (supp.length){
      items.push('<p>' + supp.join('; ') + ' — планеты партнёра в ваших домах роста, инвестиций, удачи и карьеры помогают совместному делу.</p>');
    } else {
      items.push('<p>Совместная деятельность будет строиться на усилиях, а не на удачном наложении карт.</p>');
    }

    // Вердикт
    var verdict;
    if (total >= 5) verdict = 'ОТЛИЧНО — сильная денежная связь. Вы способны вместе построить прибыльное дело: карты взаимно «заряжают» финансовые дома друг друга. Это союз, который хорошо монетизируется.';
    else if (total >= 2) verdict = 'ХОРОШО — есть реальный финансовый потенциал в паре. Деньги будут, но нужен общий чёткий план и разделение ролей.';
    else if (total >= 0) verdict = 'НЕЙТРАЛЬНО — карты не мешают и не сильно помогают деньгам. Совместный доход возможен, но станет результатом личного труда, а не «везения в паре».';
    else verdict = 'СЛОЖНО — в картах есть «отток» денег (планеты в 6/8/12 домах). Вместе зарабатывать будет труднее: возможны споры о деньгах, долги или «протекающий» бюджет. Лучше финансовые дела вести раздельно.';

    items.push('<div class="formula">💠 Итог: ' + verdict + '</div>');
    items.push('<p><i>Балл денежной связи: ' + total + ' (чем выше, тем сильнее взаимный финансовый потенциал). Это тенденция по картам, а не финансовый прогноз — реальный доход зависит от действий.</i></p>');

    return { title: 'Деньги: смогу ли я заработать с этим человеком?', items: items, score: total };
  }

  // Главная функция
  function deepSynastry(chart1, chart2, name1, name2){
    var res = { sections: [] };
    // ДЕНЕЖНАЯ СОВМЕСТИМОСТЬ (главная новая тема)
    res.sections.push(moneySynastry(chart1, chart2, name1, name2));
    // Мангала
    var m1 = mangalAnalysis(chart1, name1);
    var m2 = mangalAnalysis(chart2, name2);
    var mangalOk = (m1.score>0 && m2.score>0);
    res.sections.push({
      title: 'Мангала-доша (совместимость Марса)',
      items: [
        m1.label + ': ' + (m1.items.length ? m1.items.join('; ') : 'доши нет') + '. ' + m1.verdict,
        m2.label + ': ' + (m2.items.length ? m2.items.join('; ') : 'доши нет') + '. ' + m2.verdict,
        (mangalOk ? 'У обоих есть мангала-доша — традиционно это ВЗАИМНО СМЯГЧАЕТ её: «огненный» брак уравновешивается.' : (m1.score>0 || m2.score>0 ? 'Мангала-доша есть только у одного — в классике это считается менее благоприятным сочетанием, но смягчается осознанностью.' : 'Мангала-доша не выражена ни у кого — спокойный, бесконфликтный фон.'))
      ]
    });
    // 7-й дом
    res.sections.push({ title: '7-й дом (партнёрство)', items: [] });
    res.sections[res.sections.length-1].items = [ seventhHouse(chart1, name1), seventhHouse(chart2, name2) ].map(function(s){ return '<b>' + s.label + ':</b> ' + s.items.join(' '); });
    // Венера
    res.sections.push({ title: 'Венера (любовь)', items: [ venusLove(chart1, name1), venusLove(chart2, name2) ].map(function(s){ return '<b>' + s.label + ':</b> ' + s.items.join(' '); }) });
    // Наложение домов A->B
    var ov1 = houseOverlay(chart1, chart2, name1, name2);
    var ov2 = houseOverlay(chart2, chart1, name2, name1);
    res.sections.push({ title: 'Как ' + name2 + ' влияет на ' + name1, items: overlayInterpretation(ov1, name2) });
    res.sections.push({ title: 'Как ' + name1 + ' влияет на ' + name2, items: overlayInterpretation(ov2, name1) });
    // Луны
    var moon1 = chart1.planets.Moon, moon2 = chart2.planets.Moon;
    var diff = Math.abs(moon2.signIdx - moon1.signIdx); if (diff>6) diff = 12-diff;
    var moonNote = diff===0 ? 'Луны в одном знаке — глубокая эмоциональная синхронность.'
      : diff===6 ? 'Луны в оппозиции (1-7) — классическое притяжение противоположностей, сильное, но полярное.'
      : (diff===5||diff===4) ? 'Луны в гармоничном аспекте (трин/квадрат кендры) — комфортная эмоциональная связь.'
      : 'Луны в нейтральном положении — эмоциональная совместимость средняя.';
    res.sections.push({ title: 'Луны (эмоциональное ядро)', items: [ moon1.ru + ' в ' + moon1.sign + ' (' + moon1.nakshatra + '), ' + moon2.ru + ' в ' + moon2.sign + ' (' + moon2.nakshatra + '). ' + moonNote ] });
    // Навамша лагны
    function navamsaSign(signIdx, deg){
      var n = Math.floor(deg/(30/9));
      if ([0,3,6,9].indexOf(signIdx)>=0) return (0+n)%12;
      if ([1,4,7,10].indexOf(signIdx)>=0) return (9+n)%12;
      return (6+n)%12;
    }
    var n1 = navamsaSign(chart1.lagna.signIdx, chart1.lagna.deg);
    var n2 = navamsaSign(chart2.lagna.signIdx, chart2.lagna.deg);
    var ndiff = Math.abs(n2-n1); if (ndiff>6) ndiff=12-ndiff;
    var navNote = 'Навамша-Лагны: ' + SIGNS[n1] + ' и ' + SIGNS[n2] + '. ' + (ndiff===0?'Дхарма и «внутренний брак» совпадают — глубокая духовная совместимость.':(ndiff<=2?'Близкие навамши — хорошая внутренняя совместимость.':'Разные навамши — разные внутренние задачи, потребуется терпение.'));
    res.sections.push({ title: 'Навамша (духовный/брачный уровень)', items: [ navNote ] });
    return res;
  }

  return { deepSynastry: deepSynastry, mangalAnalysis: mangalAnalysis, houseOverlay: houseOverlay, moneySynastry: moneySynastry };
}));
