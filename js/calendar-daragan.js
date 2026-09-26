/* ============================================================
   CALENDAR-DARAGAN — настенная мухурта по Дарагану: темы и часы поддержки.
   12 листов на год + 13-й файл «как читать».
   Зелёная строка: тема + окно (транзитная Луна в мягком аспекте к сигнификаторам).
   Красная: «не начинайте новое» (точный контакт вредителя), сгруппировано по причине.
   ⚠: осторожность на благоприятном периоде. Серая: число тем с поддержкой.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./daragan.js'), require('./muhurta.js'));
  } else {
    root.DaraganCal = factory(root.Daragan, root.Muhurta);
  }
}(typeof self !== 'undefined' ? self : this, function (Daragan, Muhurta) {
  'use strict';

  var LABEL = { general: 'важное дело', love: 'любовь', children: 'дети', money: 'деньги',
    realty: 'дом', travel: 'поездки/учёба', social: 'встречи', health: 'здоровье' };

  function hhmmLocal(ms, tz) {
    var d = new Date(ms + tz * 3600000);
    return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
  }
  function orbOf(t) { var m = /орб ([0-9.]+)°/.exec(t); return m ? +m[1] : 99; }
  function starsOf(total) { return Math.max(1, Math.min(5, 3 + Math.round(total / 8))); }

  /* Записи одного месяца (формат рендерера: customLines). */
  function computeMuhurtaMonth(chart, lat, lon, tz, y, m) {
    var nat = Daragan.natalTrop(chart);
    var now = new Date();
    var todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    var dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
    var days = [];
    for (var d = 1; d <= dim; d++) {
      var off = Math.round((Date.UTC(y, m - 1, d) - todayUtc) / 86400000);
      var base = Muhurta.dayAt(lat, lon, tz, 'general', off, 30);
      if (!base) continue;
      var sr = base.sunrise.getTime(), ss = base.sunset.getTime();
      var noon = new Date((sr + ss) / 2);
      var snap = Daragan.daily(chart, noon);
      var good = [], badG = {}, midG = {}, sup = 0, total = 0;
      Object.keys(LABEL).forEach(function (k) {
        var t = Daragan.dailyTheme(nat, k, noon);
        total += t.score;
        if (t.score >= 1) {
          var wins = Daragan.themeWindows(nat, k, sr, ss, 30);
          if (t.score >= 2 || wins.length) {
            sup++;
            wins.sort(function (a, b) { return (b.end - b.start) - (a.end - a.start); });
            var w = wins[0];
            good.push({ kind: 'good', text: LABEL[k] + ': ' + (w ? hhmmLocal(w.start, tz) + '–' + hhmmLocal(w.end, tz) + ' (' + w.nak + ')' : 'весь день (аспекты дня)') });
            return;
          }
        }
        if (t.score <= -2) {
          var warn = (t.warns.slice().sort(function (a, b) { return orbOf(a) - orbOf(b); })[0] || 'напряжение по теме');
          var key = warn.replace(/ \(орб [0-9.]+°\)/, '');
          var box = ((t.period || 0) >= 1) ? midG : badG;
          (box[key] = box[key] || { warn: warn, labels: [] }).labels.push(LABEL[k]);
        }
      });
      var lines = good.slice();
      Object.keys(badG).forEach(function (k) { lines.push({ kind: 'bad', text: 'не начинайте новое: ' + badG[k].labels.join(', ') + ' — ' + badG[k].warn }); });
      Object.keys(midG).forEach(function (k) { lines.push({ kind: 'mid', text: '⚠ осторожность: ' + midG[k].labels.join(', ') + ' — ' + midG[k].warn }); });
      if (!lines.length) lines.push({ kind: 'mid', text: 'особой поддержки нет: день как обычно' });
      days.push({
        y: y, m: m, d: d, vara: base.vara, stars: starsOf(total),
        lunarText: 'Луна: ' + snap.moonSign + ' · ' + snap.moonPhase,
        customLines: lines,
        timeLine: 'мухурта Дарагана: тем с поддержкой — ' + sup,
        events: []
      });
    }
    return days;
  }

  /* ---------- 13-я страница: как читать ---------- */
  function drawInstruction(CP, ctx, S) {
    var W = CP.A4W, ML = 7, MT = 6, hh = 17;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W * S, CP.A4H * S);
    ctx.fillStyle = '#f5ecd6'; ctx.fillRect(ML * S, MT * S, (W - 2 * ML) * S, hh * S);
    ctx.strokeStyle = '#8b6214'; ctx.lineWidth = 0.55 * S;
    ctx.beginPath(); ctx.moveTo(ML * S, (MT + hh) * S); ctx.lineTo((W - ML) * S, (MT + hh) * S); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold ' + (16 * 0.3528 * S).toFixed(2) + 'px sans-serif'; ctx.fillStyle = '#8b6214';
    ctx.fillText('Как читать этот календарь', (ML + 3) * S, (MT + 7.5) * S);
    ctx.font = (7.2 * 0.3528 * S).toFixed(2) + 'px sans-serif'; ctx.fillStyle = '#767068';
    ctx.fillText('Настенная мухурта по методике К. Дарагана: тропический зодиак, сигнификаторы тем,', (ML + 3) * S, (MT + 10.6) * S);
    ctx.fillText('транзиты / прогрессии / дирекции и Луна дня. Один лист = один месяц, время местное.', (ML + 3) * S, (MT + hh - 2.0) * S);
    var y = MT + hh + 6;
    var LW = W - 2 * ML - 6;
    function para(title, exColor, example, texts) {
      ctx.font = 'bold ' + (10 * 0.3528 * S).toFixed(2) + 'px sans-serif'; ctx.fillStyle = '#1e1c1a';
      ctx.fillText(title, ML * S, y * S); y += 5.2;
      if (example) {
        ctx.font = 'bold ' + (7.5 * 0.3528 * S).toFixed(2) + 'px sans-serif'; ctx.fillStyle = exColor;
        CPWrap(ctx, example, LW, S).forEach(function (ln) { ctx.fillText(ln, (ML + 3) * S, y * S); y += 3.6; });
      }
      ctx.font = (7.5 * 0.3528 * S).toFixed(2) + 'px sans-serif'; ctx.fillStyle = '#1e1c1a';
      texts.forEach(function (t) {
        CPWrap(ctx, t, LW, S).forEach(function (ln) { ctx.fillText(ln, (ML + 3) * S, y * S); y += 3.6; });
      });
      y += 3.0;
    }
    function CPWrap(c, txt, wmm, sc) {
      var words = txt.split(/\s+/), lines = [], cur = '';
      words.forEach(function (wd) {
        var tr = cur ? cur + ' ' + wd : wd;
        if (c.measureText(tr).width / sc <= wmm || !cur) cur = tr;
        else { lines.push(cur); cur = wd; }
      });
      if (cur) lines.push(cur);
      return lines;
    }
    para('1. Зелёная строка — тема поддержана, дано время:', '#286a30',
      'любовь: 09:29–13:59 (секстиль Венера)',
      ['В этот промежуток транзитная Луна стоит в мягком аспекте к сигнификаторам темы — начинайте дела темы внутри окна. В скобках — аспект Луны, который даёт окно.']);
    para('2. Красная строка — не начинайте НОВОЕ по теме:', '#b02e24',
      'не начинайте новое: важное дело, дети — Сатурн квадрат Юпитер (орб 0.6°)',
      ['Точный контакт вредителя к сигнификаторам: новые старты тем отложите, пока орбис не расползётся. ВАЖНО: рутину и начатое ранее продолжать можно — это не запрет на жизнь, а запрет на запуск нового. Недели красных строк — это период точного аспекта медленной планеты (Сатурн, Марс), он конечен.']);
    para('3. Жёлтая строка со знаком ⚠ — осторожность на благоприятном фоне:', '#a07800',
      '⚠ осторожность: деньги — Марс квадрат Сатурн (орб 0.6°)',
      ['Период темы благоприятен, но день даёт напряжённый акцент: дело идёт, но с двойной проверкой и без спешки.']);
    para('4. Серая строка внизу клетки:', '#767068',
      'мухурта Дарагана: тем с поддержкой — 2',
      ['Сколько тем в дне получили поддержку. 0 — день ровный, без особых окон.']);
    para('5. Строка даты: число, день недели, звёзды, Луна:', '#1e1c1a',
      '16  Пт  ★★★★☆   Луна: Стрелец · растущая Луна',
      ['Звёзды (1–5) — интегральная оценка дня по всем темам: 4–5 — день-помощник, 1–2 — день-тишина. Знак и фаза Луны — эмоциональный фон: растущая — на рост, убывающая — на завершение и уборку.']);
    para('6. Правая половина клетки — линованное поле:', '#1e1c1a', null,
      ['Для ваших записей: что запланировали, что сделали, как прошло. Календарь настенный — печатайте и вешайте.']);
    para('7. Если оба календаря (джйотиш и дараган) согласны:', '#1e1c1a', null,
      ['Это самый сильный день: разные зодиаки и правила дали одно и то же окно. Для важнейших стартов берите пересечение; для обычных дел достаточно одного метода, который вам удобнее читать.']);
    para('8. Где взять другие месяцы и карты:', '#1e1c1a', null,
      ['В приложении «Джйотиш 2» и на сайте: Прогностика → «Скачать календарь на год» → логика «Дараган: мухурта по темам». Там же выбирается карта (ваша или близких) и стартовый месяц — 12 листов + эта инструкция.']);
    return true;
  }

  /* ---------- сборка 12 месяцев + инструкция ---------- */
  function buildYear(params, opts) {
    opts = opts || {};
    var CP = opts.CalendarPdf || (typeof CalendarPdf !== 'undefined' ? CalendarPdf : null);
    if (!CP) throw new Error('CalendarPdf не найден');
    var chart = opts.chartFactory(params);
    var tz = params.tz || 0;
    var S = opts.scale || 5.0;
    var JsPDF = (typeof jspdf !== 'undefined' && jspdf.jsPDF) || (typeof jsPDF !== 'undefined' ? jsPDF : null);
    var files = [];
    var y = params.fromY, m = params.fromM;
    for (var i = 0; i < 12; i++) {
      if (opts.onProgress) opts.onProgress(i, 13, CP.MONTHS[m - 1] + ' ' + y);
      var days = computeMuhurtaMonth(chart, params.lat, params.lon, tz, y, m);
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(CP.A4W * S); canvas.height = Math.round(CP.A4H * S);
      var ctx = canvas.getContext('2d');
      if (CP.drawMonth({ days: days }, y, m, CP.DEFAULTS, ctx, S)) {
        var pdf = new JsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, CP.A4W, CP.A4H);
        files.push({ name: 'дараган-мухурта-' + y + '-' + (m < 10 ? '0' : '') + m + '.pdf', pdf: pdf });
      }
      m++; if (m > 12) { m = 1; y++; }
    }
    if (opts.onProgress) opts.onProgress(12, 13, 'как читать');
    var c2 = document.createElement('canvas');
    c2.width = Math.round(CP.A4W * S); c2.height = Math.round(CP.A4H * S);
    drawInstruction(CP, c2.getContext('2d'), S);
    var pdf2 = new JsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    pdf2.addImage(c2.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, CP.A4W, CP.A4H);
    files.push({ name: 'дараган-мухурта-13-как-читать.pdf', pdf: pdf2 });
    return { files: files };
  }

  return { computeMuhurtaMonth: computeMuhurtaMonth, buildYear: buildYear, drawInstruction: drawInstruction, LABEL: LABEL };
}));
