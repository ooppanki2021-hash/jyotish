/* lifemap.js — «Карта сфер жизни»: 12 сфер по домам, оценка 1–10 с пояснениями,
   кармический блок с действиями и итоговое качество жизни.
   Экспортирует LifeMap.analyze(chart) → { areas, karma, total }.
   UMD + защита от двойного подключения. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(root || {}); }
  else { root.LifeMap = factory(root); }
})(typeof self !== 'undefined' ? self : this, function (root) {
  if (root.LifeMap) return root.LifeMap;

  var J = root.Jyotish;
  var DS = root.Destiny;
  if (!J && typeof require === 'function') { J = require('./jyotish.js'); }
  if (!DS && typeof require === 'function') { DS = require('./destiny.js'); }

  var SIGNS = ['Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы'];
  var LORDS = { 0:'Марс',1:'Венера',2:'Меркурий',3:'Луна',4:'Солнце',5:'Меркурий',6:'Венера',7:'Марс',8:'Юпитер',9:'Сатурн',10:'Сатурн',11:'Юпитер' };
  var RU2EN = { 'Солнце':'Sun','Луна':'Moon','Меркурий':'Mercury','Венера':'Venus','Марс':'Mars','Юпитер':'Jupiter','Сатурн':'Saturn','Раху':'Rahu','Кету':'Ketu' };
  var EXALT = { Sun:0, Moon:1, Mars:9, Mercury:5, Jupiter:3, Venus:11, Saturn:6, Rahu:1, Ketu:7 };
  var DEBIL = { Sun:6, Moon:7, Mars:3, Mercury:11, Jupiter:9, Venus:5, Saturn:0, Rahu:7, Ketu:1 };
  var FRIENDS = {
    'Солнце':  { f:['Луна','Марс','Юпитер'], e:['Венера','Сатурн'] },
    'Луна':    { f:['Солнце','Меркурий'], e:[] },
    'Меркурий':{ f:['Солнце','Венера'], e:['Луна'] },
    'Венера':  { f:['Меркурий','Сатурн'], e:['Солнце','Луна'] },
    'Марс':    { f:['Солнце','Луна','Юпитер'], e:['Меркурий'] },
    'Юпитер':  { f:['Солнце','Луна','Марс'], e:['Меркурий','Венера'] },
    'Сатурн':  { f:['Меркурий','Венера'], e:['Солнце','Луна','Марс'] }
  };

  // 12 сфер = 12 домов
  var AREAS = [
    { h:1,  name:'Личность и энергия',        emoji:'🔥', action:'Режим сна, спорт и личные границы: ваша энергия восстанавливается через тело и дисциплину.' },
    { h:2,  name:'Деньги и ресурсы',           emoji:'💰', action:'Учёт доходов и чистая речь: деньги этой сферы растут от ясности и порядка.' },
    { h:3,  name:'Смелость, навыки, общение',  emoji:'✍️', action:'Маленький смелый шаг каждую неделю: навык, поездка, важный разговор.' },
    { h:4,  name:'Дом, семья, внутренний покой', emoji:'🏠', action:'Порядок в доме и время с близкими — главный источник восстановления.' },
    { h:5,  name:'Любовь, дети, творчество',   emoji:'❤️', action:'Творческий проект или время с детьми: это подпитывает вашу удачу.' },
    { h:6,  name:'Работа, здоровье, рутина',   emoji:'🛠️', action:'Чек-листы, профилактика здоровья и посильная нагрузка: сфера любит систему.' },
    { h:7,  name:'Брак и партнёрство',         emoji:'💍', action:'Проговаривайте ожидания словами: здесь решают ясность и баланс «брать/давать».' },
    { h:8,  name:'Кризисы и трансформации',    emoji:'🌪️', action:'Финансовая подушка, честность с собой и умение отпускать — снижают «кризисность».' },
    { h:9,  name:'Удача, учение, дальние дороги', emoji:'🍀', action:'Учитесь и расширяйте горизонты: удача приходит через знания и поездки.' },
    { h:10, name:'Карьера и статус',           emoji:'🏆', action:'Цель на 90 дней и видимые результаты: карьера здесь строится витрина за витриной.' },
    { h:11, name:'Доходы, мечты, окружение',   emoji:'🤝', action:'Нетворкинг и командные цели: большие доходы приходят через людей.' },
    { h:12, name:'Уединение, потери, заграница', emoji:'🌙', action:'Отдых, тишина и завершение «хвостов» — не роскошь, а ваш ресурс.' }
  ];

  var THEME = {
    'Солнце':'самовыражение, цели и внутренний стержень',
    'Луна':'эмоции, адаптивность и интуиция',
    'Меркурий':'ум, коммуникация и навыки',
    'Венера':'любовь, деньги и гармония',
    'Марс':'драйв, напор и действие',
    'Юпитер':'рост, удача и защита',
    'Сатурн':'дисциплина, выдержка и долговечность',
    'Раху':'амбиции, нестандартность и одержимость целью',
    'Кету':'опыт, отрешённость и духовная зрелость'
  };

  // Вклад планеты в доме: обычные дома
  var IN_HOUSE = {
    'Юпитер': +2.0, 'Венера': +1.5, 'Меркурий': +1.0, 'Луна': +1.0,
    'Сатурн': -1.6, 'Марс': -1.2, 'Раху': -1.5, 'Кету': -1.1, 'Солнце': -0.6
  };
  // Дома усилий (упачай): вредители дают пробивную силу
  var UPACHAYA = { 3:true, 6:true, 11:true };
  var IN_HOUSE_UP = {
    'Сатурн': +1.6, 'Марс': +1.4, 'Раху': +1.5, 'Солнце': +0.8,
    'Юпитер': +1.0, 'Венера': +0.8, 'Меркурий': +0.6, 'Луна': +0.6, 'Кету': -0.5
  };
  var GEN = { 'Солнце':'Солнца','Луна':'Луны','Меркурий':'Меркурия','Венера':'Венеры','Марс':'Марса','Юпитер':'Юпитера','Сатурн':'Сатурна','Раху':'Раху','Кету':'Кету' };
  // Аспекты на дом
  var ASPECT_W = {
    'Юпитер': +1.0, 'Венера': +0.6, 'Меркурий': +0.4, 'Луна': +0.4,
    'Сатурн': -0.8, 'Марс': -0.7, 'Раху': -0.8, 'Кету': -0.5, 'Солнце': -0.4
  };

  function r1(x){ return Math.round(x * 10) / 10; }
  function clamp(x){ return Math.min(10, Math.max(1, x)); }

  function verdictFor(score){
    if (score < 2.5) return { v:'Тяжело', cls:'lm-bad', note:'нужен план и поддержка' };
    if (score < 4.5) return { v:'Через усилие', cls:'lm-hard', note:'результат будет, но за работу' };
    if (score < 6)   return { v:'Ровно', cls:'lm-mid', note:'ни попутного ветра, ни встречного' };
    if (score < 7.5) return { v:'Легко', cls:'lm-good', note:'карта даёт попутный ветер' };
    return { v:'Всё само', cls:'lm-great', note:'сильная опора от рождения' };
  }

  function signOfHouse(chart, h){ return (chart.lagna.signIdx + h - 1) % 12; }

  function lordDignity(chart, lordRu){
    var key = RU2EN[lordRu]; if (!key) return { delta:0, text:'' };
    var pl = chart.planets[key]; if (!pl) return { delta:0, text:'' };
    var d = 0, txt = '';
    if (EXALT[key] === pl.signIdx)      { d = +2.0; txt = 'управитель ' + lordRu + ' в экзальтации (' + pl.sign + ') — сфера работает на максимуме'; }
    else if (pl.dignity === 'в собственном знаке') { d = +1.5; txt = 'управитель ' + lordRu + ' в своём знаке (' + pl.sign + ') — сфера под надёжным контролем'; }
    else if (DEBIL[key] === pl.signIdx) { d = -2.0; txt = 'управитель ' + lordRu + ' в падении (' + pl.sign + ') — сфере нужно больше вашего внимания'; }
    else {
      var signLord = LORDS[pl.signIdx];
      var fr = FRIENDS[lordRu];
      if (fr && fr.f.indexOf(signLord) >= 0) { d = +0.5; txt = 'управитель ' + lordRu + ' в дружественном знаке (' + pl.sign + ') — мягкая поддержка'; }
      else if (fr && fr.e.indexOf(signLord) >= 0) { d = -1.0; txt = 'управитель ' + lordRu + ' во враждебном знаке (' + pl.sign + ') — сфера даётся с трением'; }
    }
    if (pl.combust) { d -= 1.0; txt += (txt ? '; ' : 'управитель ' + lordRu) + ' сожжён Солнцем — темы сферы «перегреваются», решения принимаются на эмоциях'; }
    return { delta: d, text: txt };
  }

  function analyze(chart, destiny){
    var dest = destiny || (DS ? DS.analyze(chart) : null);
    var aspects = chart.aspects || (J.computeAspects ? J.computeAspects(chart) : []);

    var areas = AREAS.map(function (A) {
      var h = A.h;
      var score = (h === 8 || h === 12) ? 4.6 : 5.0;
      var factors = [];
      var up = UPACHAYA[h];
      var dusthana = (h === 8 || h === 12);

      // 1) планеты в сфере
      var found = [];
      Object.keys(chart.planets).forEach(function (k) {
        var pl = chart.planets[k];
        if (pl.house !== h) return;
        found.push(pl);
        var w = up ? IN_HOUSE_UP[pl.ru] : IN_HOUSE[pl.ru];
        if (typeof w !== 'number') w = 0;
        if (dusthana) w = w * 0.7;
        var word = w >= 0
          ? 'усиливает её: ' + THEME[pl.ru] + ' — ваша опора здесь'
          : 'напрягает её: ' + THEME[pl.ru] + ' — требуют контроля и дисциплины';
        var extra = '';
        if (up && IN_HOUSE[pl.ru] < 0) extra = ' (в доме усилий это пробивная сила, а не помеха)';
        if (dusthana) extra = ' (дом трансформации: результат приходит через отпускание контроля)';
        factors.push({ d: r1(w), t: pl.ru + ' в сфере «' + A.name + '»: ' + word + extra });
      });
      if (!found.length) {
        factors.push({ d: 0, t: 'Планет в этой сфере нет — она работает ровно, без особых усилений и испытаний.' });
      }

      // 2) управитель сферы
      var sign = signOfHouse(chart, h);
      var lord = LORDS[sign];
      var ld = lordDignity(chart, lord);
      if (ld.text) factors.push({ d: r1(ld.delta), t: 'Сферой управляет знак ' + SIGNS[sign] + ': ' + ld.text });

      // 3) аспекты на сферу
      var aspSum = 0, aspN = 0;
      aspects.forEach(function (a) {
        if (a.toHouse !== h) return;
        var w = ASPECT_W[a.fromRu];
        if (typeof w !== 'number') return;
        aspSum += w; aspN++;
        factors.push({ d: r1(w), t: 'Аспект ' + (GEN[a.fromRu] || a.fromRu) + ' на сферу: ' + (w >= 0 ? 'взгляд поддержки — ' + THEME[a.fromRu] : 'взгляд давления — ' + THEME[a.fromRu]) });
      });
      if (aspSum > 2)  { factors.push({ d: r1(2 - aspSum), t: 'Слишком много поддержки сразу — эффект притупляется' }); }
      if (aspSum < -2) { factors.push({ d: r1(-2 - aspSum), t: 'Слишком много давления сразу — часть его нейтрализует друг друга' }); }

      score = clamp(score + factors.reduce(function (s, f) { return s + f.d; }, 0));
      score = r1(score);
      var vd = verdictFor(score);
      var karmaNote = '';
      if (dest && dest.debts && dest.debts.some(function (x) { return x.house === h; })) {
        karmaNote = '⚠ Здесь же кармический долг — смотрите блок кармы ниже.';
      }
      return {
        house: h, name: A.name, emoji: A.emoji, score: score,
        verdict: vd.v, verdictNote: vd.note, cls: vd.cls,
        factors: factors, action: A.action, karmaNote: karmaNote
      };
    });

    // ---- Кармический блок ----
    var karma = [];
    if (dest) {
      var RAHU_ACT = {
        1:'смелее проявляйтесь: внешность, личные инициативы — зона роста',
        2:'наращивайте своё: деньги, речь, ценности — не бойтесь владеть',
        3:'пишите, выступайте, учитесь новому навыку и договаривайтесь',
        4:'стройте корни: дом, недвижимость, эмоциональную близость с семьёй',
        5:'творите и любите открыто: проекты, дети, романтические шаги',
        6:'идите в конкуренцию и сервис: работа, здоровье, помощь другим',
        7:'учитесь партнёрству: брак, клиенты, открытые договорённости',
        8:'не избегайте глубины: психология, финансы, трансформация',
        9:'расширяйтесь: учение, заграница, философия, наставники',
        10:'берите статус: карьерные цели, публичность, ответственность',
        11:'собирайте людей: команды, сообщества, большие цели и доходы',
        12:'давайте миру: служение, уединённый труд, завершение дел'
      };
      var ax = dest.axis;
      karma.push({ title:'Раху в ' + ax.rahuHouse + '-м доме (' + ax.rahuSign + ')', why:'Ваше направление роста души. ' + ax.rahuText, action: RAHU_ACT[ax.rahuHouse] || 'осознанно развивайте темы этого дома' });
      karma.push({ title:'Кету в ' + ax.ketuHouse + '-м доме (' + ax.ketuSign + ')', why:'Врождённый багаж, который тянет назад, если жить только им. ' + ax.ketuText, action:'замечайте, когда «по привычке» уходите в эту зону комфорта, и возвращайтесь к Раху' });
      if (dest.soul && dest.soul.text) {
        karma.push({ title:'Урок души: Атмакарака ' + dest.soul.planet + ' (' + dest.soul.house + '-й дом)', why: dest.soul.text, action:'раз в неделю проверяйте себя по этому уроку — это главный «тренажёр» карты' });
      }
      (dest.debts || []).slice(0, 2).forEach(function (db) {
        karma.push({ title: db.title, why: db.text, action:'прорабатывайте ежедневно, через привычки сферы ' + db.house + '-го дома' });
      });
      karma = karma.slice(0, 5);
    }

    // ---- Итог: качество жизни ----
    var W = { 1:1.6, 10:1.6, 7:1.5, 4:1.4, 5:1.3, 9:1.3, 2:1.2, 11:1.1, 3:1.0, 6:1.0, 8:0.7, 12:0.7 };
    var sum = 0, wsum = 0;
    areas.forEach(function (a) { sum += a.score * (W[a.house] || 1); wsum += (W[a.house] || 1); });
    var totalScore = r1(sum / wsum);
    var sorted = areas.slice().sort(function (a, b) { return b.score - a.score; });
    var supports = sorted.slice(0, 3).map(function (a) { return a.name + ' (' + a.score + ')'; });
    var risks = sorted.slice(-3).reverse().map(function (a) { return a.name + ' (' + a.score + ')'; });
    var tVerdict;
    if (totalScore >= 7.5)      tVerdict = 'Карта сильная: жизнь в целом складывается сама, главное — не ломать свои опоры.';
    else if (totalScore >= 6)   tVerdict = 'Хороший расклад: явные опоры перевешивают, слабые зоны управляемы и поддаются работе.';
    else if (totalScore >= 4.5) tVerdict = 'Рабочая карта: ничего не даётся даром, но всё достижимо — системностью, а не нахрапом.';
    else if (totalScore >= 3)   tVerdict = 'Карта с вызовом: успех возможен, но через осознанный план и дисциплину.';
    else                        tVerdict = 'Жёсткий маршрут: нужны союзники, маленькие шаги и терпение — но маршрут проходим.';

    return {
      areas: areas,
      karma: karma,
      total: { score: totalScore, verdict: tVerdict, supports: supports, risks: risks }
    };
  }

  var LifeMap = { analyze: analyze, AREAS: AREAS, verdictFor: verdictFor };
  if (root && typeof root === 'object') root.LifeMap = LifeMap;
  return LifeMap;
});
