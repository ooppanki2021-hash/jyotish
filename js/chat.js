/* ============================================================
   ИИ-ЧАТ — диалог с астрологом через Gemini API (бесплатный ключ).
   Ключ хранится ТОЛЬКО в localStorage браузера пользователя
   и не попадает в репозиторий.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Chat = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  var KEY_STORAGE = 'jyotish_api_key';
  var MODEL_STORAGE = 'jyotish_api_model';
  var DEFAULT_MODEL = 'gemini-2.5-flash';

  function getConfig(){
    var s = {};
    try { s.key = localStorage.getItem(KEY_STORAGE) || ''; } catch(e){ s.key = ''; }
    try { s.model = localStorage.getItem(MODEL_STORAGE) || DEFAULT_MODEL; } catch(e){ s.model = DEFAULT_MODEL; }
    return s;
  }
  function setConfig(key, model){
    try { localStorage.setItem(KEY_STORAGE, key || ''); } catch(e){}
    try { localStorage.setItem(MODEL_STORAGE, model || DEFAULT_MODEL); } catch(e){}
  }

  function fmtDeg(d){
    var dd = Math.floor(d); var mf = (d-dd)*60; var mi = Math.floor(mf);
    return dd + '°' + (mi<10?'0':'') + mi + "'";
  }

  // Текстовое описание карты для передачи модели
  function chartToText(chart){
    var lines = [];
    lines.push('Лагна (асцендент): ' + chart.lagna.sign + ' ' + chart.lagna.degText + ', накшатра ' + chart.lagna.nakshatra + ' (пада ' + chart.lagna.pada + ')');
    lines.push('Планеты (сидерический зодиак, Лахири):');
    var order = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Rahu','Ketu'];
    for (var i=0;i<order.length;i++){
      var pl = chart.planets[order[i]];
      var flags = [];
      if (pl.dignity) flags.push(pl.dignity);
      if (pl.retro) flags.push('ретроградный');
      if (pl.combust) flags.push('сожжён Солнцем (' + pl.combustDist.toFixed(1) + '°)');
      lines.push('- ' + pl.ru + ': ' + pl.sign + ' ' + pl.degText + ' (' + pl.house + '-й дом), накшатра ' + pl.nakshatra + (flags.length ? ', ' + flags.join(', ') : ''));
    }
    lines.push('Управитель Лагны: ' + chart.lagnaLord + '. Атмакарака: ' + (chart.planets[chart.atmakaraka] ? chart.planets[chart.atmakaraka].ru : ''));
    lines.push('Навамша-Лагна (Д-9): ' + chart.planets.Sun.sign + ' (см. Д-9 в таблице)');
    lines.push('Текущий период (Вишоттари): ' + chart.currentMaha.planet + ' махадаша, ' + chart.currentAntar.planet + ' антарадаша.');
    var tr = chart.transits || {};
    if (tr.Saturn) lines.push('Транзиты сейчас: Сатурн в ' + tr.Saturn.sign + ', Юпитер в ' + tr.Jupiter.sign + ', Раху в ' + tr.Rahu.sign + '.');
    return lines.join('\n');
  }

  function buildSystem(chart, personName){
    var ctx = chart ? chartToText(chart) : '(карта не задана)';
    return [
      'Ты — ведический астролог (джйотиши), опытный и доброжелательный. Отвечай на русском языке.',
      'Ты работаешь с НАТАЛЬНОЙ КАРТОЙ человека, которая дана ниже. Отвечай, опираясь ТОЛЬКО на эти данные и на классические принципы джйотиша (Брихат Парашара Хора Шастра, Вишоттари-даша, накшатры, йоги).',
      'Человек: ' + (personName || 'клиент') + '.',
      'Данные карты (сидерический зодиак, аянамша Лахири):',
      ctx,
      '',
      'Правила:',
      '1. Будь честен: джйотиш — традиционная система самопознания, а не точная наука.',
      '2. Не давай медицинских диагнозов и не обещай точных финансовых результатов — мягко напоминай обратиться к врачу/специалисту.',
      '3. Отвечай конкретно и по существу, но тепло и уважительно. Структурируй длинные ответы.',
      '4. Если вопрос вне компетенции астрологии, скажи об этом прямо.',
      '5. Не выдумывай данных карты: если чего-то нет в данных — не приписывай.'
    ].join('\n');
  }

  function buildHistory(history){
    // history: [{role:'user'|'model', text}]
    return (history||[]).map(function(m){
      return { role: m.role === 'model' ? 'model' : 'user', parts: [{ text: m.text }] };
    });
  }

  async function send(message, history, chart, personName){
    var cfg = getConfig();
    if (!cfg.key) throw new Error('NO_KEY');
    var model = cfg.model || DEFAULT_MODEL;
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(cfg.key);
    var contents = buildHistory(history);
    contents.push({ role: 'user', parts: [{ text: message }] });
    var body = {
      systemInstruction: { parts: [{ text: buildSystem(chart, personName) }] },
      contents: contents
    };
    var resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!resp.ok){
      var errText = '';
      try { errText = await resp.text(); } catch(e){}
      throw new Error('HTTP ' + resp.status + (errText ? ': ' + errText.slice(0,300) : ''));
    }
    var data = await resp.json();
    var text = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts){
      text = data.candidates[0].content.parts.map(function(p){ return p.text||''; }).join('');
    }
    if (!text) throw new Error('EMPTY');
    return text;
  }

  return { getConfig: getConfig, setConfig: setConfig, send: send, chartToText: chartToText, buildSystem: buildSystem, DEFAULT_MODEL: DEFAULT_MODEL };
}));
