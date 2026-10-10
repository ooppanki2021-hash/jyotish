#!/usr/bin/env bash
# Сборка APK «Джйотиш 2» из этого репозитория.
# Использование: KSPASS=<пароль кейстора> bash apk-src/build_apk.sh <versionCode> <versionName> <путь-к-jyotish2.keystore> <путь-к-out.apk>
# Кейстор и пароль ВЫДАЁТ ПОЛЬЗОВАТЕЛЬНИЦА (в репозитории их нет). Отпечаток её сертификата:
# 82cf7a8d4e42441cb9250a59259238d444397590aabbec1333b5f3dbbf9b127f — другой ключ = обновление не встанет.
set -e
VC=${1:?versionCode}; VN=${2:?versionName}; KS=${3:?keystore}; OUT=${4:?out apk}
: ${KSPASS:?environment KSPASS (keystore password)}
REPO=$(cd "$(dirname "$0")/.." && pwd)
W=$REPO/apk-src/work; rm -rf "$W"; mkdir -p "$W/src/ru/jyotish/app2" "$W/gen/ru/jyotish/app2" "$W/bin" "$W/assets/tools"
BT=$REPO/apk-src/bt/android-13
if [ ! -x "$BT/aapt" ]; then mkdir -p "$REPO/apk-src/bt"; curl -sSLo /tmp/bt.zip https://dl.google.com/android/repository/build-tools_r33.0.1-linux.zip; unzip -q /tmp/bt.zip -d "$REPO/apk-src/bt"; chmod -R +x "$BT"; rm -f /tmp/bt.zip; fi
AJ=$REPO/apk-src/lib/android.jar
if [ ! -f "$AJ" ]; then mkdir -p "$REPO/apk-src/lib"; curl -sSLo /tmp/p30.zip https://dl.google.com/android/repository/platform-30_r03.zip; unzip -q -j /tmp/p30.zip android.jar -d "$REPO/apk-src/lib"; rm -f /tmp/p30.zip; fi
sed -e "s/@VC@/$VC/" -e "s/@VN@/$VN/" "$REPO/apk-src/AndroidManifest.xml" > "$W/AndroidManifest.xml"
cp "$REPO/apk-src/MainActivity.java" "$W/src/ru/jyotish/app2/"
for d in "drawable-mdpi-v4 48" "drawable-hdpi-v4 72" "drawable-xhdpi-v4 96" "drawable-xxhdpi-v4 144" "drawable-xxxhdpi-v4 192" "drawable 48"; do set -- $d; mkdir -p "$W/res/$1"; convert "$REPO/apk-src/icon_src.png" -resize "$2x$2" "$W/res/$1/ic_launcher.png"; done
cp "$REPO/index.html" "$REPO/style.css" "$REPO/README.md" "$W/assets/"
cp -r "$REPO/js" "$REPO/img" "$W/assets/"
cp "$REPO/tools/app-bridge.js" "$REPO/tools/build_cities.py" "$W/assets/tools/"
cd "$W"
"$BT/aapt" package -f -m -J gen -M AndroidManifest.xml -S res -I "$AJ"
javac -encoding UTF-8 -source 11 -target 11 -classpath "$AJ" -d bin/obj gen/ru/jyotish/app2/R.java src/ru/jyotish/app2/MainActivity.java
"$BT/d8" --lib "$AJ" --min-api 24 --output bin $(find bin/obj -name '*.class')
test -f bin/classes.dex || { echo "ОШИБКА: classes.dex не создан"; exit 1; }
"$BT/aapt" package -f -M AndroidManifest.xml -S res -A assets -I "$AJ" -F bin/app.unsigned.apk
cd bin && zip -q app.unsigned.apk classes.dex
"$BT/zipalign" -f -p 4 app.unsigned.apk app.aligned.apk
"$BT/apksigner" sign --ks "$KS" --ks-pass pass:"$KSPASS" --ks-key-alias jyotish2 --v1-signing-enabled true --v2-signing-enabled true --out "$OUT" app.aligned.apk
"$BT/apksigner" verify --print-certs "$OUT" | head -2
"$BT/aapt" dump badging "$OUT" | head -1
echo "ГОТОВО: $OUT"
