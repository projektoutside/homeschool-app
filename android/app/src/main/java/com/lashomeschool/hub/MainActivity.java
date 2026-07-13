package com.lashomeschool.hub;

import android.os.Bundle;
import android.webkit.WebView;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.google.android.play.core.assetpacks.AssetPackManager;
import com.google.android.play.core.assetpacks.AssetPackManagerFactory;
import com.google.android.play.core.assetpacks.AssetPackState;
import com.google.android.play.core.assetpacks.AssetPackStateUpdateListener;
import com.google.android.play.core.assetpacks.model.AssetPackStatus;
import java.util.Collections;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "GameAssetDelivery";
    private static final String PACK_NAME = "game_assets";
    private AssetPackManager assetPackManager;
    private AssetPackStateUpdateListener assetPackListener;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        assetPackManager = AssetPackManagerFactory.getInstance(this);
        getBridge().setWebViewClient(new GameAssetWebViewClient(getBridge(), assetPackManager));

        assetPackListener = this::handleAssetPackState;
        assetPackManager.registerListener(assetPackListener);

        if (assetPackManager.getPackLocation(PACK_NAME) == null) {
            showDownloadOverlay("Preparing the game library…", 0);
            assetPackManager.fetch(Collections.singletonList(PACK_NAME));
        } else {
            hideDownloadOverlay();
        }
    }

    private void handleAssetPackState(AssetPackState state) {
        if (!PACK_NAME.equals(state.name())) return;
        long total = Math.max(1, state.totalBytesToDownload());
        int percent = (int) Math.min(100, state.bytesDownloaded() * 100 / total);

        if (state.status() == AssetPackStatus.COMPLETED) {
            Log.i(TAG, "Pack completed; location=" + assetPackManager.getPackLocation(PACK_NAME));
            hideDownloadOverlay();
        } else if (state.status() == AssetPackStatus.WAITING_FOR_WIFI) {
            showDownloadOverlay("Connect to Wi-Fi to download the game library.", percent);
        } else if (state.status() == AssetPackStatus.FAILED) {
            showDownloadOverlay("The game download paused. Reopen the app to retry.", percent);
        } else {
            showDownloadOverlay("Downloading the game library…", percent);
        }
    }

    private void showDownloadOverlay(String message, int percent) {
        WebView webView = getBridge().getWebView();
        webView.post(() -> webView.evaluateJavascript(
            "window.__showGameDownload&&window.__showGameDownload(" + quote(message) + "," + percent + ")", null));
    }

    private void hideDownloadOverlay() {
        WebView webView = getBridge().getWebView();
        webView.post(() -> webView.evaluateJavascript(
            "window.__hideGameDownload&&window.__hideGameDownload()", null));
    }

    private String quote(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    @Override
    public void onDestroy() {
        if (assetPackManager != null && assetPackListener != null) {
            assetPackManager.unregisterListener(assetPackListener);
        }
        super.onDestroy();
    }
}
