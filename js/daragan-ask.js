/* daragan-ask.js — «Спросить Дарагана» (оффлайн-поиск по книге).
   Отвечает на вопрос ВЫДЕРЖКАМИ из книги К. Дарагана «Профессиональная астрология
   (Мир Урании, 2019), не ломая контекст: ищет релевантные абзацы (BM25), даёт
   короткую строку-ответ (сильнейшая фраза из книги) + сами выдержки с контекстом,
   подсвечивая найденные слова. Полностью оффлайн. Безопасно: при ошибке ''.
   Экспорт: DaraganAsk.answer(question) -> HTML. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(root || {}); }
  else { root.DaraganAsk = factory(root); }
})(typeof self !== 'undefined' ? self : this, function (root) {
  if (root.DaraganAsk) return root.DaraganAsk;

  function loadParas(){
    if (root.DARAGAN_PARAS) return root.DARAGAN_PARAS;
    if (typeof module === 'object' && module.exports){ try { return require('./daragan-book.js'); } catch(e){} }
    return [];
  }

  var STOPwords = ('и в во на с со по из у к о от за не что чтобы как а но или его ее её ей их им для это этот та те эти бы же ли чем он она оно они мы вы ты я то да нет все всего весь если при до про об обо ибо так там тут здесь тоже также однако лишь только еще ещё уже хотя впрочем раз между среди около близ без над под перед через сквозь после вследствие более менее самый самая само самые лучше всего больше').split(' ');
  var STOP = {}; for (var si=0;si<STOPwords.length;si++) STOP[STOPwords[si]]=1;

  function stem(w){
    if (w.length <= 4) return w;
    var suf = ['ения','ение','ениях','ений','иям','иями','иями','ость','ости','ости','ость'];
    // аккуратное усечение окончаний для повышения полноты поиска
    var ends = ['ия','ию','ией','ии','ие','ий','ая','яя','ое','ее','ые','ие','ого','его','ому','ему','ым','им','ой','ей','ам','ям','ах','ях','ов','ев','ей','ел','а','я','ы','е'];
    for (var i=0;i<ends.length;i++){
      var s = ends[i];
      if (w.length > s.length + 3 && w.slice(-s.length) === s){ return w.slice(0, w.length - s.length); }
    }
    return w;
  }

  function tokenize(text){
    if (!text) return [];
    var words = text.toLowerCase().replace(/ё/g,'е').replace(/[^а-яa-z0-9]+/g,' ').split(/\s+/);
    var out = [];
    for (var i=0;i<words.length;i++){
      var w = words[i]; if (!w) continue;
      if (STOP[w]) continue;
      var s = stem(w);
      if (s.length >= 2) out.push(s);
    }
    return out;
  }

  var _index = null;
  function buildIndex(){
    if (_index) return _index;
    var paras = loadParas();
    var docs = []; var df = {}; var total = 0;
    for (var i=0;i<paras.length;i++){
      var toks = tokenize(paras[i]);
      var tfm = {};
      for (var j=0;j<toks.length;j++){ tfm[toks[j]] = (tfm[toks[j]]||0)+1; }
      for (var t in tfm){ df[t] = (df[t]||0)+1; }
      docs.push({ text: paras[i], tf: tfm, len: toks.length });
      total += toks.length;
    }
    var N = docs.length, avg = total / (N||1);
    var idf = {};
    for (var t2 in df){ idf[t2] = Math.log(1 + (N - df[t2] + 0.5)/(df[t2] + 0.5)); }
    _index = { docs: docs, idf: idf, N: N, avg: avg, df: df };
    return _index;
  }

  function bm25(terms){
    var ix = buildIndex(); if (!ix.N) return [];
    var k1 = 1.5, b = 0.75;
    var scores = [];
    for (var i=0;i<ix.docs.length;i++){
      var d = ix.docs[i], s = 0;
      for (var j=0;j<terms.length;j++){
        var t = terms[j]; if (!t) continue;
        var tf = d.tf[t]; if (!tf) continue;
        var idf = ix.idf[t] || 0;
        s += idf * (tf*(k1+1)) / (tf + k1*(1 - b + b*(d.len/(ix.avg||1))));
      }
      if (s > 0) scores.push({ i: i, s: s });
    }
    scores.sort(function(a,b){ return b.s - a.s; });
    return scores;
  }

  function sentSplit(text){
    return text.split(/(?<=[.!?……:])\s+/).filter(function(s){ return s.trim().length>0; });
  }

  function highlight(text, terms){
    var out = '';
    // огрубляем: подсвечиваем вхождения любых исходных корней (по подстроке)
    var lower = text.toLowerCase().replace(/ё/g,'е');
    // строим карту позиций для подсветки (жадно, без вложений)
    var marks = [];
    var tl = terms.join('|');
    for (var i=0;i<lower.length;i++){
      var m = lower.substr(i).match(new RegExp('^(' + tl + ')'));
      if (m){ marks.push([i, i+m[1].length]); i += m[1].length-1; }
    }
    if (!marks.length) return text;
    var res='', pos=0;
    marks.sort(function(a,b){return a[0]-b[0];});
    for (var k=0;k<marks.length;k++){
      res += text.slice(pos, marks[k][0]);
      res += '<mark>'+text.slice(marks[k][0], marks[k][1])+'</mark>';
      pos = marks[k][1];
    }
    res += text.slice(pos);
    return res;
  }

  function bestSentence(doc, terms){
    var sents = sentSplit(doc.text);
    var best=null, bs=-1;
    for (var i=0;i<sents.length;i++){
      var s = sents[i];
      var toks = tokenize(s);
      var intercept = 0;
      for (var j=0;j<terms.length;j++){ if (toks.indexOf(terms[j])>=0) intercept++; }
      var score = intercept*10 - Math.abs(s.length - 200)/30;
      if (intercept>0 && score>bs){ bs=score; best=s; }
    }
    return best;
  }

  function answer(question){
    try {
      question = String(question || '').trim();
      if (!question) return '';
      var terms = tokenize(question);
      if (!terms.length) return '<p class="muted">Не могу распознать вопрос — задайте его по-русски.</p>';
      var ranked = bm25(terms);
      if (!ranked.length) return '<p class="muted">По этому вопросу в книге не нашлось подходящих мест. Попробуйте переформулировать (например: «чем управляет Меркурий», «богатство по 2 дому», «предприниматель по Родцену»).</p>';

      var ix = buildIndex();
      var topDoc = ix.docs[ranked[0].i];
      var ans = bestSentence(topDoc, terms) || topDoc.text;
      var sliceCount = Math.min(4, ranked.length);

      var h = '';
      h += '<div class="sk-card">';
      h += '<h3>📚 Спросить Дарагана</h3>';
      h += '<p class="muted" style="margin-top:0">Ответ по книге «Профессиональная астрология» (К. Дараган, Мир Урании, 2019) — выдержками, как есть.</p>';
      // --- строка-ответ ---
      h += '<div class="sk-strong" style="background:#fff8e6;border-radius:8px;padding:10px 12px;margin:8px 0">В книге об этом:<br>“'+highlight(ans, terms)+'”</div>';

      // --- выдержки с контекстом ---
      h += '<h4 style="margin:14px 0 6px">Что ещё говорится (по релевантности):</h4>';
      for (var i=0;i<sliceCount;i++){
        var d = ix.docs[ranked[i].i];
        h += '<details class="sk-ask" style="border:1px solid #e4dcc9;border-radius:8px;padding:8px 10px;margin:6px 0">';
        h += '<summary style="cursor:pointer"><b>Фрагмент '+(i+1)+'</b> <span class="muted">— абзац из книги</span></summary>';
        h += '<div style="margin-top:6px;font-size:14px">'+highlight(d.text, terms)+'</div>';
        h += '</details>';
      }
      h += '<p class="muted" style="margin-top:8px">⚠️ Это поиск-выдержки из книги, а не синтез: ответ показывает, <b>что именно написал автор</b> по теме. Некоторые фрагменты — из иллюстративных историй книги, а не только из «правил»; судите по контексту.</p>';
      h += '</div>';
      return h;
    } catch(e){ return ''; }
  }

  return { answer: answer, BOOK: 'Дараган — Спросить Дарагана (поиск по книге)' };
});
