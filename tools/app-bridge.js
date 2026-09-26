/* app-bridge.js — мост WebView ↔ Android (ru.jyotish.app).
   В WebView нельзя скачивать blob: и печатать — перехватываем эти действия
   и передаём содержимое в нативный слой через window.AndroidSave.saveFile(name, content). */
(function () {
  if (typeof AndroidSave === 'undefined') return; // не в приложении — ничего не делаем

  function saveText(name, text) {
    try { AndroidSave.saveFile(name, text); } catch (e) { alert('Не удалось сохранить файл: ' + e); }
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    // 1) Кнопка «Распечатать / PDF» — сохраняем HTML-разбор вместо печати
    if (t.closest('#btn-print')) {
      setTimeout(function () {
        var frame = document.getElementById('print-frame');
        var doc = frame && frame.srcdoc;
        if (doc) {
          saveText('джйотиш_разбор_печать.html', doc);
        }
      }, 300);
      return;
    }

    // 2) Ссылки с download + blob: («Скачать HTML», сохранение отчётов)
    var a = t.closest('a[download]');
    if (a && /^blob:/i.test(a.href || '')) {
      e.preventDefault();
      var fname = a.getAttribute('download') || 'файл.html';
      fetch(a.href).then(function (r) { return r.text(); })
        .then(function (txt) { saveText(fname, txt); })
        .catch(function () { alert('Не удалось сохранить файл.'); });
    }
  }, true);
})();
