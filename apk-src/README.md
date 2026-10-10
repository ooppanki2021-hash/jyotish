# Сборка APK «Джйотиш 2»

    KSPASS=<пароль кейстора> bash apk-src/build_apk.sh <versionCode> <versionName> <jyotish2.keystore> <out.apk>

Кейстор и пароль выдаёт пользовательница (в репозитории их нет). Отпечаток её сертификата:
82cf7a8d4e42441cb9250a59259238d444397590aabbec1333b5f3dbbf9b127f — после подписи сверять через apksigner verify --print-certs.
Текущая версия на телефоне 10012/2.112; следующая 10013/2.113 (оба числа растут каждый раз).
Скрипт сам скачивает build-tools r33.0.1 и android.jar (platform-30), собирает assets из корня репозитория.
Подробности и подводные камни — ../RESUME.md §6.
