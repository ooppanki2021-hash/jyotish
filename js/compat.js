/* ============================================================
   СОВМЕСТИМОСТЬ — Аштакота гун-милан (классические 36 баллов)
   По Луне (раши + накшатра) обоих партнёров.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Compat = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // Накшатры 0..26
  var NAK = ['Ашвини','Бхарани','Криттика','Рохини','Мригашира','Ардра','Пунарвасу','Пушья','Ашлеша','Магха','Пурва-Пхалгуни','Уттара-Пхалгуни','Хаста','Читра','Свати','Вишакха','Анурадха','Джйештха','Мула','Пурва-Ашадха','Уттара-Ашадха','Шравана','Дхаништха','Шатабхиша','Пурва-Бхадрапада','Уттара-Бхадрапада','Ревати'];

  // Гана
  var GANA = {};
  ['Ашвини','Мригашира','Пунарвасу','Пушья','Хаста','Свати','Анурадха','Шравана','Ревати'].forEach(function(n){ GANA[n]='Deva'; });
  ['Бхарани','Рохини','Ардра','Пурва-Пхалгуни','Уттара-Пхалгуни','Пурва-Ашадха','Уттара-Ашадха','Пурва-Бхадрапада','Уттара-Бхадрапада'].forEach(function(n){ GANA[n]='Manushya'; });
  ['Криттика','Ашлеша','Магха','Читра','Вишакха','Джйештха','Мула','Дхаништха','Шатабхиша'].forEach(function(n){ GANA[n]='Rakshasa'; });

  // Нади
  var NADI = {};
  ['Ашвини','Ардра','Пунарвасу','Уттара-Пхалгуни','Хаста','Джйештха','Мула','Шатабхиша','Пурва-Бхадрапада'].forEach(function(n){ NADI[n]='Adi'; });
  ['Бхарани','Мригашира','Пушья','Пурва-Пхалгуни','Читра','Анурадха','Пурва-Ашадха','Дхаништха','Уттара-Бхадрапада'].forEach(function(n){ NADI[n]='Madhya'; });
  ['Криттика','Рохини','Ашлеша','Магха','Свати','Вишакха','Уттара-Ашадха','Шравана','Ревати'].forEach(function(n){ NADI[n]='Antya'; });

  // Йони (животное + пол)
  var YONI = {
    'Ашвини':['Horse','M'],'Бхарани':['Elephant','M'],'Криттика':['Sheep','F'],'Рохини':['Serpent','M'],
    'Мригашира':['Serpent','F'],'Ардра':['Dog','F'],'Пунарвасу':['Cat','F'],'Пушья':['Sheep','M'],
    'Ашлеша':['Cat','M'],'Магха':['Rat','M'],'Пурва-Пхалгуни':['Rat','F'],'Уттара-Пхалгуни':['Cow','M'],
    'Хаста':['Buffalo','F'],'Читра':['Tiger','F'],'Свати':['Buffalo','M'],'Вишакха':['Tiger','M'],
    'Анурадха':['Deer','F'],'Джйештха':['Deer','M'],'Мула':['Dog','M'],'Пурва-Ашадха':['Monkey','F'],
    'Уттара-Ашадха':['Mongoose','M'],'Шравана':['Monkey','M'],'Дхаништха':['Lion','F'],'Шатабхиша':['Horse','F'],
    'Пурва-Бхадрапада':['Lion','M'],'Уттара-Бхадрапада':['Cow','F'],'Ревати':['Elephant','F']
  };
  // враждебные пары животных (симметрично)
  var YONI_ENEMY = [
    ['Horse','Buffalo'],['Elephant','Lion'],['Sheep','Monkey'],['Serpent','Mongoose'],
    ['Cat','Rat'],['Cow','Tiger'],['Deer','Tiger'],['Dog','Rat']
  ];
  var YONI_FRIEND = [
    ['Horse','Deer'],['Horse','Elephant'],['Elephant','Cow'],['Sheep','Cow'],['Sheep','Deer'],
    ['Dog','Deer'],['Monkey','Deer'],['Lion','Deer'],['Buffalo','Cow']
  ];

  // Варна по знаку Луны
  var VARNA = {
    'Рак':3,'Скорпион':3,'Рыбы':3,
    'Овен':2,'Лев':2,'Стрелец':2,
    'Телец':1,'Дева':1,'Козерог':1,
    'Близнецы':0,'Весы':0,'Водолей':0
  };

  // Вашья по знаку Луны (упрощённо, целые знаки)
  var VASHYA = {
    'Близнецы':'Manava','Дева':'Manava','Весы':'Manava','Стрелец':'Manava','Водолей':'Manava',
    'Овен':'Chatushpada','Телец':'Chatushpada','Лев':'Chatushpada','Козерог':'Chatushpada',
    'Рак':'Jalachara','Рыбы':'Jalachara',
    'Скорпион':'Keeta'
  };
  var VASHYA_SCORE = {
    'Manava':{'Manava':2,'Chatushpada':2,'Jalachara':1,'Keeta':1},
    'Chatushpada':{'Manava':2,'Chatushpada':2,'Jalachara':0,'Keeta':1},
    'Jalachara':{'Manava':1,'Chatushpada':1,'Jalachara':2,'Keeta':0},
    'Keeta':{'Manava':1,'Chatushpada':1,'Jalachara':0,'Keeta':2}
  };

  // Управители знаков Луны и естественная дружба
  var LORD = { 'Овен':'Марс','Телец':'Венера','Близнецы':'Меркурий','Рак':'Луна','Лев':'Солнце','Дева':'Меркурий','Весы':'Венера','Скорпион':'Марс','Стрелец':'Юпитер','Козерог':'Сатурн','Водолей':'Сатурн','Рыбы':'Юпитер' };
  var FRIEND = {
    'Солнце':{ 'Луна':'F','Марс':'F','Юпитер':'F','Меркурий':'N','Венера':'E','Сатурн':'E' },
    'Луна':{ 'Солнце':'F','Меркурий':'F','Марс':'N','Юпитер':'N','Венера':'N','Сатурн':'N' },
    'Марс':{ 'Солнце':'F','Луна':'F','Юпитер':'F','Меркурий':'E','Венера':'N','Сатурн':'N' },
    'Меркурий':{ 'Солнце':'F','Венера':'F','Луна':'E','Марс':'N','Юпитер':'N','Сатурн':'N' },
    'Юпитер':{ 'Солнце':'F','Луна':'F','Марс':'F','Меркурий':'E','Венера':'E','Сатурн':'N' },
    'Венера':{ 'Меркурий':'F','Сатурн':'F','Солнце':'E','Луна':'E','Марс':'N','Юпитер':'N' },
    'Сатурн':{ 'Меркурий':'F','Венера':'F','Солнце':'E','Луна':'E','Марс':'E','Юпитер':'N' }
  };

  function yoniScore(a, b){
    if (a[0]===b[0]){
      return (a[1]===b[1]) ? 3 : 4; // одно животное: разный пол 4, один пол 3
    }
    var pair = [a[0], b[0]].sort().join('|');
    var isEnemy = YONI_ENEMY.some(function(e){ return e.slice().sort().join('|')===pair; });
    if (isEnemy) return 0;
    var isFriend = YONI_FRIEND.some(function(e){ return e.slice().sort().join('|')===pair; });
    return isFriend ? 2 : 1;
  }

  function grahaMaitriScore(l1, l2){
    if (l1===l2) return 5;
    var r1 = FRIEND[l1][l2], r2 = FRIEND[l2][l1];
    if (r1==='F' && r2==='F') return 5;
    if ((r1==='F' && r2==='N') || (r1==='N' && r2==='F')) return 4;
    if (r1==='N' && r2==='N') return 4;
    if ((r1==='F' && r2==='E') || (r1==='E' && r2==='F')) return 1;
    if ((r1==='N' && r2==='E') || (r1==='E' && r2==='N')) return 0.5;
    return 0; // E+E
  }

  // chart1 = «невеста», chart2 = «жених» (для асимметрии варны/тары)
  function ashtakoota(chart1, chart2, name1, name2){
    var m1 = chart1.planets.Moon, m2 = chart2.planets.Moon;
    var r = { kutas: [], total: 0, max: 36 };

    // 1. Варна (1)
    var v1 = VARNA[m1.sign], v2 = VARNA[m2.sign];
    var vScore = (v2 >= v1) ? 1 : 0; // жених не ниже невесты
    r.kutas.push({ name:'Варна', max:1, score:vScore, detail:'невеста «'+varnaName(v1)+'», жених «'+varnaName(v2)+'»' });

    // 2. Вашья (2)
    var va1 = VASHYA[m1.sign], va2 = VASHYA[m2.sign];
    var vaScore = VASHYA_SCORE[va1][va2];
    r.kutas.push({ name:'Вашья', max:2, score:vaScore, detail:va1+' ↔ '+va2 });

    // 3. Тара (3)
    var n1 = NAK.indexOf(m1.nakshatra), n2 = NAK.indexOf(m2.nakshatra);
    var d = (n2 - n1 + 27) % 27 + 1;
    var d2 = (n1 - n2 + 27) % 27 + 1;
    var bad1 = (d % 9 === 3 || d % 9 === 5 || d % 9 === 7);
    var bad2 = (d2 % 9 === 3 || d2 % 9 === 5 || d2 % 9 === 7);
    var tScore = 3 - (bad1?1.5:0) - (bad2?1.5:0);
    r.kutas.push({ name:'Тара', max:3, score:tScore, detail:'накшатры «'+m1.nakshatra+'» и «'+m2.nakshatra+'»' });

    // 4. Йони (4)
    var y1 = YONI[m1.nakshatra], y2 = YONI[m2.nakshatra];
    var yScore = yoniScore(y1, y2);
    r.kutas.push({ name:'Йони', max:4, score:yScore, detail:y1[0]+'('+y1[1]+') ↔ '+y2[0]+'('+y2[1]+')' });

    // 5. Граха-майтри (5)
    var l1 = LORD[m1.sign], l2 = LORD[m2.sign];
    var gScore = grahaMaitriScore(l1, l2);
    r.kutas.push({ name:'Граха-майтри', max:5, score:gScore, detail:'владыки Луны: '+l1+' ↔ '+l2 });

    // 6. Гана (6)
    var ga1 = GANA[m1.nakshatra], ga2 = GANA[m2.nakshatra];
    var gaScore;
    if (ga1===ga2) gaScore = 6;
    else if ((ga1==='Deva'&&ga2==='Manushya')||(ga1==='Manushya'&&ga2==='Deva')) gaScore = 5;
    else gaScore = 0;
    r.kutas.push({ name:'Гана', max:6, score:gaScore, detail:ga1+' ↔ '+ga2 });

    // 7. Бхукут (7) — по позициям знаков Луны
    var s1 = SIGNS_IDX[m1.sign], s2 = SIGNS_IDX[m2.sign];
    var diff = Math.abs(s2 - s1); if (diff > 6) diff = 12 - diff; // 0..6
    var bScore;
    if (diff === 0) bScore = 7; // 1-1
    else if (diff === 6) bScore = 0; // 1-7
    else if (diff === 5) bScore = 7; // 5-9
    else if (diff === 4) bScore = 7; // 4-10
    else if (diff === 3) bScore = 7; // 3-11
    else bScore = 0; // 2-12, 6-8
    r.kutas.push({ name:'Бхукут', max:7, score:bScore, detail:'Луна в '+m1.sign+' и '+m2.sign });

    // 8. Нади (8)
    var nd1 = NADI[m1.nakshatra], nd2 = NADI[m2.nakshatra];
    var nScore = (nd1===nd2) ? 0 : 8;
    r.kutas.push({ name:'Нади', max:8, score:nScore, detail:(nd1===nd2?'одинаковая нади ('+nd1+') — нади-доша':nd1+' ↔ '+nd2) });

    r.total = r.kutas.reduce(function(s,k){ return s+k.score; }, 0);
    r.verdict = verdict(r.total);
    return r;
  }

  var SIGNS_IDX = { 'Овен':0,'Телец':1,'Близнецы':2,'Рак':3,'Лев':4,'Дева':5,'Весы':6,'Скорпион':7,'Стрелец':8,'Козерог':9,'Водолей':10,'Рыбы':11 };
  function varnaName(v){ return ['шудра','вайшья','кшатрия','брахман'][v] || '?'; }
  function verdict(total){
    if (total >= 32) return 'Идеальная совместимость — очень благоприятный союз.';
    if (total >= 25) return 'Очень хорошая совместимость — гармоничный союз.';
    if (total >= 18) return 'Средняя совместимость — союз возможен, но потребует усилий.';
    return 'Низкая совместимость — союз проблематичен, требует большой работы.';
  }

  return { ashtakoota: ashtakoota, NAK: NAK };
}));
