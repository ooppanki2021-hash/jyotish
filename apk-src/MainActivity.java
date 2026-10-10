package ru.jyotish.app2;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 1;
    private WebView web;
    private ValueCallback<Uri[]> filePathCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        try { s.setAllowUniversalAccessFromFileURLs(true); } catch (Throwable ignored) {}
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        web.setWebViewClient(new WebViewClient());

        // Выбор файла (<input type=file>) для импорта сохранённых карт.
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView wv, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "Выберите файл карт (.json)"),
                            FILE_CHOOSER_REQUEST);
                    return true;
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
            }
        });

        // Мост «Джйотиш 2»: сохранение файлов (HTML-отчёт, экспорт карт) в «Загрузки».
        web.addJavascriptInterface(new SaveBridge(), "AndroidSave");

        web.loadUrl("file:///android_asset/index.html");
        setContentView(web);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (filePathCallback != null) {
                Uri uri = (resultCode == RESULT_OK && data != null && data.getData() != null)
                        ? data.getData() : null;
                filePathCallback.onReceiveValue(uri != null ? new Uri[]{uri} : null);
                filePathCallback = null;
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    private void toast(final String m) {
        runOnUiThread(new Runnable() { public void run() {
            Toast.makeText(MainActivity.this, m, Toast.LENGTH_LONG).show();
        }});
    }

    /** Возвращает MIME по расширению имени файла. */
    private String mimeFor(String name) {
        String n = name == null ? "" : name.toLowerCase(Locale.ROOT);
        if (n.endsWith(".json")) return "application/json";
        if (n.endsWith(".html") || n.endsWith(".htm")) return "text/html";
        if (n.endsWith(".txt")) return "text/plain";
        return "text/html";
    }

    /** Пишет байты файла в «Загрузки» (Downloads) устройства. */
    private boolean saveBytesToDownloads(String name, byte[] bytes, String mime) {
        try {
            String nm = (name == null || name.isEmpty()) ? "файл.pdf" : name;
            if (Build.VERSION.SDK_INT >= 29) {
                ContentResolver cr = getContentResolver();
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.Downloads.DISPLAY_NAME, nm);
                cv.put(MediaStore.Downloads.MIME_TYPE, mime);
                cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (uri == null) return false;
                OutputStream os = cr.openOutputStream(uri);
                if (os == null) return false;
                os.write(bytes);
                os.flush();
                os.close();
                return true;
            } else {
                File dir = Environment.getExternalStoragePublicDirectory(
                        Environment.DIRECTORY_DOWNLOADS);
                if (!dir.exists()) dir.mkdirs();
                File f = new File(dir, nm);
                FileOutputStream fos = new FileOutputStream(f);
                fos.write(bytes);
                fos.flush();
                fos.close();
                return f.exists();
            }
        } catch (Exception e) {
            return false;
        }
    }

    /** Пишет содержимое файла в «Загрузки» (Downloads) устройства. */
    private boolean saveToDownloads(String name, String content) {
        try { return saveBytesToDownloads(name, content.getBytes("UTF-8"), mimeFor(name)); } catch (Exception e) { return false; }
    }

    private boolean saveToDownloadsOldUnused(String name, String content) {
        try {
            String nm = (name == null || name.isEmpty()) ? "джйотиш.html" : name;
            if (Build.VERSION.SDK_INT >= 29) {
                ContentResolver cr = getContentResolver();
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.Downloads.DISPLAY_NAME, nm);
                cv.put(MediaStore.Downloads.MIME_TYPE, mimeFor(nm));
                cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (uri == null) return false;
                OutputStream os = cr.openOutputStream(uri);
                if (os == null) return false;
                os.write(content.getBytes("UTF-8"));
                os.flush();
                os.close();
                return true;
            } else {
                File dir = Environment.getExternalStoragePublicDirectory(
                        Environment.DIRECTORY_DOWNLOADS);
                if (!dir.exists()) dir.mkdirs();
                File f = new File(dir, nm);
                FileOutputStream fos = new FileOutputStream(f);
                fos.write(content.getBytes("UTF-8"));
                fos.flush();
                fos.close();
                return f.exists();
            }
        } catch (Exception e) {
            return false;
        }
    }

    /** Класс-мост, доступный из JS как window.AndroidSave. */
    private class SaveBridge {
        @JavascriptInterface
        public void saveFile(String name, String content) {
            if (content == null) return;
            boolean ok = saveToDownloads(name, content);
            if (ok) {
                toast("✓ Сохранено в «Загрузки»: " + (name == null || name.isEmpty() ? "файл" : name));
            } else {
                toast("Не удалось сохранить файл.");
            }
        }

        @JavascriptInterface
        public void saveBase64(final String name, final String b64) {
            if (b64 == null) return;
            try {
                byte[] bytes = android.util.Base64.decode(b64, android.util.Base64.DEFAULT);
                boolean ok = saveBytesToDownloads(name, bytes, "application/pdf");
                if (ok) {
                    toast("✓ Сохранено в «Загрузки»: " + (name == null || name.isEmpty() ? "файл" : name));
                } else {
                    toast("Не удалось сохранить файл.");
                }
            } catch (Exception e) {
                toast("Не удалось сохранить файл.");
            }
        }
    }
}
