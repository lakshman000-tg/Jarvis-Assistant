package com.jarvis.assistant;

import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

/**
 * Copy this file to:
 * android/app/src/main/java/com/jarvis/assistant/MainActivity.java
 * after running: npx cap add android
 *
 * This override grants the WebView microphone permission automatically,
 * so voice recognition works without a separate permission dialog.
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Override WebChromeClient to grant mic access to the WebView
        WebView webView = getBridge().getWebView();
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                // Grant all requested resources (microphone, camera, etc.)
                request.grant(request.getResources());
            }
        });
    }
}
