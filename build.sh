#!/bin/bash
# Builds "RCS.app" — a self-contained Mac app (no installer needed).
set -euo pipefail
cd "$(dirname "$0")"

APP="RCS.app"
BUILD=".build"
rm -rf "$APP" "$BUILD"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/game" "$BUILD"

echo "→ Compiling (Apple Silicon + Intel)…"
swiftc -O -target arm64-apple-macos12 mac/main.swift -o "$BUILD/arm64"
if swiftc -O -target x86_64-apple-macos14 mac/main.swift -o "$BUILD/x86_64" 2>/dev/null; then
  lipo -create "$BUILD/arm64" "$BUILD/x86_64" -output "$APP/Contents/MacOS/RCS"
else
  echo "  (Intel build not available with these tools — Apple Silicon only)"
  cp "$BUILD/arm64" "$APP/Contents/MacOS/RCS"
fi

echo "→ Copying game files…"
cp game/index.html "$APP/Contents/Resources/game/"

echo "→ Making icon…"
swift mac/make_icon.swift "$BUILD/icon.png"
ICONSET="$BUILD/AppIcon.iconset"
mkdir -p "$ICONSET"
for s in 16 32 128 256 512; do
  sips -z $s $s "$BUILD/icon.png" --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
  sips -z $((s*2)) $((s*2)) "$BUILD/icon.png" --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/AppIcon.icns"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>RCS</string>
  <key>CFBundleDisplayName</key><string>RCS</string>
  <key>CFBundleIdentifier</key><string>local.rcs.game</string>
  <key>CFBundleExecutable</key><string>RCS</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.arcade-games</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

echo "→ Signing (ad-hoc)…"
codesign --force --deep -s - "$APP"
rm -rf "$BUILD"
echo "✓ Built: $APP"
