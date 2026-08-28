/* ============================================================
   МУХУРТА — выбор благоприятного времени (панчанга + поиск окон)
   Титхи, вара, накшатра, йога, карана, Раху-кала и др.
   Вся астрономия — в UTC; часовой пояс учитывается при разбиении дней.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./astronomy.min.js'));
  } else {
    root.Muhurta = factory(root.Astronomy);
  }
}(typeof self !== 'undefined' ? self : this, function (A) {

  var NAK = ['Ашвини','Бхарани','Криттика','Рохини','Мригашира','Ардра','Пунарвасу','Пушья','Ашлеша','Магха','Пурва-Пхалгуни','Уттара-Пхалгуни','Хаста','Читра','Свати','Вишакха','Анурадха','Джйештха','Мула','Пурва-Ашадха','Уттара-Ашадха','Шравана','Дхаништха','Шатабхиша','Пурва-Бхадрапада','Уттара-Бхадрапада','Ревати'];
  var TITHI_NAME = ['Пратипада','Двития','Трития','Чатуртхи','Панчами','Шаштхи','Саптами','Аштами','Навами','Дашами','Экадаши','Двадаши','Трайодаши','Чатурдаши','Пурнима'];
  var VARAS = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
  var VARA_PLANET = ['Солнце','Луна','Марс','Меркурий','Юпитер','Венера','Сатурн'];

  function norm360(x){ x%=360; if(x<0)x+=360; return x; }
  function ayanamsa(jd){ var T=(jd-2451545.0)/36525.0; return 23.857093+1.396889*T+0.000306*T*T-0.0000003*T*T*T; }

  // Позиции (сидерические) на момент UTC-даты
  function positions(dateUtc){
    var t = A.MakeTime(dateUtc);
    var jd = dateUtc.getTime()/86400000 + 2440587.5;
    var ay = ayanamsa(jd);
    var sun = norm360(A.Ecliptic(A.GeoVector(A.Body.Sun, t, true)).elon - ay);
    var moon = norm360(A.EclipticGeoMoon(t).lon - ay);
    return { sun: sun, moon: moon };
  }

  // Титхи/накшатра на момент (UTC)
  function tithiAt(dateUtc){
    var pos = positions(dateUtc);
    var diff = norm360(pos.moon - pos.sun);
    var num = Math.floor(diff / 12) + 1; // 1..30
    var paksha = num <= 15 ? 'шукла (растущая)' : 'кришна (убывающая)';
    var disp = num <= 15 ? num : (num === 30 ? 15 : num - 15);
    var name = (num === 30) ? 'Амавасья' : TITHI_NAME[disp - 1];
    return { num: num, name: name, paksha: paksha, moon: pos.moon, sun: pos.sun };
  }
  function nakshatraAt(dateUtc){
    var pos = positions(dateUtc);
    return Math.floor(pos.moon / (360/27));
  }

  // Восход/заход (UTC) для локального дня (y,m,d — локальные; tz — часы к востоку от UTC)
  function sunriseSunsetUTC(y, m, d, lat, lon, tz){
    var localMidnightUTC = Date.UTC(y, m-1, d) - tz*3600000;
    var obs = new A.Observer(lat, lon, 0);
    var rise = A.SearchRiseSet(A.Body.Sun, obs, +1, A.MakeTime(new Date(localMidnightUTC)), 1);
    var set = A.SearchRiseSet(A.Body.Sun, obs, -1, A.MakeTime(new Date(localMidnightUTC)), 1);
    return { sunrise: rise ? rise.date : null, sunset: set ? set.date : null };
  }

  // Сегменты Раху/Ямаганды/Гулики (1..8) по дню недели (0=Вс)
  var RAHU_SEG = [8,2,7,5,6,4,3];
  var YAMA_SEG = [5,4,3,2,1,7,6];
  var GULI_SEG = [7,6,5,4,3,2,1];

  // Панчанга «на сегодня» (момент now) — для вкладки
  function panchangaNow(lat, lon, tz){
    var now = new Date();
    var t = tithiAt(now);
    var nk = nakshatraAt(now);
    var pos = positions(now);
    var yoga = Math.floor(norm360(pos.sun + pos.moon) / (360/27));
    var karana = Math.floor(norm360(pos.moon - pos.sun) / 6) % 60;
    var local = new Date(now.getTime() + tz*3600000);
    var y = local.getUTCFullYear(), m = local.getUTCMonth()+1, d = local.getUTCDate();
    var rs = sunriseSunsetUTC(y, m, d, lat, lon, tz);
    var vara = local.getUTCDay();
    var kalas = buildKalas(rs.sunrise, rs.sunset, vara);
    return { tithi: t, nakshatra: nk, nakshatraName: NAK[nk], yoga: yoga, karana: karana,
             vara: vara, varaName: VARAS[vara], varaPlanet: VARA_PLANET[vara],
             sunrise: rs.sunrise, sunset: rs.sunset, kalas: kalas };
  }

  function buildKalas(sunrise, sunset, vara){
    var kalas = { rahu:null, yamaganda:null, gulika:null };
    if (!sunrise || !sunset) return kalas;
    var dur = (sunset - sunrise) / 8;
    function seg(s){ if (s>8) return null; return { start: new Date(sunrise.getTime()+(s-1)*dur), end: new Date(sunrise.getTime()+s*dur) }; }
    kalas.rahu = seg(RAHU_SEG[vara]);
    kalas.yamaganda = seg(YAMA_SEG[vara]);
    kalas.gulika = seg(GULI_SEG[vara]);
    return kalas;
  }

  // ---------- Оценка для деятельности ----------
  var ACTIVITIES = {
    marriage: { label:'Брак / помолвка', goodTithi:[2,3,5,7,10,11,13], badTithi:[4,9,14,30], goodNak:[3,4,6,7,11,12,14,16,20,21,22,25,26], badNak:[1,5,8,17,18], goodVara:[1,3,4,5], badVara:[2,6] },
    business: { label:'Начало бизнеса / дела', goodTithi:[2,3,5,7,10,11,13,15], badTithi:[4,9,14,30], goodNak:[3,4,7,11,12,13,16,20,21,22,25], badNak:[1,5,8,17,18], goodVara:[1,3,4,5], badVara:[2,6] },
    property: { label:'Недвижимость / новоселье', goodTithi:[2,3,5,7,10,11,13], badTithi:[4,9,14,30], goodNak:[3,11,12,20,21,22,25,26], badNak:[1,5,8,17,18], goodVara:[4,5], badVara:[2] },
    travel:   { label:'Путешествие / поездка', goodTithi:[2,3,5,7,10,11,13], badTithi:[4,8,9,14,30], goodNak:[0,4,6,14,16,21,26], badNak:[1,5,8,17,18], goodVara:[1,3,4,5], badVara:[2,6] },
    education:{ label:'Начало обучения', goodTithi:[2,3,5,7,10,11,13], badTithi:[4,9,14,30], goodNak:[0,4,6,7,12,13,16,21], badNak:[1,5,8,17,18], goodVara:[1,3,4,5], badVara:[2,6] },
    health:   { label:'Медицинская процедура', goodTithi:[2,3,5,7,10,11,13], badTithi:[4,9,14,30], goodNak:[4,6,7,12,16,21,25], badNak:[1,5,8,17,18], goodVara:[1,2,3,4,5], badVara:[0,6] },
    finance:  { label:'Финансовые операции', goodTithi:[2,3,5,7,10,11,13,15], badTithi:[4,9,14,30], goodNak:[3,7,11,12,16,20,21,22,25], badNak:[1,5,8,17,18], goodVara:[1,3,4,5], badVara:[2,6] },
    general:  { label:'Важное дело / встреча', goodTithi:[2,3,5,7,10,11,13], badTithi:[4,9,14,30], goodNak:[3,4,6,7,11,12,13,14,16,20,21,22,25,26], badNak:[1,5,8,17,18], goodVara:[1,3,4,5], badVara:[2,6] }
  };

  function inA(arr, v){ return arr.indexOf(v) >= 0; }

  function scoreMoment(tithiNum, vara, nakIdx, act){
    var sc = 0, reasons = [];
    if (inA(act.goodTithi, tithiNum)){ sc += 2; reasons.push('хорошая титхи'); }
    else if (inA(act.badTithi, tithiNum)){ sc -= 3; reasons.push('плохая титхи'); }
    if (inA(act.goodVara, vara)){ sc += 1; reasons.push('хороший день'); }
    else if (inA(act.badVara, vara)){ sc -= 2; reasons.push('плохой день'); }
    if (inA(act.goodNak, nakIdx)){ sc += 2; reasons.push('хорошая накшатра'); }
    else if (inA(act.badNak, nakIdx)){ sc -= 3; reasons.push('плохая накшатра'); }
    return { score: sc, reasons: reasons };
  }

  function inKala(utcMs, kalas){
    function inSeg(s){ return s && utcMs >= s.start.getTime() && utcMs < s.end.getTime(); }
    if (inSeg(kalas.rahu)) return 'Раху-кала';
    if (inSeg(kalas.yamaganda)) return 'Ямаганда-кала';
    if (inSeg(kalas.gulika)) return 'Гулика-кала';
    return null;
  }

  // Поиск благоприятных окон на `days` дней вперёд (всё в UTC ms; tz для разбиения дней)
  function findMuhurta(lat, lon, tz, activityKey, days, stepMin){
    var act = ACTIVITIES[activityKey] || ACTIVITIES.general;
    stepMin = stepMin || 30;
    var now = new Date();
    var result = { activity: act.label, days: [] };

    for (var d = 0; d < days; d++){
      var local = new Date(now.getTime() + tz*3600000);
      var y = local.getUTCFullYear(), m = local.getUTCMonth()+1, dd = local.getUTCDate();
      var dayLocal = new Date(Date.UTC(y, m-1, dd) + d*86400000);
      var dy = dayLocal.getUTCFullYear(), dm = dayLocal.getUTCMonth()+1, dday = dayLocal.getUTCDate();

      var rs = sunriseSunsetUTC(dy, dm, dday, lat, lon, tz);
      if (!rs.sunrise || !rs.sunset){ continue; }
      var vara = dday; // placeholder, вычисляем ниже из локальной даты
      // день недели локальный
      vara = (dayLocal.getUTCDay()); // день недели в UTC == локальный (сдвиг на целые сутки)

      var kalas = buildKalas(rs.sunrise, rs.sunset, vara);

      var windows = [];
      var cur = null;
      var t = rs.sunrise.getTime();
      var end = rs.sunset.getTime();
      while (t < end){
        var dt = new Date(t);
        var kala = inKala(t, kalas);
        if (!kala){
          var ti = tithiAt(dt);
          var nk = nakshatraAt(dt);
          var sc = scoreMoment(ti.num, vara, nk, act);
          if (sc.score >= 3){
            if (!cur) cur = { start: t, end: t, score: sc.score, reasons: sc.reasons.slice(), tithi: ti.name, nak: NAK[nk] };
            else { cur.end = t; if (sc.score > cur.score){ cur.score = sc.score; cur.reasons = sc.reasons.slice(); cur.tithi = ti.name; cur.nak = NAK[nk]; } }
          } else if (cur){ windows.push(cur); cur = null; }
        } else if (cur){ windows.push(cur); cur = null; }
        t += stepMin*60000;
      }
      if (cur) windows.push(cur);

      // итог дня
      var tiDay = tithiAt(rs.sunrise);
      result.days.push({
        date: new Date(Date.UTC(dy, dm-1, dday)),
        y: dy, m: dm, d: dday,
        vara: vara, varaName: VARAS[vara],
        tithi: tiDay.name + ' (' + tiDay.paksha + ')',
        nakshatra: NAK[nakshatraAt(rs.sunrise)],
        windows: windows,
        sunrise: rs.sunrise, sunset: rs.sunset, kalas: kalas
      });
    }
    return result;
  }

  return {
    panchangaNow: panchangaNow,
    findMuhurta: findMuhurta,
    ACTIVITIES: ACTIVITIES,
    NAK: NAK, TITHI_NAME: TITHI_NAME, VARAS: VARAS
  };
}));
