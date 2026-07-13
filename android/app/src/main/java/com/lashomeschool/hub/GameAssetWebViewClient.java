package com.lashomeschool.hub;

import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import com.google.android.play.core.assetpacks.AssetPackLocation;
import com.google.android.play.core.assetpacks.AssetPackManager;
import java.io.File;
import java.io.FileInputStream;
import java.net.URLConnection;

public class GameAssetWebViewClient extends BridgeWebViewClient {
    private final AssetPackManager assetPackManager;

    public GameAssetWebViewClient(Bridge bridge, AssetPackManager assetPackManager) {
        super(bridge);
        this.assetPackManager = assetPackManager;
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        String requestPath = request.getUrl().getPath();
        if (requestPath == null) return super.shouldInterceptRequest(view, request);

        String relativePath = requestPath.replaceFirst("^/", "");
        if (!isGameAssetPath(relativePath)) return super.shouldInterceptRequest(view, request);

        AssetPackLocation location = assetPackManager.getPackLocation("game_assets");
        if (location == null || location.assetsPath() == null) {
            return super.shouldInterceptRequest(view, request);
        }

        try {
            File assetsRoot = new File(location.assetsPath());
            File asset = new File(assetsRoot, relativePath);
            String rootPath = assetsRoot.getCanonicalPath() + File.separator;
            if (!asset.getCanonicalPath().startsWith(rootPath) || !asset.isFile()) {
                return super.shouldInterceptRequest(view, request);
            }
            String mimeType = URLConnection.guessContentTypeFromName(asset.getName());
            if (mimeType == null) mimeType = "application/octet-stream";
            return new WebResourceResponse(mimeType, null, new FileInputStream(asset));
        } catch (Exception ignored) {
            return super.shouldInterceptRequest(view, request);
        }
    }

    private boolean isGameAssetPath(String path) {
        return path.startsWith("Games/") || path.startsWith("HomePageAPP/")
            || path.startsWith("PolygonAPP/") || path.startsWith("3dClass/")
            || path.startsWith("Worksheets/") || path.startsWith("FinalGraph/")
            || path.startsWith("MathWorksheetCreator/");
    }
}
