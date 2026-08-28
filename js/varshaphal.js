/* ============================================================
   ВАРШАПХАЛ — годовой прогноз (Таджика)
   Солнечное возвращение + Мунтха + управитель года + транзиты года.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./astronomy.min.js'), require('./jyotish.js'));
  } else {
    root.Varshaphal = factory(root.Astronomy, root.Jyotish);
  }
}(typeof self !== 'undefined' ? self : this, function (A, J) {

  var SIGNS = J.SIGNS;
  var BODY = { 'Sun':A.Body.Sun, 'Moon':A.Body.Moon, 'Mercury':A.Body.Mercury, 'Venus':A.Body.Venus, 'Mars':A.Body.Mars, 'Jupiter':A.Body.Jupiter, 'Saturn':A.Body.Saturn };

  function norm360(x){ x%=360; if(x<0)x+=360; return x; }
  function ayanamsa(jd){ var T=(jd-2451545.0)/36525.0; return 23.857093+1.396889*T+0.000306*T*T-0.0000003*T*T*T; }

  function tropicalLon(body, t){ return A.Ecliptic(A.GeoVector(body, t, true)).elon; }
  function sidLon(body, t){
    var jd = t.ut + 2451545.0;
    return norm360(tropicalLon(body, t) - ayanamsa(jd));
  }

  // Найти время солнечного возвращения: Солнце возвращается к натальному
  // тропическому долготе (натальный сидерический + аянамша в момент возврата).
  function solarReturnTime(natalSunSid, afterDate){
    // Ищем вперёд до 370 дней. Для каждой попытки считаем тропическую цель.
    // Тропическая долгота цели почти постоянна (аянамша медленно меняется), поэтому
    // используем натальную тропическую долготу как старт, затем уточним.
    // Для простоты и стабильности: ищем, когда сидерическая долгота Солнца
    // снова станет равна натальной (через бинарный поиск по тропическому прохождению).
    var t0 = A.MakeTime(afterDate);
    // тропическая цель: сид = trop - ay(jd). Найдём trop такой что trop - ay = natalSunSid.
    // Итерируем: используем ay на дату поиска.
    var jd0 = afterDate.getTime()/86400000 + 2440587.5;
    var targetTrop = norm360(natalSunSid + ayanamsa(jd0));
    var found = A.SearchSunLongitude(targetTrop, t0, 370);
    if (!found) return null;
    // уточнение: пересчёт цели с аянамшей на найденный момент (малая поправка)
    var jdF = found.ut + 2451545.0;
    var targetTrop2 = norm360(natalSunSid + ayanamsa(jdF));
    var found2 = A.SearchSunLongitude(targetTrop2, A.MakeTime(found.ut - 3), 20);
    return found2 || found;
  }

  // Позиции планет на момент (сидерические)
  function planetsAt(time){
    var out = {};
    var t = time;
    ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'].forEach(function(b){
      out[b] = b==='Moon' ? norm360(A.EclipticGeoMoon(t).lon - ayanamsa(t.ut+2451545.0)) : sidLon(BODY[b], t);
    });
    return out;
  }

  // Мунтха: натальная лагна + возраст (1 знак в год), счёт от 1 (в момент рождения мунтха в лагне)
  function muntha(natalLagnaSignIdx, ageYears){
    return (natalLagnaSignIdx + ageYears) % 12;
  }

  var LORD = ['Марс','Венера','Меркурий','Луна','Солнце','Меркурий','Венера','Марс','Юпитер','Сатурн','Сатурн','Юпитер'];

  // Тематика знака мунтхи
  var MUNTHA_THEME = {
    'Овен':'год инициативы, новых стартов, смелых решений',
    'Телец':'год накопления, комфорта, финансовой устойчивости',
    'Близнецы':'год общения, обучения, связей, перемен',
    'Рак':'год дома, семьи, эмоциональной опоры, материнства',
    'Лев':'год статуса, признания, публичности, лидерства',
    'Дева':'год порядка, здоровья, аналитической работы, служения',
    'Весы':'год партнёрства, договоров, баланса, эстетики',
    'Скорпион':'год трансформации, глубинных перемен, очищения',
    'Стрелец':'год расширения, учёбы, путешествий, философии',
    'Козерог':'год дисциплины, карьеры, долгосрочных целей',
    'Водолей':'год свободы, нестандартных решений, друзей',
    'Рыбы':'год духовности, завершения, отдыха, вдохновения'
  };

  // Значение управителя года
  var YEAR_LORD_THEME = {
    'Солнце':'год через авторитет, статус, отца/начальство, государство',
    'Луна':'год через эмоции, публику, дом, мать, переменчивость',
    'Меркурий':'год через ум, учёбу, коммуникации, бизнес, документы',
    'Венера':'год через любовь, деньги, красоту, удовольствия, брак',
    'Марс':'год через энергию, активность, спорт, конфликты, смелость',
    'Юпитер':'год через мудрость, удачу, наставников, рост, богатство',
    'Сатурн':'год через труд, дисциплину, ограничения, карму, терпение'
  };

  function yearForecast(chart, lat, lon, targetDate){
    // Возраст на целевой момент (для мунтхи)
    var birth = chart.utc;
    var ageYears = Math.floor((targetDate - birth) / (365.25*86400000));

    var sr = solarReturnTime(chart.planets['Sun'].sidLon, targetDate);
    if (!sr) return { error: 'Не удалось рассчитать солнечное возвращение.' };

    var srPlanets = planetsAt(sr);
    // Лагна солнечного возвращения (в месте проживания, сид.)
    var srAscTrop = ascendantTrop(lat, lon, sr);
    var srAsc = norm360(srAscTrop - ayanamsa(sr.ut + 2451545.0));
    var srAscSign = Math.floor(srAsc/30);

    // Мунтха
    var mIdx = muntha(chart.lagna.signIdx, ageYears);
    var yearLord = LORD[mIdx];

    // Транзиты на год: знак Сатурна/Юпитера/Раху в начале и через год
    var trNow = J.transits();

    // Собираем
    var res = {
      age: ageYears,
      solarReturnDate: sr.date,
      solarReturnAsc: SIGNS[srAscSign],
      solarReturnPlanets: {},
      muntha: SIGNS[mIdx],
      munthaTheme: MUNTHA_THEME[SIGNS[mIdx]],
      yearLord: yearLord,
      yearLordTheme: YEAR_LORD_THEME[yearLord],
      transits: trNow
    };
    for (var k in srPlanets){
      res.solarReturnPlanets[k] = SIGNS[Math.floor(srPlanets[k]/30)];
    }
    return res;
  }

  function ascendantTrop(lat, lon, time){
    var gmst = A.SiderealTime(time) * 15;
    var lst = gmst + lon;
    var jd = time.ut + 2451545.0;
    var T = (jd-2451545.0)/36525.0;
    var eps = (23.43929111 - 0.0130042*T) * Math.PI/180;
    var phi = lat*Math.PI/180;
    var ramc = lst*Math.PI/180;
    var l0 = Math.atan2(-Math.cos(ramc), Math.sin(ramc)*Math.cos(eps) + Math.tan(phi)*Math.sin(eps));
    function cand(x){ var d = x*180/Math.PI; d%=360; if(d<0)d+=360; return d; }
    var c0 = cand(l0), c1 = cand(l0+Math.PI);
    function sinH(lam){ var r=lam*Math.PI/180; var ra=Math.atan2(Math.sin(r)*Math.cos(eps), Math.cos(r)); return Math.sin(ramc-ra); }
    return sinH(c0)<0 ? c0 : c1;
  }

  return { yearForecast: yearForecast, muntha: muntha };
}));
