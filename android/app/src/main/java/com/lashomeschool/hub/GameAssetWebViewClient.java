package com.lashomeschool.hub;

import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.util.Log;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import com.google.android.play.core.assetpacks.AssetPackLocation;
import com.google.android.play.core.assetpacks.AssetPackManager;
import java.io.File;
import java.io.FileInputStream;
import java.net.URLConnection;

public class GameAssetWebViewClient extends BridgeWebViewClient {
    private static final String TAG = "GameAssetWebView";
    private final AssetPackManager assetPackManager;

    public GameAssetWebViewClient(Bridge bridge, AssetPackManager assetPackManager) {
        super(bridge);
        this.assetPackManager = assetPackManager;
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
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
