import * as THREE from 'three';

const DEFAULT_SANITIZE = (value, fallback = 0) => (
    Number.isFinite(value) ? value : fallback
);

const clamp01 = (value) => THREE.MathUtils.clamp(value, 0, 1);

const smooth01 = (value) => {
    const clamped = clamp01(value);
    return clamped * clamped * (3 - 2 * clamped);
};

const easeInCubic = (value) => Math.pow(clamp01(value), 3);

const easeOutQuint = (value) => 1 - Math.pow(1 - clamp01(value), 5);

const easeInOutQuint = (value) => {
    const t = clamp01(value);
    return t < 0.5
        ? 16 * t * t * t * t * t
        : 1 - Math.pow(-2 * t + 2, 5) / 2;
};

const easeOutExpo = (value) => {
    const t = clamp01(value);
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

const pulse = (phaseTime, center, width, amplitude = 1) => {
    const delta = (phaseTime - center) / Math.max(0.0001, width);
    return amplitude * Math.exp(-(delta * delta) * 2.2);
};

const clusteredPulse = (time, seed, reduced = false) => clamp01(
    Math.pow(Math.max(0, Math.sin(time * 41 + seed * 0.7)), reduced ? 18 : 26) * 0.56 +
    Math.pow(Math.max(0, Math.sin(time * 67 + seed * 1.31 + 0.35)), reduced ? 16 : 24) * 0.34 +
    Math.pow(Math.max(0, Math.sin(time * 93 + seed * 0.47 + 1.1)), reduced ? 15 : 22) * 0.22
);

const getQualityTier = (storm) => (
    storm?.reducedMotion
        ? 'reduced'
        : storm?.lightweightMode
            ? 'lightweight'
            : 'cinematic'
);

const resolveDriftSpeed = (storm) => ({
    fast: storm?.reducedMotion ? 22 : storm?.lightweightMode ? 20 : 34,
    slow: storm?.reducedMotion ? -10 : storm?.lightweightMode ? -9 : -18
});

const steppedLeaderStrike = ({
    storm,
    duration,
    leaderCenter = 0.064,
    leaderWidth = 0.045,
    snapCenter = 0.102,
    snapWidth = 0.032,
    echoCenter = 0.164,
    echoWidth = 0.052,
    burstBias = 0,
    grainScale = 1,
    tail = 0.12
}) => {
    const safeDuration = Math.max(0.0001, duration);
    const leaderPulse =
        pulse(
            storm.phaseTime,
            safeDuration * leaderCenter,
            safeDuration * leaderWidth,
            storm.reducedMotion ? 0.78 : 0.94
        ) +
        pulse(
            storm.phaseTime,
            safeDuration * (leaderCenter + 0.024),
            safeDuration * leaderWidth * 0.78,
            storm.reducedMotion ? 0.34 : 0.52
        );
    const snapPulse =
        pulse(
            storm.phaseTime,
            safeDuration * snapCenter,
            safeDuration * snapWidth,
            storm.reducedMotion ? 1.04 : 1.26
        ) +
        pulse(
            storm.phaseTime,
            safeDuration * echoCenter,
            safeDuration * echoWidth,
            storm.reducedMotion ? 0.16 : 0.3
        );
    const granularPulse = clusteredPulse(
        storm.phaseTime * (storm.reducedMotion ? 0.72 : storm.lightweightMode ? 0.9 : 1.06) + burstBias,
        storm.seed + 11.3 + burstBias * 7.1,
        storm.reducedMotion || storm.lightweightMode
    );
    const leader = clamp01(leaderPulse * (0.54 + granularPulse * 0.18));
    const returnStroke = clamp01(snapPulse * (0.74 + granularPulse * grainScale * 0.42));
    const afterimage = clamp01(
        returnStroke * 0.44 +
        pulse(
            storm.phaseTime,
            safeDuration * (snapCenter + 0.05),
            safeDuration * (snapWidth * 2.5),
            storm.reducedMotion ? 0.12 : 0.24
        )
    );
    const tailPulse = Math.max(0, 1 - clamp01(storm.phaseTime / safeDuration));
    const envelope = clamp01(leader * 0.64 + returnStroke * 1.08 + afterimage * 0.18 + tailPulse * tail);
    return {
        leader,
        returnStroke,
        afterimage,
        granularPulse,
        envelope
    };
};

const LEGENDARY_STORM_VISUAL_CHANNEL_DEFAULTS = Object.freeze({
    environmentMix: 0,
    darkness: 0,
    mist: 0,
    flash: 0,
    whiteout: 0,
    cloudShiftPx: 0,
    cloudShiftAltPx: 0,
    nightfallProgress: 0,
    overlayOpacity: 0,
    lightningMix: 0,
    boltOpacity: 0,
    cloudFlash: 0,
    cloudSheet: 0,
    groundGlow: 0,
    boltGlowOpacity: 0,
    boltBranchOpacity: 0,
    returnStroke: 0,
    boltScale: 1,
    boltHeightScale: 1,
    impactBloom: 0,
    impactCore: 0,
    impactRing: 0,
    impactRadius: 0,
    previewBlend: 0,
    revealEnergy: 0,
    fogOpacity: 0,
    occludedLightning: 0,
    videoOpacity: 0,
    godRayIntensity: 0,
    vortexEnergy: 0,
    chromaticAberration: 0,
    screenShake: 0,
    vignetteStrength: 0
});

const LEGENDARY_PRE_VIDEO_DARKNESS_CEILING = Object.freeze({
    darkness: 0.24,
    nightfallProgress: 0.68,
    overlayOpacity: 0.68
});

export const LEGENDARY_STORM_LANDING_PHASES = new Set([
    'targetedImpact',
    'boxMaterialize',
    'idleStormReveal',
    'stormDissipate'
]);

export const LEGENDARY_STORM_PERSISTENT_STRIKE_PHASES = new Set([
    'postVideoStormHold',
    'boxMaterialize',
    'idleStormReveal',
    'stormDissipate'
]);

export const LEGENDARY_STORM_CLEARED_STRIKE_PHASES = new Set([
    'videoPlayback',
    'stormPause',
    'idle'
]);

export const LEGENDARY_STORM_TIMING_INTERACTION_PHASES = Object.freeze([
    'stormPause',
    'cloudFormation',
    'escalation',
    'transitionStrike',
    'videoPlayback',
    'postVideoStormHold',
    'targetedImpact',
    'boxMaterialize'
]);

export function resetLegendaryStormVisualChannels(target) {
    if (!target) {
        return target;
    }
    Object.assign(target, LEGENDARY_STORM_VISUAL_CHANNEL_DEFAULTS);
    return target;
}

export function collectLegendaryStormVisualChannelSnapshot(source, sanitizeNumber = DEFAULT_SANITIZE) {
    return {
        environmentMix: sanitizeNumber(source?.environmentMix, 0),
        darkness: sanitizeNumber(source?.darkness, 0),
        mist: sanitizeNumber(source?.mist, 0),
        flash: sanitizeNumber(source?.flash, 0),
        whiteout: sanitizeNumber(source?.whiteout, 0),
        cloudShiftPx: sanitizeNumber(source?.cloudShiftPx, 0),
        cloudShiftAltPx: sanitizeNumber(source?.cloudShiftAltPx, 0),
        nightfallProgress: sanitizeNumber(source?.nightfallProgress, 0),
        overlayOpacity: sanitizeNumber(source?.overlayOpacity, 0),
        lightningMix: sanitizeNumber(source?.lightningMix, 0),
        boltOpacity: sanitizeNumber(source?.boltOpacity, 0),
        cloudFlash: sanitizeNumber(source?.cloudFlash, 0),
        cloudSheet: sanitizeNumber(source?.cloudSheet, 0),
        groundGlow: sanitizeNumber(source?.groundGlow, 0),
        boltGlowOpacity: sanitizeNumber(source?.boltGlowOpacity, 0),
        boltBranchOpacity: sanitizeNumber(source?.boltBranchOpacity, 0),
        returnStroke: sanitizeNumber(source?.returnStroke, 0),
        boltScale: sanitizeNumber(source?.boltScale, 1),
        boltHeightScale: sanitizeNumber(source?.boltHeightScale, 1),
        impactBloom: sanitizeNumber(source?.impactBloom, 0),
        impactCore: sanitizeNumber(source?.impactCore, 0),
        impactRing: sanitizeNumber(source?.impactRing, 0),
        impactRadius: sanitizeNumber(source?.impactRadius, 0),
        previewBlend: sanitizeNumber(source?.previewBlend, 0),
        revealEnergy: sanitizeNumber(source?.revealEnergy, 0),
        fogOpacity: sanitizeNumber(source?.fogOpacity, 0),
        occludedLightning: sanitizeNumber(source?.occludedLightning, 0),
        videoOpacity: sanitizeNumber(source?.videoOpacity, 0),
        godRayIntensity: sanitizeNumber(source?.godRayIntensity, 0),
        vortexEnergy: sanitizeNumber(source?.vortexEnergy, 0),
        chromaticAberration: sanitizeNumber(source?.chromaticAberration, 0),
        screenShake: sanitizeNumber(source?.screenShake, 0),
        vignetteStrength: sanitizeNumber(source?.vignetteStrength, 0)
    };
}

export function refreshLegendaryStormTimingTotals(timings) {
    if (!timings) {
        return timings;
    }
    timings.interactionDuration = LEGENDARY_STORM_TIMING_INTERACTION_PHASES.reduce(
        (total, phaseKey) => total + DEFAULT_SANITIZE(timings[phaseKey], 0),
        0
    );
    timings.totalDuration = timings.interactionDuration + DEFAULT_SANITIZE(timings.stormDissipate, 0);
    return timings;
}

export function createLegendaryStormTimings(
    config,
    videoPlaybackDuration,
    reducedMotion = false,
    lightweightMode = false
) {
    const timings = reducedMotion
        ? {
            stormPause: config.reducedMotionStormPauseDuration,
            cloudFormation: config.reducedMotionCloudFormationDuration,
            escalation: config.reducedMotionEscalationDuration,
            transitionStrike: config.reducedMotionTransitionStrikeDuration,
            postVideoStormHold: config.reducedMotionPostVideoStormHoldDuration,
            targetedImpact: config.reducedMotionTargetedImpactDuration,
            boxMaterialize: config.reducedMotionBoxMaterializeDuration,
            stormDissipate: config.reducedMotionStormDissipateDuration
        }
        : lightweightMode
            ? {
                stormPause: config.lightweightStormPauseDuration,
                cloudFormation: config.lightweightCloudFormationDuration,
                escalation: config.lightweightEscalationDuration,
                transitionStrike: config.lightweightTransitionStrikeDuration,
                postVideoStormHold: config.lightweightPostVideoStormHoldDuration,
                targetedImpact: config.lightweightTargetedImpactDuration,
                boxMaterialize: config.lightweightBoxMaterializeDuration,
                stormDissipate: config.lightweightStormDissipateDuration
            }
            : {
                stormPause: config.stormPauseDuration,
                cloudFormation: config.cloudFormationDuration,
                escalation: config.escalationDuration,
                transitionStrike: config.transitionStrikeDuration,
                postVideoStormHold: config.postVideoStormHoldDuration,
                targetedImpact: config.targetedImpactDuration,
                boxMaterialize: config.boxMaterializeDuration,
                stormDissipate: config.stormDissipateDuration
            };
    timings.videoPlayback = DEFAULT_SANITIZE(videoPlaybackDuration, config.cutsceneFallbackDuration);
    return refreshLegendaryStormTimingTotals(timings);
}

function constrainLegendaryPreVideoDarkness(storm) {
    if (!storm) {
        return;
    }
    storm.darkness = Math.min(
        clamp01(DEFAULT_SANITIZE(storm.darkness, 0)),
        LEGENDARY_PRE_VIDEO_DARKNESS_CEILING.darkness
    );
    storm.nightfallProgress = Math.min(
        clamp01(DEFAULT_SANITIZE(storm.nightfallProgress, 0)),
        LEGENDARY_PRE_VIDEO_DARKNESS_CEILING.nightfallProgress
    );
    storm.overlayOpacity = Math.min(
        clamp01(DEFAULT_SANITIZE(storm.overlayOpacity, 0)),
        LEGENDARY_PRE_VIDEO_DARKNESS_CEILING.overlayOpacity
    );
}

export function updateLegendaryStormDirector({
    dt = 0,
    storm,
    theme = null,
    timings,
    videoCurrentTime = 0,
    callbacks = {}
} = {}) {
    if (!storm?.active) {
        return { completed: false };
    }

    const {
        confirmLegendaryCutscenePlaybackStarted,
        maybeRetryLegendaryCutsceneVideoPlaybackStart,
        maybeRefreshLegendaryStormStrikeGeometry,
        transitionLegendaryStormPhase,
        spawnLegendaryStormLandingBoxIfNeeded,
        startLegendaryLandingImpactFeedback,
        requestMysteryFlightReturn,
        stopLegendaryCutsceneVideoPlayback,
        onStormCompleted
    } = callbacks;

    const drift = resolveDriftSpeed(storm);
    const qualityTier = getQualityTier(storm);
    const impactBloomGain = Math.max(0.7, theme?.impactBloomGain || 1);
    const returnStrokeGain = Math.max(0.7, theme?.returnStrokeGain || 1);
    const cloudContrastGain = Math.max(0.75, theme?.cloudContrastGain || 1);
    const groundSpillGain = Math.max(0.75, theme?.groundSpillGain || 1);
    const lingeringMistFloor = Math.max(0.02, theme?.lingeringMistFloor || 0.04);
    const lingeringGroundGlow = Math.max(0.08, theme?.lingeringGroundGlow || 0.18);
    const previewStormBlend = THREE.MathUtils.clamp(theme?.previewStormBlend ?? 0.42, 0, 1);
    const lightVariant = (theme?.landingExposureCap || 0) > 0.96;
    const fogOverlayMaxOpacity = THREE.MathUtils.clamp(
        theme?.fogOverlayMaxOpacity ?? (lightVariant ? 0.24 : 0.42),
        0,
        1
    );
    const occludedLightningCap = THREE.MathUtils.clamp(
        theme?.occludedLightningCap ?? (lightVariant ? 0.18 : 0.24),
        0,
        1
    );
    const occludedLightningRate = Math.max(0.35, DEFAULT_SANITIZE(theme?.occludedLightningRate, 1));
    const occludedLightningPersistenceGain = THREE.MathUtils.clamp(
        DEFAULT_SANITIZE(theme?.occludedLightningPersistenceGain, 0.82),
        0,
        1.4
    );
    const occludedLightningMotionGain = storm.reducedMotion
        ? 0
        : storm.lightweightMode
            ? 0.58
            : 1;

    storm.qualityTier = qualityTier;
    storm.phaseTime += dt;
    storm.totalTime += dt;
    resetLegendaryStormVisualChannels(storm);

    if (storm.phase === 'transitionStrike' || storm.phase === 'videoPlayback') {
        confirmLegendaryCutscenePlaybackStarted?.();
    }

    const preVideoSkyX = 0.5 + Math.sin(storm.totalTime * 0.23 + storm.seed * 0.78) * 0.18;
    const preVideoSkyY = 0.2 + Math.cos(storm.totalTime * 0.17 + storm.seed * 0.46) * 0.05;
    const escalationSkyX = 0.5 + Math.sin(storm.totalTime * 0.34 + storm.seed * 1.12) * 0.24;
    const escalationSkyY = 0.28 + Math.cos(storm.totalTime * 0.26 + storm.seed * 0.68) * 0.08;
    const ambientIdleSkyX = 0.5 + Math.sin(storm.totalTime * 0.27 + storm.seed * 0.94) * 0.2;
    const ambientIdleSkyY = 0.24 + Math.cos(storm.totalTime * 0.18 + storm.seed * 0.52) * 0.06;

    if (storm.phase === 'stormPause') {
        const duration = timings.stormPause;
        storm.strikeScreenX = 0.5;
        storm.strikeScreenY = 0.18;
        storm.environmentMix = 0;
        storm.darkness = 0;
        storm.nightfallProgress = 0;
        storm.overlayOpacity = 0;
        storm.mist = 0;
        storm.fogOpacity = 0;
        constrainLegendaryPreVideoDarkness(storm);
        if (storm.phaseTime >= timings.stormPause) {
            transitionLegendaryStormPhase?.('cloudFormation');
        }
        return { completed: false };
    }

    if (storm.phase === 'cloudFormation') {
        const duration = timings.cloudFormation;
        const progress = clamp01(storm.phaseTime / duration);
        const eased = easeInOutQuint(progress);
        const introLead = smooth01(clamp01((progress - 0.12) / 0.28));
        const dimProgress = easeInOutQuint(clamp01((progress - 0.16) / 0.84));
        const rollingFront = easeOutExpo(clamp01((progress - 0.18) / 0.46));
        const internalProgress = easeInOutQuint(clamp01((progress - 0.28) / 0.72));
        const internalFlash = clusteredPulse(
            storm.phaseTime * (storm.reducedMotion ? 0.26 : 0.4),
            storm.seed + 4.2,
            storm.reducedMotion || storm.lightweightMode
        ) * internalProgress;
        const embeddedFlicker = clusteredPulse(
            storm.phaseTime * (storm.reducedMotion ? 0.18 : 0.3),
            storm.seed + 8.4,
            storm.reducedMotion || storm.lightweightMode
        ) * THREE.MathUtils.lerp(0.18, 1, internalProgress);
        if (internalProgress > 0.04) {
            maybeRefreshLegendaryStormStrikeGeometry?.('anticipation', 0.48, 0.9);
        }
        storm.strikeScreenX = THREE.MathUtils.clamp(preVideoSkyX, 0.24, 0.76);
        storm.strikeScreenY = THREE.MathUtils.clamp(preVideoSkyY, 0.11, 0.32);
        storm.environmentMix = THREE.MathUtils.lerp(0, 0.82, dimProgress);
        storm.darkness = THREE.MathUtils.lerp(0, 0.66, easeInOutQuint(clamp01((progress - 0.18) / 0.82)));
        storm.mist = THREE.MathUtils.lerp(0, 0.34, smooth01(clamp01((progress - 0.24) / 0.7)));
        storm.flash = clamp01(internalFlash * 0.06 + embeddedFlicker * 0.032 + rollingFront * 0.012);
        storm.nightfallProgress = THREE.MathUtils.lerp(0, storm.lightweightMode ? 0.78 : 0.92, easeInOutQuint(clamp01((progress - 0.16) / 0.84)));
        storm.overlayOpacity = THREE.MathUtils.lerp(0, 1, easeInOutQuint(clamp01((progress - 0.2) / 0.8)));
        storm.fogOpacity = fogOverlayMaxOpacity * THREE.MathUtils.lerp(0, 1, smooth01(clamp01((progress - 0.24) / 0.64)));
        storm.lightningMix = clamp01((internalFlash * 0.28 + embeddedFlicker * 0.12 + internalProgress * 0.08 + rollingFront * 0.08) * THREE.MathUtils.lerp(0.35, 1, introLead));
        const occludedFormationPulse = clusteredPulse(
            storm.phaseTime * (0.18 + occludedLightningRate * 0.08),
            storm.seed + 51.2,
            storm.reducedMotion || storm.lightweightMode
        ) * smooth01(clamp01((progress - 0.34) / 0.46));
        storm.occludedLightning = clamp01(
            occludedFormationPulse *
            occludedLightningCap *
            occludedLightningMotionGain *
            THREE.MathUtils.lerp(0.42, 0.82, internalProgress)
        );
        storm.cloudShiftPx =
            storm.totalTime * drift.fast * (0.22 + eased * 0.18) +
            Math.sin(storm.totalTime * 0.48 + storm.seed) * (2 + eased * 2.8);
        storm.cloudShiftAltPx =
            storm.totalTime * drift.slow * (0.16 + eased * 0.12) +
            Math.cos(storm.totalTime * 0.38 + storm.seed * 0.7) * (2.4 + eased * 2.9);
        storm.boltOpacity = clamp01(internalFlash * 0.2 + embeddedFlicker * 0.1 + rollingFront * 0.04);
        storm.cloudFlash = clamp01(internalFlash * 0.36 + embeddedFlicker * 0.08 + internalProgress * 0.12 + rollingFront * 0.06);
        storm.cloudSheet = clamp01((internalFlash * 0.16 + embeddedFlicker * 0.12 + rollingFront * 0.08) * cloudContrastGain);
        storm.boltGlowOpacity = clamp01(internalFlash * 0.4 + embeddedFlicker * 0.12 + internalProgress * 0.08);
        storm.boltBranchOpacity = clamp01(internalFlash * 0.2 + embeddedFlicker * 0.08 + rollingFront * 0.04);
        storm.returnStroke = clamp01(internalFlash * 0.06 * returnStrokeGain);
        storm.boltScale = THREE.MathUtils.lerp(0.84, 1.18, dimProgress);
        storm.boltHeightScale = THREE.MathUtils.lerp(0.46, 0.92, dimProgress);
        storm.revealEnergy = clamp01((internalProgress * 0.3 + rollingFront * 0.08) * THREE.MathUtils.lerp(0.18, 1, introLead));
        storm.vortexEnergy = THREE.MathUtils.lerp(0, 0.52, easeOutQuint(clamp01((progress - 0.24) / 0.76)));
        storm.godRayIntensity = THREE.MathUtils.lerp(0, 0.08, smooth01(clamp01((progress - 0.18) / 0.72)));
        storm.screenShake = clamp01((internalFlash * 0.02 + embeddedFlicker * 0.01) * THREE.MathUtils.lerp(0.18, 1, introLead));
        storm.vignetteStrength = THREE.MathUtils.lerp(0, 0.32, smooth01(clamp01((progress - 0.12) / 0.88)));
        constrainLegendaryPreVideoDarkness(storm);
        if (storm.phaseTime >= duration) {
            transitionLegendaryStormPhase?.('escalation');
        }
        return { completed: false };
    }

    if (storm.phase === 'escalation') {
        const duration = timings.escalation;
        const progress = clamp01(storm.phaseTime / duration);
        const eased = easeInOutQuint(progress);
        const surge = easeOutQuint(clamp01((progress - 0.12) / 0.88));
        const visiblePulse = clusteredPulse(
            storm.phaseTime * (storm.reducedMotion ? 0.5 : 0.78),
            storm.seed + 9.3,
            storm.reducedMotion || storm.lightweightMode
        ) * THREE.MathUtils.lerp(0.52, 1, eased);
        const sheetPulse = clusteredPulse(
            storm.phaseTime * (storm.reducedMotion ? 0.36 : 0.62),
            storm.seed + 13.1,
            storm.reducedMotion || storm.lightweightMode
        ) * THREE.MathUtils.lerp(0.34, 0.98, eased);
        maybeRefreshLegendaryStormStrikeGeometry?.('escalation', 0.28, 0.54);
        storm.strikeScreenX = THREE.MathUtils.clamp(escalationSkyX, 0.2, 0.8);
        storm.strikeScreenY = THREE.MathUtils.clamp(escalationSkyY, 0.13, 0.4);
        storm.environmentMix = THREE.MathUtils.lerp(0.82, 1, surge);
        storm.darkness = THREE.MathUtils.lerp(0.66, 0.96, surge);
        storm.mist = THREE.MathUtils.lerp(0.26, 0.4, surge);
        storm.flash = clamp01(visiblePulse * 0.18 + sheetPulse * 0.1 + surge * 0.04);
        storm.nightfallProgress = THREE.MathUtils.lerp(storm.lightweightMode ? 0.78 : 0.9, 1, surge);
        storm.overlayOpacity = THREE.MathUtils.lerp(1, 0.92, eased);
        storm.fogOpacity = THREE.MathUtils.lerp(fogOverlayMaxOpacity * 0.86, fogOverlayMaxOpacity, surge);
        storm.lightningMix = clamp01(visiblePulse * 0.6 + sheetPulse * 0.3 + surge * 0.16);
        const occludedEscalationPulse = clusteredPulse(
            storm.phaseTime * (0.26 + occludedLightningRate * 0.12),
            storm.seed + 57.6,
            storm.reducedMotion || storm.lightweightMode
        ) * THREE.MathUtils.lerp(0.26, 1, surge);
        storm.occludedLightning = clamp01(
            occludedEscalationPulse *
            occludedLightningCap *
            occludedLightningMotionGain *
            THREE.MathUtils.lerp(0.72, 1, eased)
        );
        storm.cloudShiftPx =
            storm.totalTime * drift.fast * (0.5 + eased * 0.24) +
            Math.sin(storm.totalTime * 0.86 + storm.seed * 0.7) * (2.8 + surge * 2.8);
        storm.cloudShiftAltPx =
            storm.totalTime * drift.slow * (0.34 + eased * 0.18) +
            Math.cos(storm.totalTime * 0.68 + storm.seed * 0.5) * (3.1 + surge * 3.1);
        storm.boltOpacity = clamp01(visiblePulse * 0.54 + sheetPulse * 0.14 + surge * 0.06);
        storm.cloudFlash = clamp01(visiblePulse * 0.38 + sheetPulse * 0.24 + surge * 0.12);
        storm.cloudSheet = clamp01((sheetPulse * 0.38 + visiblePulse * 0.16 + surge * 0.06) * cloudContrastGain);
        storm.groundGlow = clamp01((visiblePulse * 0.1 + surge * 0.04) * groundSpillGain);
        storm.boltGlowOpacity = clamp01(visiblePulse * 0.72 + sheetPulse * 0.18 + surge * 0.04);
        storm.boltBranchOpacity = clamp01(visiblePulse * 0.42 + sheetPulse * 0.1 + surge * 0.04);
        storm.returnStroke = clamp01((visiblePulse * 0.22 + sheetPulse * 0.08 + surge * 0.04) * returnStrokeGain);
        storm.boltScale = THREE.MathUtils.lerp(1.06, storm.lightweightMode ? 1.42 : 1.62, surge);
        storm.boltHeightScale = THREE.MathUtils.lerp(0.84, 1.12, surge);
        storm.revealEnergy = clamp01(0.22 + visiblePulse * 0.22 + sheetPulse * 0.12 + surge * 0.08);
        storm.vortexEnergy = THREE.MathUtils.lerp(0.4, 1.0, easeInOutQuint(progress));
        storm.godRayIntensity = THREE.MathUtils.lerp(0.02, 0.12, surge) + visiblePulse * 0.06;
        storm.screenShake = clamp01(visiblePulse * 0.04 + sheetPulse * 0.02);
        storm.vignetteStrength = THREE.MathUtils.lerp(0.25, 0.66, surge);
        storm.chromaticAberration = clamp01(visiblePulse * 0.1 + sheetPulse * 0.06 + surge * 0.04);
        constrainLegendaryPreVideoDarkness(storm);
        if (storm.phaseTime >= duration) {
            transitionLegendaryStormPhase?.('transitionStrike');
        }
        return { completed: false };
    }

    if (storm.phase === 'transitionStrike') {
        const duration = timings.transitionStrike;
        const visualTime = storm.videoFrameReady || storm.videoFailed
            ? storm.phaseTime
            : Math.min(storm.phaseTime, duration * 0.8);
        const progress = clamp01(Math.min(visualTime, duration) / duration);
        const eased = easeInOutQuint(progress);
        const fractureLift = easeOutExpo(clamp01((progress - 0.1) / 0.38));
        const leaderStrike = steppedLeaderStrike({
            storm,
            duration,
            leaderCenter: 0.082,
            leaderWidth: 0.068,
            snapCenter: 0.152,
            snapWidth: 0.042,
            echoCenter: 0.268,
            echoWidth: 0.1,
            burstBias: 0.12,
            grainScale: storm.reducedMotion ? 0.8 : 1.16,
            tail: 0.22
        });
        const revealProgress = storm.videoFrameReady
            ? smooth01(clamp01((progress - 0.38) / 0.62))
            : 0;
        const cover = 1 - revealProgress;
        const strikeWhiteout = progress < 0.14
            ? smooth01(progress / 0.14)
            : 1 - smooth01((progress - 0.14) / 0.86);
        storm.strikeScreenX = 0.5 + Math.sin(storm.seed * 1.7) * 0.035;
        storm.strikeScreenY = 0.21;
        storm.environmentMix = THREE.MathUtils.lerp(1, 0.18, eased);
        storm.darkness = THREE.MathUtils.lerp(0.92, 0.14, eased);
        storm.mist = THREE.MathUtils.lerp(0.34, 0.02, easeOutQuint(progress));
        storm.flash = clamp01(leaderStrike.envelope * 1.12 + leaderStrike.returnStroke * 0.42 + strikeWhiteout * 0.2 + cover * 0.2);
        storm.whiteout = clamp01(strikeWhiteout * (lightVariant ? 0.72 : 0.9) + leaderStrike.returnStroke * 0.22 + leaderStrike.afterimage * 0.06);
        storm.nightfallProgress = THREE.MathUtils.lerp(1, 0.06, revealProgress);
        storm.overlayOpacity = THREE.MathUtils.lerp(0.92, 0.64, eased);
        storm.fogOpacity = fogOverlayMaxOpacity * (
            revealProgress < 0.24
                ? 0.92
                : THREE.MathUtils.lerp(0.92, 0, smooth01(clamp01((revealProgress - 0.24) / 0.76)))
        );
        storm.lightningMix = clamp01(leaderStrike.envelope + leaderStrike.returnStroke * 0.34 + storm.whiteout * 0.14 + fractureLift * 0.08);
        const occludedTransitionPulse = clusteredPulse(
            storm.phaseTime * (0.3 + occludedLightningRate * 0.14) + 0.12,
            storm.seed + 63.8,
            storm.reducedMotion || storm.lightweightMode
        );
        const occludedTransitionMask = 1 - smooth01(clamp01((storm.videoOpacity - 0.03) / 0.11));
        storm.occludedLightning = clamp01(
            occludedTransitionPulse *
            occludedLightningCap *
            occludedLightningMotionGain *
            THREE.MathUtils.lerp(0.82, 0.34, revealProgress) *
            occludedTransitionMask
        );
        storm.cloudShiftPx = storm.totalTime * drift.fast * 1.12;
        storm.cloudShiftAltPx = storm.totalTime * drift.slow * 0.9;
        storm.boltOpacity = clamp01(leaderStrike.leader * 1.02 + leaderStrike.returnStroke * 0.52 + leaderStrike.afterimage * 0.08);
        storm.cloudFlash = clamp01(leaderStrike.envelope * 0.78 + strikeWhiteout * 0.36 + leaderStrike.returnStroke * 0.2 + fractureLift * 0.08);
        storm.cloudSheet = clamp01((leaderStrike.returnStroke * 0.72 + leaderStrike.afterimage * 0.24 + fractureLift * 0.08) * cloudContrastGain);
        storm.boltGlowOpacity = clamp01(leaderStrike.envelope + leaderStrike.returnStroke * 0.32 + strikeWhiteout * 0.08);
        storm.boltBranchOpacity = clamp01(leaderStrike.envelope * 0.8 + leaderStrike.returnStroke * 0.14 + fractureLift * 0.04);
        storm.returnStroke = clamp01((leaderStrike.returnStroke + leaderStrike.afterimage * 0.16) * returnStrokeGain);
        storm.boltScale = THREE.MathUtils.lerp(1.18, storm.lightweightMode ? 1.9 : 2.18, clamp01(leaderStrike.envelope * 0.7 + leaderStrike.returnStroke * 0.3));
        storm.boltHeightScale = THREE.MathUtils.lerp(1.02, storm.lightweightMode ? 1.2 : 1.32, clamp01(leaderStrike.envelope * 0.68 + leaderStrike.returnStroke * 0.32));
        storm.revealEnergy = clamp01(0.32 + leaderStrike.envelope * 0.3 + fractureLift * 0.08);
        storm.godRayIntensity = clamp01(fractureLift * 0.18 + leaderStrike.returnStroke * 0.12);
        storm.vortexEnergy = clamp01(1.0 - revealProgress * 0.6);
        storm.vignetteStrength = clamp01(0.6 + leaderStrike.returnStroke * 0.3 - revealProgress * 0.4);
        storm.chromaticAberration = clamp01(leaderStrike.returnStroke * 0.42 + leaderStrike.envelope * 0.18 + strikeWhiteout * 0.12);
        storm.screenShake = clamp01(leaderStrike.returnStroke * 0.46 + strikeWhiteout * 0.22);
        storm.videoOpacity = storm.videoFrameReady ? revealProgress : 0;
        constrainLegendaryPreVideoDarkness(storm);
        if (
            storm.phaseTime >= Math.min(duration * 0.26, 0.24) &&
            !storm.videoStartConfirmed &&
            !storm.videoFailed
        ) {
            maybeRetryLegendaryCutsceneVideoPlaybackStart?.();
        }
        if (storm.videoFailed && storm.phaseTime >= duration * 0.66) {
            transitionLegendaryStormPhase?.('postVideoStormHold');
        } else if (storm.videoFrameReady && storm.phaseTime >= duration) {
            transitionLegendaryStormPhase?.('videoPlayback');
            resetLegendaryStormVisualChannels(storm);
            storm.videoOpacity = 1;
        }
        return { completed: false };
    }

    if (storm.phase === 'videoPlayback') {
        const videoExitLead = storm.videoFailed
            ? 0
            : storm.reducedMotion
                ? 0.1
                : storm.lightweightMode
                    ? 0.12
                    : 0.18;
        storm.occludedLightning = 0;
        storm.videoOpacity = storm.videoFailed ? 0 : 1;
        if (
            storm.videoFailed ||
            storm.videoEnded ||
            videoCurrentTime >= Math.max(0, timings.videoPlayback - videoExitLead) ||
            storm.phaseTime >= Math.max(0, timings.videoPlayback)
        ) {
            transitionLegendaryStormPhase?.('postVideoStormHold');
        }
        return { completed: false };
    }

    if (storm.phase === 'postVideoStormHold') {
        const duration = timings.postVideoStormHold;
        const progress = clamp01(storm.phaseTime / duration);
        const stormReveal = easeInOutQuint(clamp01((progress - 0.08) / 0.92));
        const whiteBridge = 1 - smooth01(clamp01(progress / 0.42));
        const holdLightning = clusteredPulse(
            storm.phaseTime * (storm.reducedMotion ? 0.28 : 0.42),
            storm.seed + 18.4,
            storm.reducedMotion || storm.lightweightMode
        ) * THREE.MathUtils.lerp(0.28, 0.72, stormReveal);
        maybeRefreshLegendaryStormStrikeGeometry?.('persistent', 0.46, 0.88);
        if (storm.videoVisible) {
            stopLegendaryCutsceneVideoPlayback?.();
        }
        storm.strikeScreenX = THREE.MathUtils.clamp(ambientIdleSkyX, 0.24, 0.76);
        storm.strikeScreenY = THREE.MathUtils.clamp(ambientIdleSkyY, 0.16, 0.36);
        storm.environmentMix = THREE.MathUtils.lerp(0.16, 0.46, stormReveal);
        storm.darkness = THREE.MathUtils.lerp(0.04, 0.18, stormReveal);
        storm.mist = THREE.MathUtils.lerp(0.025, Math.max(0.1, lingeringMistFloor + 0.04), stormReveal);
        storm.flash = clamp01(whiteBridge * 0.18 + holdLightning * 0.08);
        storm.whiteout = clamp01(whiteBridge * (lightVariant ? 0.8 : 0.96));
        storm.nightfallProgress = THREE.MathUtils.lerp(0.02, 0.22, stormReveal);
        storm.lightningMix = clamp01(whiteBridge * 0.08 + 0.1 + holdLightning * 0.28 + stormReveal * 0.04);
        storm.occludedLightning = clamp01(
            holdLightning *
            occludedLightningCap *
            occludedLightningPersistenceGain *
            occludedLightningMotionGain
        );
        storm.cloudShiftPx = storm.totalTime * drift.fast * 0.5;
        storm.cloudShiftAltPx = storm.totalTime * drift.slow * 0.36;
        storm.boltOpacity = clamp01(holdLightning * 0.24);
        storm.cloudFlash = clamp01(whiteBridge * 0.3 + 0.06 + holdLightning * 0.22);
        storm.cloudSheet = clamp01((whiteBridge * 0.78 + 0.08 + holdLightning * 0.16) * cloudContrastGain);
        storm.groundGlow = clamp01((holdLightning * 0.16 + stormReveal * 0.06) * groundSpillGain);
        storm.boltGlowOpacity = clamp01(whiteBridge * 0.1 + 0.08 + holdLightning * 0.28);
        storm.boltBranchOpacity = clamp01(holdLightning * 0.18);
        storm.returnStroke = clamp01((holdLightning * 0.1 + stormReveal * 0.04) * returnStrokeGain);
        storm.overlayOpacity = 1;
        storm.fogOpacity = fogOverlayMaxOpacity * THREE.MathUtils.lerp(
            lightVariant ? 0.7 : 0.78,
            lightVariant ? 0.92 : 1,
            stormReveal
        );
        storm.boltScale = THREE.MathUtils.lerp(0.98, 1.16, stormReveal);
        storm.boltHeightScale = THREE.MathUtils.lerp(0.88, 1.04, stormReveal);
        storm.previewBlend = THREE.MathUtils.lerp(0.16, previewStormBlend * 0.74, stormReveal);
        storm.revealEnergy = clamp01(0.32 + stormReveal * 0.14 + holdLightning * 0.26);
        storm.godRayIntensity = THREE.MathUtils.lerp(0.1, 0.44, stormReveal) + holdLightning * 0.1;
        storm.vignetteStrength = THREE.MathUtils.lerp(0.34, 0.18, stormReveal);
        storm.chromaticAberration = clamp01(holdLightning * 0.08);
        if (storm.phaseTime >= duration) {
            transitionLegendaryStormPhase?.('targetedImpact');
        }
        return { completed: false };
    }

    if (storm.phase === 'targetedImpact') {
        const duration = timings.targetedImpact;
        const progress = clamp01(storm.phaseTime / duration);
        const eased = easeInOutQuint(progress);
        const impactMoment = Math.max(0.1, duration * (storm.reducedMotion ? 0.18 : 0.22));
        const detonationWindow = Math.max(0.28, duration * (storm.reducedMotion ? 0.58 : 0.72));
        const leaderStrike = steppedLeaderStrike({
            storm,
            duration,
            leaderCenter: 0.078,
            leaderWidth: 0.068,
            snapCenter: 0.146,
            snapWidth: 0.046,
            echoCenter: 0.274,
            echoWidth: 0.128,
            burstBias: 0.72,
            grainScale: storm.reducedMotion ? 0.86 : 1.42,
            tail: 0.26
        });
        if (!storm.landingImpactTriggered && storm.phaseTime >= impactMoment) {
            storm.landingImpactTriggered = true;
            spawnLegendaryStormLandingBoxIfNeeded?.({
                playLandingSfx: !storm.videoFailed,
                legendaryImpact: true,
                requestFlightReturn: false
            });
            startLegendaryLandingImpactFeedback?.(
                storm.reducedMotion ? 0.38 : storm.lightweightMode ? 0.78 : 1.08
            );
        }
        const impactElapsed = Math.max(0, storm.phaseTime - impactMoment);
        const detonationProgress = clamp01(impactElapsed / detonationWindow);
        const detonationAttack = easeOutQuint(clamp01(detonationProgress / 0.16));
        const detonationDecay = 1 - smooth01(clamp01((detonationProgress - 0.08) / 0.92));
        const detonationCore = storm.landingImpactTriggered
            ? clamp01(detonationAttack * detonationDecay)
            : 0;
        const detonationBurst = storm.landingImpactTriggered
            ? clusteredPulse(
                storm.phaseTime * (storm.reducedMotion ? 0.74 : storm.lightweightMode ? 0.94 : 1.18) + 0.14,
                storm.seed + 27.2,
                storm.reducedMotion || storm.lightweightMode
            )
            : 0;
        const impactAfterglow = storm.landingImpactTriggered
            ? clamp01(1 - impactElapsed / Math.max(0.14, duration * 0.82))
            : 0;
        const detonationSurge = easeOutQuint(detonationProgress);
        const detonationWhiteout = progress < 0.12
            ? smooth01(progress / 0.12)
            : 1 - smooth01((progress - 0.12) / 0.88);
        const impactEnvelope = clamp01(
            leaderStrike.envelope * 0.72 +
            leaderStrike.returnStroke * 0.32 +
            impactAfterglow * 1 +
            detonationCore * 1.28 +
            detonationBurst * 0.28
        );
        const explosionEnvelope = clamp01(detonationCore * 1.46 + impactAfterglow * 0.62 + detonationBurst * 0.16);
        storm.environmentMix = THREE.MathUtils.lerp(0.4, 0.3, eased);
        storm.darkness = THREE.MathUtils.lerp(0.14, 0.08, eased);
        storm.mist = THREE.MathUtils.lerp(Math.max(0.08, lingeringMistFloor + 0.02), Math.max(0.06, lingeringMistFloor), eased);
        storm.flash = clamp01(impactEnvelope * 1.08 + detonationWhiteout * 0.16 + explosionEnvelope * 0.4);
        storm.whiteout = clamp01(
            detonationWhiteout * (lightVariant ? 0.64 : 0.84) +
            detonationCore * (lightVariant ? 0.58 : 0.88) +
            impactAfterglow * 0.18 +
            detonationBurst * 0.08
        );
        storm.nightfallProgress = THREE.MathUtils.lerp(0.18, 0.12, eased);
        storm.lightningMix = clamp01(impactEnvelope + storm.whiteout * 0.14 + explosionEnvelope * 0.32 + detonationSurge * 0.06);
        storm.occludedLightning = clamp01(
            (leaderStrike.afterimage * 0.22 + detonationBurst * 0.16 + impactAfterglow * 0.1) *
            occludedLightningCap *
            occludedLightningPersistenceGain *
            occludedLightningMotionGain
        );
        storm.boltOpacity = clamp01(leaderStrike.leader * 0.9 + impactEnvelope * 0.92 + leaderStrike.afterimage * 0.08);
        storm.cloudFlash = clamp01(impactEnvelope * 0.92 + storm.whiteout * 0.22 + detonationCore * 0.46);
        storm.cloudSheet = clamp01((leaderStrike.returnStroke * 0.96 + detonationCore * 0.56 + impactAfterglow * 0.3 + detonationBurst * 0.18 + detonationSurge * 0.08) * cloudContrastGain);
        storm.groundGlow = clamp01((impactEnvelope * 0.82 + detonationCore * 0.98 + impactAfterglow * 0.42) * groundSpillGain);
        storm.impactCore = clamp01((detonationCore * 1.42 + detonationBurst * 0.28) * (lightVariant ? 0.94 : 1.08));
        storm.impactBloom = clamp01((explosionEnvelope * 1.46 + detonationBurst * 0.34 + impactAfterglow * 0.28) * impactBloomGain * (lightVariant ? 0.88 : 1.04));
        storm.impactRing = clamp01(Math.sin(detonationProgress * Math.PI) * (0.88 + detonationCore * 0.96 + detonationBurst * 0.24));
        storm.impactRadius = THREE.MathUtils.lerp(0.12, storm.lightweightMode ? 1.34 : 1.94, detonationProgress);
        storm.boltGlowOpacity = clamp01(impactEnvelope + storm.impactBloom * 0.18);
        storm.boltBranchOpacity = clamp01(impactEnvelope * 0.96 + leaderStrike.returnStroke * 0.18 + detonationBurst * 0.08);
        storm.returnStroke = clamp01((leaderStrike.returnStroke * 1.14 + detonationCore * 0.18 + leaderStrike.afterimage * 0.16) * returnStrokeGain);
        storm.overlayOpacity = 1;
        storm.fogOpacity = fogOverlayMaxOpacity * clamp01(
            (lightVariant ? 0.78 : 0.9) -
            eased * (lightVariant ? 0.12 : 0.16) +
            detonationCore * 0.08 +
            impactAfterglow * 0.06
        );
        storm.boltScale = THREE.MathUtils.lerp(
            1.46,
            storm.lightweightMode ? 2.64 : 3.28,
            clamp01(impactEnvelope * 0.68 + leaderStrike.returnStroke * 0.26 + detonationCore * 0.5)
        );
        storm.boltHeightScale = THREE.MathUtils.lerp(
            1.12,
            storm.lightweightMode ? 1.34 : 1.52,
            clamp01(impactEnvelope * 0.72 + leaderStrike.returnStroke * 0.18 + detonationCore * 0.36)
        );
        storm.cloudShiftPx = storm.totalTime * drift.fast * 0.44;
        storm.cloudShiftAltPx = storm.totalTime * drift.slow * 0.32;
        storm.previewBlend = THREE.MathUtils.lerp(previewStormBlend * 0.34, previewStormBlend * 0.58, detonationProgress);
        storm.revealEnergy = clamp01(explosionEnvelope * 1.04 + impactAfterglow * 0.62 + detonationSurge * 0.08);
        storm.godRayIntensity = clamp01(detonationCore * 1.28 + impactAfterglow * 0.62 + detonationBurst * 0.22);
        storm.chromaticAberration = clamp01(detonationCore * 0.62 + leaderStrike.returnStroke * 0.28 + detonationBurst * 0.14);
        storm.screenShake = clamp01(detonationCore * 0.94 + detonationBurst * 0.28 + impactAfterglow * 0.16);
        storm.vignetteStrength = clamp01(0.52 + detonationCore * 0.42 + detonationBurst * 0.14);
        if (storm.phaseTime >= duration) {
            transitionLegendaryStormPhase?.('boxMaterialize');
        }
        return { completed: false };
    }

    if (storm.phase === 'boxMaterialize') {
        const duration = timings.boxMaterialize;
        const progress = clamp01(storm.phaseTime / duration);
        const eased = easeInOutQuint(progress);
        const settlePulse = clusteredPulse(
            storm.phaseTime * (storm.reducedMotion ? 0.24 : 0.38),
            storm.seed + 32.6,
            storm.reducedMotion || storm.lightweightMode
        ) * (1 - eased);
        if (!storm.boxPrepared) {
            spawnLegendaryStormLandingBoxIfNeeded?.({
                playLandingSfx: false,
                legendaryImpact: true,
                requestFlightReturn: false
            });
        }
        maybeRefreshLegendaryStormStrikeGeometry?.('persistent', 0.56, 0.96);
        storm.strikeScreenX = THREE.MathUtils.clamp(ambientIdleSkyX, 0.24, 0.76);
        storm.strikeScreenY = THREE.MathUtils.clamp(ambientIdleSkyY, 0.16, 0.36);
        storm.environmentMix = THREE.MathUtils.lerp(0.48, 0.22, eased);
        storm.darkness = THREE.MathUtils.lerp(lightVariant ? 0.1 : 0.18, lightVariant ? 0.03 : 0.06, eased);
        storm.mist = THREE.MathUtils.lerp(Math.max(lingeringMistFloor, 0.1), Math.max(lingeringMistFloor, 0.05), eased);
        storm.flash = clamp01(settlePulse * 0.08 + (1 - eased) * 0.05);
        storm.whiteout = clamp01((1 - eased) * (lightVariant ? 0.06 : 0.08));
        storm.nightfallProgress = THREE.MathUtils.lerp(0.3, 0.12, eased);
        storm.lightningMix = clamp01(0.14 + settlePulse * 0.24);
        storm.occludedLightning = clamp01(
            settlePulse *
            occludedLightningCap *
            occludedLightningPersistenceGain *
            occludedLightningMotionGain
        );
        storm.cloudShiftPx = storm.totalTime * drift.fast * 0.36;
        storm.cloudShiftAltPx = storm.totalTime * drift.slow * 0.26;
        storm.boltOpacity = clamp01(0.12 + settlePulse * 0.18);
        storm.cloudFlash = clamp01(0.1 + settlePulse * 0.16);
        storm.cloudSheet = clamp01((0.08 + settlePulse * 0.12) * cloudContrastGain);
        storm.groundGlow = THREE.MathUtils.lerp(lingeringGroundGlow * 1.68, lingeringGroundGlow * 1.08, eased);
        storm.impactBloom = THREE.MathUtils.lerp(0.64 * impactBloomGain, 0.28 * impactBloomGain, eased);
        storm.impactCore = THREE.MathUtils.lerp(0.28, 0.12, eased);
        storm.impactRing = THREE.MathUtils.lerp(0.16, 0, eased);
        storm.impactRadius = THREE.MathUtils.lerp(0.62, 0.3, eased);
        storm.boltGlowOpacity = clamp01(0.16 + settlePulse * 0.2);
        storm.boltBranchOpacity = clamp01(0.1 + settlePulse * 0.14);
        storm.returnStroke = clamp01((0.06 + settlePulse * 0.12) * returnStrokeGain);
        storm.overlayOpacity = 1;
        storm.fogOpacity = fogOverlayMaxOpacity * THREE.MathUtils.lerp(
            lightVariant ? 0.76 : 0.88,
            lightVariant ? 0.64 : 0.72,
            eased
        );
        storm.boltScale = THREE.MathUtils.lerp(1.12, 0.98, eased);
        storm.boltHeightScale = THREE.MathUtils.lerp(1.04, 0.94, eased);
        storm.previewBlend = THREE.MathUtils.lerp(previewStormBlend * 0.6, previewStormBlend * 0.9, eased);
        storm.revealEnergy = clamp01(0.78 - eased * 0.12 + settlePulse * 0.18);
        storm.godRayIntensity = THREE.MathUtils.lerp(0.42, 0.22, eased) + settlePulse * 0.1;
        storm.vignetteStrength = THREE.MathUtils.lerp(0.4, 0.18, eased);
        storm.chromaticAberration = clamp01(settlePulse * 0.04);
        if (storm.phaseTime >= duration) {
            requestMysteryFlightReturn?.();
            transitionLegendaryStormPhase?.('idleStormReveal');
        }
        return { completed: false };
    }

    if (storm.phase === 'idleStormReveal') {
        const ambientLightning = clusteredPulse(
            storm.phaseTime * (storm.reducedMotion ? 0.14 : 0.22),
            storm.seed + 36.8,
            storm.reducedMotion || storm.lightweightMode
        ) * 0.72;
        const ambientSheet = clusteredPulse(
            storm.phaseTime * (storm.reducedMotion ? 0.1 : 0.16),
            storm.seed + 39.6,
            storm.reducedMotion || storm.lightweightMode
        ) * 0.44;
        maybeRefreshLegendaryStormStrikeGeometry?.('persistent', 0.64, 1.16);
        storm.strikeScreenX = THREE.MathUtils.clamp(ambientIdleSkyX, 0.24, 0.76);
        storm.strikeScreenY = THREE.MathUtils.clamp(ambientIdleSkyY, 0.16, 0.36);
        storm.environmentMix = lightVariant ? 0.24 : 0.26;
        storm.darkness = lightVariant ? 0.035 : 0.07;
        storm.mist = Math.max(lingeringMistFloor, 0.04) + ambientLightning * 0.024 + ambientSheet * 0.014;
        storm.flash = ambientLightning * 0.034 + ambientSheet * 0.016;
        storm.whiteout = lightVariant ? ambientLightning * 0.018 : 0;
        storm.nightfallProgress = lightVariant ? 0.06 : 0.1;
        storm.lightningMix = clamp01(0.1 + ambientLightning * 0.26 + ambientSheet * 0.08);
        storm.occludedLightning = clamp01(
            ambientLightning *
            occludedLightningCap *
            occludedLightningPersistenceGain *
            occludedLightningMotionGain
        );
        storm.cloudShiftPx = storm.totalTime * drift.fast * 0.3;
        storm.cloudShiftAltPx = storm.totalTime * drift.slow * 0.2;
        storm.boltOpacity = clamp01(0.06 + ambientLightning * 0.18);
        storm.cloudFlash = clamp01(0.08 + ambientLightning * 0.16 + ambientSheet * 0.06);
        storm.cloudSheet = clamp01((0.06 + ambientLightning * 0.1 + ambientSheet * 0.12) * cloudContrastGain);
        storm.groundGlow = clamp01(lingeringGroundGlow + ambientLightning * 0.18 + ambientSheet * 0.08);
        storm.impactBloom = clamp01((lingeringGroundGlow * 0.92 + ambientLightning * 0.18) * impactBloomGain);
        storm.impactCore = clamp01(lingeringGroundGlow * 0.48 + ambientLightning * 0.08);
        storm.impactRing = 0;
        storm.impactRadius = 0.26 + ambientLightning * 0.12;
        storm.boltGlowOpacity = clamp01(0.12 + ambientLightning * 0.18);
        storm.boltBranchOpacity = clamp01(0.08 + ambientLightning * 0.12);
        storm.returnStroke = clamp01(ambientLightning * 0.1 * returnStrokeGain);
        storm.overlayOpacity = lightVariant ? 0.5 : 0.62;
        storm.fogOpacity = fogOverlayMaxOpacity * clamp01(
            (lightVariant ? 0.68 : 0.8) +
            ambientLightning * 0.12 +
            ambientSheet * 0.08
        );
        storm.boltScale = 1;
        storm.boltHeightScale = 0.94;
        storm.previewBlend = previewStormBlend * 1.04;
        storm.revealEnergy = clamp01(0.56 + ambientLightning * 0.28 + ambientSheet * 0.14);
        storm.godRayIntensity = clamp01(0.18 + ambientLightning * 0.12 + ambientSheet * 0.08);
        storm.vignetteStrength = lightVariant ? 0.1 : 0.16;
        if (storm.dissipateRequested) {
            transitionLegendaryStormPhase?.('stormDissipate');
        }
        return { completed: false };
    }

    if (storm.phase === 'stormDissipate') {
        const duration = timings.stormDissipate;
        const progress = clamp01(storm.phaseTime / duration);
        const eased = smooth01(progress);
        const ambientLightning = clusteredPulse(
            storm.phaseTime * (storm.reducedMotion ? 0.12 : 0.18),
            storm.seed + 41.2,
            storm.reducedMotion || storm.lightweightMode
        ) * (1 - eased);
        maybeRefreshLegendaryStormStrikeGeometry?.('persistent', 0.84, 1.38);
        storm.strikeScreenX = THREE.MathUtils.clamp(ambientIdleSkyX, 0.24, 0.76);
        storm.strikeScreenY = THREE.MathUtils.clamp(ambientIdleSkyY, 0.16, 0.36);
        storm.environmentMix = THREE.MathUtils.lerp(lightVariant ? 0.24 : 0.26, 0, eased);
        storm.darkness = THREE.MathUtils.lerp(lightVariant ? 0.035 : 0.07, 0, eased);
        storm.mist = THREE.MathUtils.lerp(Math.max(lingeringMistFloor, 0.04), 0, eased);
        storm.flash = ambientLightning * 0.024;
        storm.whiteout = 0;
        storm.nightfallProgress = THREE.MathUtils.lerp(lightVariant ? 0.06 : 0.1, 0, eased);
        storm.lightningMix = clamp01(0.08 * (1 - eased) + ambientLightning * 0.18);
        storm.occludedLightning = clamp01(
            ambientLightning *
            occludedLightningCap *
            occludedLightningPersistenceGain *
            occludedLightningMotionGain *
            (1 - eased)
        );
        storm.cloudShiftPx = THREE.MathUtils.lerp(storm.totalTime * drift.fast * 0.24, 0, eased);
        storm.cloudShiftAltPx = THREE.MathUtils.lerp(storm.totalTime * drift.slow * 0.18, 0, eased);
        storm.boltOpacity = clamp01((0.06 + ambientLightning * 0.16) * (1 - eased));
        storm.cloudFlash = clamp01((0.08 + ambientLightning * 0.14) * (1 - eased));
        storm.cloudSheet = clamp01((0.06 + ambientLightning * 0.1) * (1 - eased));
        storm.groundGlow = THREE.MathUtils.lerp(lingeringGroundGlow, 0, eased);
        storm.impactBloom = THREE.MathUtils.lerp(0.22 * impactBloomGain, 0, eased);
        storm.impactCore = THREE.MathUtils.lerp(0.1, 0, eased);
        storm.impactRing = 0;
        storm.impactRadius = THREE.MathUtils.lerp(0.24, 0, eased);
        storm.boltGlowOpacity = clamp01((0.12 + ambientLightning * 0.14) * (1 - eased));
        storm.boltBranchOpacity = clamp01((0.08 + ambientLightning * 0.08) * (1 - eased));
        storm.returnStroke = clamp01(ambientLightning * 0.06 * returnStrokeGain);
        storm.overlayOpacity = THREE.MathUtils.lerp(lightVariant ? 0.56 : 0.66, 0, eased);
        storm.fogOpacity = fogOverlayMaxOpacity * THREE.MathUtils.lerp(
            lightVariant ? 0.68 : 0.8,
            0,
            eased
        );
        storm.boltScale = THREE.MathUtils.lerp(1, 0.92, eased);
        storm.boltHeightScale = THREE.MathUtils.lerp(0.94, 0.86, eased);
        storm.previewBlend = THREE.MathUtils.lerp(previewStormBlend, 0, eased);
        storm.revealEnergy = THREE.MathUtils.lerp(0.42, 0, eased);
        storm.godRayIntensity = THREE.MathUtils.lerp(0.1, 0, eased);
        storm.vignetteStrength = THREE.MathUtils.lerp(lightVariant ? 0.12 : 0.18, 0, eased);
        if (storm.phaseTime >= duration) {
            onStormCompleted?.();
            return { completed: true };
        }
        return { completed: false };
    }

    return { completed: false };
}
