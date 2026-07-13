package com.lashomeschool.hub;

import android.app.Activity;
import android.net.Uri;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.util.Log;
import android.view.ViewGroup;
import android.view.ViewParent;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import com.google.android.play.core.assetpacks.AssetPackLocation;
import com.google.android.play.core.assetpacks.AssetPackManager;
import java.io.File;
import java.io.FileInputStream;
import java.net.URLConnection;

public class GameAssetWebViewClient extends BridgeWebViewClient {
    private static final String TAG = "GameAssetWebView";
    private final Bridge bridge;
    private final AssetPackManager assetPackManager;

    public GameAssetWebViewClient(Bridge bridge, AssetPackManager assetPackManager) {
        super(bridge);
        this.bridge = bridge;
        this.assetPackManager = assetPackManager;
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        if (!isTrustedLocalRequest(request)) return super.shouldInterceptRequest(view, request);

        String requestPath = request.getUrl().getPath();
        if (requestPath == null) return super.shouldInterceptRequest(view, request);

        String relativePath = normalizeGameAssetPath(requestPath);
        if (relativePath == null) return super.shouldInterceptRequest(view, request);

        AssetPackLocation location = assetPackManager.getPackLocation("game_assets");
        if (location == null || location.assetsPath() == null) {
            Log.w(TAG, "Pack unavailable for " + relativePath);
            return super.shouldInterceptRequest(view, request);
        }

        try {
            File assetsRoot = new File(location.assetsPath());
            File asset = new File(assetsRoot, relativePath);
            String rootPath = assetsRoot.getCanonicalPath() + File.separator;
            if (!asset.getCanonicalPath().startsWith(rootPath) || !asset.isFile()) {
                Log.w(TAG, "Asset missing: " + asset.getCanonicalPath());
                return super.shouldInterceptRequest(view, request);
            }
            String mimeType = URLConnection.guessContentTypeFromName(asset.getName());
            if (mimeType == null) mimeType = "application/octet-stream";
            return new WebResourceResponse(mimeType, null, new FileInputStream(asset));
        } catch (Exception error) {
            Log.e(TAG, "Failed to serve " + relativePath, error);
            return super.shouldInterceptRequest(view, request);
        }
    }

    @Override
    public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
        Log.e(TAG, "WebView renderer exited; didCrash=" + detail.didCrash()
            + ", priority=" + detail.rendererPriorityAtExit());

        Activity activity = bridge.getActivity();
        if (activity == null) {
            view.destroy();
            return true;
        }
        view.post(() -> {
            ViewParent parent = view.getParent();
            if (parent instanceof ViewGroup) {
                ((ViewGroup) parent).removeView(view);
            }
            view.destroy();
            if (!activity.isFinishing() && !activity.isDestroyed()) {
                activity.recreate();
            }
        });
        return true;
    }

    private boolean isTrustedLocalRequest(WebResourceRequest request) {
        Uri url = request.getUrl();
        String scheme = url.getScheme();
        String host = url.getHost();
        return ("https".equals(scheme) || "http".equals(scheme)) && "localhost".equals(host);
    }

    private String normalizeGameAssetPath(String path) {
        String[] markers = {
            "Games/", "HomePageAPP/", "PolygonAPP/", "3dClass/",
            "Worksheets/", "FinalGraph/", "MathWorksheetCreator/"
        };
        for (String marker : markers) {
            int index = path.indexOf(marker);
            if (index >= 0) return path.substring(index);
        }
        return null;
    }
}
