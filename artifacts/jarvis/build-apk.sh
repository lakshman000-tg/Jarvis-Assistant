#!/bin/bash
# ============================================================
# JARVIS APK Build Script
# Run this on your LOCAL machine (needs Android Studio + JDK)
# ============================================================

set -e

echo "=== JARVIS APK Builder ==="
echo ""

# ── Step 1: Build the web app ──────────────────────────────
echo "1. Building web app..."
# Capacitor needs base='/' not the Replit BASE_PATH
BASE_PATH=/ pnpm --filter @workspace/jarvis run build
echo "   ✅ Web build done → artifacts/jarvis/dist/public"
echo ""

# ── Step 2: Add Android platform (first time only) ─────────
if [ ! -d "artifacts/jarvis/android" ]; then
  echo "2. Adding Android platform..."
  cd artifacts/jarvis
  npx cap add android
  cd ../..

  echo "   📋 Applying Android permission patches..."

  # Copy the manifest with microphone permissions
  cp artifacts/jarvis/android-config/app/src/main/AndroidManifest.xml \
     artifacts/jarvis/android/app/src/main/AndroidManifest.xml

  # Copy the MainActivity with WebView mic grant
  mkdir -p artifacts/jarvis/android/app/src/main/java/com/jarvis/assistant/
  cp artifacts/jarvis/android-config/MainActivity.java \
     artifacts/jarvis/android/app/src/main/java/com/jarvis/assistant/MainActivity.java

  echo "   ✅ Android platform added"
else
  echo "2. Android platform already exists, skipping add"
fi
echo ""

# ── Step 3: Sync web build into Android project ────────────
echo "3. Syncing web build to Android..."
cd artifacts/jarvis
npx cap sync android
cd ../..
echo "   ✅ Sync done"
echo ""

# ── Step 4: Build the APK ──────────────────────────────────
echo "4. Building debug APK..."
cd artifacts/jarvis/android
./gradlew assembleDebug
cd ../../..
echo ""

APK_PATH="artifacts/jarvis/android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
  echo "=== ✅ BUILD COMPLETE ==="
  echo "APK: $APK_PATH"
  echo ""
  echo "Install on device:"
  echo "  adb install $APK_PATH"
else
  echo "❌ APK not found — check build errors above"
  exit 1
fi

# ── Step 5: Open in Android Studio (optional) ──────────────
echo ""
echo "To open in Android Studio:"
echo "  npx cap open android"
echo ""
echo "⚠️  IMPORTANT: Update capacitor.config.ts server.url"
echo "   to your deployed Replit app URL before building release APK"
