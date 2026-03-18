export function bindUpgradesPanelButton({ debugLog, playSound, openUpgradesModal }) {
    const upgradesPanelButton = document.getElementById('upgrades-panel-button');
    if (!upgradesPanelButton) {
        return false;
    }

    if (upgradesPanelButton.dataset.boundPowerShop === 'true') {
        return true;
    }

    upgradesPanelButton.dataset.boundPowerShop = 'true';
    upgradesPanelButton.addEventListener('click', (event) => {
        event.preventDefault();
        debugLog('Opening Power-Up Shop from button click.');
        playSound('startButton');
        openUpgradesModal();
    });

    return true;
}
