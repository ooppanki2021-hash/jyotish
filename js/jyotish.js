/* ============================================================
   JYOTISH CORE — точный расчёт карты (сидерический зодиак, Лахири)
   Использует Astronomy Engine (MIT) для эфемерид.
   Работает в браузере и в Node (для тестов).
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./astronomy.min.js'));
  } else {
    root.Jyotish = factory(root.Astronomy);
  }
}(typeof self !== 'undefined' ? self : this, function (A) {

  // ---------- Константы ----------
  var SIGNS = ['Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы'];
  var SIGNS_LAT = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  var PLANETS_RU = { Sun:'Солнце', Moon:'Луна', Mercury:'Меркурий', Venus:'Венера', Mars:'Марс', Jupiter:'Юпитер', Saturn:'Сатурн', Rahu:'Раху', Ketu:'Кету' };
  var NAKSHATRA = ['Ашвини','Бхарани','Криттика','Рохини','Мригашира','Ардра','Пунарвасу','Пушья','Ашлеша','Магха','Пурва-Пхалгуни','Уттара-Пхалгуни','Хаста','Читра','Свати','Вишакха','Анурадха','Джйештха','Мула','Пурва-Ашадха','Уттара-Ашадха','Шравана','Дхаништха','Шатабхиша','Пурва-Бхадрапада','Уттара-Бхадрапада','Ревати'];
  var NAK_LORDS = ['Кету','Венера','Солнце','Луна','Марс','Раху','Юпитер','Сатурн','Меркурий'];
  var NAK_YEARS = { 'Кету':7,'Венера':20,'Солнце':6,'Луна':10,'Марс':7,'Раху':18,'Юпитер':16,'Сатурн':19,'Меркурий':17 };
  var BODY_MAP = { Sun:A.Body.Sun, Moon:A.Body.Moon, Mercury:A.Body.Mercury, Venus:A.Body.Venus, Mars:A.Body.Mars, Jupiter:A.Body.Jupiter, Saturn:A.Body.Saturn };

  // ---------- Вспомогательные ----------
  function norm360(x){ x = x % 360; if (x < 0) x += 360; return x; }
  function rad(d){ return d * Math.PI / 180; }
  function deg(r){ return r * 180 / Math.PI; }

  // Юлианская дата из UT-даты
  function jdFromDate(dt){
    return A.MakeTime(dt).ut + 2451545.0; // Astronomy Engine: time.ut = days since J2000? нет — используем .tt/.ut корректно
  }
  // Аккуратный способ: Astronomy Engine MakeTime даёт .ut (UT day number). J2000 = 2451545.
  function makeTime(dt){ return A.MakeTime(dt); }

  // Аянамша Лахири (средняя), градусы. T — юлианские столетия от J2000.
  function ayanamsa(jd){
    var T = (jd - 2451545.0) / 36525.0;
    return 23.857093 + 1.396889*T + 0.000306*T*T - 0.0000003*T*T*T;
  }

  // Средний лунный узел (Раху), тропический, градусы (Meeus гл.47)
  function meanNode(jd){
    var T = (jd - 2451545.0) / 36525.0;
    return 125.0445479 - 1934.1362891*T + 0.0020754*T*T + T*T*T/467441.0 - T*T*T*T/60616000.0;
  }

  // Среднее наклонение эклиптики, градусы
  function obliquity(jd){
    var T = (jd - 2451545.0) / 36525.0;
    return 23.43929111 - 0.0130042*T - 1.64e-7*T*T + 5.04e-7*T*T*T;
  }

  // Тропическая эклиптическая долгота планеты
  function tropicalLon(body, t){
    var v = A.GeoVector(body, t, true);
    var e = A.Ecliptic(v);
    return e.elon;
  }
  function moonLon(t){
    return A.EclipticGeoMoon(t).lon;
  }

  // Сидерическая долгота
  function sidereal(tropLon, jd){
    return norm360(tropLon - ayanamsa(jd));
  }

  // Ретроградность по двум точкам (долгота убывает => R)
  function isRetro(body, t, jd){
    var t2 = t.AddDays(0.25);
    var l1 = tropicalLon(body, t);
    var l2 = tropicalLon(body, t2);
    var d = norm360(l2 - l1);
    return d > 180; // если "назад"
  }

  // Асцендент (тропический), с корректной развязкой квадранта
  function ascendant(lat, lon, t, jd){
    var gmst = A.SiderealTime(t) * 15; // градусы
    var lst = gmst + lon; // локальное звёздное время
    var eps = rad(obliquity(jd));
    var phi = rad(lat);
    var ramc = rad(lst);
    // кандидат
    var l0 = Math.atan2(-Math.cos(ramc), Math.sin(ramc)*Math.cos(eps) + Math.tan(phi)*Math.sin(eps));
    var cands = [norm360(deg(l0)), norm360(deg(l0)+180)];
    // выбираем точку с sin(H) < 0 (восточная, восходящая)
    function sinH(lam){
      var r = rad(lam);
      var ra = Math.atan2(Math.sin(r)*Math.cos(eps), Math.cos(r));
      var H = ramc - ra;
      return Math.sin(H);
    }
    if (sinH(cands[0]) < 0) return cands[0];
    return cands[1];
  }

  // Накшатра и пада
  function nakshatraInfo(sidLon){
    var n = Math.floor(sidLon / (360/27));
    var rem = sidLon % (360/27);
    var pada = Math.floor(rem / (360/27/4)) + 1;
    return { index: n, name: NAKSHATRA[n], lord: NAK_LORDS[n % 9], pada: pada };
  }

  // Варги
  function navamsa(signIdx, deg){
    var n = Math.floor(deg / (30/9));
    if ([0,3,6,9].indexOf(signIdx)>=0) return (0+n)%12;
    if ([1,4,7,10].indexOf(signIdx)>=0) return (9+n)%12;
    return (6+n)%12;
  }
  function dashamsa(signIdx, deg){
    var n = Math.floor(deg / 3);
    return (signIdx % 2 === 0) ? (signIdx+n)%12 : (signIdx+9+n)%12;
  }

  // Достоинства
  var OWN = { Sun:[4], Moon:[3], Mercury:[2,5], Venus:[1,6], Mars:[0,7], Jupiter:[8,11], Saturn:[9,10] };
  var EXALT = { Sun:0, Moon:1, Mercury:5, Venus:11, Mars:9, Jupiter:3, Saturn:6 };
  function dignity(name, signIdx){
    if (OWN[name] && OWN[name].indexOf(signIdx)>=0) return 'в собственном знаке';
    if (EXALT[name] === signIdx) return 'в экзальтации';
    if (EXALT[name] !== undefined && (EXALT[name]+6)%12 === signIdx) return 'в падении';
    return '';
  }
  // Сожжение (градусы до Солнца)
  var COMBUST_DEG = { Sun:0, Moon:12, Mercury:14, Venus:10, Mars:17, Jupiter:11, Saturn:15 };

  // Аспекты (граха-дришти) по целым знакам
  var ASPECT_OFFSETS = {
    Sun:[6], Moon:[6], Mercury:[6], Venus:[6],
    Mars:[3,6,7], Jupiter:[4,6,8], Saturn:[2,6,9],
    Rahu:[4,6,8], Ketu:[4,6,8]
  };
  var ASPECT_NAME = { 6:'7-й дом (оппозиция)', 3:'4-й дом', 7:'8-й дом', 4:'5-й дом', 8:'9-й дом', 2:'3-й дом', 9:'10-й дом' };

  function computeAspects(res){
    var ascSign = res.lagna.signIdx;
    var order = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Rahu','Ketu'];
    var aspects = [];
    order.forEach(function(from){
      var pl = res.planets[from];
      var offs = ASPECT_OFFSETS[from] || [6];
      offs.forEach(function(off){
        var toSign = (pl.signIdx + off) % 12;
        var toHouse = (toSign - ascSign + 12) % 12 + 1;
        var targets = order.filter(function(t){
          return t !== from && res.planets[t].signIdx === toSign;
        }).map(function(t){ return res.planets[t].ru; });
        aspects.push({
          from: from, fromRu: pl.ru, fromHouse: pl.house,
          off: off, aspectName: ASPECT_NAME[off],
          toSign: toSign, toSignName: SIGNS[toSign], toHouse: toHouse,
          targets: targets
        });
      });
    });
    return aspects;
  }
  // Проверить: аспектирует ли планета `name` дом `house`
  function planetAspectsHouse(res, name, house){
    var ascSign = res.lagna.signIdx;
    var pl = res.planets[name];
    if (!pl) return false;
    var offs = ASPECT_OFFSETS[name] || [6];
    for (var i=0;i<offs.length;i++){
      var toSign = (pl.signIdx + offs[i]) % 12;
      var toHouse = (toSign - ascSign + 12) % 12 + 1;
      if (toHouse === house) return true;
    }
    return false;
  }

  // Вишоттари-даша
  function vimshottari(moonSidLon, birthDate){
    var n = Math.floor(moonSidLon / (360/27));
    var frac = (moonSidLon % (360/27)) / (360/27);
    var lordIdx = n % 9;
    var years = NAK_YEARS[NAK_LORDS[lordIdx]];
    var remain = years * (1 - frac);
    // последовательность на 120 лет
    var seq = [];
    for (var k=0;k<9;k++){
      var li = (lordIdx+k)%9;
      seq.push({ planet: NAK_LORDS[li], years: NAK_YEARS[NAK_LORDS[li]] });
    }
    var cur = birthDate.getTime();
    var res = [];
    for (var i=0;i<9;i++){
      var y = (i===0) ? remain : seq[i].years;
      var end = cur + y*365.25*86400000;
      res.push({ planet: seq[i].planet, years: y, start: new Date(cur), end: new Date(end) });
      cur = end;
    }
    return res;
  }
  function antardasha(mahadasha, maha){
    var order = ['Кету','Венера','Солнце','Луна','Марс','Раху','Юпитер','Сатурн','Меркурий'];
    // начинаем с самой махадаши
    var startIdx = order.indexOf(maha.planet);
    var total = maha.years;
    var cur = maha.start.getTime();
    var res = [];
    for (var k=0;k<9;k++){
      var li = (startIdx+k)%9;
      var pl = order[li];
      var y = total * NAK_YEARS[pl] / 120.0;
      var end = cur + y*365.25*86400000;
      res.push({ planet: pl, start: new Date(cur), end: new Date(end) });
      cur = end;
    }
    return res;
  }

  // ---------- Главная функция ----------
  // params: { y, m, d, hh, mm, tz, lat, lon }  (tz — смещение UTC в часах, восток=+)
  function computeChart(p){
    // местное время -> UTC
    var localMs = Date.UTC(p.y, p.m-1, p.d, p.hh, p.mm, 0);
    var utcMs = localMs - p.tz*3600000;
    var utc = new Date(utcMs);
    var t = A.MakeTime(utc);
    var jd = 2451545.0 + t.ut; // ut — дней от J2000? Astronomy: .ut это UT как "day number" от J2000? Проверим ниже.
    // Надёжнее посчитать JD напрямую:
    jd = utcMs/86400000 + 2440587.5; // Unix epoch -> JD

    var ayan = ayanamsa(jd);
    var res = {
      ayanamsa: ayan,
      utc: utc,
      lat: p.lat, lon: p.lon, tz: p.tz,
      lagna: null,
      planets: {},
      houses: {}
    };

    // планеты
    var order = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];
    var trop = {};
    for (var i=0;i<order.length;i++){
      var b = order[i];
      var tl = (b==='Moon') ? moonLon(t) : tropicalLon(BODY_MAP[b], t);
      trop[b] = tl;
    }
    // узлы
    var rahuTrop = meanNode(jd);
    trop['Rahu'] = rahuTrop;
    trop['Ketu'] = norm360(rahuTrop + 180);

    for (var nm in trop){
      var s = sidereal(trop[nm], jd);
      var signIdx = Math.floor(s/30);
      var deg = s % 30;
      var ni = nakshatraInfo(s);
      var ret = false;
      if (nm!=='Moon' && nm!=='Rahu' && nm!=='Ketu') ret = isRetro(BODY_MAP[nm], t, jd);
      if (nm==='Rahu'||nm==='Ketu') ret = true; // всегда "ретроградные" условно
      res.planets[nm] = {
        name: nm, ru: PLANETS_RU[nm],
        sidLon: s, signIdx: signIdx, sign: SIGNS[signIdx],
        deg: deg, degText: fmtDeg(deg),
        nakIdx: ni.index, nakshatra: ni.name, nakLord: ni.lord, pada: ni.pada,
        retro: ret,
        dignity: dignity(nm, signIdx),
        navamsaSign: navamsa(signIdx, deg),
        dashamsaSign: dashamsa(signIdx, deg)
      };
    }

    // Лагна
    var ascTrop = ascendant(p.lat, p.lon, t, jd);
    var ascSid = sidereal(ascTrop, jd);
    var ascSignIdx = Math.floor(ascSid/30);
    var ascDeg = ascSid % 30;
    var ascNi = nakshatraInfo(ascSid);
    res.lagna = {
      sidLon: ascSid, signIdx: ascSignIdx, sign: SIGNS[ascSignIdx],
      deg: ascDeg, degText: fmtDeg(ascDeg),
      nakshatra: ascNi.name, nakLord: ascNi.lord, pada: ascNi.pada
    };

    // Дома (whole sign): дом = (sign планеты - sign лагны +12)%12 +1
    for (var pl in res.planets){
      var p2 = res.planets[pl];
      var house = (p2.signIdx - ascSignIdx + 12) % 12 + 1;
      p2.house = house;
      res.houses[pl] = house;
    }
    res.lagnaHouse = 1;

    // Лагнеша (управитель знака Лагны)
    var LAGNA_LORD = { 0:'Марс',1:'Венера',2:'Меркурий',3:'Луна',4:'Солнце',5:'Меркурий',6:'Венера',7:'Марс',8:'Юпитер',9:'Сатурн',10:'Сатурн',11:'Юпитер' };
    res.lagnaLord = LAGNA_LORD[ascSignIdx];

    // Атмакарака (планета с наибольшей долготой в знаке)
    var maxDeg = -1, ak = null;
    for (var p3 in res.planets){
      if (['Rahu','Ketu'].indexOf(p3)>=0) continue;
      if (res.planets[p3].deg > maxDeg){ maxDeg = res.planets[p3].deg; ak = p3; }
    }
    res.atmakaraka = ak;

    // Сожжение (по близости к Солнцу)
    var sunLon = res.planets['Sun'].sidLon;
    for (var p4 in res.planets){
      var pln = res.planets[p4];
      if (p4==='Sun') continue;
      var dist = Math.abs(norm360(pln.sidLon - sunLon));
      if (dist > 180) dist = 360 - dist;
      pln.combustDist = dist;
      pln.combust = dist < COMBUST_DEG[p4];
    }

    // Даши
    res.mahadasha = vimshottari(res.planets['Moon'].sidLon, utc);
    // текущая махадаша и антарадаша (относительно "сегодня")
    var now = Date.now();
    var curMaha = null;
    for (var i=0;i<res.mahadasha.length;i++){
      if (now >= res.mahadasha[i].start.getTime() && now < res.mahadasha[i].end.getTime()) curMaha = res.mahadasha[i];
    }
    if (!curMaha) curMaha = res.mahadasha[res.mahadasha.length-1];
    res.currentMaha = curMaha;
    var ant = antardasha(res.mahadasha, curMaha);
    var curAnt = null;
    for (var j=0;j<ant.length;j++){
      if (now >= ant[j].start.getTime() && now < ant[j].end.getTime()) curAnt = ant[j];
    }
    if (!curAnt) curAnt = ant[ant.length-1];
    res.currentAntar = curAnt;
    res.currentAntarList = ant;

    // Аспекты (граха-дришти)
    res.aspects = computeAspects(res);

    return res;
  }

  // Транзиты на текущий момент (Сатурн, Юпитер, Раху, Кету)
  function transits(){
    var now = new Date();
    var t = A.MakeTime(now);
    var jd = now.getTime()/86400000 + 2440587.5;
    function sid(body){ return sidereal(tropicalLon(body, t), jd); }
    function nodeSid(){
      var r = meanNode(jd);
      return { rahu: sidereal(r, jd), ketu: sidereal(r+180, jd) };
    }
    var n = nodeSid();
    function pl(lam){
      var si = Math.floor(lam/30);
      return { signIdx: si, sign: SIGNS[si], deg: lam%30, degText: fmtDeg(lam%30) };
    }
    return {
      Saturn: pl(sid(A.Body.Saturn)),
      Jupiter: pl(sid(A.Body.Jupiter)),
      Rahu: pl(n.rahu),
      Ketu: pl(n.ketu)
    };
  }

  function fmtDeg(d){
    var dd = Math.floor(d);
    var mf = (d-dd)*60; var mi = Math.floor(mf);
    return dd + '°' + (mi<10?'0':'') + mi + "'";
  }

  return {
    computeChart: computeChart,
    ayanamsa: ayanamsa,
    SIGNS: SIGNS,
    PLANETS_RU: PLANETS_RU,
    NAKSHATRA: NAKSHATRA,
    NAK_YEARS: NAK_YEARS,
    vimshottari: vimshottari,
    antardasha: antardasha,
    transits: transits,
    computeAspects: computeAspects,
    planetAspectsHouse: planetAspectsHouse,
    NAK_YEARS_MAP: NAK_YEARS
  };
}));
