package com.lashomeschool.hub;

import android.app.Activity;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.assetpacks.AssetPackException;
import com.google.android.play.core.assetpacks.AssetPackManager;
import com.google.android.play.core.assetpacks.AssetPackManagerFactory;
import com.google.android.play.core.assetpacks.AssetPackState;
import com.google.android.play.core.assetpacks.AssetPackStateUpdateListener;
import com.google.android.play.core.assetpacks.model.AssetPackErrorCode;
import com.google.android.play.core.assetpacks.model.AssetPackStatus;
import java.util.Collections;

@CapacitorPlugin(name = "GameAssetDelivery")
public class GameAssetDeliveryPlugin extends Plugin {
    private static final String TAG = "GameAssetDelivery";
    private static final String PACK_NAME = "game_assets";

    private AssetPackManager assetPackManager;
    private AssetPackStateUpdateListener assetPackListener;
    private ActivityResultLauncher<IntentSenderRequest> confirmationLauncher;
    private PluginCall pendingConfirmationCall;

    @Override
    public void load() {
        assetPackManager = AssetPackManagerFactory.getInstance(getContext());
        assetPackListener = state -> {
            if (PACK_NAME.equals(state.name())) {
                notifyListeners("downloadStateChanged", serializeState(state), true);
            }
        };
        assetPackManager.registerListener(assetPackListener);

        confirmationLauncher = getActivity().registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(),
            result -> {
                PluginCall call = pendingConfirmationCall;
                pendingConfirmationCall = null;
                if (call == null) {
                    return;
                }

                JSObject response = new JSObject();
                response.put("accepted", result.getResultCode() == Activity.RESULT_OK);
                call.resolve(response);
            }
        );
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        if (isInstalled()) {
            call.resolve(completedState());
            return;
        }

        assetPackManager
            .getPackStates(Collections.singletonList(PACK_NAME))
            .addOnSuccessListener(states -> {
                AssetPackState state = states.packStates().get(PACK_NAME);
                call.resolve(state == null ? notInstalledState() : serializeState(state));
            })
            .addOnFailureListener(error -> rejectWithFriendlyError(call, error));
    }

    @PluginMethod
    public void startDownload(PluginCall call) {
        if (isInstalled()) {
            call.resolve(completedState());
            return;
        }

        assetPackManager
            .fetch(Collections.singletonList(PACK_NAME))
            .addOnSuccessListener(states -> {
                AssetPackState state = states.packStates().get(PACK_NAME);
                call.resolve(state == null ? notInstalledState() : serializeState(state));
            })
            .addOnFailureListener(error -> rejectWithFriendlyError(call, error));
    }

    @PluginMethod
    public void confirmDownload(PluginCall call) {
        if (pendingConfirmationCall != null) {
            call.reject("A Google Play download confirmation is already open.");
            return;
        }

        pendingConfirmationCall = call;
        boolean shown = assetPackManager.showConfirmationDialog(confirmationLauncher);
        if (!shown) {
            pendingConfirmationCall = null;
            JSObject response = new JSObject();
            response.put("accepted", false);
            call.resolve(response);
        }
    }

    private boolean isInstalled() {
        return assetPackManager != null && assetPackManager.getPackLocation(PACK_NAME) != null;
    }

    private JSObject completedState() {
        return new JSObject()
            .put("status", "completed")
            .put("installed", true)
            .put("bytesDownloaded", 0L)
            .put("totalBytes", 0L)
            .put("percent", 100)
            .put("errorCode", AssetPackErrorCode.NO_ERROR);
    }

    private JSObject notInstalledState() {
        return new JSObject()
            .put("status", "not_installed")
            .put("installed", false)
            .put("bytesDownloaded", 0L)
            .put("totalBytes", 0L)
            .put("percent", 0)
            .put("errorCode", AssetPackErrorCode.NO_ERROR);
    }

    private JSObject serializeState(AssetPackState state) {
        boolean installed = state.status() == AssetPackStatus.COMPLETED || isInstalled();
        int percent = installed ? 100 : Math.max(0, Math.min(100, state.transferProgressPercentage()));
        return new JSObject()
            .put("status", statusName(state.status()))
            .put("installed", installed)
            .put("bytesDownloaded", state.bytesDownloaded())
            .put("totalBytes", state.totalBytesToDownload())
            .put("percent", percent)
            .put("errorCode", state.errorCode());
    }

    private String statusName(int status) {
        if (status == AssetPackStatus.PENDING) return "pending";
        if (status == AssetPackStatus.DOWNLOADING) return "downloading";
        if (status == AssetPackStatus.TRANSFERRING) return "transferring";
        if (status == AssetPackStatus.COMPLETED) return "completed";
        if (status == AssetPackStatus.FAILED) return "failed";
        if (status == AssetPackStatus.CANCELED) return "canceled";
        if (status == AssetPackStatus.WAITING_FOR_WIFI) return "waiting_for_wifi";
        if (status == AssetPackStatus.NOT_INSTALLED) return "not_installed";
        if (status == AssetPackStatus.REQUIRES_USER_CONFIRMATION) return "requires_user_confirmation";
        return "unknown";
    }

    private void rejectWithFriendlyError(PluginCall call, Exception error) {
        int errorCode = error instanceof AssetPackException
            ? ((AssetPackException) error).getErrorCode()
            : AssetPackErrorCode.INTERNAL_ERROR;
        Logger.error(TAG, "Google Play could not prepare the learning library. Error code: " + errorCode, error);

        if (errorCode == AssetPackErrorCode.NETWORK_ERROR) {
            call.reject("Connect to the internet, then try the learning library download again.");
        } else if (errorCode == AssetPackErrorCode.INSUFFICIENT_STORAGE) {
            call.reject("Free some device storage, then try the learning library download again.");
        } else if (
            errorCode == AssetPackErrorCode.APP_NOT_OWNED ||
            errorCode == AssetPackErrorCode.UNRECOGNIZED_INSTALLATION
        ) {
            call.reject("Install La's Homeschool Hub from Google Play to download the full learning library.");
        } else {
            call.reject("The learning library could not start downloading. Please try again in a moment.");
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (assetPackManager != null && assetPackListener != null) {
            assetPackManager.unregisterListener(assetPackListener);
        }
        pendingConfirmationCall = null;
    }
}
