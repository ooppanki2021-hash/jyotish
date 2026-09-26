/* ============================================================
   CitySearch — поиск по базе городов мира (GeoNames, ~34 000)
   + автоматический расчёт часового пояса на дату рождения
   (с учётом летнего времени и исторических переводов часов)
   ============================================================ */
(function () {
  'use strict';

  // ---------- Часовой пояс ----------

  // Смещение (мс) часового пояса относительно UTC для момента времени utcMs
  function tzOffsetMs(utcMs, tzId) {
    try {
      var dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: tzId, hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      var parts = {};
      dtf.formatToParts(new Date(utcMs)).forEach(function (p) { parts[p.type] = p.value; });
      var asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, (+parts.hour) % 24, +parts.minute, +parts.second);
      return asUTC - Math.floor(utcMs / 1000) * 1000;
    } catch (e) { return 0; }
  }

  // Смещение в часах для «настенного» времени (год, месяц, день, час, минута)
  // в данном часовом поясе. Итеративно разрешает неоднозначность при переводе часов.
  function offsetHoursForWall(y, m, d, hh, mm, tzId) {
    if (!tzId || !y) return null;
    var wall = Date.UTC(y, m - 1, d, hh, mm, 0);
    var guess = wall, i, off, next;
    for (i = 0; i < 3; i++) {
      off = tzOffsetMs(guess, tzId);
      next = wall - off;
      if (next === guess) break;
      guess = next;
    }
    off = tzOffsetMs(guess, tzId);
    return Math.round(off / 60000) / 60; // с точностью до минуты
  }

  // Текущее смещение в часах для часового пояса
  function offsetHoursNow(tzId) {
    if (!tzId) return null;
    return Math.round(tzOffsetMs(Date.now(), tzId) / 60000) / 60;
  }

  // ---------- Справочники ----------

  var _dn = null;
  function countryName(cc) {
    try {
      if (!_dn) _dn = new Intl.DisplayNames(['ru'], { type: 'region' });
      return _dn.of(cc) || cc;
    } catch (e) { return cc; }
  }

  function norm(s) { return String(s).toLowerCase(); }

  // ---------- Поиск ----------
  // Возвращает до `limit` городов по запросу (сначала совпадения с начала слова)

  function search(q, limit) {
    var db = window.JCITIES;
    if (!db || !q) return [];
    q = norm(q.trim());
    if (q.length < 1) return [];
    var prefix = [], inside = [];
    var rows = db.c, i, r, fields, f, pos, starts;
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      fields = [r[0], r[1], r[2]];
      starts = false; pos = -1;
      for (f = 0; f < 3; f++) {
        if (!fields[f]) continue;
        var n = norm(fields[f]);
        if (n.indexOf(q) === 0) { starts = true; break; }
        if (pos === -1) { var k = n.indexOf(q); if (k !== -1) pos = k; }
      }
      if (starts) prefix.push(r);
      else if (pos !== -1) inside.push(r);
      if (prefix.length + inside.length > 400) break; // защита от очень коротких запросов
    }
    function byTier(x, y) { return y[7] - x[7]; }
    prefix.sort(byTier);
    inside.sort(byTier);
    return prefix.slice(0, limit).concat(inside.slice(0, Math.max(0, limit - prefix.length)));
  }

  function cityName(row) { return row[0]; }
  function cityLabel(row) { return row[0] + ', ' + countryName(row[3]); }
  function cityTz(row) { return window.JCITIES.tz[row[6]]; }

  // ---------- Виджет ----------
  // attach(input, { onPick(city), getWall(), note })
  //   onPick(city) — city = { name, label, country, lat, lon, tz }
  //   getWall()    — fn, возвращает {y,m,d,hh,mm} для расчёта пояса (или null)
  //   note(el,text)— fn для вывода подсказки (необязательно)

  function attach(input, opts) {
    opts = opts || {};
    var box = document.createElement('div');
    box.className = 'city-dd hidden';
    input.parentNode.style.position = 'relative';
    input.parentNode.appendChild(box);
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');

    var items = [], sel = -1, open = false, lastQ = '';

    function close() { open = false; box.classList.add('hidden'); sel = -1; }

    function render(list) {
      items = list; sel = -1;
      if (!list.length) { close(); return; }
      box.innerHTML = '';
      list.forEach(function (r, i) {
        var div = document.createElement('div');
        div.className = 'city-item';
        var popTxt = r[7] >= 7 ? ' · крупный город' : '';
        div.innerHTML = '<b></b><span></span>';
        div.querySelector('b').textContent = r[0];
        div.querySelector('span').textContent = countryName(r[3]) + popTxt;
        div.addEventListener('mousedown', function (e) { e.preventDefault(); pick(i); });
        box.appendChild(div);
      });
      box.classList.remove('hidden');
      open = true;
    }

    function pick(i) {
      var r = items[i];
      if (!r) return;
      var wall = opts.getWall ? opts.getWall() : null;
      var tzId = cityTz(r);
      var off = (wall && wall.y) ? offsetHoursForWall(wall.y, wall.m, wall.d, wall.hh, wall.mm, tzId) : offsetHoursNow(tzId);
      input.value = cityLabel(r);
      close();
      if (opts.onPick) opts.onPick({
        name: r[0], label: cityLabel(r), country: r[3],
        lat: r[4], lon: r[5], tz: tzId, offset: off
      });
    }

    var timer = null;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      var v = input.value;
      timer = setTimeout(function () {
        if (v.trim() === lastQ) return;
        lastQ = v.trim();
        if (v.trim().length < 1) { close(); return; }
        render(search(v, 8));
      }, 80);
    });
    input.addEventListener('focus', function () {
      if (input.value.trim().length >= 1 && items.length) { box.classList.remove('hidden'); open = true; }
    });
    input.addEventListener('blur', function () { setTimeout(close, 150); });
    input.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); hilite(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); hilite(); }
      else if (e.key === 'Enter') { if (sel >= 0) { e.preventDefault(); pick(sel); } }
      else if (e.key === 'Escape') { close(); }
    });
    function hilite() {
      var kids = box.children;
      for (var i = 0; i < kids.length; i++) kids[i].classList.toggle('active', i === sel);
      if (sel >= 0 && kids[sel]) kids[sel].scrollIntoView({ block: 'nearest' });
    }

    return {
      set: function (label) { input.value = label; },
      tzOffsetForWall: offsetHoursForWall
    };
  }

  window.CitySearch = {
    attach: attach,
    search: search,
    offsetHoursForWall: offsetHoursForWall,
    offsetHoursNow: offsetHoursNow,
    countryName: countryName
  };
})();
