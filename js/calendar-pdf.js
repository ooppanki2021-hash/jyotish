/* ============================================================
   CALENDAR-PDF — персональный календарь на год → 12 PDF (A4).
   Портовано с tools/make_calendar_pdf.py (тот же макет):
     клетка дня: дата · день недели · ★ · лунные сутки;
     слева цветной список сфер МОЖНО / НЕЛЬЗЯ / КАК ОБЫЧНО + окно удачи и плохое время;
     справа линованное поле для записей.
   Рендер на canvas (системный шрифт, кириллица), сборка в PDF через jsPDF.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./daily.js'));
  } else {
    root.CalendarPdf = factory(root.Daily);
  }
}(typeof self !== 'undefined' ? self : this, function (Daily) {
  'use strict';

  var MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  var WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  var INK = '#1e1c1a', GOLD = '#8b6214', MUTED = '#767068', LINEC = '#b2a896',
      HAIRC = '#d6cec0', NOTEC = '#cec6b6',
      GOODBG = '#f2f7f0', BADBG = '#faefee', MIDBG = '#fcfaf4', HEADBG = '#f5ecd6';
  var GOODC = '#286a30', BADC = '#b02e24', MIDC = '#a07800';
  var STARC = { 5: '#2c6c32', 4: '#5c8034', 3: '#7a7260', 2: '#ac7630', 1: '#a23a2c' };

  var DEFAULTS = { head: 12.5, headgap: 3.0, colgap: 4.5, rowgap: 1.2,
    left_frac: 0.58, midgap: 2.4, note_lh: 3.4, fs_list: 5.6, lh_list: 2.3,
    foot: 6.0, mt: 6.0, ml: 7.0, tint: true };

  var A4W = 210, A4H = 297;
  var PT = 0.3528; // pt -> mm

  function stars(n) { var s = ''; for (var i = 0; i < 5; i++) s += i < n ? '★' : '☆'; return s; }
  function rgb() { return INK; }

  function wrap(ctx, txt, wmm, S) {
    var words = txt.split(/\s+/), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var trial = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(trial).width / S <= wmm || !cur) cur = trial;
      else { lines.push(cur); cur = words[i]; }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function setFont(ctx, style, fsPt, S, color) {
    ctx.font = (style === 'B' ? 'bold ' : '') + (fsPt * PT * S).toFixed(2) + 'px sans-serif';
    ctx.fillStyle = color || INK;
  }

  /* ---------- отрисовка месяца в ctx (координаты в мм, S = px на мм) ---------- */
  function drawMonth(data, y, m, cfg, ctx, S) {
    var days = data.days.filter(function (d) { return d.y === y && d.m === m; });
    if (!days.length) return false;
    var ML = cfg.ml, MT = cfg.mt, W = A4W - 2 * ML;
    var cols = days.length > 16 ? 2 : 1;
    var gap = cols === 2 ? cfg.colgap : 0;
    var cw = (W - gap) / cols;
    var per_col = cols === 2 ? Math.ceil(days.length / cols) : days.length;

    // фон страницы
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, A4W * S, A4H * S);

    // шапка
    var hh = cfg.head;
    ctx.fillStyle = HEADBG;
    ctx.fillRect(ML * S, MT * S, W * S, hh * S);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 0.55 * S;
    ctx.beginPath(); ctx.moveTo(ML * S, (MT + hh) * S); ctx.lineTo((ML + W) * S, (MT + hh) * S); ctx.stroke();
    ctx.lineWidth = 0.2 * S;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    setFont(ctx, 'B', 16, S, GOLD);
    ctx.fillText(MONTHS[m - 1] + ' ' + y, (ML + 3) * S, (MT + hh - 3.6) * S);

    var top = MT + hh + cfg.headgap;
    var bottom = A4H - cfg.foot;
    var rowh = (bottom - top) / per_col;
    var pad = 1.5;

    for (var i = 0; i < days.length; i++) {
      var d = days[i];
      var col = (cols === 1 || i < per_col) ? 0 : 1;
      var row = (cols === 1 || i < per_col) ? i : i - per_col;
      var x = ML + col * (cw + gap);
      var yy = top + row * rowh;
      var ch = rowh - cfg.rowgap;
      var ix = x + pad, iw = cw - 2 * pad;

      var clGood = false, clBad = false;
      if (d.customLines){ d.customLines.forEach(function(cl){ if (cl.kind === 'good') clGood = true; if (cl.kind === 'bad') clBad = true; }); }
      if (cfg.tint) {
        ctx.fillStyle = d.customLines ? (clGood ? GOODBG : (clBad ? BADBG : MIDBG)) : (d.stars >= 4 ? GOODBG : (d.stars <= 2 ? BADBG : MIDBG));
        ctx.fillRect(x * S, yy * S, cw * S, ch * S);
      }
      ctx.strokeStyle = LINEC; ctx.lineWidth = 0.25 * S;
      ctx.strokeRect(x * S, yy * S, cw * S, ch * S);
      ctx.lineWidth = 0.2 * S;

      var date_h = 3.8;
      var inner_h = ch - date_h - 0.7;
      var y0 = yy + date_h + 0.3;

      // строка даты
      var starc = STARC[d.stars] || INK;
      setFont(ctx, 'B', 11.0, S, starc);
      var dd = (d.d < 10 ? '0' : '') + d.d;
      ctx.fillText(dd, ix * S, (yy + 3.3) * S);
      var dw = ctx.measureText(dd).width / S + 1.6;
      setFont(ctx, '', 6.4, S, MUTED);
      var wd = WD[(d.vara + 6) % 7];
      ctx.fillText(wd, (ix + dw) * S, (yy + 3.2) * S);
      dw += ctx.measureText(wd).width / S + 1.8;
      setFont(ctx, 'B', 6.6, S, starc);
      ctx.fillText(stars(d.stars), (ix + dw) * S, (yy + 3.2) * S);
      dw += ctx.measureText(stars(d.stars)).width / S + 2.0;
      setFont(ctx, '', 6.2, S, MUTED);
      var rt = d.lunarText || (d.lunarDay + '-е лунные сутки, ' + d.moonPhase);
      var rw = ctx.measureText(rt).width / S;
      if (ix + dw + rw < x + cw - pad) ctx.fillText(rt, (x + cw - pad - rw) * S, (yy + 3.2) * S);
      ctx.strokeStyle = HAIRC;
      ctx.beginPath(); ctx.moveTo(ix * S, (yy + date_h) * S); ctx.lineTo((x + cw - pad) * S, (yy + date_h) * S); ctx.stroke();

      // слева: цветной список сфер
      var lw = iw * cfg.left_frac;
      var good = [], bad = [], mid = [];
      (d.spheres || []).forEach(function (sp) {
        if (sp.cls === 'good') good.push(sp.name);
        else if (sp.cls === 'bad') bad.push(sp.name);
        else mid.push(sp.name);
      });
      var warns = [];
      (d.events || []).forEach(function (e) {
        if (e.kind === 'eclipse-solar') warns.push('солнечное затмение — день тишины');
        else if (e.kind === 'eclipse-lunar') warns.push('лунное затмение — эмоции на пределе');
      });
      if (d.chandrashtama) warns.push('луна в конфликте с вашей картой');
      (d.warnTexts || []).forEach(function (w) { if (warns.length < 3) warns.push(w); });
      (d.events || []).forEach(function (e) { if (e.kind === 'sankranti') warns.push('солнце меняет знак'); });
      var extras_mid = [];
      (d.events || []).forEach(function (e) {
        if (e.kind === 'dasha-ad' || e.kind === 'dasha-md') extras_mid.push(String(e.short || e.text).toLowerCase());
      });

      var LB = d.labels || { good: 'МОЖНО', bad: 'НЕЛЬЗЯ', mid: 'КАК ОБЫЧНО' };
      var lines = [];
      if (d.customLines){
        d.customLines.forEach(function(cl){ lines.push([cl.kind, cl.text]); });
        lines.push(['time', d.timeLine || '']);
      }
      else if (good.length) lines.push(['good', LB.good + ': ' + good.join(', ')]);
      if (!d.customLines && (bad.length || warns.length)) {
        var t = bad.length ? (LB.bad + ': ' + bad.join(', ')) : (LB.bad + ': ничего важного');
        if (warns.length) t += '  ⚠ ' + warns.slice(0, 2).join('; ');
        lines.push(['bad', t]);
      }
      if (!d.customLines && (mid.length || extras_mid.length)) {
        var t2 = mid.length ? (LB.mid + ': ' + mid.join(', ')) : (LB.mid + ': всё остальное');
        if (extras_mid.length) t2 += '  · ' + extras_mid.slice(0, 1).join('; ');
        lines.push(['mid', t2]);
      }
      if (!d.customLines) lines.push(['time', d.timeLine || ('окно удачи ' + d.abhijit + ' · плохое время ' + d.rahuKaal)]);

      var fsg = cfg.fs_list;
      var laid = [];
      var nlines = 0;
      lines.forEach(function (ln) {
        setFont(ctx, (ln[0] === 'good' || ln[0] === 'bad') ? 'B' : '', ln[0] === 'time' ? fsg - 0.3 : fsg, S, INK);
        var wr = wrap(ctx, ln[1], lw, S);
        laid.push([ln[0], wr]);
        nlines += wr.length;
      });
      var lh = Math.min(cfg.lh_list, (inner_h - 0.2) / Math.max(1, nlines));

      var yy2 = y0;
      laid.forEach(function (item) {
        var kind = item[0], wr = item[1];
        var colr = kind === 'good' ? GOODC : kind === 'bad' ? BADC : kind === 'mid' ? MIDC : MUTED;
        var fs = kind === 'time' ? fsg - 0.3 : fsg;
        setFont(ctx, (kind === 'good' || kind === 'bad') ? 'B' : '', fs, S, colr);
        wr.forEach(function (ln) {
          ctx.fillText(ln, ix * S, (yy2 + fs * PT) * S);
          yy2 += lh;
        });
      });

      // справа: линованное поле записей
      var rx = ix + lw + cfg.midgap;
      var rw2 = iw - lw - cfg.midgap;
      ctx.strokeStyle = NOTEC; ctx.lineWidth = 0.15 * S;
      var k = 1;
      for (;;) {
        var ly = y0 + k * cfg.note_lh;
        if (ly > yy + ch - 0.8) break;
        ctx.beginPath(); ctx.moveTo(rx * S, ly * S); ctx.lineTo((rx + rw2) * S, ly * S); ctx.stroke();
        k++;
      }
      ctx.lineWidth = 0.2 * S;
    }
    return true;
  }

  function makeCanvas(S) {
    var c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (!c) return null;
    c.width = Math.round(A4W * S);
    c.height = Math.round(A4H * S);
    return c;
  }

  /* ---------- памятка: как читать джйотиш-календарь ---------- */
  function drawInstructionJyotish(CP, ctx, S) {
    var W = CP.A4W, ML = 7, MT = 6, hh = 17;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W * S, CP.A4H * S);
    ctx.fillStyle = '#f5ecd6'; ctx.fillRect(ML * S, MT * S, (W - 2 * ML) * S, hh * S);
    ctx.strokeStyle = '#8b6214'; ctx.lineWidth = 0.55 * S;
    ctx.beginPath(); ctx.moveTo(ML * S, (MT + hh) * S); ctx.lineTo((W - ML) * S, (MT + hh) * S); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold ' + (16 * 0.3528 * S).toFixed(2) + 'px sans-serif'; ctx.fillStyle = '#8b6214';
    ctx.fillText('Как читать этот календарь', (ML + 3) * S, (MT + 7.5) * S);
    ctx.font = (7.2 * 0.3528 * S).toFixed(2) + 'px sans-serif'; ctx.fillStyle = '#767068';
    ctx.fillText('Персональный джйотиш-календарь: панчанга и ваша карта (сидерический зодиак).', (ML + 3) * S, (MT + 10.6) * S);
    ctx.fillText('Один лист = один месяц, время местное. Без санскрита: только русские названия.', (ML + 3) * S, (MT + hh - 2.0) * S);
    var y = MT + hh + 6, LW = W - 2 * ML - 6;
    function wrap(c, txt, wmm, sc) {
      var words = txt.split(/\s+/), lines = [], cur = '';
      words.forEach(function (wd) {
        var tr = cur ? cur + ' ' + wd : wd;
        if (c.measureText(tr).width / sc <= wmm || !cur) cur = tr;
        else { lines.push(cur); cur = wd; }
      });
      if (cur) lines.push(cur);
      return lines;
    }
    function para(title, exColor, example, texts) {
      ctx.font = 'bold ' + (10 * 0.3528 * S).toFixed(2) + 'px sans-serif'; ctx.fillStyle = '#1e1c1a';
      ctx.fillText(title, ML * S, y * S); y += 5.2;
      if (example) {
        ctx.font = 'bold ' + (7.5 * 0.3528 * S).toFixed(2) + 'px sans-serif'; ctx.fillStyle = exColor;
        wrap(ctx, example, LW, S).forEach(function (ln) { ctx.fillText(ln, (ML + 3) * S, y * S); y += 3.6; });
      }
      ctx.font = (7.5 * 0.3528 * S).toFixed(2) + 'px sans-serif'; ctx.fillStyle = '#1e1c1a';
      texts.forEach(function (t) {
        wrap(ctx, t, LW, S).forEach(function (ln) { ctx.fillText(ln, (ML + 3) * S, y * S); y += 3.6; });
      });
      y += 3.0;
    }
    para('1. Зелёная строка МОЖНО — сферы, благоприятные в этот день:', '#286a30',
      'МОЖНО: дела и встречи, брак, деньги',
      ['По панчанге (титхи, день недели, накшатра) и вашей карте эти сферы дня поддержаны: начинайте и ведите дела из списка.']);
    para('2. Красная строка НЕЛЬЗЯ — сферы под напряжением, плюс предупреждения ⚠:', '#b02e24',
      'НЕЛЬЗЯ: поездки, деньги  ⚠ солнечное затмение — день тишины',
      ['Эти сферы дня не поддержаны: новые шаги по ним отложите. Знак ⚠ добавляет события-предупреждения: затмения, Чандраштама (Луна в конфликте с картой), санкранти (Солнце меняет знак). В такие дни важен покой, а не старты.']);
    para('3. Жёлтая строка КАК ОБЫЧНО — нейтральные сферы:', '#a07800',
      'КАК ОБЫЧНО: учёба, здоровье',
      ['Ни поддержки, ни напряжения: дела идут своим чередом, особых мер не нужно.']);
    para('4. Серая строка — окна дня, одинаковые для всех сфер:', '#767068',
      'окно удачи 11:07–12:36 · плохое время 16:20–17:50',
      ['Окно удачи (Абхиджит) — лучший промежуток для любых важных шагов; плохое время (Раху-кала) — не начинайте нового и не подписывайте. Остальные окна дня развернутся в приложении в мухурте.']);
    para('5. Строка даты: число, день недели, звёзды, лунные сутки:', '#1e1c1a',
      '16  Пт  ★★★★☆   6-е лунные сутки, Луна растёт',
      ['Звёзды (1–5) — итог дня: 4–5 — день-помощник, 3 — ровный, 1–2 — день-тишина. Лунные сутки и фаза: растущая Луна — на рост и начало, убывающая — на завершение, уборку, отпускание.']);
    para('6. Правая половина клетки — линованное поле:', '#1e1c1a', null,
      ['Для ваших записей: планы, факты, как прошло. Календарь настенный — печатайте и вешайте.']);
    para('7. Календарь персональный:', '#1e1c1a', null,
      ['Он посчитан на выбранную карту рождения и город: учитываются тара-бала, Чандраштама, саде-сати, дома Сатурна и Юпитера от вашей Луны и лагны. Для другой карты (близких) выберите её в приложении и соберите отдельный комплект.']);
    para('8. Связка с мухуртой и календарём Дарагана:', '#1e1c1a', null,
      ['Этот календарь — общий фон дня по сферам. Точные часы под конкретное дело даёт мухурта (вкладка в приложении), а второй взгляд — настенная мухурта по Дарагану со своей памяткой. Если все три согласны — это самый сильный день для старта.']);
    return true;
  }

  /* ---------- сборка 12 PDF ---------- */
  function buildYear(params, opts) {
    opts = opts || {};
    var cfg = Object.assign({}, DEFAULTS, opts.cfg || {});
    var S = opts.scale || 5.0;
    var data = Daily.compute(params);
    var months = [];
    var seen = {};
    data.days.forEach(function (d) {
      var k = d.y + '-' + d.m;
      if (!seen[k]) { seen[k] = 1; months.push([d.y, d.m]); }
    });
    var files = [];
    var JsPDF = (root.jspdf && root.jspdf.jsPDF) || (root.jsPDF) || null;
    months.forEach(function (ym, idx) {
      if (opts.onProgress) opts.onProgress(idx, months.length + 1, MONTHS[ym[1] - 1] + ' ' + ym[0]);
      var canvas = makeCanvas(S);
      var ctx = canvas.getContext('2d');
      if (!drawMonth(data, ym[0], ym[1], cfg, ctx, S)) return;
      var pdf = new JsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, A4W, A4H);
      files.push({ name: 'джйотиш-календарь-' + ym[0] + '-' + (ym[1] < 10 ? '0' : '') + ym[1] + '.pdf', pdf: pdf });
    });
    if (opts.onProgress) opts.onProgress(months.length, months.length + 1, 'как читать');
    var c2 = makeCanvas(S);
    drawInstructionJyotish({ A4W: A4W, A4H: A4H }, c2.getContext('2d'), S);
    var pdf2 = new JsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    pdf2.addImage(c2.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, A4W, A4H);
    files.push({ name: 'джйотиш-календарь-13-как-читать.pdf', pdf: pdf2 });
    return { files: files, meta: data.meta };
  }

  /* ---------- сохранение: в приложении через мост, в браузере через jsPDF.save ---------- */
  function saveAll(files, onProgress) {
    var android = (typeof AndroidSave !== 'undefined') && AndroidSave.saveBase64 ? AndroidSave : null;
    var i = 0;
    function step() {
      if (i >= files.length) { if (onProgress) onProgress(files.length, files.length, 'готово'); return; }
      var f = files[i];
      if (onProgress) onProgress(i, files.length, 'Сохранение ' + f.name);
      if (android) {
        var url = f.pdf.output('datauristring');
        var b64 = String(url).split(',')[1] || '';
        android.saveBase64(f.name, b64);
        i++;
        setTimeout(step, 250);
      } else {
        f.pdf.save(f.name);
        i++;
        setTimeout(step, 600);
      }
    }
    step();
  }

  return { buildYear: buildYear, saveAll: saveAll, drawMonth: drawMonth, drawInstructionJyotish: drawInstructionJyotish, DEFAULTS: DEFAULTS, MONTHS: MONTHS, A4W: A4W, A4H: A4H };
}));
