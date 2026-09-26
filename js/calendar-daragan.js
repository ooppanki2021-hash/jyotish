/* ============================================================
   CALENDAR-DARAGAN — календарь на год (12 PDF) ТОЛЬКО по методике К. Дарагана:
   тропический зодиак, сигнификаторы тем, транзиты/прогрессии/дирекции с орбисами курса.
   Строит записи того же формата, что и daily.js, и отдаёт их рендереру CalendarPdf.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./daragan.js'));
  } else {
    root.DaraganCal = factory(root.Daragan);
  }
}(typeof self !== 'undefined' ? self : this, function (Daragan) {
  'use strict';

  var SPHERE_ORDER = ['general', 'love', 'children', 'money', 'career', 'realty', 'travel', 'social', 'health'];
  var SPHERE_NAME = {
    general: 'важное дело', love: 'любовь и брак', children: 'дети и творчество',
    money: 'деньги', career: 'карьера', realty: 'дом и переезд',
    travel: 'поездки и учёба', social: 'встречи и переговоры', health: 'здоровье и работа'
  };

  function starsOf(total) {
    var s = 3 + Math.round(total / 6);
    return Math.max(1, Math.min(5, s));
  }

  /* params: by,bm,bd,bhh,bmm,btz,blat,blon (рождение), lat,lon,tz (место), fromY..toD */
  function computeDays(params, chartFactory) {
    var chart = chartFactory(params);
    var tz = params.tz || 0;
    var days = [];
    var from = Date.UTC(params.fromY, params.fromM - 1, params.fromD);
    var to = Date.UTC(params.toY, params.toM - 1, params.toD);
    for (var ms = from; ms <= to; ms += 86400000) {
      var ld = new Date(ms);
      var y = ld.getUTCFullYear(), m = ld.getUTCMonth() + 1, d = ld.getUTCDate();
      // полдень местного времени места календаря
      var noon = new Date(ms + 12 * 3600000 - tz * 3600000);
      var snap = Daragan.daily(chart, noon);
      var spheres = [];
      var warnTexts = [];
      var reasonsTop = [];
      SPHERE_ORDER.forEach(function (k) {
        var t = null;
        for (var i = 0; i < snap.themes.length; i++) if (snap.themes[i].key === k) t = snap.themes[i];
        if (!t) return;
        var cls = t.score >= 2 ? 'good' : (t.score <= -2 ? 'bad' : 'mid');
        spheres.push({ k: k, name: SPHERE_NAME[k], score: t.score, cls: cls });
        t.warns.slice(0, 1).forEach(function (w) { if (warnTexts.length < 3) warnTexts.push(w); });
        if (t.score >= 2 && reasonsTop.length < 2) reasonsTop.push(t.label + ': ' + (t.reasons[0] || 'поддержка'));
      });
      var uniqW = [];
      warnTexts.forEach(function (w) { if (uniqW.indexOf(w) < 0) uniqW.push(w); });
      var timeLine = reasonsTop.length
        ? 'по Дарагану: ' + reasonsTop.join(' · ')
        : (uniqW.length
          ? 'по Дарагану: фон напряжения: ' + uniqW.slice(0, 2).join(' · ')
          : 'по Дарагану: сильных контактов сигнификаторов нет — день как обычно');
      days.push({
        date: y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d,
        y: y, m: m, d: d,
        vara: ld.getUTCDay(),
        stars: starsOf(snap.total),
        spheres: spheres,
        lunarText: 'Луна: ' + snap.moonSign + ' · ' + snap.moonPhase,
        timeLine: timeLine,
        warnTexts: warnTexts,
        events: []
      });
    }
    return { days: days };
  }

  function buildYear(params, opts) {
    opts = opts || {};
    var CP = opts.CalendarPdf || (typeof CalendarPdf !== 'undefined' ? CalendarPdf : null);
    if (!CP) throw new Error('CalendarPdf не найден');
    var data = computeDays(params, opts.chartFactory);
    var months = [];
    var seen = {};
    data.days.forEach(function (dd) {
      var k = dd.y + '-' + dd.m;
      if (!seen[k]) { seen[k] = 1; months.push([dd.y, dd.m]); }
    });
    var files = [];
    var JsPDF = (typeof jspdf !== 'undefined' && jspdf.jsPDF) || (typeof jsPDF !== 'undefined' ? jsPDF : null);
    var S = opts.scale || 5.0;
    months.forEach(function (ym, idx) {
      if (opts.onProgress) opts.onProgress(idx, months.length, CP.MONTHS[ym[1] - 1] + ' ' + ym[0]);
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(CP.A4W * S);
      canvas.height = Math.round(CP.A4H * S);
      var ctx = canvas.getContext('2d');
      if (!CP.drawMonth(data, ym[0], ym[1], CP.DEFAULTS, ctx, S)) return;
      var pdf = new JsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, CP.A4W, CP.A4H);
      files.push({ name: 'дараган-календарь-' + ym[0] + '-' + (ym[1] < 10 ? '0' : '') + ym[1] + '.pdf', pdf: pdf });
    });
    return { files: files };
  }

  return { computeDays: computeDays, buildYear: buildYear, SPHERE_NAME: SPHERE_NAME };
}));
