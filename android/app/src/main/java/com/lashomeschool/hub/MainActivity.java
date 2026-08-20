package com.lashomeschool.hub;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.google.android.play.core.assetpacks.AssetPackManager;
import com.google.android.play.core.assetpacks.AssetPackManagerFactory;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(GameAssetDeliveryPlugin.class);
        super.onCreate(savedInstanceState);
        AssetPackManager assetPackManager = AssetPackManagerFactory.getInstance(this);
        getBridge().setWebViewClient(new GameAssetWebViewClient(getBridge(), assetPackManager));
    }
}
