/* ============================================================
   DAILY ENGINE (браузерная сборка tools/daily.js) — посуточная прогностика.
   UMD: в Node требует модули, в браузере берёт глобальные Astronomy/Jyotish/Muhurta/Varshaphal.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./astronomy.min.js'), require('./jyotish.js'), require('./muhurta.js'), require('./varshaphal.js'));
  } else {
    root.Daily = factory(root.Astronomy, root.Jyotish, root.Muhurta, root.Varshaphal);
  }
}(typeof self !== 'undefined' ? self : this, function (A, J, M, V) {
'use strict';
/* ---------------- словари ---------------- */
const SIGNS = J.SIGNS;
const SIGN_SHORT = ['Ов', 'Те', 'Бл', 'Ра', 'Лв', 'Дв', 'Вес', 'Ск', 'Ст', 'Ко', 'Вд', 'Ры'];
const SIGNS_ACC = ['Овен', 'Телец', 'Близнецы', 'Рак', 'Лев', 'Деву', 'Весы', 'Скорпион', 'Стрелец', 'Козерог', 'Водолей', 'Рыбы'];
const VEDIC_MONTH = ['Меша (Апрель–Май)', 'Вришабха (Май–Июнь)', 'Митхуна (Июнь–Июль)', 'Карка (Июль–Август)',
  'Симха (Август–Сентябрь)', 'Канья (Сентябрь–Октябрь)', 'Тула (Октябрь–Ноябрь)', 'Вришчика (Ноябрь–Декабрь)',
  'Дхану (Декабрь–Январь)', 'Макара (Январь–Февраль)', 'Кумбха (Февраль–Март)', 'Мина (Март–Апрель)'];
const NAK = J.NAKSHATRA;
const NAK_SHORT = ['Ашв', 'Бха', 'Кри', 'Рох', 'Мри', 'Ардр', 'Пун', 'Пуш', 'Ашл', 'Маг', 'П-Пхал', 'У-Пхал',
  'Хаст', 'Чит', 'Сват', 'Виш', 'Анур', 'Джйеш', 'Мула', 'П-Ашад', 'У-Ашад', 'Шрав', 'Дхан', 'Шата',
  'П-Бхад', 'У-Бхад', 'Рев'];
const NAK_LORDS = ['Кету', 'Венера', 'Солнце', 'Луна', 'Марс', 'Раху', 'Юпитер', 'Сатурн', 'Меркурий'];
const NAK_YEARS = J.NAK_YEARS;
const PLANETS_RU = { Sun: 'Солнце', Moon: 'Луна', Mercury: 'Меркурий', Venus: 'Венера', Mars: 'Марс', Jupiter: 'Юпитер', Saturn: 'Сатурн', Rahu: 'Раху', Ketu: 'Кету' };
const PLANET_ABBR = { Sun: 'Со', Moon: 'Лу', Mercury: 'Ме', Venus: 'Ве', Mars: 'Ма', Jupiter: 'Юп', Saturn: 'Са', Rahu: 'Ра', Ketu: 'Ке' };
const VARAS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const VARAS_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const VARA_PLANET = ['Солнце', 'Луна', 'Марс', 'Меркурий', 'Юпитер', 'Венера', 'Сатурн'];
const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_RU_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

const TITHI_NAME = ['Пратипада', 'Двития', 'Трития', 'Чатуртхи', 'Панчами', 'Шаштхи', 'Саптами', 'Аштами', 'Навами', 'Дашами',
  'Экадаши', 'Двадаши', 'Трайодаши', 'Чатурдаши', 'Пурнима'];
const YOGA_NAME = ['Вишкамбха', 'Прити', 'Аюшман', 'Саубхагья', 'Шобхана', 'Атиганда', 'Сукарма', 'Дхрити', 'Шула', 'Ганда',
  'Вриддхи', 'Дхрува', 'Вьягхата', 'Харшана', 'Ваджра', 'Сиддхи', 'Вьятипата', 'Вариан', 'Паригха', 'Шива',
  'Сиддха', 'Садхья', 'Шубха', 'Шукла', 'Брахма', 'Индре', 'Вайдхрити', 'Вишти'];
const KARANA_FIXED = ['Кинстугхна', 'Чатушпада', 'Нага'];
const KARANA_MOV = ['Бава', 'Балава', 'Каулава', 'Тайтила', 'Гара', 'Ваниджа', 'Вишти'];

/* тара-бала: группа накшатры транзитной Луны от натальной Луны */
const TARA = [
  { n: 'Джанма', score: -1, text: 'тара Джанма — день «про себя», не для публичных стартов' },
  { n: 'Сампат', score: 3, text: 'тара Сампат — прирост: деньги, ресурсы, удачные вложения' },
  { n: 'Випат', score: -3, text: 'тара Випат — риск срывов и препятствий, не начинайте важного' },
  { n: 'Кшема', score: 3, text: 'тара Кшема — благополучие, безопасность, хорошие итоги' },
  { n: 'Пратьяри', score: -2, text: 'тара Пратьяри — возможны конфликты и помехи, держите дистанцию' },
  { n: 'Садхака', score: 2, text: 'тара Садхака — дела исполняются, цель достижима' },
  { n: 'Вадха', score: -3, text: 'тара Вадха — худшая тара: отложите всё важное, берегите здоровье' },
  { n: 'Митра', score: 3, text: 'тара Митра — поддержка людей, договорённости, союзы' },
  { n: 'Ати-Митра', score: 4, text: 'тара Ати-Митра — очень благоприятно, день для важных шагов' }
];
/* накшатры: мриду/кшипра (мягкие, быстрые дела), стхира (прочное), тикшна (жёсткие), крора (тяжёлые) */
const NAK_CLASS = {
  mridu: [2, 3, 5, 6, 7, 11, 12, 16, 19, 20, 22, 26],
  chara: [0, 8, 10, 13, 14, 17, 21, 23, 25],
  sthira: [1, 9, 18, 24],
  tikshna: [4, 15],
  misra: []
};
const NAK_CLASS_TEXT = {
  mridu: 'накшатра мягкая (мриду) — хороша для свадьбы, искусств, начала дружеских дел',
  chara: 'накшатра подвижная (чара) — хороша для поездок, переездов, смены обстановки',
  sthira: 'накшатра неподвижная (стхира) — хорошо закладывать прочное: дом, фундамент, долгосрочное',
  tikshna: 'накшатра острая (тикшна) — годится для жёстких дел: конкуренция, лечение, разрыв, но не для свадьбы'
};
/* титхи: благоприятные / неблагоприятные для начинаний */
const TITHI_GOOD = [2, 3, 5, 6, 7, 10, 11, 13];
const TITHI_BAD = [4, 9, 14];
const TITHI_RIKTA = [4, 9, 14]; // «пустые»
const TITHI_TEXT = {
  1: 'Пратипада — начало лунного цикла: закладывайте намерение, старт новых дел умеренный',
  2: 'Двития — устойчивый рост, хорошо начинать и продолжать',
  3: 'Трития — сила и энергия, благоприятно для активных дел',
  4: 'Чатуртхи — рикта («пустая»): не начинайте важное, разбирайтесь с препятствиями, молитва Ганеше',
  5: 'Панчами — накопление, учёба, благоприятно',
  6: 'Шаштхи — здоровье и борьба: хорошо лечиться, разбираться с врагами/долгами',
  7: 'Саптами — движение и поездки, благоприятно',
  8: 'Аштами — день Бхайравы: пост/воздержание, не для начинаний и сделок',
  9: 'Навами — рикта: энергия разрушения, не начинайте нового, завершайте',
  10: 'Дашами — успех в делах, благоприятный день',
  11: 'Экадаши — духовный день: пост, очищение, молитва; материальные начинания отложите',
  12: 'Двадаши — продолжение и завершение, благоприятно',
  13: 'Трайодаши — благоприятно, хорошо для торговли и общения',
  14: 'Чатурдаши — рикта/кшура: острый день, не для старта, хорошо устранять и завершать',
  15: 'Пурнима (шукла) — полнолуние: пик силы, благотворительность, не начинайте материальное',
  30: 'Амавасья — новолуние: тишина, предки, планирование; не начинайте важного'
};
const VARA_SCORE = { 'Воскресенье': 1, 'Понедельник': 1, 'Вторник': -2, 'Среда': 2, 'Четверг': 2, 'Пятница': 2, 'Суббота': -1 };
const VARA_TEXT = {
  'Воскресенье': 'день Солнца — статус, начальство, здоровье, отец',
  'Понедельник': 'день Луны — эмоции, дом, мать, жидкости, поездки к воде',
  'Вторник': 'день Марса — энергия и конфликты: спорт, техника, споры; осторожнее с остротой',
  'Среда': 'день Меркурия — общение, документы, торговля, учёба, переговоры',
  'Четверг': 'день Юпитера — удача, наставники, деньги, благие начинания',
  'Пятница': 'день Венеры — любовь, красота, покупки, отдых, творчество',
  'Суббота': 'день Сатурна — труд, дисциплина, старшие, железо и земля; не спешите'
};
const SADE_SATI = {
  12: 'Саде-сати, 1-я фаза (Сатурн в 12-м от Луны) — расходы, отъезды, пересмотр круга общения',
  1: 'Саде-сати, 2-я фаза (Сатурн по Луне) — пик нагрузки: здоровье, эмоции, ответственность',
  2: 'Саде-сати, 3-я фаза (Сатурн во 2-м от Луны) — деньги и семья под давлением, учитесь копить'
};

/* ---------------- астрономия ---------------- */
function norm360(x) { x %= 360; if (x < 0) x += 360; return x; }
function ayanamsa(jd) { const T = (jd - 2451545.0) / 36525.0; return 23.857093 + 1.396889 * T + 0.000306 * T * T - 0.0000003 * T * T * T; }
function jdOf(ms) { return ms / 86400000 + 2440587.5; }
function tropLon(body, t) { return A.Ecliptic(A.GeoVector(body, t, true)).elon; }
function moonTrop(t) { return A.EclipticGeoMoon(t).lon; }
function moonEcl(t) { const e = A.Ecliptic(A.GeoMoon(t)); return { lon: e.elon, lat: e.elat }; }
function moonAltitude(ms, lat, lon) {
  const t = A.MakeTime(new Date(ms));
  const e = A.Ecliptic(A.GeoMoon(t));
  try { return A.Horizon(t, new A.Observer(lat, lon, 0), e.elon, e.elat, 'normal').altitude; }
  catch (err) { return null; }
}
function meanNode(jd) { const T = (jd - 2451545.0) / 36525.0; return 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T * T * T / 467441.0 - T * T * T * T / 60616000.0; }
const BODY = { Sun: A.Body.Sun, Moon: A.Body.Moon, Mercury: A.Body.Mercury, Venus: A.Body.Venus, Mars: A.Body.Mars, Jupiter: A.Body.Jupiter, Saturn: A.Body.Saturn };
const SLOW = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Rahu'];

function positions(ms) {
  const t = A.MakeTime(new Date(ms));
  const jd = jdOf(ms);
  const ay = ayanamsa(jd);
  const out = {};
  for (const b of SLOW) {
    if (b === 'Rahu') out.Rahu = norm360(meanNode(jd) - ay);
    else out[b] = norm360(tropLon(BODY[b], t) - ay);
  }
  out.Moon = norm360(moonTrop(t) - ay);
  out.Ketu = norm360(out.Rahu + 180);
  out._ay = ay;
  return out;
}
function retroFlag(b, ms) {
  const t = A.MakeTime(new Date(ms));
  const l1 = tropLon(BODY[b], t);
  const l2 = tropLon(BODY[b], t.AddDays(0.5));
  return norm360(l2 - l1) > 180;
}
function moonPhaseFraction(ms) {
  return A.Illumination(A.Body.Moon, A.MakeTime(new Date(ms))).phase_fraction;
}
function sunElongMoon(ms) {
  const p = positions(ms);
  return norm360(p.Moon - p.Sun);
}
function riseSet(y, m, d, lat, lon, tz) {
  const midnightUtc = Date.UTC(y, m - 1, d) - tz * 3600000;
  const t0 = A.MakeTime(new Date(midnightUtc));
  const obs = new A.Observer(lat, lon, 0);
  const r = A.SearchRiseSet(A.Body.Sun, obs, +1, t0, 1.5);
  const s = A.SearchRiseSet(A.Body.Sun, obs, -1, t0, 1.5);
  return { sunrise: r ? r.date.getTime() : null, sunset: s ? s.date.getTime() : null };
}
const RAHU_SEG = [8, 2, 7, 5, 6, 4, 3];
const YAMA_SEG = [5, 4, 3, 2, 1, 7, 6];
const GULI_SEG = [7, 6, 5, 4, 3, 2, 1];
function kalas(sunrise, sunset, vara) {
  const dur = (sunset - sunrise) / 8;
  const seg = (s) => ({ start: sunrise + (s - 1) * dur, end: sunrise + s * dur });
  return {
    rahu: seg(RAHU_SEG[vara]), yamaganda: seg(YAMA_SEG[vara]), gulika: seg(GULI_SEG[vara]),
    abhijit: { start: sunrise + 3.5 * (sunset - sunrise) / 8 * (8 / 8), end: 0 }
  };
}

/* ---------------- Вишоттари: полное дерево до пратьянтардаши ---------------- */
const DASHA_ORDER = ['Кету', 'Венера', 'Солнце', 'Луна', 'Марс', 'Раху', 'Юпитер', 'Сатурн', 'Меркурий'];
function buildDashaTree(moonSidLon, birthMs) {
  const nIdx = Math.floor(moonSidLon / (360 / 27));
  const frac = (moonSidLon % (360 / 27)) / (360 / 27);
  const lordIdx = nIdx % 9;
  const remainYears = NAK_YEARS[DASHA_ORDER[lordIdx]] * (1 - frac);
  const YEAR = 365.25 * 86400000;
  const maha = [];
  let cur = birthMs;
  for (let k = 0; k < 9; k++) {
    const pl = DASHA_ORDER[(lordIdx + k) % 9];
    const yrs = k === 0 ? remainYears : NAK_YEARS[pl];
    const end = cur + yrs * YEAR;
    maha.push({ planet: pl, level: 'MD', start: cur, end, years: yrs, antar: [] });
    // антарадаши
    let acur = cur;
    const startIdx = DASHA_ORDER.indexOf(pl);
    for (let j = 0; j < 9; j++) {
      const aPl = DASHA_ORDER[(startIdx + j) % 9];
      const aYrs = yrs * NAK_YEARS[aPl] / 120;
      const aEnd = acur + aYrs * YEAR;
      const ant = { planet: aPl, level: 'AD', start: acur, end: aEnd, pratyantar: [] };
      // пратьянтардаши
      let pcur = acur;
      const pStartIdx = DASHA_ORDER.indexOf(aPl);
      for (let i = 0; i < 9; i++) {
        const pPl = DASHA_ORDER[(pStartIdx + i) % 9];
        const pYrs = aYrs * NAK_YEARS[pPl] / 120;
        const pEnd = pcur + pYrs * YEAR;
        ant.pratyantar.push({ planet: pPl, level: 'PD', start: pcur, end: pEnd });
        pcur = pEnd;
      }
      maha[maha.length - 1].antar.push(ant);
      acur = aEnd;
    }
    cur = end;
  }
  return maha;
}
function dashaAt(tree, ms) {
  for (const md of tree) {
    if (ms >= md.start && ms < md.end) {
      for (const ad of md.antar) {
        if (ms >= ad.start && ms < ad.end) {
          for (const pd of ad.pratyantar) {
            if (ms >= pd.start && ms < pd.end) return { md, ad, pd };
          }
          return { md, ad, pd: null };
        }
      }
      return { md, ad: null, pd: null };
    }
  }
  return null;
}
function allChanges(tree, fromMs, toMs) {
  const ev = [];
  for (const md of tree) {
    if (md.start > fromMs && md.start <= toMs) ev.push({ at: md.start, text: 'смена периода: начинается ' + md.planet + ' махадаша' });
    for (const ad of md.antar) {
      if (ad.start > fromMs && ad.start <= toMs) ev.push({ at: ad.start, text: 'смена подпериода: ' + md.planet + '/' + ad.planet, short: 'смена подпериода → ' + md.planet + '/' + ad.planet, kind: 'dasha-ad' });
      for (const pd of ad.pratyantar) {
        if (pd.start > fromMs && pd.start <= toMs) ev.push({ at: pd.start, text: 'смена микропериода: ' + md.planet + '/' + ad.planet + '/' + pd.planet, short: 'смена микропериода → …/' + pd.planet, kind: 'dasha-pd' });
      }
    }
  }
  return ev;
}

/* ---------------- поиск событий года ---------------- */
function findIngresses(fromMs, toMs, stepMs) {
  const ev = [];
  let prev = positions(fromMs);
  for (let ms = fromMs + stepMs; ms <= toMs; ms += stepMs) {
    const p = positions(ms);
    for (const b of SLOW) {
      const s0 = Math.floor(prev[b] / 30), s1 = Math.floor(p[b] / 30);
      if (s0 !== s1) {
        // уточнение бинарным поиском границы знака
        let lo = ms - stepMs, hi = ms;
        const targetSign = s1;
        for (let i = 0; i < 40; i++) {
          const mid = (lo + hi) / 2;
          const pm = positions(mid);
          if (Math.floor(pm[b] / 30) === targetSign) hi = mid; else lo = mid;
        }
        const exact = (lo + hi) / 2;
        const retr = b !== 'Rahu' ? retroFlag(b, exact) : true;
        const label = b === 'Sun'
          ? 'Санкранти: Солнце входит в ' + SIGNS_ACC[s1] + ' — ' + VEDIC_MONTH[s1]
          : PLANETS_RU[b] + ' входит в ' + SIGNS_ACC[s1] + (retr ? ' (ретроградный)' : '');
        const short = b === 'Sun' ? 'Солнце → ' + SIGNS_ACC[s1] + ' (санкранти)'
          : PLANETS_RU[b] + ' → ' + SIGNS_ACC[s1] + (retr ? ' (R)' : '');
        ev.push({ at: exact, text: label, short: short, kind: b === 'Sun' ? 'sankranti' : 'ingress', planet: b });
      }
    }
    // ретро-статусы медленных планет
    for (const b of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']) {
      const r0 = retroFlag(b, ms - stepMs), r1 = retroFlag(b, ms);
      if (r0 !== r1) ev.push({ at: ms, text: PLANETS_RU[b] + (r1 ? ' становится ретроградным' : ' снова директный'), short: PLANETS_RU[b] + (r1 ? ' ретроградный' : ' директный'), kind: 'retro', planet: b });
    }
    prev = p;
  }
  return ev;
}
function findEclipses(fromMs, toMs, lat, lon) {
  // 1) грубый проход (1 ч) — ищем сизигии; 2) уточняем момент бинарным поиском;
  // 3) в точный момент считаем эклиптическую широту Луны: |β| < ~1.5° ⇒ затмение.
  function elongAt(ms) {
    const p = positions(ms);
    const e = norm360(p.Moon - p.Sun);
    return e > 180 ? e - 360 : e;           // 0 = новолуние, ±180 = полнолуние
  }
  // монотонная функция для бинарного поиска: новолуние → elong, полнолуние → elong±180
  function refineF(kind, ms) {
    const p = positions(ms);
    const e = norm360(p.Moon - p.Sun + (kind === 'full' ? 180 : 0));
    return e > 180 ? e - 360 : e;
  }
  // ищем узкий интервал со сменой знака (гарантированно одно пересечение), затем бисекция
  function syzygy(kind, lo, hi) {
    const stepQ = 15 * 60000;
    let a = lo, fa = refineF(kind, lo);
    for (let ms = lo + stepQ; ms <= hi; ms += stepQ) {
      const fb = refineF(kind, ms);
      if (fa < 0 && fb >= 0) { a = ms - stepQ; hi = ms; break; }
      a = ms; fa = fb;
    }
    let l = a, h = hi;
    for (let i = 0; i < 50; i++) {
      const mid = (l + h) / 2;
      if (refineF(kind, mid) < 0) l = mid; else h = mid;
    }
    return (l + h) / 2;
  }
  const ev = [];
  const step = 3600000;
  // собираем кандидатов (часы, когда |elong| близок к 0 или 180), кластеризуем, уточняем центр кластера
  const cand = [];
  for (let ms = fromMs; ms <= toMs; ms += step) {
    const e = Math.abs(elongAt(ms));
    if (e < 10) cand.push({ kind: 'new', ms });
    else if (Math.abs(e - 180) < 10) cand.push({ kind: 'full', ms });
  }
  const clusters = [];
  for (const c of cand) {
    const last = clusters[clusters.length - 1];
    if (last && last.kind === c.kind && c.ms - last.last <= 3 * step) last.last = c.ms;
    else clusters.push({ kind: c.kind, first: c.ms, last: c.ms });
  }
  for (const cl of clusters) {
    const mid = (cl.first + cl.last) / 2;
    const exact = syzygy(cl.kind, cl.first - 2 * step, cl.last + 2 * step);
    if (process.env.ECL_DBG) console.error(new Date(exact).toISOString(), cl.kind, 'beta=', moonEcl(A.MakeTime(new Date(exact))).lat.toFixed(3));
    const t = A.MakeTime(new Date(exact));
    const m = moonEcl(t);
    const beta = Math.abs(m.lat);
    if (beta > 1.55) continue;               // затмения нет
    const pf = moonPhaseFraction(exact);
    if (cl.kind === 'new') {
      const deep = beta < 0.45;
      const label = deep
        ? 'СОЛНЕЧНОЕ ЗАТМЕНИЕ (полное/кольцевое) — 3 дня до и после не начинать нового'
        : 'Солнечное затмение (частное) — не начинать нового, тишина и завершение дел';
      ev.push({ at: exact, text: label, short: 'СОЛНЕЧНОЕ ЗАТМЕНИЕ' + (deep ? ' (полн./кольц.)' : ' (частное)'), kind: 'eclipse-solar', weight: deep ? 2 : 1, beta });
    } else {
      const total = beta < 0.55, partial = beta < 1.0;
      const alt = moonAltitude(exact, lat, lon);
      const vis = alt === null ? '' : (alt > 0 ? ' — видно в вашем месте' : ' — у вас под горизонтом');
      const label = (total ? 'ЛУННОЕ ЗАТМЕНИЕ (полное)' : partial ? 'Лунное затмение (частное)' : 'Лунное затмение (полутеневое)')
        + vis + ' — эмоциональный пик, решения отложить';
      ev.push({ at: exact, text: label, short: 'Лунное затмение ' + (total ? '(полное)' : partial ? '(частное)' : '(полутеневое)'), kind: 'eclipse-lunar', weight: total ? 2 : partial ? 1.5 : 1, beta });
    }
  }
  return ev;
}

/* ---------------- сферы деятельности: можно / нельзя / как обычно ---------------- */
const SPHERES = [
  ['general', 'дела и встречи'],
  ['business', 'бизнес'],
  ['marriage', 'брак'],
  ['property', 'дом и переезд'],
  ['travel', 'поездки'],
  ['education', 'учёба'],
  ['finance', 'деньги'],
  ['health', 'здоровье']
];
function baseSphereScore(act, tithiNum, vara, nakIdx) {
  let sc = 0;
  if (act.goodTithi.indexOf(tithiNum) >= 0) sc += 2;
  else if (act.badTithi.indexOf(tithiNum) >= 0) sc -= 3;
  if (act.goodVara.indexOf(vara) >= 0) sc += 1;
  else if (act.badVara.indexOf(vara) >= 0) sc -= 2;
  if (act.goodNak.indexOf(nakIdx) >= 0) sc += 2;
  else if (act.badNak.indexOf(nakIdx) >= 0) sc -= 3;
  return sc;
}

/* ---------------- основной расчёт ---------------- */
function hhmm(ms, tz) {
  const d = new Date(ms + tz * 3600000);
  const p = (n) => (n < 10 ? '0' : '') + n;
  return p(d.getUTCHours()) + ':' + p(d.getUTCMinutes());
}
function houseOf(signIdx, lagnaSignIdx) { return (signIdx - lagnaSignIdx + 12) % 12 + 1; }

function compute(opts) {
  const birth = { y: opts.by, m: opts.bm, d: opts.bd, hh: opts.bhh, mm: opts.bmm, tz: opts.btz, lat: opts.blat, lon: opts.blon };
  const chart = J.computeChart(birth);
  const natalMoonSign = chart.planets.Moon.signIdx;
  const natalMoonNak = chart.planets.Moon.nakIdx;
  const lagnaSign = chart.lagna.signIdx;
  const lat = opts.lat !== undefined ? opts.lat : birth.lat;
  const lon = opts.lon !== undefined ? opts.lon : birth.lon;
  const tz = opts.tz !== undefined ? opts.tz : birth.tz;

  const tree = buildDashaTree(chart.planets.Moon.sidLon, Date.UTC(birth.y, birth.m - 1, birth.d, birth.hh, birth.mm) - birth.tz * 3600000);

  const from = Date.UTC(opts.fromY, opts.fromM - 1, opts.fromD);
  const to = Date.UTC(opts.toY, opts.toM - 1, opts.toD);
  const events = findIngresses(from - 86400000, to + 86400000, 3600000).concat(findEclipses(from - 20 * 86400000, to + 20 * 86400000, lat, lon))
    .concat(allChanges(tree, from - 86400000, to + 86400000));
  events.sort((a, b) => a.at - b.at);

  const vf = V.yearForecast(chart, lat, lon, new Date(from));

  const days = [];
  let evPtr = 0;
  for (let dms = from; dms <= to; dms += 86400000) {
    const ld = new Date(dms);
    const y = ld.getUTCFullYear(), mo = ld.getUTCMonth() + 1, dd = ld.getUTCDate();
    const rs = riseSet(y, mo, dd, lat, lon, tz);
    if (!rs.sunrise || !rs.sunset) continue;
    const vara = ld.getUTCDay();
    const varaName = VARAS_FULL[vara];
    const noonUtc = Date.UTC(y, mo - 1, dd, 12) - tz * 3600000;
    const p = positions(rs.sunrise);
    const pNoon = positions(noonUtc);

    // панчанга на восход
    const elong = norm360(p.Moon - p.Sun);
    const tithiNum = Math.floor(elong / 12) + 1;
    const tithiDisp = tithiNum === 30 ? 15 : (tithiNum > 15 ? tithiNum - 15 : tithiNum);
    const tithiName = tithiNum === 30 ? 'Амавасья' : TITHI_NAME[tithiDisp - 1];
    const paksha = tithiNum <= 15 ? 'Шукла' : 'Кришна';
    const nakIdx = Math.floor(p.Moon / (360 / 27));
    const nakPada = Math.floor((p.Moon % (360 / 27)) / (360 / 108)) + 1;
    const yogaIdx = Math.floor(norm360(p.Sun + p.Moon) / (360 / 27));
    const karIdx = Math.floor(elong / 6);
    const karana = karIdx < 1 ? KARANA_FIXED[0] : (karIdx >= 59 ? KARANA_FIXED[2] : KARANA_FIXED[1] + ' / ' + KARANA_MOV[((karIdx - 1) % 7)]);
    const karanaSimple = karIdx === 0 ? KARANA_FIXED[0] : (karIdx === 59 || karIdx === 60 ? KARANA_FIXED[karIdx === 59 ? 1 : 2] : KARANA_MOV[(karIdx - 1) % 7]);

    // время конца титхи и накшатры (поиск границы)
    function boundary(f, cur) {
      let lo = rs.sunrise, hi = rs.sunrise + 2 * 86400000;
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        if (f(mid) === cur) lo = mid; else hi = mid;
      }
      return lo;
    }
    const tithiEnd = boundary((ms) => Math.floor(norm360(positions(ms).Moon - positions(ms).Sun) / 12) + 1, tithiNum);
    const nakEnd = boundary((ms) => Math.floor(positions(ms).Moon / (360 / 27)), nakIdx);

    // калы
    const k = kalas(rs.sunrise, rs.sunset, vara);
    const dayDur = rs.sunset - rs.sunrise;
    const abhijit = { start: rs.sunrise + dayDur * 4 / 8 - dayDur / 16, end: rs.sunrise + dayDur * 4 / 8 + dayDur / 16 };

    // тара-бала
    const taraIdx = Math.floor(((nakIdx - natalMoonNak + 27) % 27) / 3);
    const tara = TARA[taraIdx];
    const moonHouseFromNatal = (Math.floor(pNoon.Moon / 30) - natalMoonSign + 12) % 12 + 1;
    const chandrashtama = moonHouseFromNatal === 8;

    // даши дня
    const dsh = dashaAt(tree, noonUtc);
    const mdP = dsh ? dsh.md.planet : '—', adP = dsh && dsh.ad ? dsh.ad.planet : '—', pdP = dsh && dsh.pd ? dsh.pd.planet : '—';

    // гочара медленных от Луны и от Лагны
    function hMoon(b) { return (Math.floor(pNoon[b] / 30) - natalMoonSign + 12) % 12 + 1; }
    function hLag(b) { return houseOf(Math.floor(pNoon[b] / 30), lagnaSign); }
    const sadeSati = [12, 1, 2].includes(hMoon('Saturn'));

    // события дня
    const dayStart = rs.sunrise, dayEnd = rs.sunrise + 86400000;
    const dayEvents = [];
    while (evPtr < events.length && events[evPtr].at < dayStart) evPtr++;
    let q = evPtr;
    while (q < events.length && events[q].at < dayEnd) { dayEvents.push(events[q]); q++; }
    // смена титхи/накшатры внутри дня
    if (tithiEnd < rs.sunset && tithiEnd > dayStart) dayEvents.push({ at: tithiEnd, text: 'смена титхи в ' + hhmm(tithiEnd, tz), short: 'смена титхи', kind: 'tithi-end' });
    if (nakEnd < dayEnd && nakEnd > dayStart) dayEvents.push({ at: nakEnd, text: 'смена накшатры в ' + hhmm(nakEnd, tz) + ' → ' + NAK[Math.floor(positions(nakEnd + 600000).Moon / (360 / 27))], short: 'смена накшатры', kind: 'nak-end' });
    dayEvents.sort((a, b) => a.at - b.at);

    /* ---------- оценка ---------- */
    let score = 0;
    const notes = [];
    score += tara.score; notes.push('тара ' + tara.n);
    if (TITHI_GOOD.includes(tithiNum)) { score += 2; }
    else if (TITHI_BAD.includes(tithiNum)) { score -= 3; }
    if (tithiNum === 30 || tithiNum === 15) score -= 1;
    if (tithiNum === 11) score += 1; // духовный плюс
    let nakCls = 'chara';
    for (const c in NAK_CLASS) if (NAK_CLASS[c].includes(nakIdx)) nakCls = c;
    if (nakCls === 'mridu') score += 2; else if (nakCls === 'sthira') score += 1; else if (nakCls === 'tikshna') score -= 1;
    if (NAK_LORDS[nakIdx % 9] === mdP) { score += 1; notes.push('накшатра совпадает с правителем махадаши'); }
    const varaCap = varaName.charAt(0).toUpperCase() + varaName.slice(1);
    score += VARA_SCORE[varaCap] || 0;
    if (VARA_PLANET[vara] === adP) score += 1;
    if (VARA_PLANET[vara] === mdP) score += 1;
    if (chandrashtama) { score -= 4; notes.push('Чандраштама'); }
    if (sadeSati) score -= 2;
    if (hMoon('Jupiter') === 8) score += 1; // Аштама-Гуру смягчает
    if ([1, 3, 6, 7, 10, 11].includes(hLag('Saturn'))) score += 1; // упачайа для Сатурна
    if ([6, 8, 12].includes(hLag('Rahu'))) score -= 1;
    const ecl = dayEvents.filter(e => e.kind === 'eclipse-solar' || e.kind === 'eclipse-lunar');
    if (ecl.length) { score -= 6 * (ecl[0].weight || 1); notes.push('затмение'); }
    if (dayEvents.some(e => e.kind === 'sankranti')) score -= 1;
    // бонус за «мягкую» комбинацию даши
    if (['Юпитер', 'Венера', 'Меркурий', 'Луна'].includes(pdP) && ['Юпитер', 'Венера', 'Меркурий'].includes(adP)) score += 1;
    if (['Раху', 'Кету', 'Марс', 'Сатурн'].includes(pdP) && ['Раху', 'Кету', 'Марс', 'Сатурн'].includes(adP)) score -= 1;

    // ---- сферы: персональная надбавка к классической оценке мухурты ----
    let personal = Math.round(tara.score / 2);
    if (chandrashtama) personal -= 3;
    const eclW = dayEvents.reduce((a, e) => a + ((e.kind === 'eclipse-solar' || e.kind === 'eclipse-lunar') ? (e.weight || 1) * 3 : 0), 0);
    personal -= eclW;
    if (dayEvents.some(e => e.kind === 'sankranti')) personal -= 1;
    if (['Юпитер', 'Венера'].includes(adP) || ['Юпитер', 'Венера'].includes(pdP)) personal += 1;
    if (['Раху', 'Кету', 'Сатурн'].includes(pdP)) personal -= 1;
    if ([1, 5, 9].includes(hLag('Jupiter'))) personal += 1;
    if ([6, 8, 12].includes(hLag('Saturn'))) personal -= 1;
    const spheres = SPHERES.map(function (sp) {
      const act = M.ACTIVITIES[sp[0]];
      const sc = baseSphereScore(act, tithiNum, vara, nakIdx) + personal;
      return { k: sp[0], name: sp[1], score: sc, cls: sc >= 2 ? 'good' : sc <= -2 ? 'bad' : 'mid' };
    });
    const lunarDay = tithiNum;
    const moonPhase = tithiNum === 15 ? 'полнолуние' : tithiNum === 30 ? 'новолуние'
      : (paksha === 'Шукла' ? 'Луна растёт' : 'Луна убывает');

    const stars = score >= 6 ? 5 : score >= 3 ? 4 : score >= 1 ? 3 : score >= -2 ? 2 : 1;
    const verdict = stars === 5 ? 'Очень благоприятный день' : stars === 4 ? 'Благоприятный день' :
      stars === 3 ? 'Нейтральный день' : stars === 2 ? 'Сдержанный день' : 'Тяжёлый день';

    /* ---------- текст для клетки ---------- */
    const headline = stars === 5 ? '★ Отличный день: важные старты, подписи, встречи, поездки'
      : stars === 4 ? '★ Хороший день: начинайте задуманное, действуйте'
      : stars === 3 ? '★ Обычный день: продолжайте начатое, не форсируйте'
      : stars === 2 ? '★ Осторожно: отложите старты, занимайтесь рутиной'
      : '★ Не начинать: завершайте, отдыхайте, молитва/упайи';

    const lines = [];
    lines.push(headline);
    lines.push(tara.n + ' тара · ' + tithiName + ' (' + paksha + ', до ' + hhmm(tithiEnd, tz) + ')');
    lines.push(NAK[nakIdx] + ' (до ' + hhmm(nakEnd, tz) + '), ' + VARAS[vara] + ' — ' + VARA_PLANET[vara]);
    lines.push('Даши: ' + mdP + ' / ' + adP + ' / ' + pdP);
    const transitBits = [];
    transitBits.push('Са в ' + houseOf(Math.floor(pNoon.Saturn / 30), lagnaSign) + '-м');
    transitBits.push('Юп в ' + houseOf(Math.floor(pNoon.Jupiter / 30), lagnaSign) + '-м');
    transitBits.push('Ра в ' + houseOf(Math.floor(pNoon.Rahu / 30), lagnaSign) + '-м');
    lines.push('Транзиты: ' + transitBits.join(', ') + (chandrashtama ? ' · Чандраштама!' : '') + (sadeSati ? ' · Саде-сати' : ''));
    lines.push('Раху-кала ' + hhmm(k.rahu.start, tz) + '–' + hhmm(k.rahu.end, tz) + ' · Абхиджит ' + hhmm(abhijit.start, tz) + '–' + hhmm(abhijit.end, tz));
    lines.push('Восход ' + hhmm(rs.sunrise, tz) + ', заход ' + hhmm(rs.sunset, tz) + ' · йога ' + YOGA_NAME[yogaIdx] + ', карана ' + karanaSimple);
    dayEvents.filter(e => !['tithi-end', 'nak-end'].includes(e.kind)).slice(0, 2).forEach(e => lines.push('◆ ' + e.text + ' (' + hhmm(e.at, tz) + ')'));

    days.push({
      date: y + '-' + (mo < 10 ? '0' : '') + mo + '-' + (dd < 10 ? '0' : '') + dd,
      y, m: mo, d: dd, vara, varaName,
      sunrise: hhmm(rs.sunrise, tz), sunset: hhmm(rs.sunset, tz),
      tithiNum, tithi: tithiName, paksha, tithiEnd: hhmm(tithiEnd, tz),
      nakshatra: NAK[nakIdx], nakShort: NAK_SHORT[nakIdx], nakIdx, nakLord: NAK_LORDS[nakIdx % 9], nakEnd: hhmm(nakEnd, tz),
      yoga: YOGA_NAME[yogaIdx], karana: karanaSimple,
      rahuKaal: hhmm(k.rahu.start, tz) + '–' + hhmm(k.rahu.end, tz),
      yamaganda: hhmm(k.yamaganda.start, tz) + '–' + hhmm(k.yamaganda.end, tz),
      gulika: hhmm(k.gulika.start, tz) + '–' + hhmm(k.gulika.end, tz),
      abhijit: hhmm(abhijit.start, tz) + '–' + hhmm(abhijit.end, tz),
      tara: tara.n, taraText: tara.text, taraScore: tara.score,
      chandrashtama, sadeSati, moonHouseFromNatal,
      dasha: { md: mdP, ad: adP, pd: pdP },
      transits: {
        Sun: SIGNS[Math.floor(pNoon.Sun / 30)], Saturn: SIGNS[Math.floor(pNoon.Saturn / 30)],
        Jupiter: SIGNS[Math.floor(pNoon.Jupiter / 30)], Rahu: SIGNS[Math.floor(pNoon.Rahu / 30)],
        Ketu: SIGNS[Math.floor(pNoon.Ketu / 30)], Mars: SIGNS[Math.floor(pNoon.Mars / 30)],
        Venus: SIGNS[Math.floor(pNoon.Venus / 30)], Mercury: SIGNS[Math.floor(pNoon.Mercury / 30)],
        SaturnHouseLagna: houseOf(Math.floor(pNoon.Saturn / 30), lagnaSign),
        JupiterHouseLagna: houseOf(Math.floor(pNoon.Jupiter / 30), lagnaSign),
        RahuHouseLagna: houseOf(Math.floor(pNoon.Rahu / 30), lagnaSign),
        SaturnHouseMoon: hMoon('Saturn'), JupiterHouseMoon: hMoon('Jupiter'), RahuHouseMoon: hMoon('Rahu')
      },
      score, stars, verdict, notes,
      spheres, lunarDay, moonPhase,
      events: dayEvents.map(e => ({ at: hhmm(e.at, tz), atMs: e.at, text: e.text, short: e.short || e.text, kind: e.kind, weight: e.weight || 0 })),
      lines
    });
  }

  return {
    meta: {
      birth: { y: birth.y, m: birth.m, d: birth.d, hh: birth.hh, mm: birth.mm, tz: birth.tz, lat: birth.lat, lon: birth.lon },
      place: { lat, lon, tz },
      lagna: chart.lagna.sign + ' ' + chart.lagna.degText + ' · ' + chart.lagna.nakshatra,
      lagnaSignIdx: lagnaSign,
      moon: chart.planets.Moon.sign + ' ' + chart.planets.Moon.nakshatra,
      natalMoonSign, natalMoonNak,
      currentDasha: mdP0(tree, from),
      varshaphal: vf,
      generatedAt: new Date().toISOString()
    },
    days
  };
}
function mdP0(tree, ms) {
  const d = dashaAt(tree, ms);
  return d ? d.md.planet + '/' + (d.ad ? d.ad.planet : '—') + '/' + (d.pd ? d.pd.planet : '—') : '—';
}


  return { compute: compute, buildDashaTree: buildDashaTree, dashaAt: dashaAt, positions: positions, SIGNS: SIGNS, NAK: NAK, MONTHS_RU: MONTHS_RU, MONTHS_RU_G: MONTHS_RU_G, VARAS: VARAS };
}));
