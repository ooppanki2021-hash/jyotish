/* ============================================================
   ИИ-ЧАТ — диалог с астрологом через выбранного провайдера.
   Поддержка: Google Gemini, OpenRouter, Groq и любого
   OpenAI-совместимого API (настраиваемый base URL).
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
  var PROVIDER_STORAGE = 'jyotish_api_provider';
  var BASEURL_STORAGE = 'jyotish_api_baseurl';

  // Провайдеры
  var PROVIDERS = {
    gemini: {
      label: 'Google Gemini',
      defaultModel: 'gemini-2.5-flash',
      defaultBaseUrl: '',
      keyHint: 'Ключ вида AIza... (Google AI Studio)'
    },
    openrouter: {
      label: 'OpenRouter (может быть недоступен в РФ)',
      defaultModel: 'qwen/qwen-2.5-72b-instruct:free',
      defaultBaseUrl: 'https://openrouter.ai/api/v1',
      keyHint: 'Ключ вида sk-or-... (openrouter.ai)'
    },
    deepseek: {
      label: 'DeepSeek (работает в РФ)',
      defaultModel: 'deepseek-chat',
      defaultBaseUrl: 'https://api.deepseek.com',
      keyHint: 'Ключ вида sk-... (platform.deepseek.com)'
    },
    groq: {
      label: 'Groq (работает в РФ, очень быстро)',
      defaultModel: 'llama-3.3-70b-versatile',
      defaultBaseUrl: 'https://api.groq.com/openai/v1',
      keyHint: 'Ключ вида gsk_... (console.groq.com)'
    },
    custom: {
      label: 'Другой (OpenAI-совместимый)',
      defaultModel: 'gpt-4o-mini',
      defaultBaseUrl: 'https://api.openai.com/v1',
      keyHint: 'Ключ вашего сервиса'
    }
  };

  function getConfig(){
    var s = {};
    try { s.key = localStorage.getItem(KEY_STORAGE) || ''; } catch(e){ s.key = ''; }
    try { s.provider = localStorage.getItem(PROVIDER_STORAGE) || 'deepseek'; } catch(e){ s.provider = 'deepseek'; }
    var prov = PROVIDERS[s.provider] || PROVIDERS.deepseek;
    try { s.model = localStorage.getItem(MODEL_STORAGE) || prov.defaultModel; } catch(e){ s.model = prov.defaultModel; }
    try { s.baseUrl = localStorage.getItem(BASEURL_STORAGE) || prov.defaultBaseUrl; } catch(e){ s.baseUrl = prov.defaultBaseUrl; }
    return s;
  }
  function setConfig(key, model, provider, baseUrl){
    try { localStorage.setItem(KEY_STORAGE, key || ''); } catch(e){}
    try { localStorage.setItem(MODEL_STORAGE, model || ''); } catch(e){}
    try { localStorage.setItem(PROVIDER_STORAGE, provider || 'deepseek'); } catch(e){}
    try { localStorage.setItem(BASEURL_STORAGE, baseUrl || ''); } catch(e){}
  }

  function fmtDeg(d){
    var dd = Math.floor(d); var mf = (d-dd)*60; var mi = Math.floor(mf);
    return dd + '°' + (mi<10?'0':'') + mi + "'";
  }

  // Автоопределение провайдера по формату ключа
  function detectProviderFromKey(key){
    if (!key) return null;
    var k = key.trim();
    if (k.indexOf('AIza') === 0) return 'gemini';
    if (k.indexOf('gsk_') === 0) return 'groq';
    if (k.indexOf('sk-or-') === 0) return 'openrouter';
    if (k.indexOf('sk-') === 0) return 'deepseek'; // DeepSeek и большинство OpenAI-совместимых используют sk-
    return null;
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

  async function sendGemini(cfg, system, message, history){
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + cfg.model + ':generateContent?key=' + encodeURIComponent(cfg.key);
    var contents = history.map(function(m){
      return { role: m.role === 'model' ? 'model' : 'user', parts: [{ text: m.text }] };
    });
    contents.push({ role: 'user', parts: [{ text: message }] });
    var resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: contents })
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

  async function sendOpenAI(cfg, system, message, history){
    var url = (cfg.baseUrl || '').replace(/\/+$/, '') + '/chat/completions';
    var messages = [{ role: 'system', content: system }];
    history.forEach(function(m){ messages.push({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text }); });
    messages.push({ role: 'user', content: message });
    var resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
      body: JSON.stringify({ model: cfg.model, messages: messages, temperature: 0.7 })
    });
    if (!resp.ok){
      var errText = '';
      try { errText = await resp.text(); } catch(e){}
      throw new Error('HTTP ' + resp.status + (errText ? ': ' + errText.slice(0,400) : ''));
    }
    var data = await resp.json();
    var text = data && data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
    if (!text) throw new Error('EMPTY');
    return text;
  }

  async function send(message, history, chart, personName){
    var cfg = getConfig();
    if (!cfg.key) throw new Error('NO_KEY');
    // АВТО-МАРШРУТИЗАЦИЯ: если ключ не подходит к выбранному провайдеру — переключаем сами
    var detected = detectProviderFromKey(cfg.key);
    if (detected && detected !== cfg.provider){
      var prov = PROVIDERS[detected] || PROVIDERS.deepseek;
      cfg.provider = detected;
      if (detected === 'deepseek' || detected === 'groq' || detected === 'openrouter'){
        cfg.model = prov.defaultModel;
        cfg.baseUrl = prov.defaultBaseUrl;
      }
    }
    var system = buildSystem(chart, personName);
    if (cfg.provider === 'gemini'){
      return await sendGemini(cfg, system, message, history);
    }
    return await sendOpenAI(cfg, system, message, history);
  }

  return {
    getConfig: getConfig,
    setConfig: setConfig,
    send: send,
    chartToText: chartToText,
    buildSystem: buildSystem,
    detectProviderFromKey: detectProviderFromKey,
    PROVIDERS: PROVIDERS,
    DEFAULT_MODEL: 'deepseek-chat'
  };
}));
