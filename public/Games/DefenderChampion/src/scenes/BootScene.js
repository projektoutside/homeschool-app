import Phaser from 'phaser';
import {
  MANIFEST_CACHE_KEY,
  createAssetLoadTracker,
  createCampaignAssetPlan,
  createQaFailureInjector,
  queueCampaignAssets,
  registerMetadataAnimations,
  validateManifest,
} from '../services/asset-loader.js';

const flattenPlan = (plan) => [...plan.metadata, ...plan.rasters];

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.hud = this.registry.get('hud');
    this.hostBridge = this.registry.get('hostBridge');
    this.hud.showLoading({ currentId: 'Campaign manifest', percent: 0 });
    this.load.on('progress', (progress) => {
      this.hud.showLoading({
        currentId: 'Campaign manifest',
        percent: Math.round(progress * 4),
        status: 'Checking the campaign inventory…',
      });
    });
    this.load.json(MANIFEST_CACHE_KEY, 'assets/manifest.json');
  }

  create() {
    let manifest;
    try {
      manifest = validateManifest(this.cache.json.get(MANIFEST_CACHE_KEY));
    } catch (error) {
      this.showFatalFailure(['campaign-manifest'], () => this.scene.restart());
      console.error('[Defender Champion] Manifest validation failed.', error);
      return;
    }

    const plan = createCampaignAssetPlan(manifest);
    const records = flattenPlan(plan);
    this.plan = plan;
    this.tracker = createAssetLoadTracker(records);
    this.failureInjector = createQaFailureInjector({
      enabled: Boolean(this.hostBridge?.getState?.().qaMode),
      search: globalThis.location?.search ?? '',
    });
    this.registry.set('assetManifest', manifest);
    this.registry.set('assetPlan', plan);
    this.beginCampaignLoad(records, { retry: false });
  }

  beginCampaignLoad(records, { retry }) {
    this.load.removeAllListeners();
    const recordIds = new Set(records.map(({ id }) => id));
    let currentId = records[0]?.id ?? 'Campaign assets';

    this.load.on('fileprogress', (file) => {
      currentId = file.key;
      this.hud.showLoading({
        currentId,
        percent: Math.max(4, Math.round(4 + (this.load.progress * 96))),
        status: retry ? 'Retrying the missing field supplies…' : 'Equipping the defender guild…',
      });
    });
    this.load.on('filecomplete', (key) => {
      if (recordIds.has(key)) this.tracker.recordSuccess(key);
    });
    this.load.on('loaderror', (file) => {
      if (recordIds.has(file.key)) this.tracker.recordFailure(file.key);
    });
    this.load.once('complete', () => this.finishCampaignLoad(currentId));

    queueCampaignAssets(this, records, { failureInjector: this.failureInjector });
    this.hud.showLoading({
      currentId,
      percent: retry ? 96 : 4,
      status: retry ? 'Retrying the missing field supplies…' : 'Equipping the defender guild…',
    });
    this.load.start();
  }

  finishCampaignLoad(currentId) {
    if (this.tracker.isBlocked()) {
      const failed = this.tracker.getFailedEssentialIds();
      this.showFatalFailure(failed, () => {
        const retryRecords = this.tracker.getRetryRecords();
        if (retryRecords.length > 0) this.beginCampaignLoad(retryRecords, { retry: true });
      });
      return;
    }

    const optionalFailures = this.tracker.getOptionalFailures();
    if (optionalFailures.length > 0) {
      console.warn(`[Defender Champion] Optional art unavailable: ${optionalFailures.join(', ')}`);
    }
    const metadata = {
      bosses: this.cache.json.get('metadata-bosses'),
      defenders: this.cache.json.get('metadata-defenders'),
      enemies: this.cache.json.get('metadata-enemies'),
    };
    registerMetadataAnimations(this, metadata);
    this.registry.set('metadata-defenders', metadata.defenders);
    this.registry.set('metadata-enemies', metadata.enemies);
    this.registry.set('metadata-bosses', metadata.bosses);
    this.registry.set('assetMetadata', Object.freeze({
      ...metadata,
      castle: this.cache.json.get('metadata-castle'),
      environment: this.cache.json.get('metadata-environment'),
      optionalFailures: Object.freeze([...optionalFailures]),
    }));
    this.hud.showLoading({ currentId, percent: 100, status: 'The woodland is ready.' });
    this.scene.start('MenuScene');
  }

  showFatalFailure(errorIds, retry) {
    this.hud.showLoading({
      currentId: errorIds[0] ?? 'Unknown asset',
      errorIds,
      percent: Math.max(4, Math.round(this.load.progress * 100)),
      retry,
      exit: () => this.hostBridge?.exit?.(),
    });
  }
}
