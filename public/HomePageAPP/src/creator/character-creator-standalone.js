(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // public/HomePageAPP/src/runtime/xio-character.js
  var xio_character_exports = {};
  __export(xio_character_exports, {
    XIO_DEFAULT_SVG_DATA: () => XIO_DEFAULT_SVG_DATA,
    XIO_EYE_APPEARANCE_PRESETS: () => XIO_EYE_APPEARANCE_PRESETS,
    XIO_MATERIAL_PRESETS: () => XIO_MATERIAL_PRESETS,
    XIO_SLOT_DEFINITIONS: () => XIO_SLOT_DEFINITIONS,
    createXioCharacter: () => createXioCharacter
  });
  function createSoftHaloSprite(THREE, { size = 10, inner = "rgba(75, 225, 255, 0.42)", mid = "rgba(65, 180, 255, 0.2)", outer = "rgba(20, 90, 180, 0)" } = {}) {
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = 512;
    glowCanvas.height = 512;
    const ctx = glowCanvas.getContext("2d");
    const gradient = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.45, mid);
    gradient.addColorStop(1, outer);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    const texture = new THREE.CanvasTexture(glowCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size, size, 1);
    return sprite;
  }
  function createWingMesh(THREE, SVGLoader, pathString, layerName, scale) {
    const loader = new SVGLoader();
    const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="${pathString}" /></svg>`;
    const data = loader.parse(svgMarkup);
    const shapePath = data.paths[0];
    const shapes = shapePath.toShapes(true);
    const geometry = new THREE.ExtrudeGeometry(shapes, {
      steps: 2,
      depth: 1.2,
      bevelEnabled: true,
      bevelThickness: 0.22,
      bevelSize: 0.25,
      bevelSegments: 4,
      curveSegments: 24
    });
    geometry.translate(layerName === "right" ? -110 : -90, -90, 0);
    geometry.rotateX(Math.PI);
    const mesh = new THREE.Mesh(geometry, [
      new THREE.MeshPhysicalMaterial({
        color: 7536639,
        emissive: 1298431,
        emissiveIntensity: 0.28,
        transmission: 0.7,
        opacity: 0.34,
        transparent: true,
        roughness: 0.5,
        metalness: 0,
        side: THREE.DoubleSide
      }),
      new THREE.MeshStandardMaterial({
        color: 5044223,
        emissive: 5044223,
        emissiveIntensity: 1.8,
        roughness: 0.5,
        metalness: 0
      })
    ]);
    mesh.scale.set(scale, scale, scale);
    return mesh;
  }
  function createXioCharacter({
    THREE,
    SVGLoader,
    scene,
    svgData = XIO_DEFAULT_SVG_DATA,
    scale = 0.1,
    baseCreatureScale = 0.45
  }) {
    const stuntRig = new THREE.Group();
    scene.add(stuntRig);
    const creatureGroup = new THREE.Group();
    creatureGroup.scale.setScalar(baseCreatureScale);
    stuntRig.add(creatureGroup);
    const materialBody = new THREE.MeshPhysicalMaterial({
      color: 4926120,
      emissive: 1245227,
      emissiveIntensity: 0.45,
      roughness: 0.42,
      metalness: 0.03,
      clearcoat: 0.32,
      clearcoatRoughness: 0.62,
      reflectivity: 0.18
    });
    const bodyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(svgData.body.r * scale, 64, 64),
      materialBody
    );
    bodyMesh.userData.previewRole = "body";
    creatureGroup.add(bodyMesh);
    const haloCore = createSoftHaloSprite(THREE, {
      size: 11,
      inner: "rgba(90, 236, 255, 0.42)",
      mid: "rgba(60, 176, 255, 0.2)",
      outer: "rgba(14, 70, 170, 0.0)"
    });
    haloCore.position.set(0, 0.2, -2);
    creatureGroup.add(haloCore);
    const haloWide = createSoftHaloSprite(THREE, {
      size: 16,
      inner: "rgba(52, 160, 255, 0.12)",
      mid: "rgba(32, 118, 230, 0.08)",
      outer: "rgba(8, 44, 130, 0.0)"
    });
    haloWide.position.set(0, 0.15, -2.4);
    creatureGroup.add(haloWide);
    const leftWingGroup = new THREE.Group();
    leftWingGroup.position.set(-1.05, 0.95, -0.1);
    leftWingGroup.userData.basePosition = leftWingGroup.position.clone();
    creatureGroup.add(leftWingGroup);
    const rightWingGroup = new THREE.Group();
    rightWingGroup.position.set(1.05, 0.95, -0.1);
    rightWingGroup.userData.basePosition = rightWingGroup.position.clone();
    creatureGroup.add(rightWingGroup);
    const leftWingBaseMesh = createWingMesh(THREE, SVGLoader, svgData.wingLeft, "left", scale);
    leftWingBaseMesh.userData.previewWingBase = "left";
    leftWingGroup.add(leftWingBaseMesh);
    const rightWingBaseMesh = createWingMesh(THREE, SVGLoader, svgData.wingRight, "right", scale);
    rightWingBaseMesh.userData.previewWingBase = "right";
    rightWingGroup.add(rightWingBaseMesh);
    const leftEye = new ReferenceEye(THREE, scale);
    leftEye.group.userData.previewEyeSide = "left";
    const leftEyeGroup = new THREE.Group();
    leftEyeGroup.position.set(-0.82, 0.33, 2.36);
    leftEyeGroup.rotation.y = 0.07;
    leftEyeGroup.add(leftEye.group);
    creatureGroup.add(leftEyeGroup);
    const rightEye = new ReferenceEye(THREE, scale);
    rightEye.group.userData.previewEyeSide = "right";
    const rightEyeGroup = new THREE.Group();
    rightEyeGroup.position.set(0.82, 0.33, 2.36);
    rightEyeGroup.rotation.y = -0.07;
    rightEyeGroup.add(rightEye.group);
    creatureGroup.add(rightEyeGroup);
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.34, 2.48);
    creatureGroup.add(mouthGroup);
    const mouthDark = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 30, 20, 0, Math.PI * 2, 0.22, Math.PI * 0.42),
      new THREE.MeshStandardMaterial({
        color: 853776,
        roughness: 0.74,
        metalness: 0.02
      })
    );
    mouthDark.scale.set(1.18, 0.48, 0.22);
    mouthDark.rotation.x = -0.12;
    mouthGroup.add(mouthDark);
    const lipRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.024, 12, 46, Math.PI),
      new THREE.MeshPhysicalMaterial({
        color: 4140642,
        emissive: 1773624,
        emissiveIntensity: 0.26,
        roughness: 0.38,
        metalness: 0.14,
        clearcoat: 0.42,
        clearcoatRoughness: 0.22
      })
    );
    lipRim.rotation.set(Math.PI * 0.96, 0, Math.PI);
    lipRim.position.set(0, 0.02, 0.035);
    mouthGroup.add(lipRim);
    const mouthGlow = new THREE.Mesh(
      new THREE.CircleGeometry(0.15, 28),
      new THREE.MeshBasicMaterial({
        color: 10116863,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      })
    );
    mouthGlow.position.set(0, 0, 0.05);
    mouthGroup.add(mouthGlow);
    const propsRig = new THREE.Group();
    creatureGroup.add(propsRig);
    const slotAnchors = {};
    Object.values(XIO_SLOT_DEFINITIONS).forEach((slotDefinition) => {
      if (slotDefinition.mode === "paired") {
        slotAnchors[slotDefinition.key] = {
          left: leftWingGroup,
          right: rightWingGroup,
          baseLeft: leftWingBaseMesh,
          baseRight: rightWingBaseMesh
        };
        return;
      }
      if (slotDefinition.mode === "appearance") {
        slotAnchors[slotDefinition.key] = { anchor: null };
        return;
      }
      const anchor = new THREE.Group();
      const position = slotDefinition.position || [0, 0, 0];
      const rotation = slotDefinition.rotation || [0, 0, 0];
      anchor.position.set(position[0], position[1], position[2]);
      anchor.rotation.set(rotation[0], rotation[1], rotation[2]);
      propsRig.add(anchor);
      slotAnchors[slotDefinition.key] = { anchor };
    });
    const applyEyeAppearancePreset = (presetKey = "default") => {
      const preset = XIO_EYE_APPEARANCE_PRESETS[presetKey] || XIO_EYE_APPEARANCE_PRESETS.default;
      leftEye.setAppearance(preset);
      rightEye.setAppearance(preset);
    };
    const applyMaterialPreset = (presetKey = "default") => {
      const preset = XIO_MATERIAL_PRESETS[presetKey] || XIO_MATERIAL_PRESETS.default;
      materialBody.color.setHex(preset.color);
      materialBody.emissive.setHex(preset.emissive);
      materialBody.emissiveIntensity = preset.emissiveIntensity;
      materialBody.roughness = preset.roughness;
      materialBody.metalness = preset.metalness;
      materialBody.clearcoat = preset.clearcoat;
      materialBody.clearcoatRoughness = preset.clearcoatRoughness;
    };
    const resetAppearance = () => {
      applyEyeAppearancePreset("default");
      applyMaterialPreset("default");
      leftWingBaseMesh.visible = true;
      rightWingBaseMesh.visible = true;
    };
    resetAppearance();
    return {
      stuntRig,
      creatureGroup,
      materialBody,
      bodyMesh,
      leftWingGroup,
      rightWingGroup,
      leftWingBaseMesh,
      rightWingBaseMesh,
      leftEye,
      rightEye,
      leftEyeGroup,
      rightEyeGroup,
      mouthGroup,
      propsRig,
      slotAnchors,
      resetAppearance,
      applyEyeAppearancePreset,
      applyMaterialPreset
    };
  }
  var XIO_DEFAULT_SVG_DATA, XIO_EYE_APPEARANCE_PRESETS, XIO_MATERIAL_PRESETS, XIO_SLOT_DEFINITIONS, ReferenceEye;
  var init_xio_character = __esm({
    "public/HomePageAPP/src/runtime/xio-character.js"() {
      XIO_DEFAULT_SVG_DATA = Object.freeze({
        viewBox: { x: 0, y: 0, w: 200, h: 200 },
        body: { cx: 100, cy: 100, r: 28 },
        wingRight: "M110,90 Q170,40 200,70 Q160,120 115,100",
        wingLeft: "M90,90 Q30,40 0,70 Q40,120 85,100"
      });
      XIO_EYE_APPEARANCE_PRESETS = Object.freeze({
        default: Object.freeze({
          scleraColor: 16777215,
          irisColor: 2771652,
          irisMap: null,
          irisEmissive: 0,
          irisEmissiveIntensity: 0,
          pupilColor: 0,
          pupilScaleX: 1,
          pupilScaleY: 1,
          pupilOffsetX: 0,
          pupilOffsetY: 0,
          secondaryShineColor: 11193599,
          secondaryShineOpacity: 0.6,
          shineOpacity: 1
        }),
        sunrise: Object.freeze({
          scleraColor: 16776177,
          irisColor: 16744031,
          irisMap: null,
          irisEmissive: 2754816,
          irisEmissiveIntensity: 0.18,
          pupilColor: 1968907,
          pupilScaleX: 0.86,
          pupilScaleY: 1.14,
          pupilOffsetX: 0,
          pupilOffsetY: 0.01,
          secondaryShineColor: 16765352,
          secondaryShineOpacity: 0.74,
          shineOpacity: 1
        }),
        moonlit: Object.freeze({
          scleraColor: 16251903,
          irisColor: 7521535,
          irisMap: null,
          irisEmissive: 666200,
          irisEmissiveIntensity: 0.32,
          pupilColor: 329485,
          pupilScaleX: 0.92,
          pupilScaleY: 0.92,
          pupilOffsetX: 0,
          pupilOffsetY: 0,
          secondaryShineColor: 14217471,
          secondaryShineOpacity: 0.9,
          shineOpacity: 1
        }),
        ember: Object.freeze({
          scleraColor: 16774378,
          irisColor: 16733986,
          irisMap: null,
          irisEmissive: 6689024,
          irisEmissiveIntensity: 0.38,
          pupilColor: 590336,
          pupilScaleX: 0.84,
          pupilScaleY: 1.18,
          pupilOffsetX: 0,
          pupilOffsetY: 0.02,
          secondaryShineColor: 16764804,
          secondaryShineOpacity: 0.78,
          shineOpacity: 0.92
        }),
        mint: Object.freeze({
          scleraColor: 16252921,
          irisColor: 5235122,
          irisMap: null,
          irisEmissive: 212010,
          irisEmissiveIntensity: 0.28,
          pupilColor: 266768,
          pupilScaleX: 0.94,
          pupilScaleY: 1.02,
          pupilOffsetX: 0,
          pupilOffsetY: 0,
          secondaryShineColor: 11466724,
          secondaryShineOpacity: 0.72,
          shineOpacity: 1
        })
      });
      XIO_MATERIAL_PRESETS = Object.freeze({
        default: Object.freeze({
          color: 4926120,
          emissive: 1245227,
          emissiveIntensity: 0.45,
          roughness: 0.42,
          metalness: 0.03,
          clearcoat: 0.32,
          clearcoatRoughness: 0.62
        }),
        starlight: Object.freeze({
          color: 5914352,
          emissive: 1838415,
          emissiveIntensity: 0.54,
          roughness: 0.38,
          metalness: 0.06,
          clearcoat: 0.4,
          clearcoatRoughness: 0.48
        }),
        aurora: Object.freeze({
          color: 2536396,
          emissive: 276557,
          emissiveIntensity: 0.42,
          roughness: 0.46,
          metalness: 0.05,
          clearcoat: 0.36,
          clearcoatRoughness: 0.52
        }),
        ember: Object.freeze({
          color: 11749151,
          emissive: 4198400,
          emissiveIntensity: 0.4,
          roughness: 0.48,
          metalness: 0.03,
          clearcoat: 0.28,
          clearcoatRoughness: 0.6
        })
      });
      XIO_SLOT_DEFINITIONS = Object.freeze({
        wingSet: Object.freeze({ key: "wingSet", label: "Wing Set", mode: "paired" }),
        headWear: Object.freeze({ key: "headWear", label: "Headwear", mode: "single", position: [0, 1.5, 1.65] }),
        faceAccessory: Object.freeze({ key: "faceAccessory", label: "Face Accessory", mode: "single", position: [0, 0.32, 2.7] }),
        eyeStyle: Object.freeze({ key: "eyeStyle", label: "Eye Style", mode: "appearance", position: [0, 0.34, 2.58] }),
        bodyAccessory: Object.freeze({ key: "bodyAccessory", label: "Body Gear", mode: "single", position: [0, 0.2, 2.05] }),
        heldProp: Object.freeze({ key: "heldProp", label: "Held Prop", mode: "single", position: [1.5, -0.55, 1.85], rotation: [0.28, -0.6, -0.16] })
      });
      ReferenceEye = class {
        constructor(THREE, scale) {
          this.THREE = THREE;
          this.group = new THREE.Group();
          this.look = new THREE.Vector2(0, 0);
          const sclera = new THREE.Mesh(
            new THREE.SphereGeometry(7.2 * scale, 42, 42),
            new THREE.MeshPhysicalMaterial({
              color: 16777215,
              roughness: 0.45,
              metalness: 0,
              clearcoat: 0.18,
              clearcoatRoughness: 0.75
            })
          );
          sclera.scale.set(1, 1.04, 0.86);
          sclera.userData.previewEyePart = "sclera";
          this.group.add(sclera);
          this.scleraMat = sclera.material;
          this.irisRig = new THREE.Group();
          this.irisRig.position.z = 0.74;
          this.group.add(this.irisRig);
          this.irisMat = new THREE.MeshStandardMaterial({
            color: 2771652,
            emissive: 0,
            emissiveIntensity: 0,
            roughness: 0.6,
            metalness: 0
          });
          this.iris = new THREE.Mesh(new THREE.CircleGeometry(0.38, 48), this.irisMat);
          this.iris.userData.previewEyePart = "iris";
          this.irisRig.add(this.iris);
          this.pupilMat = new THREE.MeshBasicMaterial({ color: 0 });
          this.pupil = new THREE.Mesh(new THREE.CircleGeometry(0.23, 44), this.pupilMat);
          this.pupil.userData.previewEyePart = "pupil";
          this.pupil.position.z = 5e-3;
          this.irisRig.add(this.pupil);
          this.shineMat = new THREE.MeshBasicMaterial({ color: 16777215, transparent: true, opacity: 1 });
          const shine = new THREE.Mesh(new THREE.CircleGeometry(0.09, 24), this.shineMat);
          shine.userData.previewEyePart = "shine";
          shine.position.set(-0.14, 0.14, 0.01);
          this.irisRig.add(shine);
          this.shine2Mat = new THREE.MeshBasicMaterial({ color: 11193599, transparent: true, opacity: 0.6 });
          const shine2 = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), this.shine2Mat);
          shine2.userData.previewEyePart = "shine2";
          shine2.position.set(0.12, -0.12, 0.01);
          this.irisRig.add(shine2);
        }
        setAppearance(style = {}) {
          var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
          this.scleraMat.color.setHex((_a = style.scleraColor) != null ? _a : 16777215);
          this.irisMat.color.setHex((_b = style.irisColor) != null ? _b : 2771652);
          this.irisMat.emissive.setHex((_c = style.irisEmissive) != null ? _c : 0);
          this.irisMat.emissiveIntensity = (_d = style.irisEmissiveIntensity) != null ? _d : 0;
          this.irisMat.map = (_e = style.irisMap) != null ? _e : null;
          this.irisMat.needsUpdate = true;
          this.pupilMat.color.setHex((_f = style.pupilColor) != null ? _f : 0);
          this.pupil.scale.set((_g = style.pupilScaleX) != null ? _g : 1, (_h = style.pupilScaleY) != null ? _h : 1, 1);
          this.pupil.position.set((_i = style.pupilOffsetX) != null ? _i : 0, (_j = style.pupilOffsetY) != null ? _j : 0, 5e-3);
          this.shineMat.opacity = (_k = style.shineOpacity) != null ? _k : 1;
          this.shine2Mat.color.setHex((_l = style.secondaryShineColor) != null ? _l : 11193599);
          this.shine2Mat.opacity = (_m = style.secondaryShineOpacity) != null ? _m : 0.6;
        }
        update(targetX, targetY, dt) {
          this.look.x += (targetX - this.look.x) * Math.min(1, dt * 10);
          this.look.y += (targetY - this.look.y) * Math.min(1, dt * 10);
          this.irisRig.position.x = this.look.x;
          this.irisRig.position.y = this.look.y;
        }
      };
    }
  });

  // public/HomePageAPP/src/runtime/homepage-live-catalog.js
  var homepage_live_catalog_exports = {};
  __export(homepage_live_catalog_exports, {
    HOMEPAGE_CATALOG_STORAGE_KEY: () => HOMEPAGE_CATALOG_STORAGE_KEY,
    HOMEPAGE_CATALOG_SYNC: () => HOMEPAGE_CATALOG_SYNC,
    HOMEPAGE_CREATOR_READY: () => HOMEPAGE_CREATOR_READY,
    HOMEPAGE_MYSTERY_TEST_LAUNCH_STORAGE_KEY: () => HOMEPAGE_MYSTERY_TEST_LAUNCH_STORAGE_KEY,
    HOMEPAGE_MYSTERY_TEST_OVERRIDE_STORAGE_KEY: () => HOMEPAGE_MYSTERY_TEST_OVERRIDE_STORAGE_KEY,
    HOMEPAGE_MYSTERY_TEST_REWARD_STORAGE_KEY: () => HOMEPAGE_MYSTERY_TEST_REWARD_STORAGE_KEY,
    HOMEPAGE_MYSTERY_TEST_SESSION_STORAGE_KEY: () => HOMEPAGE_MYSTERY_TEST_SESSION_STORAGE_KEY,
    HOMEPAGE_OPEN_MYSTERY_TEST_REQUEST: () => HOMEPAGE_OPEN_MYSTERY_TEST_REQUEST,
    HOMEPAGE_PENDING_SUMMON_RECOVERY_STORAGE_KEY: () => HOMEPAGE_PENDING_SUMMON_RECOVERY_STORAGE_KEY,
    HOMEPAGE_PROP_SAVE_REQUEST: () => HOMEPAGE_PROP_SAVE_REQUEST,
    HOMEPAGE_PROP_SAVE_RESULT: () => HOMEPAGE_PROP_SAVE_RESULT,
    HOMEPAGE_PROP_UPLOAD_REQUEST: () => HOMEPAGE_PROP_UPLOAD_REQUEST,
    buildHomepageCatalogSnapshot: () => buildHomepageCatalogSnapshot,
    buildHomepageMysteryTestLaunchToken: () => buildHomepageMysteryTestLaunchToken,
    buildHomepageMysteryTestOverride: () => buildHomepageMysteryTestOverride,
    buildHomepageMysteryTestSession: () => buildHomepageMysteryTestSession,
    buildHomepagePendingSummonRecovery: () => buildHomepagePendingSummonRecovery,
    clearHomepageLegacyPinnedMysteryRewardKey: () => clearHomepageLegacyPinnedMysteryRewardKey,
    clearHomepageMysteryTestOverride: () => clearHomepageMysteryTestOverride,
    clearHomepageMysteryTestSession: () => clearHomepageMysteryTestSession,
    clearHomepagePendingSummonRecovery: () => clearHomepagePendingSummonRecovery,
    consumeHomepageMysteryTestLaunchToken: () => consumeHomepageMysteryTestLaunchToken,
    deriveHomepageCatalogFromLegacy: () => deriveHomepageCatalogFromLegacy,
    getActiveHomepageCatalog: () => getActiveHomepageCatalog,
    mergeHomepageCatalogWithFallback: () => mergeHomepageCatalogWithFallback,
    mysteryTestOverrideMatchesPropKey: () => mysteryTestOverrideMatchesPropKey,
    normalizeHomepageAttachment: () => normalizeHomepageAttachment,
    normalizeHomepageCategory: () => normalizeHomepageCategory,
    normalizeHomepageProp: () => normalizeHomepageProp,
    normalizeHomepagePropKey: () => normalizeHomepagePropKey,
    normalizeHomepageRarity: () => normalizeHomepageRarity,
    persistHomepageCatalogSnapshot: () => persistHomepageCatalogSnapshot,
    persistHomepageLegacyPinnedMysteryRewardKey: () => persistHomepageLegacyPinnedMysteryRewardKey,
    persistHomepageMysteryTestLaunchToken: () => persistHomepageMysteryTestLaunchToken,
    persistHomepageMysteryTestOverride: () => persistHomepageMysteryTestOverride,
    persistHomepageMysteryTestSession: () => persistHomepageMysteryTestSession,
    persistHomepagePendingSummonRecovery: () => persistHomepagePendingSummonRecovery,
    readHomepageCatalogSnapshot: () => readHomepageCatalogSnapshot,
    readHomepageLegacyPinnedMysteryRewardKey: () => readHomepageLegacyPinnedMysteryRewardKey,
    readHomepageMysteryTestOverride: () => readHomepageMysteryTestOverride,
    readHomepageMysteryTestSession: () => readHomepageMysteryTestSession,
    readHomepagePendingSummonRecovery: () => readHomepagePendingSummonRecovery
  });
  var HOMEPAGE_CATALOG_STORAGE_KEY, HOMEPAGE_MYSTERY_TEST_REWARD_STORAGE_KEY, HOMEPAGE_MYSTERY_TEST_OVERRIDE_STORAGE_KEY, HOMEPAGE_MYSTERY_TEST_LAUNCH_STORAGE_KEY, HOMEPAGE_MYSTERY_TEST_SESSION_STORAGE_KEY, HOMEPAGE_PENDING_SUMMON_RECOVERY_STORAGE_KEY, HOMEPAGE_CREATOR_READY, HOMEPAGE_CATALOG_SYNC, HOMEPAGE_PROP_UPLOAD_REQUEST, HOMEPAGE_PROP_SAVE_REQUEST, HOMEPAGE_PROP_SAVE_RESULT, HOMEPAGE_OPEN_MYSTERY_TEST_REQUEST, HOMEPAGE_RARITIES, CATEGORY_KEY_ALIASES, normalizeTuple, normalizeTags, normalizeCategoryKey, normalizeHomepagePropKey, buildHomepageMysteryTestOverride, createHomepageMysteryTestLaunchId, buildHomepageMysteryTestSession, buildHomepagePendingSummonRecovery, mysteryTestOverrideMatchesPropKey, readHomepageLegacyPinnedMysteryRewardKey, persistHomepageLegacyPinnedMysteryRewardKey, clearHomepageLegacyPinnedMysteryRewardKey, readHomepageMysteryTestOverride, persistHomepageMysteryTestOverride, clearHomepageMysteryTestOverride, readHomepageMysteryTestSession, persistHomepageMysteryTestSession, clearHomepageMysteryTestSession, readHomepagePendingSummonRecovery, persistHomepagePendingSummonRecovery, clearHomepagePendingSummonRecovery, buildHomepageMysteryTestLaunchToken, persistHomepageMysteryTestLaunchToken, consumeHomepageMysteryTestLaunchToken, normalizeHomepageCategory, normalizeHomepageAttachment, normalizeHomepageRarity, HOMEPAGE_SYSTEM_PROP_OVERRIDES, normalizeHomepageProp, buildHomepageCatalogSnapshot, persistHomepageCatalogSnapshot, readHomepageCatalogSnapshot, deriveHomepageCatalogFromLegacy, mergeHomepageCatalogWithFallback, getActiveHomepageCatalog;
  var init_homepage_live_catalog = __esm({
    "public/HomePageAPP/src/runtime/homepage-live-catalog.js"() {
      HOMEPAGE_CATALOG_STORAGE_KEY = "LAHS_HOMEPAGE_LIVE_CATALOG_SNAPSHOT";
      HOMEPAGE_MYSTERY_TEST_REWARD_STORAGE_KEY = "LAHS_HOMEPAGE_MYSTERY_TEST_REWARD_KEY";
      HOMEPAGE_MYSTERY_TEST_OVERRIDE_STORAGE_KEY = "LAHS_HOMEPAGE_MYSTERY_TEST_REWARD_OVERRIDE";
      HOMEPAGE_MYSTERY_TEST_LAUNCH_STORAGE_KEY = "LAHS_HOMEPAGE_MYSTERY_TEST_LAUNCH";
      HOMEPAGE_MYSTERY_TEST_SESSION_STORAGE_KEY = "LAHS_HOMEPAGE_MYSTERY_TEST_SESSION";
      HOMEPAGE_PENDING_SUMMON_RECOVERY_STORAGE_KEY = "LAHS_HOMEPAGE_PENDING_SUMMON_RECOVERY";
      HOMEPAGE_CREATOR_READY = "LAHS_HOMEPAGE_CREATOR_READY";
      HOMEPAGE_CATALOG_SYNC = "LAHS_HOMEPAGE_CATALOG_SYNC";
      HOMEPAGE_PROP_UPLOAD_REQUEST = "LAHS_HOMEPAGE_PROP_UPLOAD_REQUEST";
      HOMEPAGE_PROP_SAVE_REQUEST = "LAHS_HOMEPAGE_PROP_SAVE_REQUEST";
      HOMEPAGE_PROP_SAVE_RESULT = "LAHS_HOMEPAGE_PROP_SAVE_RESULT";
      HOMEPAGE_OPEN_MYSTERY_TEST_REQUEST = "LAHS_HOMEPAGE_OPEN_MYSTERY_TEST_REQUEST";
      HOMEPAGE_RARITIES = /* @__PURE__ */ new Set([
        "common",
        "rare",
        "legendary",
        "legendaryLight",
        "legendaryDark"
      ]);
      CATEGORY_KEY_ALIASES = Object.freeze({
        wingset: "wingSet",
        headwear: "headWear",
        faceaccessory: "faceAccessory",
        eyestyle: "eyeStyle",
        bodyaccessory: "bodyAccessory",
        heldprop: "heldProp"
      });
      normalizeTuple = (value, fallback) => {
        if (!Array.isArray(value) || value.length !== 3) {
          return fallback;
        }
        const nextValue = value.map((entry) => Number(entry));
        if (nextValue.some((entry) => !Number.isFinite(entry))) {
          return fallback;
        }
        return [nextValue[0], nextValue[1], nextValue[2]];
      };
      normalizeTags = (value) => {
        if (!Array.isArray(value)) return [];
        const seen = /* @__PURE__ */ new Set();
        return value.filter((entry) => typeof entry === "string").map((entry) => entry.trim()).filter((entry) => {
          if (!entry || seen.has(entry)) return false;
          seen.add(entry);
          return true;
        });
      };
      normalizeCategoryKey = (value) => {
        const trimmedValue = typeof value === "string" ? value.trim() : "";
        if (!trimmedValue) return "";
        const slugValue = trimmedValue.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
        return CATEGORY_KEY_ALIASES[slugValue] || trimmedValue;
      };
      normalizeHomepagePropKey = (value) => typeof value === "string" ? value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) : "";
      buildHomepageMysteryTestOverride = ({
        propKey,
        snapshotUpdatedAt = null,
        createdAt = (/* @__PURE__ */ new Date()).toISOString()
      }) => {
        const rawPropKey = typeof propKey === "string" ? propKey.trim() : "";
        const normalizedPropKey = normalizeHomepagePropKey(rawPropKey);
        if (!rawPropKey || !normalizedPropKey) {
          return null;
        }
        return {
          propKey: rawPropKey,
          normalizedPropKey,
          snapshotUpdatedAt: typeof snapshotUpdatedAt === "string" && snapshotUpdatedAt.trim().length > 0 ? snapshotUpdatedAt : null,
          createdAt,
          mode: "nextPullOnly"
        };
      };
      createHomepageMysteryTestLaunchId = ({ createdAt, normalizedPropKey }) => {
        var _a;
        const randomPart = typeof globalThis !== "undefined" && ((_a = globalThis.crypto) == null ? void 0 : _a.randomUUID) ? globalThis.crypto.randomUUID() : `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
        return `${createdAt}:${normalizedPropKey}:${randomPart}`;
      };
      buildHomepageMysteryTestSession = ({
        propKey,
        snapshotUpdatedAt = null,
        requiredCatalogRevision = snapshotUpdatedAt,
        createdAt = (/* @__PURE__ */ new Date()).toISOString(),
        launchId = null
      }) => {
        const rawPropKey = typeof propKey === "string" ? propKey.trim() : "";
        const normalizedPropKey = normalizeHomepagePropKey(rawPropKey);
        if (!rawPropKey || !normalizedPropKey) {
          return null;
        }
        const resolvedCreatedAt = typeof createdAt === "string" && createdAt.trim().length > 0 ? createdAt : (/* @__PURE__ */ new Date()).toISOString();
        return {
          launchId: typeof launchId === "string" && launchId.trim().length > 0 ? launchId.trim() : createHomepageMysteryTestLaunchId({
            createdAt: resolvedCreatedAt,
            normalizedPropKey
          }),
          propKey: rawPropKey,
          normalizedPropKey,
          snapshotUpdatedAt: typeof snapshotUpdatedAt === "string" && snapshotUpdatedAt.trim().length > 0 ? snapshotUpdatedAt : null,
          requiredCatalogRevision: typeof requiredCatalogRevision === "string" && requiredCatalogRevision.trim().length > 0 ? requiredCatalogRevision : null,
          createdAt: resolvedCreatedAt,
          mode: "nextPullOnly",
          failureMode: "blockPull"
        };
      };
      buildHomepagePendingSummonRecovery = ({
        userId = null,
        requestId,
        costPoints,
        rewardKey = null,
        rewardLabel = null,
        rewardRarity = null,
        createdAt = (/* @__PURE__ */ new Date()).toISOString(),
        resolvedAt = null,
        status = "pointsAccepted"
      }) => {
        const normalizedRequestId = typeof requestId === "string" ? requestId.trim() : "";
        const normalizedCostPoints = Math.max(1, Math.min(1e6, Number.isFinite(Number(costPoints)) ? Math.round(Number(costPoints)) : 0));
        const normalizedStatus = status === "rewardResolved" || status === "decisionRequired" ? status : "pointsAccepted";
        if (!normalizedRequestId || !normalizedCostPoints) {
          return null;
        }
        const normalizedRewardKey = typeof rewardKey === "string" && rewardKey.trim().length > 0 ? rewardKey.trim() : null;
        const normalizedRewardLabel = typeof rewardLabel === "string" && rewardLabel.trim().length > 0 ? rewardLabel.trim() : null;
        const normalizedUserId = typeof userId === "string" && userId.trim().length > 0 ? userId.trim() : null;
        const normalizedCreatedAt = typeof createdAt === "string" && createdAt.trim().length > 0 ? createdAt : (/* @__PURE__ */ new Date()).toISOString();
        const normalizedResolvedAt = typeof resolvedAt === "string" && resolvedAt.trim().length > 0 ? resolvedAt : null;
        return {
          userId: normalizedUserId,
          requestId: normalizedRequestId,
          costPoints: normalizedCostPoints,
          rewardKey: normalizedRewardKey,
          rewardLabel: normalizedRewardLabel,
          rewardRarity: normalizedRewardKey || rewardRarity ? normalizeHomepageRarity(rewardRarity) : null,
          createdAt: normalizedCreatedAt,
          resolvedAt: normalizedResolvedAt,
          status: normalizedStatus
        };
      };
      mysteryTestOverrideMatchesPropKey = (overridePayload, candidateKey) => {
        if (!overridePayload) {
          return false;
        }
        const rawCandidateKey = typeof candidateKey === "string" ? candidateKey.trim() : "";
        if (!rawCandidateKey) {
          return false;
        }
        return overridePayload.propKey === rawCandidateKey || overridePayload.normalizedPropKey === normalizeHomepagePropKey(rawCandidateKey);
      };
      readHomepageLegacyPinnedMysteryRewardKey = () => {
        try {
          const raw = localStorage.getItem(HOMEPAGE_MYSTERY_TEST_REWARD_STORAGE_KEY);
          if (typeof raw !== "string") {
            return null;
          }
          const value = raw.trim();
          return value || null;
        } catch {
          return null;
        }
      };
      persistHomepageLegacyPinnedMysteryRewardKey = (propKey) => {
        try {
          const rawPropKey = typeof propKey === "string" ? propKey.trim() : "";
          if (!rawPropKey) {
            localStorage.removeItem(HOMEPAGE_MYSTERY_TEST_REWARD_STORAGE_KEY);
            return;
          }
          localStorage.setItem(HOMEPAGE_MYSTERY_TEST_REWARD_STORAGE_KEY, rawPropKey);
        } catch {
        }
      };
      clearHomepageLegacyPinnedMysteryRewardKey = () => {
        try {
          localStorage.removeItem(HOMEPAGE_MYSTERY_TEST_REWARD_STORAGE_KEY);
        } catch {
        }
      };
      readHomepageMysteryTestOverride = () => {
        var _a;
        try {
          const raw = localStorage.getItem(HOMEPAGE_MYSTERY_TEST_OVERRIDE_STORAGE_KEY);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          return buildHomepageMysteryTestOverride({
            propKey: parsed == null ? void 0 : parsed.propKey,
            snapshotUpdatedAt: (_a = parsed == null ? void 0 : parsed.snapshotUpdatedAt) != null ? _a : null,
            createdAt: typeof (parsed == null ? void 0 : parsed.createdAt) === "string" && parsed.createdAt.trim().length > 0 ? parsed.createdAt : (/* @__PURE__ */ new Date()).toISOString()
          });
        } catch {
          return null;
        }
      };
      persistHomepageMysteryTestOverride = (payload) => {
        try {
          if (!payload) {
            localStorage.removeItem(HOMEPAGE_MYSTERY_TEST_OVERRIDE_STORAGE_KEY);
            return;
          }
          localStorage.setItem(HOMEPAGE_MYSTERY_TEST_OVERRIDE_STORAGE_KEY, JSON.stringify(payload));
        } catch {
        }
      };
      clearHomepageMysteryTestOverride = () => {
        try {
          localStorage.removeItem(HOMEPAGE_MYSTERY_TEST_OVERRIDE_STORAGE_KEY);
        } catch {
        }
      };
      readHomepageMysteryTestSession = () => {
        var _a, _b;
        try {
          const raw = localStorage.getItem(HOMEPAGE_MYSTERY_TEST_SESSION_STORAGE_KEY);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          return buildHomepageMysteryTestSession({
            propKey: parsed == null ? void 0 : parsed.propKey,
            snapshotUpdatedAt: (_a = parsed == null ? void 0 : parsed.snapshotUpdatedAt) != null ? _a : null,
            requiredCatalogRevision: (_b = parsed == null ? void 0 : parsed.requiredCatalogRevision) != null ? _b : null,
            createdAt: typeof (parsed == null ? void 0 : parsed.createdAt) === "string" && parsed.createdAt.trim().length > 0 ? parsed.createdAt : (/* @__PURE__ */ new Date()).toISOString(),
            launchId: typeof (parsed == null ? void 0 : parsed.launchId) === "string" && parsed.launchId.trim().length > 0 ? parsed.launchId : null
          });
        } catch {
          return null;
        }
      };
      persistHomepageMysteryTestSession = (payload) => {
        try {
          if (!payload) {
            localStorage.removeItem(HOMEPAGE_MYSTERY_TEST_SESSION_STORAGE_KEY);
            return;
          }
          localStorage.setItem(HOMEPAGE_MYSTERY_TEST_SESSION_STORAGE_KEY, JSON.stringify(payload));
        } catch {
        }
      };
      clearHomepageMysteryTestSession = () => {
        try {
          localStorage.removeItem(HOMEPAGE_MYSTERY_TEST_SESSION_STORAGE_KEY);
        } catch {
        }
      };
      readHomepagePendingSummonRecovery = (userId = null) => {
        var _a, _b, _c, _d, _e;
        try {
          const raw = localStorage.getItem(HOMEPAGE_PENDING_SUMMON_RECOVERY_STORAGE_KEY);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          const payload = buildHomepagePendingSummonRecovery({
            userId: (_a = parsed == null ? void 0 : parsed.userId) != null ? _a : null,
            requestId: parsed == null ? void 0 : parsed.requestId,
            costPoints: Number(parsed == null ? void 0 : parsed.costPoints),
            rewardKey: (_b = parsed == null ? void 0 : parsed.rewardKey) != null ? _b : null,
            rewardLabel: (_c = parsed == null ? void 0 : parsed.rewardLabel) != null ? _c : null,
            rewardRarity: (_d = parsed == null ? void 0 : parsed.rewardRarity) != null ? _d : null,
            createdAt: typeof (parsed == null ? void 0 : parsed.createdAt) === "string" && parsed.createdAt.trim().length > 0 ? parsed.createdAt : (/* @__PURE__ */ new Date()).toISOString(),
            resolvedAt: (_e = parsed == null ? void 0 : parsed.resolvedAt) != null ? _e : null,
            status: parsed == null ? void 0 : parsed.status
          });
          if (!payload) {
            return null;
          }
          const normalizedUserId = typeof userId === "string" && userId.trim().length > 0 ? userId.trim() : null;
          if (normalizedUserId && payload.userId !== normalizedUserId) {
            return null;
          }
          return payload;
        } catch {
          return null;
        }
      };
      persistHomepagePendingSummonRecovery = (payload) => {
        try {
          if (!payload) {
            localStorage.removeItem(HOMEPAGE_PENDING_SUMMON_RECOVERY_STORAGE_KEY);
            return;
          }
          localStorage.setItem(HOMEPAGE_PENDING_SUMMON_RECOVERY_STORAGE_KEY, JSON.stringify(payload));
        } catch {
        }
      };
      clearHomepagePendingSummonRecovery = (userId = null) => {
        try {
          if (!userId) {
            localStorage.removeItem(HOMEPAGE_PENDING_SUMMON_RECOVERY_STORAGE_KEY);
            return;
          }
          const payload = readHomepagePendingSummonRecovery(userId);
          if (!payload) {
            return;
          }
          localStorage.removeItem(HOMEPAGE_PENDING_SUMMON_RECOVERY_STORAGE_KEY);
        } catch {
        }
      };
      buildHomepageMysteryTestLaunchToken = ({
        propKey = null,
        snapshotUpdatedAt = null,
        createdAt = (/* @__PURE__ */ new Date()).toISOString()
      } = {}) => ({
        createdAt,
        propKey: typeof propKey === "string" && propKey.trim().length > 0 ? propKey.trim() : null,
        snapshotUpdatedAt: typeof snapshotUpdatedAt === "string" && snapshotUpdatedAt.trim().length > 0 ? snapshotUpdatedAt : null,
        reason: "creator-save"
      });
      persistHomepageMysteryTestLaunchToken = (token) => {
        try {
          if (!token) {
            localStorage.removeItem(HOMEPAGE_MYSTERY_TEST_LAUNCH_STORAGE_KEY);
            return;
          }
          localStorage.setItem(HOMEPAGE_MYSTERY_TEST_LAUNCH_STORAGE_KEY, JSON.stringify(token));
        } catch {
        }
      };
      consumeHomepageMysteryTestLaunchToken = () => {
        var _a, _b;
        try {
          const raw = localStorage.getItem(HOMEPAGE_MYSTERY_TEST_LAUNCH_STORAGE_KEY);
          if (!raw) return null;
          localStorage.removeItem(HOMEPAGE_MYSTERY_TEST_LAUNCH_STORAGE_KEY);
          const parsed = JSON.parse(raw);
          return buildHomepageMysteryTestLaunchToken({
            propKey: (_a = parsed == null ? void 0 : parsed.propKey) != null ? _a : null,
            snapshotUpdatedAt: (_b = parsed == null ? void 0 : parsed.snapshotUpdatedAt) != null ? _b : null,
            createdAt: typeof (parsed == null ? void 0 : parsed.createdAt) === "string" && parsed.createdAt.trim().length > 0 ? parsed.createdAt : (/* @__PURE__ */ new Date()).toISOString()
          });
        } catch {
          return null;
        }
      };
      normalizeHomepageCategory = (raw) => {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
          return null;
        }
        const key = typeof raw.key === "string" ? normalizeCategoryKey(raw.key) : "";
        const label = typeof raw.label === "string" ? raw.label.trim() : "";
        const slotKey = typeof raw.slotKey === "string" ? raw.slotKey.trim() : "";
        if (!key || !label || !slotKey) {
          return null;
        }
        return {
          key,
          label,
          slotKey,
          equipLimit: Math.max(1, Number.isFinite(Number(raw.equipLimit)) ? Number(raw.equipLimit) : 1),
          sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : 0,
          enabled: raw.enabled !== false,
          updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null
        };
      };
      normalizeHomepageAttachment = (raw) => {
        const record = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
        const fitRecord = record.fit && typeof record.fit === "object" && !Array.isArray(record.fit) ? record.fit : null;
        return {
          position: normalizeTuple(record.position, [0, 0, 0]),
          rotation: normalizeTuple(record.rotation, [0, 0, 0]),
          scale: normalizeTuple(record.scale, [1, 1, 1]),
          mirrorMode: record.mirrorMode === "paired" ? "paired" : "single",
          fit: fitRecord ? {
            distanceMultiplier: Number.isFinite(Number(fitRecord.distanceMultiplier)) ? Number(fitRecord.distanceMultiplier) : void 0,
            yOffsetRatio: Number.isFinite(Number(fitRecord.yOffsetRatio)) ? Number(fitRecord.yOffsetRatio) : void 0,
            zOffsetRatio: Number.isFinite(Number(fitRecord.zOffsetRatio)) ? Number(fitRecord.zOffsetRatio) : void 0,
            initialRotationY: Number.isFinite(Number(fitRecord.initialRotationY)) ? Number(fitRecord.initialRotationY) : void 0
          } : null
        };
      };
      normalizeHomepageRarity = (value) => typeof value === "string" && HOMEPAGE_RARITIES.has(value) ? value : "rare";
      HOMEPAGE_SYSTEM_PROP_OVERRIDES = Object.freeze({
        xiostandardcrown: Object.freeze({
          rarity: "legendaryLight",
          mysteryBoxEnabled: true,
          active: true,
          attachment: Object.freeze({
            position: Object.freeze([0, 1.55, -1.65]),
            rotation: Object.freeze([0, 0, 0]),
            scale: Object.freeze([2.7, 2.7, 2.7]),
            mirrorMode: "single"
          })
        }),
      xiostandardbodygear: Object.freeze({
        label: "Ruby One",
        assetUrl: "./Images/PROPS/BodyGear/RubyOne/redrubyarmor.glb",
        rarity: "legendaryLight",
        mysteryBoxEnabled: true,
        active: true,
        tags: Object.freeze(["body-gear", "torso", "ruby-one", "starter"]),
        description: "Ruby One is the default XiO body gear baseline for calibrating torso GLBs and locking future body gear fits.",
        attachment: Object.freeze({
          position: Object.freeze([0, -4, -2]),
          rotation: Object.freeze([0, 0, 0]),
          scale: Object.freeze([5.7, 5.7, 5.7]),
          mirrorMode: "single"
        })
      }),
      "optimized-glb-visual-safe-q95": Object.freeze({
        label: "Execution Wings",
        assetUrl: "./Images/PROPS/Wings/ExecutionWings/ExecutionWings.glb"
      }),
      "7d757ac9af9739c111859cdb10bb9794-opt-2048": Object.freeze({
        label: "Honeycomb Blooms",
        assetUrl: "./Images/PROPS/Wings/HoneycombBloomsSaved/HoneycombBloomsSaved.glb"
      }),
      xiostandardcrowncopy: Object.freeze({
        label: "XiO Standard Crown Copy",
        assetUrl: "./Images/PROPS/Headwear/XiOStandardCrown/XiOStandardCrown.glb"
      })
      });
      normalizeHomepageProp = (raw) => {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
          return null;
        }
        const key = typeof raw.key === "string" ? raw.key.trim() : "";
        const label = typeof raw.label === "string" ? raw.label.trim() : "";
        const categoryKey = typeof raw.categoryKey === "string" ? normalizeCategoryKey(raw.categoryKey) : "";
        if (!key || !label || !categoryKey) {
          return null;
        }
        const preview = raw.preview && typeof raw.preview === "object" && !Array.isArray(raw.preview) ? raw.preview : {};
        const inferredFactoryId = typeof raw.factoryId === "string" && raw.factoryId.trim().length > 0 ? raw.factoryId.trim() : preview.generated && typeof preview.generated === "object" && !Array.isArray(preview.generated) && preview.generated.category === "wingSet" ? "makeGeneratedProceduralWingProp" : "";
        const normalizedProp = {
          key,
          label,
          categoryKey,
          rarity: normalizeHomepageRarity(raw.rarity),
          assetUrl: typeof raw.assetUrl === "string" && raw.assetUrl.trim().length > 0 ? raw.assetUrl.trim() : null,
          storagePath: typeof raw.storagePath === "string" && raw.storagePath.trim().length > 0 ? raw.storagePath.trim() : null,
          attachment: normalizeHomepageAttachment(raw.attachment),
          eyePreset: typeof raw.eyePreset === "string" && raw.eyePreset.trim().length > 0 ? raw.eyePreset.trim() : null,
          materialPreset: typeof raw.materialPreset === "string" && raw.materialPreset.trim().length > 0 ? raw.materialPreset.trim() : null,
          mysteryBoxEnabled: raw.mysteryBoxEnabled !== false,
          active: raw.active !== false,
          archived: raw.archived === true,
          tags: normalizeTags(raw.tags),
          description: typeof raw.description === "string" ? raw.description : "",
          preview,
          ...inferredFactoryId ? { factoryId: inferredFactoryId } : {},
          ...raw.creatorOnly === true ? { creatorOnly: true } : {},
          ...Number.isFinite(Number(raw.prewarmPriority)) ? { prewarmPriority: Number(raw.prewarmPriority) } : {},
          updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null
        };
        const systemOverrides = HOMEPAGE_SYSTEM_PROP_OVERRIDES[normalizeHomepagePropKey(key)];
        return systemOverrides ? { ...normalizedProp, ...systemOverrides } : normalizedProp;
      };
      buildHomepageCatalogSnapshot = ({ categories, props, updatedAt = null }) => ({
        version: 1,
        updatedAt: typeof updatedAt === "string" && updatedAt.trim().length > 0 ? updatedAt : (/* @__PURE__ */ new Date()).toISOString(),
        categories: [...categories].sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return a.label.localeCompare(b.label);
        }),
        props: [...props].sort((a, b) => a.label.localeCompare(b.label))
      });
      persistHomepageCatalogSnapshot = (snapshot) => {
        try {
          if (!snapshot || snapshot.categories.length === 0 && snapshot.props.length === 0) {
            localStorage.removeItem(HOMEPAGE_CATALOG_STORAGE_KEY);
            return;
          }
          localStorage.setItem(HOMEPAGE_CATALOG_STORAGE_KEY, JSON.stringify(snapshot));
        } catch {
        }
      };
      readHomepageCatalogSnapshot = () => {
        try {
          const raw = localStorage.getItem(HOMEPAGE_CATALOG_STORAGE_KEY);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          const categories = Array.isArray(parsed == null ? void 0 : parsed.categories) ? parsed.categories.map((entry) => normalizeHomepageCategory(entry)).filter(Boolean) : [];
          const props = Array.isArray(parsed == null ? void 0 : parsed.props) ? parsed.props.map((entry) => normalizeHomepageProp(entry)).filter(Boolean) : [];
          const snapshot = buildHomepageCatalogSnapshot({
            categories,
            props,
            updatedAt: typeof (parsed == null ? void 0 : parsed.updatedAt) === "string" ? parsed.updatedAt : null
          });
          return snapshot.categories.length === 0 && snapshot.props.length === 0 ? null : snapshot;
        } catch {
          return null;
        }
      };
      deriveHomepageCatalogFromLegacy = ({ inventoryConfig, propCatalog }) => {
        const categories = Array.isArray(inventoryConfig == null ? void 0 : inventoryConfig.categories) ? inventoryConfig.categories.map((entry, index) => {
          var _a, _b;
          return normalizeHomepageCategory({
            key: entry.key,
            label: entry.label || entry.key,
            slotKey: entry.slotKey || entry.key,
            equipLimit: (_a = entry.equipLimit) != null ? _a : 1,
            sortOrder: (_b = entry.sortOrder) != null ? _b : index,
            enabled: entry.enabled !== false
          });
        }).filter(Boolean) : [];
        const props = Array.isArray(propCatalog) ? propCatalog.map((entry) => normalizeHomepageProp({
          key: entry.key,
          label: entry.label || entry.key,
          categoryKey: entry.category,
          rarity: entry.rarity,
          assetUrl: entry.assetUrl || null,
          attachment: entry.attachment || {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            mirrorMode: entry.category === "wingSet" ? "paired" : "single"
          },
          eyePreset: entry.eyePreset || null,
          materialPreset: entry.materialPreset || null,
          mysteryBoxEnabled: entry.mysteryBoxEnabled !== false,
          active: entry.active !== false,
          archived: false,
          tags: entry.tags || [],
          description: entry.description || "",
          preview: entry.preview || {},
          factoryId: entry.factoryId || null,
          creatorOnly: entry.creatorOnly === true,
          prewarmPriority: Number.isFinite(Number(entry.prewarmPriority)) ? Number(entry.prewarmPriority) : 0
        })).filter(Boolean) : [];
        return buildHomepageCatalogSnapshot({ categories, props });
      };
      mergeHomepageCatalogWithFallback = ({ snapshot, fallbackInventoryConfig, fallbackPropCatalog }) => {
        const fallbackSnapshot = deriveHomepageCatalogFromLegacy({
          inventoryConfig: fallbackInventoryConfig,
          propCatalog: fallbackPropCatalog
        });
        if (!snapshot) {
          return fallbackSnapshot;
        }
        const fallbackCategoryMap = new Map(fallbackSnapshot.categories.map((entry) => [entry.key, entry]));
        const fallbackPropMap = new Map(fallbackSnapshot.props.map((entry) => [entry.key, entry]));
        const fallbackPropNormalizedMap = new Map(
          fallbackSnapshot.props.map((entry) => [normalizeHomepagePropKey(entry.key), entry]).filter(([normalizedKey]) => typeof normalizedKey === "string" && normalizedKey.length > 0)
        );
        const mergedCategories = new Map(fallbackCategoryMap);
        (snapshot.categories || []).forEach((entry) => {
          const fallbackCategory = fallbackCategoryMap.get(entry.key);
          mergedCategories.set(entry.key, fallbackCategory ? { ...fallbackCategory, ...entry } : entry);
        });
        const mergedProps = new Map(fallbackPropMap);
        (snapshot.props || []).forEach((entry) => {
          const fallbackProp = fallbackPropMap.get(entry.key) || fallbackPropNormalizedMap.get(normalizeHomepagePropKey(entry.key));
          if (!fallbackProp) {
            mergedProps.set(entry.key, entry);
            return;
          }
          const mergedKey = fallbackProp.key || entry.key;
          mergedProps.set(entry.key, {
            ...fallbackProp,
            ...entry,
            key: mergedKey,
            assetUrl: entry.assetUrl || fallbackProp.assetUrl || null,
            storagePath: entry.storagePath || fallbackProp.storagePath || null,
            preview: {
              ...fallbackProp.preview || {},
              ...entry.preview || {}
            },
            attachment: entry.attachment || fallbackProp.attachment
          });
          if (mergedKey !== entry.key) {
            const mergedEntry = mergedProps.get(entry.key);
            mergedProps.delete(entry.key);
            mergedProps.set(mergedKey, mergedEntry);
          }
        });
        return buildHomepageCatalogSnapshot({
          categories: Array.from(mergedCategories.values()),
          props: Array.from(mergedProps.values()),
          updatedAt: snapshot.updatedAt || fallbackSnapshot.updatedAt
        });
      };
      getActiveHomepageCatalog = ({ fallbackInventoryConfig, fallbackPropCatalog }) => {
        const storedSnapshot = readHomepageCatalogSnapshot();
        return mergeHomepageCatalogWithFallback({
          snapshot: storedSnapshot,
          fallbackInventoryConfig,
          fallbackPropCatalog
        });
      };
    }
  });

  // public/HomePageAPP/src/runtime/homepage-gltf-props.js
  var homepage_gltf_props_exports = {};
  __export(homepage_gltf_props_exports, {
    DEFAULT_WING_AUTHORING_PREVIEW: () => DEFAULT_WING_AUTHORING_PREVIEW,
    DEFAULT_WING_MOTION_CHANNEL: () => DEFAULT_WING_MOTION_CHANNEL,
    DEFAULT_WING_MOTION_PREVIEW: () => DEFAULT_WING_MOTION_PREVIEW,
    applyAttachmentTransform: () => applyAttachmentTransform,
    buildMirroredAttachmentTransform: () => buildMirroredAttachmentTransform,
    buildWingAuthoringTemplateState: () => buildWingAuthoringTemplateState,
    centerObjectAtOrigin: () => centerObjectAtOrigin,
    cloneSceneGraph: () => cloneSceneGraph,
    computeObjectBounds: () => computeObjectBounds,
    createRuntimeGlbPropFactory: () => createRuntimeGlbPropFactory,
    loadGlbScene: () => loadGlbScene,
    loadWingTemplateRoot: () => loadWingTemplateRoot,
    loadWingTemplateState: () => loadWingTemplateState,
    normalizeObjectToUnitSize: () => normalizeObjectToUnitSize,
    normalizeWingAuthoringPreview: () => normalizeWingAuthoringPreview,
    normalizeWingMotionChannel: () => normalizeWingMotionChannel,
    normalizeWingMotionPreview: () => normalizeWingMotionPreview,
    prepareSceneRootForSocketAttachment: () => prepareSceneRootForSocketAttachment,
    resolveWingMotionProfiles: () => resolveWingMotionProfiles
  });
  function cloneSceneGraph(root) {
    const clone = root.clone(true);
    clone.traverse((node) => {
      var _a;
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      node.frustumCulled = false;
      if (Array.isArray(node.material)) {
        node.material = node.material.map((material) => {
          var _a2;
          return ((_a2 = material == null ? void 0 : material.clone) == null ? void 0 : _a2.call(material)) || material;
        });
        return;
      }
      if ((_a = node.material) == null ? void 0 : _a.clone) {
        node.material = node.material.clone();
      }
    });
    return clone;
  }
  function shouldCacheGlbAssetUrl(assetUrl) {
    return typeof assetUrl === "string" && assetUrl.length > 0 && !assetUrl.startsWith("blob:") && !assetUrl.startsWith("data:");
  }
  async function loadGlbSceneSource({ GLTFLoader, assetUrl }) {
    if (!assetUrl) {
      return null;
    }
    const useCache = shouldCacheGlbAssetUrl(assetUrl);
    if (useCache) {
      const cachedSource = glbSceneSourceCache.get(assetUrl);
      if (cachedSource) {
        return cachedSource;
      }
    }
    const loader = new GLTFLoader();
    const sourcePromise = new Promise((resolve, reject) => {
      loader.load(
        assetUrl,
        (gltf) => {
          var _a;
          const sourceRoot = (gltf == null ? void 0 : gltf.scene) || ((_a = gltf == null ? void 0 : gltf.scenes) == null ? void 0 : _a[0]) || null;
          if (!sourceRoot) {
            if (useCache) {
              glbSceneSourceCache.delete(assetUrl);
            }
            reject(new Error(`GLB asset did not contain a scene root: ${assetUrl}`));
            return;
          }
          sourceRoot.updateMatrixWorld(true);
          resolve(sourceRoot);
        },
        void 0,
        (error) => {
          if (useCache) {
            glbSceneSourceCache.delete(assetUrl);
          }
          reject(error);
        }
      );
    });
    if (useCache) {
      glbSceneSourceCache.set(assetUrl, sourcePromise);
    }
    return sourcePromise;
  }
  function applyAttachmentTransform(target, attachment = {}) {
    if (!target) return;
    const position = Array.isArray(attachment.position) ? attachment.position : [0, 0, 0];
    const rotation = Array.isArray(attachment.rotation) ? attachment.rotation : [0, 0, 0];
    const scale = Array.isArray(attachment.scale) ? attachment.scale : [1, 1, 1];
    target.position.set(Number(position[0]) || 0, Number(position[1]) || 0, Number(position[2]) || 0);
    target.rotation.set(Number(rotation[0]) || 0, Number(rotation[1]) || 0, Number(rotation[2]) || 0);
    target.scale.set(Number(scale[0]) || 1, Number(scale[1]) || 1, Number(scale[2]) || 1);
  }
  function buildMirroredAttachmentTransform(attachment = {}, dir = 1) {
    const position = Array.isArray(attachment.position) ? attachment.position : [0, 0, 0];
    const rotation = Array.isArray(attachment.rotation) ? attachment.rotation : [0, 0, 0];
    const scale = Array.isArray(attachment.scale) ? attachment.scale : [1, 1, 1];
    return {
      position: [dir * (Number(position[0]) || 0), Number(position[1]) || 0, Number(position[2]) || 0],
      rotation: [Number(rotation[0]) || 0, dir * (Number(rotation[1]) || 0), dir * (Number(rotation[2]) || 0)],
      scale: [Number(scale[0]) || 1, Number(scale[1]) || 1, Number(scale[2]) || 1]
    };
  }
  function buildSingleWingAttachmentTransform(attachment = {}, side = "right") {
    const dir = side === "left" ? -1 : 1;
    const position = Array.isArray(attachment.position) ? attachment.position : [0, 0, 0];
    const rotation = Array.isArray(attachment.rotation) ? attachment.rotation : [0, 0, 0];
    const scale = Array.isArray(attachment.scale) ? attachment.scale : [1, 1, 1];
    return {
      position: [Math.abs(Number(position[0]) || 0) * dir, Number(position[1]) || 0, Number(position[2]) || 0],
      rotation: [Number(rotation[0]) || 0, Math.abs(Number(rotation[1]) || 0) * dir, Math.abs(Number(rotation[2]) || 0) * dir],
      scale: [Math.abs(Number(scale[0]) || 1), Math.abs(Number(scale[1]) || 1), Math.abs(Number(scale[2]) || 1)]
    };
  }
  function buildMirroredWingPairFromIsolatedSource(isolatedRoot, sourceSide = "left") {
    if (!isolatedRoot) {
      return null;
    }
    const normalizedSourceSide = sourceSide === "right" ? "right" : "left";
    const leftRoot = cloneSceneGraph(isolatedRoot);
    const rightRoot = cloneSceneGraph(isolatedRoot);
    if (normalizedSourceSide === "right") {
      leftRoot.scale.x *= -1;
    } else {
      rightRoot.scale.x *= -1;
    }
    leftRoot.updateMatrixWorld(true);
    rightRoot.updateMatrixWorld(true);
    return {
      left: leftRoot,
      right: rightRoot
    };
  }
  function clampNumber(value, minimum, maximum, fallback) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return fallback;
    }
    return Math.min(maximum, Math.max(minimum, numericValue));
  }
  function normalizeWingAuthoringPreview(raw, {
    defaultMirrorToBoth = true
  } = {}) {
    const preview = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const mode = preview.mode === "isolatedHalf" ? "isolatedHalf" : "originalPair";
    const sourceSide = preview.sourceSide === "right" ? "right" : "left";
    return {
      mode,
      sourceSide,
      mirrorToBoth: preview.mirrorToBoth !== false && defaultMirrorToBoth !== false,
      splitOffset: clampNumber(preview.splitOffset, -0.85, 0.85, 0),
      trimMargin: clampNumber(preview.trimMargin, 0, 0.36, 0.02)
    };
  }
  function normalizeWingMotionChannel(raw, fallback = DEFAULT_WING_MOTION_CHANNEL) {
    const channel = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    return {
      flapHz: clampNumber(channel.flapHz, 0.2, 4.5, fallback.flapHz),
      direction: channel.direction === "reverse" ? "reverse" : "normal",
      amplitude: clampNumber(channel.amplitude, 0.15, 2.8, fallback.amplitude),
      sweep: clampNumber(channel.sweep, 0.15, 2.4, fallback.sweep),
      pitch: clampNumber(channel.pitch, -1.4, 1.4, fallback.pitch),
      featherTwist: clampNumber(channel.featherTwist, 0, 2.4, fallback.featherTwist),
      shoulderSpread: clampNumber(channel.shoulderSpread, -0.6, 1.2, fallback.shoulderSpread),
      phaseOffset: clampNumber(channel.phaseOffset, -Math.PI, Math.PI, fallback.phaseOffset)
    };
  }
  function normalizeWingMotionPreview(raw) {
    const preview = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const master = normalizeWingMotionChannel(preview.master, DEFAULT_WING_MOTION_CHANNEL);
    const linked = preview.linked !== false;
    return {
      linked,
      master,
      left: preview.left ? normalizeWingMotionChannel(preview.left, master) : null,
      right: preview.right ? normalizeWingMotionChannel(preview.right, master) : null
    };
  }
  function resolveWingMotionProfiles(raw) {
    const normalized = normalizeWingMotionPreview(raw);
    if (normalized.linked) {
      return {
        linked: true,
        master: normalized.master,
        left: normalized.master,
        right: normalized.master
      };
    }
    return {
      linked: false,
      master: normalized.master,
      left: normalizeWingMotionChannel({ ...normalized.master, ...normalized.left || {} }, normalized.master),
      right: normalizeWingMotionChannel({ ...normalized.master, ...normalized.right || {} }, normalized.master)
    };
  }
  function computeObjectBounds(THREE, object) {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) {
      return {
        box,
        size: new THREE.Vector3(1, 1, 1),
        center: new THREE.Vector3()
      };
    }
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    return { box, size, center };
  }
  function centerObjectAtOrigin(THREE, object) {
    const { center } = computeObjectBounds(THREE, object);
    object.position.sub(center);
    return object;
  }
  function normalizeObjectToUnitSize(THREE, object, targetSize = 1.8) {
    const { size, center } = computeObjectBounds(THREE, object);
    const largestAxis = Math.max(size.x, size.y, size.z, 1e-3);
    const scale = targetSize / largestAxis;
    object.scale.multiplyScalar(scale);
    object.position.sub(center.multiplyScalar(scale));
    return object;
  }
  function collectRenderableMeshEntries(THREE, root) {
    if (!root) return [];
    root.updateMatrixWorld(true);
    const entries = [];
    root.traverse((node) => {
      var _a, _b;
      if (!(node == null ? void 0 : node.isMesh) || node.visible === false || !((_b = (_a = node.geometry) == null ? void 0 : _a.attributes) == null ? void 0 : _b.position)) {
        return;
      }
      const box = new THREE.Box3().setFromObject(node);
      if (box.isEmpty()) {
        return;
      }
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const diagonal = Math.max(size.length(), 1e-4);
      const vertexCount = node.geometry.attributes.position.count || 0;
      const axisProduct = Math.max(size.x, 1e-3) * Math.max(size.y, 1e-3) * Math.max(size.z, 1e-3);
      const score = Math.log2(vertexCount + 2) * diagonal + Math.cbrt(axisProduct) * 0.35;
      entries.push({
        box,
        center,
        diagonal,
        score,
        size,
        vertexCount
      });
    });
    return entries;
  }
  function computeRenderableMeshBounds(THREE, root) {
    const entries = collectRenderableMeshEntries(THREE, root);
    if (!entries.length) {
      return computeObjectBounds(THREE, root);
    }
    const dominantEntry = entries.reduce((bestEntry, entry) => !bestEntry || entry.score > bestEntry.score ? entry : bestEntry, null);
    const minScore = dominantEntry.score * 0.2;
    const minVertexCount = Math.max(24, dominantEntry.vertexCount * 0.08);
    const minDiagonal = Math.max(0.06, dominantEntry.diagonal * 0.2);
    const selectedEntries = entries.filter((entry) => entry === dominantEntry || entry.score >= minScore || entry.vertexCount >= minVertexCount || entry.diagonal >= minDiagonal);
    const box = selectedEntries.reduce((accumulator, entry) => accumulator ? accumulator.union(entry.box) : entry.box.clone(), null);
    if (!box || box.isEmpty()) {
      return computeObjectBounds(THREE, root);
    }
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    return { box, size, center };
  }
  function prepareSceneRootForSocketAttachment({
    THREE,
    root,
    targetSize = 1.8
  }) {
    if (!root) {
      return null;
    }
    const preparedRoot = cloneSceneGraph(root);
    const { size, center } = computeRenderableMeshBounds(THREE, preparedRoot);
    const largestAxis = Math.max(size.x, size.y, size.z, 1e-3);
    const scale = targetSize / largestAxis;
    preparedRoot.scale.multiplyScalar(scale);
    preparedRoot.position.sub(center.multiplyScalar(scale));
    preparedRoot.updateMatrixWorld(true);
    return preparedRoot;
  }
  async function loadGlbScene({ GLTFLoader, assetUrl }) {
    const sourceRoot = await loadGlbSceneSource({ GLTFLoader, assetUrl });
    return sourceRoot ? cloneSceneGraph(sourceRoot) : null;
  }
  function cloneMaterialTemplate(material) {
    var _a;
    if (Array.isArray(material)) {
      return material.map((entry) => {
        var _a2;
        return ((_a2 = entry == null ? void 0 : entry.clone) == null ? void 0 : _a2.call(entry)) || entry;
      });
    }
    return ((_a = material == null ? void 0 : material.clone) == null ? void 0 : _a.call(material)) || material || null;
  }
  function getLargestMeshEntryFromObject(root) {
    if (!root) return null;
    let bestGeometry = null;
    let bestMaterial = null;
    let bestVertexCount = -1;
    root.traverse((node) => {
      var _a, _b;
      if (!(node == null ? void 0 : node.isMesh) || !((_b = (_a = node.geometry) == null ? void 0 : _a.attributes) == null ? void 0 : _b.position)) {
        return;
      }
      const vertexCount = node.geometry.attributes.position.count || 0;
      if (vertexCount <= bestVertexCount) {
        return;
      }
      bestVertexCount = vertexCount;
      bestGeometry = node.geometry.clone();
      bestMaterial = node.material || null;
    });
    return bestGeometry ? { geometry: bestGeometry, material: bestMaterial } : null;
  }
  function buildGeometryFromAttributeArrays(THREE, sourceAttributes, attributeArrays) {
    const geometry = new THREE.BufferGeometry();
    Object.entries(attributeArrays).forEach(([name, values]) => {
      const source = sourceAttributes[name];
      if (!(source == null ? void 0 : source.array) || !(values == null ? void 0 : values.length)) {
        return;
      }
      const TypedArray = source.array.constructor || Float32Array;
      geometry.setAttribute(
        name,
        new THREE.BufferAttribute(new TypedArray(values), source.itemSize, source.normalized === true)
      );
    });
    return geometry;
  }
  function splitGeometryByPlane(THREE, sourceGeometry, {
    splitOffset = 0,
    trimMargin = 0
  } = {}) {
    var _a, _b, _c, _d, _e;
    if (!((_a = sourceGeometry == null ? void 0 : sourceGeometry.attributes) == null ? void 0 : _a.position)) {
      return null;
    }
    const nonIndexed = sourceGeometry.index ? sourceGeometry.toNonIndexed() : sourceGeometry.clone();
    const position = nonIndexed.attributes.position;
    const array = position == null ? void 0 : position.array;
    if (!array || array.length < 9) {
      if (nonIndexed == null ? void 0 : nonIndexed.dispose) nonIndexed.dispose();
      return null;
    }
    const sourceAttributes = Object.fromEntries(
      Object.entries(nonIndexed.attributes).filter(([, attribute]) => {
        var _a2;
        return (_a2 = attribute == null ? void 0 : attribute.array) == null ? void 0 : _a2.length;
      })
    );
    const createBuckets = () => Object.fromEntries(
      Object.keys(sourceAttributes).map((name) => [name, []])
    );
    const leftAttributes = createBuckets();
    const rightAttributes = createBuckets();
    for (let triVertex = 0; triVertex <= position.count - 3; triVertex += 3) {
      const centroidX = (position.getX(triVertex) + position.getX(triVertex + 1) + position.getX(triVertex + 2)) / 3;
      if (Math.abs(centroidX - splitOffset) <= trimMargin) {
        continue;
      }
      const target = centroidX <= splitOffset ? leftAttributes : rightAttributes;
      Object.entries(sourceAttributes).forEach(([name, attribute]) => {
        const bucket = target[name];
        const itemSize = attribute.itemSize || 1;
        for (let vertexOffset = 0; vertexOffset < 3; vertexOffset += 1) {
          const vertexIndex = triVertex + vertexOffset;
          for (let component = 0; component < itemSize; component += 1) {
            bucket.push(attribute.array[vertexIndex * itemSize + component]);
          }
        }
      });
    }
    if (nonIndexed == null ? void 0 : nonIndexed.dispose) nonIndexed.dispose();
    if (!((_b = leftAttributes.position) == null ? void 0 : _b.length) && !((_c = rightAttributes.position) == null ? void 0 : _c.length)) {
      return null;
    }
    let leftGeometry = null;
    let rightGeometry = null;
    if ((_d = leftAttributes.position) == null ? void 0 : _d.length) {
      leftGeometry = buildGeometryFromAttributeArrays(THREE, sourceAttributes, leftAttributes);
    }
    if ((_e = rightAttributes.position) == null ? void 0 : _e.length) {
      rightGeometry = buildGeometryFromAttributeArrays(THREE, sourceAttributes, rightAttributes);
    }
    return { left: leftGeometry, right: rightGeometry };
  }
  function splitPairWingGeometry(THREE, sourceGeometry) {
    const split = splitGeometryByPlane(THREE, sourceGeometry);
    let leftGeometry = (split == null ? void 0 : split.left) || null;
    let rightGeometry = (split == null ? void 0 : split.right) || null;
    if (!leftGeometry && rightGeometry) {
      leftGeometry = rightGeometry.clone();
      leftGeometry.scale(-1, 1, 1);
    } else if (!rightGeometry && leftGeometry) {
      rightGeometry = leftGeometry.clone();
      rightGeometry.scale(-1, 1, 1);
    }
    return leftGeometry && rightGeometry ? { left: leftGeometry, right: rightGeometry } : null;
  }
  function measureGeometrySideMetrics(THREE, geometry) {
    var _a;
    if (!((_a = geometry == null ? void 0 : geometry.attributes) == null ? void 0 : _a.position)) {
      return null;
    }
    const box = new THREE.Box3();
    const position = geometry.attributes.position;
    const sample = new THREE.Vector3();
    for (let index = 0; index < position.count; index += 1) {
      sample.set(position.getX(index), position.getY(index), position.getZ(index));
      box.expandByPoint(sample);
    }
    const size = new THREE.Vector3();
    box.getSize(size);
    return {
      vertexCount: position.count || 0,
      diagonal: Math.max(size.length(), 1e-4),
      width: Math.max(size.x, 1e-4),
      height: Math.max(size.y, 1e-4),
      depth: Math.max(size.z, 1e-4)
    };
  }
  function shouldTreatSplitAsWingPair(THREE, split) {
    const leftMetrics = measureGeometrySideMetrics(THREE, split == null ? void 0 : split.left);
    const rightMetrics = measureGeometrySideMetrics(THREE, split == null ? void 0 : split.right);
    if (!leftMetrics || !rightMetrics) {
      return false;
    }
    const vertexRatio = Math.min(leftMetrics.vertexCount, rightMetrics.vertexCount) / Math.max(leftMetrics.vertexCount, rightMetrics.vertexCount, 1);
    const diagonalRatio = Math.min(leftMetrics.diagonal, rightMetrics.diagonal) / Math.max(leftMetrics.diagonal, rightMetrics.diagonal, 1e-4);
    const heightRatio = Math.min(leftMetrics.height, rightMetrics.height) / Math.max(leftMetrics.height, rightMetrics.height, 1e-4);
    const depthRatio = Math.min(leftMetrics.depth, rightMetrics.depth) / Math.max(leftMetrics.depth, rightMetrics.depth, 1e-4);
    return vertexRatio >= 0.68 && diagonalRatio >= 0.8 && heightRatio >= 0.82 && depthRatio >= 0.55;
  }
  function normalizeWingPivotFromSeam(THREE, geometry) {
    var _a;
    if (!((_a = geometry == null ? void 0 : geometry.attributes) == null ? void 0 : _a.position)) {
      return;
    }
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox;
    const position = geometry.attributes.position;
    const spanX = Math.max(1e-4, bounds.max.x - bounds.min.x);
    const seamThreshold = Math.max(1e-3, spanX * 0.1);
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    let count = 0;
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      if (Math.abs(x) > seamThreshold) {
        continue;
      }
      sumX += x;
      sumY += position.getY(index);
      sumZ += position.getZ(index);
      count += 1;
    }
    if (count < 4) {
      const relaxedThreshold = Math.max(seamThreshold, spanX * 0.24);
      for (let index = 0; index < position.count; index += 1) {
        const x = position.getX(index);
        if (Math.abs(x) > relaxedThreshold) {
          continue;
        }
        sumX += x;
        sumY += position.getY(index);
        sumZ += position.getZ(index);
        count += 1;
      }
    }
    if (count <= 0) {
      const center = bounds.getCenter(new THREE.Vector3());
      geometry.translate(-center.x * 0.06, -center.y * 0.18, -center.z);
      geometry.computeBoundingBox();
      return;
    }
    geometry.translate(-(sumX / count), -(sumY / count), -(sumZ / count));
    geometry.computeBoundingBox();
  }
  function prepareWingGeometryForSocketAttachment(THREE, sourceGeometry) {
    var _a;
    if (!((_a = sourceGeometry == null ? void 0 : sourceGeometry.attributes) == null ? void 0 : _a.position)) {
      return null;
    }
    const geometry = sourceGeometry.index ? sourceGeometry.toNonIndexed() : sourceGeometry.clone();
    normalizeWingPivotFromSeam(THREE, geometry);
    if (!geometry.attributes.normal) {
      geometry.computeVertexNormals();
    }
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }
  function createRootLocalBakedGeometry(sourceRoot, node) {
    var _a, _b;
    if (!((_b = (_a = node == null ? void 0 : node.geometry) == null ? void 0 : _a.attributes) == null ? void 0 : _b.position)) {
      return null;
    }
    sourceRoot.updateMatrixWorld(true);
    node.updateWorldMatrix(true, false);
    const bakedGeometry = node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone();
    const rootInverse = sourceRoot.matrixWorld.clone().invert();
    const bakedMatrix = rootInverse.multiply(node.matrixWorld.clone());
    bakedGeometry.applyMatrix4(bakedMatrix);
    if (!bakedGeometry.attributes.normal) {
      bakedGeometry.computeVertexNormals();
    }
    bakedGeometry.computeBoundingBox();
    bakedGeometry.computeBoundingSphere();
    return bakedGeometry;
  }
  function cloneMaterialForMesh(THREE, materialTemplate) {
    var _a;
    const sourceMaterial = Array.isArray(materialTemplate) ? materialTemplate[0] || null : materialTemplate;
    const cloned = ((_a = sourceMaterial == null ? void 0 : sourceMaterial.clone) == null ? void 0 : _a.call(sourceMaterial)) || sourceMaterial || null;
    if (!cloned) {
      return null;
    }
    cloned.side = THREE.DoubleSide;
    if ("shadowSide" in cloned) {
      cloned.shadowSide = THREE.DoubleSide;
    }
    cloned.needsUpdate = true;
    return cloned;
  }
  function createSafePreviewDisplayMaterial(THREE, material) {
    var _a, _b, _c, _d;
    if (!material) {
      return material;
    }
    if (material.isPointsMaterial || material.isLineBasicMaterial || material.isLineDashedMaterial) {
      const cloned = ((_a = material.clone) == null ? void 0 : _a.call(material)) || material;
      if ((_b = cloned.color) == null ? void 0 : _b.isColor) {
        cloned.color = cloned.color.clone();
      }
      cloned.transparent = material.transparent === true || Number.isFinite(material.opacity) && material.opacity < 1;
      if (Number.isFinite(material.opacity)) {
        cloned.opacity = material.opacity;
      }
      cloned.depthWrite = material.depthWrite !== false;
      cloned.depthTest = material.depthTest !== false;
      return cloned;
    }
    const previewColor = ((_c = material.color) == null ? void 0 : _c.isColor) ? material.color.clone() : new THREE.Color(16777215);
    const sourceEmissive = ((_d = material.emissive) == null ? void 0 : _d.isColor) ? material.emissive.clone() : new THREE.Color(0);
    const emissiveStrength = sourceEmissive.r * sourceEmissive.r + sourceEmissive.g * sourceEmissive.g + sourceEmissive.b * sourceEmissive.b;
    const previewEmissive = emissiveStrength > 2e-4 ? sourceEmissive : new THREE.Color(0);
    const previewOpacity = Number.isFinite(material.opacity) ? material.opacity : 1;
    const previewTransparent = material.transparent === true || previewOpacity < 1 || (material.alphaTest || 0) > 0;
    const previewMaterial = new THREE.MeshStandardMaterial({
      name: material.name ? `${material.name}__preview` : "preview-material",
      color: previewColor,
      map: material.map || null,
      alphaMap: material.alphaMap || null,
      aoMap: material.aoMap || null,
      emissiveMap: material.emissiveMap || null,
      lightMap: material.lightMap || null,
      metalnessMap: material.metalnessMap || null,
      roughnessMap: material.roughnessMap || null,
      opacity: previewOpacity,
      transparent: previewTransparent,
      alphaTest: material.alphaTest || 0,
      side: THREE.DoubleSide,
      depthWrite: material.depthWrite !== false,
      depthTest: material.depthTest !== false,
      colorWrite: true,
      metalness: Number.isFinite(material.metalness) ? Math.min(material.metalness, 0.16) : 0.08,
      roughness: Number.isFinite(material.roughness) ? Math.min(Math.max(material.roughness, 0.32), 0.72) : 0.56,
      emissive: previewEmissive,
      emissiveIntensity: Number.isFinite(material.emissiveIntensity) ? material.emissiveIntensity : 0,
      fog: material.fog !== false,
      vertexColors: material.vertexColors === true,
      wireframe: material.wireframe === true
    });
    if (previewMaterial.map) {
      previewMaterial.map.needsUpdate = true;
    }
    if (previewMaterial.emissiveMap) {
      previewMaterial.emissiveMap.needsUpdate = true;
    }
    if (previewMaterial.lightMap) {
      previewMaterial.lightMap.needsUpdate = true;
    }
    if (previewMaterial.aoMap) {
      previewMaterial.aoMapIntensity = Number.isFinite(material.aoMapIntensity) ? material.aoMapIntensity : 1;
    }
    if ("envMapIntensity" in previewMaterial) {
      previewMaterial.envMapIntensity = 0.32;
    }
    return previewMaterial;
  }
  function ensurePreviewDisplayGeometryRenderable(root) {
    if (!root) {
      return root;
    }
    root.traverse((node) => {
      var _a, _b, _c, _d, _e, _f, _g;
      if (!(node == null ? void 0 : node.isMesh) || !node.geometry) {
        return;
      }
      const positionCount = Number.isFinite((_c = (_b = (_a = node.geometry) == null ? void 0 : _a.attributes) == null ? void 0 : _b.position) == null ? void 0 : _c.count) ? node.geometry.attributes.position.count : 0;
      const indexCount = Number.isFinite((_e = (_d = node.geometry) == null ? void 0 : _d.index) == null ? void 0 : _e.count) ? node.geometry.index.count : 0;
      const currentDrawRangeCount = Number.isFinite((_g = (_f = node.geometry) == null ? void 0 : _f.drawRange) == null ? void 0 : _g.count) ? node.geometry.drawRange.count : 0;
      if (currentDrawRangeCount > 0) {
        return;
      }
      const fallbackCount = indexCount > 0 ? indexCount : positionCount;
      if (fallbackCount > 0 && typeof node.geometry.setDrawRange === "function") {
        node.geometry.setDrawRange(0, fallbackCount);
      }
    });
    return root;
  }
  function enhancePreviewDisplayMaterials(THREE, root) {
    if (!root) {
      return root;
    }
    ensurePreviewDisplayGeometryRenderable(root);
    root.traverse((node) => {
      if (!(node == null ? void 0 : node.isMesh) && !(node == null ? void 0 : node.isPoints) && !(node == null ? void 0 : node.isLine) && !(node == null ? void 0 : node.isLineSegments) && !(node == null ? void 0 : node.isInstancedMesh)) {
        return;
      }
      const sourceMaterials = Array.isArray(node.material) ? node.material : [node.material];
      const previewMaterials = sourceMaterials.map((material) => createSafePreviewDisplayMaterial(THREE, material));
      node.material = Array.isArray(node.material) ? previewMaterials : previewMaterials[0];
      node.renderOrder = Math.max(Number.isFinite(node.renderOrder) ? node.renderOrder : 0, 4);
      if ("castShadow" in node) {
        node.castShadow = false;
      }
      if ("receiveShadow" in node) {
        node.receiveShadow = false;
      }
      node.frustumCulled = false;
    });
    return root;
  }
  function translateWingRootChildren(root, offset) {
    if (!root || !offset) {
      return;
    }
    root.children.forEach((child) => {
      child.position.sub(offset);
    });
  }
  function normalizeWingRootPivotFromSeam(THREE, root, sourceSide = "left") {
    var _a;
    if (!((_a = root == null ? void 0 : root.children) == null ? void 0 : _a.length)) {
      return root;
    }
    root.updateMatrixWorld(true);
    const { box, center, size } = computeRenderableMeshBounds(THREE, root);
    if (!box || box.isEmpty()) {
      return root;
    }
    const seamX = sourceSide === "right" ? box.min.x : box.max.x;
    const threshold = Math.max(4e-3, size.x * 0.08);
    const sample = new THREE.Vector3();
    const pivot = new THREE.Vector3();
    let sampleCount = 0;
    root.traverse((node) => {
      var _a2, _b;
      const position = (_b = (_a2 = node == null ? void 0 : node.geometry) == null ? void 0 : _a2.attributes) == null ? void 0 : _b.position;
      if (!(node == null ? void 0 : node.isMesh) || !position) {
        return;
      }
      for (let index = 0; index < position.count; index += 1) {
        sample.set(position.getX(index), position.getY(index), position.getZ(index));
        if (node.matrixAutoUpdate !== false) {
          sample.applyMatrix4(node.matrix);
        }
        if (Math.abs(sample.x - seamX) > threshold) {
          continue;
        }
        pivot.add(sample);
        sampleCount += 1;
      }
    });
    if (sampleCount > 0) {
      pivot.divideScalar(sampleCount);
      translateWingRootChildren(root, pivot);
      return root;
    }
    const fallbackOffset = center.clone();
    fallbackOffset.x = seamX;
    translateWingRootChildren(root, fallbackOffset);
    return root;
  }
  function buildIsolatedWingRootFromScene({
    THREE,
    root,
    sourceSide = "left",
    splitOffset = 0,
    trimMargin = 0.02
  }) {
    var _a;
    if (!root) {
      return null;
    }
    const isolatedRoot = new THREE.Group();
    const wantedSide = sourceSide === "right" ? "right" : "left";
    let contributedMeshCount = 0;
    root.updateMatrixWorld(true);
    root.traverse((node) => {
      var _a2, _b, _c, _d, _e, _f, _g, _h;
      if (!(node == null ? void 0 : node.isMesh) || node.visible === false || !((_b = (_a2 = node.geometry) == null ? void 0 : _a2.attributes) == null ? void 0 : _b.position)) {
        return;
      }
      const bakedGeometry = createRootLocalBakedGeometry(root, node);
      if (!((_c = bakedGeometry == null ? void 0 : bakedGeometry.attributes) == null ? void 0 : _c.position)) {
        return;
      }
      bakedGeometry.computeBoundingBox();
      const bounds = bakedGeometry.boundingBox;
      const isWholeLeft = bounds.max.x <= splitOffset - trimMargin;
      const isWholeRight = bounds.min.x >= splitOffset + trimMargin;
      let geometryForSide = null;
      if (wantedSide === "left" && isWholeLeft) {
        geometryForSide = bakedGeometry;
      } else if (wantedSide === "right" && isWholeRight) {
        geometryForSide = bakedGeometry;
      } else if (wantedSide === "left" && isWholeRight) {
        (_d = bakedGeometry.dispose) == null ? void 0 : _d.call(bakedGeometry);
        return;
      } else if (wantedSide === "right" && isWholeLeft) {
        (_e = bakedGeometry.dispose) == null ? void 0 : _e.call(bakedGeometry);
        return;
      } else {
        const split = splitGeometryByPlane(THREE, bakedGeometry, { splitOffset, trimMargin });
        (_f = bakedGeometry.dispose) == null ? void 0 : _f.call(bakedGeometry);
        geometryForSide = wantedSide === "right" ? split == null ? void 0 : split.right : split == null ? void 0 : split.left;
      }
      if (!((_g = geometryForSide == null ? void 0 : geometryForSide.attributes) == null ? void 0 : _g.position) || geometryForSide.attributes.position.count < 3) {
        (_h = geometryForSide == null ? void 0 : geometryForSide.dispose) == null ? void 0 : _h.call(geometryForSide);
        return;
      }
      if (!geometryForSide.attributes.normal) {
        geometryForSide.computeVertexNormals();
      }
      geometryForSide.computeBoundingBox();
      geometryForSide.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometryForSide, cloneMaterialForMesh(THREE, node.material));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      isolatedRoot.add(mesh);
      contributedMeshCount += 1;
    });
    if (!contributedMeshCount) {
      const sourceEntry = getLargestMeshEntryFromObject(root);
      const fallbackGeometry = (sourceEntry == null ? void 0 : sourceEntry.geometry) ? (_a = splitGeometryByPlane(THREE, sourceEntry.geometry, { splitOffset, trimMargin })) == null ? void 0 : _a[wantedSide] : null;
      const preparedGeometry = fallbackGeometry ? prepareWingGeometryForSocketAttachment(THREE, fallbackGeometry) : null;
      if (!preparedGeometry) {
        return null;
      }
      const mesh = new THREE.Mesh(preparedGeometry, cloneMaterialForMesh(THREE, sourceEntry.material));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      isolatedRoot.add(mesh);
    }
    normalizeWingRootPivotFromSeam(THREE, isolatedRoot, wantedSide);
    isolatedRoot.updateMatrixWorld(true);
    return isolatedRoot;
  }
  function buildWingAuthoringTemplateState({
    THREE,
    sourceRoot = null,
    sourcePair = null,
    authoring = null
  }) {
    const normalizedAuthoring = normalizeWingAuthoringPreview(authoring);
    const hasSourcePair = Boolean((sourcePair == null ? void 0 : sourcePair.left) && (sourcePair == null ? void 0 : sourcePair.right));
    if (normalizedAuthoring.mode !== "isolatedHalf") {
      return {
        draftTemplateRoot: sourceRoot || null,
        draftTemplatePair: hasSourcePair ? { left: sourcePair.left, right: sourcePair.right } : null,
        sourceKind: hasSourcePair ? "pair" : sourceRoot ? "root" : "empty",
        authoring: normalizedAuthoring,
        failed: false
      };
    }
    if (hasSourcePair) {
      const isolatedSource = normalizedAuthoring.sourceSide === "right" ? sourcePair.right : sourcePair.left;
      const mirroredPair = normalizedAuthoring.mirrorToBoth ? buildMirroredWingPairFromIsolatedSource(isolatedSource, normalizedAuthoring.sourceSide) : null;
      return {
        draftTemplateRoot: mirroredPair ? null : isolatedSource || null,
        draftTemplatePair: mirroredPair,
        sourceKind: "pair",
        authoring: normalizedAuthoring,
        failed: normalizedAuthoring.mirrorToBoth ? !mirroredPair : !isolatedSource
      };
    }
    if (!sourceRoot) {
      return {
        draftTemplateRoot: null,
        draftTemplatePair: null,
        sourceKind: "empty",
        authoring: normalizedAuthoring,
        failed: true
      };
    }
    const isolatedRoot = buildIsolatedWingRootFromScene({
      THREE,
      root: sourceRoot,
      sourceSide: normalizedAuthoring.sourceSide,
      splitOffset: normalizedAuthoring.splitOffset,
      trimMargin: normalizedAuthoring.trimMargin
    });
    if (normalizedAuthoring.mirrorToBoth && isolatedRoot) {
      const mirroredPair = buildMirroredWingPairFromIsolatedSource(isolatedRoot, normalizedAuthoring.sourceSide);
      return {
        draftTemplateRoot: null,
        draftTemplatePair: mirroredPair,
        sourceKind: "root",
        authoring: normalizedAuthoring,
        failed: !mirroredPair
      };
    }
    return {
      draftTemplateRoot: isolatedRoot || sourceRoot,
      draftTemplatePair: null,
      sourceKind: "root",
      authoring: normalizedAuthoring,
      failed: !isolatedRoot
    };
  }
  function createWingTemplateRootFromGeometry(THREE, geometry, materialTemplate) {
    if (!geometry || !materialTemplate) {
      return null;
    }
    const mesh = new THREE.Mesh(geometry, cloneMaterialForMesh(THREE, materialTemplate));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const templateRoot = new THREE.Group();
    templateRoot.add(mesh);
    return templateRoot;
  }
  function buildWingTemplateStateFromScene(THREE, sceneRoot) {
    if (!sceneRoot) {
      return {
        sourceTemplateRoot: null,
        sourceTemplatePair: null
      };
    }
    const sourceEntry = getLargestMeshEntryFromObject(sceneRoot);
    if (!(sourceEntry == null ? void 0 : sourceEntry.geometry)) {
      return {
        sourceTemplateRoot: cloneSceneGraph(sceneRoot),
        sourceTemplatePair: null
      };
    }
    const split = splitPairWingGeometry(THREE, sourceEntry.geometry);
    const hasBalancedPair = shouldTreatSplitAsWingPair(THREE, split);
    const materialTemplate = cloneMaterialTemplate(sourceEntry.material);
    if (!materialTemplate) {
      return {
        sourceTemplateRoot: cloneSceneGraph(sceneRoot),
        sourceTemplatePair: null
      };
    }
    const leftGeometry = hasBalancedPair && (split == null ? void 0 : split.left) ? prepareWingGeometryForSocketAttachment(THREE, split.left) : prepareWingGeometryForSocketAttachment(THREE, sourceEntry.geometry);
    const rightGeometry = hasBalancedPair && (split == null ? void 0 : split.right) ? prepareWingGeometryForSocketAttachment(THREE, split.right) : null;
    const leftRoot = createWingTemplateRootFromGeometry(THREE, leftGeometry, materialTemplate);
    const rightRoot = createWingTemplateRootFromGeometry(THREE, rightGeometry, materialTemplate);
    if (leftRoot && rightRoot) {
      return {
        sourceTemplateRoot: null,
        sourceTemplatePair: {
          left: leftRoot,
          right: rightRoot
        }
      };
    }
    return {
      sourceTemplateRoot: leftRoot || cloneSceneGraph(sceneRoot),
      sourceTemplatePair: null
    };
  }
  async function loadWingTemplateState({ GLTFLoader, THREE, assetUrl }) {
    const sceneRoot = await loadGlbScene({ GLTFLoader, assetUrl });
    return buildWingTemplateStateFromScene(THREE, sceneRoot);
  }
  async function loadWingTemplateRoot({ GLTFLoader, THREE, assetUrl }) {
    var _a;
    const templateState = await loadWingTemplateState({ GLTFLoader, THREE, assetUrl });
    return templateState.sourceTemplateRoot || ((_a = templateState.sourceTemplatePair) == null ? void 0 : _a.left) || null;
  }
  function buildPreviewGroup({ THREE, templateRoot, templatePair = null, attachment, mirrorMode }) {
    const previewRoot = new THREE.Group();
    const previewContent = new THREE.Group();
    previewRoot.add(previewContent);
    previewRoot.userData.previewContent = previewContent;
    if (mirrorMode === "paired") {
      const left = new THREE.Group();
      const right = new THREE.Group();
      applyAttachmentTransform(left, buildMirroredAttachmentTransform(attachment, -1));
      applyAttachmentTransform(right, buildMirroredAttachmentTransform(attachment, 1));
      const leftModel = (templatePair == null ? void 0 : templatePair.left) ? cloneSceneGraph(templatePair.left) : templateRoot ? cloneSceneGraph(templateRoot) : null;
      const rightModel = (templatePair == null ? void 0 : templatePair.right) ? cloneSceneGraph(templatePair.right) : templateRoot ? cloneSceneGraph(templateRoot) : null;
      if (!leftModel || !rightModel) {
        return previewRoot;
      }
      if (!templatePair) {
        rightModel.scale.x *= -1;
      }
      left.add(leftModel);
      right.add(rightModel);
      previewContent.add(left);
      previewContent.add(right);
      previewRoot.userData.left = left;
      previewRoot.userData.right = right;
    } else {
      const pivot = new THREE.Group();
      applyAttachmentTransform(pivot, attachment);
      pivot.add(cloneSceneGraph(templateRoot));
      previewContent.add(pivot);
      previewRoot.userData.anchor = pivot;
    }
    enhancePreviewDisplayMaterials(THREE, previewContent);
    return previewRoot;
  }
  function createRuntimeGlbPropFactory({
    THREE,
    GLTFLoader,
    slotAnchors,
    label,
    assetUrl,
    slotKey,
    attachment,
    preview = null
  }) {
    const mirrorMode = (attachment == null ? void 0 : attachment.mirrorMode) === "paired" ? "paired" : "single";
    const wingAuthoringPreview = slotKey === "wingSet" ? normalizeWingAuthoringPreview(preview == null ? void 0 : preview.wingAuthoring, { defaultMirrorToBoth: mirrorMode === "paired" }) : DEFAULT_WING_AUTHORING_PREVIEW;
    const effectiveMirrorMode = slotKey === "wingSet" && wingAuthoringPreview.mode === "isolatedHalf" ? wingAuthoringPreview.mirrorToBoth ? "paired" : "single" : mirrorMode;
    const singleWingSide = wingAuthoringPreview.sourceSide === "right" ? "right" : "left";
    const shouldUseWingTemplate = effectiveMirrorMode === "paired" && slotKey === "wingSet" && wingAuthoringPreview.mode !== "isolatedHalf";
    const loadState = {
      promise: null,
      sourceTemplateRoot: null,
      sourceTemplatePair: null,
      presentedTemplateRoot: null,
      presentedTemplatePair: null,
      previewSceneRoot: null
    };
    const ensureSourceTemplateState = async () => {
      if (loadState.sourceTemplateRoot || loadState.sourceTemplatePair) {
        return {
          sourceTemplateRoot: loadState.sourceTemplateRoot,
          sourceTemplatePair: loadState.sourceTemplatePair
        };
      }
      if (!loadState.promise) {
        loadState.promise = (shouldUseWingTemplate ? loadWingTemplateState({ GLTFLoader, THREE, assetUrl }) : loadGlbScene({ GLTFLoader, assetUrl }).then((sceneRoot) => {
          if (!sceneRoot) {
            throw new Error(`${label} did not contain a scene root.`);
          }
          const templateRoot = cloneSceneGraph(sceneRoot);
          centerObjectAtOrigin(THREE, templateRoot);
          return {
            sourceTemplateRoot: templateRoot,
            sourceTemplatePair: null
          };
        })).then((templateState) => {
          if (!(templateState == null ? void 0 : templateState.sourceTemplateRoot) && !(templateState == null ? void 0 : templateState.sourceTemplatePair)) {
            throw new Error(`${label} could not prepare a runtime template.`);
          }
          loadState.sourceTemplateRoot = templateState.sourceTemplateRoot || null;
          loadState.sourceTemplatePair = templateState.sourceTemplatePair || null;
          return {
            sourceTemplateRoot: loadState.sourceTemplateRoot,
            sourceTemplatePair: loadState.sourceTemplatePair
          };
        });
      }
      return loadState.promise;
    };
    const ensurePresentedTemplateState = async () => {
      const sourceTemplateState = await ensureSourceTemplateState();
      const sourceTemplateRoot = (sourceTemplateState == null ? void 0 : sourceTemplateState.sourceTemplateRoot) || null;
      const sourceTemplatePair = (sourceTemplateState == null ? void 0 : sourceTemplateState.sourceTemplatePair) || null;
      if (slotKey !== "wingSet") {
        loadState.presentedTemplateRoot = sourceTemplateRoot;
        loadState.presentedTemplatePair = null;
        return {
          draftTemplateRoot: loadState.presentedTemplateRoot,
          draftTemplatePair: null
        };
      }
      const authoredTemplateState = buildWingAuthoringTemplateState({
        THREE,
        sourceRoot: sourceTemplateRoot,
        sourcePair: sourceTemplatePair,
        authoring: wingAuthoringPreview
      });
      loadState.presentedTemplateRoot = (authoredTemplateState == null ? void 0 : authoredTemplateState.draftTemplateRoot) || sourceTemplateRoot;
      loadState.presentedTemplatePair = (authoredTemplateState == null ? void 0 : authoredTemplateState.draftTemplatePair) || sourceTemplatePair || null;
      return {
        draftTemplateRoot: loadState.presentedTemplateRoot,
        draftTemplatePair: loadState.presentedTemplatePair
      };
    };
    const shouldUseRawPreviewScene = slotKey !== "wingSet" || slotKey === "wingSet" && wingAuthoringPreview.mode !== "isolatedHalf" && effectiveMirrorMode === "paired";
    const ensurePreviewSceneRoot = async () => {
      if (loadState.previewSceneRoot) {
        return loadState.previewSceneRoot;
      }
      const sceneRoot = await loadGlbScene({ GLTFLoader, assetUrl });
      if (!sceneRoot) {
        throw new Error(`${label} did not contain a previewable scene root.`);
      }
      const previewSceneRoot = cloneSceneGraph(sceneRoot);
      centerObjectAtOrigin(THREE, previewSceneRoot);
      enhancePreviewDisplayMaterials(THREE, previewSceneRoot);
      previewSceneRoot.updateMatrixWorld(true);
      loadState.previewSceneRoot = previewSceneRoot;
      return loadState.previewSceneRoot;
    };
    return function makeRuntimeGlbProp() {
      const group = new THREE.Group();
      const slotAnchor = slotAnchors[slotKey];
      if (effectiveMirrorMode === "paired" && (slotAnchor == null ? void 0 : slotAnchor.left) && (slotAnchor == null ? void 0 : slotAnchor.right)) {
        const leftPivot = new THREE.Group();
        const rightPivot = new THREE.Group();
        applyAttachmentTransform(leftPivot, buildMirroredAttachmentTransform(attachment, -1));
        applyAttachmentTransform(rightPivot, buildMirroredAttachmentTransform(attachment, 1));
        slotAnchor.left.add(leftPivot);
        slotAnchor.right.add(rightPivot);
        group.userData.left = leftPivot;
        group.userData.right = rightPivot;
        group.userData.ensureEquippedReady = async () => {
          const templateState = await ensurePresentedTemplateState();
          const templatePair = templateState == null ? void 0 : templateState.draftTemplatePair;
          const templateRoot = templateState == null ? void 0 : templateState.draftTemplateRoot;
          if (leftPivot.userData.loaded && rightPivot.userData.loaded) return;
          leftPivot.clear();
          rightPivot.clear();
          const leftModel = (templatePair == null ? void 0 : templatePair.left) ? cloneSceneGraph(templatePair.left) : templateRoot ? cloneSceneGraph(templateRoot) : null;
          const rightModel = (templatePair == null ? void 0 : templatePair.right) ? cloneSceneGraph(templatePair.right) : templateRoot ? cloneSceneGraph(templateRoot) : null;
          if (!leftModel || !rightModel) return;
          if (!templatePair) {
            rightModel.scale.x *= -1;
          }
          leftPivot.add(leftModel);
          rightPivot.add(rightModel);
          leftPivot.userData.loaded = true;
          rightPivot.userData.loaded = true;
        };
      } else if (slotKey === "wingSet" && (slotAnchor == null ? void 0 : slotAnchor.left) && (slotAnchor == null ? void 0 : slotAnchor.right)) {
        const pivot = new THREE.Group();
        applyAttachmentTransform(pivot, buildSingleWingAttachmentTransform(attachment, singleWingSide));
        const activeAnchor = singleWingSide === "right" ? slotAnchor.right : slotAnchor.left;
        activeAnchor.add(pivot);
        group.userData.anchor = pivot;
        group.userData.side = singleWingSide;
        group.userData.ensureEquippedReady = async () => {
          const templateState = await ensurePresentedTemplateState();
          const templateRoot = templateState == null ? void 0 : templateState.draftTemplateRoot;
          if (pivot.userData.loaded || !templateRoot) return;
          pivot.clear();
          pivot.add(cloneSceneGraph(templateRoot));
          pivot.userData.loaded = true;
        };
      } else if (slotAnchor == null ? void 0 : slotAnchor.anchor) {
        const pivot = new THREE.Group();
        applyAttachmentTransform(pivot, attachment);
        slotAnchor.anchor.add(pivot);
        group.userData.anchor = pivot;
        group.userData.ensureEquippedReady = async () => {
          const templateState = await ensurePresentedTemplateState();
          const templateRoot = templateState == null ? void 0 : templateState.draftTemplateRoot;
          if (pivot.userData.loaded) return;
          pivot.clear();
          pivot.add(cloneSceneGraph(templateRoot));
          pivot.userData.loaded = true;
        };
      } else {
        group.userData.ensureEquippedReady = async () => null;
      }
      group.userData.ensurePreviewReady = async () => {
        const previewTasks = [ensurePresentedTemplateState()];
        if (shouldUseRawPreviewScene) {
          previewTasks.push(ensurePreviewSceneRoot());
        }
        const [presentedTemplateState] = await Promise.all(previewTasks);
        return presentedTemplateState;
      };
      group.userData.createPreviewObject = () => {
        if (shouldUseRawPreviewScene && loadState.previewSceneRoot) {
          const previewWrapper = new THREE.Group();
          const previewContent = cloneSceneGraph(loadState.previewSceneRoot);
          previewWrapper.add(previewContent);
          previewWrapper.userData.previewContent = previewContent;
          return previewWrapper;
        }
        return loadState.presentedTemplateRoot || loadState.presentedTemplatePair ? buildPreviewGroup({
          THREE,
          templateRoot: loadState.presentedTemplateRoot,
          templatePair: loadState.presentedTemplatePair,
          attachment,
          mirrorMode: effectiveMirrorMode
        }) : null;
      };
      return group;
    };
  }
  var glbSceneSourceCache, DEFAULT_WING_AUTHORING_PREVIEW, DEFAULT_WING_MOTION_CHANNEL, DEFAULT_WING_MOTION_PREVIEW;
  var init_homepage_gltf_props = __esm({
    "public/HomePageAPP/src/runtime/homepage-gltf-props.js"() {
      glbSceneSourceCache = /* @__PURE__ */ new Map();
      DEFAULT_WING_AUTHORING_PREVIEW = Object.freeze({
        mode: "originalPair",
        sourceSide: "left",
        mirrorToBoth: true,
        splitOffset: 0,
        trimMargin: 0.02
      });
      DEFAULT_WING_MOTION_CHANNEL = Object.freeze({
        flapHz: 0.85,
        direction: "normal",
        amplitude: 1,
        sweep: 1,
        pitch: 0,
        featherTwist: 1,
        shoulderSpread: 0,
        phaseOffset: 0
      });
      DEFAULT_WING_MOTION_PREVIEW = Object.freeze({
        linked: true,
        master: DEFAULT_WING_MOTION_CHANNEL,
        left: null,
        right: null
      });
    }
  });

  // public/HomePageAPP/src/inventory/catalog/inventory-config.js
  var inventory_config_exports = {};
  __export(inventory_config_exports, {
    INVENTORY_CONFIG: () => INVENTORY_CONFIG
  });
  var INVENTORY_CONFIG;
  var init_inventory_config = __esm({
    "public/HomePageAPP/src/inventory/catalog/inventory-config.js"() {
      INVENTORY_CONFIG = Object.freeze({
        defaultCategory: "wingSet",
        perCategoryLimit: 5,
        categories: Object.freeze([
          Object.freeze({ key: "wingSet", label: "Wing Set", slotKey: "wingSet", equipLimit: 1, sortOrder: 0, enabled: true }),
          Object.freeze({ key: "headWear", label: "Headwear", slotKey: "headWear", equipLimit: 1, sortOrder: 1, enabled: true }),
          Object.freeze({ key: "bodyAccessory", label: "Body Gear", slotKey: "bodyAccessory", equipLimit: 1, sortOrder: 2, enabled: true })
        ])
      });
    }
  });

  // public/HomePageAPP/src/inventory/catalog/prop-catalog.js
  var prop_catalog_exports = {};
  __export(prop_catalog_exports, {
    PROP_CATALOG: () => PROP_CATALOG
  });
  var freezeTuple, createAttachmentFit, createWingAttachment, createSingleAttachment, previewKind, WING_ATTACHMENTS, SINGLE_ATTACHMENTS, PROP_CATALOG;
  var init_prop_catalog = __esm({
    "public/HomePageAPP/src/inventory/catalog/prop-catalog.js"() {
      freezeTuple = (values) => Object.freeze([...values]);
      createAttachmentFit = ({ yOffsetRatio, zOffsetRatio, distanceMultiplier, initialRotationY }) => Object.freeze({
        yOffsetRatio,
        zOffsetRatio,
        distanceMultiplier,
        ...typeof initialRotationY === "number" ? { initialRotationY } : {}
      });
      createWingAttachment = ({ position, rotation, scale, fit }) => Object.freeze({
        position: freezeTuple(position),
        rotation: freezeTuple(rotation),
        scale: freezeTuple(scale),
        mirrorMode: "paired",
        fit: fit ? createAttachmentFit(fit) : null
      });
      createSingleAttachment = ({ position, rotation, scale, fit = null }) => Object.freeze({
        position: freezeTuple(position),
        rotation: freezeTuple(rotation),
        scale: freezeTuple(scale),
        mirrorMode: "single",
        fit: fit ? createAttachmentFit(fit) : null
      });
      previewKind = (kind) => Object.freeze({ kind });
      WING_ATTACHMENTS = Object.freeze({
        blossomissWings: createWingAttachment({
          position: [0.78, -0.76, 0.2],
          rotation: [0.024, 0.072, -0.03],
          scale: [19.2, 19.2, 19.2],
          fit: { yOffsetRatio: 0.76, zOffsetRatio: 0.012, distanceMultiplier: 1.6, initialRotationY: 0 }
        }),
        canvasOfNavelleWings: createWingAttachment({
          position: [0.8, -0.78, 0.22],
          rotation: [0.024, 0.076, -0.032],
          scale: [19.2, 19.2, 19.2],
          fit: { yOffsetRatio: -0.04, zOffsetRatio: 0.016, distanceMultiplier: 1.26, initialRotationY: 0 }
        }),
        goddessOfValleysWings: createWingAttachment({
          position: [0.8, -0.78, 0.22],
          rotation: [0.024, 0.076, -0.032],
          scale: [19.2, 19.2, 19.2],
          fit: { yOffsetRatio: -0.3, zOffsetRatio: 0.016, distanceMultiplier: 1.22, initialRotationY: 0 }
        }),
        honeycombBloomsWings: createWingAttachment({
          position: [0.8, -0.78, 0.22],
          rotation: [0.024, 0.076, -0.032],
          scale: [19.2, 19.2, 19.2],
          fit: { yOffsetRatio: 0.14, zOffsetRatio: 0.016, distanceMultiplier: 1.2, initialRotationY: 0 }
        }),
        lavalcanoWings: createWingAttachment({
          position: [0.81, -0.82, 0.22],
          rotation: [0.022, 0.08, -0.034],
          scale: [19.2, 19.2, 19.2],
          fit: { yOffsetRatio: 0.9, zOffsetRatio: 0.012, distanceMultiplier: 1.82, initialRotationY: 0 }
        }),
        lightOfSmilesWings: createWingAttachment({
          position: [0.79, -0.77, 0.19],
          rotation: [0.023, 0.074, -0.029],
          scale: [19.2, 19.2, 19.2],
          fit: { yOffsetRatio: 0.38, zOffsetRatio: 0.012, distanceMultiplier: 1.34, initialRotationY: 0 }
        }),
        moonlightAmayaWings: createWingAttachment({
          position: [0.79, -0.77, 0.19],
          rotation: [0.023, 0.074, -0.029],
          scale: [19.2, 19.2, 19.2],
          fit: { yOffsetRatio: -0.16, zOffsetRatio: 0.012, distanceMultiplier: 1.22, initialRotationY: 0 }
        }),
        endlessWings: createWingAttachment({
          position: [0.8, -0.8, 0.22],
          rotation: [0.024, 0.076, -0.032],
          scale: [19.2, 19.2, 19.2],
          fit: { yOffsetRatio: 0.02, zOffsetRatio: 0.014, distanceMultiplier: 1.32, initialRotationY: 0 }
        }),
        emeraldCoenWings: createWingAttachment({
          position: [0.8, -0.78, 0.22],
          rotation: [0.024, 0.076, -0.032],
          scale: [19.2, 19.2, 19.2],
          fit: { yOffsetRatio: 0.08, zOffsetRatio: 0.016, distanceMultiplier: 1.18, initialRotationY: 0 }
        }),
        xatoriWings: createWingAttachment({
          position: [0.78, -0.76, 0.2],
          rotation: [0.024, 0.072, -0.03],
          scale: [19.2, 19.2, 19.2],
          fit: { yOffsetRatio: 0.74, zOffsetRatio: 0.01, distanceMultiplier: 1.7, initialRotationY: 0 }
        }),
        alphaWings: createWingAttachment({
          position: [0.66, -0.2, 0.24],
          rotation: [0.02, 0.04, -0.01],
          scale: [1.68, 1.68, 1.68],
          fit: { yOffsetRatio: 0.76, zOffsetRatio: 0.02, distanceMultiplier: 1.2 }
        }),
        rainbowWings: createWingAttachment({
          position: [0.86, -0.12, -0.16],
          rotation: [0, 0.045, -0.015],
          scale: [2.32, 2.32, 2.32],
          fit: { yOffsetRatio: 1.6, zOffsetRatio: 0.03, distanceMultiplier: 1.34 }
        }),
        roboticWings: createWingAttachment({
          position: [0.58, -0.34, 0.3],
          rotation: [0.02, 0.02, -0.02],
          scale: [2.58, 2.58, 2.58],
          fit: { yOffsetRatio: 0.38, zOffsetRatio: 0.016, distanceMultiplier: 1.14 }
        }),
        omegaWings: createWingAttachment({
          position: [0.3, -0.34, -1],
          rotation: [-0.05, 0.08, 0.04],
          scale: [1.3, 1.3, 1.3],
          fit: { yOffsetRatio: 0.9, zOffsetRatio: 0.026, distanceMultiplier: 1.2 }
        }),
        efernoWings: createWingAttachment({
          position: [0.58, -0.22, 0.18],
          rotation: [0.02, 0.045, -0.015],
          scale: [6.3, 6.3, 6.3],
          fit: { yOffsetRatio: 1.18, zOffsetRatio: 0.028, distanceMultiplier: 1.36 }
        })
      });
      SINGLE_ATTACHMENTS = Object.freeze({
        xioStandardCrown: createSingleAttachment({
          position: [0, 1.55, -1.65],
          rotation: [0, 0, 0],
          scale: [2.7, 2.7, 2.7]
        }),
        xioStandardBodyGear: createSingleAttachment({
          position: [0, -4, -2],
          rotation: [0, 0, 0],
          scale: [5.7, 5.7, 5.7]
        })
      });
      PROP_CATALOG = Object.freeze([
        Object.freeze({
          key: "blossomissWings",
          label: "Blossomiss Wings",
          category: "wingSet",
          prewarmPriority: 4,
          factoryId: "makeBlossomissWingsProp",
          assetUrl: "./Images/PROPS/Wings/BlossomissWings/BlossomissWings.glb",
          attachment: WING_ATTACHMENTS.blossomissWings,
          rarity: "legendaryLight",
          mysteryBoxEnabled: true,
          active: true
        }),
        Object.freeze({
          key: "canvasOfNavelleWings",
          label: "Canvas of Navelle",
          category: "wingSet",
          prewarmPriority: 4,
          factoryId: "makeCanvasOfNavelleWingsProp",
          assetUrl: "./Images/PROPS/Wings/Canvas of Navelle/CanvasOfNavelle.glb",
          attachment: WING_ATTACHMENTS.canvasOfNavelleWings,
          rarity: "legendaryDark",
          mysteryBoxEnabled: true,
          active: true
        }),
        Object.freeze({
          key: "goddessOfValleysWings",
          label: "Goddess of Valleys",
          category: "wingSet",
          prewarmPriority: 4,
          factoryId: "makeGoddessOfValleysWingsProp",
          assetUrl: "./Images/PROPS/Wings/Goddess of Valleys/GoddessOfValleys.glb",
          attachment: WING_ATTACHMENTS.goddessOfValleysWings,
          rarity: "legendaryLight",
          mysteryBoxEnabled: true,
          active: true
        }),
        Object.freeze({
          key: "honeycombBloomsWings",
          label: "Honeycomb Blooms",
          category: "wingSet",
          prewarmPriority: 4,
          factoryId: "makeHoneycombBloomsWingsProp",
          assetUrl: "./Images/PROPS/Wings/Honeycomb Blooms/HoneycombBlooms.glb",
          attachment: WING_ATTACHMENTS.honeycombBloomsWings,
          rarity: "legendaryLight",
          mysteryBoxEnabled: true,
          active: true
        }),
        Object.freeze({
          key: "lavalcanoWings",
          label: "Lavalcano Wings",
          category: "wingSet",
          prewarmPriority: 4,
          factoryId: "makeLavalcanoWingsProp",
          assetUrl: "./Images/PROPS/Wings/LavalcanoWings/LavalcanoWings.glb",
          attachment: WING_ATTACHMENTS.lavalcanoWings,
          rarity: "legendaryDark",
          mysteryBoxEnabled: true,
          active: true
        }),
        Object.freeze({
          key: "lightOfSmilesWings",
          label: "Light of Smiles",
          category: "wingSet",
          prewarmPriority: 4,
          factoryId: "makeLightOfSmilesWingsProp",
          assetUrl: "./Images/PROPS/Wings/LightOfSmiles/LightOfSmiles.glb",
          attachment: WING_ATTACHMENTS.lightOfSmilesWings,
          rarity: "legendaryLight",
          mysteryBoxEnabled: true,
          active: true
        }),
        Object.freeze({
          key: "moonlightAmayaWings",
          label: "Moonlight Amaya",
          category: "wingSet",
          prewarmPriority: 4,
          factoryId: "makeMoonlightAmayaWingsProp",
          assetUrl: "./Images/PROPS/Wings/Moonlight Amaya/MoonlightAmaya.glb",
          attachment: WING_ATTACHMENTS.moonlightAmayaWings,
          rarity: "legendaryDark",
          mysteryBoxEnabled: true,
          active: true
        }),
        Object.freeze({
          key: "endlessWings",
          label: "Endless Wings",
          category: "wingSet",
          prewarmPriority: 4,
          factoryId: "makeEndlessWingsProp",
          assetUrl: "./Images/PROPS/Wings/EndlessWings/EndlessWings.glb",
          attachment: WING_ATTACHMENTS.endlessWings,
          rarity: "legendaryDark",
          mysteryBoxEnabled: true,
          active: true
        }),
        Object.freeze({
          key: "emeraldCoenWings",
          label: "Emerald Coen Wings",
          category: "wingSet",
          prewarmPriority: 4,
          factoryId: "makeEmeraldCoenWingsProp",
          assetUrl: "./Images/PROPS/Wings/EmeraldCoen/EmeraldCoen.glb",
          attachment: WING_ATTACHMENTS.emeraldCoenWings,
          rarity: "legendaryDark",
          mysteryBoxEnabled: true,
          active: true
        }),
        Object.freeze({
          key: "xatoriWings",
          label: "Xatori Wings",
          category: "wingSet",
          prewarmPriority: 4,
          factoryId: "makeXatoriWingsProp",
          assetUrl: "./Images/PROPS/Wings/XatoriWings/Xatori.glb",
          attachment: WING_ATTACHMENTS.xatoriWings,
          rarity: "legendaryLight",
          mysteryBoxEnabled: true,
          active: true
        }),
        Object.freeze({
          key: "alphaWings",
          label: "Alpha Wings",
          category: "wingSet",
          prewarmPriority: 4,
          factoryId: "makeAlphaWingsProp",
          attachment: WING_ATTACHMENTS.alphaWings,
          preview: previewKind("alphaWingProxy"),
          rarity: "rare",
          mysteryBoxEnabled: true,
          active: true
        }),
        Object.freeze({
          key: "rainbowWings",
          label: "Rainbow Wings",
          category: "wingSet",
          prewarmPriority: 4,
          factoryId: "makeRainbowWingsProp",
          attachment: WING_ATTACHMENTS.rainbowWings,
          preview: previewKind("rainbowWingProxy"),
          rarity: "legendary",
          mysteryBoxEnabled: true,
          active: true
        }),
        Object.freeze({
          key: "roboticWings",
          label: "Robotic Wings",
          category: "wingSet",
          prewarmPriority: 4,
          factoryId: "makeRoboticWingsProp",
          attachment: WING_ATTACHMENTS.roboticWings,
          preview: previewKind("roboticWingProxy"),
          rarity: "rare",
          mysteryBoxEnabled: true,
          active: true
        }),
        Object.freeze({
          key: "omegaWings",
          label: "Omega Wings",
          category: "wingSet",
          prewarmPriority: 4,
          factoryId: "makeOmegaWingsProp",
          attachment: WING_ATTACHMENTS.omegaWings,
          preview: previewKind("omegaWingProxy"),
          rarity: "rare",
          mysteryBoxEnabled: false,
          active: true
        }),
        Object.freeze({
          key: "efernoWings",
          label: "Eferno Wings",
          category: "wingSet",
          prewarmPriority: 4,
          factoryId: "makeEfernoWingsProp",
          assetUrl: "./Images/PROPS/Eferno/ComfyUI_00007_.glb",
          attachment: WING_ATTACHMENTS.efernoWings,
          rarity: "common",
          mysteryBoxEnabled: true,
          active: true
        }),
        Object.freeze({
          key: "optimized-glb-visual-safe-q95",
          label: "Execution Wings",
          category: "wingSet",
          prewarmPriority: 4,
          factoryId: "makeExecutionWingsProp",
          assetUrl: "./Images/PROPS/Wings/ExecutionWings/ExecutionWings.glb",
          attachment: {
            position: [0.7011, -1.3938, 0],
            rotation: [0, 0, 0],
            scale: [24.4479, 24.4479, 24.4479],
            mirrorMode: "paired"
          },
          preview: {
            wingMotion: {
              master: {
                pitch: 0,
                sweep: 1.1,
                flapHz: 0.85,
                amplitude: 0.8,
                direction: "normal",
                phaseOffset: -1.6e-3,
                featherTwist: 1,
                shoulderSpread: 0
              }
            },
            wingAuthoring: {
              mode: "isolatedHalf",
              sourceSide: "left",
              trimMargin: 0.02,
              splitOffset: 0,
              mirrorToBoth: true
            }
          },
          rarity: "legendaryLight",
          mysteryBoxEnabled: true,
          active: true
        }),
        Object.freeze({
          key: "7d757ac9af9739c111859cdb10bb9794-opt-2048",
          label: "Honeycomb Blooms",
          category: "wingSet",
          prewarmPriority: 4,
          factoryId: "makeHoneycombBloomsSavedProp",
          assetUrl: "./Images/PROPS/Wings/HoneycombBloomsSaved/HoneycombBloomsSaved.glb",
          attachment: {
            position: [0.5911, -0.1454, -0.0317],
            rotation: [0, 0, 0],
            scale: [22.5242, 22.5242, 4.9638],
            mirrorMode: "paired"
          },
          preview: {
            wingMotion: {
              master: {
                pitch: 0,
                sweep: 1.2,
                flapHz: 0.85,
                amplitude: 0.85,
                direction: "normal",
                phaseOffset: -1.6e-3,
                featherTwist: 1,
                shoulderSpread: 0
              }
            },
            wingAuthoring: {
              mode: "isolatedHalf",
              sourceSide: "left",
              trimMargin: 0.02,
              splitOffset: 0,
              mirrorToBoth: true
            }
          },
          rarity: "legendaryDark",
          mysteryBoxEnabled: false,
          active: true
        }),
        Object.freeze({
          key: "xioStandardCrown-copy",
          label: "XiO Standard Crown Copy",
          category: "headWear",
          prewarmPriority: 4,
          factoryId: "makeXioStandardCrownCopyProp",
          assetUrl: "./Images/PROPS/Headwear/XiOStandardCrown/XiOStandardCrown.glb",
          attachment: {
            position: [0, 1.2, -0.8],
            rotation: [0, 0, 0],
            scale: [2.7, 2.7, 2.7],
            mirrorMode: "single"
          },
          rarity: "legendaryLight",
          mysteryBoxEnabled: true,
          active: true,
          tags: Object.freeze(["crown", "headwear", "xio", "starter"]),
          description: "A saved XiO crown variant that keeps the earlier fitted crown transform available as its own prop."
        }),
        Object.freeze({
          key: "xioStandardCrown",
          label: "XiO Standard Crown",
          category: "headWear",
          prewarmPriority: 4,
          factoryId: "makeXioStandardCrownProp",
          assetUrl: "./Images/PROPS/Headwear/XiOStandardCrown/XiOStandardCrown.glb",
          attachment: SINGLE_ATTACHMENTS.xioStandardCrown,
          rarity: "legendaryLight",
          mysteryBoxEnabled: true,
          active: true,
          tags: Object.freeze(["crown", "headwear", "xio", "starter"]),
          description: "A clean reference crown sized for XiO so new headwear GLBs can be matched against a proven fit baseline."
        }),
        Object.freeze({
          key: "xioStandardBodyGear",
          label: "Ruby One",
          category: "bodyAccessory",
          prewarmPriority: 4,
          factoryId: "makeXioStandardBodyGearProp",
          assetUrl: "./Images/PROPS/BodyGear/RubyOne/redrubyarmor.glb",
          attachment: SINGLE_ATTACHMENTS.xioStandardBodyGear,
          rarity: "legendaryLight",
          mysteryBoxEnabled: true,
          active: true,
          tags: Object.freeze(["body-gear", "torso", "ruby-one", "starter"]),
          description: "Ruby One is the default XiO body gear baseline for calibrating torso GLBs and locking future body gear fits."
        })
      ]);
    }
  });

  // public/HomePageAPP/src/runtime/xio-live-wing-previews.js
  var xio_live_wing_previews_exports = {};
  __export(xio_live_wing_previews_exports, {
    LIVE_GAME_WING_PREVIEW_KEYS: () => LIVE_GAME_WING_PREVIEW_KEYS,
    buildLiveGameWingPreview: () => buildLiveGameWingPreview,
    isLiveGameWingPreviewKey: () => isLiveGameWingPreviewKey
  });
  function isLiveGameWingPreviewKey(propKey = "") {
    return LIVE_GAME_WING_PREVIEW_KEYS.includes(propKey);
  }
  function buildMirroredAttachmentFromWing(wing) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    return {
      position: [Math.abs(Number((_a = wing == null ? void 0 : wing.position) == null ? void 0 : _a.x) || 0), Number((_b = wing == null ? void 0 : wing.position) == null ? void 0 : _b.y) || 0, Number((_c = wing == null ? void 0 : wing.position) == null ? void 0 : _c.z) || 0],
      rotation: [Number((_d = wing == null ? void 0 : wing.rotation) == null ? void 0 : _d.x) || 0, Math.abs(Number((_e = wing == null ? void 0 : wing.rotation) == null ? void 0 : _e.y) || 0), Math.abs(Number((_f = wing == null ? void 0 : wing.rotation) == null ? void 0 : _f.z) || 0)],
      scale: [
        Math.abs(Number((_g = wing == null ? void 0 : wing.scale) == null ? void 0 : _g.x) || 1),
        Math.abs(Number((_h = wing == null ? void 0 : wing.scale) == null ? void 0 : _h.y) || 1),
        Math.abs(Number((_i = wing == null ? void 0 : wing.scale) == null ? void 0 : _i.z) || 1)
      ],
      mirrorMode: "paired"
    };
  }
  function normalizeWingSideForAttachment(wing) {
    if (!wing) return wing;
    wing.position.set(0, 0, 0);
    wing.rotation.set(0, 0, 0);
    wing.scale.set(1, 1, 1);
    wing.visible = true;
    return wing;
  }
  function extractWingPairFromProp(propGroup) {
    var _a, _b;
    const left = ((_a = propGroup == null ? void 0 : propGroup.userData) == null ? void 0 : _a.left) || null;
    const right = ((_b = propGroup == null ? void 0 : propGroup.userData) == null ? void 0 : _b.right) || null;
    if (!left || !right) {
      return null;
    }
    const attachment = buildMirroredAttachmentFromWing(left);
    if (left.parent) left.parent.remove(left);
    if (right.parent) right.parent.remove(right);
    normalizeWingSideForAttachment(left);
    normalizeWingSideForAttachment(right);
    return { left, right, attachment };
  }
  function buildLiveGameWingPreview({ propKey, THREE, GLTFLoader, renderer }) {
    if (!isLiveGameWingPreviewKey(propKey)) {
      return null;
    }
    const leftWingGroup = new THREE.Group();
    const rightWingGroup = new THREE.Group();
    function makeOmegaMembraneMaps() {
      const size = 1024;
      const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const diffuseCanvas = document.createElement("canvas");
      diffuseCanvas.width = size;
      diffuseCanvas.height = size;
      const dCtx = diffuseCanvas.getContext("2d");
      const emissiveCanvas = document.createElement("canvas");
      emissiveCanvas.width = size;
      emissiveCanvas.height = size;
      const eCtx = emissiveCanvas.getContext("2d");
      const alphaCanvas = document.createElement("canvas");
      alphaCanvas.width = size;
      alphaCanvas.height = size;
      const aCtx = alphaCanvas.getContext("2d");
      let seed = 19771337;
      const rand = () => {
        seed = seed * 1664525 + 1013904223 >>> 0;
        return seed / 4294967296;
      };
      const baseGradient = dCtx.createLinearGradient(0, 0, 0, size);
      baseGradient.addColorStop(0, "#12070b");
      baseGradient.addColorStop(0.28, "#241016");
      baseGradient.addColorStop(0.56, "#5f2418");
      baseGradient.addColorStop(0.85, "#b04c1f");
      baseGradient.addColorStop(1, "#ff952f");
      dCtx.fillStyle = baseGradient;
      dCtx.fillRect(0, 0, size, size);
      for (let i = 0; i < 260; i++) {
        const x = rand() * size;
        const y = rand() * size;
        const r = 20 + rand() * 96;
        const g = dCtx.createRadialGradient(x, y, 1, x, y, r);
        const alpha2 = 0.03 + rand() * 0.09;
        g.addColorStop(0, `rgba(255,185,132,${alpha2})`);
        g.addColorStop(1, "rgba(26,8,8,0)");
        dCtx.fillStyle = g;
        dCtx.beginPath();
        dCtx.arc(x, y, r, 0, Math.PI * 2);
        dCtx.fill();
      }
      dCtx.lineCap = "round";
      for (let i = 0; i < 56; i++) {
        const startX = 120 + rand() * 250;
        const startY = 470 + rand() * 300;
        let x = startX;
        let y = startY;
        dCtx.beginPath();
        dCtx.moveTo(x, y);
        const branchCount = 6 + Math.floor(rand() * 5);
        for (let j = 0; j < branchCount; j++) {
          x += 65 + rand() * 90;
          y += (rand() - 0.62) * 150;
          dCtx.quadraticCurveTo(
            x - 30 + rand() * 60,
            y - 20 + rand() * 40,
            x,
            y
          );
        }
        dCtx.strokeStyle = `rgba(255,188,132,${0.07 + rand() * 0.12})`;
        dCtx.lineWidth = 0.7 + rand() * 2.4;
        dCtx.stroke();
      }
      const darkVignette = dCtx.createRadialGradient(size * 0.55, size * 0.45, 60, size * 0.55, size * 0.45, size * 0.95);
      darkVignette.addColorStop(0, "rgba(0,0,0,0)");
      darkVignette.addColorStop(1, "rgba(6,2,2,0.45)");
      dCtx.fillStyle = darkVignette;
      dCtx.fillRect(0, 0, size, size);
      eCtx.fillStyle = "#070103";
      eCtx.fillRect(0, 0, size, size);
      const lowerGlow = eCtx.createLinearGradient(0, size * 0.32, 0, size);
      lowerGlow.addColorStop(0, "rgba(255,70,18,0.05)");
      lowerGlow.addColorStop(0.6, "rgba(255,113,34,0.36)");
      lowerGlow.addColorStop(1, "rgba(255,180,72,0.92)");
      eCtx.fillStyle = lowerGlow;
      eCtx.fillRect(0, 0, size, size);
      for (let i = 0; i < 22; i++) {
        const x = size * (0.46 + rand() * 0.48);
        const y = size * (0.55 + rand() * 0.37);
        const r = 24 + rand() * 95;
        const g = eCtx.createRadialGradient(x, y, 2, x, y, r);
        g.addColorStop(0, "rgba(255,220,150,0.92)");
        g.addColorStop(0.35, "rgba(255,124,42,0.58)");
        g.addColorStop(1, "rgba(25,6,4,0)");
        eCtx.fillStyle = g;
        eCtx.beginPath();
        eCtx.arc(x, y, r, 0, Math.PI * 2);
        eCtx.fill();
      }
      eCtx.strokeStyle = "rgba(255,138,52,0.25)";
      eCtx.lineCap = "round";
      for (let i = 0; i < 34; i++) {
        const x0 = 180 + rand() * 190;
        const y0 = 520 + rand() * 260;
        const x1 = x0 + 330 + rand() * 260;
        const y1 = y0 + (rand() - 0.7) * 240;
        eCtx.beginPath();
        eCtx.moveTo(x0, y0);
        eCtx.quadraticCurveTo((x0 + x1) * 0.5, Math.min(size - 10, y0 + y1 * 0.2), x1, y1);
        eCtx.lineWidth = 1.5 + rand() * 2.2;
        eCtx.stroke();
      }
      aCtx.fillStyle = "#ffffff";
      aCtx.fillRect(0, 0, size, size);
      for (let i = 0; i < 52; i++) {
        const x = size * (0.58 + rand() * 0.42);
        const y = size * (0.58 + rand() * 0.4);
        const r = 12 + rand() * 42;
        const g = aCtx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(0,0,0,0.95)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        aCtx.fillStyle = g;
        aCtx.beginPath();
        aCtx.arc(x, y, r, 0, Math.PI * 2);
        aCtx.fill();
      }
      const diffuse = new THREE.CanvasTexture(diffuseCanvas);
      diffuse.colorSpace = THREE.SRGBColorSpace;
      diffuse.anisotropy = maxAnisotropy;
      diffuse.needsUpdate = true;
      const emissive = new THREE.CanvasTexture(emissiveCanvas);
      emissive.colorSpace = THREE.SRGBColorSpace;
      emissive.anisotropy = maxAnisotropy;
      emissive.needsUpdate = true;
      const alpha = new THREE.CanvasTexture(alphaCanvas);
      alpha.anisotropy = maxAnisotropy;
      alpha.needsUpdate = true;
      return { diffuse, emissive, alpha };
    }
    function makeBoneBetween(start, end, radiusStart, radiusEnd, material, radialSegments = 12) {
      const delta = new THREE.Vector3().subVectors(end, start);
      const length = Math.max(1e-4, delta.length());
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusEnd, radiusStart, length, radialSegments), material);
      mesh.position.copy(start).addScaledVector(delta, 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
      return mesh;
    }
    function makeOmegaWingShape(dir) {
      const shape = new THREE.Shape();
      const mx = (x) => x * dir;
      shape.moveTo(mx(0.05), 0.3);
      shape.quadraticCurveTo(mx(0.94), 1.48, mx(2.24), 2.5);
      shape.quadraticCurveTo(mx(4.08), 3.54, mx(6.24), 3.92);
      shape.quadraticCurveTo(mx(7.52), 3.98, mx(8.32), 3.62);
      shape.quadraticCurveTo(mx(7.78), 3.16, mx(7.06), 2.52);
      shape.quadraticCurveTo(mx(6.48), 2, mx(6.08), 1.46);
      shape.quadraticCurveTo(mx(7.26), 1.24, mx(8.08), 0.96);
      shape.quadraticCurveTo(mx(7), 0.48, mx(5.58), 0.14);
      shape.quadraticCurveTo(mx(7.06), -0.04, mx(7.9), -0.46);
      shape.quadraticCurveTo(mx(6.58), -1.06, mx(5.04), -1.26);
      shape.quadraticCurveTo(mx(6.32), -1.64, mx(7), -2.08);
      shape.quadraticCurveTo(mx(5.38), -2.36, mx(3.46), -2.36);
      shape.quadraticCurveTo(mx(2.08), -2.34, mx(1.04), -2.2);
      shape.quadraticCurveTo(mx(0.34), -1.98, mx(0.02), -1.56);
      shape.quadraticCurveTo(mx(-0.16), -1.06, mx(-0.12), -0.52);
      shape.quadraticCurveTo(mx(-0.08), -0.12, mx(0.05), 0.3);
      shape.closePath();
      return shape;
    }
    function makeOmegaWingSide(side = "left", sharedMaps) {
      const dir = side === "left" ? -1 : 1;
      const wing = new THREE.Group();
      wing.position.set(dir * 0.3, -0.34, -1);
      wing.rotation.set(-0.05, dir * 0.08, 0.04 * dir);
      wing.scale.set(1.3, 1.3, 1.3);
      const boneMat = new THREE.MeshPhysicalMaterial({
        color: 2626831,
        emissive: 1378308,
        emissiveIntensity: 0.38,
        metalness: 0.55,
        roughness: 0.42,
        clearcoat: 0.24,
        clearcoatRoughness: 0.34,
        envMapIntensity: 0.5
      });
      const clawMat = new THREE.MeshPhysicalMaterial({
        color: 1182473,
        emissive: 1706244,
        emissiveIntensity: 0.22,
        metalness: 0.62,
        roughness: 0.32,
        clearcoat: 0.2,
        clearcoatRoughness: 0.4,
        envMapIntensity: 0.42
      });
      const membraneMat = new THREE.MeshPhysicalMaterial({
        color: 10240549,
        map: sharedMaps.diffuse,
        emissive: 16743468,
        emissiveMap: sharedMaps.emissive,
        emissiveIntensity: 1.24,
        metalness: 0.03,
        roughness: 0.76,
        transmission: 0.05,
        thickness: 0.48,
        alphaMap: sharedMaps.alpha,
        alphaTest: 0.16,
        transparent: true,
        opacity: 0.98,
        side: THREE.DoubleSide
      });
      const membraneShape = makeOmegaWingShape(dir);
      const membraneGeo = new THREE.ShapeGeometry(membraneShape, 104);
      membraneGeo.computeBoundingBox();
      const bounds = membraneGeo.boundingBox;
      const minAbsX = Math.min(Math.abs(bounds.min.x), Math.abs(bounds.max.x));
      const maxAbsX = Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x));
      const spanAbsX = Math.max(1e-3, maxAbsX - minAbsX);
      const spanY = Math.max(1e-3, bounds.max.y - bounds.min.y);
      const pos = membraneGeo.attributes.position;
      const uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const nx = THREE.MathUtils.clamp((Math.abs(x) - minAbsX) / spanAbsX, 0, 1);
        const ny = THREE.MathUtils.clamp((y - bounds.min.y) / spanY, 0, 1);
        const camber = 0.08 + nx * 0.32 - Math.pow(ny, 1.75) * 0.08;
        const wrinkle = Math.sin(nx * 10.4 + ny * 4.2) * 0.018 + Math.cos(nx * 4.6 - ny * 9.1) * 0.014;
        pos.setZ(i, camber + wrinkle);
        uv[i * 2] = nx;
        uv[i * 2 + 1] = 1 - ny;
      }
      membraneGeo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      pos.needsUpdate = true;
      membraneGeo.computeVertexNormals();
      const membrane = new THREE.Mesh(membraneGeo, membraneMat);
      membrane.renderOrder = 2;
      wing.add(membrane);
      const root = new THREE.Vector3(dir * 0.14, 0.22, 0.27);
      const topTip = new THREE.Vector3(dir * 8.24, 3.56, 0.52);
      const midTip = new THREE.Vector3(dir * 8, 0.94, 0.32);
      const lowerTip = new THREE.Vector3(dir * 6.96, -2.02, 0.16);
      wing.add(makeBoneBetween(root, topTip, 0.18, 0.08, boneMat, 16));
      wing.add(makeBoneBetween(root, midTip, 0.16, 0.07, boneMat, 14));
      wing.add(makeBoneBetween(root, lowerTip, 0.14, 0.06, boneMat, 14));
      const ribTargets = [
        [dir * 5.86, 2.82, 0.42],
        [dir * 5.54, 1.92, 0.36],
        [dir * 5.06, 1.02, 0.28],
        [dir * 4.62, 0.12, 0.23],
        [dir * 4.2, -0.84, 0.18],
        [dir * 3.74, -1.72, 0.14]
      ];
      const ribOrigins = [
        [dir * 0.86, 0.74, 0.27],
        [dir * 1, 0.58, 0.26],
        [dir * 1.12, 0.4, 0.25],
        [dir * 1.22, 0.22, 0.23],
        [dir * 1.28, 0.04, 0.21],
        [dir * 1.34, -0.16, 0.19]
      ];
      for (let i = 0; i < ribTargets.length; i++) {
        const a = new THREE.Vector3(...ribOrigins[i]);
        const b = new THREE.Vector3(...ribTargets[i]);
        wing.add(makeBoneBetween(a, b, 0.11 - i * 0.01, 0.045, boneMat, 12));
      }
      const knuckles = [
        [dir * 0.38, 0.48, 0.33, 0.18],
        [dir * 0.7, 0.38, 0.3, 0.16],
        [dir * 0.98, 0.24, 0.27, 0.15],
        [dir * 1.2, 0.08, 0.24, 0.13],
        [dir * 1.34, -0.08, 0.22, 0.12]
      ];
      for (const [x, y, z, r] of knuckles) {
        const orb = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 14), boneMat);
        orb.position.set(x, y, z);
        wing.add(orb);
      }
      for (let i = 0; i < 3; i++) {
        const dorsalSpike = new THREE.Mesh(new THREE.ConeGeometry(0.1 - i * 0.01, 0.34 - i * 0.03, 10), clawMat);
        dorsalSpike.position.set(dir * (0.24 + i * 0.2), 0.58 + i * 0.07, 0.3 - i * 0.03);
        dorsalSpike.rotation.set(-0.35, 0, dir > 0 ? -Math.PI * 0.7 : Math.PI * 0.7);
        wing.add(dorsalSpike);
      }
      const topClaw = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.84, 12), clawMat);
      topClaw.position.set(dir * 8.24, 3.52, 0.54);
      topClaw.rotation.set(0.1, 0, dir > 0 ? -Math.PI * 0.58 : Math.PI * 0.58);
      wing.add(topClaw);
      const midClaw = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.76, 12), clawMat);
      midClaw.position.set(dir * 8.02, 0.92, 0.34);
      midClaw.rotation.set(0.06, 0, dir > 0 ? -Math.PI * 0.5 : Math.PI * 0.5);
      wing.add(midClaw);
      const lowerClaw = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.66, 12), clawMat);
      lowerClaw.position.set(dir * 6.96, -2.02, 0.18);
      lowerClaw.rotation.set(-0.05, 0, dir > 0 ? -Math.PI * 0.42 : Math.PI * 0.42);
      wing.add(lowerClaw);
      const emberMat = new THREE.MeshStandardMaterial({
        color: 16753752,
        emissive: 16738852,
        emissiveIntensity: 1.9,
        roughness: 0.44,
        metalness: 0
      });
      const emberPositions = [
        [dir * 6.12, -1.38, 0.25],
        [dir * 5.42, -1.58, 0.2],
        [dir * 4.78, -1.78, 0.17],
        [dir * 6.74, 0.74, 0.25]
      ];
      const embers = [];
      for (let i = 0; i < emberPositions.length; i++) {
        const [x, y, z] = emberPositions[i];
        const ember = new THREE.Mesh(new THREE.SphereGeometry(0.06 + i * 0.012, 12, 10), emberMat);
        ember.position.set(x, y, z);
        ember.userData.baseZ = z;
        wing.add(ember);
        embers.push(ember);
      }
      const wingFireLight = new THREE.PointLight(16743984, 1.4, 10.2, 2);
      wingFireLight.position.set(dir * 5.18, -0.8, 0.62);
      wing.add(wingFireLight);
      wing.userData.fireMats = [membraneMat];
      wing.userData.embers = embers;
      wing.userData.fireLights = [wingFireLight];
      return wing;
    }
    function makeOmegaWingsProp() {
      const g = new THREE.Group();
      const omegaMaps = makeOmegaMembraneMaps();
      const left = makeOmegaWingSide("left", omegaMaps);
      const right = makeOmegaWingSide("right", omegaMaps);
      left.visible = false;
      right.visible = false;
      leftWingGroup.add(left);
      rightWingGroup.add(right);
      g.userData.left = left;
      g.userData.right = right;
      g.userData.fireMats = [
        ...left.userData.fireMats || [],
        ...right.userData.fireMats || []
      ];
      g.userData.embers = [
        ...left.userData.embers || [],
        ...right.userData.embers || []
      ];
      g.userData.fireLights = [
        ...left.userData.fireLights || [],
        ...right.userData.fireLights || []
      ];
      return g;
    }
    const efernoWingAssetState = {
      loader: new GLTFLoader(),
      modelUrl: "./Images/PROPS/Eferno/ComfyUI_00007_.glb",
      loadPromise: null,
      leftGeometry: null,
      rightGeometry: null
    };
    const endlessWingAssetState = {
      loader: new GLTFLoader(),
      modelUrl: "./Images/PROPS/Wings/EndlessWings/EndlessWings.glb",
      previewLoadPromise: null,
      equippedLoadPromise: null,
      previewGeometry: null,
      leftGeometry: null,
      rightGeometry: null,
      materialTemplate: null
    };
    const emeraldCoenWingAssetState = {
      loader: new GLTFLoader(),
      modelUrl: "./Images/PROPS/Wings/EmeraldCoen/EmeraldCoen.glb",
      previewLoadPromise: null,
      equippedLoadPromise: null,
      previewGeometry: null,
      leftGeometry: null,
      rightGeometry: null,
      materialTemplate: null
    };
    const xatoriWingAssetState = {
      loader: new GLTFLoader(),
      modelUrl: "./Images/PROPS/Wings/XatoriWings/Xatori.glb",
      previewLoadPromise: null,
      equippedLoadPromise: null,
      previewGeometry: null,
      leftGeometry: null,
      rightGeometry: null,
      materialTemplate: null
    };
    function makeEfernoWingMaps() {
      const size = 1536;
      const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const diffuseCanvas = document.createElement("canvas");
      diffuseCanvas.width = size;
      diffuseCanvas.height = size;
      const dCtx = diffuseCanvas.getContext("2d");
      const emissiveCanvas = document.createElement("canvas");
      emissiveCanvas.width = size;
      emissiveCanvas.height = size;
      const eCtx = emissiveCanvas.getContext("2d");
      const alphaCanvas = document.createElement("canvas");
      alphaCanvas.width = size;
      alphaCanvas.height = size;
      const aCtx = alphaCanvas.getContext("2d");
      const roughnessCanvas = document.createElement("canvas");
      roughnessCanvas.width = size;
      roughnessCanvas.height = size;
      const rCtx = roughnessCanvas.getContext("2d");
      let seed = 98324531;
      const rand = () => {
        seed = seed * 1664525 + 1013904223 >>> 0;
        return seed / 4294967296;
      };
      const baseGradient = dCtx.createLinearGradient(0, 0, size, 0);
      baseGradient.addColorStop(0, "#fff9b2");
      baseGradient.addColorStop(0.08, "#ffe065");
      baseGradient.addColorStop(0.23, "#ffb124");
      baseGradient.addColorStop(0.46, "#ff680f");
      baseGradient.addColorStop(0.72, "#c32707");
      baseGradient.addColorStop(1, "#170302");
      dCtx.fillStyle = baseGradient;
      dCtx.fillRect(0, 0, size, size);
      const verticalGradient = dCtx.createLinearGradient(0, 0, 0, size);
      verticalGradient.addColorStop(0, "rgba(255,225,158,0.2)");
      verticalGradient.addColorStop(0.42, "rgba(255,135,26,0)");
      verticalGradient.addColorStop(1, "rgba(22,4,3,0.26)");
      dCtx.fillStyle = verticalGradient;
      dCtx.fillRect(0, 0, size, size);
      dCtx.lineCap = "round";
      for (let i = 0; i < 150; i++) {
        const startX = size * (0.04 + rand() * 0.12);
        const startY = size * (0.2 + rand() * 0.62);
        const primaryCurveX = startX + size * (0.2 + rand() * 0.18);
        const primaryCurveY = startY + (rand() - 0.5) * size * 0.22;
        const endX = size * (0.42 + rand() * 0.56);
        const endY = startY + (rand() - 0.66) * size * 0.34;
        const warm = Math.floor(160 + rand() * 90);
        const bright = Math.floor(210 + rand() * 45);
        dCtx.beginPath();
        dCtx.moveTo(startX, startY);
        dCtx.quadraticCurveTo(primaryCurveX, primaryCurveY, endX, endY);
        dCtx.strokeStyle = `rgba(255,${warm},${Math.floor(10 + rand() * 20)},${0.08 + rand() * 0.2})`;
        dCtx.lineWidth = 1.2 + rand() * 4.1;
        dCtx.stroke();
        if (rand() < 0.58) {
          dCtx.beginPath();
          dCtx.moveTo(startX + size * 0.01, startY + (rand() - 0.5) * size * 0.03);
          dCtx.quadraticCurveTo(
            primaryCurveX + size * (rand() - 0.5) * 0.03,
            primaryCurveY + size * (rand() - 0.5) * 0.03,
            endX + size * (rand() - 0.5) * 0.02,
            endY + size * (rand() - 0.5) * 0.02
          );
          dCtx.strokeStyle = `rgba(255,${bright},${Math.floor(40 + rand() * 30)},${0.18 + rand() * 0.24})`;
          dCtx.lineWidth = 0.8 + rand() * 1.8;
          dCtx.stroke();
        }
      }
      for (let i = 0; i < 240; i++) {
        const x = size * (0.32 + rand() * 0.68);
        const y = size * rand();
        const radius = 16 + rand() * 110;
        const g = dCtx.createRadialGradient(x, y, 1, x, y, radius);
        g.addColorStop(0, `rgba(255,${Math.floor(95 + rand() * 80)},20,${0.08 + rand() * 0.18})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        dCtx.fillStyle = g;
        dCtx.beginPath();
        dCtx.arc(x, y, radius, 0, Math.PI * 2);
        dCtx.fill();
      }
      eCtx.fillStyle = "#050101";
      eCtx.fillRect(0, 0, size, size);
      const emissiveGradient = eCtx.createLinearGradient(0, 0, size, 0);
      emissiveGradient.addColorStop(0, "rgba(255,248,174,0.92)");
      emissiveGradient.addColorStop(0.2, "rgba(255,181,55,0.85)");
      emissiveGradient.addColorStop(0.5, "rgba(255,96,15,0.66)");
      emissiveGradient.addColorStop(0.82, "rgba(180,34,6,0.36)");
      emissiveGradient.addColorStop(1, "rgba(0,0,0,0.06)");
      eCtx.fillStyle = emissiveGradient;
      eCtx.fillRect(0, 0, size, size);
      for (let i = 0; i < 190; i++) {
        const rootX = size * (0.02 + rand() * 0.11);
        const rootY = size * (0.16 + rand() * 0.7);
        const endX = size * (0.3 + rand() * 0.66);
        const endY = rootY + (rand() - 0.58) * size * 0.26;
        eCtx.beginPath();
        eCtx.moveTo(rootX, rootY);
        eCtx.quadraticCurveTo(
          rootX + size * (0.16 + rand() * 0.14),
          rootY + (rand() - 0.5) * size * 0.08,
          endX,
          endY
        );
        eCtx.strokeStyle = `rgba(255,${Math.floor(150 + rand() * 100)},${Math.floor(25 + rand() * 20)},${0.15 + rand() * 0.45})`;
        eCtx.lineWidth = 0.7 + rand() * 2.7;
        eCtx.stroke();
      }
      for (let i = 0; i < 28; i++) {
        const x = size * (0.1 + rand() * 0.86);
        const y = size * (0.08 + rand() * 0.84);
        const radius = 22 + rand() * 120;
        const glow = eCtx.createRadialGradient(x, y, 1, x, y, radius);
        glow.addColorStop(0, "rgba(255,240,170,0.95)");
        glow.addColorStop(0.35, "rgba(255,166,55,0.72)");
        glow.addColorStop(1, "rgba(0,0,0,0)");
        eCtx.fillStyle = glow;
        eCtx.beginPath();
        eCtx.arc(x, y, radius, 0, Math.PI * 2);
        eCtx.fill();
      }
      aCtx.fillStyle = "#ffffff";
      aCtx.fillRect(0, 0, size, size);
      const edgeFade = aCtx.createLinearGradient(0, 0, size, 0);
      edgeFade.addColorStop(0, "rgba(255,255,255,1)");
      edgeFade.addColorStop(0.66, "rgba(255,255,255,1)");
      edgeFade.addColorStop(0.86, "rgba(255,255,255,0.7)");
      edgeFade.addColorStop(1, "rgba(0,0,0,0)");
      aCtx.fillStyle = edgeFade;
      aCtx.fillRect(0, 0, size, size);
      for (let i = 0; i < 230; i++) {
        const x = size * (0.62 + rand() * 0.38);
        const y = size * rand();
        const radius = 8 + rand() * 42;
        const cut = aCtx.createRadialGradient(x, y, 0, x, y, radius);
        cut.addColorStop(0, "rgba(0,0,0,0.95)");
        cut.addColorStop(0.64, "rgba(0,0,0,0.42)");
        cut.addColorStop(1, "rgba(255,255,255,0)");
        aCtx.fillStyle = cut;
        aCtx.beginPath();
        aCtx.arc(x, y, radius, 0, Math.PI * 2);
        aCtx.fill();
      }
      rCtx.fillStyle = "#7a7a7a";
      rCtx.fillRect(0, 0, size, size);
      const roughGradient = rCtx.createLinearGradient(0, 0, size, 0);
      roughGradient.addColorStop(0, "rgba(65,65,65,1)");
      roughGradient.addColorStop(0.34, "rgba(86,86,86,1)");
      roughGradient.addColorStop(0.72, "rgba(126,126,126,1)");
      roughGradient.addColorStop(1, "rgba(170,170,170,1)");
      rCtx.fillStyle = roughGradient;
      rCtx.fillRect(0, 0, size, size);
      for (let i = 0; i < 220; i++) {
        const x = rand() * size;
        const y = rand() * size;
        const radius = 5 + rand() * 36;
        const grain = Math.floor(72 + rand() * 120);
        const g = rCtx.createRadialGradient(x, y, 0, x, y, radius);
        g.addColorStop(0, `rgba(${grain},${grain},${grain},${0.15 + rand() * 0.3})`);
        g.addColorStop(1, "rgba(127,127,127,0)");
        rCtx.fillStyle = g;
        rCtx.beginPath();
        rCtx.arc(x, y, radius, 0, Math.PI * 2);
        rCtx.fill();
      }
      const diffuse = new THREE.CanvasTexture(diffuseCanvas);
      diffuse.colorSpace = THREE.SRGBColorSpace;
      diffuse.anisotropy = maxAnisotropy;
      diffuse.wrapS = THREE.ClampToEdgeWrapping;
      diffuse.wrapT = THREE.ClampToEdgeWrapping;
      diffuse.needsUpdate = true;
      const emissive = new THREE.CanvasTexture(emissiveCanvas);
      emissive.colorSpace = THREE.SRGBColorSpace;
      emissive.anisotropy = maxAnisotropy;
      emissive.wrapS = THREE.ClampToEdgeWrapping;
      emissive.wrapT = THREE.ClampToEdgeWrapping;
      emissive.needsUpdate = true;
      const alpha = new THREE.CanvasTexture(alphaCanvas);
      alpha.anisotropy = maxAnisotropy;
      alpha.wrapS = THREE.ClampToEdgeWrapping;
      alpha.wrapT = THREE.ClampToEdgeWrapping;
      alpha.needsUpdate = true;
      const roughness = new THREE.CanvasTexture(roughnessCanvas);
      roughness.anisotropy = maxAnisotropy;
      roughness.wrapS = THREE.ClampToEdgeWrapping;
      roughness.wrapT = THREE.ClampToEdgeWrapping;
      roughness.needsUpdate = true;
      return { diffuse, emissive, alpha, roughness };
    }
    function cloneWingMeshMaterial(material) {
      if (Array.isArray(material)) {
        return cloneWingMeshMaterial(material[0] || null);
      }
      if (!(material == null ? void 0 : material.clone)) {
        return null;
      }
      const cloned = material.clone();
      cloned.side = THREE.DoubleSide;
      if ("shadowSide" in cloned) {
        cloned.shadowSide = THREE.DoubleSide;
      }
      cloned.needsUpdate = true;
      return cloned;
    }
    function getLargestMeshEntryFromObject2(root) {
      if (!root) return null;
      let bestGeometry = null;
      let bestMaterial = null;
      let bestVertexCount = -1;
      root.traverse((node) => {
        var _a, _b;
        if (!(node == null ? void 0 : node.isMesh) || !((_b = (_a = node.geometry) == null ? void 0 : _a.attributes) == null ? void 0 : _b.position)) {
          return;
        }
        const vertexCount = node.geometry.attributes.position.count || 0;
        if (vertexCount <= bestVertexCount) {
          return;
        }
        bestVertexCount = vertexCount;
        bestGeometry = node.geometry.clone();
        bestMaterial = node.material || null;
      });
      return bestGeometry ? {
        geometry: bestGeometry,
        material: bestMaterial
      } : null;
    }
    function getLargestMeshGeometryFromObject(root) {
      var _a;
      return ((_a = getLargestMeshEntryFromObject2(root)) == null ? void 0 : _a.geometry) || null;
    }
    function buildGeometryFromAttributeArrays2(sourceAttributes, attributeArrays) {
      const geometry = new THREE.BufferGeometry();
      Object.entries(attributeArrays).forEach(([name, values]) => {
        const source = sourceAttributes[name];
        if (!(source == null ? void 0 : source.array) || !(values == null ? void 0 : values.length)) {
          return;
        }
        const TypedArray = source.array.constructor || Float32Array;
        geometry.setAttribute(
          name,
          new THREE.BufferAttribute(new TypedArray(values), source.itemSize, source.normalized === true)
        );
      });
      if (!geometry.attributes.position) {
        return null;
      }
      return geometry;
    }
    function splitPairWingGeometry2(sourceGeometry) {
      var _a, _b, _c, _d, _e;
      if (!((_a = sourceGeometry == null ? void 0 : sourceGeometry.attributes) == null ? void 0 : _a.position)) {
        return null;
      }
      const nonIndexed = sourceGeometry.index ? sourceGeometry.toNonIndexed() : sourceGeometry.clone();
      const position = nonIndexed.attributes.position;
      const arr = position == null ? void 0 : position.array;
      if (!arr || arr.length < 9) {
        if (nonIndexed == null ? void 0 : nonIndexed.dispose) nonIndexed.dispose();
        return null;
      }
      const sourceAttributes = Object.fromEntries(
        Object.entries(nonIndexed.attributes).filter(([, attribute]) => {
          var _a2;
          return (_a2 = attribute == null ? void 0 : attribute.array) == null ? void 0 : _a2.length;
        })
      );
      const createAttributeBuckets = () => Object.fromEntries(
        Object.keys(sourceAttributes).map((name) => [name, []])
      );
      const leftAttributes = createAttributeBuckets();
      const rightAttributes = createAttributeBuckets();
      for (let triVertex = 0; triVertex <= position.count - 3; triVertex += 3) {
        const centroidX = (position.getX(triVertex) + position.getX(triVertex + 1) + position.getX(triVertex + 2)) / 3;
        const target = centroidX <= 0 ? leftAttributes : rightAttributes;
        Object.entries(sourceAttributes).forEach(([name, attribute]) => {
          const bucket = target[name];
          const itemSize = attribute.itemSize || 1;
          for (let vertexOffset = 0; vertexOffset < 3; vertexOffset++) {
            const vertexIndex = triVertex + vertexOffset;
            for (let component = 0; component < itemSize; component++) {
              bucket.push(attribute.array[vertexIndex * itemSize + component]);
            }
          }
        });
      }
      if (nonIndexed == null ? void 0 : nonIndexed.dispose) nonIndexed.dispose();
      if (!((_b = leftAttributes.position) == null ? void 0 : _b.length) && !((_c = rightAttributes.position) == null ? void 0 : _c.length)) {
        return null;
      }
      let leftGeometry = null;
      let rightGeometry = null;
      if ((_d = leftAttributes.position) == null ? void 0 : _d.length) {
        leftGeometry = buildGeometryFromAttributeArrays2(sourceAttributes, leftAttributes);
      }
      if ((_e = rightAttributes.position) == null ? void 0 : _e.length) {
        rightGeometry = buildGeometryFromAttributeArrays2(sourceAttributes, rightAttributes);
      }
      if (!leftGeometry && rightGeometry) {
        leftGeometry = rightGeometry.clone();
        leftGeometry.scale(-1, 1, 1);
      } else if (!rightGeometry && leftGeometry) {
        rightGeometry = leftGeometry.clone();
        rightGeometry.scale(-1, 1, 1);
      }
      return leftGeometry && rightGeometry ? { left: leftGeometry, right: rightGeometry } : null;
    }
    function normalizeWingPivotFromSeam2(geometry) {
      var _a;
      if (!((_a = geometry == null ? void 0 : geometry.attributes) == null ? void 0 : _a.position)) {
        return;
      }
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox;
      const pos = geometry.attributes.position;
      const spanX = Math.max(1e-4, bounds.max.x - bounds.min.x);
      const seamThreshold = Math.max(1e-3, spanX * 0.1);
      let sumX = 0;
      let sumY = 0;
      let sumZ = 0;
      let count = 0;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        if (Math.abs(x) > seamThreshold) {
          continue;
        }
        sumX += x;
        sumY += pos.getY(i);
        sumZ += pos.getZ(i);
        count++;
      }
      if (count < 4) {
        const relaxedThreshold = Math.max(seamThreshold, spanX * 0.24);
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          if (Math.abs(x) > relaxedThreshold) {
            continue;
          }
          sumX += x;
          sumY += pos.getY(i);
          sumZ += pos.getZ(i);
          count++;
        }
      }
      if (count <= 0) {
        const center = bounds.getCenter(new THREE.Vector3());
        geometry.translate(-center.x * 0.06, -center.y * 0.18, -center.z);
        geometry.computeBoundingBox();
        return;
      }
      const rootX = sumX / count;
      const rootY = sumY / count;
      const rootZ = sumZ / count;
      geometry.translate(-rootX, -rootY, -rootZ);
      geometry.computeBoundingBox();
    }
    function applyWingUvAndDepthFromGeometry(geometry) {
      var _a;
      if (!((_a = geometry == null ? void 0 : geometry.attributes) == null ? void 0 : _a.position)) {
        return;
      }
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox;
      const pos = geometry.attributes.position;
      const minAbsX = Math.min(Math.abs(bounds.min.x), Math.abs(bounds.max.x));
      const maxAbsX = Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x));
      const spanAbsX = Math.max(1e-3, maxAbsX - minAbsX);
      const spanY = Math.max(1e-3, bounds.max.y - bounds.min.y);
      const uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const nx = THREE.MathUtils.clamp((Math.abs(x) - minAbsX) / spanAbsX, 0, 1);
        const ny = THREE.MathUtils.clamp((y - bounds.min.y) / spanY, 0, 1);
        const featherLift = 0.04 + Math.pow(nx, 1.28) * 0.2 + Math.pow(ny, 1.5) * 0.035;
        const wrinkle = Math.sin(nx * 12.8 + ny * 9.2) * 0.014 + Math.cos(nx * 5.3 - ny * 11.4) * 0.01;
        pos.setZ(i, z * 0.2 + featherLift + wrinkle);
        uv[i * 2] = nx;
        uv[i * 2 + 1] = 1 - ny;
      }
      geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      pos.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    }
    function prepareWingGeometryForEferno(sourceGeometry) {
      var _a;
      if (!((_a = sourceGeometry == null ? void 0 : sourceGeometry.attributes) == null ? void 0 : _a.position)) {
        return null;
      }
      const geometry = sourceGeometry.index ? sourceGeometry.toNonIndexed() : sourceGeometry.clone();
      normalizeWingPivotFromSeam2(geometry);
      applyWingUvAndDepthFromGeometry(geometry);
      return geometry;
    }
    function prepareWingGeometryForSocketAttachment2(sourceGeometry) {
      var _a;
      if (!((_a = sourceGeometry == null ? void 0 : sourceGeometry.attributes) == null ? void 0 : _a.position)) {
        return null;
      }
      const geometry = sourceGeometry.index ? sourceGeometry.toNonIndexed() : sourceGeometry.clone();
      normalizeWingPivotFromSeam2(geometry);
      if (!geometry.attributes.normal) {
        geometry.computeVertexNormals();
      }
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      return geometry;
    }
    const xatoriWingAssetController = createGlbWingAssetController(xatoriWingAssetState, "Xatori Wings");
    const endlessWingAssetController = createGlbWingAssetController(endlessWingAssetState, "Endless Wings");
    const emeraldCoenWingAssetController = createGlbWingAssetController(emeraldCoenWingAssetState, "Emerald Coen Wings");
    function createXatoriWingMaterialInstance() {
      return xatoriWingAssetController.createMaterialInstance();
    }
    function createEndlessWingMaterialInstance() {
      return endlessWingAssetController.createMaterialInstance();
    }
    function applyPreviewTransformOverrides(target, sourcePart) {
      var _a;
      const previewTransform = ((_a = sourcePart == null ? void 0 : sourcePart.userData) == null ? void 0 : _a.previewTransform) || null;
      if (!target || !previewTransform) {
        return;
      }
      const position = Array.isArray(previewTransform.position) ? previewTransform.position : null;
      const rotation = Array.isArray(previewTransform.rotation) ? previewTransform.rotation : null;
      const scale = Array.isArray(previewTransform.scale) ? previewTransform.scale : null;
      if ((position == null ? void 0 : position.length) === 3) {
        target.position.set(position[0], position[1], position[2]);
      }
      if ((rotation == null ? void 0 : rotation.length) === 3) {
        target.rotation.set(rotation[0], rotation[1], rotation[2]);
      }
      if ((scale == null ? void 0 : scale.length) === 3) {
        target.scale.set(scale[0], scale[1], scale[2]);
      }
    }
    function createWingPairPreviewGroup(previewGeometry, materialTemplate) {
      if (!previewGeometry || !materialTemplate) {
        return null;
      }
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(previewGeometry.clone(), cloneWingMeshMaterial(materialTemplate));
      if (!mesh.material) {
        return null;
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      group.add(mesh);
      group.userData.mesh = mesh;
      return group;
    }
    function createDetachedWingPreviewMesh(geometry, materialTemplate, transform) {
      if (!geometry || !materialTemplate) {
        return null;
      }
      const wing = new THREE.Group();
      applyWingTransform(wing, transform);
      const mesh = new THREE.Mesh(geometry.clone(), cloneWingMeshMaterial(materialTemplate));
      if (!mesh.material) {
        return null;
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      wing.add(mesh);
      wing.userData.mesh = mesh;
      return wing;
    }
    function createGlbWingAssetController(assetState, label) {
      const createMaterialInstance = () => cloneWingMeshMaterial(assetState.materialTemplate);
      const clonePreparedEquipped = () => {
        var _a, _b;
        return {
          left: ((_a = assetState.leftGeometry) == null ? void 0 : _a.clone()) || null,
          right: ((_b = assetState.rightGeometry) == null ? void 0 : _b.clone()) || null
        };
      };
      const ensurePreparedWingPair = () => {
        var _a, _b;
        if (assetState.leftGeometry && assetState.rightGeometry) {
          return clonePreparedEquipped();
        }
        if (!assetState.previewGeometry || !assetState.materialTemplate) {
          return {
            left: null,
            right: null
          };
        }
        const sourceGeometry = assetState.previewGeometry.clone();
        const split = splitPairWingGeometry2(sourceGeometry);
        if (sourceGeometry == null ? void 0 : sourceGeometry.dispose) {
          sourceGeometry.dispose();
        }
        if (!(split == null ? void 0 : split.left) || !(split == null ? void 0 : split.right)) {
          throw new Error(`${label} GLB could not be split into left/right wings.`);
        }
        const preparedLeft = prepareWingGeometryForSocketAttachment2(split.left);
        const preparedRight = prepareWingGeometryForSocketAttachment2(split.right);
        if ((_a = split.left) == null ? void 0 : _a.dispose) split.left.dispose();
        if ((_b = split.right) == null ? void 0 : _b.dispose) split.right.dispose();
        if (!preparedLeft || !preparedRight) {
          throw new Error(`${label} wing geometry preparation failed.`);
        }
        assetState.leftGeometry = preparedLeft;
        assetState.rightGeometry = preparedRight;
        return clonePreparedEquipped();
      };
      const loadPreviewAssets = () => {
        if (assetState.previewGeometry && assetState.materialTemplate) {
          return Promise.resolve(true);
        }
        if (!assetState.previewLoadPromise) {
          assetState.previewLoadPromise = new Promise((resolve, reject) => {
            assetState.loader.load(
              assetState.modelUrl,
              (gltf) => {
                var _a;
                const root = (gltf == null ? void 0 : gltf.scene) || ((_a = gltf == null ? void 0 : gltf.scenes) == null ? void 0 : _a[0]) || null;
                const sourceEntry = getLargestMeshEntryFromObject2(root);
                const sourceGeometry = (sourceEntry == null ? void 0 : sourceEntry.geometry) || null;
                const materialTemplate = cloneWingMeshMaterial((sourceEntry == null ? void 0 : sourceEntry.material) || null);
                if (!sourceGeometry) {
                  reject(new Error(`${label} GLB did not contain a mesh with geometry.`));
                  return;
                }
                if (!materialTemplate) {
                  if (sourceGeometry == null ? void 0 : sourceGeometry.dispose) sourceGeometry.dispose();
                  reject(new Error(`${label} GLB did not contain a cloneable material.`));
                  return;
                }
                assetState.previewGeometry = sourceGeometry.clone();
                assetState.materialTemplate = materialTemplate;
                if (sourceGeometry == null ? void 0 : sourceGeometry.dispose) {
                  sourceGeometry.dispose();
                }
                resolve(true);
              },
              void 0,
              (error) => reject(error)
            );
          }).catch((error) => {
            console.warn(`Unable to load ${label} GLB, leaving ${label} hidden until the asset is available.`, error);
            return false;
          });
        }
        return assetState.previewLoadPromise;
      };
      const loadEquippedAssets = () => {
        if (assetState.leftGeometry && assetState.rightGeometry && assetState.materialTemplate) {
          return Promise.resolve(clonePreparedEquipped());
        }
        if (!assetState.equippedLoadPromise) {
          assetState.equippedLoadPromise = loadPreviewAssets().then((ready) => {
            if (!ready || !assetState.previewGeometry || !assetState.materialTemplate) {
              return;
            }
            ensurePreparedWingPair();
          }).catch((error) => {
            console.warn(`Unable to prepare equipped ${label} geometry.`, error);
          });
        }
        return assetState.equippedLoadPromise.then(() => clonePreparedEquipped());
      };
      const createPreviewObject = (previewTransform = null) => {
        if (previewTransform) {
          try {
            const pair = ensurePreparedWingPair();
            if (pair.left && pair.right) {
              const group = new THREE.Group();
              const left = createDetachedWingPreviewMesh(
                pair.left,
                assetState.materialTemplate,
                buildMirroredWingTransform(previewTransform, -1)
              );
              const right = createDetachedWingPreviewMesh(
                pair.right,
                assetState.materialTemplate,
                buildMirroredWingTransform(previewTransform, 1)
              );
              if (left) {
                group.add(left);
                group.userData.left = left;
              }
              if (right) {
                group.add(right);
                group.userData.right = right;
              }
              if (left || right) {
                return group;
              }
            }
          } catch (error) {
            console.warn(`Unable to prepare detached preview object for ${label}.`, error);
          }
        }
        return createWingPairPreviewGroup(assetState.previewGeometry, assetState.materialTemplate);
      };
      return {
        createMaterialInstance,
        loadPreviewAssets,
        loadEquippedAssets,
        createPreviewObject
      };
    }
    function buildMirroredWingTransform(transform, dir) {
      const position = Array.isArray(transform == null ? void 0 : transform.position) ? transform.position : [0.8, -0.78, 0.22];
      const rotation = Array.isArray(transform == null ? void 0 : transform.rotation) ? transform.rotation : [0.024, 0.076, -0.032];
      const scaleValue = Array.isArray(transform == null ? void 0 : transform.scale) ? transform.scale : [(transform == null ? void 0 : transform.scale) || 19.2, (transform == null ? void 0 : transform.scale) || 19.2, (transform == null ? void 0 : transform.scale) || 19.2];
      return {
        position: [dir * position[0], position[1], position[2]],
        rotation: [rotation[0], dir * rotation[1], dir * rotation[2]],
        scale: [scaleValue[0], scaleValue[1], scaleValue[2]]
      };
    }
    function applyWingTransform(target, transform) {
      if (!target || !transform) {
        return;
      }
      const position = Array.isArray(transform.position) ? transform.position : null;
      const rotation = Array.isArray(transform.rotation) ? transform.rotation : null;
      const scaleValue = Array.isArray(transform.scale) ? transform.scale : null;
      if ((position == null ? void 0 : position.length) === 3) {
        target.position.set(position[0], position[1], position[2]);
      }
      if ((rotation == null ? void 0 : rotation.length) === 3) {
        target.rotation.set(rotation[0], rotation[1], rotation[2]);
      }
      if ((scaleValue == null ? void 0 : scaleValue.length) === 3) {
        target.scale.set(scaleValue[0], scaleValue[1], scaleValue[2]);
      }
    }
    const SOCKETED_GLB_WING_PRESETS = Object.freeze({
      compact: Object.freeze({
        equipTransform: Object.freeze({
          position: [0.78, -0.76, 0.2],
          rotation: [0.024, 0.072, -0.03],
          scale: [19.2, 19.2, 19.2]
        }),
        previewTransform: Object.freeze({
          position: [0.64, -0.12, 0.08],
          rotation: [0.012, 0.018, -0.018],
          scale: [8.6, 8.6, 8.6]
        }),
        previewFit: Object.freeze({
          yOffsetRatio: 0.76,
          zOffsetRatio: 0.012,
          distanceMultiplier: 1.6,
          initialRotationY: 0
        }),
        itemThumbFit: Object.freeze({
          yOffsetRatio: 0.03,
          zOffsetRatio: 0.01,
          distanceMultiplier: 1.06
        })
      }),
      tall: Object.freeze({
        equipTransform: Object.freeze({
          position: [0.8, -0.78, 0.22],
          rotation: [0.024, 0.076, -0.032],
          scale: [19.2, 19.2, 19.2]
        }),
        previewTransform: Object.freeze({
          position: [0.66, -0.08, 0.06],
          rotation: [0.014, 0.018, -0.02],
          scale: [8.9, 8.9, 8.9]
        }),
        previewFit: Object.freeze({
          yOffsetRatio: 0.62,
          zOffsetRatio: 0.016,
          distanceMultiplier: 1.42,
          initialRotationY: 0
        }),
        itemThumbFit: Object.freeze({
          yOffsetRatio: -0.02,
          zOffsetRatio: 0.012,
          distanceMultiplier: 1.05
        })
      }),
      tallThin: Object.freeze({
        equipTransform: Object.freeze({
          position: [0.79, -0.77, 0.19],
          rotation: [0.023, 0.074, -0.029],
          scale: [19.2, 19.2, 19.2]
        }),
        previewTransform: Object.freeze({
          position: [0.65, -0.1, 0.06],
          rotation: [0.012, 0.018, -0.018],
          scale: [8.8, 8.8, 8.8]
        }),
        previewFit: Object.freeze({
          yOffsetRatio: 0.68,
          zOffsetRatio: 0.012,
          distanceMultiplier: 1.46,
          initialRotationY: 0
        }),
        itemThumbFit: Object.freeze({
          yOffsetRatio: 0,
          zOffsetRatio: 0.01,
          distanceMultiplier: 1.04
        })
      }),
      flatWide: Object.freeze({
        equipTransform: Object.freeze({
          position: [0.81, -0.82, 0.22],
          rotation: [0.022, 0.08, -0.034],
          scale: [19.2, 19.2, 19.2]
        }),
        previewTransform: Object.freeze({
          position: [0.68, -0.14, 0.05],
          rotation: [0.01, 0.02, -0.016],
          scale: [9.1, 9.1, 9.1]
        }),
        previewFit: Object.freeze({
          yOffsetRatio: 0.9,
          zOffsetRatio: 0.012,
          distanceMultiplier: 1.82,
          initialRotationY: 0
        }),
        itemThumbFit: Object.freeze({
          yOffsetRatio: 0.08,
          zOffsetRatio: 8e-3,
          distanceMultiplier: 1.16
        })
      })
    });
    const SOCKETED_GLB_WING_FACTORY_CONFIGS = Object.freeze({
      blossomissWings: Object.freeze({
        label: "Blossomiss Wings",
        modelUrl: "./Images/PROPS/Wings/BlossomissWings/BlossomissWings.glb",
        ...SOCKETED_GLB_WING_PRESETS.compact
      }),
      canvasOfNavelleWings: Object.freeze({
        label: "Canvas of Navelle",
        modelUrl: "./Images/PROPS/Wings/Canvas of Navelle/CanvasOfNavelle.glb",
        ...SOCKETED_GLB_WING_PRESETS.tall
      }),
      goddessOfValleysWings: Object.freeze({
        label: "Goddess of Valleys",
        modelUrl: "./Images/PROPS/Wings/Goddess of Valleys/GoddessOfValleys.glb",
        ...SOCKETED_GLB_WING_PRESETS.tall
      }),
      honeycombBloomsWings: Object.freeze({
        label: "Honeycomb Blooms",
        modelUrl: "./Images/PROPS/Wings/Honeycomb Blooms/HoneycombBlooms.glb",
        ...SOCKETED_GLB_WING_PRESETS.tall
      }),
      lavalcanoWings: Object.freeze({
        label: "Lavalcano Wings",
        modelUrl: "./Images/PROPS/Wings/LavalcanoWings/LavalcanoWings.glb",
        ...SOCKETED_GLB_WING_PRESETS.flatWide
      }),
      lightOfSmilesWings: Object.freeze({
        label: "Light of Smiles",
        modelUrl: "./Images/PROPS/Wings/LightOfSmiles/LightOfSmiles.glb",
        ...SOCKETED_GLB_WING_PRESETS.tallThin
      }),
      moonlightAmayaWings: Object.freeze({
        label: "Moonlight Amaya",
        modelUrl: "./Images/PROPS/Wings/Moonlight Amaya/MoonlightAmaya.glb",
        ...SOCKETED_GLB_WING_PRESETS.tallThin
      })
    });
    function createSocketedGlbWingPropFactory(config) {
      const assetState = {
        loader: new GLTFLoader(),
        modelUrl: config.modelUrl,
        previewLoadPromise: null,
        equippedLoadPromise: null,
        previewGeometry: null,
        leftGeometry: null,
        rightGeometry: null,
        materialTemplate: null
      };
      const assetController = createGlbWingAssetController(assetState, config.label);
      const makeWingSide = (side = "left") => {
        const dir = side === "left" ? -1 : 1;
        const wing = new THREE.Group();
        applyWingTransform(wing, buildMirroredWingTransform(config.equipTransform, dir));
        wing.userData.loadedFromGlb = false;
        wing.userData.previewTransform = buildMirroredWingTransform(config.previewTransform, dir);
        wing.userData.equippedReadyPromise = null;
        wing.userData.ensureEquippedReady = () => {
          if (wing.userData.equippedReadyPromise) {
            return wing.userData.equippedReadyPromise;
          }
          wing.userData.equippedReadyPromise = assetController.loadEquippedAssets().then((pair) => {
            const targetGeometry = side === "left" ? pair.left : pair.right;
            const material = assetController.createMaterialInstance();
            if (!targetGeometry || !material) {
              return;
            }
            wing.clear();
            const mesh = new THREE.Mesh(targetGeometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.frustumCulled = false;
            wing.add(mesh);
            wing.userData.mesh = mesh;
            wing.userData.loadedFromGlb = true;
          }).catch(() => null);
          return wing.userData.equippedReadyPromise;
        };
        return wing;
      };
      return function makeSocketedGlbWingProp() {
        const g = new THREE.Group();
        const left = makeWingSide("left");
        const right = makeWingSide("right");
        left.visible = false;
        right.visible = false;
        leftWingGroup.add(left);
        rightWingGroup.add(right);
        g.userData.left = left;
        g.userData.right = right;
        g.userData.previewReadyPromise = null;
        g.userData.ensurePreviewReady = () => {
          if (g.userData.previewReadyPromise) {
            return g.userData.previewReadyPromise;
          }
          g.userData.previewReadyPromise = assetController.loadPreviewAssets();
          return g.userData.previewReadyPromise;
        };
        g.userData.equippedReadyPromise = null;
        g.userData.ensureEquippedReady = () => {
          var _a, _b, _c, _d;
          if (g.userData.equippedReadyPromise) {
            return g.userData.equippedReadyPromise;
          }
          g.userData.equippedReadyPromise = Promise.allSettled([
            ((_b = (_a = left.userData).ensureEquippedReady) == null ? void 0 : _b.call(_a)) || left.userData.equippedReadyPromise,
            ((_d = (_c = right.userData).ensureEquippedReady) == null ? void 0 : _d.call(_c)) || right.userData.equippedReadyPromise
          ]);
          return g.userData.equippedReadyPromise;
        };
        g.userData.createPreviewObject = () => assetController.createPreviewObject(config.previewTransform);
        return g;
      };
    }
    const makeBlossomissWingsProp = createSocketedGlbWingPropFactory(SOCKETED_GLB_WING_FACTORY_CONFIGS.blossomissWings);
    const makeCanvasOfNavelleWingsProp = createSocketedGlbWingPropFactory(SOCKETED_GLB_WING_FACTORY_CONFIGS.canvasOfNavelleWings);
    const makeGoddessOfValleysWingsProp = createSocketedGlbWingPropFactory(SOCKETED_GLB_WING_FACTORY_CONFIGS.goddessOfValleysWings);
    const makeHoneycombBloomsWingsProp = createSocketedGlbWingPropFactory(SOCKETED_GLB_WING_FACTORY_CONFIGS.honeycombBloomsWings);
    const makeLavalcanoWingsProp = createSocketedGlbWingPropFactory(SOCKETED_GLB_WING_FACTORY_CONFIGS.lavalcanoWings);
    const makeLightOfSmilesWingsProp = createSocketedGlbWingPropFactory(SOCKETED_GLB_WING_FACTORY_CONFIGS.lightOfSmilesWings);
    const makeMoonlightAmayaWingsProp = createSocketedGlbWingPropFactory(SOCKETED_GLB_WING_FACTORY_CONFIGS.moonlightAmayaWings);
    function loadXatoriWingAssets() {
      return xatoriWingAssetController.loadEquippedAssets();
    }
    function loadEndlessWingAssets() {
      return endlessWingAssetController.loadEquippedAssets();
    }
    function createEmeraldCoenWingMaterialInstance() {
      return emeraldCoenWingAssetController.createMaterialInstance();
    }
    function loadEmeraldCoenWingAssets() {
      return emeraldCoenWingAssetController.loadEquippedAssets();
    }
    function makeEmeraldCoenWingSide(side = "left") {
      const dir = side === "left" ? -1 : 1;
      const wing = new THREE.Group();
      wing.position.set(dir * 0.8, -0.78, 0.22);
      wing.rotation.set(0.024, dir * 0.076, -0.032 * dir);
      wing.scale.set(19.2, 19.2, 19.2);
      wing.userData.loadedFromGlb = false;
      wing.userData.previewTransform = {
        position: [dir * 0.66, -0.08, 0.06],
        rotation: [0.014, dir * 0.018, -0.02 * dir],
        scale: [8.9, 8.9, 8.9]
      };
      wing.userData.equippedReadyPromise = null;
      wing.userData.ensureEquippedReady = () => {
        if (wing.userData.equippedReadyPromise) {
          return wing.userData.equippedReadyPromise;
        }
        wing.userData.equippedReadyPromise = loadEmeraldCoenWingAssets().then((pair) => {
          const targetGeometry = side === "left" ? pair.left : pair.right;
          const material = createEmeraldCoenWingMaterialInstance();
          if (!targetGeometry || !material) {
            return;
          }
          wing.clear();
          const mesh = new THREE.Mesh(targetGeometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.frustumCulled = false;
          wing.add(mesh);
          wing.userData.mesh = mesh;
          wing.userData.loadedFromGlb = true;
        }).catch(() => null);
        return wing.userData.equippedReadyPromise;
      };
      return wing;
    }
    function makeEmeraldCoenWingsProp() {
      const g = new THREE.Group();
      const left = makeEmeraldCoenWingSide("left");
      const right = makeEmeraldCoenWingSide("right");
      left.visible = false;
      right.visible = false;
      leftWingGroup.add(left);
      rightWingGroup.add(right);
      g.userData.left = left;
      g.userData.right = right;
      g.userData.previewReadyPromise = null;
      g.userData.ensurePreviewReady = () => {
        if (g.userData.previewReadyPromise) {
          return g.userData.previewReadyPromise;
        }
        g.userData.previewReadyPromise = emeraldCoenWingAssetController.loadPreviewAssets();
        return g.userData.previewReadyPromise;
      };
      g.userData.equippedReadyPromise = null;
      g.userData.ensureEquippedReady = () => {
        var _a, _b, _c, _d;
        if (g.userData.equippedReadyPromise) {
          return g.userData.equippedReadyPromise;
        }
        g.userData.equippedReadyPromise = Promise.allSettled([
          ((_b = (_a = left.userData).ensureEquippedReady) == null ? void 0 : _b.call(_a)) || left.userData.equippedReadyPromise,
          ((_d = (_c = right.userData).ensureEquippedReady) == null ? void 0 : _d.call(_c)) || right.userData.equippedReadyPromise
        ]);
        return g.userData.equippedReadyPromise;
      };
      g.userData.createPreviewObject = () => emeraldCoenWingAssetController.createPreviewObject({
        position: [0.66, -0.08, 0.06],
        rotation: [0.014, 0.018, -0.02],
        scale: [8.9, 8.9, 8.9]
      });
      return g;
    }
    function makeEndlessWingSide(side = "left") {
      const dir = side === "left" ? -1 : 1;
      const wing = new THREE.Group();
      wing.position.set(dir * 0.8, -0.8, 0.22);
      wing.rotation.set(0.024, dir * 0.076, -0.032 * dir);
      wing.scale.set(19.2, 19.2, 19.2);
      wing.userData.loadedFromGlb = false;
      wing.userData.previewTransform = {
        position: [dir * 0.66, -0.1, 0.06],
        rotation: [0.014, dir * 0.018, -0.02 * dir],
        scale: [8.9, 8.9, 8.9]
      };
      wing.userData.equippedReadyPromise = null;
      wing.userData.ensureEquippedReady = () => {
        if (wing.userData.equippedReadyPromise) {
          return wing.userData.equippedReadyPromise;
        }
        wing.userData.equippedReadyPromise = loadEndlessWingAssets().then((pair) => {
          const targetGeometry = side === "left" ? pair.left : pair.right;
          const material = createEndlessWingMaterialInstance();
          if (!targetGeometry || !material) {
            return;
          }
          wing.clear();
          const mesh = new THREE.Mesh(targetGeometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.frustumCulled = false;
          wing.add(mesh);
          wing.userData.mesh = mesh;
          wing.userData.loadedFromGlb = true;
        }).catch(() => null);
        return wing.userData.equippedReadyPromise;
      };
      return wing;
    }
    function makeEndlessWingsProp() {
      const g = new THREE.Group();
      const left = makeEndlessWingSide("left");
      const right = makeEndlessWingSide("right");
      left.visible = false;
      right.visible = false;
      leftWingGroup.add(left);
      rightWingGroup.add(right);
      g.userData.left = left;
      g.userData.right = right;
      g.userData.previewReadyPromise = null;
      g.userData.ensurePreviewReady = () => {
        if (g.userData.previewReadyPromise) {
          return g.userData.previewReadyPromise;
        }
        g.userData.previewReadyPromise = endlessWingAssetController.loadPreviewAssets();
        return g.userData.previewReadyPromise;
      };
      g.userData.equippedReadyPromise = null;
      g.userData.ensureEquippedReady = () => {
        var _a, _b, _c, _d;
        if (g.userData.equippedReadyPromise) {
          return g.userData.equippedReadyPromise;
        }
        g.userData.equippedReadyPromise = Promise.allSettled([
          ((_b = (_a = left.userData).ensureEquippedReady) == null ? void 0 : _b.call(_a)) || left.userData.equippedReadyPromise,
          ((_d = (_c = right.userData).ensureEquippedReady) == null ? void 0 : _d.call(_c)) || right.userData.equippedReadyPromise
        ]);
        return g.userData.equippedReadyPromise;
      };
      g.userData.createPreviewObject = () => endlessWingAssetController.createPreviewObject({
        position: [0.66, -0.1, 0.06],
        rotation: [0.014, 0.018, -0.02],
        scale: [8.9, 8.9, 8.9]
      });
      return g;
    }
    function makeXatoriWingSide(side = "left") {
      const dir = side === "left" ? -1 : 1;
      const wing = new THREE.Group();
      wing.position.set(dir * 0.78, -0.76, 0.2);
      wing.rotation.set(0.024, dir * 0.072, -0.03 * dir);
      wing.scale.set(19.2, 19.2, 19.2);
      wing.userData.loadedFromGlb = false;
      wing.userData.previewTransform = {
        position: [dir * 0.64, -0.12, 0.08],
        rotation: [0.012, dir * 0.018, -0.018 * dir],
        scale: [8.6, 8.6, 8.6]
      };
      wing.userData.equippedReadyPromise = null;
      wing.userData.ensureEquippedReady = () => {
        if (wing.userData.equippedReadyPromise) {
          return wing.userData.equippedReadyPromise;
        }
        wing.userData.equippedReadyPromise = loadXatoriWingAssets().then((pair) => {
          const targetGeometry = side === "left" ? pair.left : pair.right;
          const material = createXatoriWingMaterialInstance();
          if (!targetGeometry || !material) {
            return;
          }
          wing.clear();
          const mesh = new THREE.Mesh(targetGeometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.frustumCulled = false;
          wing.add(mesh);
          wing.userData.mesh = mesh;
          wing.userData.loadedFromGlb = true;
        }).catch(() => null);
        return wing.userData.equippedReadyPromise;
      };
      return wing;
    }
    function makeXatoriWingsProp() {
      const g = new THREE.Group();
      const left = makeXatoriWingSide("left");
      const right = makeXatoriWingSide("right");
      left.visible = false;
      right.visible = false;
      leftWingGroup.add(left);
      rightWingGroup.add(right);
      g.userData.left = left;
      g.userData.right = right;
      g.userData.previewReadyPromise = null;
      g.userData.ensurePreviewReady = () => {
        if (g.userData.previewReadyPromise) {
          return g.userData.previewReadyPromise;
        }
        g.userData.previewReadyPromise = xatoriWingAssetController.loadPreviewAssets();
        return g.userData.previewReadyPromise;
      };
      g.userData.equippedReadyPromise = null;
      g.userData.ensureEquippedReady = () => {
        var _a, _b, _c, _d;
        if (g.userData.equippedReadyPromise) {
          return g.userData.equippedReadyPromise;
        }
        g.userData.equippedReadyPromise = Promise.allSettled([
          ((_b = (_a = left.userData).ensureEquippedReady) == null ? void 0 : _b.call(_a)) || left.userData.equippedReadyPromise,
          ((_d = (_c = right.userData).ensureEquippedReady) == null ? void 0 : _d.call(_c)) || right.userData.equippedReadyPromise
        ]);
        return g.userData.equippedReadyPromise;
      };
      g.userData.createPreviewObject = () => xatoriWingAssetController.createPreviewObject({
        position: [0.64, -0.12, 0.08],
        rotation: [0.012, 0.018, -0.018],
        scale: [8.6, 8.6, 8.6]
      });
      return g;
    }
    function createEfernoFallbackWingGeometry(side = "left") {
      const dir = side === "left" ? -1 : 1;
      const mx = (x) => x * dir;
      const shape = new THREE.Shape();
      shape.moveTo(mx(0), -0.05);
      shape.quadraticCurveTo(mx(0.16), 0.28, mx(0.54), 0.84);
      shape.quadraticCurveTo(mx(0.88), 1.18, mx(1.02), 1.34);
      shape.quadraticCurveTo(mx(0.94), 1.06, mx(0.78), 0.76);
      shape.quadraticCurveTo(mx(0.92), 0.72, mx(1.08), 0.62);
      shape.quadraticCurveTo(mx(0.88), 0.42, mx(0.62), 0.34);
      shape.quadraticCurveTo(mx(0.82), 0.26, mx(0.96), 0.14);
      shape.quadraticCurveTo(mx(0.7), 0.02, mx(0.44), -0.02);
      shape.quadraticCurveTo(mx(0.58), -0.14, mx(0.68), -0.28);
      shape.quadraticCurveTo(mx(0.4), -0.32, mx(0.16), -0.22);
      shape.quadraticCurveTo(mx(0.05), -0.18, mx(0), -0.05);
      shape.closePath();
      return prepareWingGeometryForEferno(new THREE.ShapeGeometry(shape, 92));
    }
    function loadEfernoWingGeometries() {
      const clonePrepared = () => {
        var _a, _b;
        return {
          left: ((_a = efernoWingAssetState.leftGeometry) == null ? void 0 : _a.clone()) || null,
          right: ((_b = efernoWingAssetState.rightGeometry) == null ? void 0 : _b.clone()) || null
        };
      };
      if (efernoWingAssetState.leftGeometry && efernoWingAssetState.rightGeometry) {
        return Promise.resolve(clonePrepared());
      }
      if (!efernoWingAssetState.loadPromise) {
        efernoWingAssetState.loadPromise = new Promise((resolve, reject) => {
          efernoWingAssetState.loader.load(
            efernoWingAssetState.modelUrl,
            (gltf) => {
              var _a, _b, _c;
              const root = (gltf == null ? void 0 : gltf.scene) || ((_a = gltf == null ? void 0 : gltf.scenes) == null ? void 0 : _a[0]) || null;
              const sourceGeometry = getLargestMeshGeometryFromObject(root);
              if (!sourceGeometry) {
                reject(new Error("Eferno GLB did not contain a mesh with geometry."));
                return;
              }
              const split = splitPairWingGeometry2(sourceGeometry);
              if (sourceGeometry == null ? void 0 : sourceGeometry.dispose) {
                sourceGeometry.dispose();
              }
              if (!(split == null ? void 0 : split.left) || !(split == null ? void 0 : split.right)) {
                reject(new Error("Eferno GLB could not be split into left/right wings."));
                return;
              }
              const preparedLeft = prepareWingGeometryForEferno(split.left);
              const preparedRight = prepareWingGeometryForEferno(split.right);
              if ((_b = split.left) == null ? void 0 : _b.dispose) split.left.dispose();
              if ((_c = split.right) == null ? void 0 : _c.dispose) split.right.dispose();
              if (!preparedLeft || !preparedRight) {
                reject(new Error("Eferno wing geometry preparation failed."));
                return;
              }
              efernoWingAssetState.leftGeometry = preparedLeft;
              efernoWingAssetState.rightGeometry = preparedRight;
              resolve();
            },
            void 0,
            (error) => reject(error)
          );
        }).catch((error) => {
          console.warn("Unable to load Eferno wing GLB, falling back to procedural geometry.", error);
        });
      }
      return efernoWingAssetState.loadPromise.then(() => clonePrepared());
    }
    function makeEfernoEmberSystem(side = "left") {
      const dir = side === "left" ? -1 : 1;
      const count = 92;
      const positions = new Float32Array(count * 3);
      const basePositions = new Float32Array(count * 3);
      const phases = new Float32Array(count);
      let seed = side === "left" ? 19431 : 68217;
      const rand = () => {
        seed = seed * 1664525 + 1013904223 >>> 0;
        return seed / 4294967296;
      };
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const spread = 0.2 + rand() * 1.08;
        const y = -0.34 + rand() * 1.78;
        const z = 0.08 + rand() * 0.42;
        basePositions[i3] = dir * spread;
        basePositions[i3 + 1] = y;
        basePositions[i3 + 2] = z;
        positions[i3] = basePositions[i3];
        positions[i3 + 1] = basePositions[i3 + 1];
        positions[i3 + 2] = basePositions[i3 + 2];
        phases[i] = rand() * Math.PI * 2;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        color: 16757323,
        size: 0.06,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.76,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      return {
        points,
        basePositions,
        phases,
        speed: 2.9 + rand() * 1.2,
        drift: 0.05 + rand() * 0.04,
        rise: 0.16 + rand() * 0.08,
        phaseOffset: rand() * Math.PI * 2
      };
    }
    function makeEfernoWingSide(side = "left", sharedMaps) {
      const dir = side === "left" ? -1 : 1;
      const wing = new THREE.Group();
      wing.position.set(dir * 0.58, -0.22, 0.18);
      wing.rotation.set(0.02, dir * 0.045, -0.015 * dir);
      wing.scale.set(6.3, 6.3, 6.3);
      const membraneMat = new THREE.MeshPhysicalMaterial({
        color: 16777215,
        map: sharedMaps.diffuse,
        emissive: 16736017,
        emissiveMap: sharedMaps.emissive,
        emissiveIntensity: 1.6,
        roughnessMap: sharedMaps.roughness,
        roughness: 0.56,
        metalness: 0.04,
        transmission: 0.04,
        thickness: 0.3,
        alphaMap: sharedMaps.alpha,
        alphaTest: 0.14,
        transparent: true,
        opacity: 0.985,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const glowMat = new THREE.MeshBasicMaterial({
        map: sharedMaps.emissive,
        color: 16756050,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      });
      const rootMat = new THREE.MeshPhysicalMaterial({
        color: 6166024,
        emissive: 16738329,
        emissiveIntensity: 0.5,
        roughness: 0.44,
        metalness: 0.05,
        clearcoat: 0.22,
        clearcoatRoughness: 0.4
      });
      const rootCore = new THREE.Mesh(new THREE.SphereGeometry(0.08, 18, 14), rootMat);
      rootCore.position.set(dir * 0.03, -0.03, 0.12);
      wing.add(rootCore);
      const fallbackGeometry = createEfernoFallbackWingGeometry(side);
      const membraneMesh = new THREE.Mesh(fallbackGeometry, membraneMat);
      membraneMesh.renderOrder = 2;
      wing.add(membraneMesh);
      const glowMesh = new THREE.Mesh(fallbackGeometry.clone(), glowMat);
      glowMesh.position.z += 0.012;
      glowMesh.renderOrder = 3;
      wing.add(glowMesh);
      const innerLight = new THREE.PointLight(16748330, 1.28, 8.2, 2);
      innerLight.position.set(dir * 1.2, 0.2, 0.78);
      wing.add(innerLight);
      const tipLight = new THREE.PointLight(16731663, 0.74, 6.4, 2);
      tipLight.position.set(dir * 2.2, 0.68, 0.58);
      wing.add(tipLight);
      const emberSystem = makeEfernoEmberSystem(side);
      wing.add(emberSystem.points);
      const swapGeometry = (geometry) => {
        if (!geometry) return;
        const previousMain = membraneMesh.geometry;
        const previousGlow = glowMesh.geometry;
        membraneMesh.geometry = geometry;
        glowMesh.geometry = geometry.clone();
        if (previousMain && previousMain !== geometry && previousMain !== glowMesh.geometry) {
          previousMain.dispose();
        }
        if (previousGlow && previousGlow !== membraneMesh.geometry && previousGlow !== glowMesh.geometry) {
          previousGlow.dispose();
        }
        membraneMesh.geometry.computeBoundingSphere();
        glowMesh.geometry.computeBoundingSphere();
      };
      loadEfernoWingGeometries().then((pair) => {
        const targetGeometry = side === "left" ? pair.left : pair.right;
        if (!targetGeometry) {
          return;
        }
        swapGeometry(targetGeometry);
        wing.userData.loadedFromGlb = true;
      }).catch(() => {
      });
      wing.userData.fireMats = [membraneMat];
      wing.userData.glowMats = [glowMat];
      wing.userData.fireLights = [innerLight, tipLight];
      wing.userData.emberSystems = [emberSystem];
      return wing;
    }
    function makeEfernoWingsProp() {
      const g = new THREE.Group();
      const efernoMaps = makeEfernoWingMaps();
      const left = makeEfernoWingSide("left", efernoMaps);
      const right = makeEfernoWingSide("right", efernoMaps);
      left.visible = false;
      right.visible = false;
      leftWingGroup.add(left);
      rightWingGroup.add(right);
      g.userData.left = left;
      g.userData.right = right;
      g.userData.fireMats = [
        ...left.userData.fireMats || [],
        ...right.userData.fireMats || []
      ];
      g.userData.glowMats = [
        ...left.userData.glowMats || [],
        ...right.userData.glowMats || []
      ];
      g.userData.fireLights = [
        ...left.userData.fireLights || [],
        ...right.userData.fireLights || []
      ];
      g.userData.emberSystems = [
        ...left.userData.emberSystems || [],
        ...right.userData.emberSystems || []
      ];
      return g;
    }
    function makeRoboticWingSide(side = "left") {
      const dir = side === "left" ? -1 : 1;
      const wing = new THREE.Group();
      wing.position.set(dir * 0.58, -0.34, 0.3);
      wing.rotation.set(0.02, dir * 0.02, -0.02 * dir);
      wing.scale.set(2.58, 2.58, 2.58);
      const chromeMat = new THREE.MeshPhysicalMaterial({
        color: 14149108,
        metalness: 0.98,
        roughness: 0.18,
        clearcoat: 1,
        clearcoatRoughness: 0.09,
        envMapIntensity: 0.8
      });
      const steelMat = new THREE.MeshPhysicalMaterial({
        color: 3820389,
        metalness: 0.94,
        roughness: 0.28,
        clearcoat: 0.5,
        clearcoatRoughness: 0.25,
        envMapIntensity: 0.62
      });
      const cyanMat = new THREE.MeshStandardMaterial({
        color: 6088959,
        emissive: 3660031,
        emissiveIntensity: 1.35,
        metalness: 0.12,
        roughness: 0.24
      });
      const finMat = new THREE.MeshPhysicalMaterial({
        color: 8385535,
        emissive: 3139071,
        emissiveIntensity: 0.5,
        transmission: 0.68,
        thickness: 0.32,
        roughness: 0.21,
        metalness: 0.03,
        transparent: true,
        opacity: 0.72,
        ior: 1.2,
        side: THREE.DoubleSide
      });
      const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.66, 22), steelMat);
      shoulder.rotation.z = Math.PI * 0.5;
      shoulder.position.set(dir * 0.32, 0.1, -0.07);
      wing.add(shoulder);
      const spine = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.02, 10, 16), chromeMat);
      spine.rotation.z = Math.PI * 0.5;
      spine.position.set(dir * 0.9, 0.2, -0.06);
      wing.add(spine);
      const armorShell = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 1.55, 10, 18), chromeMat);
      armorShell.rotation.z = Math.PI * 0.5;
      armorShell.position.set(dir * 1.65, 0.6, -0.03);
      armorShell.scale.set(1.22, 0.78, 0.74);
      wing.add(armorShell);
      const armorCut = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 1.2, 8, 14), steelMat);
      armorCut.rotation.z = Math.PI * 0.5;
      armorCut.position.set(dir * 1.62, 0.56, -0.25);
      armorCut.scale.set(1.05, 0.7, 0.55);
      wing.add(armorCut);
      const upperBlade = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.34, 2.75, 10, 1), chromeMat);
      upperBlade.rotation.z = dir > 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
      upperBlade.position.set(dir * 1.92, 0.77, -0.02);
      wing.add(upperBlade);
      const upperBladeBack = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.22, 2.5, 8, 1), steelMat);
      upperBladeBack.rotation.z = upperBlade.rotation.z;
      upperBladeBack.position.set(dir * 1.74, 0.52, -0.26);
      wing.add(upperBladeBack);
      const lowerBlade = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.24, 2.3, 10, 1), steelMat);
      lowerBlade.rotation.z = dir > 0 ? -Math.PI * 0.56 : Math.PI * 0.56;
      lowerBlade.position.set(dir * 1.56, -0.36, -0.18);
      wing.add(lowerBlade);
      const sideSpike = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.82, 8), chromeMat);
      sideSpike.rotation.z = dir > 0 ? -Math.PI * 0.42 : Math.PI * 0.42;
      sideSpike.rotation.x = Math.PI * 0.15;
      sideSpike.position.set(dir * 1.28, -0.06, 0.22);
      wing.add(sideSpike);
      const sidePlate = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.1, 0.36), steelMat);
      sidePlate.position.set(dir * 1.72, 0.02, -0.02);
      sidePlate.rotation.set(0.12, 0.24 * dir, dir > 0 ? -0.48 : 0.48);
      wing.add(sidePlate);
      const ringLarge = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 18, 36), steelMat);
      ringLarge.rotation.y = Math.PI * 0.5;
      ringLarge.position.set(dir * 1.08, 0.08, 0.12);
      wing.add(ringLarge);
      const ringCore = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), cyanMat);
      ringCore.position.copy(ringLarge.position);
      wing.add(ringCore);
      const ringSmall = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 16, 28), steelMat);
      ringSmall.rotation.y = Math.PI * 0.5;
      ringSmall.position.set(dir * 1.74, -0.62, 0.06);
      wing.add(ringSmall);
      const ringSmallCore = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), cyanMat);
      ringSmallCore.position.copy(ringSmall.position);
      wing.add(ringSmallCore);
      const tipCore = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 14), cyanMat);
      tipCore.position.set(dir * 2.84, 0.98, 0.05);
      wing.add(tipCore);
      const finUpper = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.95, 10), finMat);
      finUpper.rotation.z = dir > 0 ? -Math.PI * 0.4 : Math.PI * 0.4;
      finUpper.position.set(dir * 2.44, 1.24, 0.22);
      finUpper.scale.set(1.05, 1.65, 0.5);
      wing.add(finUpper);
      const finLower = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.1, 10), finMat);
      finLower.rotation.z = dir > 0 ? -Math.PI * 0.62 : Math.PI * 0.62;
      finLower.position.set(dir * 2.04, -0.62, 0.12);
      finLower.scale.set(1, 1.45, 0.5);
      wing.add(finLower);
      const finRear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.92, 10), finMat);
      finRear.rotation.z = dir > 0 ? -Math.PI * 0.28 : Math.PI * 0.28;
      finRear.position.set(dir * 2.58, 0.66, -0.16);
      finRear.scale.set(0.95, 1.2, 0.45);
      wing.add(finRear);
      const glowBar = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.62, 6, 12), cyanMat);
      glowBar.rotation.z = dir > 0 ? -Math.PI * 0.62 : Math.PI * 0.62;
      glowBar.position.set(dir * 2.2, -0.52, 0.2);
      wing.add(glowBar);
      const edgeStrip = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 1, 6, 12), cyanMat);
      edgeStrip.rotation.z = dir > 0 ? -Math.PI * 0.44 : Math.PI * 0.44;
      edgeStrip.position.set(dir * 2.38, 0.72, 0.24);
      wing.add(edgeStrip);
      const microBoltGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.03, 8);
      for (let i = 0; i < 7; i++) {
        const bolt = new THREE.Mesh(microBoltGeo, steelMat);
        bolt.rotation.x = Math.PI * 0.5;
        bolt.position.set(dir * (0.72 + i * 0.25), 0.31 - i * 0.08, 0.19);
        wing.add(bolt);
      }
      const wingBlueLight = new THREE.PointLight(5827839, 0.75, 5.2, 2);
      wingBlueLight.position.set(dir * 1.5, 0.2, 0.35);
      wing.add(wingBlueLight);
      wing.userData.emitters = [ringCore, ringSmallCore, tipCore, glowBar, edgeStrip];
      return wing;
    }
    function makeRoboticWingsProp() {
      const g = new THREE.Group();
      const left = makeRoboticWingSide("left");
      const right = makeRoboticWingSide("right");
      left.visible = false;
      right.visible = false;
      leftWingGroup.add(left);
      rightWingGroup.add(right);
      g.userData.left = left;
      g.userData.right = right;
      g.userData.emitters = [
        ...left.userData.emitters || [],
        ...right.userData.emitters || []
      ];
      return g;
    }
    function makeAlphaWingTextures() {
      const size = 1024;
      const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      function makePanelTexture({ baseA, baseB, edgeTint, stripeA, stripeB, seedBase }) {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        let seed = seedBase >>> 0;
        const rand = () => {
          seed = seed * 1664525 + 1013904223 >>> 0;
          return seed / 4294967296;
        };
        const base = ctx.createLinearGradient(0, 0, size, size);
        base.addColorStop(0, baseA);
        base.addColorStop(0.54, baseB);
        base.addColorStop(1, "#0f1636");
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, size, size);
        for (let i = 0; i < 3; i++) {
          const y = size * (0.26 + i * 0.18 + rand() * 0.04);
          const alpha = 0.2 + rand() * 0.16;
          ctx.strokeStyle = `rgba(235,248,255,${alpha})`;
          ctx.lineWidth = 6 + rand() * 5;
          ctx.beginPath();
          ctx.moveTo(size * 0.04, y);
          ctx.lineTo(size * 0.95, y + (rand() - 0.5) * 26);
          ctx.stroke();
        }
        for (let i = 0; i < 6; i++) {
          const x = size * (0.04 + rand() * 0.84);
          const y = size * (0.08 + rand() * 0.82);
          const w = 140 + rand() * 230;
          const h = 4 + rand() * 8;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(-0.2 + rand() * 0.4);
          ctx.fillStyle = i % 2 === 0 ? stripeA : stripeB;
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = edgeTint;
          ctx.fillRect(2, 2, Math.max(6, w * 0.35), Math.max(2, h * 0.38));
          ctx.restore();
        }
        const vignette = ctx.createRadialGradient(size * 0.54, size * 0.48, 80, size * 0.54, size * 0.48, size * 0.76);
        vignette.addColorStop(0, "rgba(0,0,0,0)");
        vignette.addColorStop(1, "rgba(0,0,0,0.5)");
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, size, size);
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = maxAnisotropy;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 1);
        tex.needsUpdate = true;
        return tex;
      }
      const sparkCanvas = document.createElement("canvas");
      sparkCanvas.width = 128;
      sparkCanvas.height = 128;
      const sCtx = sparkCanvas.getContext("2d");
      const sparkGrad = sCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
      sparkGrad.addColorStop(0, "rgba(255,255,255,1)");
      sparkGrad.addColorStop(0.24, "rgba(181,242,255,0.95)");
      sparkGrad.addColorStop(0.58, "rgba(255,124,232,0.78)");
      sparkGrad.addColorStop(1, "rgba(255,255,255,0)");
      sCtx.fillStyle = sparkGrad;
      sCtx.fillRect(0, 0, 128, 128);
      const sparkTexture = new THREE.CanvasTexture(sparkCanvas);
      sparkTexture.colorSpace = THREE.SRGBColorSpace;
      sparkTexture.needsUpdate = true;
      return {
        cyanPanel: makePanelTexture({
          baseA: "#0f2a56",
          baseB: "#1a417f",
          edgeTint: "rgba(215,251,255,0.55)",
          stripeA: "rgba(64,229,255,0.84)",
          stripeB: "rgba(153,242,255,0.72)",
          seedBase: 9733
        }),
        magentaPanel: makePanelTexture({
          baseA: "#2a1454",
          baseB: "#4a1f7a",
          edgeTint: "rgba(255,214,255,0.52)",
          stripeA: "rgba(255,84,219,0.86)",
          stripeB: "rgba(204,112,255,0.72)",
          seedBase: 48179
        }),
        sparkTexture
      };
    }
    function makeAlphaBladeGeometry(dir, options = {}) {
      const {
        length = 3.2,
        rootWidth = 0.58,
        tipWidth = 0.2,
        thickness = 0.07,
        camber = 0.12,
        droop = 0,
        sweep = 0.1,
        twist = 0.05
      } = options;
      const mx = (x) => x * dir;
      const shape = new THREE.Shape();
      shape.moveTo(mx(0), -rootWidth * 0.5);
      shape.bezierCurveTo(
        mx(length * 0.34),
        -rootWidth * 0.68 + sweep * 0.18,
        mx(length * 0.88),
        -tipWidth * 0.62 + sweep,
        mx(length),
        -tipWidth * 0.46 + sweep
      );
      shape.quadraticCurveTo(mx(length * 1.03), sweep * 0.82, mx(length), tipWidth * 0.48 + sweep);
      shape.bezierCurveTo(
        mx(length * 0.9),
        tipWidth * 0.72 + sweep,
        mx(length * 0.38),
        rootWidth * 0.66 + sweep * 0.14,
        mx(0),
        rootWidth * 0.5
      );
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: thickness,
        bevelEnabled: true,
        bevelSize: 0.015,
        bevelThickness: 0.015,
        bevelSegments: 2,
        curveSegments: 42
      });
      geo.translate(0, 0, -thickness * 0.5);
      const pos = geo.attributes.position;
      const uv = new Float32Array(pos.count * 2);
      const halfRoot = Math.max(1e-3, rootWidth * 0.5);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const nx = THREE.MathUtils.clamp(Math.abs(x) / Math.max(1e-3, length), 0, 1);
        const ny = THREE.MathUtils.clamp(y / halfRoot, -1, 1);
        const camberOffset = Math.sin(nx * Math.PI) * camber;
        const twistOffset = ny * twist * Math.pow(nx, 1.2);
        const droopOffset = Math.pow(nx, 1.45) * droop;
        pos.setXYZ(i, x, y + droopOffset, z + camberOffset + twistOffset);
        uv[i * 2] = nx;
        uv[i * 2 + 1] = THREE.MathUtils.clamp((ny + 1) * 0.5, 0, 1);
      }
      geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      return geo;
    }
    function makeAlphaSparkSystem(dir, sparkTexture) {
      const count = 16;
      const positions = new Float32Array(count * 3);
      const basePositions = new Float32Array(count * 3);
      const phases = new Float32Array(count);
      let seed = dir > 0 ? 13579 : 35791;
      const rand = () => {
        seed = seed * 1103515245 + 12345 >>> 0;
        return (seed & 2147483647) / 2147483647;
      };
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const x = dir * (0.56 + rand() * 3.1);
        const y = -1.2 + rand() * 3.5;
        const z = -0.06 + rand() * 0.46;
        positions[idx] = basePositions[idx] = x;
        positions[idx + 1] = basePositions[idx + 1] = y;
        positions[idx + 2] = basePositions[idx + 2] = z;
        phases[i] = rand() * Math.PI * 2;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: 16761599,
        map: sparkTexture,
        alphaMap: sparkTexture,
        size: 0.052,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.56,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const points = new THREE.Points(geo, mat);
      return {
        points,
        basePositions,
        phases,
        speed: 2.6 + rand() * 0.8,
        drift: 0.016 + rand() * 0.012,
        phaseOffset: rand() * Math.PI * 2
      };
    }
    function makeAlphaWingSide(side = "left", shared) {
      const dir = side === "left" ? -1 : 1;
      const wing = new THREE.Group();
      wing.position.set(dir * 0.66, -0.2, 0.24);
      wing.rotation.set(0.02, dir * 0.04, -0.01 * dir);
      wing.scale.set(1.68, 1.68, 1.68);
      const emitters = [];
      const lights = [];
      const rootBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.5, 22), shared.frameDark);
      rootBase.rotation.z = Math.PI * 0.5;
      rootBase.position.set(dir * 0.2, 0.02, -0.02);
      wing.add(rootBase);
      const rootCollar = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.045, 14, 34), shared.alloyDark);
      rootCollar.rotation.y = Math.PI * 0.5;
      rootCollar.position.set(dir * 0.46, 0.03, 0.08);
      wing.add(rootCollar);
      const hubRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 18, 44), shared.alloyBright);
      hubRing.rotation.y = Math.PI * 0.5;
      hubRing.position.set(dir * 0.62, 0.06, 0.2);
      wing.add(hubRing);
      const hubCore = new THREE.Mesh(new THREE.SphereGeometry(0.16, 22, 18), shared.coreCyan);
      hubCore.position.copy(hubRing.position);
      wing.add(hubCore);
      emitters.push(hubCore);
      const auxCore = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), shared.coreMagenta);
      auxCore.position.set(dir * 0.92, -0.18, 0.15);
      wing.add(auxCore);
      emitters.push(auxCore);
      const hubLens = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 12), shared.lensCyan);
      hubLens.position.set(dir * 0.74, 0.06, 0.28);
      wing.add(hubLens);
      const topHousing = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 1.04, 8, 12), shared.alloyBright);
      topHousing.rotation.z = dir > 0 ? -Math.PI * 0.56 : Math.PI * 0.56;
      topHousing.position.set(dir * 1.28, 0.96, -0.03);
      topHousing.scale.set(1.44, 0.68, 0.52);
      wing.add(topHousing);
      const midHousing = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.8, 8, 12), shared.alloyDark);
      midHousing.rotation.z = dir > 0 ? -Math.PI * 0.4 : Math.PI * 0.4;
      midHousing.position.set(dir * 1.08, 0.14, -0.07);
      midHousing.scale.set(1.34, 0.65, 0.5);
      wing.add(midHousing);
      const lowerHousing = new THREE.Mesh(new THREE.CapsuleGeometry(0.086, 0.62, 8, 10), shared.alloyBright);
      lowerHousing.rotation.z = dir > 0 ? -Math.PI * 0.3 : Math.PI * 0.3;
      lowerHousing.position.set(dir * 0.94, -0.66, -0.09);
      lowerHousing.scale.set(1.28, 0.6, 0.48);
      wing.add(lowerHousing);
      const bladeConfigs = [
        {
          length: 5.05,
          rootWidth: 0.84,
          tipWidth: 0.22,
          thickness: 0.067,
          camber: 0.21,
          droop: 1.06,
          sweep: 0.84,
          twist: 0.07,
          position: [dir * 1.08, 2.44, -0.12],
          rotation: [0.19, dir * 0.24, dir > 0 ? -0.76 : 0.76],
          shell: shared.edgeViolet,
          glow: shared.glowMagenta,
          core: shared.coreMagenta,
          strip: shared.stripMagenta
        },
        {
          length: 4.72,
          rootWidth: 0.78,
          tipWidth: 0.23,
          thickness: 0.066,
          camber: 0.18,
          droop: 0.44,
          sweep: 0.42,
          twist: 0.058,
          position: [dir * 1.08, 1.56, 0.18],
          rotation: [0.13, dir * 0.14, dir > 0 ? -0.43 : 0.43],
          shell: shared.alloyBright,
          glow: shared.glowCyan,
          core: shared.coreCyan,
          strip: shared.stripCyan
        },
        {
          length: 4.22,
          rootWidth: 0.72,
          tipWidth: 0.22,
          thickness: 0.064,
          camber: 0.14,
          droop: 0.12,
          sweep: 0.16,
          twist: 0.05,
          position: [dir * 1.02, 0.56, 0.22],
          rotation: [0.04, dir * 0.1, dir > 0 ? -0.22 : 0.22],
          shell: shared.alloyDark,
          glow: shared.glowCyan,
          core: shared.coreCyan,
          strip: shared.stripCyan
        },
        {
          length: 3.84,
          rootWidth: 0.66,
          tipWidth: 0.22,
          thickness: 0.062,
          camber: 0.12,
          droop: -0.22,
          sweep: -0.16,
          twist: 0.044,
          position: [dir * 0.84, -0.28, 0.17],
          rotation: [-0.08, dir * 0.08, dir > 0 ? 0.18 : -0.18],
          shell: shared.edgeViolet,
          glow: shared.glowMagenta,
          core: shared.coreMagenta,
          strip: shared.stripMagenta
        },
        {
          length: 3.38,
          rootWidth: 0.58,
          tipWidth: 0.2,
          thickness: 0.06,
          camber: 0.1,
          droop: -0.52,
          sweep: -0.34,
          twist: 0.04,
          position: [dir * 0.68, -0.98, 0.12],
          rotation: [-0.18, dir * 0.06, dir > 0 ? 0.34 : -0.34],
          shell: shared.alloyBright,
          glow: shared.glowCyan,
          core: shared.coreCyan,
          strip: shared.stripCyan
        },
        {
          length: 2.96,
          rootWidth: 0.5,
          tipWidth: 0.18,
          thickness: 0.058,
          camber: 0.09,
          droop: -0.74,
          sweep: -0.5,
          twist: 0.034,
          position: [dir * 0.54, -1.56, 0.02],
          rotation: [-0.27, dir * 0.04, dir > 0 ? 0.5 : -0.5],
          shell: shared.edgeViolet,
          glow: shared.glowMagenta,
          core: shared.coreMagenta,
          strip: shared.stripMagenta
        }
      ];
      for (const cfg of bladeConfigs) {
        const bladeGroup = new THREE.Group();
        bladeGroup.position.set(cfg.position[0], cfg.position[1], cfg.position[2]);
        bladeGroup.rotation.set(cfg.rotation[0], cfg.rotation[1], cfg.rotation[2]);
        const shellGeo = makeAlphaBladeGeometry(dir, cfg);
        const shellMesh = new THREE.Mesh(shellGeo, cfg.shell);
        bladeGroup.add(shellMesh);
        const inlayGeo = makeAlphaBladeGeometry(dir, {
          length: cfg.length * 0.78,
          rootWidth: cfg.rootWidth * 0.42,
          tipWidth: cfg.tipWidth * 0.36,
          thickness: cfg.thickness * 0.45,
          camber: cfg.camber * 0.5,
          droop: cfg.droop * 0.78,
          sweep: cfg.sweep,
          twist: cfg.twist * 0.52
        });
        const inlayMesh = new THREE.Mesh(inlayGeo, cfg.glow);
        inlayMesh.position.set(dir * 0.16, cfg.sweep * 0.05, 0.028);
        inlayMesh.renderOrder = 3;
        shellMesh.add(inlayMesh);
        emitters.push(inlayMesh);
        const strip = makeBoneBetween(
          new THREE.Vector3(dir * 0.18, cfg.sweep * 0.02, 0.04),
          new THREE.Vector3(dir * (cfg.length * 0.38), cfg.sweep * 0.34, 0.06),
          0.011,
          44e-4,
          cfg.strip,
          7
        );
        strip.visible = false;
        shellMesh.add(strip);
        wing.add(bladeGroup);
      }
      const microBoltGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.026, 8);
      for (let i = 0; i < 6; i++) {
        const bolt = new THREE.Mesh(microBoltGeo, shared.alloyDark);
        bolt.rotation.x = Math.PI * 0.5;
        bolt.position.set(dir * (0.9 + i * 0.18), 0.84 - i * 0.08, 0.16);
        wing.add(bolt);
      }
      const cyanLight = new THREE.PointLight(5893119, 0.68, 5, 2);
      cyanLight.position.set(dir * 1.18, 0.18, 0.48);
      wing.add(cyanLight);
      lights.push(cyanLight);
      const magentaLight = new THREE.PointLight(16733403, 0.58, 4.3, 2);
      magentaLight.position.set(dir * 1.82, -0.12, 0.32);
      wing.add(magentaLight);
      lights.push(magentaLight);
      const tipLight = new THREE.PointLight(7531775, 0.26, 2.8, 2);
      tipLight.position.set(dir * 3.34, 1.76, 0.38);
      wing.add(tipLight);
      lights.push(tipLight);
      const sparkSystem = makeAlphaSparkSystem(dir, shared.sparkTexture);
      wing.add(sparkSystem.points);
      wing.userData.emitters = emitters;
      wing.userData.lights = lights;
      wing.userData.sparkSystem = sparkSystem;
      return wing;
    }
    function makeAlphaWingsProp() {
      const textures = makeAlphaWingTextures();
      const shared = {
        frameDark: new THREE.MeshPhysicalMaterial({
          color: 2898274,
          emissive: 593701,
          emissiveIntensity: 0.14,
          metalness: 0.96,
          roughness: 0.28,
          clearcoat: 0.64,
          clearcoatRoughness: 0.22,
          envMapIntensity: 0.84
        }),
        alloyBright: new THREE.MeshPhysicalMaterial({
          color: 14280440,
          emissive: 1057088,
          emissiveIntensity: 0.11,
          metalness: 0.95,
          roughness: 0.17,
          clearcoat: 1,
          clearcoatRoughness: 0.1,
          envMapIntensity: 0.92
        }),
        alloyDark: new THREE.MeshPhysicalMaterial({
          color: 7242920,
          emissive: 1120821,
          emissiveIntensity: 0.08,
          metalness: 0.92,
          roughness: 0.22,
          clearcoat: 0.82,
          clearcoatRoughness: 0.16,
          envMapIntensity: 0.88
        }),
        edgeViolet: new THREE.MeshPhysicalMaterial({
          color: 4865170,
          emissive: 2036576,
          emissiveIntensity: 0.16,
          metalness: 0.86,
          roughness: 0.2,
          clearcoat: 0.9,
          clearcoatRoughness: 0.18,
          envMapIntensity: 0.82
        }),
        coreCyan: new THREE.MeshStandardMaterial({
          color: 9107455,
          emissive: 4578815,
          emissiveIntensity: 1.58,
          roughness: 0.2,
          metalness: 0.12
        }),
        coreMagenta: new THREE.MeshStandardMaterial({
          color: 16753654,
          emissive: 16733148,
          emissiveIntensity: 1.38,
          roughness: 0.24,
          metalness: 0.08
        }),
        lensCyan: new THREE.MeshPhysicalMaterial({
          color: 10027007,
          emissive: 3398911,
          emissiveIntensity: 1.1,
          transmission: 0.78,
          thickness: 0.24,
          ior: 1.23,
          roughness: 0.08,
          metalness: 0.02,
          transparent: true,
          opacity: 0.85
        }),
        stripCyan: new THREE.MeshBasicMaterial({
          color: 10288639,
          transparent: true,
          opacity: 0.92,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        }),
        stripMagenta: new THREE.MeshBasicMaterial({
          color: 16751864,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        }),
        glowCyan: new THREE.MeshStandardMaterial({
          color: 16777215,
          map: textures.cyanPanel,
          emissiveMap: textures.cyanPanel,
          emissive: 4582399,
          emissiveIntensity: 1.5,
          transparent: true,
          opacity: 0.74,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -2,
          side: THREE.DoubleSide
        }),
        glowMagenta: new THREE.MeshStandardMaterial({
          color: 16777215,
          map: textures.magentaPanel,
          emissiveMap: textures.magentaPanel,
          emissive: 16732383,
          emissiveIntensity: 1.4,
          transparent: true,
          opacity: 0.72,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -2,
          side: THREE.DoubleSide
        }),
        crystalMagenta: new THREE.MeshPhysicalMaterial({
          color: 16747766,
          emissive: 16731356,
          emissiveIntensity: 1.5,
          transmission: 0.45,
          thickness: 0.32,
          roughness: 0.14,
          metalness: 0.05,
          transparent: true,
          opacity: 0.9
        }),
        crystalCyan: new THREE.MeshPhysicalMaterial({
          color: 9238015,
          emissive: 4712447,
          emissiveIntensity: 1.36,
          transmission: 0.5,
          thickness: 0.28,
          roughness: 0.12,
          metalness: 0.04,
          transparent: true,
          opacity: 0.88
        }),
        sparkTexture: textures.sparkTexture
      };
      shared.coreCyan.userData.channel = "cyan";
      shared.coreMagenta.userData.channel = "magenta";
      shared.stripCyan.userData.channel = "cyan";
      shared.stripMagenta.userData.channel = "magenta";
      shared.glowCyan.userData.channel = "cyan";
      shared.glowMagenta.userData.channel = "magenta";
      shared.crystalMagenta.userData.channel = "magenta";
      shared.crystalCyan.userData.channel = "cyan";
      const g = new THREE.Group();
      const left = makeAlphaWingSide("left", shared);
      const right = makeAlphaWingSide("right", shared);
      left.visible = false;
      right.visible = false;
      leftWingGroup.add(left);
      rightWingGroup.add(right);
      g.userData.left = left;
      g.userData.right = right;
      g.userData.emitters = [
        ...left.userData.emitters || [],
        ...right.userData.emitters || []
      ];
      g.userData.lightEmitters = [
        ...left.userData.lights || [],
        ...right.userData.lights || []
      ];
      g.userData.sparkSystems = [left.userData.sparkSystem, right.userData.sparkSystem].filter(Boolean);
      g.userData.glowMats = [
        shared.coreCyan,
        shared.coreMagenta,
        shared.stripCyan,
        shared.stripMagenta,
        shared.glowCyan,
        shared.glowMagenta,
        shared.crystalMagenta,
        shared.crystalCyan
      ];
      return g;
    }
    function makeRainbowWingTextures() {
      const size = 1024;
      const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const membraneCanvas = document.createElement("canvas");
      membraneCanvas.width = size;
      membraneCanvas.height = size;
      const mCtx = membraneCanvas.getContext("2d");
      let seed = 17062026;
      const rand = () => {
        seed = seed * 1664525 + 1013904223 >>> 0;
        return seed / 4294967296;
      };
      const rainbow = mCtx.createLinearGradient(0, size * 0.94, size, size * 0.06);
      rainbow.addColorStop(0, "#ff5fc8");
      rainbow.addColorStop(0.16, "#ff79d4");
      rainbow.addColorStop(0.34, "#5f9dff");
      rainbow.addColorStop(0.5, "#4ad8ff");
      rainbow.addColorStop(0.68, "#ffd251");
      rainbow.addColorStop(0.84, "#ff82c3");
      rainbow.addColorStop(1, "#8d63ff");
      mCtx.fillStyle = rainbow;
      mCtx.fillRect(0, 0, size, size);
      const innerGlow = mCtx.createRadialGradient(size * 0.16, size * 0.68, 30, size * 0.16, size * 0.68, size * 0.62);
      innerGlow.addColorStop(0, "rgba(255,245,200,0.96)");
      innerGlow.addColorStop(0.35, "rgba(255,224,156,0.5)");
      innerGlow.addColorStop(1, "rgba(255,215,150,0)");
      mCtx.fillStyle = innerGlow;
      mCtx.fillRect(0, 0, size, size);
      const tipGlow = mCtx.createRadialGradient(size * 0.82, size * 0.2, 24, size * 0.82, size * 0.2, size * 0.36);
      tipGlow.addColorStop(0, "rgba(225,240,255,0.62)");
      tipGlow.addColorStop(0.45, "rgba(180,220,255,0.24)");
      tipGlow.addColorStop(1, "rgba(130,186,255,0)");
      mCtx.fillStyle = tipGlow;
      mCtx.fillRect(0, 0, size, size);
      mCtx.lineCap = "round";
      for (let i = 0; i < 34; i++) {
        const y = size * (0.08 + rand() * 0.84);
        const amp = 10 + rand() * 26;
        const alpha = 0.012 + rand() * 0.04;
        mCtx.strokeStyle = `rgba(255,255,255,${alpha})`;
        mCtx.lineWidth = 1 + rand() * 3;
        mCtx.beginPath();
        mCtx.moveTo(size * 0.02, y);
        mCtx.bezierCurveTo(
          size * (0.24 + rand() * 0.12),
          y + (rand() - 0.5) * amp,
          size * (0.58 + rand() * 0.16),
          y + (rand() - 0.5) * amp,
          size * (0.92 + rand() * 0.06),
          y + (rand() - 0.5) * amp * 0.44
        );
        mCtx.stroke();
      }
      for (let i = 0; i < 120; i++) {
        const x = rand() * size;
        const y = rand() * size;
        const r = 1 + rand() * 3.8;
        const s = mCtx.createRadialGradient(x, y, 0, x, y, r);
        s.addColorStop(0, "rgba(255,255,255,0.95)");
        s.addColorStop(0.4, "rgba(255,246,255,0.66)");
        s.addColorStop(1, "rgba(255,255,255,0)");
        mCtx.fillStyle = s;
        mCtx.beginPath();
        mCtx.arc(x, y, r, 0, Math.PI * 2);
        mCtx.fill();
      }
      mCtx.globalCompositeOperation = "multiply";
      const saturationPass = mCtx.createLinearGradient(0, size, size, 0);
      saturationPass.addColorStop(0, "#ff76cb");
      saturationPass.addColorStop(0.2, "#b66aff");
      saturationPass.addColorStop(0.4, "#5a92ff");
      saturationPass.addColorStop(0.6, "#4cdfff");
      saturationPass.addColorStop(0.78, "#ffcc5c");
      saturationPass.addColorStop(1, "#ff86c6");
      mCtx.fillStyle = saturationPass;
      mCtx.fillRect(0, 0, size, size);
      mCtx.globalCompositeOperation = "source-over";
      const sparkleCanvas = document.createElement("canvas");
      sparkleCanvas.width = 128;
      sparkleCanvas.height = 128;
      const sCtx = sparkleCanvas.getContext("2d");
      const sg = sCtx.createRadialGradient(64, 64, 2, 64, 64, 62);
      sg.addColorStop(0, "rgba(255,255,255,1)");
      sg.addColorStop(0.26, "rgba(255,245,255,0.96)");
      sg.addColorStop(1, "rgba(255,255,255,0)");
      sCtx.fillStyle = sg;
      sCtx.fillRect(0, 0, 128, 128);
      sCtx.strokeStyle = "rgba(255,255,255,0.92)";
      sCtx.lineWidth = 2.8;
      sCtx.beginPath();
      sCtx.moveTo(16, 64);
      sCtx.lineTo(112, 64);
      sCtx.moveTo(64, 16);
      sCtx.lineTo(64, 112);
      sCtx.stroke();
      const flowerCanvas = document.createElement("canvas");
      flowerCanvas.width = 128;
      flowerCanvas.height = 128;
      const fCtx = flowerCanvas.getContext("2d");
      fCtx.translate(64, 64);
      for (let i = 0; i < 5; i++) {
        fCtx.save();
        fCtx.rotate(i / 5 * Math.PI * 2);
        const petal = fCtx.createRadialGradient(0, 26, 3, 0, 26, 28);
        petal.addColorStop(0, "rgba(255,255,255,0.96)");
        petal.addColorStop(0.38, "rgba(255,188,232,0.92)");
        petal.addColorStop(1, "rgba(255,156,220,0)");
        fCtx.fillStyle = petal;
        fCtx.beginPath();
        fCtx.ellipse(0, 26, 16, 26, 0, 0, Math.PI * 2);
        fCtx.fill();
        fCtx.restore();
      }
      const flowerCore = fCtx.createRadialGradient(0, 0, 2, 0, 0, 18);
      flowerCore.addColorStop(0, "rgba(255,253,188,1)");
      flowerCore.addColorStop(0.58, "rgba(255,226,130,0.9)");
      flowerCore.addColorStop(1, "rgba(255,220,120,0)");
      fCtx.fillStyle = flowerCore;
      fCtx.beginPath();
      fCtx.arc(0, 0, 18, 0, Math.PI * 2);
      fCtx.fill();
      const membraneTex = new THREE.CanvasTexture(membraneCanvas);
      membraneTex.colorSpace = THREE.SRGBColorSpace;
      membraneTex.anisotropy = maxAnisotropy;
      membraneTex.needsUpdate = true;
      const sparkleTex = new THREE.CanvasTexture(sparkleCanvas);
      sparkleTex.colorSpace = THREE.SRGBColorSpace;
      sparkleTex.needsUpdate = true;
      const flowerTex = new THREE.CanvasTexture(flowerCanvas);
      flowerTex.colorSpace = THREE.SRGBColorSpace;
      flowerTex.needsUpdate = true;
      return { membraneTex, sparkleTex, flowerTex };
    }
    function makeRainbowFeatherGeometry(dir, options = {}) {
      const {
        length = 4.6,
        rootWidth = 0.86,
        tipWidth = 0.18,
        rise = 1.1,
        camber = 0.12,
        droop = 0,
        twist = 0.05,
        curl = 0.2
      } = options;
      const mx = (x) => x * dir;
      const shape = new THREE.Shape();
      shape.moveTo(mx(0), -rootWidth * 0.5);
      shape.bezierCurveTo(
        mx(length * 0.24),
        -rootWidth * 0.74,
        mx(length * 0.82),
        rise - tipWidth * 0.54,
        mx(length),
        rise - tipWidth * 0.14
      );
      shape.quadraticCurveTo(
        mx(length * (1.06 + curl * 0.1)),
        rise + tipWidth * (0.5 + curl * 0.8),
        mx(length * (0.94 + curl * 0.06)),
        rise + tipWidth * 1.04
      );
      shape.bezierCurveTo(
        mx(length * 0.72),
        rise + tipWidth * 1.2,
        mx(length * 0.24),
        rootWidth * 0.76,
        mx(0),
        rootWidth * 0.5
      );
      shape.closePath();
      const geo = new THREE.ShapeGeometry(shape, 92);
      const pos = geo.attributes.position;
      const uv = new Float32Array(pos.count * 2);
      const heightRef = rootWidth + Math.abs(rise) * 0.95;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const nx = THREE.MathUtils.clamp(Math.abs(x) / Math.max(1e-3, length), 0, 1);
        const ny = THREE.MathUtils.clamp((y - rise * 0.36) / Math.max(1e-3, heightRef), -1, 1);
        const edgeSoft = 1 - Math.abs(ny);
        const z = Math.sin(nx * Math.PI) * camber * (0.54 + edgeSoft * 0.46) + ny * twist * Math.pow(nx, 1.22) + Math.pow(nx, 1.34) * droop + Math.sin(nx * 11.2 + ny * 3.6) * 6e-3;
        pos.setXYZ(
          i,
          x + dir * Math.pow(nx, 2.08) * curl * 0.24 * (0.16 + Math.abs(ny)),
          y,
          z
        );
        uv[i * 2] = nx;
        uv[i * 2 + 1] = THREE.MathUtils.clamp((ny + 1) * 0.5, 0, 1);
      }
      geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      return geo;
    }
    function makeRainbowSparkSystem(dir, texture, options = {}) {
      const {
        count = 24,
        size = 0.07,
        opacity = 0.72,
        spreadMin = 0.7,
        spreadMax = 4.2,
        yOffset = 0,
        drift = 0.036
      } = options;
      const positions = new Float32Array(count * 3);
      const basePositions = new Float32Array(count * 3);
      const phases = new Float32Array(count);
      const colors = new Float32Array(count * 3);
      const palette = [16765685, 16770984, 12115455, 12516095, 16761311, 13941759, 16777215];
      let seed = dir > 0 ? 908731 : 187349;
      const rand = () => {
        seed = seed * 1103515245 + 12345 >>> 0;
        return (seed & 2147483647) / 2147483647;
      };
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const span = spreadMin + rand() * (spreadMax - spreadMin);
        const arc = -1.05 + rand() * 2.2;
        const x = dir * (0.46 + Math.cos(arc) * span);
        const y = yOffset + Math.sin(arc) * (span * 0.78) + (rand() - 0.5) * 0.64;
        const z = 0.14 + rand() * 0.5;
        positions[idx] = basePositions[idx] = x;
        positions[idx + 1] = basePositions[idx + 1] = y;
        positions[idx + 2] = basePositions[idx + 2] = z;
        phases[i] = rand() * Math.PI * 2;
        const c = new THREE.Color(palette[Math.floor(rand() * palette.length)]);
        colors[idx] = c.r;
        colors[idx + 1] = c.g;
        colors[idx + 2] = c.b;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({
        map: texture,
        alphaMap: texture,
        vertexColors: true,
        size,
        sizeAttenuation: true,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      return {
        points: new THREE.Points(geo, mat),
        basePositions,
        phases,
        speed: 1.8 + rand() * 1.1,
        drift,
        phaseOffset: rand() * Math.PI * 2
      };
    }
    function makeRainbowWingSide(side = "left", shared) {
      const dir = side === "left" ? -1 : 1;
      const wing = new THREE.Group();
      wing.position.set(dir * 0.86, -0.12, -0.16);
      wing.rotation.set(0, dir * 0.045, -0.015 * dir);
      wing.scale.set(2.32, 2.32, 2.32);
      const wingLights = [];
      const sparkSystems = [];
      const trailDrops = [];
      const iridescentMats = [];
      const rootPearl = new THREE.Mesh(new THREE.SphereGeometry(0.21, 18, 14), shared.rootPearl);
      rootPearl.position.set(dir * 0.16, 0.06, 0.18);
      wing.add(rootPearl);
      const rootCrystal = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), shared.rootCrystal);
      rootCrystal.position.set(dir * 0.32, 0.02, 0.24);
      wing.add(rootCrystal);
      const panelConfigs = [
        { len: 5.96, root: 1.02, tip: 0.29, rise: 2.78, camber: 0.2, droop: 0.48, twist: 0.062, curl: 1.22, pos: [0.9, 2.28, -0.06], rot: [0.2, 0.19, -0.9], color: 16755167, emissive: 16743122, channel: "warm", vein: 0.018 },
        { len: 5.3, root: 0.94, tip: 0.28, rise: 2.06, camber: 0.18, droop: 0.3, twist: 0.056, curl: 0.74, pos: [0.98, 1.76, -0.02], rot: [0.14, 0.15, -0.62], color: 12621055, emissive: 10776319, channel: "warm", vein: 0.016 },
        { len: 4.92, root: 0.86, tip: 0.27, rise: 1.42, camber: 0.16, droop: 0.16, twist: 0.05, curl: 0.36, pos: [1.06, 1.2, 0.03], rot: [0.08, 0.1, -0.38], color: 9026047, emissive: 7120127, channel: "cool", vein: 0.014 },
        { len: 4.6, root: 0.8, tip: 0.27, rise: 0.84, camber: 0.14, droop: 0.04, twist: 0.046, curl: 0.24, pos: [1.01, 0.66, 0.06], rot: [0.02, 0.08, -0.18], color: 7461887, emissive: 5491711, channel: "cool", vein: 0.013 },
        { len: 4.26, root: 0.74, tip: 0.26, rise: 0.28, camber: 0.12, droop: -0.02, twist: 0.04, curl: 0.16, pos: [0.9, 0.18, 0.08], rot: [-0.04, 0.06, -0.03], color: 6803455, emissive: 4570879, channel: "cool", vein: 0.012 },
        { len: 3.84, root: 0.66, tip: 0.25, rise: -0.28, camber: 0.1, droop: -0.14, twist: 0.036, curl: 0.11, pos: [0.8, -0.34, 0.08], rot: [-0.1, 0.05, 0.1], color: 16759258, emissive: 16747723, channel: "warm", vein: 0.01 },
        { len: 3.36, root: 0.58, tip: 0.24, rise: -0.84, camber: 0.09, droop: -0.3, twist: 0.032, curl: 0.08, pos: [0.64, -0.82, 0.06], rot: [-0.16, 0.04, 0.3], color: 16763580, emissive: 16756867, channel: "warm", vein: 9e-3 },
        { len: 3.02, root: 0.52, tip: 0.23, rise: -1.2, camber: 0.08, droop: -0.46, twist: 0.028, curl: 0.06, pos: [0.5, -1.18, 0.04], rot: [-0.23, 0.02, 0.46], color: 16768946, emissive: 16762754, channel: "warm", vein: 8e-3 }
      ];
      for (const cfg of panelConfigs) {
        const geo = makeRainbowFeatherGeometry(dir, {
          length: cfg.len,
          rootWidth: cfg.root,
          tipWidth: cfg.tip,
          rise: cfg.rise,
          camber: cfg.camber,
          droop: cfg.droop,
          twist: cfg.twist,
          curl: cfg.curl
        });
        const mat = new THREE.MeshStandardMaterial({
          color: cfg.color,
          map: shared.membraneTex,
          emissiveMap: shared.membraneTex,
          emissive: cfg.emissive,
          emissiveIntensity: cfg.channel === "cool" ? 0.52 : 0.6,
          roughness: 0.84,
          metalness: 0,
          transparent: true,
          opacity: 0.96,
          depthWrite: false,
          side: THREE.DoubleSide
        });
        mat.userData.channel = cfg.channel;
        const panel = new THREE.Mesh(geo, mat);
        panel.position.set(dir * cfg.pos[0], cfg.pos[1], cfg.pos[2]);
        panel.rotation.set(cfg.rot[0], cfg.rot[1] * dir, cfg.rot[2] * dir);
        panel.renderOrder = 2;
        wing.add(panel);
        iridescentMats.push(mat);
        const rim = new THREE.Mesh(geo.clone(), shared.rimMat);
        rim.position.copy(panel.position);
        rim.rotation.copy(panel.rotation);
        rim.scale.set(1.008, 1.008, 1.008);
        rim.renderOrder = 3;
        wing.add(rim);
        const vein = makeBoneBetween(
          new THREE.Vector3(dir * 0.3, 0.07, 0.22),
          new THREE.Vector3(dir * (cfg.pos[0] + cfg.len * 0.74), cfg.pos[1] + cfg.rise * 0.57, cfg.pos[2] + 0.06),
          cfg.vein,
          cfg.vein * 0.44,
          cfg.channel === "cool" ? shared.veinCool : shared.veinWarm,
          7
        );
        vein.renderOrder = 3;
        wing.add(vein);
      }
      const topCurlPoints = [];
      for (let i = 0; i < 20; i++) {
        const u = i / 19;
        const a = (0.34 + u * 1.6) * Math.PI;
        const r = 0.7 * (1 - u * 0.62);
        topCurlPoints.push(new THREE.Vector3(
          dir * (5.24 + Math.cos(a) * r),
          3.86 + Math.sin(a) * r + u * 0.44,
          0.24 + u * 0.1
        ));
      }
      wing.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(topCurlPoints), 72, 0.02, 10, false), shared.curlMat));
      const lowerLobeConfigs = [
        { len: 2.64, root: 0.66, tip: 0.2, rise: -0.96, camber: 0.08, droop: -0.44, twist: 0.026, curl: 0.04, pos: [0.7, -0.98, 0.16], rot: [-0.16, 0.03, 0.44], color: 16763119, emissive: 16752608, channel: "warm" },
        { len: 2.32, root: 0.58, tip: 0.18, rise: -1.08, camber: 0.07, droop: -0.52, twist: 0.022, curl: 0.03, pos: [0.56, -1.18, 0.14], rot: [-0.21, 0.02, 0.58], color: 14085375, emissive: 12312831, channel: "cool" }
      ];
      for (const l of lowerLobeConfigs) {
        const lobeGeo = makeRainbowFeatherGeometry(dir, {
          length: l.len,
          rootWidth: l.root,
          tipWidth: l.tip,
          rise: l.rise,
          camber: l.camber,
          droop: l.droop,
          twist: l.twist,
          curl: l.curl
        });
        const lobeMat = new THREE.MeshStandardMaterial({
          color: l.color,
          map: shared.membraneTex,
          emissiveMap: shared.membraneTex,
          emissive: l.emissive,
          emissiveIntensity: 0.46,
          roughness: 0.88,
          metalness: 0,
          transparent: true,
          opacity: 0.84,
          depthWrite: false,
          side: THREE.DoubleSide
        });
        lobeMat.userData.channel = l.channel;
        const lobe = new THREE.Mesh(lobeGeo, lobeMat);
        lobe.position.set(dir * l.pos[0], l.pos[1], l.pos[2]);
        lobe.rotation.set(l.rot[0], l.rot[1] * dir, l.rot[2] * dir);
        lobe.renderOrder = 2;
        wing.add(lobe);
        iridescentMats.push(lobeMat);
      }
      const tailStart = [
        { x: 2.3, y: -1, len: 1.46 },
        { x: 2.95, y: -1.22, len: 1.64 }
      ];
      for (let i = 0; i < tailStart.length; i++) {
        const tail = tailStart[i];
        const points = [];
        for (let j = 0; j < 12; j++) {
          const u = j / 11;
          points.push(new THREE.Vector3(
            dir * (tail.x + Math.sin(u * Math.PI * (1.2 + i * 0.2)) * 0.18),
            tail.y - u * tail.len,
            0.18 + Math.cos(u * Math.PI * 1.4) * 0.03
          ));
        }
        wing.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, 0.012, 7, false), shared.tailLineMat));
        const drop = new THREE.Mesh(new THREE.SphereGeometry(0.072, 12, 10), shared.dropGlow);
        drop.position.set(dir * tail.x, tail.y - tail.len - 0.06, 0.2);
        wing.add(drop);
        trailDrops.push(drop);
      }
      const warmLight = new THREE.PointLight(16767904, 0.82, 6.4, 2);
      warmLight.position.set(dir * 1.1, 0.12, 0.56);
      wing.add(warmLight);
      wingLights.push(warmLight);
      const coolLight = new THREE.PointLight(10217983, 0.68, 6, 2);
      coolLight.position.set(dir * 2, 1, 0.5);
      wing.add(coolLight);
      wingLights.push(coolLight);
      const sparkleSystem = makeRainbowSparkSystem(dir, shared.sparkleTexture, {
        count: 28,
        size: 0.07,
        opacity: 0.72,
        spreadMin: 0.8,
        spreadMax: 4.6,
        yOffset: 0.14,
        drift: 0.036
      });
      wing.add(sparkleSystem.points);
      sparkSystems.push(sparkleSystem);
      const flowerSystem = makeRainbowSparkSystem(dir, shared.flowerTexture, {
        count: 10,
        size: 0.118,
        opacity: 0.58,
        spreadMin: 0.7,
        spreadMax: 3.2,
        yOffset: -0.74,
        drift: 0.03
      });
      wing.add(flowerSystem.points);
      sparkSystems.push(flowerSystem);
      wing.userData.sparkSystems = sparkSystems;
      wing.userData.wingLights = wingLights;
      wing.userData.trailDrops = trailDrops;
      wing.userData.iridescentMats = iridescentMats;
      return wing;
    }
    function makeRainbowWingsProp() {
      const textures = makeRainbowWingTextures();
      const shared = {
        membraneTex: textures.membraneTex,
        sparkleTexture: textures.sparkleTex,
        flowerTexture: textures.flowerTex,
        rimMat: new THREE.MeshBasicMaterial({
          color: 16777215,
          transparent: true,
          opacity: 0.08,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide
        }),
        veinWarm: new THREE.MeshBasicMaterial({
          color: 16772790,
          transparent: true,
          opacity: 0.62,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        }),
        veinCool: new THREE.MeshBasicMaterial({
          color: 12055551,
          transparent: true,
          opacity: 0.58,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        }),
        curlMat: new THREE.MeshBasicMaterial({
          color: 16237823,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        }),
        tailLineMat: new THREE.MeshBasicMaterial({
          color: 16768934,
          transparent: true,
          opacity: 0.86,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        }),
        rootPearl: new THREE.MeshPhysicalMaterial({
          color: 16767224,
          emissive: 16754922,
          emissiveIntensity: 0.96,
          transmission: 0.38,
          thickness: 0.22,
          roughness: 0.2,
          metalness: 0.02,
          clearcoat: 0.3,
          clearcoatRoughness: 0.26
        }),
        rootCrystal: new THREE.MeshPhysicalMaterial({
          color: 16773833,
          emissive: 16764799,
          emissiveIntensity: 0.9,
          transmission: 0.42,
          thickness: 0.2,
          roughness: 0.18,
          metalness: 0.02,
          clearcoat: 0.28,
          clearcoatRoughness: 0.24
        }),
        dropGlow: new THREE.MeshStandardMaterial({
          color: 16768939,
          emissive: 16764278,
          emissiveIntensity: 1.34,
          roughness: 0.32,
          metalness: 0
        })
      };
      shared.rootPearl.userData.channel = "warm";
      shared.rootCrystal.userData.channel = "cool";
      const g = new THREE.Group();
      const left = makeRainbowWingSide("left", shared);
      const right = makeRainbowWingSide("right", shared);
      left.visible = false;
      right.visible = false;
      leftWingGroup.add(left);
      rightWingGroup.add(right);
      g.userData.left = left;
      g.userData.right = right;
      g.userData.iridescentMats = [
        ...left.userData.iridescentMats || [],
        ...right.userData.iridescentMats || [],
        shared.rootPearl,
        shared.rootCrystal
      ];
      g.userData.sparkSystems = [
        ...left.userData.sparkSystems || [],
        ...right.userData.sparkSystems || []
      ];
      g.userData.wingLights = [
        ...left.userData.wingLights || [],
        ...right.userData.wingLights || []
      ];
      g.userData.trailDrops = [
        ...left.userData.trailDrops || [],
        ...right.userData.trailDrops || []
      ];
      return g;
    }
    let propGroup = null;
    switch (propKey) {
      case "alphaWings":
        propGroup = makeAlphaWingsProp();
        break;
      case "rainbowWings":
        propGroup = makeRainbowWingsProp();
        break;
      case "roboticWings":
        propGroup = makeRoboticWingsProp();
        break;
      case "omegaWings":
        propGroup = makeOmegaWingsProp();
        break;
      case "efernoWings":
        propGroup = makeEfernoWingsProp();
        break;
      default:
        return null;
    }
    return extractWingPairFromProp(propGroup);
  }
  var LIVE_GAME_WING_PREVIEW_KEYS;
  var init_xio_live_wing_previews = __esm({
    "public/HomePageAPP/src/runtime/xio-live-wing-previews.js"() {
      LIVE_GAME_WING_PREVIEW_KEYS = Object.freeze([
        "alphaWings",
        "rainbowWings",
        "roboticWings",
        "omegaWings",
        "efernoWings"
      ]);
    }
  });

  // public/HomePageAPP/src/generator/random-prop-generator-config.js
  var random_prop_generator_config_exports = {};
  __export(random_prop_generator_config_exports, {
    CATEGORY_GENERATOR_CONFIGS: () => CATEGORY_GENERATOR_CONFIGS,
    FIT_TEMPLATE_PROFILES: () => FIT_TEMPLATE_PROFILES,
    GENERATED_PROCEDURAL_WING_FACTORY_ID: () => GENERATED_PROCEDURAL_WING_FACTORY_ID,
    GENERATOR_CATEGORY_OPTIONS: () => GENERATOR_CATEGORY_OPTIONS,
    GENERATOR_COLOR_HARMONY_OPTIONS: () => GENERATOR_COLOR_HARMONY_OPTIONS,
    GENERATOR_DETAIL_DENSITY_OPTIONS: () => GENERATOR_DETAIL_DENSITY_OPTIONS,
    GENERATOR_FIT_MODE_OPTIONS: () => GENERATOR_FIT_MODE_OPTIONS,
    GENERATOR_RARITY_OPTIONS: () => GENERATOR_RARITY_OPTIONS,
    GENERATOR_RARITY_PROFILES: () => GENERATOR_RARITY_PROFILES,
    GENERATOR_THEME_MODE_OPTIONS: () => GENERATOR_THEME_MODE_OPTIONS,
    GENERATOR_THEME_OPTIONS: () => GENERATOR_THEME_OPTIONS,
    MATERIAL_FAMILY_CONFIGS: () => MATERIAL_FAMILY_CONFIGS,
    PALETTE_LIBRARY: () => PALETTE_LIBRARY,
    RANDOM_PROP_GENERATOR_VERSION: () => RANDOM_PROP_GENERATOR_VERSION,
    STRUCTURE_FAMILY_CONFIGS: () => STRUCTURE_FAMILY_CONFIGS,
    THEME_CONFIGS: () => THEME_CONFIGS,
    WING_BASE_REFERENCE_SIGNATURES: () => WING_BASE_REFERENCE_SIGNATURES,
    cloneGeneratorAttachment: () => cloneGeneratorAttachment,
    getGeneratorOptionLabel: () => getGeneratorOptionLabel,
    getWingBaseReferenceOptions: () => getWingBaseReferenceOptions,
    inferWingReferenceSignature: () => inferWingReferenceSignature
  });
  function getGeneratorOptionLabel(options, value, fallback = "Unknown") {
    var _a;
    return ((_a = options.find((entry) => entry.value === value)) == null ? void 0 : _a.label) || fallback;
  }
  function getWingBaseReferenceOptions(propCatalog = PROP_CATALOG) {
    const references = /* @__PURE__ */ new Map();
    (Array.isArray(propCatalog) ? propCatalog : []).forEach((entry) => {
      var _a, _b;
      const categoryKey = typeof (entry == null ? void 0 : entry.categoryKey) === "string" ? entry.categoryKey : typeof (entry == null ? void 0 : entry.category) === "string" ? entry.category : "";
      if (categoryKey !== "wingSet") {
        return;
      }
      const key = typeof (entry == null ? void 0 : entry.key) === "string" ? entry.key.trim() : "";
      const label = typeof (entry == null ? void 0 : entry.label) === "string" ? entry.label.trim() : key;
      if (!key || !label || references.has(key)) {
        return;
      }
      const attachment = cloneAttachment(entry == null ? void 0 : entry.attachment);
      const signature = inferWingReferenceSignature(entry);
      references.set(key, Object.freeze({
        key,
        label,
        rarity: typeof (entry == null ? void 0 : entry.rarity) === "string" ? entry.rarity : "rare",
        attachment,
        assetUrl: typeof (entry == null ? void 0 : entry.assetUrl) === "string" ? entry.assetUrl : null,
        factoryId: typeof (entry == null ? void 0 : entry.factoryId) === "string" ? entry.factoryId : null,
        generatedRecipe: ((_a = entry == null ? void 0 : entry.preview) == null ? void 0 : _a.generated) && typeof entry.preview.generated === "object" ? entry.preview.generated : null,
        sourceKind: ((_b = entry == null ? void 0 : entry.preview) == null ? void 0 : _b.generated) && typeof entry.preview.generated === "object" ? "generated" : typeof (entry == null ? void 0 : entry.assetUrl) === "string" ? "glb" : "metadata",
        theme: signature.theme,
        materialFamily: signature.materialFamily,
        paletteFamily: signature.paletteFamily,
        fitTemplateId: signature.fitTemplateId,
        structureFamily: typeof signature.structureFamily === "string" ? signature.structureFamily : null
      }));
    });
    return [...references.values()].sort((left, right) => left.label.localeCompare(right.label));
  }
  var RANDOM_PROP_GENERATOR_VERSION, GENERATED_PROCEDURAL_WING_FACTORY_ID, cloneTuple, cloneAttachment, cloneGeneratorAttachment, GENERATOR_CATEGORY_OPTIONS, GENERATOR_RARITY_OPTIONS, GENERATOR_THEME_MODE_OPTIONS, GENERATOR_DETAIL_DENSITY_OPTIONS, GENERATOR_COLOR_HARMONY_OPTIONS, GENERATOR_FIT_MODE_OPTIONS, GENERATOR_THEME_OPTIONS, FIT_TEMPLATE_PROFILES, MATERIAL_FAMILY_CONFIGS, PALETTE_LIBRARY, STRUCTURE_FAMILY_CONFIGS, GENERATOR_RARITY_PROFILES, THEME_CONFIGS, CATEGORY_GENERATOR_CONFIGS, WING_BASE_REFERENCE_SIGNATURES, fallbackReferenceSignature, inferWingReferenceSignature;
  var init_random_prop_generator_config = __esm({
    "public/HomePageAPP/src/generator/random-prop-generator-config.js"() {
      init_prop_catalog();
      RANDOM_PROP_GENERATOR_VERSION = 1;
      GENERATED_PROCEDURAL_WING_FACTORY_ID = "makeGeneratedProceduralWingProp";
      cloneTuple = (values, fallback = []) => Array.isArray(values) ? values.map((value, index) => {
        var _a;
        return Number.isFinite(Number(value)) ? Number(value) : (_a = fallback[index]) != null ? _a : 0;
      }) : [...fallback];
      cloneAttachment = (attachment) => ({
        position: cloneTuple(attachment == null ? void 0 : attachment.position, [0.74, -0.24, 0.08]),
        rotation: cloneTuple(attachment == null ? void 0 : attachment.rotation, [0.02, 0.06, -0.02]),
        scale: cloneTuple(attachment == null ? void 0 : attachment.scale, [1.9, 1.9, 1.9]),
        mirrorMode: (attachment == null ? void 0 : attachment.mirrorMode) === "paired" ? "paired" : "single",
        fit: (attachment == null ? void 0 : attachment.fit) && typeof attachment.fit === "object" ? {
          yOffsetRatio: Number.isFinite(Number(attachment.fit.yOffsetRatio)) ? Number(attachment.fit.yOffsetRatio) : 0.55,
          zOffsetRatio: Number.isFinite(Number(attachment.fit.zOffsetRatio)) ? Number(attachment.fit.zOffsetRatio) : 0.02,
          distanceMultiplier: Number.isFinite(Number(attachment.fit.distanceMultiplier)) ? Number(attachment.fit.distanceMultiplier) : 1.28,
          ...Number.isFinite(Number(attachment.fit.initialRotationY)) ? { initialRotationY: Number(attachment.fit.initialRotationY) } : {}
        } : null
      });
      cloneGeneratorAttachment = (attachment) => cloneAttachment(attachment);
      GENERATOR_CATEGORY_OPTIONS = Object.freeze([
        Object.freeze({
          value: "wingSet",
          label: "Wings",
          enabled: true,
          description: "Back-mounted paired wings tailored for XiO."
        }),
        Object.freeze({
          value: "crowns",
          label: "Crowns",
          enabled: false,
          description: "Coming Soon"
        }),
        Object.freeze({
          value: "halos",
          label: "Halos",
          enabled: false,
          description: "Coming Soon"
        }),
        Object.freeze({
          value: "headgear",
          label: "Headgear",
          enabled: false,
          description: "Coming Soon"
        }),
        Object.freeze({
          value: "shoulderProps",
          label: "Shoulder Props",
          enabled: false,
          description: "Coming Soon"
        }),
        Object.freeze({
          value: "backProps",
          label: "Back Props",
          enabled: false,
          description: "Coming Soon"
        }),
        Object.freeze({
          value: "accessories",
          label: "Accessories",
          enabled: false,
          description: "Coming Soon"
        })
      ]);
      GENERATOR_RARITY_OPTIONS = Object.freeze([
        Object.freeze({ value: "common", label: "Common" }),
        Object.freeze({ value: "rare", label: "Rare" }),
        Object.freeze({ value: "legendary", label: "Legendary" }),
        Object.freeze({ value: "legendaryLight", label: "Legendary Light" }),
        Object.freeze({ value: "legendaryDark", label: "Legendary Dark" })
      ]);
      GENERATOR_THEME_MODE_OPTIONS = Object.freeze([
        Object.freeze({ value: "fullyRandom", label: "Fully Random" }),
        Object.freeze({ value: "guidedTheme", label: "Guided Theme" }),
        Object.freeze({ value: "matchExistingStyle", label: "Match Existing Style" })
      ]);
      GENERATOR_DETAIL_DENSITY_OPTIONS = Object.freeze([
        Object.freeze({ value: "low", label: "Low" }),
        Object.freeze({ value: "medium", label: "Medium" }),
        Object.freeze({ value: "high", label: "High" }),
        Object.freeze({ value: "autoByRarity", label: "Auto By Rarity" })
      ]);
      GENERATOR_COLOR_HARMONY_OPTIONS = Object.freeze([
        Object.freeze({ value: "auto", label: "Auto" }),
        Object.freeze({ value: "soft", label: "Soft" }),
        Object.freeze({ value: "bold", label: "Bold" }),
        Object.freeze({ value: "royal", label: "Royal" }),
        Object.freeze({ value: "dark", label: "Dark" }),
        Object.freeze({ value: "light", label: "Light" }),
        Object.freeze({ value: "nature", label: "Nature" }),
        Object.freeze({ value: "energy", label: "Energy" })
      ]);
      GENERATOR_FIT_MODE_OPTIONS = Object.freeze([
        Object.freeze({ value: "useMasterTemplate", label: "Use Master Template" }),
        Object.freeze({ value: "matchExistingProp", label: "Match Existing Prop" }),
        Object.freeze({ value: "copyWingTemplate", label: "Copy Wing Template" }),
        Object.freeze({ value: "useCategoryDefault", label: "Use Category Default" })
      ]);
      GENERATOR_THEME_OPTIONS = Object.freeze([
        Object.freeze({ value: "royal", label: "Royal" }),
        Object.freeze({ value: "celestial", label: "Celestial" }),
        Object.freeze({ value: "light", label: "Light" }),
        Object.freeze({ value: "shadow", label: "Shadow" }),
        Object.freeze({ value: "nature", label: "Nature" }),
        Object.freeze({ value: "mechanical", label: "Mechanical" }),
        Object.freeze({ value: "crystal", label: "Crystal" }),
        Object.freeze({ value: "arcane", label: "Arcane" }),
        Object.freeze({ value: "ember", label: "Ember" }),
        Object.freeze({ value: "frost", label: "Frost" }),
        Object.freeze({ value: "moonlight", label: "Moonlight" }),
        Object.freeze({ value: "sunflare", label: "Sunflare" }),
        Object.freeze({ value: "galaxy", label: "Galaxy" }),
        Object.freeze({ value: "butterfly", label: "Butterfly" }),
        Object.freeze({ value: "dragon", label: "Dragon" }),
        Object.freeze({ value: "rune", label: "Rune" }),
        Object.freeze({ value: "storm", label: "Storm" }),
        Object.freeze({ value: "aether", label: "Aether" })
      ]);
      FIT_TEMPLATE_PROFILES = Object.freeze({
        "xio-wing-master": Object.freeze({
          id: "xio-wing-master",
          label: "XiO Wing Master Template",
          attachment: cloneAttachment({
            position: [0.72, -0.24, 0.08],
            rotation: [0.016, 0.052, -0.018],
            scale: [1.92, 1.92, 1.92],
            mirrorMode: "paired",
            fit: { yOffsetRatio: 0.56, zOffsetRatio: 0.02, distanceMultiplier: 1.28, initialRotationY: 0 }
          }),
          scaleEnvelope: Object.freeze({ min: 1.52, max: 2.46 }),
          safeBodyClearance: Object.freeze({ x: 0.58, y: 0.18, z: 0.18 }),
          visualBounds: Object.freeze({ maxSpan: 4.75, maxHeight: 3.35 })
        }),
        "xio-wing-heroic": Object.freeze({
          id: "xio-wing-heroic",
          label: "XiO Heroic Spread Template",
          attachment: cloneAttachment({
            position: [0.8, -0.3, 0.06],
            rotation: [0.014, 0.06, -0.024],
            scale: [2.08, 2.08, 2.08],
            mirrorMode: "paired",
            fit: { yOffsetRatio: 0.72, zOffsetRatio: 0.028, distanceMultiplier: 1.36, initialRotationY: 0 }
          }),
          scaleEnvelope: Object.freeze({ min: 1.76, max: 2.7 }),
          safeBodyClearance: Object.freeze({ x: 0.62, y: 0.22, z: 0.22 }),
          visualBounds: Object.freeze({ maxSpan: 5.35, maxHeight: 3.85 })
        }),
        "xio-wing-aerial": Object.freeze({
          id: "xio-wing-aerial",
          label: "XiO Aerial Bloom Template",
          attachment: cloneAttachment({
            position: [0.68, -0.18, 0.12],
            rotation: [0.018, 0.044, -0.014],
            scale: [1.74, 1.74, 1.74],
            mirrorMode: "paired",
            fit: { yOffsetRatio: 0.42, zOffsetRatio: 0.022, distanceMultiplier: 1.22, initialRotationY: 0 }
          }),
          scaleEnvelope: Object.freeze({ min: 1.4, max: 2.18 }),
          safeBodyClearance: Object.freeze({ x: 0.52, y: 0.16, z: 0.18 }),
          visualBounds: Object.freeze({ maxSpan: 4.25, maxHeight: 3.15 })
        })
      });
      MATERIAL_FAMILY_CONFIGS = Object.freeze({
        starlitSilk: Object.freeze({
          id: "starlitSilk",
          label: "Starlit Silk",
          surface: "silk",
          roughness: 0.34,
          metalness: 0.08,
          clearcoat: 0.34,
          transmission: 0.14,
          sheen: 0.48
        }),
        royalEnamel: Object.freeze({
          id: "royalEnamel",
          label: "Royal Enamel",
          surface: "polished-enamel",
          roughness: 0.18,
          metalness: 0.56,
          clearcoat: 0.88,
          transmission: 0.04,
          sheen: 0.18
        }),
        crystalLattice: Object.freeze({
          id: "crystalLattice",
          label: "Crystal Lattice",
          surface: "crystal",
          roughness: 0.12,
          metalness: 0.1,
          clearcoat: 0.92,
          transmission: 0.48,
          sheen: 0.06
        }),
        emberForged: Object.freeze({
          id: "emberForged",
          label: "Ember Forged",
          surface: "forged-metal",
          roughness: 0.42,
          metalness: 0.74,
          clearcoat: 0.22,
          transmission: 0,
          sheen: 0.02
        }),
        stormglass: Object.freeze({
          id: "stormglass",
          label: "Stormglass Alloy",
          surface: "charged-glass",
          roughness: 0.2,
          metalness: 0.32,
          clearcoat: 0.74,
          transmission: 0.22,
          sheen: 0.2
        }),
        shadowObsidian: Object.freeze({
          id: "shadowObsidian",
          label: "Shadow Obsidian",
          surface: "obsidian",
          roughness: 0.24,
          metalness: 0.42,
          clearcoat: 0.62,
          transmission: 0.08,
          sheen: 0.1
        }),
        verdantFiligree: Object.freeze({
          id: "verdantFiligree",
          label: "Verdant Filigree",
          surface: "leaf-metal",
          roughness: 0.3,
          metalness: 0.18,
          clearcoat: 0.52,
          transmission: 0.06,
          sheen: 0.24
        }),
        runeAether: Object.freeze({
          id: "runeAether",
          label: "Rune Aether",
          surface: "arcane-metal",
          roughness: 0.28,
          metalness: 0.46,
          clearcoat: 0.66,
          transmission: 0.12,
          sheen: 0.14
        })
      });
      PALETTE_LIBRARY = Object.freeze({
        royal: Object.freeze([
          Object.freeze({ key: "royal-gold", label: "Royal Gold", primary: "#f7d889", secondary: "#e87ad8", accent: "#fff0c2", glow: "#ffd76f", shadow: "#3a2456", metal: "#f5c74b" }),
          Object.freeze({ key: "royal-azure", label: "Royal Azure", primary: "#9fe4ff", secondary: "#5f7dff", accent: "#f7f1ff", glow: "#82d7ff", shadow: "#1d2a60", metal: "#d9d2ff" })
        ]),
        light: Object.freeze([
          Object.freeze({ key: "light-aether", label: "Aether Light", primary: "#dff9ff", secondary: "#9cdcff", accent: "#ffffff", glow: "#b8ffff", shadow: "#38548f", metal: "#e6f1ff" }),
          Object.freeze({ key: "light-halo", label: "Halo Bloom", primary: "#ffffff", secondary: "#f2d9ff", accent: "#ffdca0", glow: "#fff1c4", shadow: "#47639b", metal: "#fbe5b2" })
        ]),
        dark: Object.freeze([
          Object.freeze({ key: "dark-crimson", label: "Crimson Night", primary: "#241624", secondary: "#9d2636", accent: "#ff7c58", glow: "#ff8a3a", shadow: "#08060f", metal: "#8f5b46" }),
          Object.freeze({ key: "dark-obsidian", label: "Obsidian Ember", primary: "#16171e", secondary: "#4a5267", accent: "#ff6f4a", glow: "#ff5630", shadow: "#090a12", metal: "#6d7284" })
        ]),
        nature: Object.freeze([
          Object.freeze({ key: "nature-verdant", label: "Verdant Bloom", primary: "#86d39c", secondary: "#e2f3b7", accent: "#fef7df", glow: "#a7f7b8", shadow: "#22403f", metal: "#d7d29b" }),
          Object.freeze({ key: "nature-petal", label: "Petal Nectar", primary: "#f6a7d8", secondary: "#ffe9a3", accent: "#fff9f2", glow: "#ffd688", shadow: "#62415e", metal: "#f2d483" })
        ]),
        energy: Object.freeze([
          Object.freeze({ key: "energy-voltage", label: "Voltage Arc", primary: "#7af4ff", secondary: "#5167ff", accent: "#f5fdff", glow: "#57e7ff", shadow: "#1a2856", metal: "#c2e3ff" }),
          Object.freeze({ key: "energy-solar", label: "Solar Burst", primary: "#ffda74", secondary: "#ff7d3a", accent: "#fff4c7", glow: "#ffb34a", shadow: "#56311d", metal: "#ffdf96" })
        ]),
        crystal: Object.freeze([
          Object.freeze({ key: "crystal-frost", label: "Frost Crystal", primary: "#d8f5ff", secondary: "#8be2ff", accent: "#ffffff", glow: "#b8fdff", shadow: "#335b83", metal: "#d7ecff" }),
          Object.freeze({ key: "crystal-amethyst", label: "Amethyst Prism", primary: "#c4a1ff", secondary: "#79d9ff", accent: "#f8e7ff", glow: "#b59cff", shadow: "#342a65", metal: "#d8cbff" })
        ]),
        ember: Object.freeze([
          Object.freeze({ key: "ember-cinder", label: "Cinder Bloom", primary: "#ff8d54", secondary: "#ffce6e", accent: "#fff3d6", glow: "#ff7a31", shadow: "#51231c", metal: "#c68f54" }),
          Object.freeze({ key: "ember-ash", label: "Ashfire", primary: "#ff7d4f", secondary: "#5f6772", accent: "#ffd7b5", glow: "#ff6425", shadow: "#201a1f", metal: "#8e7567" })
        ]),
        moonlight: Object.freeze([
          Object.freeze({ key: "moonlight-veil", label: "Moonlight Veil", primary: "#cfd8ff", secondary: "#88b4ff", accent: "#f2efff", glow: "#b4c6ff", shadow: "#27335d", metal: "#d6dcff" }),
          Object.freeze({ key: "moonlight-tide", label: "Lunar Tide", primary: "#d9d2ff", secondary: "#79d4ff", accent: "#ffffff", glow: "#9fe9ff", shadow: "#283056", metal: "#ece6ff" })
        ]),
        mechanical: Object.freeze([
          Object.freeze({ key: "mech-alloy", label: "Alloy Frame", primary: "#b9c7da", secondary: "#4e6ea5", accent: "#eaf4ff", glow: "#7be9ff", shadow: "#25324b", metal: "#cdd9eb" }),
          Object.freeze({ key: "mech-carbon", label: "Carbon Forge", primary: "#5a6578", secondary: "#ff62ca", accent: "#e7eef8", glow: "#83fbff", shadow: "#171e29", metal: "#90a0b5" })
        ]),
        shadow: Object.freeze([
          Object.freeze({ key: "shadow-rune", label: "Shadow Rune", primary: "#272338", secondary: "#7a53d6", accent: "#ff9b70", glow: "#bd7cff", shadow: "#09090f", metal: "#6b5aa0" }),
          Object.freeze({ key: "shadow-night", label: "Night Majesty", primary: "#151a28", secondary: "#9f3344", accent: "#f2d0ca", glow: "#e46f51", shadow: "#07080c", metal: "#77606c" })
        ])
      });
      STRUCTURE_FAMILY_CONFIGS = Object.freeze({
        aetherPlume: Object.freeze({
          id: "aetherPlume",
          label: "Aether Plume",
          silhouette: "swept-feather",
          membrane: false,
          primaryRange: Object.freeze([5, 10]),
          secondaryRange: Object.freeze([2, 6]),
          spanRange: Object.freeze([3.2, 4.55]),
          heightRange: Object.freeze([1.85, 2.95]),
          curveBias: 0.58,
          tipLift: 0.76,
          ornamentBias: Object.freeze({ haloBands: 1, crystalClusters: 1, ribbonTrails: 1, runeSigils: 0, crownSpurs: 1, emberNodes: 0 })
        }),
        royalFiligree: Object.freeze({
          id: "royalFiligree",
          label: "Royal Filigree",
          silhouette: "crown-feather",
          membrane: false,
          primaryRange: Object.freeze([4, 8]),
          secondaryRange: Object.freeze([2, 5]),
          spanRange: Object.freeze([3, 4.15]),
          heightRange: Object.freeze([1.9, 2.7]),
          curveBias: 0.44,
          tipLift: 0.58,
          ornamentBias: Object.freeze({ haloBands: 1, crystalClusters: 1, ribbonTrails: 0, runeSigils: 1, crownSpurs: 2, emberNodes: 0 })
        }),
        crystalFan: Object.freeze({
          id: "crystalFan",
          label: "Crystal Fan",
          silhouette: "faceted-fan",
          membrane: false,
          primaryRange: Object.freeze([4, 7]),
          secondaryRange: Object.freeze([1, 3]),
          spanRange: Object.freeze([2.9, 4]),
          heightRange: Object.freeze([1.7, 2.65]),
          curveBias: 0.36,
          tipLift: 0.42,
          ornamentBias: Object.freeze({ haloBands: 0, crystalClusters: 3, ribbonTrails: 0, runeSigils: 1, crownSpurs: 1, emberNodes: 0 })
        }),
        emberBlade: Object.freeze({
          id: "emberBlade",
          label: "Ember Blade",
          silhouette: "blade-ridge",
          membrane: true,
          primaryRange: Object.freeze([4, 7]),
          secondaryRange: Object.freeze([1, 3]),
          spanRange: Object.freeze([3.1, 4.4]),
          heightRange: Object.freeze([1.8, 2.8]),
          curveBias: 0.48,
          tipLift: 0.54,
          ornamentBias: Object.freeze({ haloBands: 0, crystalClusters: 1, ribbonTrails: 0, runeSigils: 1, crownSpurs: 1, emberNodes: 2 })
        }),
        stormRibbon: Object.freeze({
          id: "stormRibbon",
          label: "Storm Ribbon",
          silhouette: "ribbon-crest",
          membrane: true,
          primaryRange: Object.freeze([5, 8]),
          secondaryRange: Object.freeze([1, 4]),
          spanRange: Object.freeze([3.15, 4.5]),
          heightRange: Object.freeze([1.75, 2.65]),
          curveBias: 0.62,
          tipLift: 0.64,
          ornamentBias: Object.freeze({ haloBands: 1, crystalClusters: 0, ribbonTrails: 2, runeSigils: 2, crownSpurs: 0, emberNodes: 0 })
        }),
        mechanicalAegis: Object.freeze({
          id: "mechanicalAegis",
          label: "Mechanical Aegis",
          silhouette: "segment-aegis",
          membrane: false,
          primaryRange: Object.freeze([4, 8]),
          secondaryRange: Object.freeze([1, 4]),
          spanRange: Object.freeze([3.05, 4.25]),
          heightRange: Object.freeze([1.8, 2.7]),
          curveBias: 0.28,
          tipLift: 0.38,
          ornamentBias: Object.freeze({ haloBands: 0, crystalClusters: 1, ribbonTrails: 0, runeSigils: 1, crownSpurs: 2, emberNodes: 0 })
        })
      });
      GENERATOR_RARITY_PROFILES = Object.freeze({
        common: Object.freeze({
          value: "common",
          label: "Common",
          defaultDetailDensity: "low",
          complexityScale: 0.78,
          ornamentBudget: 1,
          layerBoost: 0,
          glowIntensity: 0.14,
          preferredPalettes: ["nature", "soft", "light"],
          allowedStructures: ["aetherPlume", "royalFiligree", "stormRibbon"],
          allowedMaterials: ["starlitSilk", "verdantFiligree", "stormglass"]
        }),
        rare: Object.freeze({
          value: "rare",
          label: "Rare",
          defaultDetailDensity: "medium",
          complexityScale: 0.92,
          ornamentBudget: 2,
          layerBoost: 1,
          glowIntensity: 0.24,
          preferredPalettes: ["energy", "royal", "moonlight"],
          allowedStructures: ["aetherPlume", "royalFiligree", "stormRibbon", "mechanicalAegis"],
          allowedMaterials: ["starlitSilk", "royalEnamel", "stormglass", "runeAether"]
        }),
        legendary: Object.freeze({
          value: "legendary",
          label: "Legendary",
          defaultDetailDensity: "medium",
          complexityScale: 1.04,
          ornamentBudget: 3,
          layerBoost: 2,
          glowIntensity: 0.36,
          preferredPalettes: ["royal", "energy", "crystal"],
          allowedStructures: ["aetherPlume", "royalFiligree", "crystalFan", "stormRibbon", "mechanicalAegis"],
          allowedMaterials: ["starlitSilk", "royalEnamel", "crystalLattice", "stormglass", "runeAether"]
        }),
        legendaryLight: Object.freeze({
          value: "legendaryLight",
          label: "Legendary Light",
          defaultDetailDensity: "high",
          complexityScale: 1.18,
          ornamentBudget: 4,
          layerBoost: 3,
          glowIntensity: 0.58,
          preferredPalettes: ["light", "royal", "crystal", "moonlight"],
          allowedStructures: ["aetherPlume", "royalFiligree", "crystalFan", "stormRibbon"],
          allowedMaterials: ["starlitSilk", "royalEnamel", "crystalLattice", "stormglass", "runeAether"]
        }),
        legendaryDark: Object.freeze({
          value: "legendaryDark",
          label: "Legendary Dark",
          defaultDetailDensity: "high",
          complexityScale: 1.24,
          ornamentBudget: 4,
          layerBoost: 3,
          glowIntensity: 0.64,
          preferredPalettes: ["dark", "shadow", "ember", "mechanical"],
          allowedStructures: ["royalFiligree", "crystalFan", "emberBlade", "stormRibbon", "mechanicalAegis"],
          allowedMaterials: ["royalEnamel", "crystalLattice", "emberForged", "shadowObsidian", "stormglass", "runeAether"]
        })
      });
      THEME_CONFIGS = Object.freeze({
        royal: Object.freeze({
          value: "royal",
          label: "Royal",
          preferredStructures: ["royalFiligree", "aetherPlume"],
          preferredMaterials: ["royalEnamel", "starlitSilk"],
          paletteFamilies: ["royal", "light"],
          fitTemplateId: "xio-wing-heroic"
        }),
        celestial: Object.freeze({
          value: "celestial",
          label: "Celestial",
          preferredStructures: ["aetherPlume", "stormRibbon"],
          preferredMaterials: ["starlitSilk", "runeAether"],
          paletteFamilies: ["light", "moonlight"],
          fitTemplateId: "xio-wing-master"
        }),
        light: Object.freeze({
          value: "light",
          label: "Light",
          preferredStructures: ["aetherPlume", "crystalFan"],
          preferredMaterials: ["starlitSilk", "crystalLattice"],
          paletteFamilies: ["light", "crystal"],
          fitTemplateId: "xio-wing-aerial"
        }),
        shadow: Object.freeze({
          value: "shadow",
          label: "Shadow",
          preferredStructures: ["royalFiligree", "mechanicalAegis"],
          preferredMaterials: ["shadowObsidian", "runeAether"],
          paletteFamilies: ["shadow", "dark"],
          fitTemplateId: "xio-wing-heroic"
        }),
        nature: Object.freeze({
          value: "nature",
          label: "Nature",
          preferredStructures: ["aetherPlume", "stormRibbon"],
          preferredMaterials: ["verdantFiligree", "starlitSilk"],
          paletteFamilies: ["nature", "light"],
          fitTemplateId: "xio-wing-aerial"
        }),
        mechanical: Object.freeze({
          value: "mechanical",
          label: "Mechanical",
          preferredStructures: ["mechanicalAegis", "stormRibbon"],
          preferredMaterials: ["stormglass", "royalEnamel"],
          paletteFamilies: ["mechanical", "energy"],
          fitTemplateId: "xio-wing-master"
        }),
        crystal: Object.freeze({
          value: "crystal",
          label: "Crystal",
          preferredStructures: ["crystalFan", "aetherPlume"],
          preferredMaterials: ["crystalLattice", "starlitSilk"],
          paletteFamilies: ["crystal", "light"],
          fitTemplateId: "xio-wing-aerial"
        }),
        arcane: Object.freeze({
          value: "arcane",
          label: "Arcane",
          preferredStructures: ["stormRibbon", "royalFiligree"],
          preferredMaterials: ["runeAether", "royalEnamel"],
          paletteFamilies: ["shadow", "energy"],
          fitTemplateId: "xio-wing-master"
        }),
        ember: Object.freeze({
          value: "ember",
          label: "Ember",
          preferredStructures: ["emberBlade", "royalFiligree"],
          preferredMaterials: ["emberForged", "shadowObsidian"],
          paletteFamilies: ["ember", "dark"],
          fitTemplateId: "xio-wing-heroic"
        }),
        frost: Object.freeze({
          value: "frost",
          label: "Frost",
          preferredStructures: ["crystalFan", "aetherPlume"],
          preferredMaterials: ["crystalLattice", "stormglass"],
          paletteFamilies: ["crystal", "light"],
          fitTemplateId: "xio-wing-aerial"
        }),
        moonlight: Object.freeze({
          value: "moonlight",
          label: "Moonlight",
          preferredStructures: ["aetherPlume", "stormRibbon"],
          preferredMaterials: ["starlitSilk", "runeAether"],
          paletteFamilies: ["moonlight", "light"],
          fitTemplateId: "xio-wing-master"
        }),
        sunflare: Object.freeze({
          value: "sunflare",
          label: "Sunflare",
          preferredStructures: ["emberBlade", "aetherPlume"],
          preferredMaterials: ["royalEnamel", "emberForged"],
          paletteFamilies: ["energy", "light"],
          fitTemplateId: "xio-wing-heroic"
        }),
        galaxy: Object.freeze({
          value: "galaxy",
          label: "Galaxy",
          preferredStructures: ["stormRibbon", "aetherPlume"],
          preferredMaterials: ["runeAether", "starlitSilk"],
          paletteFamilies: ["moonlight", "shadow"],
          fitTemplateId: "xio-wing-master"
        }),
        butterfly: Object.freeze({
          value: "butterfly",
          label: "Butterfly",
          preferredStructures: ["aetherPlume", "crystalFan"],
          preferredMaterials: ["starlitSilk", "verdantFiligree"],
          paletteFamilies: ["nature", "royal"],
          fitTemplateId: "xio-wing-aerial"
        }),
        dragon: Object.freeze({
          value: "dragon",
          label: "Dragon",
          preferredStructures: ["emberBlade", "mechanicalAegis"],
          preferredMaterials: ["emberForged", "shadowObsidian"],
          paletteFamilies: ["ember", "dark"],
          fitTemplateId: "xio-wing-heroic"
        }),
        rune: Object.freeze({
          value: "rune",
          label: "Rune",
          preferredStructures: ["stormRibbon", "royalFiligree"],
          preferredMaterials: ["runeAether", "stormglass"],
          paletteFamilies: ["energy", "shadow"],
          fitTemplateId: "xio-wing-master"
        }),
        storm: Object.freeze({
          value: "storm",
          label: "Storm",
          preferredStructures: ["stormRibbon", "mechanicalAegis"],
          preferredMaterials: ["stormglass", "runeAether"],
          paletteFamilies: ["energy", "moonlight"],
          fitTemplateId: "xio-wing-master"
        }),
        aether: Object.freeze({
          value: "aether",
          label: "Aether",
          preferredStructures: ["aetherPlume", "stormRibbon"],
          preferredMaterials: ["starlitSilk", "runeAether"],
          paletteFamilies: ["light", "energy"],
          fitTemplateId: "xio-wing-master"
        })
      });
      CATEGORY_GENERATOR_CONFIGS = Object.freeze({
        wingSet: Object.freeze({
          key: "wingSet",
          label: "Wings",
          enabled: true,
          slotKey: "wingSet",
          defaultFitTemplateId: "xio-wing-master",
          allowedThemes: GENERATOR_THEME_OPTIONS.map((entry) => entry.value)
        })
      });
      WING_BASE_REFERENCE_SIGNATURES = Object.freeze({
        blossomissWings: Object.freeze({ theme: "butterfly", materialFamily: "starlitSilk", paletteFamily: "nature", fitTemplateId: "xio-wing-aerial", structureFamily: "aetherPlume" }),
        canvasOfNavelleWings: Object.freeze({ theme: "shadow", materialFamily: "shadowObsidian", paletteFamily: "shadow", fitTemplateId: "xio-wing-heroic", structureFamily: "royalFiligree" }),
        goddessOfValleysWings: Object.freeze({ theme: "nature", materialFamily: "verdantFiligree", paletteFamily: "nature", fitTemplateId: "xio-wing-aerial", structureFamily: "aetherPlume" }),
        honeycombBloomsWings: Object.freeze({ theme: "royal", materialFamily: "royalEnamel", paletteFamily: "royal", fitTemplateId: "xio-wing-aerial", structureFamily: "royalFiligree" }),
        lavalcanoWings: Object.freeze({ theme: "ember", materialFamily: "emberForged", paletteFamily: "ember", fitTemplateId: "xio-wing-heroic", structureFamily: "emberBlade" }),
        lightOfSmilesWings: Object.freeze({ theme: "light", materialFamily: "starlitSilk", paletteFamily: "light", fitTemplateId: "xio-wing-aerial", structureFamily: "aetherPlume" }),
        moonlightAmayaWings: Object.freeze({ theme: "moonlight", materialFamily: "runeAether", paletteFamily: "moonlight", fitTemplateId: "xio-wing-master", structureFamily: "stormRibbon" }),
        endlessWings: Object.freeze({ theme: "galaxy", materialFamily: "runeAether", paletteFamily: "shadow", fitTemplateId: "xio-wing-master", structureFamily: "stormRibbon" }),
        emeraldCoenWings: Object.freeze({ theme: "nature", materialFamily: "verdantFiligree", paletteFamily: "nature", fitTemplateId: "xio-wing-master", structureFamily: "aetherPlume" }),
        xatoriWings: Object.freeze({ theme: "royal", materialFamily: "royalEnamel", paletteFamily: "royal", fitTemplateId: "xio-wing-heroic", structureFamily: "royalFiligree" }),
        alphaWings: Object.freeze({ theme: "mechanical", materialFamily: "stormglass", paletteFamily: "mechanical", fitTemplateId: "xio-wing-master", structureFamily: "mechanicalAegis" }),
        rainbowWings: Object.freeze({ theme: "celestial", materialFamily: "starlitSilk", paletteFamily: "energy", fitTemplateId: "xio-wing-master", structureFamily: "aetherPlume" }),
        roboticWings: Object.freeze({ theme: "mechanical", materialFamily: "stormglass", paletteFamily: "mechanical", fitTemplateId: "xio-wing-master", structureFamily: "mechanicalAegis" }),
        omegaWings: Object.freeze({ theme: "shadow", materialFamily: "shadowObsidian", paletteFamily: "dark", fitTemplateId: "xio-wing-heroic", structureFamily: "crystalFan" }),
        efernoWings: Object.freeze({ theme: "ember", materialFamily: "emberForged", paletteFamily: "ember", fitTemplateId: "xio-wing-heroic", structureFamily: "emberBlade" })
      });
      fallbackReferenceSignature = (entry) => {
        const rarity = typeof (entry == null ? void 0 : entry.rarity) === "string" ? entry.rarity : "rare";
        if (rarity === "legendaryLight") {
          return {
            theme: "light",
            materialFamily: "starlitSilk",
            paletteFamily: "light",
            fitTemplateId: "xio-wing-aerial",
            structureFamily: "aetherPlume"
          };
        }
        if (rarity === "legendaryDark") {
          return {
            theme: "shadow",
            materialFamily: "shadowObsidian",
            paletteFamily: "dark",
            fitTemplateId: "xio-wing-heroic",
            structureFamily: "royalFiligree"
          };
        }
        return {
          theme: "royal",
          materialFamily: "royalEnamel",
          paletteFamily: "royal",
          fitTemplateId: "xio-wing-master",
          structureFamily: "aetherPlume"
        };
      };
      inferWingReferenceSignature = (entry) => WING_BASE_REFERENCE_SIGNATURES[entry == null ? void 0 : entry.key] || fallbackReferenceSignature(entry);
    }
  });

  // public/HomePageAPP/src/generator/random-prop-generator-core.js
  var random_prop_generator_core_exports = {};
  __export(random_prop_generator_core_exports, {
    buildGeneratorPreviewSummary: () => buildGeneratorPreviewSummary,
    generateRandomWingDraft: () => generateRandomWingDraft,
    isGeneratedPropPreview: () => isGeneratedPropPreview,
    normalizeGeneratedWingRecipe: () => normalizeGeneratedWingRecipe,
    validateGeneratedWingRecipe: () => validateGeneratedWingRecipe
  });
  function isGeneratedPropPreview(preview) {
    return Boolean(
      isPlainObject(preview) && isPlainObject(preview.generated) && normalizeValue(preview.generated.category) === DEFAULT_CATEGORY_VALUE
    );
  }
  function normalizeGeneratedWingRecipe(value) {
    if (!isPlainObject(value) || normalizeValue(value.category) !== DEFAULT_CATEGORY_VALUE) {
      return null;
    }
    const rarityProfile = resolveRarityProfile(value.rarityProfile);
    const themeConfig = resolveThemeConfig(value.theme);
    const fitTemplate = resolveFitTemplateProfile(value.fitTemplateId);
    const materialFamily = resolveMaterialFamily(value.materialFamily);
    const palette = normalizeGeneratedPalette(value.palette);
    const structureRecipe = normalizeStructureRecipe(value.structureRecipe);
    const ornamentRecipe = normalizeOrnamentRecipe(value.ornamentRecipe);
    if (!rarityProfile || !themeConfig || !fitTemplate || !materialFamily || !palette || !structureRecipe || !ornamentRecipe) {
      return null;
    }
    const fitAttachment = deriveSafeFitAttachment({
      fitTemplate,
      attachment: value.fitAttachment || fitTemplate.attachment,
      fitMode: value.fitMode
    });
    return {
      version: Number.isFinite(Number(value.version)) ? Number(value.version) : RANDOM_PROP_GENERATOR_VERSION,
      seed: Number.isFinite(Number(value.seed)) ? Number(value.seed) : null,
      category: DEFAULT_CATEGORY_VALUE,
      theme: themeConfig.value,
      themeLabel: themeConfig.label,
      themeMode: GENERATOR_THEME_MODE_OPTIONS.some((entry) => entry.value === value.themeMode) ? value.themeMode : DEFAULT_THEME_MODE,
      rarityProfile: rarityProfile.value,
      fitTemplateId: fitTemplate.id,
      fitMode: GENERATOR_FIT_MODE_OPTIONS.some((entry) => entry.value === value.fitMode) ? value.fitMode : DEFAULT_FIT_MODE,
      templateStrategy: normalizeValue(value.templateStrategy) || null,
      baseReferenceKey: typeof value.baseReferenceKey === "string" && value.baseReferenceKey.trim().length > 0 ? value.baseReferenceKey.trim() : null,
      templateReferenceKey: typeof value.templateReferenceKey === "string" && value.templateReferenceKey.trim().length > 0 ? value.templateReferenceKey.trim() : null,
      templateSourceKind: typeof value.templateSourceKind === "string" && value.templateSourceKind.trim().length > 0 ? value.templateSourceKind.trim() : null,
      materialFamily: materialFamily.id,
      colorHarmonyMode: GENERATOR_COLOR_HARMONY_OPTIONS.some((entry) => entry.value === value.colorHarmonyMode) ? value.colorHarmonyMode : DEFAULT_COLOR_HARMONY,
      detailDensity: GENERATOR_DETAIL_DENSITY_OPTIONS.some((entry) => entry.value === value.detailDensity) ? value.detailDensity : rarityProfile.defaultDetailDensity,
      palette,
      structureRecipe,
      ornamentRecipe,
      fitAttachment,
      displaySummary: normalizeDisplaySummary(value.displaySummary)
    };
  }
  function validateGeneratedWingRecipe(recipe, {
    categoryConfig = CATEGORY_GENERATOR_CONFIGS[DEFAULT_CATEGORY_VALUE]
  } = {}) {
    var _a;
    const issues = [];
    const normalized = normalizeGeneratedWingRecipe(recipe);
    if (!normalized) {
      issues.push("The generated recipe payload is incomplete or malformed.");
      return {
        valid: false,
        issues,
        checks: {
          category: false,
          rarity: false,
          theme: false,
          material: false,
          palette: false,
          silhouette: false,
          fit: false
        }
      };
    }
    const rarityProfile = resolveRarityProfile(normalized.rarityProfile);
    const themeConfig = resolveThemeConfig(normalized.theme);
    const materialFamily = resolveMaterialFamily(normalized.materialFamily);
    const fitTemplate = resolveFitTemplateProfile(normalized.fitTemplateId);
    const structureFamily = resolveStructureFamily(normalized.structureRecipe.family);
    const fitAttachment = cloneGeneratorAttachment(normalized.fitAttachment);
    const scaleEnvelope = (fitTemplate == null ? void 0 : fitTemplate.scaleEnvelope) || { min: 1.4, max: 2.6 };
    const withinScaleEnvelope = fitAttachment.scale.every((value) => value >= scaleEnvelope.min && value <= scaleEnvelope.max);
    const paletteValid = validateHexPalette(normalized.palette);
    const silhouetteValid = normalized.structureRecipe.primaryLayerCount >= 3 && normalized.structureRecipe.span >= 2.4 && normalized.structureRecipe.height >= 1.4;
    if (!(categoryConfig == null ? void 0 : categoryConfig.enabled) || normalized.category !== categoryConfig.key) {
      issues.push("The generated prop category is not enabled in the v1 generator.");
    }
    if (!rarityProfile) {
      issues.push("The selected rarity profile could not be resolved.");
    }
    if (!themeConfig) {
      issues.push("The theme direction is not supported by the generator.");
    }
    if (!materialFamily) {
      issues.push("The material family is missing or invalid.");
    }
    if (!paletteValid) {
      issues.push("The generated palette is incomplete or contains invalid colors.");
    }
    if (!structureFamily) {
      issues.push("The structure family is invalid.");
    }
    if (!silhouetteValid) {
      issues.push("The wing silhouette did not meet the minimum quality threshold.");
    }
    if (!fitTemplate || !withinScaleEnvelope || fitAttachment.mirrorMode !== "paired") {
      issues.push("The XiO fit template is invalid or falls outside the safe wing scale envelope.");
    }
    if (themeConfig && materialFamily && !themeConfig.preferredMaterials.includes(materialFamily.id) && !((_a = resolveRarityProfile(normalized.rarityProfile)) == null ? void 0 : _a.allowedMaterials.includes(materialFamily.id))) {
      issues.push("The material family does not align with the selected theme or rarity.");
    }
    if (structureFamily && rarityProfile && !rarityProfile.allowedStructures.includes(structureFamily.id)) {
      issues.push("The structure family does not align with the selected rarity.");
    }
    return {
      valid: issues.length === 0,
      issues,
      checks: {
        category: Boolean((categoryConfig == null ? void 0 : categoryConfig.enabled) && normalized.category === categoryConfig.key),
        rarity: Boolean(rarityProfile),
        theme: Boolean(themeConfig),
        material: Boolean(materialFamily),
        palette: paletteValid,
        silhouette: silhouetteValid,
        fit: Boolean(fitTemplate && withinScaleEnvelope && fitAttachment.mirrorMode === "paired")
      }
    };
  }
  function buildGeneratorPreviewSummary(formInput, { baseReferenceOptions = [] } = {}) {
    const input = {
      category: normalizeValue(formInput == null ? void 0 : formInput.category) || DEFAULT_CATEGORY_VALUE,
      rarity: normalizeValue(formInput == null ? void 0 : formInput.rarity) || DEFAULT_RARITY_VALUE,
      themeMode: normalizeValue(formInput == null ? void 0 : formInput.themeMode) || DEFAULT_THEME_MODE,
      themeInput: normalizeValue(formInput == null ? void 0 : formInput.themeInput),
      detailDensity: normalizeValue(formInput == null ? void 0 : formInput.detailDensity) || DEFAULT_DETAIL_DENSITY,
      colorHarmonyMode: normalizeValue(formInput == null ? void 0 : formInput.colorHarmonyMode) || DEFAULT_COLOR_HARMONY,
      fitMode: normalizeValue(formInput == null ? void 0 : formInput.fitMode) || DEFAULT_FIT_MODE,
      baseReferenceKey: normalizeValue(formInput == null ? void 0 : formInput.baseReferenceKey)
    };
    const categoryOption = resolveCategoryOption(input.category) || resolveCategoryOption(DEFAULT_CATEGORY_VALUE);
    const rarityOption = GENERATOR_RARITY_OPTIONS.find((entry) => entry.value === input.rarity) || GENERATOR_RARITY_OPTIONS.find((entry) => entry.value === DEFAULT_RARITY_VALUE);
    const rarityProfile = resolveRarityProfile(rarityOption.value);
    const references = baseReferenceOptions.length ? baseReferenceOptions : getWingBaseReferenceOptions();
    const baseReference = references.find((entry) => entry.key === input.baseReferenceKey) || (input.fitMode === "copyWingTemplate" || input.themeMode === "matchExistingStyle" ? references[0] || null : null);
    const themeConfig = input.themeMode === "guidedTheme" ? resolveThemeConfig(input.themeInput || DEFAULT_THEME_VALUE) || THEME_CONFIGS[DEFAULT_THEME_VALUE] : input.themeMode === "matchExistingStyle" || input.fitMode === "copyWingTemplate" && (baseReference == null ? void 0 : baseReference.theme) ? resolveThemeConfig((baseReference == null ? void 0 : baseReference.theme) || DEFAULT_THEME_VALUE) || THEME_CONFIGS[DEFAULT_THEME_VALUE] : THEME_CONFIGS[DEFAULT_THEME_VALUE];
    const detailDensity = resolveDetailDensity(input, rarityProfile);
    const materialFamily = (input.themeMode === "matchExistingStyle" || input.fitMode === "copyWingTemplate") && (baseReference == null ? void 0 : baseReference.materialFamily) ? resolveMaterialFamily(baseReference.materialFamily) || MATERIAL_FAMILY_CONFIGS.royalEnamel : resolveMaterialFamily(themeConfig.preferredMaterials[0]) || MATERIAL_FAMILY_CONFIGS.royalEnamel;
    const fitTemplate = resolveFitTemplateProfile(
      input.fitMode === "matchExistingProp" || input.fitMode === "copyWingTemplate" ? (baseReference == null ? void 0 : baseReference.fitTemplateId) || themeConfig.fitTemplateId : input.fitMode === "useCategoryDefault" ? CATEGORY_GENERATOR_CONFIGS[DEFAULT_CATEGORY_VALUE].defaultFitTemplateId : themeConfig.fitTemplateId || CATEGORY_GENERATOR_CONFIGS[DEFAULT_CATEGORY_VALUE].defaultFitTemplateId
    ) || FIT_TEMPLATE_PROFILES[CATEGORY_GENERATOR_CONFIGS[DEFAULT_CATEGORY_VALUE].defaultFitTemplateId];
    return buildSummaryObject({
      categoryOption,
      rarityOption,
      themeConfig,
      detailDensity,
      materialFamily,
      fitTemplate,
      baseReference,
      fitMode: input.fitMode
    });
  }
  function generateRandomWingDraft(formInput, {
    existingProps = [],
    baseReferenceOptions = [],
    defaultWingMotionPreview = null,
    templateReference = null
  } = {}) {
    const input = {
      category: normalizeValue(formInput == null ? void 0 : formInput.category) || DEFAULT_CATEGORY_VALUE,
      rarity: normalizeValue(formInput == null ? void 0 : formInput.rarity) || DEFAULT_RARITY_VALUE,
      themeMode: normalizeValue(formInput == null ? void 0 : formInput.themeMode) || DEFAULT_THEME_MODE,
      themeInput: normalizeValue(formInput == null ? void 0 : formInput.themeInput),
      detailDensity: normalizeValue(formInput == null ? void 0 : formInput.detailDensity) || DEFAULT_DETAIL_DENSITY,
      colorHarmonyMode: normalizeValue(formInput == null ? void 0 : formInput.colorHarmonyMode) || DEFAULT_COLOR_HARMONY,
      fitMode: normalizeValue(formInput == null ? void 0 : formInput.fitMode) || DEFAULT_FIT_MODE,
      baseReferenceKey: normalizeValue(formInput == null ? void 0 : formInput.baseReferenceKey)
    };
    const validationIssues = [];
    const categoryConfig = CATEGORY_GENERATOR_CONFIGS[input.category];
    if (!(categoryConfig == null ? void 0 : categoryConfig.enabled)) {
      validationIssues.push("Only wing generation is enabled in Random Prop Generator v1.");
    }
    const rarityProfile = resolveRarityProfile(input.rarity);
    if (!rarityProfile) {
      validationIssues.push("Choose a supported rarity before generating.");
    }
    const references = baseReferenceOptions.length ? baseReferenceOptions : getWingBaseReferenceOptions(existingProps);
    const seed = createSeed([
      input.category,
      input.rarity,
      input.themeMode,
      input.themeInput,
      input.detailDensity,
      input.colorHarmonyMode,
      input.fitMode,
      input.baseReferenceKey
    ]);
    const rng = mulberry32(seed);
    const baseReference = resolveBaseReference({
      input,
      baseReferenceOptions: references,
      themeMode: input.themeMode,
      rng
    });
    if ((input.fitMode === "matchExistingProp" || input.fitMode === "copyWingTemplate") && !baseReference) {
      validationIssues.push(
        input.fitMode === "copyWingTemplate" ? "Choose a wing template reference before generating a derivative wing." : "Choose a base reference when Match Existing Prop is selected."
      );
    }
    if (input.themeMode === "guidedTheme" && !resolveThemeConfig(input.themeInput)) {
      validationIssues.push("Choose a supported guided theme for this generator.");
    }
    if (validationIssues.length > 0) {
      return {
        ok: false,
        error: validationIssues[0],
        coherenceReport: {
          valid: false,
          issues: validationIssues
        }
      };
    }
    const categoryOption = resolveCategoryOption(input.category) || resolveCategoryOption(DEFAULT_CATEGORY_VALUE);
    const rarityOption = GENERATOR_RARITY_OPTIONS.find((entry) => entry.value === input.rarity) || GENERATOR_RARITY_OPTIONS[1];
    const themeConfig = resolveGeneratedTheme({
      input,
      baseReference,
      categoryConfig,
      rng
    }) || THEME_CONFIGS[DEFAULT_THEME_VALUE];
    const detailDensity = resolveDetailDensity(input, rarityProfile);
    const materialFamily = resolveMaterialFamilyForRecipe({
      themeConfig,
      rarityProfile,
      baseReference,
      input,
      templateReference,
      rng
    }) || MATERIAL_FAMILY_CONFIGS.royalEnamel;
    const paletteFamily = resolvePaletteFamily({
      themeConfig,
      colorHarmonyMode: input.colorHarmonyMode,
      rarityProfile,
      baseReference
    });
    const palette = cloneJson(pickRandom(rng, PALETTE_LIBRARY[paletteFamily], PALETTE_LIBRARY.royal[0]), PALETTE_LIBRARY.royal[0]);
    const structureFamily = resolveStructureFamilyForRecipe({
      themeConfig,
      rarityProfile,
      baseReference,
      input,
      templateReference,
      rng
    }) || STRUCTURE_FAMILY_CONFIGS.aetherPlume;
    const fitTemplateId = input.fitMode === "matchExistingProp" || input.fitMode === "copyWingTemplate" ? (baseReference == null ? void 0 : baseReference.fitTemplateId) || themeConfig.fitTemplateId || categoryConfig.defaultFitTemplateId : input.fitMode === "useCategoryDefault" ? categoryConfig.defaultFitTemplateId : themeConfig.fitTemplateId || categoryConfig.defaultFitTemplateId;
    const fitTemplate = resolveFitTemplateProfile(fitTemplateId) || FIT_TEMPLATE_PROFILES[categoryConfig.defaultFitTemplateId];
    const draftAttachment = deriveSafeFitAttachment({
      fitTemplate,
      attachment: hasReferenceGuidedFitMode(input.fitMode) && ((templateReference == null ? void 0 : templateReference.attachment) || (baseReference == null ? void 0 : baseReference.attachment)) ? (templateReference == null ? void 0 : templateReference.attachment) || (baseReference == null ? void 0 : baseReference.attachment) : fitTemplate.attachment,
      fitMode: input.fitMode
    });
    const structureRecipe = buildStructureRecipe({
      rng,
      structureFamily,
      rarityProfile,
      detailDensity,
      templateReference,
      fitTemplate
    });
    const ornamentRecipe = buildOrnamentRecipe({
      rng,
      structureFamily,
      rarityProfile,
      detailDensity
    });
    const themeDescriptor = buildThemeDescriptor(rng, themeConfig.value);
    const structureDescriptor = buildStructureDescriptor(rng, structureFamily.id);
    const label = `${themeDescriptor} ${structureDescriptor} Wings`;
    const existingKeys = createExistingKeySet(existingProps);
    const key = buildUniqueKey(label, existingKeys);
    const summary = buildSummaryObject({
      categoryOption,
      rarityOption,
      themeConfig,
      detailDensity,
      materialFamily,
      fitTemplate,
      baseReference,
      fitMode: input.fitMode
    });
    const recipe = {
      version: RANDOM_PROP_GENERATOR_VERSION,
      seed,
      category: DEFAULT_CATEGORY_VALUE,
      theme: themeConfig.value,
      themeLabel: themeConfig.label,
      themeMode: input.themeMode,
      rarityProfile: rarityProfile.value,
      fitTemplateId: fitTemplate.id,
      fitMode: input.fitMode,
      templateStrategy: input.fitMode === "copyWingTemplate" ? "derivative-copy" : null,
      baseReferenceKey: (baseReference == null ? void 0 : baseReference.key) || null,
      templateReferenceKey: input.fitMode === "copyWingTemplate" ? (templateReference == null ? void 0 : templateReference.key) || (baseReference == null ? void 0 : baseReference.key) || null : null,
      templateSourceKind: input.fitMode === "copyWingTemplate" ? (templateReference == null ? void 0 : templateReference.sourceKind) || (baseReference == null ? void 0 : baseReference.sourceKind) || null : null,
      materialFamily: materialFamily.id,
      colorHarmonyMode: input.colorHarmonyMode,
      detailDensity,
      palette,
      structureRecipe,
      ornamentRecipe,
      fitAttachment: cloneGeneratorAttachment(draftAttachment),
      displaySummary: summary
    };
    const coherenceReport = validateGeneratedWingRecipe(recipe, {
      categoryConfig
    });
    if (!coherenceReport.valid) {
      return {
        ok: false,
        error: coherenceReport.issues[0] || "The generated wing did not pass coherence validation.",
        coherenceReport
      };
    }
    const tags = [
      "generated",
      "procedural",
      themeConfig.value,
      rarityProfile.value,
      materialFamily.id,
      structureFamily.id
    ].filter(Boolean);
    const description = [
      `${themeConfig.label} wing set generated for XiO.`,
      `${rarityOption.label} rarity with ${materialFamily.label.toLowerCase()} materials.`,
      `Built with ${structureFamily.label.toLowerCase()} structure and ${detailDensity} detail density.`,
      input.fitMode === "copyWingTemplate" && baseReference ? `Uses ${baseReference.label} as a derivative template guide without cloning it exactly.` : null
    ].filter(Boolean).join(" ");
    const draftRecord = {
      key,
      label,
      categoryKey: DEFAULT_CATEGORY_VALUE,
      rarity: rarityProfile.value,
      factoryId: GENERATED_PROCEDURAL_WING_FACTORY_ID,
      assetUrl: null,
      storagePath: null,
      attachment: draftAttachment,
      eyePreset: null,
      materialPreset: null,
      mysteryBoxEnabled: false,
      active: true,
      archived: false,
      tags,
      description,
      preview: {
        wingMotion: buildWingMotionPreview(defaultWingMotionPreview, recipe),
        generated: recipe
      }
    };
    return {
      ok: true,
      draftRecord,
      recipe,
      summary,
      coherenceReport
    };
  }
  var DEFAULT_THEME_VALUE, DEFAULT_RARITY_VALUE, DEFAULT_CATEGORY_VALUE, DEFAULT_THEME_MODE, DEFAULT_DETAIL_DENSITY, DEFAULT_COLOR_HARMONY, DEFAULT_FIT_MODE, DETAIL_DENSITY_SCALE, COLOR_HARMONY_TO_PALETTE_FAMILY, STRUCTURE_NAME_LIBRARY, THEME_NAME_LIBRARY, isPlainObject, cloneJson, clamp, lerp, normalizeValue, normalizeSlug, hashString, createSeed, mulberry32, pickRandom, resolveThemeOption, resolveThemeConfig, resolveCategoryOption, resolveRarityProfile, resolveFitTemplateProfile, resolveMaterialFamily, resolveStructureFamily, hasReferenceGuidedFitMode, averageAttachmentScale, resolveTemplateReferenceGeneratedRecipe, resolveTemplateReferenceMetrics, resolveTemplateReferenceStructureFamily, clampToRange, getReferenceTemplateLabel, clampScaleToEnvelope, deriveSafeFitAttachment, normalizeGeneratedPalette, normalizeStructureRecipe, normalizeOrnamentRecipe, normalizeDisplaySummary, normalizeRequestedTheme, createExistingKeySet, buildUniqueKey, buildThemeDescriptor, buildStructureDescriptor, resolvePaletteFamily, resolveGeneratedTheme, resolveBaseReference, resolveMaterialFamilyForRecipe, resolveStructureFamilyForRecipe, resolveDetailDensity, computeCountFromRange, buildStructureRecipe, buildOrnamentRecipe, buildWingMotionPreview, buildSummaryObject, validateHexPalette;
  var init_random_prop_generator_core = __esm({
    "public/HomePageAPP/src/generator/random-prop-generator-core.js"() {
      init_random_prop_generator_config();
      DEFAULT_THEME_VALUE = "royal";
      DEFAULT_RARITY_VALUE = "rare";
      DEFAULT_CATEGORY_VALUE = "wingSet";
      DEFAULT_THEME_MODE = "fullyRandom";
      DEFAULT_DETAIL_DENSITY = "autoByRarity";
      DEFAULT_COLOR_HARMONY = "auto";
      DEFAULT_FIT_MODE = "useMasterTemplate";
      DETAIL_DENSITY_SCALE = Object.freeze({
        low: 0.86,
        medium: 1,
        high: 1.16
      });
      COLOR_HARMONY_TO_PALETTE_FAMILY = Object.freeze({
        auto: null,
        soft: "light",
        bold: "energy",
        royal: "royal",
        dark: "dark",
        light: "light",
        nature: "nature",
        energy: "energy"
      });
      STRUCTURE_NAME_LIBRARY = Object.freeze({
        aetherPlume: Object.freeze(["Aether Plume", "Skycrest", "Lumen Feather"]),
        royalFiligree: Object.freeze(["Regalia Crest", "Sovereign Filigree", "Majesty Veil"]),
        crystalFan: Object.freeze(["Prism Bloom", "Crystal Veil", "Facet Halo"]),
        emberBlade: Object.freeze(["Cinder Blade", "Inferno Crest", "Ember Talon"]),
        stormRibbon: Object.freeze(["Storm Ribbon", "Tempest Veil", "Aether Gale"]),
        mechanicalAegis: Object.freeze(["Aegis Frame", "Flux Guard", "Arc Alloy"])
      });
      THEME_NAME_LIBRARY = Object.freeze({
        royal: Object.freeze(["Royal", "Sovereign", "Regal"]),
        celestial: Object.freeze(["Celestial", "Astral", "Starwoven"]),
        light: Object.freeze(["Radiant", "Dawnlit", "Haloed"]),
        shadow: Object.freeze(["Shadow", "Nightbound", "Twilight"]),
        nature: Object.freeze(["Verdant", "Blooming", "Wildheart"]),
        mechanical: Object.freeze(["Mechanical", "Alloy", "Gearbound"]),
        crystal: Object.freeze(["Crystal", "Prismatic", "Lattice"]),
        arcane: Object.freeze(["Arcane", "Spellwoven", "Sigilborn"]),
        ember: Object.freeze(["Ember", "Cinder", "Infernal"]),
        frost: Object.freeze(["Frost", "Glacial", "Snowglass"]),
        moonlight: Object.freeze(["Moonlight", "Lunar", "Silverveil"]),
        sunflare: Object.freeze(["Sunflare", "Solstice", "Daybreak"]),
        galaxy: Object.freeze(["Galaxy", "Nebula", "Voidlight"]),
        butterfly: Object.freeze(["Butterfly", "Petalwing", "Bloomveil"]),
        dragon: Object.freeze(["Dragon", "Drakeshard", "Wyrmcrest"]),
        rune: Object.freeze(["Rune", "Glyphbound", "Inscribed"]),
        storm: Object.freeze(["Storm", "Tempest", "Thunderveil"]),
        aether: Object.freeze(["Aether", "Skyborne", "Liftrune"])
      });
      isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
      cloneJson = (value, fallback = null) => {
        if (value === void 0) {
          return fallback;
        }
        if (typeof structuredClone === "function") {
          try {
            return structuredClone(value);
          } catch {
          }
        }
        try {
          return JSON.parse(JSON.stringify(value));
        } catch {
          return fallback;
        }
      };
      clamp = (value, min, max) => Math.min(max, Math.max(min, value));
      lerp = (start, end, alpha) => start + (end - start) * alpha;
      normalizeValue = (value) => typeof value === "string" ? value.trim() : "";
      normalizeSlug = (value) => normalizeValue(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      hashString = (value) => {
        let hash = 2166136261;
        const text = String(value || "");
        for (let index = 0; index < text.length; index += 1) {
          hash ^= text.charCodeAt(index);
          hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
      };
      createSeed = (parts) => {
        const seedInput = parts.filter(Boolean).join("|");
        const randomPart = `${Date.now()}|${Math.random()}`;
        return hashString(`${seedInput}|${randomPart}`) || 1;
      };
      mulberry32 = (seed) => {
        let current = seed >>> 0;
        return () => {
          current = current + 1831565813 >>> 0;
          let next = Math.imul(current ^ current >>> 15, 1 | current);
          next ^= next + Math.imul(next ^ next >>> 7, 61 | next);
          return ((next ^ next >>> 14) >>> 0) / 4294967296;
        };
      };
      pickRandom = (rng, values, fallback = null) => {
        var _a;
        if (!Array.isArray(values) || values.length === 0) {
          return fallback;
        }
        const index = Math.floor(clamp(rng(), 0, 0.999999) * values.length);
        return (_a = values[index]) != null ? _a : fallback;
      };
      resolveThemeOption = (value) => {
        const normalized = normalizeSlug(value);
        if (!normalized) {
          return null;
        }
        return GENERATOR_THEME_OPTIONS.find((entry) => normalizeSlug(entry.value) === normalized || normalizeSlug(entry.label) === normalized) || null;
      };
      resolveThemeConfig = (value) => {
        const option = resolveThemeOption(value);
        return option ? THEME_CONFIGS[option.value] || null : null;
      };
      resolveCategoryOption = (value) => GENERATOR_CATEGORY_OPTIONS.find((entry) => entry.value === value) || null;
      resolveRarityProfile = (value) => GENERATOR_RARITY_PROFILES[value] || null;
      resolveFitTemplateProfile = (fitTemplateId) => FIT_TEMPLATE_PROFILES[fitTemplateId] || null;
      resolveMaterialFamily = (materialFamilyId) => MATERIAL_FAMILY_CONFIGS[materialFamilyId] || null;
      resolveStructureFamily = (structureFamilyId) => STRUCTURE_FAMILY_CONFIGS[structureFamilyId] || null;
      hasReferenceGuidedFitMode = (fitMode) => fitMode === "matchExistingProp" || fitMode === "copyWingTemplate";
      averageAttachmentScale = (attachment, fallback = 1.9) => {
        const scale = Array.isArray(attachment == null ? void 0 : attachment.scale) ? attachment.scale : null;
        if (!(scale == null ? void 0 : scale.length)) {
          return fallback;
        }
        const values = scale.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0);
        if (!values.length) {
          return fallback;
        }
        return values.reduce((sum, value) => sum + value, 0) / values.length;
      };
      resolveTemplateReferenceGeneratedRecipe = (templateReference) => isPlainObject(templateReference == null ? void 0 : templateReference.generatedRecipe) ? templateReference.generatedRecipe : null;
      resolveTemplateReferenceMetrics = (templateReference) => isPlainObject(templateReference == null ? void 0 : templateReference.metrics) ? templateReference.metrics : null;
      resolveTemplateReferenceStructureFamily = (templateReference, baseReference = null) => {
        var _a;
        const generatedRecipe = resolveTemplateReferenceGeneratedRecipe(templateReference);
        const generatedFamily = normalizeValue((_a = generatedRecipe == null ? void 0 : generatedRecipe.structureRecipe) == null ? void 0 : _a.family);
        if (generatedFamily) {
          return generatedFamily;
        }
        const directFamily = normalizeValue(templateReference == null ? void 0 : templateReference.structureFamily);
        if (directFamily) {
          return directFamily;
        }
        const baseFamily = normalizeValue(baseReference == null ? void 0 : baseReference.structureFamily);
        if (baseFamily) {
          return baseFamily;
        }
        const referenceSignature = baseReference ? inferWingReferenceSignature(baseReference) : null;
        return normalizeValue(referenceSignature == null ? void 0 : referenceSignature.structureFamily);
      };
      clampToRange = (value, range, fallback, extraMax = 0) => {
        const [min, max] = Array.isArray(range) ? range : [fallback, fallback];
        return clamp(Number.isFinite(Number(value)) ? Number(value) : fallback, min, max + extraMax);
      };
      getReferenceTemplateLabel = (baseReference, fitMode) => (baseReference == null ? void 0 : baseReference.label) ? fitMode === "copyWingTemplate" ? `${baseReference.label} (guide only)` : baseReference.label : "Auto Select";
      clampScaleToEnvelope = (scaleValues, scaleEnvelope, fallbackScale = [1.9, 1.9, 1.9]) => {
        const min = Number(scaleEnvelope == null ? void 0 : scaleEnvelope.min) || 1.4;
        const max = Number(scaleEnvelope == null ? void 0 : scaleEnvelope.max) || 2.6;
        const source = Array.isArray(scaleValues) ? scaleValues : fallbackScale;
        return [0, 1, 2].map((index) => clamp(Number(source[index]) || Number(fallbackScale[index]) || min, min, max));
      };
      deriveSafeFitAttachment = ({
        fitTemplate,
        attachment,
        fitMode = DEFAULT_FIT_MODE
      }) => {
        const templateAttachment = cloneGeneratorAttachment(fitTemplate == null ? void 0 : fitTemplate.attachment);
        const templateScale = Array.isArray(templateAttachment.scale) ? templateAttachment.scale : [1.9, 1.9, 1.9];
        const templatePosition = Array.isArray(templateAttachment.position) ? templateAttachment.position : [0.72, -0.24, 0.08];
        const templateRotation = Array.isArray(templateAttachment.rotation) ? templateAttachment.rotation : [0.02, 0.06, -0.02];
        const envelope = (fitTemplate == null ? void 0 : fitTemplate.scaleEnvelope) || { min: 1.4, max: 2.6 };
        const sourceAttachment = cloneGeneratorAttachment(attachment || templateAttachment);
        const safeAttachment = cloneGeneratorAttachment(templateAttachment);
        const sourceScale = Array.isArray(sourceAttachment.scale) ? sourceAttachment.scale : templateScale;
        const useReferenceOffsets = hasReferenceGuidedFitMode(fitMode);
        const referenceBlend = fitMode === "copyWingTemplate" ? 0.44 : 0.28;
        const positionClamp = fitMode === "copyWingTemplate" ? 0.24 : 0.18;
        const rotationClamp = fitMode === "copyWingTemplate" ? 0.28 : 0.22;
        const sourceScaleLooksSafe = sourceScale.every((value) => value >= envelope.min * 0.85 && value <= envelope.max * 1.15);
        safeAttachment.position = templatePosition.map((value, index) => {
          if (!useReferenceOffsets) return value;
          return clamp(
            lerp(value, Number(sourceAttachment.position[index]) || value, referenceBlend),
            value - positionClamp,
            value + positionClamp
          );
        });
        safeAttachment.rotation = templateRotation.map((value, index) => {
          if (!useReferenceOffsets) return value;
          return clamp(
            lerp(value, Number(sourceAttachment.rotation[index]) || value, fitMode === "copyWingTemplate" ? 0.42 : 0.35),
            value - rotationClamp,
            value + rotationClamp
          );
        });
        safeAttachment.scale = sourceScaleLooksSafe ? clampScaleToEnvelope(sourceScale, envelope, templateScale) : clampScaleToEnvelope(templateScale, envelope, templateScale);
        safeAttachment.fit = cloneJson(templateAttachment.fit, templateAttachment.fit);
        if (useReferenceOffsets && safeAttachment.fit && isPlainObject(sourceAttachment.fit)) {
          safeAttachment.fit.yOffsetRatio = clamp(
            lerp(safeAttachment.fit.yOffsetRatio, Number(sourceAttachment.fit.yOffsetRatio) || safeAttachment.fit.yOffsetRatio, fitMode === "copyWingTemplate" ? 0.4 : 0.24),
            safeAttachment.fit.yOffsetRatio - 0.18,
            safeAttachment.fit.yOffsetRatio + 0.18
          );
          safeAttachment.fit.zOffsetRatio = clamp(
            lerp(safeAttachment.fit.zOffsetRatio, Number(sourceAttachment.fit.zOffsetRatio) || safeAttachment.fit.zOffsetRatio, fitMode === "copyWingTemplate" ? 0.38 : 0.22),
            safeAttachment.fit.zOffsetRatio - 0.1,
            safeAttachment.fit.zOffsetRatio + 0.1
          );
          safeAttachment.fit.distanceMultiplier = clamp(
            lerp(safeAttachment.fit.distanceMultiplier, Number(sourceAttachment.fit.distanceMultiplier) || safeAttachment.fit.distanceMultiplier, fitMode === "copyWingTemplate" ? 0.36 : 0.22),
            safeAttachment.fit.distanceMultiplier - 0.22,
            safeAttachment.fit.distanceMultiplier + 0.22
          );
        }
        safeAttachment.mirrorMode = "paired";
        return safeAttachment;
      };
      normalizeGeneratedPalette = (palette) => {
        if (!isPlainObject(palette)) {
          return null;
        }
        const requiredKeys = ["primary", "secondary", "accent", "glow", "shadow", "metal"];
        if (requiredKeys.some((key) => typeof palette[key] !== "string" || palette[key].trim().length === 0)) {
          return null;
        }
        return {
          key: typeof palette.key === "string" ? palette.key : normalizeSlug(`${palette.primary}-${palette.secondary}`),
          label: typeof palette.label === "string" ? palette.label : "Generated Palette",
          primary: palette.primary.trim(),
          secondary: palette.secondary.trim(),
          accent: palette.accent.trim(),
          glow: palette.glow.trim(),
          shadow: palette.shadow.trim(),
          metal: palette.metal.trim()
        };
      };
      normalizeStructureRecipe = (recipe) => {
        if (!isPlainObject(recipe)) {
          return null;
        }
        const family = resolveStructureFamily(recipe.family);
        if (!family) {
          return null;
        }
        return {
          family: family.id,
          silhouette: typeof recipe.silhouette === "string" ? recipe.silhouette : family.silhouette,
          membrane: recipe.membrane === true || recipe.membrane === false ? recipe.membrane : family.membrane,
          span: clamp(Number(recipe.span) || family.spanRange[0], 2.4, 5.9),
          height: clamp(Number(recipe.height) || family.heightRange[0], 1.4, 4.4),
          primaryLayerCount: clamp(Math.round(Number(recipe.primaryLayerCount) || family.primaryRange[0]), 3, 12),
          secondaryLayerCount: clamp(Math.round(Number(recipe.secondaryLayerCount) || family.secondaryRange[0]), 0, 9),
          featherLength: clamp(Number(recipe.featherLength) || 1.12, 0.6, 2.2),
          featherWidth: clamp(Number(recipe.featherWidth) || 0.28, 0.12, 0.76),
          innerLift: clamp(Number(recipe.innerLift) || family.tipLift, 0.16, 1.35),
          outerSweep: clamp(Number(recipe.outerSweep) || family.curveBias, 0.1, 1.2),
          crestCount: clamp(Math.round(Number(recipe.crestCount) || 1), 0, 4),
          tipFlare: clamp(Number(recipe.tipFlare) || 0.28, 0, 0.95)
        };
      };
      normalizeOrnamentRecipe = (recipe) => {
        if (!isPlainObject(recipe)) {
          return null;
        }
        return {
          haloBands: clamp(Math.round(Number(recipe.haloBands) || 0), 0, 3),
          crystalClusters: clamp(Math.round(Number(recipe.crystalClusters) || 0), 0, 4),
          runeSigils: clamp(Math.round(Number(recipe.runeSigils) || 0), 0, 5),
          ribbonTrails: clamp(Math.round(Number(recipe.ribbonTrails) || 0), 0, 3),
          emberNodes: clamp(Math.round(Number(recipe.emberNodes) || 0), 0, 4),
          crownSpurs: clamp(Math.round(Number(recipe.crownSpurs) || 0), 0, 4),
          glowMode: typeof recipe.glowMode === "string" ? recipe.glowMode : "soft",
          ornamentBudget: clamp(Math.round(Number(recipe.ornamentBudget) || 0), 0, 6)
        };
      };
      normalizeDisplaySummary = (summary) => isPlainObject(summary) ? {
        categoryLabel: typeof summary.categoryLabel === "string" ? summary.categoryLabel : "Wings",
        rarityLabel: typeof summary.rarityLabel === "string" ? summary.rarityLabel : "Rare",
        themeLabel: typeof summary.themeLabel === "string" ? summary.themeLabel : "Royal",
        detailLabel: typeof summary.detailLabel === "string" ? summary.detailLabel : "Medium",
        materialDirection: typeof summary.materialDirection === "string" ? summary.materialDirection : "Balanced",
        fitLabel: typeof summary.fitLabel === "string" ? summary.fitLabel : "XiO Wing Master Template",
        baseReferenceLabel: typeof summary.baseReferenceLabel === "string" ? summary.baseReferenceLabel : "Auto Select"
      } : null;
      normalizeRequestedTheme = (value) => {
        const resolved = resolveThemeOption(value);
        return resolved ? resolved.value : "";
      };
      createExistingKeySet = (existingProps) => {
        const values = Array.isArray(existingProps) ? existingProps : [];
        return new Set(
          values.map((entry) => normalizeSlug(typeof (entry == null ? void 0 : entry.key) === "string" ? entry.key : "")).filter(Boolean)
        );
      };
      buildUniqueKey = (label, existingKeys) => {
        const baseKey = normalizeSlug(label) || "generated-wing-prop";
        if (!existingKeys.has(baseKey)) {
          return baseKey;
        }
        let suffix = 2;
        while (existingKeys.has(`${baseKey}-${suffix}`)) {
          suffix += 1;
        }
        return `${baseKey}-${suffix}`;
      };
      buildThemeDescriptor = (rng, themeValue) => pickRandom(rng, THEME_NAME_LIBRARY[themeValue] || [getGeneratorOptionLabel(GENERATOR_THEME_OPTIONS, themeValue, "Generated")], "Generated");
      buildStructureDescriptor = (rng, structureFamilyId) => pickRandom(rng, STRUCTURE_NAME_LIBRARY[structureFamilyId] || ["Wing"], "Wing");
      resolvePaletteFamily = ({ themeConfig, colorHarmonyMode, rarityProfile, baseReference }) => {
        const harmonyFamily = COLOR_HARMONY_TO_PALETTE_FAMILY[colorHarmonyMode] || null;
        if (harmonyFamily && Array.isArray(PALETTE_LIBRARY[harmonyFamily]) && PALETTE_LIBRARY[harmonyFamily].length) {
          return harmonyFamily;
        }
        const referenceFamily = normalizeValue(baseReference == null ? void 0 : baseReference.paletteFamily);
        if (referenceFamily && Array.isArray(PALETTE_LIBRARY[referenceFamily]) && PALETTE_LIBRARY[referenceFamily].length) {
          return referenceFamily;
        }
        const themeFamily = themeConfig.paletteFamilies.find((family) => Array.isArray(PALETTE_LIBRARY[family]) && PALETTE_LIBRARY[family].length);
        if (themeFamily) {
          return themeFamily;
        }
        const rarityFamily = (rarityProfile.preferredPalettes || []).find((family) => Array.isArray(PALETTE_LIBRARY[family]) && PALETTE_LIBRARY[family].length);
        return rarityFamily || "royal";
      };
      resolveGeneratedTheme = ({ input, baseReference, categoryConfig, rng }) => {
        if (input.themeMode === "guidedTheme") {
          const guidedThemeValue = normalizeRequestedTheme(input.themeInput);
          return resolveThemeConfig(guidedThemeValue || DEFAULT_THEME_VALUE);
        }
        if (input.themeMode === "matchExistingStyle" || input.fitMode === "copyWingTemplate" && normalizeValue(baseReference == null ? void 0 : baseReference.theme)) {
          const referenceTheme = normalizeValue(baseReference == null ? void 0 : baseReference.theme);
          return resolveThemeConfig(referenceTheme || DEFAULT_THEME_VALUE);
        }
        const choices = categoryConfig.allowedThemes.map((value) => THEME_CONFIGS[value]).filter(Boolean);
        return pickRandom(rng, choices, THEME_CONFIGS[DEFAULT_THEME_VALUE]);
      };
      resolveBaseReference = ({ input, baseReferenceOptions, themeMode, rng }) => {
        const requestedKey = normalizeValue(input.baseReferenceKey);
        const references = Array.isArray(baseReferenceOptions) ? baseReferenceOptions : [];
        const requestedReference = requestedKey ? references.find((entry) => entry.key === requestedKey) || null : null;
        if (requestedReference) {
          return requestedReference;
        }
        if (!references.length) {
          return null;
        }
        if (themeMode === "matchExistingStyle") {
          return pickRandom(rng, references, references[0]);
        }
        return references[0];
      };
      resolveMaterialFamilyForRecipe = ({ themeConfig, rarityProfile, baseReference, input, templateReference, rng }) => {
        if (input.fitMode === "copyWingTemplate") {
          const generatedRecipe = resolveTemplateReferenceGeneratedRecipe(templateReference);
          const copiedFamily = normalizeValue((generatedRecipe == null ? void 0 : generatedRecipe.materialFamily) || (templateReference == null ? void 0 : templateReference.materialFamily) || (baseReference == null ? void 0 : baseReference.materialFamily));
          if (copiedFamily && rarityProfile.allowedMaterials.includes(copiedFamily)) {
            return resolveMaterialFamily(copiedFamily);
          }
        }
        const themePreferred = themeConfig.preferredMaterials.filter((value) => rarityProfile.allowedMaterials.includes(value));
        if (themePreferred.length) {
          return resolveMaterialFamily(pickRandom(rng, themePreferred, themePreferred[0]));
        }
        const fallbackFamily = normalizeValue(baseReference == null ? void 0 : baseReference.materialFamily);
        if (fallbackFamily && rarityProfile.allowedMaterials.includes(fallbackFamily)) {
          return resolveMaterialFamily(fallbackFamily);
        }
        return resolveMaterialFamily(rarityProfile.allowedMaterials[0] || "royalEnamel");
      };
      resolveStructureFamilyForRecipe = ({ themeConfig, rarityProfile, baseReference, input, templateReference, rng }) => {
        var _a;
        if (input.fitMode === "copyWingTemplate") {
          const copiedFamily = resolveTemplateReferenceStructureFamily(templateReference, baseReference);
          if (copiedFamily && rarityProfile.allowedStructures.includes(copiedFamily)) {
            return resolveStructureFamily(copiedFamily);
          }
        }
        const themePreferred = themeConfig.preferredStructures.filter((value) => rarityProfile.allowedStructures.includes(value));
        if (themePreferred.length) {
          return resolveStructureFamily(pickRandom(rng, themePreferred, themePreferred[0]));
        }
        const referenceSignature = baseReference ? inferWingReferenceSignature(baseReference) : null;
        const referenceThemeConfig = referenceSignature ? resolveThemeConfig(referenceSignature.theme) : null;
        const referenceStructure = (_a = referenceThemeConfig == null ? void 0 : referenceThemeConfig.preferredStructures) == null ? void 0 : _a.find((value) => rarityProfile.allowedStructures.includes(value));
        if (referenceStructure) {
          return resolveStructureFamily(referenceStructure);
        }
        return resolveStructureFamily(rarityProfile.allowedStructures[0] || "aetherPlume");
      };
      resolveDetailDensity = (input, rarityProfile) => input.detailDensity === "autoByRarity" ? rarityProfile.defaultDetailDensity : GENERATOR_DETAIL_DENSITY_OPTIONS.some((entry) => entry.value === input.detailDensity) ? input.detailDensity : rarityProfile.defaultDetailDensity;
      computeCountFromRange = (rng, range, rarityProfile, detailDensity, extraBoost = 0) => {
        const [min, max] = Array.isArray(range) ? range : [0, 0];
        const densityScale = DETAIL_DENSITY_SCALE[detailDensity] || 1;
        const base = min + (max - min) * clamp((0.45 + rng() * 0.55) * rarityProfile.complexityScale * densityScale, 0, 1.15);
        return clamp(Math.round(base + extraBoost), min, max + extraBoost);
      };
      buildStructureRecipe = ({
        rng,
        structureFamily,
        rarityProfile,
        detailDensity,
        templateReference = null,
        fitTemplate = null
      }) => {
        var _a;
        const primaryLayerCount = computeCountFromRange(rng, structureFamily.primaryRange, rarityProfile, detailDensity, rarityProfile.layerBoost);
        const secondaryLayerCount = computeCountFromRange(rng, structureFamily.secondaryRange, rarityProfile, detailDensity, Math.max(0, rarityProfile.layerBoost - 1));
        const scaleVariance = 0.92 + rng() * 0.16;
        const recipe = {
          family: structureFamily.id,
          silhouette: structureFamily.silhouette,
          membrane: structureFamily.membrane,
          span: Number((pickRandom(rng, [structureFamily.spanRange[0], structureFamily.spanRange[1]], structureFamily.spanRange[0]) * scaleVariance).toFixed(3)),
          height: Number((pickRandom(rng, [structureFamily.heightRange[0], structureFamily.heightRange[1]], structureFamily.heightRange[0]) * (0.96 + rng() * 0.12)).toFixed(3)),
          primaryLayerCount,
          secondaryLayerCount,
          featherLength: Number((0.9 + primaryLayerCount * 0.08 + rng() * 0.18).toFixed(3)),
          featherWidth: Number((0.18 + rarityProfile.complexityScale * 0.08 + rng() * 0.1).toFixed(3)),
          innerLift: Number((structureFamily.tipLift + rarityProfile.glowIntensity * 0.35 + (rng() - 0.5) * 0.12).toFixed(3)),
          outerSweep: Number((structureFamily.curveBias + (rng() - 0.5) * 0.12).toFixed(3)),
          crestCount: clamp(Math.round((rarityProfile.ornamentBudget - 1) * 0.5 + rng()), 0, 4),
          tipFlare: Number((0.18 + rarityProfile.complexityScale * 0.14 + rng() * 0.12).toFixed(3))
        };
        const generatedTemplateRecipe = (_a = resolveTemplateReferenceGeneratedRecipe(templateReference)) == null ? void 0 : _a.structureRecipe;
        const templateMetrics = resolveTemplateReferenceMetrics(templateReference);
        if (!generatedTemplateRecipe && !templateMetrics) {
          return recipe;
        }
        const fitTemplateScaleAverage = averageAttachmentScale(fitTemplate == null ? void 0 : fitTemplate.attachment, 1.9);
        const referenceScaleAverage = Number.isFinite(Number(templateMetrics == null ? void 0 : templateMetrics.attachmentScaleAverage)) ? Number(templateMetrics.attachmentScaleAverage) : averageAttachmentScale(templateReference == null ? void 0 : templateReference.attachment, fitTemplateScaleAverage);
        const referenceScaleBias = clamp(referenceScaleAverage / Math.max(fitTemplateScaleAverage, 1e-3), 0.84, 1.18);
        const spreadRatio = clamp(Number(templateMetrics == null ? void 0 : templateMetrics.spreadRatio) || 1.8, 1.1, 3.4);
        const verticalRatio = clamp(Number(templateMetrics == null ? void 0 : templateMetrics.verticalRatio) || 0.58, 0.24, 1.1);
        const depthRatio = clamp(Number(templateMetrics == null ? void 0 : templateMetrics.depthRatio) || 0.12, 0.04, 0.56);
        const wideBias = clamp((spreadRatio - 1.55) / 1.1, 0, 1.2);
        const tallBias = clamp((verticalRatio - 0.42) / 0.34, 0, 1.15);
        const depthBias = clamp((depthRatio - 0.08) / 0.22, 0, 1.2);
        recipe.span = clampToRange(
          generatedTemplateRecipe ? lerp(recipe.span, Number(generatedTemplateRecipe.span || recipe.span) * (0.9 + rng() * 0.22), 0.72) : recipe.span * clamp(referenceScaleBias * (0.92 + wideBias * 0.12), 0.84, 1.2),
          structureFamily.spanRange,
          recipe.span,
          0.55
        );
        recipe.height = clampToRange(
          generatedTemplateRecipe ? lerp(recipe.height, Number(generatedTemplateRecipe.height || recipe.height) * (0.9 + rng() * 0.2), 0.7) : recipe.height * clamp(0.94 + tallBias * 0.18 + (referenceScaleBias - 1) * 0.18, 0.84, 1.2),
          structureFamily.heightRange,
          recipe.height,
          0.5
        );
        recipe.primaryLayerCount = clamp(
          Math.round(
            generatedTemplateRecipe ? lerp(recipe.primaryLayerCount, Number(generatedTemplateRecipe.primaryLayerCount || recipe.primaryLayerCount) + (rng() - 0.5) * 2.4, 0.74) : recipe.primaryLayerCount + wideBias * 2.2 + depthBias * 0.8 + (rng() - 0.5) * 1.4
          ),
          structureFamily.primaryRange[0],
          structureFamily.primaryRange[1] + rarityProfile.layerBoost + 3
        );
        recipe.secondaryLayerCount = clamp(
          Math.round(
            generatedTemplateRecipe ? lerp(recipe.secondaryLayerCount, Number(generatedTemplateRecipe.secondaryLayerCount || recipe.secondaryLayerCount) + (rng() - 0.5) * 2, 0.66) : recipe.secondaryLayerCount + tallBias * 1.2 + (rng() - 0.5) * 1.1
          ),
          structureFamily.secondaryRange[0],
          structureFamily.secondaryRange[1] + Math.max(1, rarityProfile.layerBoost) + 2
        );
        recipe.featherLength = clamp(
          generatedTemplateRecipe ? lerp(recipe.featherLength, Number(generatedTemplateRecipe.featherLength || recipe.featherLength) * (0.92 + rng() * 0.18), 0.68) : recipe.featherLength * clamp(0.96 + tallBias * 0.1 + wideBias * 0.08, 0.84, 1.22),
          0.6,
          2.25
        );
        recipe.featherWidth = clamp(
          generatedTemplateRecipe ? lerp(recipe.featherWidth, Number(generatedTemplateRecipe.featherWidth || recipe.featherWidth) * (0.9 + rng() * 0.16), 0.64) : recipe.featherWidth * clamp(0.96 + depthBias * 0.18 + wideBias * 0.08, 0.82, 1.28),
          0.12,
          0.82
        );
        recipe.innerLift = clamp(
          generatedTemplateRecipe ? lerp(recipe.innerLift, Number(generatedTemplateRecipe.innerLift || recipe.innerLift) + (rng() - 0.5) * 0.14, 0.7) : lerp(recipe.innerLift, structureFamily.tipLift + tallBias * 0.18 - wideBias * 0.06, 0.48),
          0.16,
          1.35
        );
        recipe.outerSweep = clamp(
          generatedTemplateRecipe ? lerp(recipe.outerSweep, Number(generatedTemplateRecipe.outerSweep || recipe.outerSweep) + (rng() - 0.5) * 0.14, 0.72) : lerp(recipe.outerSweep, structureFamily.curveBias + wideBias * 0.2 + tallBias * 0.04, 0.52),
          0.1,
          1.2
        );
        recipe.crestCount = clamp(
          Math.round(
            generatedTemplateRecipe ? lerp(recipe.crestCount, Number(generatedTemplateRecipe.crestCount || recipe.crestCount) + (rng() - 0.5) * 1.2, 0.64) : recipe.crestCount + depthBias * 0.6
          ),
          0,
          4
        );
        recipe.tipFlare = clamp(
          generatedTemplateRecipe ? lerp(recipe.tipFlare, Number(generatedTemplateRecipe.tipFlare || recipe.tipFlare) + (rng() - 0.5) * 0.12, 0.66) : lerp(recipe.tipFlare, recipe.tipFlare + wideBias * 0.14 + depthBias * 0.08, 0.52),
          0,
          0.95
        );
        return recipe;
      };
      buildOrnamentRecipe = ({ rng, structureFamily, rarityProfile, detailDensity }) => {
        const densityScale = DETAIL_DENSITY_SCALE[detailDensity] || 1;
        const ornamentBudget = clamp(Math.round(rarityProfile.ornamentBudget * densityScale), 1, 6);
        const baseBias = structureFamily.ornamentBias;
        const pull = (key, variance = 1) => clamp(Math.round((baseBias[key] || 0) + rng() * variance + ornamentBudget * 0.18), 0, 5);
        return {
          haloBands: pull("haloBands", 0.6),
          crystalClusters: pull("crystalClusters", 0.7),
          runeSigils: pull("runeSigils", 0.8),
          ribbonTrails: pull("ribbonTrails", 0.65),
          emberNodes: pull("emberNodes", 0.6),
          crownSpurs: pull("crownSpurs", 0.6),
          glowMode: rarityProfile.value === "legendaryDark" ? "heroic-dark" : rarityProfile.value === "legendaryLight" ? "heroic-light" : rarityProfile.value === "legendary" ? "prestige" : "soft",
          ornamentBudget
        };
      };
      buildWingMotionPreview = (basePreview, recipe) => {
        const base = cloneJson(basePreview, {}) || {};
        const next = {
          linked: true,
          master: {
            flapHz: 0.82,
            direction: "normal",
            amplitude: 1,
            sweep: 1,
            pitch: 0.08,
            featherTwist: 0.48,
            shoulderSpread: 0.22,
            phaseOffset: 0
          }
        };
        const theme = recipe.theme;
        const rarity = recipe.rarityProfile;
        if (theme === "storm" || theme === "mechanical") {
          next.master.flapHz = 1.05;
          next.master.sweep = 1.08;
        } else if (theme === "moonlight" || theme === "celestial") {
          next.master.flapHz = 0.72;
          next.master.amplitude = 0.92;
          next.master.pitch = 0.11;
        } else if (theme === "ember" || theme === "dragon") {
          next.master.flapHz = 0.95;
          next.master.amplitude = 1.08;
          next.master.shoulderSpread = 0.28;
        }
        if (rarity === "legendaryLight") {
          next.master.featherTwist = 0.7;
          next.master.pitch = 0.12;
        } else if (rarity === "legendaryDark") {
          next.master.sweep = 1.14;
          next.master.amplitude = 1.12;
          next.master.shoulderSpread = 0.32;
        } else if (rarity === "common") {
          next.master.amplitude = 0.88;
          next.master.featherTwist = 0.34;
          next.master.shoulderSpread = 0.16;
        }
        return {
          ...base,
          linked: true,
          master: {
            ...isPlainObject(base.master) ? base.master : {},
            ...next.master
          }
        };
      };
      buildSummaryObject = ({ categoryOption, rarityOption, themeConfig, detailDensity, materialFamily, fitTemplate, baseReference, fitMode }) => ({
        categoryLabel: categoryOption.label,
        rarityLabel: rarityOption.label,
        themeLabel: themeConfig.label,
        detailLabel: getGeneratorOptionLabel(GENERATOR_DETAIL_DENSITY_OPTIONS, detailDensity, "Medium"),
        materialDirection: materialFamily.label,
        fitLabel: fitMode === "copyWingTemplate" ? `${fitTemplate.label} + derivative` : fitTemplate.label,
        baseReferenceLabel: getReferenceTemplateLabel(baseReference, fitMode)
      });
      validateHexPalette = (palette) => {
        const hexPattern = /^#[0-9a-f]{6}$/i;
        return ["primary", "secondary", "accent", "glow", "shadow", "metal"].every((key) => hexPattern.test(palette[key] || ""));
      };
    }
  });

  // public/HomePageAPP/src/runtime/xio-generated-wing-props.js
  var xio_generated_wing_props_exports = {};
  __export(xio_generated_wing_props_exports, {
    buildGeneratedWingPreview: () => buildGeneratedWingPreview,
    createGeneratedProceduralWingPropFactory: () => createGeneratedProceduralWingPropFactory
  });
  function buildGeneratedWingPreview({ THREE, recipe, attachment = null }) {
    var _a;
    const normalizedRecipe = normalizeGeneratedWingRecipe(recipe);
    if (!normalizedRecipe) {
      return null;
    }
    const previewAttachment = cloneGeneratorAttachment(
      attachment || normalizedRecipe.fitAttachment || ((_a = FIT_TEMPLATE_PROFILES[normalizedRecipe.fitTemplateId]) == null ? void 0 : _a.attachment)
    );
    const group = buildGeneratedWingAssembly(THREE, normalizedRecipe, { attachment: previewAttachment });
    return {
      left: group.userData.left,
      right: group.userData.right,
      attachment: previewAttachment
    };
  }
  function createGeneratedProceduralWingPropFactory({ THREE, leftWingGroup, rightWingGroup }) {
    return function makeGeneratedProceduralWingProp(entry) {
      var _a, _b;
      const normalizedRecipe = normalizeGeneratedWingRecipe(((_a = entry == null ? void 0 : entry.preview) == null ? void 0 : _a.generated) || (entry == null ? void 0 : entry.generated) || null);
      if (!normalizedRecipe) {
        return new THREE.Group();
      }
      const attachment = cloneGeneratorAttachment(
        (entry == null ? void 0 : entry.attachment) || normalizedRecipe.fitAttachment || ((_b = FIT_TEMPLATE_PROFILES[normalizedRecipe.fitTemplateId]) == null ? void 0 : _b.attachment)
      );
      return buildGeneratedWingAssembly(THREE, normalizedRecipe, {
        wingParents: {
          left: leftWingGroup,
          right: rightWingGroup
        },
        attachment
      });
    };
  }
  var RARITY_GLOW_INTENSITY, RARITY_IRIDESCENCE, BASE_STYLE_PROFILE, FAMILY_STYLE_PROFILES, PANEL_GEOMETRY_CACHE, QUILL_GEOMETRY_CACHE, clampNumber2, lerpNumber, easeOutCubic, ensureColor, enrichColor, createCurve, resolveStyleProfile, getWingPanelGeometry, getQuillGeometry, createMaterialSet, createGuideCurves, sampleCurveRange, createRibbonSurfaceGeometry, createFeatherMesh, orientAlongVector, addFeatherAxisYaw, createFeatherLayer, addShoulderPlumage, addShoulderAssembly, addSupportBones, addSilhouetteVeils, addMembraneSurface, addSparkleInstances, addOrnaments, createWingSide, applyAttachmentToWingSide, buildGeneratedWingAssembly;
  var init_xio_generated_wing_props = __esm({
    "public/HomePageAPP/src/runtime/xio-generated-wing-props.js"() {
      init_random_prop_generator_config();
      init_random_prop_generator_core();
      RARITY_GLOW_INTENSITY = Object.freeze({
        common: 0.18,
        rare: 0.28,
        legendary: 0.42,
        legendaryLight: 0.7,
        legendaryDark: 0.78
      });
      RARITY_IRIDESCENCE = Object.freeze({
        common: 0.08,
        rare: 0.18,
        legendary: 0.3,
        legendaryLight: 0.7,
        legendaryDark: 0.44
      });
      BASE_STYLE_PROFILE = Object.freeze({
        profile: "plume",
        armatureDepth: 0.22,
        shoulderLift: 0.1,
        midLift: 0.18,
        upperBloom: 0.18,
        tipRise: 0.08,
        lowerSweep: 0.22,
        trailingLift: 0.08,
        primaryRoll: 0.18,
        secondaryRoll: 0.08,
        covertCount: 3,
        rootScale: 1,
        sparkleCount: 4,
        primaryCountBoost: 1.55,
        secondaryCountBoost: 1.4,
        covertCountBoost: 1.5,
        primaryYaw: 0.14,
        secondaryYaw: 0.08,
        primarySpread: 0.42,
        secondarySpread: 0.24,
        featherWidthBias: 1,
        featherLengthBias: 1,
        veilStrength: 0.78,
        shoulderPlumeCount: 4,
        braceDensity: 0.28,
        armatureVisibility: 0.7
      });
      FAMILY_STYLE_PROFILES = Object.freeze({
        aetherPlume: Object.freeze({
          profile: "plume",
          armatureDepth: 0.24,
          upperBloom: 0.22,
          tipRise: 0.16,
          lowerSweep: 0.2,
          primaryRoll: 0.22,
          secondaryRoll: 0.1,
          covertCount: 4,
          sparkleCount: 6,
          primaryCountBoost: 1.8,
          secondaryCountBoost: 1.55,
          covertCountBoost: 1.7,
          primaryYaw: 0.18,
          secondaryYaw: 0.12,
          primarySpread: 0.58,
          secondarySpread: 0.34,
          featherWidthBias: 1.18,
          featherLengthBias: 1.08,
          veilStrength: 0.92,
          shoulderPlumeCount: 6,
          braceDensity: 0.18,
          armatureVisibility: 0.48
        }),
        royalFiligree: Object.freeze({
          profile: "filigree",
          armatureDepth: 0.18,
          shoulderLift: 0.14,
          midLift: 0.22,
          upperBloom: 0.16,
          tipRise: 0.06,
          lowerSweep: 0.18,
          primaryRoll: 0.14,
          secondaryRoll: 0.06,
          covertCount: 3,
          rootScale: 1.06,
          sparkleCount: 5,
          primaryCountBoost: 1.62,
          secondaryCountBoost: 1.38,
          covertCountBoost: 1.45,
          primaryYaw: 0.16,
          secondaryYaw: 0.08,
          primarySpread: 0.46,
          secondarySpread: 0.22,
          featherWidthBias: 1.06,
          featherLengthBias: 1.02,
          veilStrength: 0.68,
          shoulderPlumeCount: 5,
          braceDensity: 0.22,
          armatureVisibility: 0.62
        }),
        crystalFan: Object.freeze({
          profile: "crystal",
          armatureDepth: 0.16,
          upperBloom: 0.08,
          tipRise: 0.02,
          lowerSweep: 0.12,
          trailingLift: 0.02,
          primaryRoll: 0.08,
          secondaryRoll: 0.04,
          covertCount: 2,
          sparkleCount: 7,
          primaryCountBoost: 1.36,
          secondaryCountBoost: 1.2,
          covertCountBoost: 1.18,
          primaryYaw: 0.1,
          secondaryYaw: 0.04,
          primarySpread: 0.22,
          secondarySpread: 0.12,
          featherWidthBias: 0.94,
          featherLengthBias: 0.96,
          veilStrength: 0.54,
          shoulderPlumeCount: 3,
          braceDensity: 0.36,
          armatureVisibility: 0.74
        }),
        emberBlade: Object.freeze({
          profile: "blade",
          armatureDepth: 0.2,
          shoulderLift: 0.06,
          midLift: 0.12,
          upperBloom: 0.1,
          tipRise: 0.02,
          lowerSweep: 0.16,
          trailingLift: 0.04,
          primaryRoll: 0.06,
          secondaryRoll: 0.04,
          covertCount: 2,
          sparkleCount: 5,
          primaryCountBoost: 1.42,
          secondaryCountBoost: 1.18,
          covertCountBoost: 1.2,
          primaryYaw: 0.08,
          secondaryYaw: 0.04,
          primarySpread: 0.2,
          secondarySpread: 0.1,
          featherWidthBias: 0.9,
          featherLengthBias: 1.04,
          veilStrength: 0.46,
          shoulderPlumeCount: 3,
          braceDensity: 0.42,
          armatureVisibility: 0.8
        }),
        stormRibbon: Object.freeze({
          profile: "plume",
          armatureDepth: 0.18,
          shoulderLift: 0.08,
          midLift: 0.18,
          upperBloom: 0.16,
          tipRise: 0.06,
          lowerSweep: 0.22,
          trailingLift: 0.12,
          primaryRoll: 0.14,
          secondaryRoll: 0.08,
          covertCount: 4,
          sparkleCount: 8,
          primaryCountBoost: 1.7,
          secondaryCountBoost: 1.5,
          covertCountBoost: 1.55,
          primaryYaw: 0.2,
          secondaryYaw: 0.12,
          primarySpread: 0.54,
          secondarySpread: 0.3,
          featherWidthBias: 1.14,
          featherLengthBias: 1.06,
          veilStrength: 0.86,
          shoulderPlumeCount: 5,
          braceDensity: 0.18,
          armatureVisibility: 0.44
        }),
        mechanicalAegis: Object.freeze({
          profile: "filigree",
          armatureDepth: 0.12,
          shoulderLift: 0.04,
          midLift: 0.08,
          upperBloom: 0.04,
          tipRise: -0.02,
          lowerSweep: 0.08,
          trailingLift: 0.02,
          primaryRoll: 0.04,
          secondaryRoll: 0.02,
          covertCount: 2,
          rootScale: 1.14,
          sparkleCount: 3,
          primaryCountBoost: 1.18,
          secondaryCountBoost: 1.08,
          covertCountBoost: 1.08,
          primaryYaw: 0.04,
          secondaryYaw: 0.02,
          primarySpread: 0.12,
          secondarySpread: 0.08,
          featherWidthBias: 0.84,
          featherLengthBias: 0.96,
          veilStrength: 0.18,
          shoulderPlumeCount: 2,
          braceDensity: 0.88,
          armatureVisibility: 1
        })
      });
      PANEL_GEOMETRY_CACHE = /* @__PURE__ */ new Map();
      QUILL_GEOMETRY_CACHE = /* @__PURE__ */ new Map();
      clampNumber2 = (value, min, max) => Math.min(max, Math.max(min, value));
      lerpNumber = (start, end, alpha) => start + (end - start) * alpha;
      easeOutCubic = (alpha) => 1 - (1 - alpha) ** 3;
      ensureColor = (THREE, value, fallback) => new THREE.Color(typeof value === "string" ? value : fallback);
      enrichColor = (color, {
        mixColor = null,
        mixAmount = 0,
        saturationBoost = 0,
        lightnessShift = 0
      } = {}) => {
        const result = color.clone();
        if (mixColor && mixAmount > 0) {
          result.lerp(mixColor, clampNumber2(mixAmount, 0, 1));
        }
        const hsl = { h: 0, s: 0, l: 0 };
        result.getHSL(hsl);
        result.setHSL(
          hsl.h,
          clampNumber2(hsl.s + saturationBoost, 0, 1),
          clampNumber2(hsl.l + lightnessShift, 0, 1)
        );
        return result;
      };
      createCurve = (THREE, points) => new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.45);
      resolveStyleProfile = (recipe) => {
        const familyProfile = FAMILY_STYLE_PROFILES[recipe.structureRecipe.family] || {};
        return {
          ...BASE_STYLE_PROFILE,
          ...familyProfile
        };
      };
      getWingPanelGeometry = (THREE, profile, tipFlare) => {
        const key = `${profile}:${tipFlare.toFixed(2)}`;
        if (PANEL_GEOMETRY_CACHE.has(key)) {
          return PANEL_GEOMETRY_CACHE.get(key);
        }
        const shape = new THREE.Shape();
        const flare = clampNumber2(tipFlare, 0, 0.95);
        if (profile === "blade") {
          shape.moveTo(0, 0);
          shape.lineTo(0.34 + flare * 0.12, 0.08);
          shape.lineTo(0.3 + flare * 0.18, 0.54);
          shape.lineTo(0.08, 1);
          shape.lineTo(-0.08, 1);
          shape.lineTo(-(0.3 + flare * 0.18), 0.54);
          shape.lineTo(-(0.34 + flare * 0.12), 0.08);
          shape.lineTo(0, 0);
        } else if (profile === "ribbon") {
          shape.moveTo(0, 0);
          shape.bezierCurveTo(0.24, 0.18, 0.28 + flare * 0.06, 0.58, 0.18, 1);
          shape.quadraticCurveTo(0.02, 1.06, 0, 1.08);
          shape.quadraticCurveTo(-0.02, 1.06, -0.18, 1);
          shape.bezierCurveTo(-(0.28 + flare * 0.06), 0.58, -0.24, 0.18, 0, 0);
        } else if (profile === "crystal") {
          shape.moveTo(0, 0);
          shape.lineTo(0.2, 0.12);
          shape.lineTo(0.3 + flare * 0.06, 0.42);
          shape.lineTo(0.18, 0.82);
          shape.lineTo(0, 1);
          shape.lineTo(-0.18, 0.82);
          shape.lineTo(-(0.3 + flare * 0.06), 0.42);
          shape.lineTo(-0.2, 0.12);
          shape.lineTo(0, 0);
        } else if (profile === "filigree") {
          shape.moveTo(0, 0);
          shape.bezierCurveTo(0.22, 0.1, 0.34 + flare * 0.08, 0.3, 0.26 + flare * 0.04, 0.62);
          shape.quadraticCurveTo(0.18, 0.96, 0, 1);
          shape.quadraticCurveTo(-0.18, 0.96, -(0.26 + flare * 0.04), 0.62);
          shape.bezierCurveTo(-(0.34 + flare * 0.08), 0.3, -0.22, 0.1, 0, 0);
        } else {
          shape.moveTo(0, 0);
          shape.bezierCurveTo(0.28, 0.1, 0.42 + flare * 0.12, 0.34, 0.36 + flare * 0.08, 0.74);
          shape.quadraticCurveTo(0.16, 1.02, 0, 1);
          shape.quadraticCurveTo(-0.16, 1.02, -(0.36 + flare * 0.08), 0.74);
          shape.bezierCurveTo(-(0.42 + flare * 0.12), 0.34, -0.28, 0.1, 0, 0);
        }
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: 0.08,
          steps: 1,
          bevelEnabled: true,
          bevelSegments: 1,
          bevelThickness: 0.01,
          bevelSize: 0.01,
          curveSegments: 18
        });
        geometry.translate(0, 0, -0.04);
        geometry.computeVertexNormals();
        PANEL_GEOMETRY_CACHE.set(key, geometry);
        return geometry;
      };
      getQuillGeometry = (THREE) => {
        const key = "quill";
        if (QUILL_GEOMETRY_CACHE.has(key)) {
          return QUILL_GEOMETRY_CACHE.get(key);
        }
        const geometry = new THREE.CylinderGeometry(0.022, 0.014, 1, 8, 1, false);
        QUILL_GEOMETRY_CACHE.set(key, geometry);
        return geometry;
      };
      createMaterialSet = (THREE, recipe) => {
        const palette = recipe.palette;
        const materialFamily = MATERIAL_FAMILY_CONFIGS[recipe.materialFamily] || MATERIAL_FAMILY_CONFIGS.royalEnamel;
        const glowIntensity = RARITY_GLOW_INTENSITY[recipe.rarityProfile] || RARITY_GLOW_INTENSITY.rare;
        const iridescence = RARITY_IRIDESCENCE[recipe.rarityProfile] || RARITY_IRIDESCENCE.rare;
        const emissiveColor = ensureColor(THREE, palette.glow, "#8ed9ff");
        const primaryColor = enrichColor(ensureColor(THREE, palette.primary, "#cfe6ff"), {
          mixColor: emissiveColor,
          mixAmount: 0.08,
          saturationBoost: 0.1,
          lightnessShift: recipe.rarityProfile === "common" ? 0.02 : 0.04
        });
        const secondaryColor = enrichColor(ensureColor(THREE, palette.secondary, "#7ab8ff"), {
          mixColor: emissiveColor,
          mixAmount: 0.12,
          saturationBoost: 0.12,
          lightnessShift: 0.02
        });
        const accentColor = enrichColor(ensureColor(THREE, palette.accent, "#ffffff"), {
          mixColor: emissiveColor,
          mixAmount: 0.06,
          saturationBoost: 0.04,
          lightnessShift: 0.02
        });
        const metalColor = enrichColor(ensureColor(THREE, palette.metal, "#d5dceb"), {
          mixColor: accentColor,
          mixAmount: 0.12,
          saturationBoost: 0.04,
          lightnessShift: 0.01
        });
        const shadowColor = ensureColor(THREE, palette.shadow, "#1b2232");
        const surfaceEmissive = enrichColor(primaryColor, {
          mixColor: emissiveColor,
          mixAmount: 0.34,
          saturationBoost: 0.04
        });
        const accentEmissive = enrichColor(secondaryColor, {
          mixColor: emissiveColor,
          mixAmount: 0.4,
          saturationBoost: 0.04
        });
        const highlightColor = enrichColor(accentColor, {
          mixColor: emissiveColor,
          mixAmount: 0.42,
          saturationBoost: 0.08,
          lightnessShift: 0.03
        });
        const surfaceTransmission = clampNumber2(materialFamily.transmission * 0.22, 0, 0.08);
        const vaneMaterial = new THREE.MeshPhysicalMaterial({
          color: primaryColor,
          emissive: surfaceEmissive,
          emissiveIntensity: glowIntensity * 0.1,
          roughness: clampNumber2(materialFamily.roughness - 0.06, 0.08, 0.58),
          metalness: clampNumber2(materialFamily.metalness * 0.82, 0.04, 0.72),
          clearcoat: clampNumber2(materialFamily.clearcoat + 0.08, 0.3, 1),
          clearcoatRoughness: 0.12,
          transmission: 0,
          thickness: 0.04,
          sheen: clampNumber2(materialFamily.sheen + 0.14, 0.08, 0.84),
          sheenColor: accentColor,
          reflectivity: 0.7,
          iridescence: clampNumber2(iridescence * 0.72, 0.04, 0.58),
          iridescenceIOR: 1.24,
          specularIntensity: 0.84,
          attenuationColor: secondaryColor,
          attenuationDistance: 1.2,
          transparent: false,
          opacity: 1,
          depthWrite: true,
          dithering: true,
          side: THREE.DoubleSide
        });
        const accentMaterial = new THREE.MeshPhysicalMaterial({
          color: secondaryColor,
          emissive: accentEmissive,
          emissiveIntensity: glowIntensity * 0.08,
          roughness: clampNumber2(materialFamily.roughness - 0.08, 0.04, 0.62),
          metalness: clampNumber2(materialFamily.metalness + 0.14, 0.08, 0.98),
          clearcoat: clampNumber2(materialFamily.clearcoat + 0.18, 0.18, 1),
          clearcoatRoughness: 0.1,
          iridescence: clampNumber2(iridescence + 0.14, 0.16, 1),
          iridescenceIOR: 1.3,
          specularIntensity: 0.88,
          transparent: false,
          opacity: 1,
          depthWrite: true,
          dithering: true,
          side: THREE.DoubleSide
        });
        const spineMaterial = new THREE.MeshPhysicalMaterial({
          color: metalColor,
          emissive: shadowColor,
          emissiveIntensity: glowIntensity * 0.05,
          roughness: clampNumber2(materialFamily.roughness - 0.14, 0.04, 0.54),
          metalness: clampNumber2(materialFamily.metalness + 0.28, 0.2, 1),
          clearcoat: clampNumber2(materialFamily.clearcoat + 0.1, 0.28, 1),
          clearcoatRoughness: 0.1,
          specularIntensity: 0.72,
          transparent: false,
          opacity: 1,
          depthWrite: true
        });
        const boneMaterial = new THREE.MeshPhysicalMaterial({
          color: enrichColor(metalColor, {
            mixColor: shadowColor,
            mixAmount: 0.18,
            lightnessShift: -0.04
          }),
          emissive: shadowColor,
          emissiveIntensity: glowIntensity * 0.03,
          roughness: clampNumber2(materialFamily.roughness + 0.14, 0.18, 0.76),
          metalness: clampNumber2(materialFamily.metalness + 0.04, 0.12, 0.78),
          clearcoat: clampNumber2(materialFamily.clearcoat * 0.72, 0.12, 0.74),
          clearcoatRoughness: 0.22,
          specularIntensity: 0.34,
          transparent: false,
          opacity: 1,
          depthWrite: true
        });
        const ornamentMaterial = new THREE.MeshPhysicalMaterial({
          color: accentColor,
          emissive: highlightColor,
          emissiveIntensity: glowIntensity * 0.26,
          roughness: 0.12,
          metalness: 0.34,
          clearcoat: 0.94,
          clearcoatRoughness: 0.08,
          iridescence: clampNumber2(iridescence + 0.1, 0.18, 1),
          iridescenceIOR: 1.28,
          specularIntensity: 0.92,
          transparent: false,
          opacity: 1,
          depthWrite: true
        });
        const membraneMaterial = new THREE.MeshPhysicalMaterial({
          color: enrichColor(primaryColor, {
            mixColor: secondaryColor,
            mixAmount: 0.18,
            saturationBoost: 0.06,
            lightnessShift: 0.02
          }),
          emissive: surfaceEmissive,
          emissiveIntensity: glowIntensity * 0.05,
          roughness: clampNumber2(materialFamily.roughness + 0.08, 0.12, 0.8),
          metalness: clampNumber2(materialFamily.metalness - 0.08, 0, 0.54),
          clearcoat: clampNumber2(materialFamily.clearcoat * 0.66, 0.08, 0.72),
          clearcoatRoughness: 0.18,
          transmission: surfaceTransmission,
          thickness: 0.06,
          attenuationColor: highlightColor,
          attenuationDistance: 1.05,
          transparent: true,
          opacity: clampNumber2(0.32 + glowIntensity * 0.06, 0.32, 0.42),
          side: THREE.DoubleSide,
          depthWrite: false,
          dithering: true
        });
        const veilMaterial = new THREE.MeshBasicMaterial({
          color: highlightColor,
          transparent: true,
          opacity: clampNumber2(0.12 + glowIntensity * 0.04, 0.12, 0.18),
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });
        const highlightMaterial = new THREE.MeshBasicMaterial({
          color: enrichColor(highlightColor, {
            mixColor: accentColor,
            mixAmount: 0.22,
            lightnessShift: 0.04
          }),
          transparent: true,
          opacity: clampNumber2(0.14 + glowIntensity * 0.06, 0.14, 0.24),
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: emissiveColor,
          transparent: true,
          opacity: clampNumber2(0.22 + glowIntensity * 0.28, 0.18, 0.72),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide
        });
        return {
          vaneMaterial,
          accentMaterial,
          spineMaterial,
          boneMaterial,
          ornamentMaterial,
          membraneMaterial,
          veilMaterial,
          highlightMaterial,
          glowMaterial
        };
      };
      createGuideCurves = (THREE, recipe, directionSign) => {
        const structureRecipe = recipe.structureRecipe;
        const style = resolveStyleProfile(recipe);
        const span = structureRecipe.span;
        const height = structureRecipe.height;
        const lift = structureRecipe.innerLift;
        const sweep = structureRecipe.outerSweep;
        const depth = clampNumber2((0.1 + span * 0.04) * (0.72 + style.armatureDepth), 0.12, 0.42);
        const root = new THREE.Vector3(0, 0, 0);
        const shoulder = new THREE.Vector3(
          directionSign * span * 0.12,
          height * (0.03 + style.shoulderLift * 0.1),
          depth * 0.44
        );
        const elbow = new THREE.Vector3(
          directionSign * span * clampNumber2(0.36 + sweep * 0.08, 0.28, 0.46),
          height * clampNumber2(0.26 + lift * 0.08 + style.midLift * 0.08, 0.22, 0.48),
          depth * 0.52
        );
        const wrist = new THREE.Vector3(
          directionSign * span * clampNumber2(0.78 + sweep * 0.08, 0.66, 0.94),
          height * clampNumber2(0.5 + style.upperBloom * 0.12, 0.42, 0.72),
          depth * 0.26
        );
        const tip = new THREE.Vector3(
          directionSign * span * 1.08,
          height * clampNumber2(0.42 + style.tipRise * 0.14, 0.32, 0.62),
          depth * 0.08
        );
        const supportRoot = new THREE.Vector3(directionSign * span * 0.06, -height * 0.08, -depth * 0.08);
        const supportMid = new THREE.Vector3(
          directionSign * span * 0.28,
          height * clampNumber2(0.12 + style.lowerSweep * 0.1, 0.08, 0.28),
          -depth * 0.05
        );
        const supportOuter = new THREE.Vector3(
          directionSign * span * 0.58,
          height * clampNumber2(0.18 + style.lowerSweep * 0.08, 0.14, 0.32),
          -depth * 0.02
        );
        const supportTip = new THREE.Vector3(
          directionSign * span * 0.86,
          height * clampNumber2(0.04 + style.trailingLift * 0.12, -0.02, 0.2),
          depth * 0.02
        );
        const primaryTipStart = new THREE.Vector3(
          directionSign * span * 0.3,
          height * clampNumber2(0.22 + style.upperBloom * 0.05, 0.16, 0.36),
          depth * 0.2
        );
        const primaryTipMid = new THREE.Vector3(
          directionSign * span * 0.66,
          height * clampNumber2(0.48 + style.upperBloom * 0.08, 0.4, 0.64),
          depth * 0.14
        );
        const primaryTipHigh = new THREE.Vector3(
          directionSign * span * 1.06,
          height * clampNumber2(0.42 + style.tipRise * 0.1, 0.32, 0.56),
          depth * 0.06
        );
        const primaryTipLow = new THREE.Vector3(
          directionSign * span * 1.02,
          height * clampNumber2(0.08 + style.lowerSweep * 0.06, 0.02, 0.2),
          -depth * 0.02
        );
        const secondaryTipStart = new THREE.Vector3(
          directionSign * span * 0.18,
          height * clampNumber2(0.08 + style.shoulderLift * 0.06, 0.06, 0.16),
          0
        );
        const secondaryTipMid = new THREE.Vector3(
          directionSign * span * 0.48,
          height * clampNumber2(0.18 + style.midLift * 0.06, 0.14, 0.28),
          -depth * 0.02
        );
        const secondaryTipOuter = new THREE.Vector3(
          directionSign * span * 0.72,
          height * clampNumber2(-0.02 + style.trailingLift * 0.06, -0.1, 0.08),
          -depth * 0.06
        );
        const secondaryTipLow = new THREE.Vector3(
          directionSign * span * 0.48,
          -height * clampNumber2(0.08 + style.lowerSweep * 0.1, 0.06, 0.18),
          -depth * 0.1
        );
        const covertTipStart = new THREE.Vector3(directionSign * span * 0.1, height * 0.04, depth * 0.04);
        const covertTipMid = new THREE.Vector3(directionSign * span * 0.24, height * 0.16, depth * 0.06);
        const covertTipEnd = new THREE.Vector3(directionSign * span * 0.34, height * 0.1, -depth * 0.01);
        return {
          style,
          depth,
          mainCurve: createCurve(THREE, [root, shoulder, elbow, wrist, tip]),
          supportCurve: createCurve(THREE, [supportRoot, supportMid, supportOuter, supportTip]),
          primaryTipCurve: createCurve(THREE, [primaryTipStart, primaryTipMid, primaryTipHigh, primaryTipLow]),
          secondaryTipCurve: createCurve(THREE, [secondaryTipStart, secondaryTipMid, secondaryTipOuter, secondaryTipLow]),
          covertTipCurve: createCurve(THREE, [covertTipStart, covertTipMid, covertTipEnd]),
          landmarks: {
            root,
            shoulder,
            elbow,
            wrist,
            tip,
            lowerTip: secondaryTipLow,
            supportTip
          }
        };
      };
      sampleCurveRange = (curve, start, end, count) => {
        const samples = [];
        const safeCount = Math.max(2, count);
        for (let index = 0; index < safeCount; index += 1) {
          const alpha = index / (safeCount - 1);
          const t = lerpNumber(start, end, alpha);
          samples.push(curve.getPoint(t));
        }
        return samples;
      };
      createRibbonSurfaceGeometry = (THREE, upperPoints, lowerPoints) => {
        const count = Math.min(upperPoints.length, lowerPoints.length);
        if (count < 2) {
          return null;
        }
        const positions = [];
        const uvs = [];
        const indices = [];
        for (let index = 0; index < count; index += 1) {
          const upper = upperPoints[index];
          const lower = lowerPoints[index];
          const u = index / (count - 1);
          positions.push(upper.x, upper.y, upper.z);
          positions.push(lower.x, lower.y, lower.z);
          uvs.push(u, 1, u, 0);
        }
        for (let index = 0; index < count - 1; index += 1) {
          const base = index * 2;
          indices.push(base, base + 1, base + 2);
          indices.push(base + 1, base + 3, base + 2);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        return geometry;
      };
      createFeatherMesh = (THREE, materials, {
        profile,
        length,
        width,
        thickness,
        tipFlare,
        accent = false,
        glowScale = 0
      }) => {
        const feather = new THREE.Group();
        const panel = new THREE.Mesh(
          getWingPanelGeometry(THREE, profile, tipFlare),
          accent ? materials.accentMaterial : materials.vaneMaterial
        );
        panel.scale.set(width, length, thickness);
        panel.position.y = length * 0.48;
        feather.add(panel);
        const quill = new THREE.Mesh(getQuillGeometry(THREE), materials.spineMaterial);
        quill.scale.set(Math.max(0.32, width * 0.12), length, Math.max(0.36, thickness * 0.58));
        quill.position.y = length * 0.5;
        feather.add(quill);
        const vaneCrest = new THREE.Mesh(
          new THREE.PlaneGeometry(width * 0.58, length * 0.46),
          materials.highlightMaterial
        );
        vaneCrest.position.set(0, length * 0.6, Math.max(0.03, thickness * 0.18));
        feather.add(vaneCrest);
        if (glowScale > 0) {
          const glow = new THREE.Mesh(
            new THREE.PlaneGeometry(width * glowScale, length * Math.max(0.4, glowScale * 0.66)),
            materials.glowMaterial
          );
          glow.position.y = length * 0.5;
          glow.position.z = -Math.max(0.02, thickness * 0.08);
          feather.add(glow);
        }
        return feather;
      };
      orientAlongVector = (THREE, object, direction, roll, pitch) => {
        const axis = new THREE.Vector3(0, 1, 0);
        const vector = direction.clone();
        if (vector.lengthSq() < 1e-4) {
          return;
        }
        vector.normalize();
        object.quaternion.setFromUnitVectors(axis, vector);
        object.rotateOnAxis(new THREE.Vector3(0, 1, 0), roll);
        object.rotateOnAxis(new THREE.Vector3(1, 0, 0), pitch);
      };
      addFeatherAxisYaw = (THREE, object, yaw) => {
        if (!yaw) {
          return;
        }
        object.rotateOnAxis(new THREE.Vector3(0, 0, 1), yaw);
      };
      createFeatherLayer = (THREE, wing, recipe, materials, curveInfo, {
        count,
        anchorRange,
        tipRange,
        tipCurve,
        baseLengthScale,
        baseWidthScale,
        rollBase,
        pitchBase,
        accentEvery = 3,
        depthBias = 0.02,
        profile,
        glowBias = 0,
        yawBase = 0,
        fanSpread = 0,
        widthBias = 1,
        lengthBias = 1
      }) => {
        for (let index = 0; index < count; index += 1) {
          const alpha = count <= 1 ? 0.5 : index / (count - 1);
          const eased = easeOutCubic(alpha);
          const anchorT = lerpNumber(anchorRange[0], anchorRange[1], alpha);
          const tipT = lerpNumber(tipRange[0], tipRange[1], eased);
          const anchor = curveInfo.mainCurve.getPoint(anchorT);
          const tip = tipCurve.getPoint(tipT);
          anchor.z += depthBias * (index % 2 === 0 ? 1 : -0.45);
          tip.z += depthBias * 0.2;
          const direction = tip.clone().sub(anchor);
          const length = clampNumber2(direction.length() * baseLengthScale * lengthBias * (1.06 - alpha * 0.08), 0.48, 2.8);
          const width = clampNumber2(recipe.structureRecipe.featherWidth * baseWidthScale * widthBias * (1.14 - alpha * 0.16), 0.14, 0.92);
          const thickness = clampNumber2(0.2 + recipe.structureRecipe.tipFlare * 0.2 + alpha * 0.04, 0.14, 0.42);
          const feather = createFeatherMesh(THREE, materials, {
            profile,
            length,
            width,
            thickness,
            tipFlare: recipe.structureRecipe.tipFlare,
            accent: index % accentEvery === 0,
            glowScale: glowBias > 0 ? glowBias * (0.92 - alpha * 0.16) : 0
          });
          feather.position.copy(anchor);
          orientAlongVector(
            THREE,
            feather,
            direction,
            rollBase * (0.88 + alpha * 0.52) + fanSpread * (alpha - 0.2),
            pitchBase * (0.78 + alpha * 0.24)
          );
          addFeatherAxisYaw(THREE, feather, yawBase * (0.8 + alpha * 0.4));
          wing.add(feather);
        }
      };
      addShoulderPlumage = (THREE, wing, recipe, materials, curveInfo, directionSign) => {
        const plumeCount = Math.max(2, Math.round(curveInfo.style.shoulderPlumeCount));
        for (let index = 0; index < plumeCount; index += 1) {
          const alpha = plumeCount <= 1 ? 0.5 : index / (plumeCount - 1);
          const anchor = curveInfo.mainCurve.getPoint(lerpNumber(0.04, 0.18, alpha));
          const target = curveInfo.primaryTipCurve.getPoint(lerpNumber(0.12, 0.28, alpha));
          anchor.z += 0.05 - alpha * 0.02;
          target.z += 0.06 - alpha * 0.03;
          target.y += 0.08 + alpha * 0.05;
          const direction = target.clone().sub(anchor);
          const length = clampNumber2(direction.length() * 0.92, 0.52, 1.36);
          const width = clampNumber2(recipe.structureRecipe.featherWidth * (1.36 - alpha * 0.08) * curveInfo.style.featherWidthBias, 0.18, 0.76);
          const feather = createFeatherMesh(THREE, materials, {
            profile: curveInfo.style.profile === "blade" ? "filigree" : curveInfo.style.profile,
            length,
            width,
            thickness: 0.24,
            tipFlare: clampNumber2(recipe.structureRecipe.tipFlare + 0.08, 0, 0.95),
            accent: index === 0 || index === plumeCount - 1,
            glowScale: recipe.rarityProfile.startsWith("legendary") ? 0.22 : 0
          });
          feather.position.copy(anchor);
          orientAlongVector(
            THREE,
            feather,
            direction,
            directionSign * (curveInfo.style.primarySpread * (0.65 - alpha * 0.08)),
            -0.06 + alpha * 0.04
          );
          addFeatherAxisYaw(THREE, feather, directionSign * curveInfo.style.primaryYaw * 0.88);
          wing.add(feather);
        }
      };
      addShoulderAssembly = (THREE, wing, materials, curveInfo, directionSign) => {
        const socket = new THREE.Group();
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.16 * curveInfo.style.rootScale, 20, 18),
          materials.spineMaterial
        );
        bulb.scale.set(1.28, 1.06, 0.88);
        socket.add(bulb);
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.19 * curveInfo.style.rootScale, 0.02, 10, 36, Math.PI * 1.18),
          materials.accentMaterial
        );
        ring.rotation.set(0.18, directionSign * 0.42, directionSign * 0.84);
        ring.position.set(directionSign * 0.02, 0.04, 0.04);
        socket.add(ring);
        const gem = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.08 * curveInfo.style.rootScale, 0),
          materials.ornamentMaterial
        );
        gem.position.set(directionSign * 0.04, 0.06, 0.08);
        socket.add(gem);
        wing.add(socket);
      };
      addSupportBones = (THREE, wing, recipe, materials, curveInfo) => {
        const visibility = clampNumber2(curveInfo.style.armatureVisibility || 0.7, 0.24, 1);
        const primaryRadius = clampNumber2((0.018 + recipe.structureRecipe.primaryLayerCount * 12e-4) * visibility, 0.012, 0.034);
        const supportRadius = clampNumber2(primaryRadius * 0.58, 8e-3, 0.022);
        const mainSpine = new THREE.Mesh(
          new THREE.TubeGeometry(curveInfo.mainCurve, 40, primaryRadius, 10, false),
          materials.boneMaterial
        );
        wing.add(mainSpine);
        const supportSpine = new THREE.Mesh(
          new THREE.TubeGeometry(curveInfo.supportCurve, 28, supportRadius, 8, false),
          materials.boneMaterial
        );
        supportSpine.position.z -= 0.01;
        wing.add(supportSpine);
        const braceCount = clampNumber2(Math.round((recipe.structureRecipe.crestCount + 1) * curveInfo.style.braceDensity), 0, 4);
        for (let index = 0; index < braceCount; index += 1) {
          const alpha = braceCount <= 1 ? 0.5 : index / (braceCount - 1);
          const armPoint = curveInfo.mainCurve.getPoint(lerpNumber(0.18, 0.8, alpha));
          const supportPoint = curveInfo.supportCurve.getPoint(lerpNumber(0.1, 0.92, alpha));
          const braceDirection = supportPoint.clone().sub(armPoint);
          const brace = new THREE.Mesh(
            new THREE.CylinderGeometry(6e-3, 4e-3, Math.max(0.1, braceDirection.length()), 6),
            materials.boneMaterial
          );
          brace.position.copy(armPoint.clone().add(supportPoint).multiplyScalar(0.5));
          orientAlongVector(THREE, brace, braceDirection, 0, 0);
          wing.add(brace);
        }
      };
      addSilhouetteVeils = (THREE, wing, recipe, materials, curveInfo) => {
        const veilStrength = clampNumber2(curveInfo.style.veilStrength || 0, 0, 1);
        if (veilStrength <= 0.05) {
          return;
        }
        const outerUpper = sampleCurveRange(curveInfo.primaryTipCurve, 0.08, 0.98, 12).map((point, index, points) => {
          const alpha = index / Math.max(1, points.length - 1);
          return point.clone().add(new THREE.Vector3(0, 0.03 + (1 - alpha) * 0.04, 0.06 - alpha * 0.05));
        });
        const outerLower = sampleCurveRange(curveInfo.mainCurve, 0.18, 0.98, 12).map((point, index, points) => {
          const alpha = index / Math.max(1, points.length - 1);
          return point.clone().add(new THREE.Vector3(0, -0.05 + alpha * 0.04, -0.02 - alpha * 0.03));
        });
        const outerVeilGeometry = createRibbonSurfaceGeometry(THREE, outerUpper, outerLower);
        if (outerVeilGeometry) {
          const outerVeilMaterial = materials.veilMaterial.clone();
          outerVeilMaterial.opacity = clampNumber2(materials.veilMaterial.opacity * (0.82 + veilStrength * 0.22), 0.12, 0.24);
          const outerVeil = new THREE.Mesh(outerVeilGeometry, outerVeilMaterial);
          outerVeil.position.z -= 0.02;
          wing.add(outerVeil);
        }
        const innerUpper = sampleCurveRange(curveInfo.mainCurve, 0.08, 0.7, 10).map((point, index, points) => {
          const alpha = index / Math.max(1, points.length - 1);
          return point.clone().add(new THREE.Vector3(0, 0.02 + (1 - alpha) * 0.03, 0.03));
        });
        const innerLower = sampleCurveRange(curveInfo.secondaryTipCurve, 0.08, 0.94, 10).map((point, index, points) => {
          const alpha = index / Math.max(1, points.length - 1);
          return point.clone().add(new THREE.Vector3(0, -0.03 - alpha * 0.05, -0.05 - alpha * 0.02));
        });
        const innerVeilGeometry = createRibbonSurfaceGeometry(THREE, innerUpper, innerLower);
        if (innerVeilGeometry) {
          const innerVeilMaterial = materials.veilMaterial.clone();
          innerVeilMaterial.opacity = clampNumber2(materials.veilMaterial.opacity * (0.7 + veilStrength * 0.2), 0.1, 0.2);
          const innerVeil = new THREE.Mesh(innerVeilGeometry, innerVeilMaterial);
          innerVeil.position.z -= 0.04;
          wing.add(innerVeil);
        }
      };
      addMembraneSurface = (THREE, wing, recipe, materials, curveInfo) => {
        if (!recipe.structureRecipe.membrane) {
          return;
        }
        const upper = sampleCurveRange(curveInfo.mainCurve, 0.16, 0.84, 8).map((point, index, points) => {
          const alpha = index / Math.max(1, points.length - 1);
          return point.clone().add(new THREE.Vector3(0, 0, lerpNumber(0.02, -0.01, alpha)));
        });
        const lower = sampleCurveRange(curveInfo.supportCurve, 0.08, 0.98, 8).map((point, index, points) => {
          const alpha = index / Math.max(1, points.length - 1);
          return point.clone().add(new THREE.Vector3(0, 0, lerpNumber(-0.05, -0.02, alpha)));
        });
        const membraneGeometry = createRibbonSurfaceGeometry(THREE, upper, lower);
        if (!membraneGeometry) {
          return;
        }
        const membrane = new THREE.Mesh(membraneGeometry, materials.membraneMaterial);
        wing.add(membrane);
      };
      addSparkleInstances = (THREE, wing, materials, anchors, count, baseScale) => {
        if (count <= 0 || anchors.length === 0) {
          return;
        }
        const sparkleGeometry = new THREE.IcosahedronGeometry(0.04, 0);
        const sparkleMesh = new THREE.InstancedMesh(sparkleGeometry, materials.ornamentMaterial, count);
        const pivot = new THREE.Object3D();
        for (let index = 0; index < count; index += 1) {
          const anchor = anchors[index % anchors.length];
          pivot.position.copy(anchor);
          pivot.rotation.set(index * 0.32, index * 0.26, index * 0.18);
          const scale = baseScale * (0.84 + index % 3 * 0.18);
          pivot.scale.setScalar(scale);
          pivot.updateMatrix();
          sparkleMesh.setMatrixAt(index, pivot.matrix);
        }
        sparkleMesh.instanceMatrix.needsUpdate = true;
        wing.add(sparkleMesh);
      };
      addOrnaments = (THREE, wing, recipe, materials, curveInfo, directionSign) => {
        const ornament = recipe.ornamentRecipe;
        const { landmarks } = curveInfo;
        for (let index = 0; index < ornament.haloBands; index += 1) {
          const radius = 0.2 + index * 0.06;
          const band = new THREE.Mesh(
            new THREE.TorusGeometry(radius, 0.012, 10, 40, Math.PI * 0.92),
            materials.glowMaterial
          );
          band.position.set(
            landmarks.elbow.x + directionSign * (0.04 + index * 0.08),
            landmarks.elbow.y + 0.18 + index * 0.12,
            0.12 + index * 0.02
          );
          band.rotation.z = directionSign * (0.56 + index * 0.08);
          wing.add(band);
        }
        for (let index = 0; index < ornament.crownSpurs; index += 1) {
          const spur = new THREE.Mesh(
            new THREE.ConeGeometry(0.028 + index * 4e-3, 0.18 + index * 0.03, 6),
            materials.spineMaterial
          );
          spur.position.set(
            landmarks.shoulder.x + directionSign * (0.02 + index * 0.06),
            landmarks.shoulder.y + 0.12 + index * 0.06,
            0.08
          );
          spur.rotation.z = directionSign * (-0.46 - index * 0.08);
          wing.add(spur);
        }
        for (let index = 0; index < ornament.crystalClusters; index += 1) {
          const crystal = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.06 + index * 0.014, 0),
            index % 2 === 0 ? materials.ornamentMaterial : materials.accentMaterial
          );
          crystal.position.set(
            landmarks.wrist.x - directionSign * (0.08 + index * 0.06),
            landmarks.wrist.y - 0.04 + index * 0.04,
            0.08 + index * 0.02
          );
          crystal.rotation.set(index * 0.24, directionSign * 0.44, 0.2 + index * 0.1);
          wing.add(crystal);
        }
        for (let index = 0; index < ornament.runeSigils; index += 1) {
          const sigil = new THREE.Mesh(
            new THREE.TorusGeometry(0.06 + index * 0.014, 8e-3, 10, 28),
            materials.glowMaterial
          );
          sigil.position.set(
            landmarks.tip.x - directionSign * (0.08 + index * 0.07),
            landmarks.tip.y - 0.06 - index * 0.05,
            0.04
          );
          sigil.rotation.y = directionSign * 0.7;
          wing.add(sigil);
        }
        const trailStart = landmarks.lowerTip.clone();
        for (let index = 0; index < ornament.ribbonTrails; index += 1) {
          const trailCurve = createCurve(THREE, [
            trailStart.clone(),
            trailStart.clone().add(new THREE.Vector3(directionSign * (0.18 + index * 0.06), -0.16, -0.04)),
            trailStart.clone().add(new THREE.Vector3(directionSign * (0.28 + index * 0.1), -0.44, -0.08)),
            trailStart.clone().add(new THREE.Vector3(directionSign * (0.18 + index * 0.08), -0.76, -0.12))
          ]);
          const ribbon = new THREE.Mesh(
            new THREE.TubeGeometry(trailCurve, 22, 0.012 + index * 3e-3, 8, false),
            materials.glowMaterial
          );
          wing.add(ribbon);
        }
        for (let index = 0; index < ornament.emberNodes; index += 1) {
          const ember = new THREE.Mesh(
            new THREE.SphereGeometry(0.04 + index * 0.01, 12, 10),
            materials.ornamentMaterial
          );
          ember.position.set(
            trailStart.x - directionSign * (0.08 + index * 0.08),
            trailStart.y - 0.04 - index * 0.08,
            0.06 + index * 0.02
          );
          wing.add(ember);
        }
        const sparkleAnchors = [
          landmarks.shoulder.clone().add(new THREE.Vector3(directionSign * 0.06, 0.08, 0.08)),
          landmarks.elbow.clone().add(new THREE.Vector3(directionSign * 0.08, 0.06, 0.1)),
          landmarks.wrist.clone().add(new THREE.Vector3(directionSign * 0.04, 0.02, 0.12)),
          landmarks.tip.clone().add(new THREE.Vector3(-directionSign * 0.06, -0.04, 0.08))
        ];
        addSparkleInstances(
          THREE,
          wing,
          materials,
          sparkleAnchors,
          Math.min(curveInfo.style.sparkleCount + ornament.crystalClusters + ornament.runeSigils, 12),
          0.54
        );
      };
      createWingSide = (THREE, recipe, side, materials) => {
        const directionSign = side === "left" ? -1 : 1;
        const wing = new THREE.Group();
        const curveInfo = createGuideCurves(THREE, recipe, directionSign);
        const structureRecipe = recipe.structureRecipe;
        const rarityGlow = RARITY_GLOW_INTENSITY[recipe.rarityProfile] || RARITY_GLOW_INTENSITY.rare;
        addShoulderAssembly(THREE, wing, materials, curveInfo, directionSign);
        addSupportBones(THREE, wing, recipe, materials, curveInfo);
        addShoulderPlumage(THREE, wing, recipe, materials, curveInfo, directionSign);
        addMembraneSurface(THREE, wing, recipe, materials, curveInfo);
        addSilhouetteVeils(THREE, wing, recipe, materials, curveInfo);
        const primaryCount = clampNumber2(
          Math.round(structureRecipe.primaryLayerCount * curveInfo.style.primaryCountBoost),
          structureRecipe.primaryLayerCount + 1,
          18
        );
        createFeatherLayer(THREE, wing, recipe, materials, curveInfo, {
          count: primaryCount,
          anchorRange: [0.26, 0.98],
          tipRange: [0.06, 0.98],
          tipCurve: curveInfo.primaryTipCurve,
          baseLengthScale: 1.14,
          baseWidthScale: 1.82,
          rollBase: directionSign * (curveInfo.style.primaryRoll + 0.22),
          pitchBase: -0.04,
          accentEvery: 3,
          depthBias: 0.02,
          profile: curveInfo.style.profile,
          glowBias: recipe.rarityProfile.startsWith("legendary") ? 0.42 : rarityGlow * 0.18,
          yawBase: directionSign * curveInfo.style.primaryYaw,
          fanSpread: directionSign * curveInfo.style.primarySpread,
          widthBias: curveInfo.style.featherWidthBias,
          lengthBias: curveInfo.style.featherLengthBias
        });
        if (structureRecipe.secondaryLayerCount > 0) {
          const secondaryCount = clampNumber2(
            Math.round(structureRecipe.secondaryLayerCount * curveInfo.style.secondaryCountBoost),
            structureRecipe.secondaryLayerCount,
            14
          );
          createFeatherLayer(THREE, wing, recipe, materials, curveInfo, {
            count: secondaryCount,
            anchorRange: [0.08, 0.72],
            tipRange: [0.04, 0.98],
            tipCurve: curveInfo.secondaryTipCurve,
            baseLengthScale: 0.98,
            baseWidthScale: 1.2,
            rollBase: directionSign * (curveInfo.style.secondaryRoll + 0.12),
            pitchBase: 0.04,
            accentEvery: 2,
            depthBias: -0.018,
            profile: curveInfo.style.profile === "blade" ? "filigree" : curveInfo.style.profile,
            glowBias: recipe.rarityProfile.startsWith("legendary") ? 0.24 : 0,
            yawBase: directionSign * curveInfo.style.secondaryYaw,
            fanSpread: directionSign * curveInfo.style.secondarySpread,
            widthBias: curveInfo.style.featherWidthBias * 0.96,
            lengthBias: curveInfo.style.featherLengthBias * 0.94
          });
        }
        createFeatherLayer(THREE, wing, recipe, materials, curveInfo, {
          count: clampNumber2(Math.round(curveInfo.style.covertCount * curveInfo.style.covertCountBoost), curveInfo.style.covertCount, 8),
          anchorRange: [0.08, 0.3],
          tipRange: [0.1, 0.94],
          tipCurve: curveInfo.covertTipCurve,
          baseLengthScale: 0.68,
          baseWidthScale: 1.04,
          rollBase: directionSign * (curveInfo.style.secondaryRoll * 0.56 + 0.08),
          pitchBase: 0.08,
          accentEvery: 10,
          depthBias: 0.01,
          profile: "filigree",
          yawBase: directionSign * curveInfo.style.secondaryYaw * 0.7,
          fanSpread: directionSign * curveInfo.style.secondarySpread * 0.56,
          widthBias: curveInfo.style.featherWidthBias * 0.9,
          lengthBias: curveInfo.style.featherLengthBias * 0.82
        });
        addOrnaments(THREE, wing, recipe, materials, curveInfo, directionSign);
        wing.userData.generatedWingSide = side;
        wing.userData.generatedRecipe = recipe;
        wing.userData.generatedGuideCurves = curveInfo;
        return wing;
      };
      applyAttachmentToWingSide = (wing, attachment, side) => {
        var _a;
        const directionSign = side === "left" ? -1 : 1;
        const position = Array.isArray(attachment == null ? void 0 : attachment.position) ? attachment.position : [0.72, -0.24, 0.08];
        const rotation = Array.isArray(attachment == null ? void 0 : attachment.rotation) ? attachment.rotation : [0.016, 0.052, -0.018];
        const scale = Array.isArray(attachment == null ? void 0 : attachment.scale) ? attachment.scale : [1.92, 1.92, 1.92];
        const initialRotationY = Number((_a = attachment == null ? void 0 : attachment.fit) == null ? void 0 : _a.initialRotationY) || 0;
        wing.position.set(
          directionSign * Math.abs(Number(position[0]) || 0.72),
          Number(position[1]) || -0.24,
          Number(position[2]) || 0.08
        );
        wing.rotation.set(
          Number(rotation[0]) || 0,
          directionSign * (Math.abs(Number(rotation[1]) || 0) + initialRotationY),
          directionSign * Math.abs(Number(rotation[2]) || 0)
        );
        wing.scale.set(
          Math.abs(Number(scale[0]) || 1.92),
          Math.abs(Number(scale[1]) || 1.92),
          Math.abs(Number(scale[2]) || 1.92)
        );
      };
      buildGeneratedWingAssembly = (THREE, recipe, {
        wingParents = null,
        attachment = null
      } = {}) => {
        const normalizedRecipe = normalizeGeneratedWingRecipe(recipe);
        if (!normalizedRecipe) {
          return new THREE.Group();
        }
        const resolvedAttachment = cloneGeneratorAttachment(
          attachment || normalizedRecipe.fitAttachment || FIT_TEMPLATE_PROFILES["xio-wing-master"].attachment
        );
        const materials = createMaterialSet(THREE, normalizedRecipe);
        const group = new THREE.Group();
        const left = createWingSide(THREE, normalizedRecipe, "left", materials);
        const right = createWingSide(THREE, normalizedRecipe, "right", materials);
        if ((wingParents == null ? void 0 : wingParents.left) && (wingParents == null ? void 0 : wingParents.right)) {
          applyAttachmentToWingSide(left, resolvedAttachment, "left");
          applyAttachmentToWingSide(right, resolvedAttachment, "right");
          left.visible = false;
          right.visible = false;
          wingParents.left.add(left);
          wingParents.right.add(right);
        } else {
          left.visible = true;
          right.visible = true;
          group.add(left);
          group.add(right);
        }
        group.userData.left = left;
        group.userData.right = right;
        group.userData.generatedRecipe = normalizedRecipe;
        return group;
      };
    }
  });

  // public/HomePageAPP/src/creator/character-creator-app.js
  (async () => {
    var _a, _b;
    const [
      THREE,
      { OrbitControls },
      { TransformControls },
      { GLTFLoader },
      { SVGLoader },
      xioModule,
      catalogModule,
      gltfPropsModule,
      inventoryModule,
      propCatalogModule,
      wingPreviewModule,
      generatorConfigModule,
      generatorCoreModule,
      generatedWingRuntimeModule
    ] = await Promise.all([
      import("https://esm.sh/three@0.160.0"),
      import("https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js"),
      import("https://esm.sh/three@0.160.0/examples/jsm/controls/TransformControls.js"),
      import("https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js"),
      import("https://esm.sh/three@0.160.0/examples/jsm/loaders/SVGLoader.js"),
      Promise.resolve().then(() => (init_xio_character(), xio_character_exports)),
      Promise.resolve().then(() => (init_homepage_live_catalog(), homepage_live_catalog_exports)),
      Promise.resolve().then(() => (init_homepage_gltf_props(), homepage_gltf_props_exports)),
      Promise.resolve().then(() => (init_inventory_config(), inventory_config_exports)),
      Promise.resolve().then(() => (init_prop_catalog(), prop_catalog_exports)),
      Promise.resolve().then(() => (init_xio_live_wing_previews(), xio_live_wing_previews_exports)),
      Promise.resolve().then(() => (init_random_prop_generator_config(), random_prop_generator_config_exports)),
      Promise.resolve().then(() => (init_random_prop_generator_core(), random_prop_generator_core_exports)),
      Promise.resolve().then(() => (init_xio_generated_wing_props(), xio_generated_wing_props_exports))
    ]);
    const {
      createXioCharacter: createXioCharacter2,
      XIO_DEFAULT_SVG_DATA: XIO_DEFAULT_SVG_DATA2,
      XIO_EYE_APPEARANCE_PRESETS: XIO_EYE_APPEARANCE_PRESETS2,
      XIO_MATERIAL_PRESETS: XIO_MATERIAL_PRESETS2,
      XIO_SLOT_DEFINITIONS: XIO_SLOT_DEFINITIONS2
    } = xioModule;
    const {
      HOMEPAGE_CREATOR_READY: HOMEPAGE_CREATOR_READY2,
      HOMEPAGE_CATALOG_SYNC: HOMEPAGE_CATALOG_SYNC2,
      HOMEPAGE_PROP_UPLOAD_REQUEST: HOMEPAGE_PROP_UPLOAD_REQUEST2,
      HOMEPAGE_PROP_SAVE_REQUEST: HOMEPAGE_PROP_SAVE_REQUEST2,
      HOMEPAGE_PROP_SAVE_RESULT: HOMEPAGE_PROP_SAVE_RESULT2,
      HOMEPAGE_OPEN_MYSTERY_TEST_REQUEST: HOMEPAGE_OPEN_MYSTERY_TEST_REQUEST2,
      buildHomepageCatalogSnapshot: buildHomepageCatalogSnapshot2,
      buildHomepageMysteryTestLaunchToken: buildHomepageMysteryTestLaunchToken2,
      buildHomepageMysteryTestOverride: buildHomepageMysteryTestOverride2,
      buildHomepageMysteryTestSession: buildHomepageMysteryTestSession2,
      deriveHomepageCatalogFromLegacy: deriveHomepageCatalogFromLegacy2,
      mergeHomepageCatalogWithFallback: mergeHomepageCatalogWithFallback2,
      normalizeHomepagePropKey: normalizeHomepagePropKey2,
      persistHomepageCatalogSnapshot: persistHomepageCatalogSnapshot2,
      persistHomepageLegacyPinnedMysteryRewardKey: persistHomepageLegacyPinnedMysteryRewardKey2,
      persistHomepageMysteryTestLaunchToken: persistHomepageMysteryTestLaunchToken2,
      persistHomepageMysteryTestOverride: persistHomepageMysteryTestOverride2,
      persistHomepageMysteryTestSession: persistHomepageMysteryTestSession2,
      readHomepageCatalogSnapshot: readHomepageCatalogSnapshot2,
      readHomepageLegacyPinnedMysteryRewardKey: readHomepageLegacyPinnedMysteryRewardKey2,
      readHomepageMysteryTestOverride: readHomepageMysteryTestOverride2,
      readHomepageMysteryTestSession: readHomepageMysteryTestSession2
    } = catalogModule;
    const {
      cloneSceneGraph: cloneSceneGraph2,
      normalizeObjectToUnitSize: normalizeObjectToUnitSize2,
      centerObjectAtOrigin: centerObjectAtOrigin2,
      prepareSceneRootForSocketAttachment: prepareSceneRootForSocketAttachment2,
      buildMirroredAttachmentTransform: buildMirroredAttachmentTransform2,
      applyAttachmentTransform: applyAttachmentTransform2,
      loadGlbScene: loadGlbScene2,
      loadWingTemplateState: loadWingTemplateState2,
      DEFAULT_WING_AUTHORING_PREVIEW: DEFAULT_WING_AUTHORING_PREVIEW2,
      DEFAULT_WING_MOTION_PREVIEW: DEFAULT_WING_MOTION_PREVIEW2,
      normalizeWingAuthoringPreview: normalizeWingAuthoringPreview2,
      normalizeWingMotionPreview: normalizeWingMotionPreview2,
      resolveWingMotionProfiles: resolveWingMotionProfiles2,
      buildWingAuthoringTemplateState: buildWingAuthoringTemplateState2
    } = gltfPropsModule;
    const {
      buildLiveGameWingPreview: buildLiveGameWingPreview2,
      isLiveGameWingPreviewKey: isLiveGameWingPreviewKey2
    } = wingPreviewModule;
    const {
      GENERATOR_CATEGORY_OPTIONS: GENERATOR_CATEGORY_OPTIONS2,
      GENERATOR_RARITY_OPTIONS: GENERATOR_RARITY_OPTIONS2,
      GENERATOR_THEME_MODE_OPTIONS: GENERATOR_THEME_MODE_OPTIONS2,
      GENERATOR_DETAIL_DENSITY_OPTIONS: GENERATOR_DETAIL_DENSITY_OPTIONS2,
      GENERATOR_COLOR_HARMONY_OPTIONS: GENERATOR_COLOR_HARMONY_OPTIONS2,
      GENERATOR_FIT_MODE_OPTIONS: GENERATOR_FIT_MODE_OPTIONS2,
      GENERATOR_THEME_OPTIONS: GENERATOR_THEME_OPTIONS2,
      getWingBaseReferenceOptions: getWingBaseReferenceOptions2
    } = generatorConfigModule;
    const {
      buildGeneratorPreviewSummary: buildGeneratorPreviewSummary2,
      generateRandomWingDraft: generateRandomWingDraft2,
      isGeneratedPropPreview: isGeneratedPropPreview2
    } = generatorCoreModule;
    const {
      buildGeneratedWingPreview: buildGeneratedWingPreview2
    } = generatedWingRuntimeModule;
    const $ = (id) => document.getElementById(id);
    const creatorCanvas = $("creator-canvas");
    const stageShell = $("stage-shell");
    const dropOverlay = $("drop-overlay");
    const creatorNotice = $("creator-notice");
    const creatorNoticeEyebrow = $("creator-notice-eyebrow");
    const creatorNoticeTitle = $("creator-notice-title");
    const creatorNoticeMessage = $("creator-notice-message");
    const creatorNoticeCloseButton = $("creator-notice-close");
    const deleteConfirmEyebrow = $("delete-confirm-eyebrow");
    const deleteConfirmModal = $("delete-confirm-modal");
    const deleteConfirmTitle = $("delete-confirm-title");
    const deleteConfirmMessage = $("delete-confirm-message");
    const deleteConfirmCloseButton = $("delete-confirm-close");
    const deleteConfirmCancelButton = $("delete-confirm-cancel");
    const deleteConfirmConfirmButton = $("delete-confirm-confirm");
    const saveSuccessModal = $("save-success-modal");
    const saveSuccessEyebrow = $("save-success-eyebrow");
    const saveSuccessTitle = $("save-success-title");
    const saveSuccessMessage = $("save-success-message");
    const saveSuccessCloseButton = $("save-success-close");
    const saveSuccessStayButton = $("save-success-stay");
    const saveSuccessLaunchButton = $("save-success-launch");
    const randomPropGeneratorButton = $("random-prop-generator-button");
    const randomGeneratorModal = $("random-prop-generator-modal");
    const randomGeneratorCloseButton = $("random-generator-close");
    const randomGeneratorCancelButton = $("random-generator-cancel-button");
    const randomGeneratorGenerateButton = $("random-generator-generate-button");
    const randomGeneratorStatus = $("random-generator-status");
    const randomGeneratorCategorySelect = $("random-generator-category-select");
    const randomGeneratorRaritySelect = $("random-generator-rarity-select");
    const randomGeneratorThemeModeSelect = $("random-generator-theme-mode-select");
    const randomGeneratorThemeField = $("random-generator-theme-field");
    const randomGeneratorThemeInput = $("random-generator-theme-input");
    const randomGeneratorDetailDensitySelect = $("random-generator-detail-density-select");
    const randomGeneratorColorHarmonySelect = $("random-generator-color-harmony-select");
    const randomGeneratorFitModeSelect = $("random-generator-fit-mode-select");
    const randomGeneratorBaseReferenceSelect = $("random-generator-base-reference-select");
    const randomGeneratorThemeSuggestions = $("random-generator-theme-suggestions");
    const randomGeneratorSummaryState = $("random-generator-summary-state");
    const randomGeneratorSummaryCategory = $("random-generator-summary-category");
    const randomGeneratorSummaryRarity = $("random-generator-summary-rarity");
    const randomGeneratorSummaryTheme = $("random-generator-summary-theme");
    const randomGeneratorSummaryDetail = $("random-generator-summary-detail");
    const randomGeneratorSummaryMaterial = $("random-generator-summary-material");
    const randomGeneratorSummaryFit = $("random-generator-summary-fit");
    const randomGeneratorSummaryReference = $("random-generator-summary-reference");
    const randomGeneratorReferenceHint = $("random-generator-reference-hint");
    const generatedStageCard = $("generated-stage-card");
    const generatedStageTitle = $("generated-stage-title");
    const generatedStageStatus = $("generated-stage-status");
    const generatedStageMessage = $("generated-stage-message");
    const generatedStageTheme = $("generated-stage-theme");
    const generatedStageRarity = $("generated-stage-rarity");
    const generatedStageMaterial = $("generated-stage-material");
    const generatedStageFit = $("generated-stage-fit");
    const workspaceLog = $("workspace-log");
    const draftOriginChip = $("draft-origin-chip");
    const publishModeChip = $("publish-mode-chip");
    const selectionChip = $("selection-chip");
    const stageHintLabel = $("stage-hint-label");
    const currentAssetLabel = $("current-asset-label");
    const stageSelectionLabel = $("stage-selection-label");
    const publishStateLabel = $("publish-state-label");
    const draftSourceInline = $("draft-source-inline");
    const draftCategoryLabel = $("draft-category-label");
    const draftSlotLabel = $("draft-slot-label");
    const liveCategoryList = $("live-category-list");
    const livePropList = $("live-prop-list");
    const livePropCount = $("live-prop-count");
    const liveSearchInput = $("live-search-input");
    const liveCategoryFilter = $("live-category-filter");
    const motionPreviewButton = $("toggle-preview-motion-button");
    const autoLockFitButton = $("auto-lock-fit-button");
    const syncBothWingsButton = $("sync-both-wings-button");
    const syncOneWingButton = $("sync-one-wing-button");
    const turntableButton = $("toggle-turntable-button");
    const editPropToolbarButton = $("edit-prop-button");
    const togglePlacementDepthButton = $("toggle-placement-depth-button");
    const undoAdjustmentButton = $("undo-adjustment-button");
    const redoAdjustmentButton = $("redo-adjustment-button");
    const editSessionGroup = $("edit-session-group");
    const editSessionLabel = $("edit-session-label");
    const saveEditButton = $("save-edit-button");
    const cancelEditButton = $("cancel-edit-button");
    const publishPropButton = $("publish-prop-button");
    const archivePropButton = $("archive-prop-button");
    const loadSelectedLiveButton = $("load-selected-live-button");
    const linkPropsFolderButton = $("link-props-folder-button");
    const propsFolderStatusChip = $("props-folder-status-chip");
    const transformSection = $("transform-section");
    const categoryManagerSection = $("category-manager-section");
    const wingSourceSection = $("wing-source-section");
    const wingMotionSection = $("wing-motion-section");
    const LEFT_PANEL_SECTION_DEFAULTS = Object.freeze({
      "build-import-panel": true,
      "prop-workspace-panel": true,
      "prop-core-section": true,
      "wing-source-section": true,
      "wing-motion-section": false,
      "appearance-section": false,
      "transform-section": false,
      "category-manager-section": false
    });
    const LEFT_PANEL_STATE_STORAGE_KEY = "xio-character-creator.left-panel-sections.v1";
    const IS_FILE_RUNTIME = window.location.protocol === "file:" || window.location.origin === "null";
    const STANDALONE_PROPS_DB_NAME = "xio-character-creator-standalone";
    const STANDALONE_PROPS_DB_VERSION = 1;
    const STANDALONE_PROPS_STORE_NAME = "handles";
    const STANDALONE_PROPS_FOLDER_KEY = "props-folder";
    const STANDALONE_PROPS_PREFIXES = Object.freeze([
      "./Images/PROPS/",
      "Images/PROPS/",
      "/Images/PROPS/"
    ]);
    const STANDALONE_PROPS_MARKER = "/Images/PROPS/";
    const STANDALONE_FOLDER_STATUS = Object.freeze({
      notNeeded: "not-needed",
      unsupported: "unsupported",
      unlinked: "unlinked",
      linked: "linked",
      missingAsset: "missing-asset",
      relinkRequired: "relink-required"
    });
    const PROP_ASSET_STATUS = Object.freeze({
      proxyReady: "proxy-ready",
      glbReady: "glb-ready",
      needsLink: "needs-link",
      missingAsset: "missing-asset",
      appearanceOnly: "appearance-only"
    });
    const propLabelInput = $("prop-label-input");
    const propKeyInput = $("prop-key-input");
    const propCategorySelect = $("prop-category-select");
    const propRaritySelect = $("prop-rarity-select");
    const propDescriptionInput = $("prop-description-input");
    const propTagsInput = $("prop-tags-input");
    const propActiveToggle = $("prop-active-toggle");
    const propMysteryToggle = $("prop-mystery-toggle");
    const propMirrorToggle = $("prop-mirror-toggle");
    const eyePresetSelect = $("eye-preset-select");
    const materialPresetSelect = $("material-preset-select");
    const wingAuthoringSourceLabel = $("wing-authoring-source-label");
    const wingAuthoringModeLabel = $("wing-authoring-mode-label");
    const wingAutoIsolateButton = $("wing-auto-isolate-button");
    const wingResetSourceButton = $("wing-reset-source-button");
    const wingUseLeftButton = $("wing-use-left-button");
    const wingUseRightButton = $("wing-use-right-button");
    const wingMirrorBothToggle = $("wing-mirror-both-toggle");
    const wingSplitOffsetInput = $("wing-split-offset-input");
    const wingSplitOffsetValue = $("wing-split-offset-value");
    const wingTrimMarginInput = $("wing-trim-margin-input");
    const wingTrimMarginValue = $("wing-trim-margin-value");
    const wingMotionPreviewButton = $("wing-motion-preview-button");
    const wingMotionLinkedToggle = $("wing-motion-linked-toggle");
    const wingMotionMasterCard = $("wing-motion-master-card");
    const wingMotionMasterChip = $("wing-motion-master-chip");
    const wingMotionLeftCard = $("wing-motion-left-card");
    const wingMotionRightCard = $("wing-motion-right-card");
    const categoryKeyInput = $("category-key-input");
    const categoryLabelInput = $("category-label-input");
    const categoryEditorSelect = $("category-editor-select");
    const categorySlotSelect = $("category-slot-select");
    const categoryEquipLimitInput = $("category-equip-limit-input");
    const categorySortOrderInput = $("category-sort-order-input");
    const categoryEnabledToggle = $("category-enabled-toggle");
    const newCategoryButton = $("new-category-button");
    const deleteCategoryButton = $("delete-category-button");
    const transformInputs = {
      position: [$("pos-x-input"), $("pos-y-input"), $("pos-z-input")],
      rotation: [$("rot-x-input"), $("rot-y-input"), $("rot-z-input")],
      scale: [$("scale-x-input"), $("scale-y-input"), $("scale-z-input")]
    };
    const wingMotionInputs = {
      master: {
        flapHz: $("wing-motion-master-flapHz"),
        direction: $("wing-motion-master-direction"),
        amplitude: $("wing-motion-master-amplitude"),
        sweep: $("wing-motion-master-sweep"),
        pitch: $("wing-motion-master-pitch"),
        featherTwist: $("wing-motion-master-featherTwist"),
        shoulderSpread: $("wing-motion-master-shoulderSpread"),
        phaseOffset: $("wing-motion-master-phaseOffset")
      },
      left: {
        flapHz: $("wing-motion-left-flapHz"),
        direction: $("wing-motion-left-direction"),
        amplitude: $("wing-motion-left-amplitude"),
        sweep: $("wing-motion-left-sweep"),
        pitch: $("wing-motion-left-pitch"),
        featherTwist: $("wing-motion-left-featherTwist"),
        shoulderSpread: $("wing-motion-left-shoulderSpread"),
        phaseOffset: $("wing-motion-left-phaseOffset")
      },
      right: {
        flapHz: $("wing-motion-right-flapHz"),
        direction: $("wing-motion-right-direction"),
        amplitude: $("wing-motion-right-amplitude"),
        sweep: $("wing-motion-right-sweep"),
        pitch: $("wing-motion-right-pitch"),
        featherTwist: $("wing-motion-right-featherTwist"),
        shoulderSpread: $("wing-motion-right-shoulderSpread"),
        phaseOffset: $("wing-motion-right-phaseOffset")
      }
    };
    const wingMotionValueLabels = {
      master: {
        flapHz: $("wing-motion-master-flapHz-value"),
        amplitude: $("wing-motion-master-amplitude-value"),
        sweep: $("wing-motion-master-sweep-value"),
        pitch: $("wing-motion-master-pitch-value"),
        featherTwist: $("wing-motion-master-featherTwist-value"),
        shoulderSpread: $("wing-motion-master-shoulderSpread-value"),
        phaseOffset: $("wing-motion-master-phaseOffset-value")
      },
      left: {
        flapHz: $("wing-motion-left-flapHz-value"),
        amplitude: $("wing-motion-left-amplitude-value"),
        sweep: $("wing-motion-left-sweep-value"),
        pitch: $("wing-motion-left-pitch-value"),
        featherTwist: $("wing-motion-left-featherTwist-value"),
        shoulderSpread: $("wing-motion-left-shoulderSpread-value"),
        phaseOffset: $("wing-motion-left-phaseOffset-value")
      },
      right: {
        flapHz: $("wing-motion-right-flapHz-value"),
        amplitude: $("wing-motion-right-amplitude-value"),
        sweep: $("wing-motion-right-sweep-value"),
        pitch: $("wing-motion-right-pitch-value"),
        featherTwist: $("wing-motion-right-featherTwist-value"),
        shoulderSpread: $("wing-motion-right-shoulderSpread-value"),
        phaseOffset: $("wing-motion-right-phaseOffset-value")
      }
    };
    const transformModeButtons = Array.from(document.querySelectorAll("[data-transform-mode]"));
    const stageTransformShortcutButtons = Array.from(document.querySelectorAll("[data-stage-transform-shortcut]"));
    const fallbackSnapshot = deriveHomepageCatalogFromLegacy2({
      inventoryConfig: inventoryModule.INVENTORY_CONFIG,
      propCatalog: propCatalogModule.PROP_CATALOG
    });
    const CORE_CATEGORY_KEYS = new Set((fallbackSnapshot.categories || []).map((entry) => entry.key));
    const CATEGORY_EDITOR_NEW_VALUE = "__new__";
    function withCatalogFallback(snapshot) {
      return mergeHomepageCatalogWithFallback2({
        snapshot,
        fallbackInventoryConfig: inventoryModule.INVENTORY_CONFIG,
        fallbackPropCatalog: propCatalogModule.PROP_CATALOG
      });
    }
    const state = {
      snapshot: withCatalogFallback(readHomepageCatalogSnapshot2()),
      publishEnabled: false,
      publishReason: "Open through the manager route to publish live.",
      selectedLivePropKey: null,
      draftCategoryKey: ((_a = fallbackSnapshot.categories[0]) == null ? void 0 : _a.key) || "wingSet",
      categoryEditorKey: ((_b = fallbackSnapshot.categories[0]) == null ? void 0 : _b.key) || null,
      draftProp: null,
      draftTemplateRoot: null,
      draftTemplatePair: null,
      draftTemplateSourceRoot: null,
      draftTemplateSourcePair: null,
      draftSourceLabel: "No GLB loaded",
      draftObjectUrl: null,
      draftLocalFile: null,
      stageSelection: null,
      turntableEnabled: true,
      motionPreviewEnabled: false,
      wingSyncPreview: {
        mode: null,
        side: null
      },
      transformMode: "translate",
      pendingRequests: /* @__PURE__ */ new Map(),
      requestCounter: 0,
      turntablePauseUntilMs: 0,
      liveSearchQuery: "",
      liveCategoryFilter: "all",
      editSession: {
        active: false,
        propKey: null,
        baselineProp: null
      },
      history: {
        undoStack: [],
        redoStack: [],
        currentSnapshot: null,
        suspend: false
      },
      standalonePropsFolder: {
        handle: null,
        permission: IS_FILE_RUNTIME ? STANDALONE_FOLDER_STATUS.unlinked : STANDALONE_FOLDER_STATUS.notNeeded,
        name: "",
        missingAssetPath: null
      },
      propAssetAvailability: /* @__PURE__ */ new Map(),
      assetAvailabilityRefreshToken: 0
    };
    const BRIDGE_TARGET_ORIGIN = window.location.protocol === "file:" || window.location.origin === "null" ? "*" : window.location.origin;
    const logEntries = [];
    let creatorNoticeTimeoutId = 0;
    let deleteConfirmResolver = null;
    let deleteConfirmLastActiveElement = null;
    let saveSuccessResolver = null;
    let saveSuccessLastActiveElement = null;
    let randomGeneratorLastActiveElement = null;
    let randomGeneratorIsBusy = false;
    function renderWorkspaceLog() {
      const visibleEntries = logEntries.slice(0, 18);
      if (!visibleEntries.length) {
        workspaceLog.innerHTML = '<div class="workspace-log__empty">No creator activity yet.</div>';
        return;
      }
      workspaceLog.innerHTML = visibleEntries.map((entry) => `
    <article class="workspace-log__entry">
      <span class="workspace-log__time">${escapeHtml2(entry.time)}</span>
      <p class="workspace-log__message">${escapeHtml2(entry.message)}</p>
    </article>
  `).join("");
    }
    const log = (message) => {
      logEntries.unshift({
        time: (/* @__PURE__ */ new Date()).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit"
        }),
        message
      });
      renderWorkspaceLog();
    };
    const slugify = (value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
    const escapeHtml2 = (value) => String(value != null ? value : "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    renderWorkspaceLog();
    function hideCreatorNotice() {
      if (creatorNoticeTimeoutId) {
        window.clearTimeout(creatorNoticeTimeoutId);
        creatorNoticeTimeoutId = 0;
      }
      if (!creatorNotice) return;
      creatorNotice.hidden = true;
      creatorNotice.removeAttribute("data-tone");
    }
    function showCreatorNotice({
      tone = "info",
      eyebrow = "Status",
      title = "Workspace updated",
      message = "",
      timeoutMs = 4800
    } = {}) {
      if (!creatorNotice || !creatorNoticeEyebrow || !creatorNoticeTitle || !creatorNoticeMessage) {
        return;
      }
      if (creatorNoticeTimeoutId) {
        window.clearTimeout(creatorNoticeTimeoutId);
        creatorNoticeTimeoutId = 0;
      }
      creatorNotice.dataset.tone = tone;
      creatorNoticeEyebrow.textContent = eyebrow;
      creatorNoticeTitle.textContent = title;
      creatorNoticeMessage.textContent = message;
      creatorNotice.hidden = false;
      if (timeoutMs > 0) {
        creatorNoticeTimeoutId = window.setTimeout(() => {
          hideCreatorNotice();
        }, timeoutMs);
      }
    }
    function restoreFocusBeforeHidingModal(lastActiveElement, fallbackElement = null) {
      const focusTarget = [lastActiveElement, fallbackElement].find((candidate) => candidate instanceof HTMLElement && typeof candidate.focus === "function" && !candidate.hasAttribute("disabled") && !candidate.hidden && candidate.isConnected) || null;
      if (focusTarget && document.activeElement !== focusTarget) {
        focusTarget.focus({ preventScroll: true });
        return;
      }
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
    function resolveDeleteConfirm(confirmed) {
      if (!deleteConfirmModal) {
        return;
      }
      const resolver = deleteConfirmResolver;
      deleteConfirmResolver = null;
      const lastActiveElement = deleteConfirmLastActiveElement;
      deleteConfirmLastActiveElement = null;
      restoreFocusBeforeHidingModal(lastActiveElement);
      deleteConfirmModal.hidden = true;
      deleteConfirmModal.setAttribute("aria-hidden", "true");
      resolver == null ? void 0 : resolver(confirmed);
    }
    function resolveSaveSuccessPrompt(shouldLaunch) {
      if (!saveSuccessModal) {
        return;
      }
      const resolver = saveSuccessResolver;
      saveSuccessResolver = null;
      const lastActiveElement = saveSuccessLastActiveElement;
      saveSuccessLastActiveElement = null;
      restoreFocusBeforeHidingModal(lastActiveElement);
      saveSuccessModal.hidden = true;
      saveSuccessModal.setAttribute("aria-hidden", "true");
      resolver == null ? void 0 : resolver(shouldLaunch);
    }
    function requestDestructiveConfirmation({
      eyebrow = "Delete",
      title = "Delete this item permanently?",
      message = "",
      confirmLabel = "Delete Permanently"
    } = {}) {
      if (!deleteConfirmModal || !deleteConfirmTitle || !deleteConfirmMessage || !deleteConfirmConfirmButton) {
        return Promise.resolve(false);
      }
      if (deleteConfirmResolver) {
        resolveDeleteConfirm(false);
      }
      deleteConfirmLastActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (deleteConfirmEyebrow) {
        deleteConfirmEyebrow.textContent = eyebrow;
      }
      deleteConfirmTitle.textContent = title;
      deleteConfirmMessage.textContent = message;
      deleteConfirmConfirmButton.textContent = confirmLabel;
      deleteConfirmModal.hidden = false;
      deleteConfirmModal.setAttribute("aria-hidden", "false");
      return new Promise((resolve) => {
        deleteConfirmResolver = resolve;
        window.setTimeout(() => {
          deleteConfirmConfirmButton.focus();
        }, 0);
      });
    }
    function requestMysteryLaunchConfirmation({
      eyebrow = "Live Save Complete",
      title = "Prop saved into the live inventory",
      message = "Would you like to go to the Homepage now and test the next Mystery Box pull?",
      stayLabel = "Stay in Studio",
      launchLabel = "Go Test Mystery Box"
    } = {}) {
      if (!saveSuccessModal || !saveSuccessEyebrow || !saveSuccessTitle || !saveSuccessMessage || !saveSuccessLaunchButton || !saveSuccessStayButton) {
        return Promise.resolve(false);
      }
      if (saveSuccessResolver) {
        resolveSaveSuccessPrompt(false);
      }
      hideCreatorNotice();
      saveSuccessLastActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      saveSuccessEyebrow.textContent = eyebrow;
      saveSuccessTitle.textContent = title;
      saveSuccessMessage.textContent = message;
      saveSuccessStayButton.textContent = stayLabel;
      saveSuccessLaunchButton.textContent = launchLabel;
      saveSuccessModal.hidden = false;
      saveSuccessModal.setAttribute("aria-hidden", "false");
      window.setTimeout(() => {
        saveSuccessLaunchButton.focus();
      }, 0);
      return new Promise((resolve) => {
        saveSuccessResolver = resolve;
      });
    }
    function getRandomGeneratorBaseReferenceCatalog() {
      const referenceMap = /* @__PURE__ */ new Map();
      propCatalogModule.PROP_CATALOG.forEach((entry) => {
        if ((entry == null ? void 0 : entry.category) !== "wingSet") {
          return;
        }
        referenceMap.set(entry.key, {
          key: entry.key,
          label: entry.label,
          rarity: entry.rarity,
          attachment: entry.attachment,
          categoryKey: "wingSet",
          assetUrl: entry.assetUrl || null,
          factoryId: entry.factoryId || null,
          preview: clonePreviewData(entry.preview)
        });
      });
      getProps().forEach((entry) => {
        if ((entry == null ? void 0 : entry.categoryKey) !== "wingSet" || !(entry == null ? void 0 : entry.label) || entry.archived === true || entry.active === false) {
          return;
        }
        referenceMap.set(entry.key, {
          key: entry.key,
          label: entry.label,
          rarity: entry.rarity,
          attachment: entry.attachment,
          categoryKey: "wingSet",
          assetUrl: entry.assetUrl || null,
          factoryId: entry.factoryId || null,
          preview: clonePreviewData(entry.preview)
        });
      });
      return [...referenceMap.values()];
    }
    function getRandomGeneratorBaseReferenceOptions() {
      return getWingBaseReferenceOptions2(getRandomGeneratorBaseReferenceCatalog());
    }
    function resolveRandomGeneratorSelectedBaseReference(formState, references = getRandomGeneratorBaseReferenceOptions()) {
      const requestedKey = typeof (formState == null ? void 0 : formState.baseReferenceKey) === "string" ? formState.baseReferenceKey.trim() : "";
      const requestedReference = requestedKey ? references.find((entry) => entry.key === requestedKey) || null : null;
      if (requestedReference) {
        return requestedReference;
      }
      if (((formState == null ? void 0 : formState.fitMode) === "copyWingTemplate" || (formState == null ? void 0 : formState.themeMode) === "matchExistingStyle") && references.length) {
        return references[0];
      }
      return null;
    }
    function measureRandomGeneratorTemplateBounds({ templateRoot = null, templatePair = null, attachment = null } = {}) {
      const measurementRoot = new THREE.Group();
      if ((templatePair == null ? void 0 : templatePair.left) && (templatePair == null ? void 0 : templatePair.right)) {
        measurementRoot.add(cloneSceneGraph2(templatePair.left));
        measurementRoot.add(cloneSceneGraph2(templatePair.right));
      } else if (templateRoot) {
        measurementRoot.add(cloneSceneGraph2(templateRoot));
      } else {
        return null;
      }
      measurementRoot.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(measurementRoot);
      if (box.isEmpty()) {
        return null;
      }
      const size = new THREE.Vector3();
      box.getSize(size);
      const width = Math.max(size.x, 1e-3);
      const height = Math.max(size.y, 1e-3);
      const depth = Math.max(size.z, 1e-3);
      const attachmentScaleAverage = Array.isArray(attachment == null ? void 0 : attachment.scale) ? attachment.scale.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0).reduce((sum, value, _, values) => sum + value / Math.max(values.length, 1), 0) : 1.9;
      return {
        width: Number(width.toFixed(3)),
        height: Number(height.toFixed(3)),
        depth: Number(depth.toFixed(3)),
        spreadRatio: Number((width / height).toFixed(3)),
        verticalRatio: Number((height / width).toFixed(3)),
        depthRatio: Number((depth / width).toFixed(3)),
        attachmentScaleAverage: Number(attachmentScaleAverage.toFixed(3))
      };
    }
    function deriveRandomGeneratorMetricsFromGeneratedRecipe(generatedRecipe, attachment = null) {
      const structureRecipe = generatedRecipe == null ? void 0 : generatedRecipe.structureRecipe;
      if (!structureRecipe || typeof structureRecipe !== "object") {
        return null;
      }
      const width = Math.max((Number(structureRecipe.span) || 3.2) * 2.04, 1e-3);
      const height = Math.max(Number(structureRecipe.height) || 2.1, 1e-3);
      const depth = Math.max((Number(structureRecipe.featherWidth) || 0.28) * 0.86, 1e-3);
      const attachmentScaleAverage = Array.isArray(attachment == null ? void 0 : attachment.scale) ? attachment.scale.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0).reduce((sum, value, _, values) => sum + value / Math.max(values.length, 1), 0) : 1.9;
      return {
        width: Number(width.toFixed(3)),
        height: Number(height.toFixed(3)),
        depth: Number(depth.toFixed(3)),
        spreadRatio: Number((width / height).toFixed(3)),
        verticalRatio: Number((height / width).toFixed(3)),
        depthRatio: Number((depth / width).toFixed(3)),
        attachmentScaleAverage: Number(attachmentScaleAverage.toFixed(3))
      };
    }
    async function resolveRandomGeneratorTemplateReference(formState, baseReferenceOptions = getRandomGeneratorBaseReferenceOptions()) {
      var _a2;
      if ((formState == null ? void 0 : formState.fitMode) !== "copyWingTemplate") {
        return null;
      }
      const selectedReference = resolveRandomGeneratorSelectedBaseReference(formState, baseReferenceOptions);
      if (!selectedReference) {
        return null;
      }
      const templateReference = {
        key: selectedReference.key,
        label: selectedReference.label,
        sourceKind: selectedReference.sourceKind || (selectedReference.assetUrl ? "glb" : "metadata"),
        theme: selectedReference.theme || null,
        materialFamily: selectedReference.materialFamily || null,
        paletteFamily: selectedReference.paletteFamily || null,
        fitTemplateId: selectedReference.fitTemplateId || null,
        structureFamily: selectedReference.structureFamily || null,
        attachment: cloneAttachment2(selectedReference.attachment || {
          position: [0.72, -0.24, 0.08],
          rotation: [0.02, 0.06, -0.02],
          scale: [1.9, 1.9, 1.9],
          mirrorMode: "paired",
          fit: { yOffsetRatio: 0.56, zOffsetRatio: 0.02, distanceMultiplier: 1.28, initialRotationY: 0 }
        }),
        generatedRecipe: selectedReference.generatedRecipe ? clonePreviewData(selectedReference.generatedRecipe) : null,
        metrics: null
      };
      if (templateReference.generatedRecipe) {
        templateReference.metrics = deriveRandomGeneratorMetricsFromGeneratedRecipe(
          templateReference.generatedRecipe,
          templateReference.attachment
        );
      }
      if (selectedReference.assetUrl) {
        try {
          const templateState = await loadWingTemplateState2({
            GLTFLoader,
            THREE,
            assetUrl: selectedReference.assetUrl
          });
          const boundsMetrics = measureRandomGeneratorTemplateBounds({
            templateRoot: (templateState == null ? void 0 : templateState.sourceTemplateRoot) || null,
            templatePair: (templateState == null ? void 0 : templateState.sourceTemplatePair) || null,
            attachment: templateReference.attachment
          });
          if (boundsMetrics) {
            templateReference.metrics = {
              ...templateReference.metrics || {},
              ...boundsMetrics
            };
          }
        } catch (error) {
          console.warn("[XiO Creator] Template-copy analysis fell back to metadata.", error);
        }
      }
      if (!templateReference.metrics) {
        templateReference.metrics = {
          attachmentScaleAverage: Number(
            (Array.isArray((_a2 = templateReference.attachment) == null ? void 0 : _a2.scale) ? templateReference.attachment.scale.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0).reduce((sum, value, _, values) => sum + value / Math.max(values.length, 1), 0) : 1.9).toFixed(3)
          )
        };
      }
      return templateReference;
    }
    function setRandomGeneratorStatus(message = "", { tone = "info" } = {}) {
      if (!randomGeneratorStatus) {
        return;
      }
      if (!message) {
        randomGeneratorStatus.hidden = true;
        randomGeneratorStatus.textContent = "";
        randomGeneratorStatus.removeAttribute("data-tone");
        return;
      }
      randomGeneratorStatus.hidden = false;
      randomGeneratorStatus.dataset.tone = tone;
      randomGeneratorStatus.textContent = message;
    }
    function setRandomGeneratorBusy(isBusy) {
      randomGeneratorIsBusy = Boolean(isBusy);
      if (randomGeneratorGenerateButton) {
        randomGeneratorGenerateButton.disabled = randomGeneratorIsBusy;
        randomGeneratorGenerateButton.textContent = randomGeneratorIsBusy ? "Generating..." : "Generate";
      }
      if (randomGeneratorCancelButton) {
        randomGeneratorCancelButton.disabled = randomGeneratorIsBusy;
      }
      if (randomGeneratorCloseButton) {
        randomGeneratorCloseButton.disabled = randomGeneratorIsBusy;
      }
    }
    function readRandomGeneratorFormState() {
      return {
        category: (randomGeneratorCategorySelect == null ? void 0 : randomGeneratorCategorySelect.value) || "wingSet",
        rarity: (randomGeneratorRaritySelect == null ? void 0 : randomGeneratorRaritySelect.value) || "rare",
        themeMode: (randomGeneratorThemeModeSelect == null ? void 0 : randomGeneratorThemeModeSelect.value) || "fullyRandom",
        themeInput: (randomGeneratorThemeInput == null ? void 0 : randomGeneratorThemeInput.value) || "",
        detailDensity: (randomGeneratorDetailDensitySelect == null ? void 0 : randomGeneratorDetailDensitySelect.value) || "autoByRarity",
        colorHarmonyMode: (randomGeneratorColorHarmonySelect == null ? void 0 : randomGeneratorColorHarmonySelect.value) || "auto",
        fitMode: (randomGeneratorFitModeSelect == null ? void 0 : randomGeneratorFitModeSelect.value) || "useMasterTemplate",
        baseReferenceKey: (randomGeneratorBaseReferenceSelect == null ? void 0 : randomGeneratorBaseReferenceSelect.value) || ""
      };
    }
    function renderRandomGeneratorSummary() {
      const formState = readRandomGeneratorFormState();
      const summary = buildGeneratorPreviewSummary2(formState, {
        baseReferenceOptions: getRandomGeneratorBaseReferenceOptions()
      });
      if (randomGeneratorSummaryCategory) {
        randomGeneratorSummaryCategory.textContent = summary.categoryLabel;
      }
      if (randomGeneratorSummaryRarity) {
        randomGeneratorSummaryRarity.textContent = summary.rarityLabel;
      }
      if (randomGeneratorSummaryTheme) {
        randomGeneratorSummaryTheme.textContent = summary.themeLabel;
      }
      if (randomGeneratorSummaryDetail) {
        randomGeneratorSummaryDetail.textContent = summary.detailLabel;
      }
      if (randomGeneratorSummaryMaterial) {
        randomGeneratorSummaryMaterial.textContent = summary.materialDirection;
      }
      if (randomGeneratorSummaryFit) {
        randomGeneratorSummaryFit.textContent = summary.fitLabel;
      }
      if (randomGeneratorSummaryReference) {
        randomGeneratorSummaryReference.textContent = summary.baseReferenceLabel;
      }
      if (randomGeneratorSummaryState) {
        randomGeneratorSummaryState.textContent = formState.fitMode === "copyWingTemplate" ? "Derivative build" : (randomGeneratorThemeModeSelect == null ? void 0 : randomGeneratorThemeModeSelect.value) === "guidedTheme" ? "Guided" : (randomGeneratorThemeModeSelect == null ? void 0 : randomGeneratorThemeModeSelect.value) === "matchExistingStyle" ? "Style matched" : "Stage first";
      }
      if (randomGeneratorThemeField) {
        randomGeneratorThemeField.hidden = (randomGeneratorThemeModeSelect == null ? void 0 : randomGeneratorThemeModeSelect.value) !== "guidedTheme";
      }
      if (randomGeneratorReferenceHint) {
        randomGeneratorReferenceHint.hidden = formState.fitMode !== "copyWingTemplate";
      }
    }
    function populateRandomGeneratorOptions() {
      if (randomGeneratorCategorySelect) {
        randomGeneratorCategorySelect.innerHTML = GENERATOR_CATEGORY_OPTIONS2.map((entry) => `<option value="${escapeHtml2(entry.value)}"${entry.enabled ? "" : " disabled"}>${escapeHtml2(entry.label)}${entry.enabled ? "" : " (Coming Soon)"}</option>`).join("");
        randomGeneratorCategorySelect.value = "wingSet";
      }
      if (randomGeneratorRaritySelect) {
        randomGeneratorRaritySelect.innerHTML = GENERATOR_RARITY_OPTIONS2.map((entry) => `<option value="${escapeHtml2(entry.value)}">${escapeHtml2(entry.label)}</option>`).join("");
        randomGeneratorRaritySelect.value = "rare";
      }
      if (randomGeneratorThemeModeSelect) {
        randomGeneratorThemeModeSelect.innerHTML = GENERATOR_THEME_MODE_OPTIONS2.map((entry) => `<option value="${escapeHtml2(entry.value)}">${escapeHtml2(entry.label)}</option>`).join("");
        randomGeneratorThemeModeSelect.value = "fullyRandom";
      }
      if (randomGeneratorDetailDensitySelect) {
        randomGeneratorDetailDensitySelect.innerHTML = GENERATOR_DETAIL_DENSITY_OPTIONS2.map((entry) => `<option value="${escapeHtml2(entry.value)}">${escapeHtml2(entry.label)}</option>`).join("");
        randomGeneratorDetailDensitySelect.value = "autoByRarity";
      }
      if (randomGeneratorColorHarmonySelect) {
        randomGeneratorColorHarmonySelect.innerHTML = GENERATOR_COLOR_HARMONY_OPTIONS2.map((entry) => `<option value="${escapeHtml2(entry.value)}">${escapeHtml2(entry.label)}</option>`).join("");
        randomGeneratorColorHarmonySelect.value = "auto";
      }
      if (randomGeneratorFitModeSelect) {
        randomGeneratorFitModeSelect.innerHTML = GENERATOR_FIT_MODE_OPTIONS2.map((entry) => `<option value="${escapeHtml2(entry.value)}">${escapeHtml2(entry.label)}</option>`).join("");
        randomGeneratorFitModeSelect.value = "useMasterTemplate";
      }
      if (randomGeneratorThemeSuggestions) {
        randomGeneratorThemeSuggestions.innerHTML = GENERATOR_THEME_OPTIONS2.map((entry) => `<option value="${escapeHtml2(entry.label)}"></option>`).join("");
      }
    }
    function populateRandomGeneratorBaseReferences() {
      if (!randomGeneratorBaseReferenceSelect) {
        return;
      }
      const references = getRandomGeneratorBaseReferenceOptions();
      const previousValue = randomGeneratorBaseReferenceSelect.value || "";
      randomGeneratorBaseReferenceSelect.innerHTML = [
        '<option value="">Auto Select</option>',
        ...references.map((entry) => {
          const sourceLabel = entry.sourceKind === "generated" ? "Generated" : entry.sourceKind === "glb" ? "GLB" : "Template";
          return `<option value="${escapeHtml2(entry.key)}">${escapeHtml2(`${entry.label} \xB7 ${sourceLabel}`)}</option>`;
        })
      ].join("");
      randomGeneratorBaseReferenceSelect.value = references.some((entry) => entry.key === previousValue) ? previousValue : "";
    }
    function renderGeneratedStageCard() {
      var _a2;
      if (!generatedStageCard) {
        return;
      }
      const draftProp = ensureDraftProp();
      const generatedPreview = (_a2 = draftProp == null ? void 0 : draftProp.preview) == null ? void 0 : _a2.generated;
      if (!isGeneratedPropPreview2(draftProp == null ? void 0 : draftProp.preview) || !(generatedPreview == null ? void 0 : generatedPreview.displaySummary)) {
        generatedStageCard.hidden = true;
        return;
      }
      generatedStageCard.hidden = false;
      if (generatedStageTitle) {
        generatedStageTitle.textContent = draftProp.label ? `${draftProp.label} staged` : "Generated wing draft staged";
      }
      if (generatedStageStatus) {
        generatedStageStatus.textContent = state.publishEnabled ? "Ready to publish" : "Local only";
      }
      if (generatedStageMessage) {
        generatedStageMessage.textContent = state.publishEnabled ? "This generated wing is staged on XiO and can be tested before you add it to the live inventory." : "This generated wing is staged locally on XiO and will not go live until you open the manager route and save it.";
      }
      if (generatedStageTheme) {
        generatedStageTheme.textContent = generatedPreview.displaySummary.themeLabel || "Royal";
      }
      if (generatedStageRarity) {
        generatedStageRarity.textContent = generatedPreview.displaySummary.rarityLabel || "Rare";
      }
      if (generatedStageMaterial) {
        generatedStageMaterial.textContent = generatedPreview.displaySummary.materialDirection || "Royal Enamel";
      }
      if (generatedStageFit) {
        generatedStageFit.textContent = generatedPreview.displaySummary.fitLabel || "XiO Wing Master Template";
      }
    }
    function closeRandomGeneratorModal({ restoreFocus = true } = {}) {
      if (!randomGeneratorModal) {
        return;
      }
      const lastActiveElement = randomGeneratorLastActiveElement;
      randomGeneratorLastActiveElement = null;
      if (restoreFocus) {
        restoreFocusBeforeHidingModal(lastActiveElement, randomPropGeneratorButton);
      }
      randomGeneratorModal.hidden = true;
      randomGeneratorModal.setAttribute("aria-hidden", "true");
      setRandomGeneratorBusy(false);
      setRandomGeneratorStatus("");
    }
    function openRandomGeneratorModal() {
      if (!randomGeneratorModal) {
        return;
      }
      hideCreatorNotice();
      randomGeneratorLastActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      populateRandomGeneratorBaseReferences();
      renderRandomGeneratorSummary();
      setRandomGeneratorStatus("Wing generation is stage-first. Copy Wing Template studies the selected wing as a guide, then generates a derivative result instead of cloning it exactly.", { tone: "info" });
      setRandomGeneratorBusy(false);
      randomGeneratorModal.hidden = false;
      randomGeneratorModal.setAttribute("aria-hidden", "false");
      window.setTimeout(() => {
        randomGeneratorCategorySelect == null ? void 0 : randomGeneratorCategorySelect.focus();
      }, 0);
    }
    function trapFocusInsideRandomGenerator(event) {
      if (event.key !== "Tab" || !randomGeneratorModal || randomGeneratorModal.hidden) {
        return;
      }
      const focusableElements = [...randomGeneratorModal.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((element) => element instanceof HTMLElement && !element.hasAttribute("disabled") && !element.hidden && element.getAttribute("aria-hidden") !== "true" && element.offsetParent !== null);
      if (!focusableElements.length) {
        return;
      }
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    async function generateRandomWingDraftToStage() {
      if (randomGeneratorIsBusy) {
        return;
      }
      setRandomGeneratorBusy(true);
      setRandomGeneratorStatus("Synthesizing a coherent XiO-ready wing recipe...", { tone: "info" });
      try {
        const formState = readRandomGeneratorFormState();
        const baseReferenceOptions = getRandomGeneratorBaseReferenceOptions();
        const templateReference = await resolveRandomGeneratorTemplateReference(formState, baseReferenceOptions);
        const generation = generateRandomWingDraft2(formState, {
          existingProps: getProps(),
          baseReferenceOptions,
          defaultWingMotionPreview: DEFAULT_WING_MOTION_PREVIEW2,
          templateReference
        });
        if (!generation.ok || !generation.draftRecord) {
          throw new Error(generation.error || "The generator could not create a valid wing recipe.");
        }
        const previewPair = buildGeneratedWingPreview2({
          THREE,
          recipe: generation.recipe,
          attachment: generation.draftRecord.attachment
        });
        if (!(previewPair == null ? void 0 : previewPair.left) || !(previewPair == null ? void 0 : previewPair.right)) {
          throw new Error("The generated wing recipe did not produce a valid XiO preview pair.");
        }
        const previewState = prepareDraftTemplatePairStateFromLivePreview(
          previewPair,
          `${generation.draftRecord.label} (generated stage)`,
          generation.draftRecord
        );
        const draftLoadPlan = buildDraftLoadPlanBase(generation.draftRecord, {
          selectedLivePropKey: null,
          draftCategoryKey: generation.draftRecord.categoryKey,
          draftSourceLabel: `${generation.draftRecord.label} (generated stage)`,
          draftTemplateRoot: (previewState == null ? void 0 : previewState.draftTemplateRoot) || null,
          draftTemplatePair: (previewState == null ? void 0 : previewState.draftTemplatePair) || null,
          draftTemplateSourceRoot: (previewState == null ? void 0 : previewState.draftTemplateRoot) || null,
          draftTemplateSourcePair: (previewState == null ? void 0 : previewState.draftTemplatePair) || null
        });
        commitDraftLoadPlan({
          ...draftLoadPlan,
          ...previewState || {}
        }, {
          announceMessage: `Generated ${generation.draftRecord.label} and staged it on XiO.`
        });
        renderGeneratedStageCard();
        setRandomGeneratorStatus(
          formState.fitMode === "copyWingTemplate" && (templateReference == null ? void 0 : templateReference.label) ? `${generation.draftRecord.label} is staged on XiO as a derivative build from ${templateReference.label}.` : `${generation.draftRecord.label} is staged on XiO and ready for testing or live save.`,
          { tone: "success" }
        );
        showCreatorNotice({
          tone: "success",
          eyebrow: "Generated Draft Ready",
          title: `${generation.draftRecord.label} staged`,
          message: "The generated wing is loaded on XiO. Review it, tweak it if needed, then save when you are ready.",
          timeoutMs: 5600
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to generate a coherent XiO wing right now.";
        setRandomGeneratorStatus(message, { tone: "error" });
      } finally {
        setRandomGeneratorBusy(false);
        renderRandomGeneratorSummary();
      }
    }
    function launchMysteryBoxTest() {
      var _a2, _b2, _c, _d, _e, _f;
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: HOMEPAGE_OPEN_MYSTERY_TEST_REQUEST2 }, BRIDGE_TARGET_ORIGIN);
        return;
      }
      const existingSession = readHomepageMysteryTestSession2();
      const existingOverride = readHomepageMysteryTestOverride2();
      const launchToken = buildHomepageMysteryTestLaunchToken2({
        propKey: (_b2 = (_a2 = existingSession == null ? void 0 : existingSession.propKey) != null ? _a2 : existingOverride == null ? void 0 : existingOverride.propKey) != null ? _b2 : readHomepageLegacyPinnedMysteryRewardKey2(),
        snapshotUpdatedAt: (_f = (_e = (_c = existingSession == null ? void 0 : existingSession.snapshotUpdatedAt) != null ? _c : existingOverride == null ? void 0 : existingOverride.snapshotUpdatedAt) != null ? _e : (_d = state.snapshot) == null ? void 0 : _d.updatedAt) != null ? _f : null
      });
      persistHomepageMysteryTestLaunchToken2(launchToken);
      const homePagePath = "./index.html";
      window.location.assign(homePagePath);
    }
    function persistStandaloneMysteryTestReward(propKey, snapshotUpdatedAt = null) {
      const nextSession = buildHomepageMysteryTestSession2({
        propKey,
        snapshotUpdatedAt,
        requiredCatalogRevision: snapshotUpdatedAt
      });
      persistHomepageMysteryTestSession2(nextSession);
      const nextOverride = buildHomepageMysteryTestOverride2({
        propKey,
        snapshotUpdatedAt,
        createdAt: nextSession == null ? void 0 : nextSession.createdAt
      });
      persistHomepageMysteryTestOverride2(nextOverride);
      persistHomepageLegacyPinnedMysteryRewardKey2(propKey);
      return {
        override: nextOverride,
        session: nextSession
      };
    }
    function openStandalonePropsDatabase() {
      if (!("indexedDB" in window)) {
        return Promise.resolve(null);
      }
      return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(STANDALONE_PROPS_DB_NAME, STANDALONE_PROPS_DB_VERSION);
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(STANDALONE_PROPS_STORE_NAME)) {
            database.createObjectStore(STANDALONE_PROPS_STORE_NAME);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Unable to open standalone props storage."));
      });
    }
    async function readStandalonePropsFolderHandle() {
      const database = await openStandalonePropsDatabase();
      if (!database) return null;
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(STANDALONE_PROPS_STORE_NAME, "readonly");
        const store = transaction.objectStore(STANDALONE_PROPS_STORE_NAME);
        const request = store.get(STANDALONE_PROPS_FOLDER_KEY);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error || new Error("Unable to read the linked props folder."));
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => database.close();
        transaction.onabort = () => database.close();
      });
    }
    async function writeStandalonePropsFolderHandle(handle) {
      const database = await openStandalonePropsDatabase();
      if (!database) return;
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(STANDALONE_PROPS_STORE_NAME, "readwrite");
        const store = transaction.objectStore(STANDALONE_PROPS_STORE_NAME);
        const request = store.put(handle, STANDALONE_PROPS_FOLDER_KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error("Unable to store the linked props folder."));
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => database.close();
        transaction.onabort = () => database.close();
      });
    }
    async function clearStandalonePropsFolderHandle() {
      const database = await openStandalonePropsDatabase();
      if (!database) return;
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(STANDALONE_PROPS_STORE_NAME, "readwrite");
        const store = transaction.objectStore(STANDALONE_PROPS_STORE_NAME);
        const request = store.delete(STANDALONE_PROPS_FOLDER_KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error("Unable to clear the linked props folder."));
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => database.close();
        transaction.onabort = () => database.close();
      });
    }
    async function queryDirectoryPermissionState(handle, { request = false } = {}) {
      if (!handle) {
        return STANDALONE_FOLDER_STATUS.unlinked;
      }
      if (typeof handle.queryPermission !== "function") {
        return STANDALONE_FOLDER_STATUS.unsupported;
      }
      let permission = await handle.queryPermission({ mode: "read" });
      if (permission !== "granted" && request && typeof handle.requestPermission === "function") {
        permission = await handle.requestPermission({ mode: "read" });
      }
      if (permission === "granted") {
        return STANDALONE_FOLDER_STATUS.linked;
      }
      return STANDALONE_FOLDER_STATUS.relinkRequired;
    }
    function getStandaloneAssetRelativePath(assetUrl) {
      if (!assetUrl || typeof assetUrl !== "string") {
        return null;
      }
      const normalized = assetUrl.trim().replace(/\\/g, "/");
      const directPrefix = STANDALONE_PROPS_PREFIXES.find((prefix) => normalized.startsWith(prefix));
      if (directPrefix) {
        return normalized.slice(directPrefix.length);
      }
      try {
        const url = new URL(normalized, window.location.href);
        const pathname = decodeURIComponent(url.pathname).replace(/\\/g, "/");
        const markerIndex = pathname.indexOf(STANDALONE_PROPS_MARKER);
        if (markerIndex >= 0) {
          return pathname.slice(markerIndex + STANDALONE_PROPS_MARKER.length);
        }
      } catch {
        return null;
      }
      return null;
    }
    function isStandaloneFolderLinkRequired(propRecord) {
      return Boolean(
        IS_FILE_RUNTIME && (propRecord == null ? void 0 : propRecord.assetUrl) && !isLiveGameWingPreviewKey2(propRecord.key)
      );
    }
    function isPropProxyReady(propRecord) {
      var _a2;
      return Boolean(
        ((_a2 = propRecord == null ? void 0 : propRecord.preview) == null ? void 0 : _a2.kind) || isLiveGameWingPreviewKey2(propRecord == null ? void 0 : propRecord.key)
      );
    }
    async function validateStandalonePropsFolderHandle(handle) {
      if (!handle) return false;
      try {
        await handle.getDirectoryHandle("Wings");
        return true;
      } catch {
        return false;
      }
    }
    async function walkLinkedPropsFolderToFile(relativePath) {
      const rootHandle = state.standalonePropsFolder.handle;
      if (!rootHandle || !relativePath) {
        return null;
      }
      const segments = relativePath.split("/").map((segment) => segment.trim()).filter(Boolean);
      if (!segments.length) {
        return null;
      }
      let currentHandle = rootHandle;
      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        const isLast = index === segments.length - 1;
        try {
          if (isLast) {
            const fileHandle = await currentHandle.getFileHandle(segment);
            return await fileHandle.getFile();
          }
          currentHandle = await currentHandle.getDirectoryHandle(segment);
        } catch {
          return null;
        }
      }
      return null;
    }
    function setStandaloneFolderState(permission, { handle = null, name = "", missingAssetPath = null } = {}) {
      state.standalonePropsFolder.handle = handle;
      state.standalonePropsFolder.permission = permission;
      state.standalonePropsFolder.name = name;
      state.standalonePropsFolder.missingAssetPath = missingAssetPath;
    }
    const cloneAttachment2 = (attachment) => ({
      position: [...attachment.position],
      rotation: [...attachment.rotation],
      scale: [...attachment.scale],
      mirrorMode: attachment.mirrorMode || "single",
      fit: attachment.fit ? { ...attachment.fit } : null
    });
    function clonePreviewData(preview) {
      if (!preview || typeof preview !== "object" || Array.isArray(preview)) {
        return {};
      }
      if (typeof structuredClone === "function") {
        try {
          return structuredClone(preview);
        } catch {
        }
      }
      try {
        return JSON.parse(JSON.stringify(preview));
      } catch {
        return { ...preview };
      }
    }
    const createEmptyDraftProp = (categoryKey = "wingSet") => ({
      key: "",
      label: "",
      categoryKey,
      rarity: "rare",
      assetUrl: null,
      storagePath: null,
      attachment: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        mirrorMode: "single",
        fit: null
      },
      eyePreset: null,
      materialPreset: null,
      mysteryBoxEnabled: true,
      active: true,
      archived: false,
      tags: [],
      description: "",
      preview: {
        wingMotion: clonePreviewData(DEFAULT_WING_MOTION_PREVIEW2)
      }
    });
    function normalizeWingPreviewSide(side, fallback = null) {
      if (side === "left" || side === "right") {
        return side;
      }
      return fallback === "left" || fallback === "right" ? fallback : null;
    }
    function cloneWingSyncPreviewState(previewState = state.wingSyncPreview) {
      return {
        mode: (previewState == null ? void 0 : previewState.mode) === "both" || (previewState == null ? void 0 : previewState.mode) === "single" ? previewState.mode : null,
        side: normalizeWingPreviewSide(previewState == null ? void 0 : previewState.side, null)
      };
    }
    function syncPanelShellStateLabels() {
      document.querySelectorAll(".panel-shell").forEach((section) => {
        if (!(section instanceof HTMLDetailsElement)) return;
        const stateLabel = section.querySelector("[data-panel-shell-state]");
        if (!stateLabel) return;
        stateLabel.textContent = section.open ? "Collapse" : "Expand";
      });
    }
    function readLeftPanelSectionState() {
      try {
        const raw = window.localStorage.getItem(LEFT_PANEL_STATE_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
      } catch (error) {
        console.warn("[XiO Creator] Unable to read left panel state.", error);
        return null;
      }
    }
    function persistLeftPanelSectionState() {
      const payload = {};
      Object.keys(LEFT_PANEL_SECTION_DEFAULTS).forEach((id) => {
        const section = $(id);
        if (section instanceof HTMLDetailsElement) {
          payload[id] = section.open;
        }
      });
      syncPanelShellStateLabels();
      try {
        window.localStorage.setItem(LEFT_PANEL_STATE_STORAGE_KEY, JSON.stringify(payload));
      } catch (error) {
        console.warn("[XiO Creator] Unable to persist left panel state.", error);
      }
    }
    function initializeLeftPanelSectionState() {
      const storedState = readLeftPanelSectionState() || {};
      Object.entries(LEFT_PANEL_SECTION_DEFAULTS).forEach(([id, fallbackOpen]) => {
        const section = $(id);
        if (!(section instanceof HTMLDetailsElement)) return;
        section.open = typeof storedState[id] === "boolean" ? storedState[id] : fallbackOpen;
        section.addEventListener("toggle", persistLeftPanelSectionState);
      });
      syncPanelShellStateLabels();
    }
    const deepCopyProp = (prop) => ({
      ...prop,
      attachment: cloneAttachment2(prop.attachment),
      tags: [...prop.tags || []],
      preview: clonePreviewData(prop.preview)
    });
    function ensureDraftPreviewBucket(draftProp = ensureDraftProp()) {
      if (!draftProp.preview || typeof draftProp.preview !== "object" || Array.isArray(draftProp.preview)) {
        draftProp.preview = {};
      }
      return draftProp.preview;
    }
    function getDraftWingAuthoringPreview(draftProp = ensureDraftProp()) {
      var _a2, _b2;
      return normalizeWingAuthoringPreview2((_a2 = draftProp == null ? void 0 : draftProp.preview) == null ? void 0 : _a2.wingAuthoring, {
        defaultMirrorToBoth: ((_b2 = draftProp == null ? void 0 : draftProp.attachment) == null ? void 0 : _b2.mirrorMode) === "paired"
      });
    }
    function getDraftWingMotionPreview(draftProp = ensureDraftProp()) {
      var _a2;
      return normalizeWingMotionPreview2((_a2 = draftProp == null ? void 0 : draftProp.preview) == null ? void 0 : _a2.wingMotion);
    }
    function setDraftWingAuthoringPreview(authoring, { persist = true } = {}) {
      var _a2;
      const draftProp = ensureDraftProp();
      const preview = ensureDraftPreviewBucket(draftProp);
      const normalized = normalizeWingAuthoringPreview2(authoring, {
        defaultMirrorToBoth: ((_a2 = draftProp == null ? void 0 : draftProp.attachment) == null ? void 0 : _a2.mirrorMode) === "paired"
      });
      if (persist) {
        preview.wingAuthoring = clonePreviewData(normalized);
      }
      return normalized;
    }
    function clearDraftWingAuthoringPreview() {
      const preview = ensureDraftPreviewBucket();
      delete preview.wingAuthoring;
    }
    function setDraftWingMotionPreview(motionProfile, { persist = true } = {}) {
      const draftProp = ensureDraftProp();
      const preview = ensureDraftPreviewBucket(draftProp);
      const normalized = normalizeWingMotionPreview2(motionProfile);
      if (persist) {
        preview.wingMotion = clonePreviewData(normalized);
      }
      return normalized;
    }
    function getDefaultWingMotionChannelLabel(profile) {
      return (profile == null ? void 0 : profile.direction) === "reverse" ? "Reverse flap" : "Normal flap";
    }
    function syncDraftWingMirrorModeFromPreview(draftProp = ensureDraftProp()) {
      var _a2;
      if ((draftProp == null ? void 0 : draftProp.categoryKey) !== "wingSet") {
        return ((_a2 = draftProp == null ? void 0 : draftProp.attachment) == null ? void 0 : _a2.mirrorMode) || "single";
      }
      const authoringPreview = getDraftWingAuthoringPreview(draftProp);
      if (authoringPreview.mode === "isolatedHalf") {
        draftProp.attachment.mirrorMode = authoringPreview.mirrorToBoth ? "paired" : "single";
      }
      return draftProp.attachment.mirrorMode;
    }
    const MAX_DRAFT_HISTORY_STEPS = 40;
    const SLOT_DEPTH_MAGNITUDES = Object.freeze({
      wingSet: 0.9,
      headWear: 0.4,
      faceAccessory: 0.36,
      bodyAccessory: 0.68,
      heldProp: 0.72
    });
    const SLOT_STAGE_TARGET_SPANS = Object.freeze({
      wingSet: 4.9,
      headWear: 5.95,
      faceAccessory: 1.2,
        bodyAccessory: 12.54,
      heldProp: 1.75
    });
    const HEADWEAR_ROTATION_CANDIDATES = Object.freeze([
      Object.freeze([0, 0, 0]),
      Object.freeze([0, Math.PI, 0])
    ]);
    const HEADWEAR_AUTO_LOCK_POSITION = Object.freeze([0, 1.55, -1.65]);
    const SINGLE_SLOT_AUTO_LOCK_PRESETS = Object.freeze({
      headWear: Object.freeze({
        horizontalSpan: 5.95,
        yOffsetRatio: 0.45,
        zOffsetRatio: -0.13,
        rotationCandidates: HEADWEAR_ROTATION_CANDIDATES
      }),
      faceAccessory: Object.freeze({
        horizontalSpan: 1.08,
        ySinkRatio: 0.02,
        zSinkRatio: 0.1,
        rotationCandidates: Object.freeze([Object.freeze([0, 0, 0])])
      }),
      bodyAccessory: Object.freeze({
        horizontalSpan: 12.54,
        ySinkRatio: 0.585318,
        zSinkRatio: 0.28613,
        rotationCandidates: Object.freeze([Object.freeze([0, 0, 0])])
      }),
      heldProp: Object.freeze({
        horizontalSpan: 1.35,
        ySinkRatio: 0.02,
        zSinkRatio: 0.08,
        rotationCandidates: Object.freeze([Object.freeze([0, 0, 0])])
      })
    });
    const SINGLE_WING_SYNC_TARGET_SPAN = 2.55;
    const cloneHistorySnapshot = (snapshot) => ({
      ...snapshot,
      prop: deepCopyProp(snapshot.prop),
      wingSyncPreview: cloneWingSyncPreviewState(snapshot.wingSyncPreview)
    });
    const createHistorySignature = (snapshot) => JSON.stringify({
      prop: snapshot.prop,
      selectedLivePropKey: snapshot.selectedLivePropKey || null,
      draftCategoryKey: snapshot.draftCategoryKey || "",
      draftSourceLabel: snapshot.draftSourceLabel || "",
      selectionKey: snapshot.selectionKey || null,
      wingSyncPreview: cloneWingSyncPreviewState(snapshot.wingSyncPreview)
    });
    function getStageSelectionKey() {
      if (state.stageSelection === draftStage.singlePivot) return "single";
      if (state.stageSelection === draftStage.leftPivot) return "left";
      if (state.stageSelection === draftStage.rightPivot) return "right";
      return null;
    }
    function selectStageSelectionByKey(selectionKey) {
      if (selectionKey === "right" && draftStage.rightPivot) {
        setStageSelection(draftStage.rightPivot);
        return;
      }
      if (selectionKey === "left" && draftStage.leftPivot) {
        setStageSelection(draftStage.leftPivot);
        return;
      }
      if (selectionKey === "single" && draftStage.singlePivot) {
        setStageSelection(draftStage.singlePivot);
        return;
      }
      if (draftStage.leftPivot) {
        setStageSelection(draftStage.leftPivot);
        return;
      }
      if (draftStage.singlePivot) {
        setStageSelection(draftStage.singlePivot);
        return;
      }
      setStageSelection(null);
    }
    function captureDraftHistorySnapshot() {
      const draftProp = ensureDraftProp();
      return {
        prop: deepCopyProp(draftProp),
        selectedLivePropKey: state.selectedLivePropKey || null,
        draftCategoryKey: state.draftCategoryKey || draftProp.categoryKey || "",
        draftSourceLabel: state.draftSourceLabel || "No GLB loaded",
        selectionKey: getStageSelectionKey(),
        wingSyncPreview: cloneWingSyncPreviewState()
      };
    }
    function renderHistoryControls() {
      const hasUndo = state.history.undoStack.length > 0;
      const hasRedo = state.history.redoStack.length > 0;
      undoAdjustmentButton.disabled = !hasUndo;
      redoAdjustmentButton.disabled = !hasRedo;
      undoAdjustmentButton.title = hasUndo ? "Undo last adjustment (Ctrl+Z)" : "Nothing to undo yet.";
      redoAdjustmentButton.title = hasRedo ? "Redo last adjustment (Ctrl+Shift+Z)" : "Nothing to redo yet.";
    }
    function resetDraftHistory() {
      state.history.undoStack = [];
      state.history.redoStack = [];
      state.history.currentSnapshot = cloneHistorySnapshot(captureDraftHistorySnapshot());
      renderHistoryControls();
    }
    function commitDraftHistoryStep() {
      if (state.history.suspend) {
        return;
      }
      const nextSnapshot = captureDraftHistorySnapshot();
      if (!state.history.currentSnapshot) {
        state.history.currentSnapshot = cloneHistorySnapshot(nextSnapshot);
        renderHistoryControls();
        return;
      }
      if (createHistorySignature(state.history.currentSnapshot) === createHistorySignature(nextSnapshot)) {
        renderHistoryControls();
        return;
      }
      state.history.undoStack.push(cloneHistorySnapshot(state.history.currentSnapshot));
      if (state.history.undoStack.length > MAX_DRAFT_HISTORY_STEPS) {
        state.history.undoStack.shift();
      }
      state.history.currentSnapshot = cloneHistorySnapshot(nextSnapshot);
      state.history.redoStack = [];
      renderHistoryControls();
    }
    function restoreDraftHistorySnapshot(snapshot) {
      if (!snapshot) {
        return;
      }
      if (state.motionPreviewEnabled) {
        setMotionPreviewEnabled(false, { silent: true });
      }
      state.history.suspend = true;
      state.selectedLivePropKey = snapshot.selectedLivePropKey || null;
      state.draftCategoryKey = snapshot.draftCategoryKey || snapshot.prop.categoryKey || state.draftCategoryKey;
      state.draftProp = deepCopyProp(snapshot.prop);
      state.wingSyncPreview = cloneWingSyncPreviewState(snapshot.wingSyncPreview);
      state.draftSourceLabel = snapshot.draftSourceLabel || "No GLB loaded";
      refreshDraftTemplatePresentationFromSource();
      rebuildDraftStage();
      selectStageSelectionByKey(snapshot.selectionKey);
      state.history.suspend = false;
      renderAll();
    }
    function undoDraftAdjustment() {
      if (!state.history.undoStack.length) {
        log("Nothing to undo yet.");
        return;
      }
      const previousSnapshot = state.history.undoStack.pop();
      const currentSnapshot = state.history.currentSnapshot || captureDraftHistorySnapshot();
      state.history.redoStack.push(cloneHistorySnapshot(currentSnapshot));
      state.history.currentSnapshot = cloneHistorySnapshot(previousSnapshot);
      restoreDraftHistorySnapshot(state.history.currentSnapshot);
      log("Undid the last adjustment.");
    }
    function redoDraftAdjustment() {
      if (!state.history.redoStack.length) {
        log("Nothing to redo yet.");
        return;
      }
      const nextSnapshot = state.history.redoStack.pop();
      const currentSnapshot = state.history.currentSnapshot || captureDraftHistorySnapshot();
      state.history.undoStack.push(cloneHistorySnapshot(currentSnapshot));
      if (state.history.undoStack.length > MAX_DRAFT_HISTORY_STEPS) {
        state.history.undoStack.shift();
      }
      state.history.currentSnapshot = cloneHistorySnapshot(nextSnapshot);
      restoreDraftHistorySnapshot(state.history.currentSnapshot);
      log("Redid the adjustment.");
    }
    const CREATOR_ONLY_STANDARD_PROPS = Object.freeze([
      Object.freeze({
        key: "xioNoWings",
        label: "XiO No Wings",
        categoryKey: "wingSet",
        rarity: "common",
        assetUrl: null,
        storagePath: null,
        attachment: Object.freeze({
          position: Object.freeze([0, 0, 0]),
          rotation: Object.freeze([0, 0, 0]),
          scale: Object.freeze([1, 1, 1]),
          mirrorMode: "single",
          fit: null
        }),
        eyePreset: null,
        materialPreset: null,
        mysteryBoxEnabled: false,
        active: true,
        archived: false,
        tags: Object.freeze(["xio", "core", "clean", "wingless"]),
        description: "Unequip every wing so XiO is completely clean before you preview or position a new GLB wing set.",
        preview: Object.freeze({ kind: "xioNoWingProxy" }),
        creatorOnly: true
      }),
      Object.freeze({
        key: "xioSignatureGlowWings",
        label: "XiO Signature Glow Wings",
        categoryKey: "wingSet",
        rarity: "common",
        assetUrl: null,
        storagePath: null,
        attachment: Object.freeze({
          position: Object.freeze([0, 0, 0]),
          rotation: Object.freeze([0, 0, 0]),
          scale: Object.freeze([1, 1, 1]),
          mirrorMode: "single",
          fit: null
        }),
        eyePreset: null,
        materialPreset: null,
        mysteryBoxEnabled: false,
        active: true,
        archived: false,
        tags: Object.freeze(["xio", "core", "default"]),
        description: "XiO's built-in blue glow wings for quick equip and unequip previewing.",
        preview: Object.freeze({ kind: "xioBaseWingProxy" }),
        creatorOnly: true
      })
    ]);
    const getCategories = () => [...state.snapshot.categories];
    const getProps = () => {
      const props = [...state.snapshot.props];
      CREATOR_ONLY_STANDARD_PROPS.forEach((prop) => {
        if (!props.some((entry) => entry.key === prop.key)) {
          props.unshift(deepCopyProp(prop));
        }
      });
      return props;
    };
    const getCategoryByKey = (categoryKey) => getCategories().find((entry) => entry.key === categoryKey) || null;
    const getSelectedLiveProp = () => getProps().find((entry) => entry.key === state.selectedLivePropKey) || null;
    function getHighestCategorySortOrder() {
      return getCategories().reduce((highest, entry) => {
        const sortOrder = Number(entry == null ? void 0 : entry.sortOrder);
        return Number.isFinite(sortOrder) && sortOrder > highest ? sortOrder : highest;
      }, -1);
    }
    function buildNewCategoryDraft() {
      var _a2;
      return {
        key: "",
        label: "",
        slotKey: ((_a2 = getDraftCategoryRecord()) == null ? void 0 : _a2.slotKey) || "wingSet",
        equipLimit: 1,
        sortOrder: getHighestCategorySortOrder() + 1,
        enabled: true
      };
    }
    function getCategoryEditorRecord() {
      return state.categoryEditorKey ? getCategoryByKey(state.categoryEditorKey) : null;
    }
    function setCategoryEditorKey(categoryKey) {
      state.categoryEditorKey = categoryKey && getCategoryByKey(categoryKey) ? categoryKey : null;
    }
    function ensureDraftProp() {
      if (!state.draftProp) {
        state.draftProp = createEmptyDraftProp(state.draftCategoryKey);
      }
      return state.draftProp;
    }
    function setSelectionLabel(label) {
      selectionChip.textContent = label;
      stageSelectionLabel.textContent = label;
    }
    function hasFileDataTransfer(dataTransfer) {
      var _a2;
      if (!dataTransfer) return false;
      if ((_a2 = dataTransfer.files) == null ? void 0 : _a2.length) {
        return true;
      }
      const items = Array.from(dataTransfer.items || []);
      if (items.some((item) => item.kind === "file")) {
        return true;
      }
      const types = Array.from(dataTransfer.types || []).map((type) => String(type).toLowerCase());
      return types.includes("files") || types.includes("application/x-moz-file");
    }
    function extractGlbFileFromDataTransfer(dataTransfer) {
      var _a2, _b2;
      if (!dataTransfer) return null;
      const directFile = (_a2 = dataTransfer.files) == null ? void 0 : _a2[0];
      if (directFile) {
        return directFile;
      }
      const items = Array.from(dataTransfer.items || []);
      for (const item of items) {
        if (item.kind !== "file") continue;
        const candidate = (_b2 = item.getAsFile) == null ? void 0 : _b2.call(item);
        if (!candidate) continue;
        if (/\.glb$/i.test(candidate.name) || candidate.type === "model/gltf-binary") {
          return candidate;
        }
      }
      return null;
    }
    function releaseDraftObjectUrl() {
      if (!state.draftObjectUrl) return;
      URL.revokeObjectURL(state.draftObjectUrl);
      state.draftObjectUrl = null;
    }
    function clearDraftTemplateSources({ releaseObjectUrl = false } = {}) {
      if (releaseObjectUrl) {
        releaseDraftObjectUrl();
      }
      state.draftTemplateRoot = null;
      state.draftTemplatePair = null;
      state.draftTemplateSourceRoot = null;
      state.draftTemplateSourcePair = null;
      state.draftLocalFile = null;
    }
    function isCreatorOnlyPropRecord(propRecord) {
      return Boolean(propRecord == null ? void 0 : propRecord.creatorOnly);
    }
    function isBlobBackedLocalDraft(propRecord = state.draftProp) {
      return Boolean(
        !state.publishEnabled && typeof (propRecord == null ? void 0 : propRecord.assetUrl) === "string" && propRecord.assetUrl.startsWith("blob:")
      );
    }
    function getDraftCategoryRecord() {
      const draftProp = ensureDraftProp();
      return getCategoryByKey(draftProp.categoryKey) || getCategoryByKey(state.draftCategoryKey) || getCategories()[0] || null;
    }
    function getSlotLabel(slotKey) {
      var _a2;
      return ((_a2 = XIO_SLOT_DEFINITIONS2[slotKey]) == null ? void 0 : _a2.label) || slotKey || "Unassigned";
    }
    function hasEditableStageProp() {
      const selectedProp = getSelectedLiveProp();
      return Boolean(state.stageSelection) && (!selectedProp || !isCreatorOnlyPropRecord(selectedProp));
    }
    function getSlotAnchorDepth(categoryKey = ensureDraftProp().categoryKey) {
      var _a2, _b2, _c, _d, _e, _f;
      const category = getCategoryByKey(categoryKey) || getDraftCategoryRecord();
      if (!category) {
        return 0;
      }
      if (category.slotKey === "wingSet") {
        return Number((_c = (_b2 = (_a2 = xio.slotAnchors.wingSet) == null ? void 0 : _a2.right) == null ? void 0 : _b2.position) == null ? void 0 : _c.z) || 0;
      }
      return Number((_f = (_e = (_d = xio.slotAnchors[category.slotKey]) == null ? void 0 : _d.anchor) == null ? void 0 : _e.position) == null ? void 0 : _f.z) || 0;
    }
    function getDraftPlacementDepthMode(draftProp = ensureDraftProp()) {
      var _a2, _b2;
      const currentZ = Number((_b2 = (_a2 = draftProp == null ? void 0 : draftProp.attachment) == null ? void 0 : _a2.position) == null ? void 0 : _b2[2]) || 0;
      const absoluteDepth = getSlotAnchorDepth(draftProp == null ? void 0 : draftProp.categoryKey) + currentZ;
      return absoluteDepth < 0 ? "behind" : "front";
    }
    function getSuggestedPlacementDepthMagnitude(draftProp = ensureDraftProp()) {
      return SLOT_DEPTH_MAGNITUDES[draftProp == null ? void 0 : draftProp.categoryKey] || 0.45;
    }
    function getVisibleLiveProps() {
      return getProps().filter((entry) => isCreatorOnlyPropRecord(entry) || entry.active !== false && entry.archived !== true);
    }
    function getFilteredLiveProps() {
      const query = state.liveSearchQuery.trim().toLowerCase();
      return getVisibleLiveProps().filter((prop) => {
        if (state.liveCategoryFilter !== "all" && prop.categoryKey !== state.liveCategoryFilter) {
          return false;
        }
        if (!query) {
          return true;
        }
        return [
          prop.label,
          prop.key,
          prop.categoryKey,
          prop.rarity,
          prop.description,
          ...prop.tags || []
        ].filter(Boolean).join(" ").toLowerCase().includes(query);
      });
    }
    function getPropAssetAvailability(propRecord) {
      var _a2, _b2, _c;
      if (!propRecord) {
        return { status: PROP_ASSET_STATUS.appearanceOnly, label: "Appearance only", tone: "muted" };
      }
      if (isGeneratedPropPreview2(propRecord.preview)) {
        return { status: PROP_ASSET_STATUS.proxyReady, label: "Generated / runtime-ready", tone: "success" };
      }
      if (((_a2 = propRecord.preview) == null ? void 0 : _a2.kind) === "xioNoWingProxy") {
        return { status: PROP_ASSET_STATUS.proxyReady, label: "Built in / proxy-ready", tone: "info" };
      }
      if (((_b2 = propRecord.preview) == null ? void 0 : _b2.kind) === "xioBaseWingProxy") {
        return { status: PROP_ASSET_STATUS.proxyReady, label: "Built in / proxy-ready", tone: "info" };
      }
      if (isLiveGameWingPreviewKey2(propRecord.key)) {
        return { status: PROP_ASSET_STATUS.proxyReady, label: "Built in / proxy-ready", tone: "info" };
      }
      if (!propRecord.assetUrl) {
        if ((_c = propRecord.preview) == null ? void 0 : _c.kind) {
          return { status: PROP_ASSET_STATUS.proxyReady, label: "Built in / proxy-ready", tone: "info" };
        }
        return { status: PROP_ASSET_STATUS.appearanceOnly, label: "Appearance only", tone: "muted" };
      }
      if (!IS_FILE_RUNTIME) {
        return { status: PROP_ASSET_STATUS.glbReady, label: "GLB ready", tone: "success" };
      }
      if (state.standalonePropsFolder.permission !== STANDALONE_FOLDER_STATUS.linked) {
        return { status: PROP_ASSET_STATUS.needsLink, label: "Needs linked folder", tone: "warning" };
      }
      const cachedStatus = state.propAssetAvailability.get(propRecord.key);
      if ((cachedStatus == null ? void 0 : cachedStatus.status) === PROP_ASSET_STATUS.missingAsset) {
        return { status: PROP_ASSET_STATUS.missingAsset, label: "Missing asset", tone: "danger" };
      }
      return { status: PROP_ASSET_STATUS.glbReady, label: "GLB ready", tone: "success" };
    }
    function getPropAssetBadge(propRecord) {
      return getPropAssetAvailability(propRecord).label;
    }
    function getPropAssetBadgeTone(propRecord) {
      return getPropAssetAvailability(propRecord).tone;
    }
    function getLivePropEquipLabel(propRecord) {
      var _a2, _b2;
      if (state.selectedLivePropKey === propRecord.key) {
        return "Equipped on XiO";
      }
      if (((_a2 = propRecord.preview) == null ? void 0 : _a2.kind) === "xioNoWingProxy") {
        return "Unequip Wings";
      }
      if (((_b2 = propRecord.preview) == null ? void 0 : _b2.kind) === "xioBaseWingProxy") {
        return "Equip Base Wings";
      }
      const availability = getPropAssetAvailability(propRecord);
      if (availability.status === PROP_ASSET_STATUS.needsLink) {
        return "Link Folder to Equip";
      }
      if (availability.status === PROP_ASSET_STATUS.missingAsset) {
        return "Missing Local Asset";
      }
      return "Equip on XiO";
    }
    function renderStandalonePropsFolderControls() {
      if (!linkPropsFolderButton || !propsFolderStatusChip) {
        return;
      }
      if (!IS_FILE_RUNTIME) {
        linkPropsFolderButton.hidden = true;
        propsFolderStatusChip.hidden = true;
        return;
      }
      linkPropsFolderButton.hidden = false;
      propsFolderStatusChip.hidden = false;
      propsFolderStatusChip.classList.remove("status-chip--success", "status-chip--warning", "status-chip--danger");
      if (state.standalonePropsFolder.permission === STANDALONE_FOLDER_STATUS.linked) {
        linkPropsFolderButton.textContent = "Relink Props Folder";
        if (state.standalonePropsFolder.missingAssetPath) {
          propsFolderStatusChip.textContent = `Asset missing from linked folder \xB7 ${state.standalonePropsFolder.missingAssetPath}`;
          propsFolderStatusChip.classList.add("status-chip--danger");
        } else {
          propsFolderStatusChip.textContent = `Local props folder linked${state.standalonePropsFolder.name ? ` \xB7 ${state.standalonePropsFolder.name}` : ""}`;
          propsFolderStatusChip.classList.add("status-chip--success");
        }
        return;
      }
      if (state.standalonePropsFolder.permission === STANDALONE_FOLDER_STATUS.relinkRequired) {
        linkPropsFolderButton.textContent = "Relink Props Folder";
        propsFolderStatusChip.textContent = "Link required for GLB inventory";
        propsFolderStatusChip.classList.add("status-chip--warning");
        return;
      }
      if (state.standalonePropsFolder.permission === STANDALONE_FOLDER_STATUS.unsupported) {
        linkPropsFolderButton.hidden = true;
        propsFolderStatusChip.textContent = "This browser cannot link a local props folder.";
        propsFolderStatusChip.classList.add("status-chip--danger");
        return;
      }
      linkPropsFolderButton.textContent = "Link Props Folder";
      propsFolderStatusChip.textContent = "Link required for GLB inventory";
      propsFolderStatusChip.classList.add("status-chip--warning");
    }
    function shouldHideBaseWings(draftProp = ensureDraftProp(), category = getDraftCategoryRecord()) {
      var _a2;
      if (!draftProp || !category || category.slotKey !== "wingSet") {
        return false;
      }
      if (((_a2 = draftProp.preview) == null ? void 0 : _a2.kind) === "xioNoWingProxy") {
        return true;
      }
      return Boolean(state.draftTemplateRoot || state.draftTemplatePair);
    }
    function isNoWingProxyRecord(propRecord = ensureDraftProp()) {
      var _a2;
      return ((_a2 = propRecord == null ? void 0 : propRecord.preview) == null ? void 0 : _a2.kind) === "xioNoWingProxy";
    }
    function isBaseWingProxyRecord(propRecord = ensureDraftProp()) {
      var _a2;
      return ((_a2 = propRecord == null ? void 0 : propRecord.preview) == null ? void 0 : _a2.kind) === "xioBaseWingProxy";
    }
    function hasDraftWingPairSource() {
      var _a2, _b2;
      return Boolean(((_a2 = state.draftTemplatePair) == null ? void 0 : _a2.left) && ((_b2 = state.draftTemplatePair) == null ? void 0 : _b2.right));
    }
    function hasDraftWingAuthoringSource() {
      var _a2, _b2;
      return Boolean(
        state.draftTemplateSourceRoot || ((_a2 = state.draftTemplateSourcePair) == null ? void 0 : _a2.left) && ((_b2 = state.draftTemplateSourcePair) == null ? void 0 : _b2.right)
      );
    }
    function hasLoadedWingDraftAsset(draftProp = ensureDraftProp(), category = getDraftCategoryRecord()) {
      if (!draftProp || !category || category.slotKey !== "wingSet") {
        return false;
      }
      return Boolean(
        state.draftTemplateRoot || hasDraftWingPairSource() || isBaseWingProxyRecord(draftProp)
      );
    }
    function inferWingSideFromAttachment(attachment = ensureDraftProp().attachment) {
      var _a2;
      const positionX = Number((_a2 = attachment == null ? void 0 : attachment.position) == null ? void 0 : _a2[0]) || 0;
      return positionX < 0 ? "left" : "right";
    }
    function getDefaultWingSyncPreviewState({
      draftProp = ensureDraftProp(),
      category = getDraftCategoryRecord(),
      draftTemplateRoot = state.draftTemplateRoot,
      draftTemplatePair = state.draftTemplatePair
    } = {}) {
      var _a2, _b2;
      if (!draftProp || !category || category.slotKey !== "wingSet" || isNoWingProxyRecord(draftProp)) {
        return { mode: null, side: null };
      }
      if (isBaseWingProxyRecord(draftProp)) {
        return { mode: "both", side: "left" };
      }
      const legacyPreviewSide = normalizeWingPreviewSide((_a2 = draftProp == null ? void 0 : draftProp.preview) == null ? void 0 : _a2.singleWingSide, null);
      const authoringPreview = getDraftWingAuthoringPreview(draftProp);
      const derivedSide = legacyPreviewSide || authoringPreview.sourceSide || inferWingSideFromAttachment(draftProp.attachment);
      if (authoringPreview.mode === "isolatedHalf") {
        return {
          mode: authoringPreview.mirrorToBoth ? "both" : "single",
          side: derivedSide || (authoringPreview.mirrorToBoth ? "left" : "right")
        };
      }
      const hasTemplatePair = Boolean((draftTemplatePair == null ? void 0 : draftTemplatePair.left) && (draftTemplatePair == null ? void 0 : draftTemplatePair.right));
      if (hasTemplatePair || ((_b2 = draftProp.attachment) == null ? void 0 : _b2.mirrorMode) === "paired") {
        return { mode: "both", side: derivedSide || "left" };
      }
      if (draftTemplateRoot) {
        return { mode: "single", side: derivedSide || "right" };
      }
      return { mode: null, side: derivedSide };
    }
    function setWingSyncPreviewState(mode, side = null) {
      var _a2;
      state.wingSyncPreview = {
        mode: mode === "both" || mode === "single" ? mode : null,
        side: normalizeWingPreviewSide(side, (_a2 = state.wingSyncPreview) == null ? void 0 : _a2.side)
      };
      if (!state.wingSyncPreview.mode) {
        state.wingSyncPreview.side = null;
      } else if (!state.wingSyncPreview.side) {
        state.wingSyncPreview.side = state.wingSyncPreview.mode === "both" ? "left" : "right";
      }
    }
    function resetWingSyncPreviewState(options = {}) {
      state.wingSyncPreview = cloneWingSyncPreviewState(getDefaultWingSyncPreviewState(options));
      return state.wingSyncPreview;
    }
    function getDraftWingSingleSide(draftProp = ensureDraftProp()) {
      var _a2;
      const defaultState = getDefaultWingSyncPreviewState({ draftProp });
      return normalizeWingPreviewSide((_a2 = state.wingSyncPreview) == null ? void 0 : _a2.side, defaultState.side || "right");
    }
    function setDraftWingSingleSide(side) {
      const normalizedSide = normalizeWingPreviewSide(side, getDraftWingSingleSide());
      setWingSyncPreviewState("single", normalizedSide);
    }
    function clearDraftWingSingleSide() {
      state.wingSyncPreview.side = null;
    }
    function getWingSingleAnchorForDraft(draftProp = ensureDraftProp()) {
      return getDraftWingSingleSide(draftProp) === "left" ? xio.slotAnchors.wingSet.left : xio.slotAnchors.wingSet.right;
    }
    function getEffectiveWingSyncPreviewMode(draftProp = ensureDraftProp(), category = getDraftCategoryRecord()) {
      var _a2, _b2;
      if (!draftProp || !category || category.slotKey !== "wingSet" || isNoWingProxyRecord(draftProp)) {
        return null;
      }
      if (isBaseWingProxyRecord(draftProp)) {
        return "both";
      }
      if (((_a2 = state.wingSyncPreview) == null ? void 0 : _a2.mode) === "both" || ((_b2 = state.wingSyncPreview) == null ? void 0 : _b2.mode) === "single") {
        return state.wingSyncPreview.mode;
      }
      return getDefaultWingSyncPreviewState({ draftProp, category }).mode;
    }
    function getEffectiveWingSyncPreviewSide(draftProp = ensureDraftProp(), category = getDraftCategoryRecord()) {
      var _a2;
      if (!draftProp || !category || category.slotKey !== "wingSet") {
        return "right";
      }
      const defaultState = getDefaultWingSyncPreviewState({ draftProp, category });
      return normalizeWingPreviewSide((_a2 = state.wingSyncPreview) == null ? void 0 : _a2.side, defaultState.side || "right");
    }
    function canSyncBothWings(draftProp = ensureDraftProp(), category = getDraftCategoryRecord()) {
      if (!draftProp || !category || category.slotKey !== "wingSet" || isNoWingProxyRecord(draftProp)) {
        return false;
      }
      return hasLoadedWingDraftAsset(draftProp, category);
    }
    function canSyncOneWing(draftProp = ensureDraftProp(), category = getDraftCategoryRecord()) {
      if (!draftProp || !category || category.slotKey !== "wingSet") {
        return false;
      }
      if (isNoWingProxyRecord(draftProp) || isBaseWingProxyRecord(draftProp)) {
        return false;
      }
      return Boolean(state.draftTemplateRoot || hasDraftWingPairSource());
    }
    function syncBaseWingVisibility(draftProp = ensureDraftProp(), category = getDraftCategoryRecord()) {
      const shouldHide = shouldHideBaseWings(draftProp, category);
      xio.leftWingBaseMesh.visible = !shouldHide;
      xio.rightWingBaseMesh.visible = !shouldHide;
    }
    function renderWorkspaceState() {
      var _a2, _b2, _c;
      const draftProp = ensureDraftProp();
      const selectedProp = getSelectedLiveProp();
      const category = getDraftCategoryRecord();
      const isCreatorOnly = isCreatorOnlyPropRecord(draftProp);
      const hasLiveStageProp = Boolean(state.stageSelection && selectedProp) && !isCreatorOnlyPropRecord(selectedProp);
      const hasDraftStageProp = Boolean(state.stageSelection) && !selectedProp;
      const localBlobDraft = isBlobBackedLocalDraft(draftProp);
      const draftOriginLabel = selectedProp ? isCreatorOnlyPropRecord(selectedProp) ? "XiO standard asset" : "Live inventory" : localBlobDraft ? "Local upload" : isGeneratedPropPreview2(draftProp.preview) ? "Generated stage" : draftProp.assetUrl ? state.publishEnabled ? "Uploaded draft asset" : "Draft asset reference" : draftProp.eyePreset || draftProp.materialPreset || draftProp.label ? "Workspace draft" : "Fresh draft";
      draftOriginChip.textContent = draftOriginLabel;
      draftSourceInline.textContent = state.draftSourceLabel || "No GLB loaded";
      draftCategoryLabel.textContent = (category == null ? void 0 : category.label) || "Unassigned";
      const wingPreviewMode = getEffectiveWingSyncPreviewMode(draftProp, category);
      const wingPreviewLabel = (category == null ? void 0 : category.slotKey) === "wingSet" ? isNoWingProxyRecord(draftProp) ? "No wings" : wingPreviewMode === "both" ? "Both wings preview" : wingPreviewMode === "single" ? `One wing preview (${getEffectiveWingSyncPreviewSide(draftProp, category)})` : ((_a2 = draftProp.attachment) == null ? void 0 : _a2.mirrorMode) === "paired" ? "Mirrored pair" : "" : "";
      draftSlotLabel.textContent = `${getSlotLabel(category == null ? void 0 : category.slotKey)}${wingPreviewLabel ? ` \xB7 ${wingPreviewLabel}` : ""}`;
      currentAssetLabel.textContent = state.draftSourceLabel || "No GLB loaded";
      if (state.editSession.active) {
        setSelectionLabel(`Editing ${((_b2 = state.editSession.baselineProp) == null ? void 0 : _b2.label) || draftProp.label || "current prop"}`);
        stageHintLabel.textContent = "Adjust the selected prop directly in the stage, then Save Edit or Cancel.";
        if (transformSection) transformSection.open = true;
      } else if (state.motionPreviewEnabled) {
        setSelectionLabel(`Previewing ${(selectedProp == null ? void 0 : selectedProp.label) || draftProp.label || "XiO motion"}`);
        stageHintLabel.textContent = "Motion preview is running. Pause preview when you want precise transform edits.";
      } else if (hasLiveStageProp) {
        setSelectionLabel(`Ready: ${(selectedProp == null ? void 0 : selectedProp.label) || draftProp.label || "current prop"}`);
        stageHintLabel.textContent = "Prop is loaded on XiO. Click Edit Prop when you want resize, move, or rotate controls.";
      } else if (hasDraftStageProp) {
        setSelectionLabel(`Draft: ${draftProp.label || "current prop"}`);
        stageHintLabel.textContent = "Local draft is loaded on XiO. Use the transform section or drag the gizmo directly to refine placement.";
      } else if (selectedProp) {
        setSelectionLabel(`Equipped: ${selectedProp.label}`);
        stageHintLabel.textContent = ((_c = selectedProp.preview) == null ? void 0 : _c.kind) === "xioNoWingProxy" ? "XiO is now in a clean no-wings state. Drop a GLB or equip another wing set when you are ready." : isCreatorOnlyPropRecord(selectedProp) ? "XiO signature wings are active. Equip another prop to edit transforms." : "Live prop equipped. Use Focus Prop for inspection or Edit Prop for transform tools.";
      } else {
        setSelectionLabel("Draft Mode");
        stageHintLabel.textContent = "";
      }
      publishPropButton.textContent = isCreatorOnly ? "Built-in XiO Asset" : localBlobDraft && !state.publishEnabled ? "Manager Route Required" : state.publishEnabled ? state.editSession.active ? "Save to Live Game" : "Add Prop to Game" : "Save Draft Locally";
      publishPropButton.disabled = isCreatorOnly || localBlobDraft;
      publishPropButton.title = localBlobDraft ? "Standalone local drafts cannot persist dropped GLB files after refresh. Open the manager route to publish this asset." : "";
      archivePropButton.disabled = !selectedProp || isCreatorOnlyPropRecord(selectedProp);
      archivePropButton.title = archivePropButton.disabled ? "Archive is available for live catalog props only." : "";
      loadSelectedLiveButton.disabled = !state.selectedLivePropKey;
      if (localBlobDraft && !state.publishEnabled && !state.editSession.active) {
        publishStateLabel.textContent = "Local GLB preview only";
      }
    }
    function clearEditSession() {
      state.editSession.active = false;
      state.editSession.propKey = null;
      state.editSession.baselineProp = null;
    }
    function startEditSession(propRecord) {
      state.editSession.active = true;
      state.editSession.propKey = propRecord.key;
      state.editSession.baselineProp = deepCopyProp(propRecord);
    }
    function renderEditSessionControls() {
      var _a2, _b2;
      const isEditing = state.editSession.active;
      const baselineLabel = (_a2 = state.editSession.baselineProp) == null ? void 0 : _a2.label;
      const currentLabel = ((_b2 = getSelectedLiveProp()) == null ? void 0 : _b2.label) || ensureDraftProp().label || "current prop";
      const selectedProp = getSelectedLiveProp();
      const hasLiveEditableStageProp = Boolean(state.stageSelection && selectedProp) && !isCreatorOnlyPropRecord(selectedProp);
      editSessionGroup.hidden = !isEditing;
      editSessionLabel.textContent = isEditing ? `Editing ${baselineLabel || currentLabel}` : "Editing current prop";
      saveEditButton.disabled = !isEditing;
      cancelEditButton.disabled = !isEditing;
      editPropToolbarButton.disabled = !hasLiveEditableStageProp;
    }
    function renderStageToolbarControls() {
      const selectedProp = getSelectedLiveProp();
      const draftProp = ensureDraftProp();
      const category = getDraftCategoryRecord();
      const canUseTransformShortcuts = hasEditableStageProp() && !state.motionPreviewEnabled;
      const canUseAutoLockFit = canAutoLockCurrentDraft(draftProp, category);
      const canUseBothWingSync = canSyncBothWings(draftProp, category);
      const canUseOneWingSync = canSyncOneWing(draftProp, category);
      const activeWingSyncMode = getEffectiveWingSyncPreviewMode(draftProp, category);
      const placementDepthMode = getDraftPlacementDepthMode();
      const toggleToFront = placementDepthMode === "behind";
      const placementActionLabel = toggleToFront ? "Bring prop in front of XiO" : "Send prop behind XiO";
      motionPreviewButton.textContent = state.motionPreviewEnabled ? "Pause Preview" : "Play Preview";
      motionPreviewButton.classList.toggle("is-active", state.motionPreviewEnabled);
      motionPreviewButton.setAttribute("aria-pressed", state.motionPreviewEnabled ? "true" : "false");
      autoLockFitButton.disabled = !canUseAutoLockFit;
      autoLockFitButton.setAttribute("aria-pressed", "false");
      autoLockFitButton.title = canUseAutoLockFit ? (category == null ? void 0 : category.slotKey) === "headWear" ? "Detect the best XiO headwear fit, snap the crown or hat into place, then fine-tune it manually." : `Snap this ${(category == null ? void 0 : category.label) || "single-slot prop"} into XiO\u2019s ${(category == null ? void 0 : category.label) || "active"} slot and seed the transform controls.` : (category == null ? void 0 : category.slotKey) === "wingSet" ? "Auto Lock / Auto Fit is for headwear and body gear single-slot props." : "Load or drop a single-slot GLB into the XiO stage before using Auto Lock / Auto Fit.";
      syncBothWingsButton.disabled = !canUseBothWingSync;
      syncBothWingsButton.classList.toggle("is-active", canUseBothWingSync && activeWingSyncMode === "both");
      syncBothWingsButton.setAttribute("aria-pressed", canUseBothWingSync && activeWingSyncMode === "both" ? "true" : "false");
      syncBothWingsButton.title = canUseBothWingSync ? isBaseWingProxyRecord(draftProp) ? "Confirm XiO signature glow wings in full two-wing motion preview." : "Preview this wing as a full two-wing sync on XiO." : (category == null ? void 0 : category.slotKey) !== "wingSet" ? "Sync Both Wings is available only for wing props." : isNoWingProxyRecord(draftProp) ? "Equip or drop a wing first, then sync both wings." : "Load a wing into the XiO stage before syncing both wings.";
      syncOneWingButton.disabled = !canUseOneWingSync;
      syncOneWingButton.classList.toggle("is-active", canUseOneWingSync && activeWingSyncMode === "single");
      syncOneWingButton.setAttribute("aria-pressed", canUseOneWingSync && activeWingSyncMode === "single" ? "true" : "false");
      syncOneWingButton.title = canUseOneWingSync ? "Preview just one wing side while XiO keeps native flap motion." : (category == null ? void 0 : category.slotKey) !== "wingSet" ? "Sync One Wing is available only for wing props." : isNoWingProxyRecord(draftProp) ? "Equip or drop a wing first, then sync one wing." : isBaseWingProxyRecord(draftProp) ? "XiO base glow wings always preview as a full two-wing set." : "Load a wing into the XiO stage before syncing one wing.";
      turntableButton.textContent = state.turntableEnabled ? "Turntable On" : "Turntable Off";
      turntableButton.classList.toggle("is-active", state.turntableEnabled && !state.motionPreviewEnabled);
      turntableButton.disabled = state.motionPreviewEnabled;
      turntableButton.title = state.motionPreviewEnabled ? "Pause motion preview before using the turntable." : "";
      stageTransformShortcutButtons.forEach((button) => {
        const modeLabel = button.dataset.transformMode === "translate" ? "Move" : button.dataset.transformMode === "rotate" ? "Rotate" : "Scale";
        button.disabled = !canUseTransformShortcuts;
        button.title = canUseTransformShortcuts ? modeLabel : state.motionPreviewEnabled ? "Pause preview before editing this prop." : selectedProp && isCreatorOnlyPropRecord(selectedProp) ? "XiO signature wings use built-in motion and do not expose transform handles." : "Equip a live or draft prop to use transform shortcuts.";
      });
      togglePlacementDepthButton.disabled = !canUseTransformShortcuts;
      togglePlacementDepthButton.classList.toggle("is-active", placementDepthMode === "front" && canUseTransformShortcuts);
      togglePlacementDepthButton.setAttribute("aria-pressed", placementDepthMode === "front" && canUseTransformShortcuts ? "true" : "false");
      togglePlacementDepthButton.setAttribute("aria-label", placementActionLabel);
      togglePlacementDepthButton.title = canUseTransformShortcuts ? placementActionLabel : state.motionPreviewEnabled ? "Pause preview before moving this prop in front of or behind XiO." : selectedProp && isCreatorOnlyPropRecord(selectedProp) ? "XiO signature wing states do not expose placement depth controls." : "Equip a live or draft prop to move it in front of or behind XiO.";
    }
    function formatWingMotionValue(controlKey, value) {
      if (controlKey === "direction") {
        return value === "reverse" ? "Reverse" : "Normal";
      }
      if (controlKey === "phaseOffset" || controlKey === "pitch" || controlKey === "shoulderSpread") {
        return Number(value).toFixed(2);
      }
      return Number(value).toFixed(2);
    }
    function syncWingMotionInputGroup(groupKey, profile, { disabled = false } = {}) {
      const controls = wingMotionInputs[groupKey];
      const valueLabels = wingMotionValueLabels[groupKey];
      if (!controls) {
        return;
      }
      Object.entries(controls).forEach(([controlKey, input]) => {
        if (!input) return;
        const rawValue = profile == null ? void 0 : profile[controlKey];
        input.disabled = disabled;
        input.value = controlKey === "direction" ? rawValue === "reverse" ? "reverse" : "normal" : String(rawValue != null ? rawValue : input.value);
        if (valueLabels == null ? void 0 : valueLabels[controlKey]) {
          valueLabels[controlKey].textContent = formatWingMotionValue(controlKey, rawValue != null ? rawValue : input.value);
        }
      });
    }
    function renderWingAuthoringControls() {
      var _a2, _b2, _c;
      const draftProp = ensureDraftProp();
      const category = getDraftCategoryRecord();
      const isWingDraft = (category == null ? void 0 : category.slotKey) === "wingSet";
      const canUseWingAuthoring = isWingDraft && !isNoWingProxyRecord(draftProp) && !isBaseWingProxyRecord(draftProp) && hasDraftWingAuthoringSource();
      if (wingSourceSection) {
        wingSourceSection.hidden = !isWingDraft;
      }
      if (!isWingDraft || !wingSourceSection) {
        return;
      }
      const authoringPreview = getDraftWingAuthoringPreview(draftProp);
      const usingPairSource = Boolean(((_a2 = state.draftTemplateSourcePair) == null ? void 0 : _a2.left) && ((_b2 = state.draftTemplateSourcePair) == null ? void 0 : _b2.right));
      const sourceLabel = authoringPreview.mode === "isolatedHalf" ? `${authoringPreview.sourceSide === "right" ? "Right" : "Left"} half isolated` : usingPairSource ? "Original pair source" : "Original GLB";
      const mirrorLabel = authoringPreview.mode === "isolatedHalf" ? authoringPreview.mirrorToBoth ? "Mirrored to both wings" : `${authoringPreview.sourceSide === "right" ? "Right" : "Left"} wing only` : ((_c = draftProp.attachment) == null ? void 0 : _c.mirrorMode) === "paired" ? "Original mirrored pair" : "Original single wing";
      wingAuthoringSourceLabel.textContent = sourceLabel;
      wingAuthoringModeLabel.textContent = mirrorLabel;
      wingAutoIsolateButton.disabled = !canUseWingAuthoring;
      wingAutoIsolateButton.title = canUseWingAuthoring ? "Auto-isolate one wing half from the loaded source and prepare it for mirroring." : "Load a wing GLB or live wing prop before isolating a wing source.";
      wingResetSourceButton.disabled = !canUseWingAuthoring || authoringPreview.mode !== "isolatedHalf";
      wingUseLeftButton.disabled = !canUseWingAuthoring;
      wingUseRightButton.disabled = !canUseWingAuthoring;
      wingUseLeftButton.classList.toggle("is-active", authoringPreview.sourceSide !== "right");
      wingUseRightButton.classList.toggle("is-active", authoringPreview.sourceSide === "right");
      wingMirrorBothToggle.checked = authoringPreview.mirrorToBoth;
      wingMirrorBothToggle.disabled = !canUseWingAuthoring || authoringPreview.mode !== "isolatedHalf";
      wingSplitOffsetInput.value = String(authoringPreview.splitOffset);
      wingTrimMarginInput.value = String(authoringPreview.trimMargin);
      wingSplitOffsetInput.disabled = !canUseWingAuthoring || authoringPreview.mode !== "isolatedHalf" || usingPairSource;
      wingTrimMarginInput.disabled = !canUseWingAuthoring || authoringPreview.mode !== "isolatedHalf" || usingPairSource;
      wingSplitOffsetValue.textContent = Number(authoringPreview.splitOffset).toFixed(2);
      wingTrimMarginValue.textContent = Number(authoringPreview.trimMargin).toFixed(2);
    }
    function renderWingMotionControls() {
      const draftProp = ensureDraftProp();
      const category = getDraftCategoryRecord();
      const isWingDraft = (category == null ? void 0 : category.slotKey) === "wingSet";
      const canTuneWingMotion = canTuneCurrentWingMotion(draftProp, category);
      if (wingMotionSection) {
        wingMotionSection.hidden = !isWingDraft;
      }
      if (!isWingDraft || !wingMotionSection) {
        return;
      }
      const motionPreview = getDraftWingMotionPreview(draftProp);
      const resolvedProfiles = resolveWingMotionProfiles2(motionPreview);
      wingMotionPreviewButton.textContent = state.motionPreviewEnabled ? "Pause Motion Preview" : "Play Motion Preview";
      wingMotionPreviewButton.classList.toggle("is-active", state.motionPreviewEnabled);
      wingMotionPreviewButton.disabled = !canTuneWingMotion;
      wingMotionLinkedToggle.checked = motionPreview.linked !== false;
      wingMotionLinkedToggle.disabled = !canTuneWingMotion;
      wingMotionMasterCard.hidden = false;
      wingMotionLeftCard.hidden = motionPreview.linked !== false;
      wingMotionRightCard.hidden = motionPreview.linked !== false;
      wingMotionMasterChip.textContent = motionPreview.linked !== false ? "Both wings" : getDefaultWingMotionChannelLabel(resolvedProfiles.master);
      syncWingMotionInputGroup("master", resolvedProfiles.master, { disabled: !canTuneWingMotion });
      syncWingMotionInputGroup("left", resolvedProfiles.left, { disabled: !canTuneWingMotion || motionPreview.linked !== false });
      syncWingMotionInputGroup("right", resolvedProfiles.right, { disabled: !canTuneWingMotion || motionPreview.linked !== false });
    }
    function setMotionPreviewEnabled(enabled, { silent = false } = {}) {
      const nextEnabled = Boolean(enabled);
      if (state.motionPreviewEnabled === nextEnabled) {
        renderStageToolbarControls();
        return;
      }
      state.motionPreviewEnabled = nextEnabled;
      if (nextEnabled) {
        resetPreviewMotionPose();
        presentCurrentLoadInStage();
        if (!silent) {
          log("Motion preview started. XiO is now animating with live flap and hover movement.");
        }
      } else {
        resetPreviewMotionPose();
        if (!silent) {
          log("Motion preview paused.");
        }
      }
      transformControls.visible = Boolean(state.stageSelection) && !nextEnabled;
      renderAll();
    }
    function setTransformMode(mode) {
      state.transformMode = mode;
      transformControls.setMode(state.transformMode);
      transformModeButtons.forEach((entry) => {
        entry.classList.toggle("is-active", entry.dataset.transformMode === mode);
        entry.setAttribute("aria-pressed", entry.dataset.transformMode === mode ? "true" : "false");
      });
    }
    function updatePublishStatus() {
      publishModeChip.textContent = state.publishEnabled ? "Live Publish Enabled" : "Local Draft Mode";
      publishStateLabel.textContent = state.publishEnabled ? "Connected to manager host" : state.publishReason || "Saving locally only";
    }
    function setDraftCategoryKey(categoryKey) {
      state.draftCategoryKey = categoryKey;
      const draftProp = ensureDraftProp();
      draftProp.categoryKey = categoryKey;
      if (categoryKey !== "wingSet" && draftProp.attachment.mirrorMode === "paired") {
        draftProp.attachment.mirrorMode = "single";
      }
      if (categoryKey !== "wingSet") {
        setWingSyncPreviewState(null, null);
        clearDraftWingAuthoringPreview();
      }
      propMirrorToggle.checked = draftProp.attachment.mirrorMode === "paired";
      propMirrorToggle.disabled = categoryKey !== "wingSet";
    }
    function syncPropForm() {
      var _a2;
      const draftProp = ensureDraftProp();
      propLabelInput.value = draftProp.label || "";
      propKeyInput.value = draftProp.key || "";
      propCategorySelect.value = draftProp.categoryKey || ((_a2 = getCategories()[0]) == null ? void 0 : _a2.key) || "";
      propRaritySelect.value = draftProp.rarity || "rare";
      propDescriptionInput.value = draftProp.description || "";
      propTagsInput.value = (draftProp.tags || []).join(", ");
      propActiveToggle.checked = draftProp.active !== false;
      propMysteryToggle.checked = draftProp.mysteryBoxEnabled !== false;
      propMirrorToggle.checked = draftProp.categoryKey === "wingSet" ? getDraftWingAuthoringPreview(draftProp).mirrorToBoth : draftProp.attachment.mirrorMode === "paired";
      propMirrorToggle.disabled = draftProp.categoryKey !== "wingSet";
      eyePresetSelect.value = draftProp.eyePreset || "";
      materialPresetSelect.value = draftProp.materialPreset || "";
      transformInputs.position.forEach((input, index) => {
        var _a3;
        input.value = String((_a3 = draftProp.attachment.position[index]) != null ? _a3 : 0);
      });
      transformInputs.rotation.forEach((input, index) => {
        var _a3;
        input.value = String((_a3 = draftProp.attachment.rotation[index]) != null ? _a3 : 0);
      });
      transformInputs.scale.forEach((input, index) => {
        var _a3;
        input.value = String((_a3 = draftProp.attachment.scale[index]) != null ? _a3 : 1);
      });
      currentAssetLabel.textContent = state.draftSourceLabel;
    }
    function syncCategoryForm(category) {
      var _a2, _b2;
      const currentCategory = category === void 0 ? getCategoryEditorRecord() || null : category;
      const categoryDraft = currentCategory || buildNewCategoryDraft();
      categoryKeyInput.value = (currentCategory == null ? void 0 : currentCategory.key) || "";
      categoryLabelInput.value = categoryDraft.label || "";
      categorySlotSelect.value = categoryDraft.slotKey || "wingSet";
      categoryEquipLimitInput.value = String((_a2 = categoryDraft.equipLimit) != null ? _a2 : 1);
      categorySortOrderInput.value = String((_b2 = categoryDraft.sortOrder) != null ? _b2 : 0);
      categoryEnabledToggle.checked = categoryDraft.enabled !== false;
      if (categoryEditorSelect) {
        categoryEditorSelect.value = (currentCategory == null ? void 0 : currentCategory.key) || CATEGORY_EDITOR_NEW_VALUE;
      }
      if (deleteCategoryButton) {
        const isProtectedCategory = Boolean((currentCategory == null ? void 0 : currentCategory.key) && CORE_CATEGORY_KEYS.has(currentCategory.key));
        deleteCategoryButton.disabled = !(currentCategory == null ? void 0 : currentCategory.key) || isProtectedCategory;
        deleteCategoryButton.title = isProtectedCategory ? "XiO core categories stay available." : (currentCategory == null ? void 0 : currentCategory.key) ? `Delete ${currentCategory.label}` : "Select a saved category to delete it.";
      }
    }
    function renderCategoryOptions() {
      var _a2;
      const categories = getCategories();
      propCategorySelect.innerHTML = categories.map((category) => `<option value="${category.key}">${category.label}</option>`).join("");
      if (categoryEditorSelect) {
        categoryEditorSelect.innerHTML = [
          `<option value="${CATEGORY_EDITOR_NEW_VALUE}">Add New Category</option>`,
          ...categories.map((category) => `<option value="${category.key}">${category.label}</option>`)
        ].join("");
      }
      liveCategoryFilter.innerHTML = [
        '<option value="all">All categories</option>',
        ...categories.map((category) => `<option value="${category.key}">${category.label}</option>`)
      ].join("");
      categorySlotSelect.innerHTML = Object.values(XIO_SLOT_DEFINITIONS2).filter((slot) => slot.mode !== "appearance").map((slot) => `<option value="${slot.key}">${slot.label}</option>`).join("");
      if (!categories.find((entry) => entry.key === state.draftCategoryKey) && categories[0]) {
        state.draftCategoryKey = categories[0].key;
      }
      if (!categories.find((entry) => entry.key === ensureDraftProp().categoryKey) && categories[0]) {
        setDraftCategoryKey(categories[0].key);
      }
      if (state.liveCategoryFilter !== "all" && !categories.find((entry) => entry.key === state.liveCategoryFilter)) {
        state.liveCategoryFilter = "all";
      }
      if (state.categoryEditorKey && !categories.find((entry) => entry.key === state.categoryEditorKey)) {
        state.categoryEditorKey = null;
      }
      propCategorySelect.value = ensureDraftProp().categoryKey || state.draftCategoryKey;
      liveCategoryFilter.value = state.liveCategoryFilter;
      categorySlotSelect.value = ((_a2 = getCategoryByKey(state.draftCategoryKey)) == null ? void 0 : _a2.slotKey) || categorySlotSelect.value;
      if (categoryEditorSelect) {
        categoryEditorSelect.value = state.categoryEditorKey || CATEGORY_EDITOR_NEW_VALUE;
      }
    }
    function renderPresetOptions() {
      eyePresetSelect.innerHTML = [
        '<option value="">Default</option>',
        ...Object.keys(XIO_EYE_APPEARANCE_PRESETS2).filter((key) => key !== "default").map((key) => `<option value="${key}">${key}</option>`)
      ].join("");
      materialPresetSelect.innerHTML = [
        '<option value="">Default</option>',
        ...Object.keys(XIO_MATERIAL_PRESETS2).filter((key) => key !== "default").map((key) => `<option value="${key}">${key}</option>`)
      ].join("");
    }
    function createAlphaWingPreviewTemplate() {
      const root = new THREE.Group();
      const colors = [8382719, 10875900, 14742270];
      colors.forEach((color, index) => {
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(1.3 - index * 0.16, 0.14 + index * 0.03, 0.08),
          new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.42,
            roughness: 0.2,
            metalness: 0.28
          })
        );
        blade.position.set(0.38 + index * 0.34, 0.18 - index * 0.12, index * 0.04);
        blade.rotation.z = -0.3 - index * 0.18;
        root.add(blade);
      });
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 20, 20),
        new THREE.MeshStandardMaterial({
          color: 14412542,
          emissive: 8246268,
          emissiveIntensity: 0.22,
          roughness: 0.32,
          metalness: 0.24
        })
      );
      core.position.set(0.08, 0.02, 0);
      root.add(core);
      return root;
    }
    function createRainbowWingPreviewTemplate() {
      const root = new THREE.Group();
      const palette = [16739179, 16757575, 16773749, 8316807, 8246268, 12616956];
      palette.forEach((color, index) => {
        const feather = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.08 + index * 0.01, 0.7 + index * 0.08, 6, 14),
          new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.12,
            roughness: 0.5,
            metalness: 0.06
          })
        );
        feather.position.set(0.25 + index * 0.18, 0.34 - index * 0.11, (index - 2.5) * 0.035);
        feather.rotation.z = -0.18 - index * 0.12;
        root.add(feather);
      });
      return root;
    }
    function createRoboticWingPreviewTemplate() {
      const root = new THREE.Group();
      const panelMaterial = new THREE.MeshStandardMaterial({
        color: 10135740,
        emissive: 6220500,
        emissiveIntensity: 0.08,
        roughness: 0.34,
        metalness: 0.92
      });
      [
        { size: [0.55, 0.18, 0.08], pos: [0.24, 0.18, 0.02], rot: -0.1 },
        { size: [0.74, 0.2, 0.08], pos: [0.62, 0.02, 0], rot: -0.28 },
        { size: [0.88, 0.22, 0.08], pos: [1.02, -0.18, -0.02], rot: -0.44 }
      ].forEach((panelConfig) => {
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(...panelConfig.size),
          panelMaterial.clone()
        );
        panel.position.set(...panelConfig.pos);
        panel.rotation.z = panelConfig.rot;
        root.add(panel);
      });
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 1.25, 12),
        new THREE.MeshStandardMaterial({
          color: 13358561,
          roughness: 0.26,
          metalness: 0.95
        })
      );
      strut.position.set(0.58, -0.04, 0);
      strut.rotation.z = -0.44;
      strut.rotation.x = Math.PI / 2;
      root.add(strut);
      return root;
    }
    function createOmegaWingPreviewTemplate() {
      const root = new THREE.Group();
      const membrane = new THREE.Mesh(
        new THREE.SphereGeometry(0.68, 22, 18, Math.PI * 1.12, Math.PI * 0.58, 0.32, Math.PI * 0.78),
        new THREE.MeshStandardMaterial({
          color: 8246268,
          emissive: 6809849,
          emissiveIntensity: 0.18,
          roughness: 0.16,
          metalness: 0.08,
          transparent: true,
          opacity: 0.82,
          side: THREE.DoubleSide
        })
      );
      membrane.position.set(0.72, 0.02, 0);
      membrane.rotation.z = -0.46;
      membrane.scale.set(1.08, 1.2, 0.16);
      root.add(membrane);
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.72, 0.04, 12, 36, Math.PI * 0.92),
        new THREE.MeshStandardMaterial({
          color: 14870768,
          emissive: 9684477,
          emissiveIntensity: 0.24,
          roughness: 0.24,
          metalness: 0.4
        })
      );
      rim.position.set(0.52, 0.05, 0);
      rim.rotation.z = -0.76;
      root.add(rim);
      return root;
    }
    function createLegacyWingPreviewTemplate(propRecord) {
      var _a2;
      const previewKind2 = (_a2 = propRecord == null ? void 0 : propRecord.preview) == null ? void 0 : _a2.kind;
      let root = null;
      switch (previewKind2) {
        case "alphaWingProxy":
          root = createAlphaWingPreviewTemplate();
          break;
        case "rainbowWingProxy":
          root = createRainbowWingPreviewTemplate();
          break;
        case "roboticWingProxy":
          root = createRoboticWingPreviewTemplate();
          break;
        case "omegaWingProxy":
          root = createOmegaWingPreviewTemplate();
          break;
        default:
          return null;
      }
      const scaleMultiplier = {
        alphaWingProxy: 3.2,
        rainbowWingProxy: 2.3,
        roboticWingProxy: 2.1,
        omegaWingProxy: 2.2
      }[previewKind2] || 1;
      root.scale.multiplyScalar(scaleMultiplier);
      root.scale.x *= -1;
      return root;
    }
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ canvas: creatorCanvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setClearColor(0, 0);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 1.2, 11.4);
    const orbitControls = new OrbitControls(camera, creatorCanvas);
    orbitControls.enableDamping = true;
    orbitControls.target.set(0, 0.35, 0);
    const transformControls = new TransformControls(camera, creatorCanvas);
    transformControls.setMode(state.transformMode);
    transformControls.addEventListener("dragging-changed", (event) => {
      orbitControls.enabled = !event.value;
      if (event.value && state.motionPreviewEnabled) {
        setMotionPreviewEnabled(false, { silent: true });
        log("Motion preview paused so you can edit the prop cleanly.");
      }
      if (!event.value) {
        commitDraftHistoryStep();
      }
    });
    scene.add(transformControls);
    const ambientLight = new THREE.AmbientLight(15007712, 0.9);
    scene.add(ambientLight);
    const hemiLight = new THREE.HemisphereLight(9425151, 7119429, 1.2);
    scene.add(hemiLight);
    const sunLight = new THREE.DirectionalLight(16774867, 2.1);
    sunLight.position.set(20, 26, 10);
    scene.add(sunLight);
    const fillLight = new THREE.DirectionalLight(15138769, 0.65);
    fillLight.position.set(-16, 10, 8);
    scene.add(fillLight);
    const petRim = new THREE.PointLight(10348799, 8, 55);
    petRim.position.set(0, 2, -8);
    scene.add(petRim);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(9, 64),
      new THREE.MeshStandardMaterial({
        color: 10934640,
        roughness: 0.96,
        metalness: 0.02,
        transparent: true,
        opacity: 0.22
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.35;
    scene.add(floor);
    const xio = createXioCharacter2({
      THREE,
      SVGLoader,
      scene,
      svgData: XIO_DEFAULT_SVG_DATA2
    });
    const draftStage = {
      singlePivot: null,
      leftPivot: null,
      rightPivot: null
    };
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const CREATOR_PREVIEW_MOTION = Object.freeze({
      baseFlapHz: 0.85,
      flapHzVariance: 0.02,
      pitchStiffness: 16,
      pitchDamping: 7.8,
      rollStiffness: 14,
      rollDamping: 7,
      headFollowAlpha: 0.09
    });
    const previewMotionState = {
      elapsed: 0,
      phase: 0,
      y: 0.12,
      yVel: 0,
      pitch: 0,
      pitchVel: 0,
      roll: 0,
      rollVel: 0,
      aero: 0.5
    };
    function applyWingGroupPoseDetailed({
      leftZ,
      rightZ,
      leftX,
      rightX,
      leftY,
      rightY,
      shoulderShift = 0
    } = {}) {
      var _a2, _b2;
      const leftBasePosition = (_a2 = xio.leftWingGroup.userData) == null ? void 0 : _a2.basePosition;
      const rightBasePosition = (_b2 = xio.rightWingGroup.userData) == null ? void 0 : _b2.basePosition;
      if (leftBasePosition) {
        xio.leftWingGroup.position.copy(leftBasePosition);
      }
      if (rightBasePosition) {
        xio.rightWingGroup.position.copy(rightBasePosition);
      }
      xio.leftWingGroup.position.x -= shoulderShift;
      xio.rightWingGroup.position.x += shoulderShift;
      xio.leftWingGroup.rotation.z = leftZ;
      xio.rightWingGroup.rotation.z = rightZ;
      xio.leftWingGroup.rotation.x = leftX;
      xio.rightWingGroup.rotation.x = rightX;
      xio.leftWingGroup.rotation.y = leftY;
      xio.rightWingGroup.rotation.y = rightY;
    }
    function applyWingGroupPose(leftZ, rightZ, wingX, wingSweep, shoulderShift = 0, sweepAdd = 0) {
      applyWingGroupPoseDetailed({
        leftZ,
        rightZ,
        leftX: wingX,
        rightX: wingX,
        leftY: wingSweep + sweepAdd,
        rightY: -wingSweep - sweepAdd,
        shoulderShift
      });
    }
    function canTuneCurrentWingMotion(draftProp = ensureDraftProp(), category = getDraftCategoryRecord()) {
      return Boolean((category == null ? void 0 : category.slotKey) === "wingSet" && !isNoWingProxyRecord(draftProp));
    }
    function applyPreviewMotionPoseFromCurrentState({ eyeDt = 1 / 60 } = {}) {
      const wingMotion = resolveWingMotionProfiles2(getDraftWingMotionPreview());
      const masterMotion = wingMotion.master;
      const leftMotion = wingMotion.left;
      const rightMotion = wingMotion.right;
      const t = previewMotionState.elapsed;
      const cursorX = Math.sin(t * 0.44) * 0.3;
      const cursorY = Math.cos(t * 0.32 + 0.45) * 0.18;
      const downstroke = Math.pow(previewMotionState.aero, 1.45);
      const upstroke = Math.pow(1 - previewMotionState.aero, 1.2);
      const wingAmplitude = 0.47 + Math.min(0.16, Math.abs(previewMotionState.yVel) * 0.15);
      xio.creatureGroup.position.y = previewMotionState.y;
      xio.creatureGroup.rotation.z = previewMotionState.roll;
      xio.creatureGroup.rotation.x += (previewMotionState.pitch - xio.creatureGroup.rotation.x) * CREATOR_PREVIEW_MOTION.headFollowAlpha;
      xio.creatureGroup.rotation.y += (cursorX * 0.14 - xio.creatureGroup.rotation.y) * CREATOR_PREVIEW_MOTION.headFollowAlpha;
      const baseWingFeather = 0.07 + upstroke * 0.2;
      const baseWingSweep = 0.03 + downstroke * 0.09 - upstroke * 0.025;
      const sampleWingPose = (profile, side) => {
        const direction = profile.direction === "reverse" ? -1 : 1;
        const phase = previewMotionState.phase * direction + profile.phaseOffset;
        const sideStroke = Math.sin(phase);
        const strokeHarmonic = Math.sin(phase * 2 - 0.35) * 0.12;
        const flap = sideStroke * wingAmplitude * profile.amplitude;
        const pitch = baseWingFeather + profile.pitch + sideStroke * 0.03 * profile.featherTwist + strokeHarmonic * 0.25;
        const sweep = baseWingSweep * profile.sweep + profile.shoulderSpread * 0.08;
        return side === "left" ? {
          z: flap + strokeHarmonic - 0.2,
          x: pitch,
          y: sweep
        } : {
          z: -flap - strokeHarmonic + 0.2,
          x: pitch,
          y: -sweep
        };
      };
      const leftPose = sampleWingPose(leftMotion, "left");
      const rightPose = sampleWingPose(rightMotion, "right");
      const shoulderShift = Math.max(-0.6, Math.min(1.1, (leftMotion.shoulderSpread + rightMotion.shoulderSpread) * 0.5));
      applyWingGroupPoseDetailed({
        leftZ: leftPose.z,
        rightZ: rightPose.z,
        leftX: leftPose.x,
        rightX: rightPose.x,
        leftY: leftPose.y,
        rightY: rightPose.y,
        shoulderShift
      });
      const bodyPulse = 1 + downstroke * 0.025 + Math.sin(t * 2.4) * 0.01;
      xio.bodyMesh.scale.set(
        1 - (bodyPulse - 1) * 0.35,
        1 + (bodyPulse - 1),
        1 - (bodyPulse - 1) * 0.24
      );
      const eyeTargetX = THREE.MathUtils.clamp(cursorX * 0.13, -0.1, 0.1);
      const eyeTargetY = THREE.MathUtils.clamp(cursorY * 0.1, -0.08, 0.08);
      xio.leftEye.update(eyeTargetX + 0.015, eyeTargetY, eyeDt);
      xio.rightEye.update(eyeTargetX - 0.015, eyeTargetY, eyeDt);
      return {
        master: masterMotion,
        left: leftMotion,
        right: rightMotion
      };
    }
    function resetPreviewMotionPose() {
      previewMotionState.elapsed = 0;
      previewMotionState.phase = 0;
      previewMotionState.y = 0.12;
      previewMotionState.yVel = 0;
      previewMotionState.pitch = 0;
      previewMotionState.pitchVel = 0;
      previewMotionState.roll = 0;
      previewMotionState.rollVel = 0;
      previewMotionState.aero = 0.5;
      xio.stuntRig.position.set(0, 0, 0);
      xio.stuntRig.rotation.set(0, 0, 0);
      xio.creatureGroup.position.y = 0;
      xio.creatureGroup.rotation.x = 0;
      xio.creatureGroup.rotation.y = 0;
      xio.creatureGroup.rotation.z = 0;
      xio.bodyMesh.scale.set(1, 1, 1);
      xio.leftEye.group.scale.setScalar(1);
      xio.rightEye.group.scale.setScalar(1);
      applyPreviewMotionPoseFromCurrentState({ eyeDt: 1 / 60 });
    }
    function updatePreviewMotion(dt) {
      const wingMotion = resolveWingMotionProfiles2(getDraftWingMotionPreview());
      const masterMotion = wingMotion.master;
      previewMotionState.elapsed += dt;
      const t = previewMotionState.elapsed;
      const cursorY = Math.cos(t * 0.32 + 0.45) * 0.18;
      const flapDirection = masterMotion.direction === "reverse" ? -1 : 1;
      const flapHz = masterMotion.flapHz + Math.sin(t * 0.42) * CREATOR_PREVIEW_MOTION.flapHzVariance;
      previewMotionState.phase += Math.PI * 2 * flapHz * dt * flapDirection;
      const stroke = Math.sin(previewMotionState.phase);
      const strokeVelNorm = Math.cos(previewMotionState.phase);
      const aeroRaw = 0.5 + 0.5 * strokeVelNorm;
      previewMotionState.aero += (aeroRaw - previewMotionState.aero) * Math.min(1, dt * 9);
      const downstroke = Math.pow(previewMotionState.aero, 1.45);
      const upstroke = Math.pow(1 - previewMotionState.aero, 1.2);
      const lift = 8.35 + downstroke * 2.25 + Math.abs(strokeVelNorm) * 0.62 - upstroke * 0.24;
      const yAccel = lift - 9.1 - (previewMotionState.y - 0.12) * 9.1 - previewMotionState.yVel * 4.6;
      previewMotionState.yVel += yAccel * dt;
      previewMotionState.y += previewMotionState.yVel * dt;
      previewMotionState.y = THREE.MathUtils.clamp(previewMotionState.y, -0.54, 0.86);
      const pitchTarget = -cursorY * 0.1 + (-downstroke * 0.06 + upstroke * 0.02);
      const pitchAccel = (pitchTarget - previewMotionState.pitch) * CREATOR_PREVIEW_MOTION.pitchStiffness - previewMotionState.pitchVel * CREATOR_PREVIEW_MOTION.pitchDamping;
      previewMotionState.pitchVel += pitchAccel * dt;
      previewMotionState.pitch += previewMotionState.pitchVel * dt;
      const rollTarget = Math.sin(previewMotionState.phase + Math.PI * 0.5) * 0.022;
      const rollAccel = (rollTarget - previewMotionState.roll) * CREATOR_PREVIEW_MOTION.rollStiffness - previewMotionState.rollVel * CREATOR_PREVIEW_MOTION.rollDamping;
      previewMotionState.rollVel += rollAccel * dt;
      previewMotionState.roll += previewMotionState.rollVel * dt;
      applyPreviewMotionPoseFromCurrentState({ eyeDt: dt });
    }
    function refreshWingMotionPreviewLive({ autoStart = false } = {}) {
      const draftProp = ensureDraftProp();
      const category = getDraftCategoryRecord();
      if (!canTuneCurrentWingMotion(draftProp, category)) {
        return false;
      }
      if (autoStart && !state.motionPreviewEnabled) {
        setMotionPreviewEnabled(true, { silent: true });
        return true;
      }
      applyPreviewMotionPoseFromCurrentState({ eyeDt: 1 / 60 });
      renderer.render(scene, camera);
      return true;
    }
    function getSelectableStageTargets() {
      return [draftStage.singlePivot, draftStage.leftPivot, draftStage.rightPivot].filter(Boolean);
    }
    function setStageSelection(target) {
      state.stageSelection = target || null;
      if (state.stageSelection) {
        transformControls.attach(state.stageSelection);
        transformControls.visible = !state.motionPreviewEnabled;
      } else {
        transformControls.detach();
        transformControls.visible = false;
      }
    }
    function findSelectableTarget(object) {
      const selectableTargets = getSelectableStageTargets();
      let current = object;
      while (current) {
        if (selectableTargets.includes(current)) {
          return current;
        }
        current = current.parent;
      }
      return null;
    }
    function fitCameraToCharacter() {
      orbitControls.target.set(0, 0.35, 0);
      camera.position.set(0, 1.2, 11.4);
      orbitControls.update();
    }
    function resetStagePresentationPose() {
      xio.stuntRig.position.set(0, 0, 0);
      xio.stuntRig.rotation.set(0, 0, 0);
      xio.creatureGroup.position.set(0, 0, 0);
      xio.creatureGroup.rotation.set(0, 0, 0);
    }
    function pauseTurntable(durationMs = 2600) {
      state.turntablePauseUntilMs = performance.now() + Math.max(0, Number(durationMs) || 0);
    }
    function presentCurrentLoadInStage({ disableTurntable = false } = {}) {
      if (disableTurntable) {
        state.turntableEnabled = false;
        renderStageToolbarControls();
      }
      resetStagePresentationPose();
      fitCameraToCharacter();
      pauseTurntable(2600);
    }
    function applySyncedWingDraftSelection(selectionKey) {
      selectStageSelectionByKey(selectionKey);
      renderAll();
    }
    function refreshSelectedLiveWingPreviewTemplates(selectedProp, draftProp = ensureDraftProp()) {
      if (!selectedProp || !isLiveGameWingPreviewKey2(selectedProp.key)) {
        return false;
      }
      const previewPair = buildLiveGameWingPreview2({
        propKey: selectedProp.key,
        THREE,
        GLTFLoader,
        renderer
      });
      const previewState = prepareDraftTemplatePairStateFromLivePreview(
        previewPair,
        `${selectedProp.label} (live game preview)`,
        draftProp
      );
      if (!previewState) {
        return false;
      }
      state.draftTemplateSourceRoot = null;
      state.draftTemplateSourcePair = previewState.draftTemplatePair;
      state.draftSourceLabel = previewState.draftSourceLabel;
      refreshDraftTemplatePresentationFromSource();
      return true;
    }
    function getPreferredWingSyncSide({
      fallbackForPaired = "left",
      fallbackForSingle = "right"
    } = {}) {
      var _a2;
      if (state.stageSelection === draftStage.leftPivot) return "left";
      if (state.stageSelection === draftStage.rightPivot) return "right";
      const previewSide = normalizeWingPreviewSide((_a2 = state.wingSyncPreview) == null ? void 0 : _a2.side, null);
      if (previewSide) {
        return previewSide;
      }
      if (hasDraftWingPairSource()) {
        return fallbackForPaired;
      }
      return inferCurrentSingleWingPreviewSide() || fallbackForSingle;
    }
    function getCurrentWingSyncSourceAttachment() {
      return captureAttachmentFromPivot(state.stageSelection) || captureAttachmentFromPivot(draftStage.singlePivot) || captureAttachmentFromPivot(draftStage.leftPivot) || captureAttachmentFromPivot(draftStage.rightPivot) || ensureDraftProp().attachment;
    }
    function syncBothWingsAnimationPreview() {
      var _a2, _b2, _c, _d, _e;
      const draftProp = ensureDraftProp();
      const category = getDraftCategoryRecord();
      const selectedProp = getSelectedLiveProp();
      if (!category || category.slotKey !== "wingSet") {
        log("Sync Both Wings is available only for wing props.");
        renderAll();
        return false;
      }
      if (isNoWingProxyRecord(draftProp)) {
        log("Equip or drop a wing first, then use Sync Both Wings.");
        renderAll();
        return false;
      }
      if (state.motionPreviewEnabled) {
        setMotionPreviewEnabled(false, { silent: true });
      }
      if (!state.stageSelection && (state.draftTemplateRoot || ((_a2 = state.draftTemplatePair) == null ? void 0 : _a2.left) || ((_b2 = state.draftTemplatePair) == null ? void 0 : _b2.right))) {
        rebuildDraftStage();
      }
      if (isBaseWingProxyRecord(draftProp)) {
        setWingSyncPreviewState("both", "left");
        commitDraftHistoryStep();
        state.turntableEnabled = false;
        setMotionPreviewEnabled(true, { silent: true });
        renderAll();
        log("Synced XiO Signature Glow Wings on both wings.");
        return true;
      }
      if (!state.draftTemplateRoot && !((_c = state.draftTemplatePair) == null ? void 0 : _c.left) && !((_d = state.draftTemplatePair) == null ? void 0 : _d.right)) {
        log("Load or drop a wing prop into the XiO stage before syncing both wings.");
        renderAll();
        return false;
      }
      refreshSelectedLiveWingPreviewTemplates(selectedProp, draftProp);
      const selectedSide = getPreferredWingSyncSide();
      const sourceAttachment = getCurrentWingSyncSourceAttachment();
      if (hasDraftWingPairSource() || ((_e = draftProp.attachment) == null ? void 0 : _e.mirrorMode) === "paired") {
        draftProp.attachment = normalizePairedWingAttachment(sourceAttachment);
      } else {
        draftProp.attachment = normalizeSingleWingAttachmentForSide(sourceAttachment, selectedSide);
      }
      setWingSyncPreviewState("both", selectedSide);
      rebuildDraftStage();
      const didAutoFit = autoFitDraftPlacementToSlot({
        targetSpanOverride: SLOT_STAGE_TARGET_SPANS.wingSet,
        preserveSelectionKey: selectedSide === "right" ? "right" : "left"
      });
      applySyncedWingDraftSelection(selectedSide === "right" ? "right" : "left");
      commitDraftHistoryStep();
      state.turntableEnabled = false;
      setMotionPreviewEnabled(true, { silent: true });
      const label = (selectedProp == null ? void 0 : selectedProp.label) || draftProp.label || "current wing";
      log(`Synced ${label} on both wings${didAutoFit ? " and auto-fit the wing sweep." : "."}`);
      return true;
    }
    function syncOneWingAnimationPreview() {
      var _a2, _b2, _c, _d, _e;
      const draftProp = ensureDraftProp();
      const category = getDraftCategoryRecord();
      const selectedProp = getSelectedLiveProp();
      if (!category || category.slotKey !== "wingSet") {
        log("Sync One Wing is available only for wing props.");
        renderAll();
        return false;
      }
      if (isNoWingProxyRecord(draftProp)) {
        log("Equip or drop a wing first, then use Sync One Wing.");
        renderAll();
        return false;
      }
      if (isBaseWingProxyRecord(draftProp)) {
        log("XiO signature glow wings always preview as a full two-wing set.");
        renderAll();
        return false;
      }
      if (state.motionPreviewEnabled) {
        setMotionPreviewEnabled(false, { silent: true });
      }
      if (!state.stageSelection && (state.draftTemplateRoot || ((_a2 = state.draftTemplatePair) == null ? void 0 : _a2.left) || ((_b2 = state.draftTemplatePair) == null ? void 0 : _b2.right))) {
        rebuildDraftStage();
      }
      if (!state.draftTemplateRoot && !((_c = state.draftTemplatePair) == null ? void 0 : _c.left) && !((_d = state.draftTemplatePair) == null ? void 0 : _d.right)) {
        log("Load or drop a wing prop into the XiO stage before syncing one wing.");
        renderAll();
        return false;
      }
      refreshSelectedLiveWingPreviewTemplates(selectedProp, draftProp);
      const selectedSide = getPreferredWingSyncSide({
        fallbackForPaired: "left",
        fallbackForSingle: inferCurrentSingleWingPreviewSide()
      });
      const sourceAttachment = getCurrentWingSyncSourceAttachment();
      if (hasDraftWingPairSource() || ((_e = draftProp.attachment) == null ? void 0 : _e.mirrorMode) === "paired") {
        draftProp.attachment = normalizePairedWingAttachment(sourceAttachment);
      } else {
        draftProp.attachment = normalizeSingleWingAttachmentForSide(sourceAttachment, selectedSide);
      }
      setWingSyncPreviewState("single", selectedSide);
      rebuildDraftStage();
      autoFitDraftPlacementToSlot({
        targetSpanOverride: SINGLE_WING_SYNC_TARGET_SPAN,
        preserveSelectionKey: "single"
      });
      applySyncedWingDraftSelection("single");
      commitDraftHistoryStep();
      state.turntableEnabled = false;
      setMotionPreviewEnabled(true, { silent: true });
      const label = (selectedProp == null ? void 0 : selectedProp.label) || draftProp.label || "current wing";
      log(`Synced ${label} on the ${selectedSide} wing only.`);
      return true;
    }
    async function activatePropEditing(propKey = state.selectedLivePropKey) {
      if (state.motionPreviewEnabled) {
        setMotionPreviewEnabled(false, { silent: true });
      }
      if (!propKey && !state.selectedLivePropKey) {
        log("Select a live prop first, then click Edit Prop.");
        return;
      }
      if (propKey && state.selectedLivePropKey !== propKey) {
        const loaded = await loadLiveProp(propKey, { resetView: false });
        if (!loaded || state.selectedLivePropKey !== propKey) {
          return;
        }
      } else if (!state.stageSelection && state.selectedLivePropKey) {
        const loaded = await loadLiveProp(state.selectedLivePropKey, { resetView: false });
        if (!loaded) {
          return;
        }
      }
      if (!state.stageSelection) {
        log("Select a live prop first, then click Edit Prop.");
        return;
      }
      const selectedProp = getSelectedLiveProp();
      if (isCreatorOnlyPropRecord(selectedProp)) {
        log("XiO signature wings are built-in and do not use prop transform handles. Equip another prop to edit it.");
        return;
      }
      if (selectedProp && (!state.editSession.active || state.editSession.propKey !== selectedProp.key)) {
        startEditSession(selectedProp);
      }
      resetDraftHistory();
      setTransformMode("scale");
      focusCurrentProp();
      renderAll();
      const label = (selectedProp == null ? void 0 : selectedProp.label) || ensureDraftProp().label || "current prop";
      log(`Edit Prop is active for ${label}. Resize handles are ready.`);
    }
    async function saveActiveEditSession() {
      var _a2;
      if (!state.editSession.active) {
        log("Edit mode is not active yet.");
        return;
      }
      const label = ensureDraftProp().label || ((_a2 = state.editSession.baselineProp) == null ? void 0 : _a2.label) || "current prop";
      await publishDraftProp({ archive: false });
      clearEditSession();
      resetDraftHistory();
      renderAll();
      log(`Saved edits for ${label}.`);
    }
    async function cancelActiveEditSession() {
      if (!state.editSession.active || !state.editSession.baselineProp) {
        log("Edit mode is not active yet.");
        return;
      }
      const baselineProp = deepCopyProp(state.editSession.baselineProp);
      const label = baselineProp.label || "current prop";
      await hydrateDraftFromPropRecord(baselineProp, {
        announce: false,
        resetView: false,
        preserveEditSession: true
      });
      clearEditSession();
      resetDraftHistory();
      renderAll();
      presentCurrentLoadInStage();
      log(`Canceled edits for ${label}.`);
    }
    function setCameraToBounds(bounds, {
      lateralOffsetFactor = 0,
      verticalOffsetFactor = 0.06,
      distanceMultiplier = 1.22,
      minDistance = 3.6,
      maxDistance = 18
    } = {}) {
      if (!bounds || bounds.isEmpty()) {
        fitCameraToCharacter();
        return;
      }
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      bounds.getCenter(center);
      bounds.getSize(size);
      const halfVerticalFov = THREE.MathUtils.degToRad(Math.max(camera.fov, 10) / 2);
      const aspect = Math.max(camera.aspect || 1, 0.65);
      const fitHeightDistance = Math.max(size.y, 0.8) * 0.5 / Math.tan(halfVerticalFov);
      const fitWidthDistance = Math.max(size.x, 0.8) * 0.5 / (Math.tan(halfVerticalFov) * aspect);
      const fitDepthDistance = Math.max(size.z, 0.4) * 1.2;
      const distance = THREE.MathUtils.clamp(
        Math.max(fitHeightDistance, fitWidthDistance, fitDepthDistance) * distanceMultiplier,
        minDistance,
        maxDistance
      );
      orbitControls.target.set(
        center.x,
        center.y + size.y * verticalOffsetFactor,
        center.z
      );
      camera.position.set(
        center.x + size.x * lateralOffsetFactor,
        orbitControls.target.y + Math.max(size.y * 0.08, 0.42),
        center.z + distance
      );
      orbitControls.update();
    }
    function focusCurrentProp() {
      const target = state.stageSelection;
      if (!target) {
        fitCameraToCharacter();
        return;
      }
      const bounds = new THREE.Box3().setFromObject(target);
      if (bounds.isEmpty()) {
        fitCameraToCharacter();
        return;
      }
      setCameraToBounds(bounds, {
        lateralOffsetFactor: 0.08,
        verticalOffsetFactor: 0.03,
        distanceMultiplier: 1.16,
        minDistance: 4.4,
        maxDistance: 13.5
      });
    }
    function getCurrentDraftStageBounds() {
      const pivots = [draftStage.singlePivot, draftStage.leftPivot, draftStage.rightPivot].filter(Boolean);
      if (!pivots.length) {
        return null;
      }
      return pivots.reduce((combinedBounds, pivot) => {
        const bounds = new THREE.Box3().setFromObject(pivot);
        if (bounds.isEmpty()) {
          return combinedBounds;
        }
        return combinedBounds ? combinedBounds.union(bounds) : bounds.clone();
      }, null);
    }
    function autoFitDraftPlacementToSlot({ targetSpanOverride = null, preserveSelectionKey = null } = {}) {
      const bounds = getCurrentDraftStageBounds();
      if (!bounds || bounds.isEmpty()) {
        return false;
      }
      const draftProp = ensureDraftProp();
      const size = new THREE.Vector3();
      bounds.getSize(size);
      const largestAxis = Math.max(size.x, size.y, size.z, 1e-4);
      const targetSpan = targetSpanOverride || SLOT_STAGE_TARGET_SPANS[draftProp.categoryKey] || 1.8;
      if (largestAxis >= targetSpan * 0.52 && largestAxis <= targetSpan * 1.9) {
        return false;
      }
      const scaleFactor = THREE.MathUtils.clamp(targetSpan / largestAxis, 0.08, 40);
      if (Math.abs(scaleFactor - 1) < 0.04) {
        return false;
      }
      draftProp.attachment.scale = draftProp.attachment.scale.map((value) => Number(((Number(value) || 1) * scaleFactor).toFixed(4)));
      rebuildDraftStage();
      if (preserveSelectionKey) {
        selectStageSelectionByKey(preserveSelectionKey);
      }
      return true;
    }
    function roundTransformValue(value, fallback = 0) {
      const numericValue = Number(value);
      return Number((Number.isFinite(numericValue) ? numericValue : fallback).toFixed(4));
    }
    function getSingleSlotAutoLockPreset(slotKey) {
      return SINGLE_SLOT_AUTO_LOCK_PRESETS[slotKey] || {
        horizontalSpan: SLOT_STAGE_TARGET_SPANS[slotKey] || 1.4,
        yOffsetRatio: -0.08,
        zOffsetRatio: -0.08,
        rotationCandidates: [[0, 0, 0]]
      };
    }
    function scoreHeadwearRotationCandidate(size) {
      const width = Math.max(size.x, size.z, 1e-4);
      const depth = Math.min(size.x, size.z, 1e-4);
      const height = Math.max(size.y, 1e-4);
      const heightRatio = height / width;
      const depthRatio = depth / width;
      return width / height + depth / height - Math.abs(heightRatio - 0.42) * 3.2 - Math.abs(depthRatio - 0.84) * 1.2 - (heightRatio < 0.1 ? 1.4 : 0) - (heightRatio > 1.08 ? 2.6 : 0);
    }
    function measureSingleSlotAutoLockCandidate(sourceRoot, rotation, preset, slotKey) {
      const candidateRoot = cloneSceneGraph2(sourceRoot);
      candidateRoot.rotation.set(rotation[0], rotation[1], rotation[2]);
      candidateRoot.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(candidateRoot);
      if (bounds.isEmpty()) {
        return null;
      }
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      bounds.getSize(size);
      bounds.getCenter(center);
      const horizontalSpan = Math.max(size.x, size.z, 1e-4);
      const scaleFactor = THREE.MathUtils.clamp((preset.horizontalSpan || 1.4) / horizontalSpan, 0.08, 40);
      const scaledCenter = center.clone().multiplyScalar(scaleFactor);
      const scaledSize = size.clone().multiplyScalar(scaleFactor);
      const score = slotKey === "headWear" ? scoreHeadwearRotationCandidate(size) : horizontalSpan / Math.max(size.y, 1e-4);
      return {
        rotation,
        scaledCenter,
        scaledSize,
        scaleFactor,
        score
      };
    }
    function pickSingleSlotAutoLockCandidate(sourceRoot, preset, slotKey) {
      if (!sourceRoot) {
        return null;
      }
      const candidates = Array.isArray(preset.rotationCandidates) && preset.rotationCandidates.length ? preset.rotationCandidates : [[0, 0, 0]];
      return candidates.reduce((bestCandidate, rotation) => {
        const measuredCandidate = measureSingleSlotAutoLockCandidate(sourceRoot, rotation, preset, slotKey);
        if (!measuredCandidate) {
          return bestCandidate;
        }
        if (!bestCandidate || measuredCandidate.score > bestCandidate.score) {
          return measuredCandidate;
        }
        return bestCandidate;
      }, null);
    }
    function canAutoLockCurrentDraft(draftProp = ensureDraftProp(), category = getDraftCategoryRecord()) {
      return Boolean(
        (category == null ? void 0 : category.slotKey) && category.slotKey !== "wingSet" && (state.draftTemplateSourceRoot || state.draftTemplateRoot) && !isNoWingProxyRecord(draftProp) && !isBaseWingProxyRecord(draftProp)
      );
    }
    function autoLockDraftPlacementToSlot({ commitHistoryStep = true, silent = false } = {}) {
      var _a2, _b2, _c;
      const draftProp = ensureDraftProp();
      const category = getDraftCategoryRecord();
      if (!canAutoLockCurrentDraft(draftProp, category)) {
        if (!silent) {
          log("Load a single-slot prop such as headwear or body gear before using Auto Lock / Auto Fit.");
        }
        return false;
      }
      if (state.motionPreviewEnabled) {
        setMotionPreviewEnabled(false, { silent: true });
      }
      const slotKey = category.slotKey;
      const preset = getSingleSlotAutoLockPreset(slotKey);
      const sourceRoot = state.draftTemplateSourceRoot || state.draftTemplateRoot;
      const candidate = pickSingleSlotAutoLockCandidate(sourceRoot, preset, slotKey);
      if (!candidate) {
        if (!silent) {
          log("XiO could not measure that GLB well enough to auto-fit it.");
        }
        return false;
      }
      const useHeadwearLockedPosition = slotKey === "headWear";
      const nextPosition = useHeadwearLockedPosition ? HEADWEAR_AUTO_LOCK_POSITION : [
        roundTransformValue(-candidate.scaledCenter.x, 0),
        roundTransformValue(
          -candidate.scaledCenter.y + candidate.scaledSize.y * (Number.isFinite(preset.yOffsetRatio) ? preset.yOffsetRatio : -((_a2 = preset.ySinkRatio) != null ? _a2 : 0.08)),
          0
        ),
        roundTransformValue(
          -candidate.scaledCenter.z + candidate.scaledSize.z * (Number.isFinite(preset.zOffsetRatio) ? preset.zOffsetRatio : -((_b2 = preset.zSinkRatio) != null ? _b2 : 0.08)),
          0
        )
      ];
      draftProp.attachment = {
        ...draftProp.attachment,
        position: nextPosition.map((value) => roundTransformValue(value, 0)),
        rotation: [
          roundTransformValue(candidate.rotation[0], 0),
          roundTransformValue(candidate.rotation[1], 0),
          roundTransformValue(candidate.rotation[2], 0)
        ],
        scale: [
          roundTransformValue(candidate.scaleFactor, 1),
          roundTransformValue(candidate.scaleFactor, 1),
          roundTransformValue(candidate.scaleFactor, 1)
        ],
        mirrorMode: "single"
      };
      rebuildDraftStage();
      selectStageSelectionByKey("single");
      if (commitHistoryStep) {
        commitDraftHistoryStep();
      }
      renderAll();
      if (!silent) {
        const label = ((_c = getSelectedLiveProp()) == null ? void 0 : _c.label) || draftProp.label || "current prop";
        log(`Auto-locked ${label} to XiO\u2019s ${slotKey === "headWear" ? "headwear" : category.label} slot and staged it for final tuning.`);
      }
      return true;
    }
    function captureAttachmentFromPivot(pivot) {
      if (!pivot) {
        return null;
      }
      return {
        position: [
          roundTransformValue(pivot.position.x, 0),
          roundTransformValue(pivot.position.y, 0),
          roundTransformValue(pivot.position.z, 0)
        ],
        rotation: [
          roundTransformValue(pivot.rotation.x, 0),
          roundTransformValue(pivot.rotation.y, 0),
          roundTransformValue(pivot.rotation.z, 0)
        ],
        scale: [
          roundTransformValue(Math.abs(pivot.scale.x), 1),
          roundTransformValue(Math.abs(pivot.scale.y), 1),
          roundTransformValue(Math.abs(pivot.scale.z), 1)
        ]
      };
    }
    function normalizePairedWingAttachment(attachment = {}) {
      const position = Array.isArray(attachment.position) ? attachment.position : [0, 0, 0];
      const rotation = Array.isArray(attachment.rotation) ? attachment.rotation : [0, 0, 0];
      const scale = Array.isArray(attachment.scale) ? attachment.scale : [1, 1, 1];
      return {
        position: [
          roundTransformValue(Math.abs(position[0]), 0),
          roundTransformValue(position[1], 0),
          roundTransformValue(position[2], 0)
        ],
        rotation: [
          roundTransformValue(rotation[0], 0),
          roundTransformValue(Math.abs(rotation[1]), 0),
          roundTransformValue(Math.abs(rotation[2]), 0)
        ],
        scale: [
          roundTransformValue(Math.abs(scale[0]), 1),
          roundTransformValue(Math.abs(scale[1]), 1),
          roundTransformValue(Math.abs(scale[2]), 1)
        ],
        mirrorMode: "paired"
      };
    }
    function normalizeSingleWingAttachmentForSide(attachment = {}, side = "right") {
      const dir = side === "left" ? -1 : 1;
      const position = Array.isArray(attachment.position) ? attachment.position : [0, 0, 0];
      const rotation = Array.isArray(attachment.rotation) ? attachment.rotation : [0, 0, 0];
      const scale = Array.isArray(attachment.scale) ? attachment.scale : [1, 1, 1];
      return {
        position: [
          roundTransformValue(Math.abs(position[0]) * dir, 0),
          roundTransformValue(position[1], 0),
          roundTransformValue(position[2], 0)
        ],
        rotation: [
          roundTransformValue(rotation[0], 0),
          roundTransformValue(Math.abs(rotation[1]) * dir, 0),
          roundTransformValue(Math.abs(rotation[2]) * dir, 0)
        ],
        scale: [
          roundTransformValue(Math.abs(scale[0]), 1),
          roundTransformValue(Math.abs(scale[1]), 1),
          roundTransformValue(Math.abs(scale[2]), 1)
        ],
        mirrorMode: "single"
      };
    }
    function inferCurrentSingleWingPreviewSide() {
      var _a2, _b2, _c;
      const previewSide = normalizeWingPreviewSide((_a2 = state.wingSyncPreview) == null ? void 0 : _a2.side, null);
      if (previewSide === "left" || previewSide === "right") {
        return previewSide;
      }
      if (state.stageSelection === draftStage.leftPivot) {
        return "left";
      }
      if (state.stageSelection === draftStage.rightPivot) {
        return "right";
      }
      if (((_b2 = draftStage.singlePivot) == null ? void 0 : _b2.parent) === xio.slotAnchors.wingSet.left) {
        return "left";
      }
      if (((_c = draftStage.singlePivot) == null ? void 0 : _c.parent) === xio.slotAnchors.wingSet.right) {
        const bounds = new THREE.Box3().setFromObject(draftStage.singlePivot);
        if (!bounds.isEmpty()) {
          const center = new THREE.Vector3();
          bounds.getCenter(center);
          if (center.x < -0.02) {
            return "left";
          }
        }
        return "right";
      }
      const target = state.stageSelection || draftStage.singlePivot;
      if (target) {
        const bounds = new THREE.Box3().setFromObject(target);
        if (!bounds.isEmpty()) {
          const center = new THREE.Vector3();
          bounds.getCenter(center);
          return center.x < 0 ? "left" : "right";
        }
      }
      return "right";
    }
    function getCurrentWingPairAttachment() {
      const selectedPivot = state.stageSelection === draftStage.rightPivot && draftStage.rightPivot ? draftStage.rightPivot : draftStage.leftPivot || draftStage.rightPivot;
      return selectedPivot ? normalizePairedWingAttachment(captureAttachmentFromPivot(selectedPivot)) : normalizePairedWingAttachment(ensureDraftProp().attachment);
    }
    function getCurrentSingleWingAttachment(side = "right") {
      const sourceAttachment = captureAttachmentFromPivot(draftStage.singlePivot) || ensureDraftProp().attachment;
      return normalizeSingleWingAttachmentForSide(sourceAttachment, side);
    }
    function prepareSceneRootForDraftAsset(loadedScene, sourceLabel) {
      var _a2;
      if (!loadedScene) {
        return null;
      }
      const attempts = [
        () => prepareSceneRootForSocketAttachment2({
          THREE,
          root: loadedScene,
          targetSize: 2.2
        }),
        () => {
          const sceneRoot = cloneSceneGraph2(loadedScene);
          centerObjectAtOrigin2(THREE, sceneRoot);
          normalizeObjectToUnitSize2(THREE, sceneRoot, 2.2);
          return sceneRoot;
        },
        () => cloneSceneGraph2(loadedScene)
      ];
      let lastError = null;
      for (const attempt of attempts) {
        try {
          const candidate = attempt();
          if (!candidate) {
            continue;
          }
          const bounds = new THREE.Box3().setFromObject(candidate);
          if (!bounds.isEmpty() || ((_a2 = candidate.children) == null ? void 0 : _a2.length)) {
            return candidate;
          }
        } catch (error) {
          lastError = error;
        }
      }
      if (lastError) {
        console.warn(`[XiO Creator] Unable to prepare ${sourceLabel} with the standard draft import pipeline.`, lastError);
      }
      return null;
    }
    function refreshDraftTemplatePresentationFromSource({ logFailure = false } = {}) {
      const draftProp = ensureDraftProp();
      const category = getDraftCategoryRecord();
      if (!category || category.slotKey !== "wingSet" || isNoWingProxyRecord(draftProp) || isBaseWingProxyRecord(draftProp)) {
        state.draftTemplateRoot = state.draftTemplateSourceRoot || null;
        state.draftTemplatePair = state.draftTemplateSourcePair || null;
        return Boolean(state.draftTemplateRoot || state.draftTemplatePair);
      }
      syncDraftWingMirrorModeFromPreview(draftProp);
      if (!hasDraftWingAuthoringSource()) {
        state.draftTemplateRoot = state.draftTemplateSourceRoot || null;
        state.draftTemplatePair = state.draftTemplateSourcePair || null;
        return Boolean(state.draftTemplateRoot || state.draftTemplatePair);
      }
      const authoringPreview = getDraftWingAuthoringPreview(draftProp);
      const authoredTemplateState = buildWingAuthoringTemplateState2({
        THREE,
        sourceRoot: state.draftTemplateSourceRoot,
        sourcePair: state.draftTemplateSourcePair,
        authoring: authoringPreview
      });
      state.draftTemplateRoot = (authoredTemplateState == null ? void 0 : authoredTemplateState.draftTemplateRoot) || null;
      state.draftTemplatePair = (authoredTemplateState == null ? void 0 : authoredTemplateState.draftTemplatePair) || null;
      if (!state.draftTemplateRoot && !state.draftTemplatePair) {
        state.draftTemplateRoot = state.draftTemplateSourceRoot || null;
        state.draftTemplatePair = state.draftTemplateSourcePair || null;
      }
      if (logFailure && (authoredTemplateState == null ? void 0 : authoredTemplateState.failed)) {
        log("XiO could not isolate that wing source cleanly, so the original GLB is still loaded.");
      }
      return !(authoredTemplateState == null ? void 0 : authoredTemplateState.failed);
    }
    function getPreferredWingAuthoringSide() {
      if (state.stageSelection === draftStage.rightPivot) return "right";
      if (state.stageSelection === draftStage.leftPivot) return "left";
      const authoringPreview = getDraftWingAuthoringPreview();
      return authoringPreview.sourceSide || inferCurrentSingleWingPreviewSide() || "left";
    }
    function applyWingAuthoringState(authoringPatch, {
      commitHistoryStep = true,
      announceMessage = null,
      autoFit = true,
      silent = false
    } = {}) {
      var _a2;
      const draftProp = ensureDraftProp();
      const category = getDraftCategoryRecord();
      if (!category || category.slotKey !== "wingSet") {
        return false;
      }
      if (isNoWingProxyRecord(draftProp) || isBaseWingProxyRecord(draftProp) || !hasDraftWingAuthoringSource()) {
        log("Load a wing GLB or live wing prop before using the wing authoring tools.");
        return false;
      }
      const previousPreview = getDraftWingAuthoringPreview(draftProp);
      const nextPreview = normalizeWingAuthoringPreview2({
        ...previousPreview,
        ...authoringPatch
      }, {
        defaultMirrorToBoth: ((_a2 = draftProp.attachment) == null ? void 0 : _a2.mirrorMode) === "paired"
      });
      setDraftWingAuthoringPreview(nextPreview);
      syncDraftWingMirrorModeFromPreview(draftProp);
      setWingSyncPreviewState(nextPreview.mirrorToBoth ? "both" : "single", nextPreview.sourceSide);
      const didIsolate = refreshDraftTemplatePresentationFromSource({ logFailure: true });
      rebuildDraftStage();
      if (autoFit) {
        autoFitDraftPlacementToSlot({
          targetSpanOverride: nextPreview.mirrorToBoth ? SLOT_STAGE_TARGET_SPANS.wingSet : SINGLE_WING_SYNC_TARGET_SPAN,
          preserveSelectionKey: nextPreview.mirrorToBoth ? nextPreview.sourceSide === "right" ? "right" : "left" : "single"
        });
      }
      selectStageSelectionByKey(nextPreview.mirrorToBoth ? nextPreview.sourceSide === "right" ? "right" : "left" : "single");
      if (commitHistoryStep) {
        commitDraftHistoryStep();
      }
      renderAll();
      if (!didIsolate) {
        return false;
      }
      if (announceMessage) {
        log(announceMessage);
      } else if (!silent && didIsolate) {
        log(`Prepared ${nextPreview.sourceSide} wing source${nextPreview.mirrorToBoth ? " and mirrored it to both wings." : " for one-wing preview."}`);
      }
      return didIsolate;
    }
    function resetWingAuthoringToOriginal() {
      var _a2, _b2;
      const draftProp = ensureDraftProp();
      if (!hasDraftWingAuthoringSource()) {
        log("Load a wing source first, then reset it back to the original GLB.");
        return false;
      }
      clearDraftWingAuthoringPreview();
      draftProp.attachment.mirrorMode = ((_a2 = state.draftTemplateSourcePair) == null ? void 0 : _a2.left) && ((_b2 = state.draftTemplateSourcePair) == null ? void 0 : _b2.right) ? "paired" : draftProp.attachment.mirrorMode;
      resetWingSyncPreviewState({
        draftProp,
        draftTemplateRoot: state.draftTemplateSourceRoot,
        draftTemplatePair: state.draftTemplateSourcePair
      });
      refreshDraftTemplatePresentationFromSource();
      rebuildDraftStage();
      commitDraftHistoryStep();
      renderAll();
      log("Restored the original wing GLB source.");
      return true;
    }
    function applyWingMotionInputGroup(groupKey, { commitHistoryStep = false } = {}) {
      const draftProp = ensureDraftProp();
      const category = getDraftCategoryRecord();
      if (!category || category.slotKey !== "wingSet" || isNoWingProxyRecord(draftProp)) {
        return false;
      }
      const currentMotion = getDraftWingMotionPreview(draftProp);
      const nextMotion = clonePreviewData(currentMotion);
      const nextGroup = {};
      Object.entries(wingMotionInputs[groupKey] || {}).forEach(([controlKey, input]) => {
        if (!input) return;
        nextGroup[controlKey] = controlKey === "direction" ? input.value : Number(input.value);
      });
      if (groupKey === "master") {
        nextMotion.master = nextGroup;
      } else {
        nextMotion[groupKey] = nextGroup;
      }
      setDraftWingMotionPreview(nextMotion);
      renderWingMotionControls();
      if (commitHistoryStep) {
        commitDraftHistoryStep();
      }
      return true;
    }
    function setDraftWingMotionLinked(linked, { commitHistoryStep = true } = {}) {
      const draftProp = ensureDraftProp();
      const category = getDraftCategoryRecord();
      if (!category || category.slotKey !== "wingSet" || isNoWingProxyRecord(draftProp)) {
        return false;
      }
      const currentMotion = getDraftWingMotionPreview(draftProp);
      const nextMotion = clonePreviewData(currentMotion);
      nextMotion.linked = linked;
      if (linked) {
        nextMotion.left = null;
        nextMotion.right = null;
      } else {
        nextMotion.left = clonePreviewData(nextMotion.left || nextMotion.master);
        nextMotion.right = clonePreviewData(nextMotion.right || nextMotion.master);
      }
      setDraftWingMotionPreview(nextMotion);
      renderAll();
      if (commitHistoryStep) {
        commitDraftHistoryStep();
      }
      log(`Wing motion controls are now ${linked ? "linked together" : "unlinked for left and right tuning"}.`);
      return true;
    }
    function toggleDraftPlacementDepth() {
      var _a2, _b2, _c;
      if (!hasEditableStageProp()) {
        log("Equip a live or draft prop first, then use the front or behind toggle.");
        return;
      }
      if (state.motionPreviewEnabled) {
        setMotionPreviewEnabled(false, { silent: true });
      }
      const draftProp = ensureDraftProp();
      const currentZ = Number((_b2 = (_a2 = draftProp.attachment) == null ? void 0 : _a2.position) == null ? void 0 : _b2[2]) || 0;
      const anchorDepth = getSlotAnchorDepth(draftProp.categoryKey);
      const depthMagnitude = Math.max(Math.abs(currentZ), getSuggestedPlacementDepthMagnitude(draftProp));
      const currentAbsoluteDepth = anchorDepth + currentZ;
      const nextAbsoluteDepth = currentAbsoluteDepth < 0 ? depthMagnitude : -depthMagnitude;
      const nextZ = nextAbsoluteDepth - anchorDepth;
      draftProp.attachment.position[2] = Number(nextZ.toFixed(4));
      rebuildDraftStage();
      commitDraftHistoryStep();
      renderAll();
      const label = ((_c = getSelectedLiveProp()) == null ? void 0 : _c.label) || draftProp.label || "current prop";
      log(`Placed ${label} ${nextAbsoluteDepth >= 0 ? "in front of" : "behind"} XiO.`);
    }
    function clearDraftStage() {
      var _a2, _b2, _c;
      if ((_a2 = draftStage.singlePivot) == null ? void 0 : _a2.parent) draftStage.singlePivot.parent.remove(draftStage.singlePivot);
      if ((_b2 = draftStage.leftPivot) == null ? void 0 : _b2.parent) draftStage.leftPivot.parent.remove(draftStage.leftPivot);
      if ((_c = draftStage.rightPivot) == null ? void 0 : _c.parent) draftStage.rightPivot.parent.remove(draftStage.rightPivot);
      draftStage.singlePivot = null;
      draftStage.leftPivot = null;
      draftStage.rightPivot = null;
      setStageSelection(null);
      xio.leftWingBaseMesh.visible = true;
      xio.rightWingBaseMesh.visible = true;
    }
    function buildSingleWingPreviewAttachmentForSide(draftProp, side) {
      var _a2;
      if (((_a2 = draftProp == null ? void 0 : draftProp.attachment) == null ? void 0 : _a2.mirrorMode) === "paired") {
        return buildMirroredAttachmentTransform2(draftProp.attachment, side === "left" ? -1 : 1);
      }
      return normalizeSingleWingAttachmentForSide(draftProp.attachment, side);
    }
    function updateDraftFromSelection() {
      var _a2, _b2, _c, _d;
      const draftProp = ensureDraftProp();
      const category = getDraftCategoryRecord();
      const effectiveWingPreviewMode = getEffectiveWingSyncPreviewMode(draftProp, category);
      if (draftStage.singlePivot) {
        if ((category == null ? void 0 : category.slotKey) === "wingSet") {
          const singleSide = getEffectiveWingSyncPreviewSide(draftProp, category) || inferCurrentSingleWingPreviewSide();
          const sourceAttachment = captureAttachmentFromPivot(draftStage.singlePivot) || draftProp.attachment;
          draftProp.attachment = ((_a2 = draftProp.attachment) == null ? void 0 : _a2.mirrorMode) === "paired" ? normalizePairedWingAttachment(sourceAttachment) : normalizeSingleWingAttachmentForSide(sourceAttachment, singleSide);
          setWingSyncPreviewState(effectiveWingPreviewMode || "single", singleSide);
        } else {
          draftProp.attachment.position = [draftStage.singlePivot.position.x, draftStage.singlePivot.position.y, draftStage.singlePivot.position.z];
          draftProp.attachment.rotation = [draftStage.singlePivot.rotation.x, draftStage.singlePivot.rotation.y, draftStage.singlePivot.rotation.z];
          draftProp.attachment.scale = [draftStage.singlePivot.scale.x, draftStage.singlePivot.scale.y, draftStage.singlePivot.scale.z];
        }
      } else if (draftStage.leftPivot || draftStage.rightPivot) {
        const selectedPivot = state.stageSelection === draftStage.rightPivot && draftStage.rightPivot ? draftStage.rightPivot : draftStage.leftPivot || draftStage.rightPivot;
        const selectedSide = selectedPivot === draftStage.rightPivot ? "right" : "left";
        const selectedAttachment = captureAttachmentFromPivot(selectedPivot) || draftProp.attachment;
        if ((category == null ? void 0 : category.slotKey) === "wingSet" && ((_b2 = draftProp.attachment) == null ? void 0 : _b2.mirrorMode) !== "paired") {
          draftProp.attachment = normalizeSingleWingAttachmentForSide(selectedAttachment, selectedSide);
          if (draftStage.leftPivot && selectedPivot !== draftStage.leftPivot) {
            applyAttachmentTransform2(draftStage.leftPivot, normalizeSingleWingAttachmentForSide(draftProp.attachment, "left"));
          }
          if (draftStage.rightPivot && selectedPivot !== draftStage.rightPivot) {
            applyAttachmentTransform2(draftStage.rightPivot, normalizeSingleWingAttachmentForSide(draftProp.attachment, "right"));
          }
        } else {
          const selectedDir = selectedSide === "right" ? 1 : -1;
          draftProp.attachment.position = [
            selectedDir * selectedPivot.position.x,
            selectedPivot.position.y,
            selectedPivot.position.z
          ];
          draftProp.attachment.rotation = [
            selectedPivot.rotation.x,
            selectedDir * selectedPivot.rotation.y,
            selectedDir * selectedPivot.rotation.z
          ];
          draftProp.attachment.scale = [
            selectedPivot.scale.x,
            selectedPivot.scale.y,
            selectedPivot.scale.z
          ];
          draftProp.attachment = normalizePairedWingAttachment(draftProp.attachment);
          if (draftStage.leftPivot && selectedPivot !== draftStage.leftPivot) {
            applyAttachmentTransform2(draftStage.leftPivot, buildMirroredAttachmentTransform2(draftProp.attachment, -1));
          }
          if (draftStage.rightPivot && selectedPivot !== draftStage.rightPivot) {
            applyAttachmentTransform2(draftStage.rightPivot, buildMirroredAttachmentTransform2(draftProp.attachment, 1));
          }
        }
        setWingSyncPreviewState(effectiveWingPreviewMode || "both", selectedSide);
        if ((_c = draftStage.leftPivot) == null ? void 0 : _c.children[0]) {
          draftStage.leftPivot.children[0].scale.x = Math.abs(draftStage.leftPivot.children[0].scale.x);
        }
        if ((_d = draftStage.rightPivot) == null ? void 0 : _d.children[0]) {
          draftStage.rightPivot.children[0].scale.x = Math.abs(draftStage.rightPivot.children[0].scale.x) * -1;
        }
      }
      renderWorkspaceState();
      syncPropForm();
    }
    transformControls.addEventListener("objectChange", updateDraftFromSelection);
    function applyAppearanceFromDraft() {
      const draftProp = ensureDraftProp();
      xio.resetAppearance();
      if (draftProp.eyePreset) xio.applyEyeAppearancePreset(draftProp.eyePreset);
      if (draftProp.materialPreset) xio.applyMaterialPreset(draftProp.materialPreset);
    }
    function rebuildDraftStage() {
      var _a2, _b2;
      const previousSelectionKey = getStageSelectionKey();
      refreshDraftTemplatePresentationFromSource();
      clearDraftStage();
      applyAppearanceFromDraft();
      const draftProp = ensureDraftProp();
      const category = getCategoryByKey(draftProp.categoryKey);
      const hasTemplatePair = hasDraftWingPairSource();
      const effectiveWingPreviewMode = getEffectiveWingSyncPreviewMode(draftProp, category);
      const effectiveWingPreviewSide = getEffectiveWingSyncPreviewSide(draftProp, category);
      syncBaseWingVisibility(draftProp, category);
      if (!state.draftTemplateRoot && !hasTemplatePair || !category) {
        syncPropForm();
        renderWorkspaceState();
        return;
      }
      if (category.slotKey === "wingSet" && effectiveWingPreviewMode === "both") {
        draftStage.leftPivot = new THREE.Group();
        draftStage.rightPivot = new THREE.Group();
        if (((_a2 = draftProp.attachment) == null ? void 0 : _a2.mirrorMode) === "paired") {
          applyAttachmentTransform2(draftStage.leftPivot, buildMirroredAttachmentTransform2(draftProp.attachment, -1));
          applyAttachmentTransform2(draftStage.rightPivot, buildMirroredAttachmentTransform2(draftProp.attachment, 1));
        } else {
          applyAttachmentTransform2(draftStage.leftPivot, normalizeSingleWingAttachmentForSide(draftProp.attachment, "left"));
          applyAttachmentTransform2(draftStage.rightPivot, normalizeSingleWingAttachmentForSide(draftProp.attachment, "right"));
        }
        const leftModel = hasTemplatePair ? cloneSceneGraph2(state.draftTemplatePair.left) : cloneSceneGraph2(state.draftTemplateRoot);
        const rightModel = hasTemplatePair ? cloneSceneGraph2(state.draftTemplatePair.right) : cloneSceneGraph2(state.draftTemplateRoot);
        if (!hasTemplatePair) {
          rightModel.scale.x *= -1;
        }
        draftStage.leftPivot.add(leftModel);
        draftStage.rightPivot.add(rightModel);
        xio.slotAnchors.wingSet.left.add(draftStage.leftPivot);
        xio.slotAnchors.wingSet.right.add(draftStage.rightPivot);
        selectStageSelectionByKey(previousSelectionKey === "right" ? "right" : effectiveWingPreviewSide === "right" ? "right" : "left");
      } else {
        const singleWingSide = category.slotKey === "wingSet" ? effectiveWingPreviewSide : null;
        const anchor = category.slotKey === "wingSet" ? singleWingSide === "left" ? xio.slotAnchors.wingSet.left : xio.slotAnchors.wingSet.right : (_b2 = xio.slotAnchors[category.slotKey]) == null ? void 0 : _b2.anchor;
        const singleModel = category.slotKey === "wingSet" && hasTemplatePair ? cloneSceneGraph2(singleWingSide === "left" ? state.draftTemplatePair.left : state.draftTemplatePair.right) : state.draftTemplateRoot ? cloneSceneGraph2(state.draftTemplateRoot) : null;
        if (!anchor || !singleModel) {
          syncPropForm();
          renderWorkspaceState();
          return;
        }
        draftStage.singlePivot = new THREE.Group();
        applyAttachmentTransform2(
          draftStage.singlePivot,
          category.slotKey === "wingSet" ? buildSingleWingPreviewAttachmentForSide(draftProp, singleWingSide || "right") : draftProp.attachment
        );
        draftStage.singlePivot.add(singleModel);
        anchor.add(draftStage.singlePivot);
        setStageSelection(draftStage.singlePivot);
      }
      syncPropForm();
      renderWorkspaceState();
    }
    async function setDraftAssetFromUrl(assetUrl, sourceLabel, draftProp = ensureDraftProp(), { autoFitToSlot = false } = {}) {
      const draftLoadPlan = await buildDraftLoadPlanFromDirectAsset(assetUrl, sourceLabel, draftProp, { autoFitToSlot });
      commitDraftLoadPlan(draftLoadPlan, {
        resetView: false,
        announceMessage: `Loaded ${sourceLabel}.`
      });
    }
    function createCreatorLoadError(message, code, extra = {}) {
      const error = new Error(message);
      error.code = code;
      Object.assign(error, extra);
      return error;
    }
    function prepareDraftTemplateStateFromObject(templateRoot, sourceLabel) {
      const preparedRoot = cloneSceneGraph2(templateRoot);
      centerObjectAtOrigin2(THREE, preparedRoot);
      normalizeObjectToUnitSize2(THREE, preparedRoot, 2.2);
      return {
        draftTemplateRoot: preparedRoot,
        draftTemplatePair: null,
        draftSourceLabel: sourceLabel
      };
    }
    function prepareDraftTemplatePairStateFromLivePreview(previewPair, sourceLabel, draftProp) {
      if (!(previewPair == null ? void 0 : previewPair.left) || !(previewPair == null ? void 0 : previewPair.right)) {
        return null;
      }
      if ((draftProp == null ? void 0 : draftProp.attachment) && previewPair.attachment) {
        draftProp.attachment = {
          ...draftProp.attachment,
          position: [...previewPair.attachment.position],
          rotation: [...previewPair.attachment.rotation],
          scale: [...previewPair.attachment.scale],
          mirrorMode: "paired"
        };
      }
      return {
        draftTemplateRoot: null,
        draftTemplatePair: {
          left: cloneSceneGraph2(previewPair.left),
          right: cloneSceneGraph2(previewPair.right)
        },
        draftSourceLabel: sourceLabel
      };
    }
    async function prepareDraftTemplateStateFromAsset(assetUrl, sourceLabel, draftProp) {
      var _a2;
      if (!assetUrl) {
        return {
          draftTemplateRoot: null,
          draftTemplatePair: null,
          draftSourceLabel: "No GLB loaded"
        };
      }
      const mirrorMode = ((_a2 = draftProp == null ? void 0 : draftProp.attachment) == null ? void 0 : _a2.mirrorMode) === "paired" ? "paired" : "single";
      const wingAuthoringPreview = (draftProp == null ? void 0 : draftProp.categoryKey) === "wingSet" ? getDraftWingAuthoringPreview(draftProp) : null;
      const effectiveMirrorMode = (draftProp == null ? void 0 : draftProp.categoryKey) === "wingSet" && (wingAuthoringPreview == null ? void 0 : wingAuthoringPreview.mode) === "isolatedHalf" ? wingAuthoringPreview.mirrorToBoth ? "paired" : "single" : mirrorMode;
      const shouldUseWingTemplate = draftProp.categoryKey === "wingSet" && effectiveMirrorMode === "paired" && (wingAuthoringPreview == null ? void 0 : wingAuthoringPreview.mode) !== "isolatedHalf";
      if (shouldUseWingTemplate) {
        const templateState = await loadWingTemplateState2({ GLTFLoader, THREE, assetUrl });
        if (!(templateState == null ? void 0 : templateState.sourceTemplateRoot) && !(templateState == null ? void 0 : templateState.sourceTemplatePair)) {
          throw createCreatorLoadError(`${sourceLabel} could not be prepared for XiO.`, "prepare-failed", {
            sourceLabel
          });
        }
        return {
          draftTemplateRoot: templateState.sourceTemplateRoot || null,
          draftTemplatePair: templateState.sourceTemplatePair || null,
          draftSourceLabel: sourceLabel
        };
      }
      const preparedRoot = await loadGlbScene2({ GLTFLoader, assetUrl }).then((loadedScene) => {
        return prepareSceneRootForDraftAsset(loadedScene, sourceLabel);
      });
      if (!preparedRoot) {
        throw createCreatorLoadError(`${sourceLabel} could not be prepared for XiO.`, "prepare-failed", {
          sourceLabel
        });
      }
      return {
        draftTemplateRoot: preparedRoot,
        draftTemplatePair: null,
        draftSourceLabel: sourceLabel
      };
    }
    function buildDraftLoadPlanBase(draftProp, {
      selectedLivePropKey = null,
      draftCategoryKey = (draftProp == null ? void 0 : draftProp.categoryKey) || state.draftCategoryKey,
      draftSourceLabel = "No GLB loaded",
      draftTemplateRoot = null,
      draftTemplatePair = null,
      draftTemplateSourceRoot = draftTemplateRoot,
      draftTemplateSourcePair = draftTemplatePair,
      draftObjectUrl = null,
      draftLocalFile = null,
      autoFitToSlot = false
    } = {}) {
      return {
        selectedLivePropKey,
        draftCategoryKey,
        draftProp,
        draftTemplateRoot,
        draftTemplatePair,
        draftTemplateSourceRoot,
        draftTemplateSourcePair,
        draftSourceLabel,
        draftObjectUrl,
        draftLocalFile,
        autoFitToSlot
      };
    }
    function commitDraftLoadPlan(draftLoadPlan, {
      preserveEditSession = false,
      resetView = true,
      disableTurntable = false,
      announceMessage = null
    } = {}) {
      var _a2, _b2, _c, _d, _e;
      const previousObjectUrl = state.draftObjectUrl;
      if (!preserveEditSession) {
        clearEditSession();
      }
      state.selectedLivePropKey = (_a2 = draftLoadPlan.selectedLivePropKey) != null ? _a2 : null;
      state.draftCategoryKey = draftLoadPlan.draftCategoryKey || ((_b2 = draftLoadPlan.draftProp) == null ? void 0 : _b2.categoryKey) || state.draftCategoryKey;
      state.draftProp = draftLoadPlan.draftProp;
      state.draftTemplateSourceRoot = draftLoadPlan.draftTemplateSourceRoot || null;
      state.draftTemplateSourcePair = draftLoadPlan.draftTemplateSourcePair || null;
      state.draftTemplateRoot = draftLoadPlan.draftTemplateRoot || null;
      state.draftTemplatePair = draftLoadPlan.draftTemplatePair || null;
      state.draftSourceLabel = draftLoadPlan.draftSourceLabel || "No GLB loaded";
      state.draftObjectUrl = draftLoadPlan.draftObjectUrl || null;
      state.draftLocalFile = draftLoadPlan.draftLocalFile || null;
      if (((_c = state.draftProp) == null ? void 0 : _c.preview) && Object.hasOwn(state.draftProp.preview, "singleWingSide")) {
        delete state.draftProp.preview.singleWingSide;
      }
      if (!((_e = (_d = state.draftProp) == null ? void 0 : _d.preview) == null ? void 0 : _e.wingMotion)) {
        setDraftWingMotionPreview(DEFAULT_WING_MOTION_PREVIEW2);
      }
      resetWingSyncPreviewState({
        draftProp: state.draftProp,
        draftTemplateRoot: state.draftTemplateRoot,
        draftTemplatePair: state.draftTemplatePair
      });
      refreshDraftTemplatePresentationFromSource();
      rebuildDraftStage();
      if (draftLoadPlan.autoFitToSlot) {
        const category = getDraftCategoryRecord();
        const didAutoLock = canAutoLockCurrentDraft(state.draftProp, category) ? autoLockDraftPlacementToSlot({ commitHistoryStep: false, silent: true }) : false;
        if (!didAutoLock) {
          autoFitDraftPlacementToSlot();
        }
      }
      resetDraftHistory();
      if (previousObjectUrl && previousObjectUrl !== state.draftObjectUrl) {
        URL.revokeObjectURL(previousObjectUrl);
      }
      renderAll();
      if (resetView) {
        presentCurrentLoadInStage({ disableTurntable });
      }
      if (announceMessage) {
        log(announceMessage);
      }
      return draftLoadPlan;
    }
    async function buildDraftLoadPlanFromDirectAsset(assetUrl, sourceLabel, draftProp = ensureDraftProp(), { autoFitToSlot = false } = {}) {
      if (!assetUrl) {
        return buildDraftLoadPlanBase(draftProp, {
          selectedLivePropKey: null,
          draftSourceLabel: "No GLB loaded",
          autoFitToSlot
        });
      }
      const templateState = await prepareDraftTemplateStateFromAsset(assetUrl, sourceLabel, draftProp);
      return buildDraftLoadPlanBase(draftProp, {
        selectedLivePropKey: state.selectedLivePropKey,
        draftTemplateRoot: templateState.draftTemplateRoot,
        draftTemplatePair: templateState.draftTemplatePair,
        draftTemplateSourceRoot: templateState.draftTemplateRoot || null,
        draftTemplateSourcePair: templateState.draftTemplatePair || null,
        draftSourceLabel: templateState.draftSourceLabel,
        draftObjectUrl: typeof assetUrl === "string" && assetUrl.startsWith("blob:") ? assetUrl : null,
        autoFitToSlot
      });
    }
    async function refreshStandaloneAssetAvailability() {
      if (!IS_FILE_RUNTIME) {
        return;
      }
      const refreshToken = ++state.assetAvailabilityRefreshToken;
      const nextAvailability = /* @__PURE__ */ new Map();
      const glbProps = getProps().filter((propRecord) => isStandaloneFolderLinkRequired(propRecord));
      if (state.standalonePropsFolder.permission !== STANDALONE_FOLDER_STATUS.linked || !state.standalonePropsFolder.handle) {
        glbProps.forEach((propRecord) => {
          nextAvailability.set(propRecord.key, {
            status: PROP_ASSET_STATUS.needsLink,
            relativePath: getStandaloneAssetRelativePath(propRecord.assetUrl)
          });
        });
        if (refreshToken !== state.assetAvailabilityRefreshToken) {
          return;
        }
        state.propAssetAvailability = nextAvailability;
        state.standalonePropsFolder.missingAssetPath = null;
        renderStandalonePropsFolderControls();
        renderLiveCatalog();
        return;
      }
      let firstMissingAssetPath = null;
      for (const propRecord of glbProps) {
        const relativePath = getStandaloneAssetRelativePath(propRecord.assetUrl);
        const assetFile = relativePath ? await walkLinkedPropsFolderToFile(relativePath) : null;
        if (refreshToken !== state.assetAvailabilityRefreshToken) {
          return;
        }
        nextAvailability.set(propRecord.key, {
          status: assetFile ? PROP_ASSET_STATUS.glbReady : PROP_ASSET_STATUS.missingAsset,
          relativePath
        });
        if (!assetFile && relativePath && !firstMissingAssetPath) {
          firstMissingAssetPath = relativePath;
        }
      }
      if (refreshToken !== state.assetAvailabilityRefreshToken) {
        return;
      }
      state.propAssetAvailability = nextAvailability;
      state.standalonePropsFolder.missingAssetPath = firstMissingAssetPath;
      renderStandalonePropsFolderControls();
      renderLiveCatalog();
    }
    async function promptToLinkStandalonePropsFolder({ silent = false } = {}) {
      if (!IS_FILE_RUNTIME) {
        return false;
      }
      if (typeof window.showDirectoryPicker !== "function") {
        setStandaloneFolderState(STANDALONE_FOLDER_STATUS.unsupported);
        renderAll();
        if (!silent) {
          log("This browser cannot link a local props folder for standalone GLB inventory.");
        }
        return false;
      }
      try {
        const handle = await window.showDirectoryPicker({ id: "xio-props-folder", mode: "read" });
        const permission = await queryDirectoryPermissionState(handle, { request: true });
        if (permission !== STANDALONE_FOLDER_STATUS.linked) {
          setStandaloneFolderState(STANDALONE_FOLDER_STATUS.relinkRequired, { name: (handle == null ? void 0 : handle.name) || "" });
          renderAll();
          if (!silent) {
            log("Standalone GLB inventory still needs read permission for HomePageAPP/Images/PROPS.");
          }
          return false;
        }
        const isValidFolder = await validateStandalonePropsFolderHandle(handle);
        if (!isValidFolder) {
          setStandaloneFolderState(STANDALONE_FOLDER_STATUS.relinkRequired);
          renderAll();
          if (!silent) {
            log("Choose the HomePageAPP/Images/PROPS folder so standalone GLB inventory can resolve correctly.");
          }
          return false;
        }
        setStandaloneFolderState(STANDALONE_FOLDER_STATUS.linked, {
          handle,
          name: handle.name || "PROPS",
          missingAssetPath: null
        });
        state.propAssetAvailability = /* @__PURE__ */ new Map();
        renderAll();
        try {
          await writeStandalonePropsFolderHandle(handle);
        } catch (error) {
          console.warn("[XiO Creator] Unable to persist the linked props folder handle.", error);
        }
        void refreshStandaloneAssetAvailability();
        if (!silent) {
          log(`Linked ${handle.name || "PROPS"} for standalone GLB inventory.`);
        }
        return true;
      } catch (error) {
        if ((error == null ? void 0 : error.name) === "AbortError") {
          if (!silent) {
            log("Props folder link cancelled.");
          }
          return false;
        }
        console.warn("[XiO Creator] Unable to link the standalone props folder.", error);
        if (!silent) {
          log("Unable to link the standalone props folder right now.");
        }
        return false;
      }
    }
    async function restoreStandalonePropsFolderLink() {
      if (!IS_FILE_RUNTIME) {
        return;
      }
      if (typeof window.showDirectoryPicker !== "function") {
        setStandaloneFolderState(STANDALONE_FOLDER_STATUS.unsupported);
        renderAll();
        return;
      }
      try {
        const storedHandle = await readStandalonePropsFolderHandle().catch(() => null);
        if (!storedHandle) {
          setStandaloneFolderState(STANDALONE_FOLDER_STATUS.unlinked);
          renderAll();
          return;
        }
        const permission = await queryDirectoryPermissionState(storedHandle);
        if (permission !== STANDALONE_FOLDER_STATUS.linked) {
          setStandaloneFolderState(STANDALONE_FOLDER_STATUS.relinkRequired, {
            name: storedHandle.name || "PROPS"
          });
          renderAll();
          return;
        }
        const isValidFolder = await validateStandalonePropsFolderHandle(storedHandle);
        if (!isValidFolder) {
          await clearStandalonePropsFolderHandle().catch(() => {
          });
          setStandaloneFolderState(STANDALONE_FOLDER_STATUS.relinkRequired);
          renderAll();
          return;
        }
        setStandaloneFolderState(STANDALONE_FOLDER_STATUS.linked, {
          handle: storedHandle,
          name: storedHandle.name || "PROPS",
          missingAssetPath: null
        });
        renderAll();
        void refreshStandaloneAssetAvailability();
      } catch (error) {
        console.warn("[XiO Creator] Unable to restore the standalone props folder handle.", error);
        setStandaloneFolderState(STANDALONE_FOLDER_STATUS.relinkRequired);
        renderAll();
      }
    }
    async function resolveLiveInventoryAssetSource(propRecord, { allowPromptForLink = false } = {}) {
      if (!(propRecord == null ? void 0 : propRecord.assetUrl)) {
        return {
          assetUrl: null,
          runtimeObjectUrl: null,
          sourceLabel: (propRecord == null ? void 0 : propRecord.label) || "No GLB loaded",
          relativePath: null
        };
      }
      if (!isStandaloneFolderLinkRequired(propRecord)) {
        return {
          assetUrl: propRecord.assetUrl,
          runtimeObjectUrl: null,
          sourceLabel: propRecord.label,
          relativePath: getStandaloneAssetRelativePath(propRecord.assetUrl)
        };
      }
      if (state.standalonePropsFolder.permission !== STANDALONE_FOLDER_STATUS.linked || !state.standalonePropsFolder.handle) {
        const didLinkFolder = allowPromptForLink ? await promptToLinkStandalonePropsFolder() : false;
        if (!didLinkFolder || state.standalonePropsFolder.permission !== STANDALONE_FOLDER_STATUS.linked) {
          throw createCreatorLoadError(
            "Link HomePageAPP/Images/PROPS to load GLB inventory in standalone mode.",
            "link-required",
            { propKey: propRecord.key }
          );
        }
      }
      const relativePath = getStandaloneAssetRelativePath(propRecord.assetUrl);
      if (!relativePath) {
        return {
          assetUrl: propRecord.assetUrl,
          runtimeObjectUrl: null,
          sourceLabel: propRecord.label,
          relativePath: null
        };
      }
      const assetFile = await walkLinkedPropsFolderToFile(relativePath);
      if (!assetFile) {
        state.propAssetAvailability.set(propRecord.key, {
          status: PROP_ASSET_STATUS.missingAsset,
          relativePath
        });
        state.standalonePropsFolder.missingAssetPath = relativePath;
        renderStandalonePropsFolderControls();
        renderLiveCatalog();
        throw createCreatorLoadError(`Asset missing from linked folder: ${relativePath}`, "missing-asset", {
          propKey: propRecord.key,
          relativePath
        });
      }
      state.propAssetAvailability.set(propRecord.key, {
        status: PROP_ASSET_STATUS.glbReady,
        relativePath
      });
      if (state.standalonePropsFolder.missingAssetPath === relativePath) {
        state.standalonePropsFolder.missingAssetPath = null;
      }
      renderStandalonePropsFolderControls();
      renderLiveCatalog();
      const runtimeObjectUrl = URL.createObjectURL(assetFile);
      return {
        assetUrl: runtimeObjectUrl,
        runtimeObjectUrl,
        sourceLabel: `${propRecord.label} (linked local asset)`,
        relativePath
      };
    }
    async function buildDraftLoadPlanFromPropRecord(propRecord) {
      var _a2, _b2;
      const nextDraftProp = deepCopyProp(propRecord);
      const draftLoadPlan = buildDraftLoadPlanBase(nextDraftProp, {
        selectedLivePropKey: propRecord.key,
        draftCategoryKey: propRecord.categoryKey
      });
      if (((_a2 = propRecord.preview) == null ? void 0 : _a2.kind) === "xioNoWingProxy") {
        return {
          ...draftLoadPlan,
          draftSourceLabel: `${propRecord.label} (clean wingless view)`
        };
      }
      if (((_b2 = propRecord.preview) == null ? void 0 : _b2.kind) === "xioBaseWingProxy") {
        return {
          ...draftLoadPlan,
          draftSourceLabel: `${propRecord.label} (XiO base wings)`
        };
      }
      if (isGeneratedPropPreview2(propRecord.preview)) {
        const previewPair = buildGeneratedWingPreview2({
          THREE,
          recipe: propRecord.preview.generated,
          attachment: propRecord.attachment
        });
        const previewState = prepareDraftTemplatePairStateFromLivePreview(
          previewPair,
          `${propRecord.label} (generated wing recipe)`,
          nextDraftProp
        );
        if (previewState) {
          return {
            ...draftLoadPlan,
            ...previewState,
            draftTemplateSourceRoot: previewState.draftTemplateRoot || null,
            draftTemplateSourcePair: previewState.draftTemplatePair || null
          };
        }
      }
      if (isLiveGameWingPreviewKey2(propRecord.key)) {
        const previewPair = buildLiveGameWingPreview2({
          propKey: propRecord.key,
          THREE,
          GLTFLoader,
          renderer
        });
        const previewState = prepareDraftTemplatePairStateFromLivePreview(
          previewPair,
          `${propRecord.label} (live game preview)`,
          nextDraftProp
        );
        if (previewState) {
          return {
            ...draftLoadPlan,
            ...previewState,
            draftTemplateSourceRoot: previewState.draftTemplateRoot || null,
            draftTemplateSourcePair: previewState.draftTemplatePair || null
          };
        }
      }
      if (propRecord.assetUrl) {
        const resolvedAsset = await resolveLiveInventoryAssetSource(propRecord, { allowPromptForLink: true });
        try {
          const templateState = await prepareDraftTemplateStateFromAsset(
            resolvedAsset.assetUrl,
            resolvedAsset.sourceLabel,
            nextDraftProp
          );
          return {
            ...draftLoadPlan,
            ...templateState,
            draftTemplateSourceRoot: templateState.draftTemplateRoot || null,
            draftTemplateSourcePair: templateState.draftTemplatePair || null,
            draftObjectUrl: resolvedAsset.runtimeObjectUrl || null
          };
        } catch (error) {
          if (resolvedAsset.runtimeObjectUrl) {
            URL.revokeObjectURL(resolvedAsset.runtimeObjectUrl);
          }
          throw error;
        }
      }
      const legacyPreviewTemplate = createLegacyWingPreviewTemplate(propRecord);
      if (legacyPreviewTemplate) {
        const legacyTemplateState = prepareDraftTemplateStateFromObject(legacyPreviewTemplate, `${propRecord.label} (legacy 3D preview)`);
        return {
          ...draftLoadPlan,
          ...legacyTemplateState,
          draftTemplateSourceRoot: legacyTemplateState.draftTemplateRoot || null,
          draftTemplateSourcePair: null
        };
      }
      return {
        ...draftLoadPlan,
        draftSourceLabel: `${propRecord.label} (appearance only)`
      };
    }
    async function buildDraftLoadPlanFromUpload(file) {
      if (!file) {
        throw createCreatorLoadError("Choose a .glb file first.", "missing-file");
      }
      if (!/\.glb$/i.test(file.name) && file.type !== "model/gltf-binary") {
        throw createCreatorLoadError("Only .glb files can be dropped into the XiO creator.", "invalid-file");
      }
      const nextDraftProp = state.selectedLivePropKey ? createEmptyDraftProp(state.draftCategoryKey) : deepCopyProp(ensureDraftProp());
      const derivedLabel = file.name.replace(/\.[^.]+$/, "");
      nextDraftProp.label = derivedLabel;
      nextDraftProp.key = slugify(derivedLabel);
      nextDraftProp.storagePath = null;
      nextDraftProp.preview = {
        wingMotion: clonePreviewData(DEFAULT_WING_MOTION_PREVIEW2)
      };
      delete nextDraftProp.creatorOnly;
      let runtimeAssetUrl = null;
      let runtimeObjectUrl = null;
      let sourceLabel = `${file.name} (local draft)`;
      runtimeObjectUrl = URL.createObjectURL(file);
      runtimeAssetUrl = runtimeObjectUrl;
      nextDraftProp.assetUrl = runtimeObjectUrl;
      try {
        const templateState = await prepareDraftTemplateStateFromAsset(runtimeAssetUrl, sourceLabel, nextDraftProp);
        return {
          ...buildDraftLoadPlanBase(nextDraftProp, {
            selectedLivePropKey: null,
            draftCategoryKey: nextDraftProp.categoryKey,
            draftObjectUrl: runtimeObjectUrl,
            draftLocalFile: file,
            autoFitToSlot: true
          }),
          ...templateState,
          draftTemplateSourceRoot: templateState.draftTemplateRoot || null,
          draftTemplateSourcePair: templateState.draftTemplatePair || null
        };
      } catch (error) {
        if (runtimeObjectUrl) {
          URL.revokeObjectURL(runtimeObjectUrl);
        }
        throw error;
      }
    }
    function renderLiveCatalog() {
      const categories = getCategories();
      const visibleProps = getVisibleLiveProps();
      const filteredProps = getFilteredLiveProps();
      const categoryCounts = visibleProps.reduce((counts, prop) => {
        counts.set(prop.categoryKey, (counts.get(prop.categoryKey) || 0) + 1);
        return counts;
      }, /* @__PURE__ */ new Map());
      livePropCount.textContent = filteredProps.length === visibleProps.length ? `${visibleProps.length} live props` : `${filteredProps.length} of ${visibleProps.length} live props`;
      liveCategoryList.innerHTML = categories.length ? categories.map((category) => `
      <article
        class="list-card list-card--interactive${state.liveCategoryFilter === category.key || state.liveCategoryFilter === "all" && state.draftCategoryKey === category.key ? " is-selected" : ""}"
        data-category-card="${escapeHtml2(category.key)}"
        tabindex="0"
        role="button"
        aria-label="Focus ${escapeHtml2(category.label)} category"
      >
        <div class="list-card__header">
          <div class="list-card__title">
            <div class="list-card__eyebrow">Category</div>
            <h4>${escapeHtml2(category.label)}</h4>
          </div>
          <span class="meta-pill">${escapeHtml2(categoryCounts.get(category.key) || 0)} live</span>
        </div>
        <div class="category-card__stats">
          <div class="category-card__stat">
            <span class="category-card__stat-label">Slot</span>
            <strong class="category-card__stat-value">${escapeHtml2(getSlotLabel(category.slotKey))}</strong>
          </div>
          <div class="category-card__stat">
            <span class="category-card__stat-label">Equip Limit</span>
            <strong class="category-card__stat-value">${escapeHtml2(category.equipLimit)}</strong>
          </div>
        </div>
        <div class="list-card__meta">
          ${state.draftCategoryKey === category.key ? '<span class="meta-pill meta-pill--active">Current draft</span>' : ""}
          ${state.liveCategoryFilter === category.key ? '<span class="meta-pill meta-pill--active">Filter on</span>' : ""}
          <span class="meta-pill">${category.enabled ? "Enabled" : "Disabled"}</span>
          ${category.key === "wingSet" ? '<button type="button" class="meta-pill-button meta-pill-button--accent" data-unequip-wings>Unequip Wings</button>' : ""}
        </div>
      </article>
    `).join("") : '<div class="list-card"><p class="list-card__description">No live categories yet.</p></div>';
      livePropList.innerHTML = filteredProps.length ? filteredProps.map((prop) => {
        const category = getCategoryByKey(prop.categoryKey);
        const description = prop.description ? `<p class="list-card__description">${escapeHtml2(prop.description)}</p>` : "";
        const canEdit = !isCreatorOnlyPropRecord(prop);
        const assetAvailability = getPropAssetAvailability(prop);
        const assetBadgeToneClass = assetAvailability.tone ? ` meta-pill--${escapeHtml2(assetAvailability.tone)}` : "";
        return `
      <article
        class="list-card list-card--interactive${state.selectedLivePropKey === prop.key ? " is-selected" : ""}"
        data-load-prop="${escapeHtml2(prop.key)}"
        tabindex="0"
        aria-label="Equip ${escapeHtml2(prop.label)} on XiO"
      >
        <div class="list-card__header">
          <div class="list-card__title">
            <div class="list-card__eyebrow">${escapeHtml2((category == null ? void 0 : category.label) || prop.categoryKey)}</div>
            <button type="button" class="list-card__title-button" data-load-prop="${escapeHtml2(prop.key)}">
              <span class="list-card__title-text">${escapeHtml2(prop.label)}</span>
            </button>
          </div>
          <div class="list-card__header-actions">
            <span class="meta-pill">${escapeHtml2(prop.rarity)}</span>
            ${canEdit ? `<button type="button" class="list-card__delete" data-delete-prop="${escapeHtml2(prop.key)}" aria-label="Permanently delete ${escapeHtml2(prop.label)}" title="Permanently delete ${escapeHtml2(prop.label)}">\xD7</button>` : ""}
          </div>
        </div>
        ${description}
        <div class="list-card__meta">
          <span class="meta-pill">${isCreatorOnlyPropRecord(prop) ? "Built in" : "Live"}</span>
          <span class="meta-pill">${prop.mysteryBoxEnabled ? "Mystery Box" : "Direct only"}</span>
          <span class="meta-pill${assetBadgeToneClass}">${escapeHtml2(getPropAssetBadge(prop))}</span>
        </div>
        <div class="list-card__actions">
          <button type="button" class="primary-button" data-load-prop="${escapeHtml2(prop.key)}">
            ${escapeHtml2(getLivePropEquipLabel(prop))}
          </button>
          ${canEdit ? `<button type="button" class="ghost-button" data-edit-prop="${escapeHtml2(prop.key)}">Edit Prop</button>` : ""}
        </div>
      </article>
    `;
      }).join("") : `<div class="list-card"><p class="list-card__description">${state.liveSearchQuery || state.liveCategoryFilter !== "all" ? "No props match the current filter." : "No live props are available yet."}</p></div>`;
    }
    function renderAll() {
      renderCategoryOptions();
      renderPresetOptions();
      syncPropForm();
      syncCategoryForm();
      updatePublishStatus();
      renderStandalonePropsFolderControls();
      renderWorkspaceState();
      renderWingAuthoringControls();
      renderWingMotionControls();
      renderLiveCatalog();
      renderEditSessionControls();
      renderStageToolbarControls();
      renderHistoryControls();
      renderGeneratedStageCard();
      if (randomGeneratorModal && !randomGeneratorModal.hidden) {
        populateRandomGeneratorBaseReferences();
        renderRandomGeneratorSummary();
      }
    }
    function applyDraftFromInputs() {
      var _a2, _b2, _c, _d, _e;
      const draftProp = ensureDraftProp();
      const previousCategoryKey = draftProp.categoryKey;
      const previousMirrorMode = ((_a2 = draftProp.attachment) == null ? void 0 : _a2.mirrorMode) || "single";
      const previousWingAuthoring = clonePreviewData((_b2 = draftProp.preview) == null ? void 0 : _b2.wingAuthoring);
      draftProp.label = propLabelInput.value.trim();
      draftProp.key = propKeyInput.value.trim();
      draftProp.categoryKey = propCategorySelect.value;
      draftProp.rarity = propRaritySelect.value;
      draftProp.description = propDescriptionInput.value.trim();
      draftProp.tags = propTagsInput.value.split(",").map((entry) => entry.trim()).filter((entry, index, array) => entry.length > 0 && array.indexOf(entry) === index);
      draftProp.active = propActiveToggle.checked;
      draftProp.mysteryBoxEnabled = propMysteryToggle.checked;
      draftProp.eyePreset = eyePresetSelect.value || null;
      draftProp.materialPreset = materialPresetSelect.value || null;
      if (draftProp.categoryKey !== "wingSet" && draftProp.preview && Object.hasOwn(draftProp.preview, "generated")) {
        delete draftProp.preview.generated;
      }
      if (draftProp.categoryKey === "wingSet" && ((_d = (_c = draftProp.preview) == null ? void 0 : _c.wingAuthoring) == null ? void 0 : _d.mode) === "isolatedHalf") {
        setDraftWingAuthoringPreview({
          ...getDraftWingAuthoringPreview(draftProp),
          mirrorToBoth: propMirrorToggle.checked
        });
        syncDraftWingMirrorModeFromPreview(draftProp);
      } else {
        draftProp.attachment.mirrorMode = draftProp.categoryKey === "wingSet" && propMirrorToggle.checked ? "paired" : "single";
      }
      draftProp.attachment.position = transformInputs.position.map((input) => Number(input.value) || 0);
      draftProp.attachment.rotation = transformInputs.rotation.map((input) => Number(input.value) || 0);
      draftProp.attachment.scale = transformInputs.scale.map((input) => Number(input.value) || 1);
      setDraftCategoryKey(draftProp.categoryKey);
      if (draftProp.categoryKey !== "wingSet") {
        setWingSyncPreviewState(null, null);
      } else if (previousCategoryKey !== draftProp.categoryKey || previousMirrorMode !== draftProp.attachment.mirrorMode) {
        resetWingSyncPreviewState({ draftProp });
      } else if (JSON.stringify(previousWingAuthoring) !== JSON.stringify(((_e = draftProp.preview) == null ? void 0 : _e.wingAuthoring) || null)) {
        resetWingSyncPreviewState({ draftProp });
      }
      refreshDraftTemplatePresentationFromSource();
      rebuildDraftStage();
      commitDraftHistoryStep();
    }
    function nextRequestId() {
      state.requestCounter += 1;
      return `creator-${state.requestCounter}`;
    }
    function sendHostRequest(type, payload) {
      if (window.parent === window) {
        return Promise.reject(new Error("No manager host is connected."));
      }
      const requestId = nextRequestId();
      return new Promise((resolve, reject) => {
        state.pendingRequests.set(requestId, { resolve, reject });
        window.parent.postMessage({ type, requestId, payload }, BRIDGE_TARGET_ORIGIN);
        window.setTimeout(() => {
          if (!state.pendingRequests.has(requestId)) return;
          state.pendingRequests.delete(requestId);
          reject(new Error("Creator request timed out."));
        }, 3e4);
      });
    }
    function upsertCategory(snapshot, categoryRecord, replaceKey = null) {
      const keysToReplace = /* @__PURE__ */ new Set([categoryRecord.key]);
      if (replaceKey) keysToReplace.add(replaceKey);
      const categories = snapshot.categories.filter((entry) => !keysToReplace.has(entry.key));
      categories.push(categoryRecord);
      return buildHomepageCatalogSnapshot2({ categories, props: snapshot.props });
    }
    function removeCategory(snapshot, categoryKey) {
      return buildHomepageCatalogSnapshot2({
        categories: snapshot.categories.filter((entry) => entry.key !== categoryKey),
        props: snapshot.props.filter((entry) => entry.categoryKey !== categoryKey)
      });
    }
    function upsertProp(snapshot, propRecord, replaceKey = null) {
      const keysToReplace = /* @__PURE__ */ new Set([propRecord.key]);
      if (replaceKey) keysToReplace.add(replaceKey);
      const props = snapshot.props.filter((entry) => !keysToReplace.has(entry.key));
      props.push(propRecord);
      return buildHomepageCatalogSnapshot2({ categories: snapshot.categories, props });
    }
    function removeProp(snapshot, propKey) {
      return buildHomepageCatalogSnapshot2({
        categories: snapshot.categories,
        props: snapshot.props.filter((entry) => entry.key !== propKey)
      });
    }
    function resolveSnapshotPropKey(snapshot, propRecord, preferredKey = null) {
      const props = Array.isArray(snapshot == null ? void 0 : snapshot.props) ? snapshot.props : [];
      const preferredRawKey = typeof preferredKey === "string" ? preferredKey.trim() : "";
      if (preferredRawKey) {
        const exactPreferredMatch = props.find((entry) => entry.key === preferredRawKey);
        if (exactPreferredMatch == null ? void 0 : exactPreferredMatch.key) return exactPreferredMatch.key;
        const normalizedPreferredKey = normalizeHomepagePropKey2(preferredRawKey);
        if (normalizedPreferredKey) {
          const normalizedPreferredMatch = props.find((entry) => normalizeHomepagePropKey2(entry.key) === normalizedPreferredKey);
          if (normalizedPreferredMatch == null ? void 0 : normalizedPreferredMatch.key) return normalizedPreferredMatch.key;
        }
      }
      if (propRecord == null ? void 0 : propRecord.key) {
        const exactPropMatch = props.find((entry) => entry.key === propRecord.key);
        if (exactPropMatch == null ? void 0 : exactPropMatch.key) return exactPropMatch.key;
        const normalizedPropKey = normalizeHomepagePropKey2(propRecord.key);
        if (normalizedPropKey) {
          const normalizedPropMatch = props.find((entry) => normalizeHomepagePropKey2(entry.key) === normalizedPropKey);
          if (normalizedPropMatch == null ? void 0 : normalizedPropMatch.key) return normalizedPropMatch.key;
        }
      }
      if (propRecord == null ? void 0 : propRecord.storagePath) {
        const storagePathMatch = props.find((entry) => entry.storagePath === propRecord.storagePath);
        if (storagePathMatch == null ? void 0 : storagePathMatch.key) return storagePathMatch.key;
      }
      if (propRecord == null ? void 0 : propRecord.assetUrl) {
        const assetUrlMatch = props.find((entry) => entry.assetUrl === propRecord.assetUrl);
        if (assetUrlMatch == null ? void 0 : assetUrlMatch.key) return assetUrlMatch.key;
      }
      if ((propRecord == null ? void 0 : propRecord.label) && (propRecord == null ? void 0 : propRecord.categoryKey)) {
        const labelCategoryMatch = props.find((entry) => entry.label === propRecord.label && entry.categoryKey === propRecord.categoryKey);
        if (labelCategoryMatch == null ? void 0 : labelCategoryMatch.key) return labelCategoryMatch.key;
      }
      return preferredRawKey || (propRecord == null ? void 0 : propRecord.key) || null;
    }
    function remapPropsToCategoryKey(snapshot, previousKey, nextKey) {
      if (!previousKey || !nextKey || previousKey === nextKey) {
        return snapshot;
      }
      const props = snapshot.props.map((entry) => entry.categoryKey === previousKey ? { ...entry, categoryKey: nextKey } : entry);
      return buildHomepageCatalogSnapshot2({ categories: snapshot.categories, props });
    }
    async function uploadCurrentFile(file) {
      if (!file) return false;
      if (state.motionPreviewEnabled) {
        setMotionPreviewEnabled(false, { silent: true });
      }
      const draftLoadPlan = await buildDraftLoadPlanFromUpload(file);
      commitDraftLoadPlan(draftLoadPlan, {
        disableTurntable: true,
        announceMessage: `Loaded ${file.name} into the XiO workspace.`
      });
      return true;
    }
    async function publishDraftProp({ archive = false } = {}) {
      var _a2, _b2, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
      applyDraftFromInputs();
      const draftProp = ensureDraftProp();
      if (draftProp.preview && Object.hasOwn(draftProp.preview, "singleWingSide")) {
        delete draftProp.preview.singleWingSide;
      }
      if (isCreatorOnlyPropRecord(draftProp)) {
        throw new Error("Built-in XiO wing states cannot be published as new props.");
      }
      if (isBlobBackedLocalDraft(draftProp)) {
        throw new Error("Standalone local draft saves cannot persist dropped GLB files after refresh. Open the manager route to publish this asset.");
      }
      if (state.publishEnabled && typeof (draftProp == null ? void 0 : draftProp.assetUrl) === "string" && draftProp.assetUrl.startsWith("blob:")) {
        if (!(state.draftLocalFile instanceof File)) {
          throw new Error("This local GLB preview needs to be re-dropped before it can be published live.");
        }
        try {
          const uploadResponse = await sendHostRequest(HOMEPAGE_PROP_UPLOAD_REQUEST2, {
            file: state.draftLocalFile
          });
          draftProp.assetUrl = ((_a2 = uploadResponse == null ? void 0 : uploadResponse.data) == null ? void 0 : _a2.assetUrl) || draftProp.assetUrl;
          draftProp.storagePath = ((_b2 = uploadResponse == null ? void 0 : uploadResponse.data) == null ? void 0 : _b2.storagePath) || null;
          state.draftSourceLabel = state.draftLocalFile.name;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to upload the dropped GLB for live publishing.";
          throw new Error(`${message} The GLB is still loaded locally in the stage, but it was not uploaded to the live game yet.`);
        }
      }
      if (!draftProp.label) throw new Error("Prop name is required before publishing.");
      if (!draftProp.key) draftProp.key = slugify(draftProp.label);
      if (!draftProp.key) throw new Error("Prop key could not be generated.");
      if (archive) {
        draftProp.active = false;
        draftProp.mysteryBoxEnabled = false;
      } else if (state.publishEnabled) {
        draftProp.active = draftProp.active !== false;
        draftProp.mysteryBoxEnabled = draftProp.mysteryBoxEnabled === true;
      }
      const shouldPinMysteryTestReward = !archive && draftProp.active !== false && draftProp.mysteryBoxEnabled === true;
      draftProp.archived = archive;
      const baselineKey = ((_c = state.editSession.baselineProp) == null ? void 0 : _c.key) || null;
      const selectedLiveKey = state.selectedLivePropKey && state.selectedLivePropKey !== draftProp.key ? state.selectedLivePropKey : null;
      const previousKey = baselineKey && baselineKey !== draftProp.key ? baselineKey : selectedLiveKey;
      let saveResponse = null;
      if (state.publishEnabled) {
        saveResponse = await sendHostRequest(HOMEPAGE_PROP_SAVE_REQUEST2, {
          entity: "prop",
          record: draftProp,
          previousKey
        });
      }
      const persistedPropKey = typeof ((_d = saveResponse == null ? void 0 : saveResponse.data) == null ? void 0 : _d.persistedPropKey) === "string" && saveResponse.data.persistedPropKey.trim().length > 0 ? saveResponse.data.persistedPropKey.trim() : draftProp.key;
      const authoritativeSnapshot = ((_e = saveResponse == null ? void 0 : saveResponse.data) == null ? void 0 : _e.snapshot) ? withCatalogFallback(saveResponse.data.snapshot) : null;
      const nextSnapshot = authoritativeSnapshot || upsertProp(state.snapshot, deepCopyProp(draftProp), previousKey);
      const resolvedPersistedPropKey = resolveSnapshotPropKey(nextSnapshot, draftProp, persistedPropKey);
      if (resolvedPersistedPropKey) {
        draftProp.key = resolvedPersistedPropKey;
      }
      state.selectedLivePropKey = resolvedPersistedPropKey;
      state.liveCategoryFilter = draftProp.categoryKey || "all";
      state.liveSearchQuery = "";
      state.snapshot = nextSnapshot;
      persistHomepageCatalogSnapshot2(state.snapshot);
      renderAll();
      if (state.publishEnabled) {
        console.info("[XiO Creator] Live prop save completed.", {
          draftPropKey: ensureDraftProp().key,
          persistedPropKey: resolvedPersistedPropKey,
          snapshotUpdatedAt: (_i = (_h = authoritativeSnapshot == null ? void 0 : authoritativeSnapshot.updatedAt) != null ? _h : (_g = (_f = saveResponse == null ? void 0 : saveResponse.data) == null ? void 0 : _f.snapshot) == null ? void 0 : _g.updatedAt) != null ? _i : null,
          mysteryTestOverride: (_k = (_j = saveResponse == null ? void 0 : saveResponse.data) == null ? void 0 : _j.mysteryTestOverride) != null ? _k : null
        });
      }
      log(`${archive ? "Archived" : state.publishEnabled ? "Published" : "Saved"} ${draftProp.label} ${state.publishEnabled ? "to the live game" : "to local draft storage"}.`);
      if (!archive && state.publishEnabled) {
        if (shouldPinMysteryTestReward) {
          const shouldLaunchMysteryTest = await requestMysteryLaunchConfirmation({
            title: `${draftProp.label} is live`,
            message: "Saved into the live inventory and pinned as the next Mystery Box reward for testing. Would you like to go to the Homepage now and pull the Mystery scroll?"
          });
          if (shouldLaunchMysteryTest) {
            log(`Opening Homepage so you can test ${draftProp.label} as the next Mystery Box reward.`);
            launchMysteryBoxTest();
            return;
          }
          showCreatorNotice({
            tone: "success",
            eyebrow: "Live Inventory Updated",
            title: `${draftProp.label} is live`,
            message: "Saved into the live inventory and pinned as the next Mystery Box reward for testing.",
            timeoutMs: 5600
          });
          return;
        }
        showCreatorNotice({
          tone: "success",
          eyebrow: "Live Inventory Updated",
          title: `${draftProp.label} is live`,
          message: "Saved into the live inventory. Mystery Box is off for this prop, so it will not be the next reward.",
          timeoutMs: 5600
        });
        return;
      }
      if (!archive && shouldPinMysteryTestReward) {
        const localMysteryTestState = persistStandaloneMysteryTestReward(
          ensureDraftProp().key,
          (_l = nextSnapshot == null ? void 0 : nextSnapshot.updatedAt) != null ? _l : null
        );
        console.info("[XiO Creator] Local prop save pinned for mystery-box testing.", {
          draftPropKey: ensureDraftProp().key,
          snapshotUpdatedAt: (_m = nextSnapshot == null ? void 0 : nextSnapshot.updatedAt) != null ? _m : null,
          mysteryTestOverride: localMysteryTestState.override,
          mysteryTestSession: localMysteryTestState.session
        });
        const shouldLaunchMysteryTest = await requestMysteryLaunchConfirmation({
          eyebrow: "Local Draft Saved",
          title: `${draftProp.label} is staged for Mystery Box testing`,
          message: "Saved in your local creator workspace and pinned as the next Mystery Box reward on this device. Would you like to go to the Homepage now and pull the Mystery scroll?"
        });
        if (shouldLaunchMysteryTest) {
          log(`Opening Homepage so you can test ${draftProp.label} as the next Mystery Box reward.`);
          launchMysteryBoxTest();
          return;
        }
        showCreatorNotice({
          tone: "success",
          eyebrow: "Local Draft Saved",
          title: `${draftProp.label} is staged for testing`,
          message: "Saved locally and pinned as the next Mystery Box reward on this device.",
          timeoutMs: 5600
        });
        return;
      }
      showCreatorNotice({
        tone: archive ? "info" : "success",
        eyebrow: archive ? "Archived" : "Local Draft Saved",
        title: archive ? `${draftProp.label} archived` : `${draftProp.label} saved locally`,
        message: archive ? "This prop has been removed from the active Mystery Box flow." : "This draft is saved only in your local creator workspace.",
        timeoutMs: 5600
      });
    }
    async function permanentlyDeleteProp(propKey) {
      var _a2, _b2;
      const propRecord = getProps().find((entry) => entry.key === propKey);
      if (!propRecord) {
        throw new Error("Select a live prop before deleting it.");
      }
      if (isCreatorOnlyPropRecord(propRecord)) {
        throw new Error("XiO built-in studio helper props cannot be permanently deleted.");
      }
      const deleteMessage = propRecord.storagePath ? `Delete "${propRecord.label}" permanently from the live inventory? This also removes the uploaded GLB from storage.` : `Delete "${propRecord.label}" permanently from the live inventory? This will hide the prop from the Mystery Box flow.`;
      const confirmed = await requestDestructiveConfirmation({
        eyebrow: "Delete Prop",
        title: `Delete ${propRecord.label}?`,
        message: deleteMessage,
        confirmLabel: "Delete Permanently"
      });
      if (!confirmed) {
        return false;
      }
      const deleteMode = propRecord.storagePath ? "hard" : "tombstone";
      let deleteResponse = null;
      if (state.publishEnabled) {
        deleteResponse = await sendHostRequest(HOMEPAGE_PROP_SAVE_REQUEST2, {
          entity: "prop",
          action: "delete",
          deleteMode,
          record: propRecord
        });
      }
      const authoritativeSnapshot = ((_a2 = deleteResponse == null ? void 0 : deleteResponse.data) == null ? void 0 : _a2.snapshot) ? withCatalogFallback(deleteResponse.data.snapshot) : null;
      state.snapshot = authoritativeSnapshot || (deleteMode === "hard" ? removeProp(state.snapshot, propRecord.key) : upsertProp(state.snapshot, {
        ...deepCopyProp(propRecord),
        active: false,
        archived: true,
        mysteryBoxEnabled: false
      }));
      if (state.selectedLivePropKey === propRecord.key) {
        state.selectedLivePropKey = null;
      }
      if (((_b2 = state.draftProp) == null ? void 0 : _b2.key) === propRecord.key) {
        clearEditSession();
        clearDraftTemplateSources({ releaseObjectUrl: true });
        state.draftProp = createEmptyDraftProp(propRecord.categoryKey || state.draftCategoryKey);
        state.draftSourceLabel = "No GLB loaded";
        resetWingSyncPreviewState({ draftProp: state.draftProp });
        rebuildDraftStage();
        resetDraftHistory();
      }
      persistHomepageCatalogSnapshot2(state.snapshot);
      renderAll();
      log(`Deleted ${propRecord.label} ${state.publishEnabled ? "from the live inventory" : "from the local creator catalog"}.`);
      showCreatorNotice({
        tone: "success",
        eyebrow: "Deleted",
        title: `${propRecord.label} removed`,
        message: state.publishEnabled ? "This prop has been removed from the live inventory and will no longer appear in the Mystery Box flow." : "This prop has been removed from the local creator catalog.",
        timeoutMs: 5600
      });
      return true;
    }
    async function saveCategory() {
      var _a2;
      const previousKey = ((_a2 = getCategoryEditorRecord()) == null ? void 0 : _a2.key) || null;
      const categoryRecord = {
        key: categoryKeyInput.value.trim(),
        label: categoryLabelInput.value.trim(),
        slotKey: categorySlotSelect.value,
        equipLimit: Math.max(1, Number(categoryEquipLimitInput.value) || 1),
        sortOrder: Number(categorySortOrderInput.value) || 0,
        enabled: categoryEnabledToggle.checked
      };
      if (!categoryRecord.key || !categoryRecord.label) {
        throw new Error("Category key and label are required.");
      }
      if (state.publishEnabled) {
        await sendHostRequest(HOMEPAGE_PROP_SAVE_REQUEST2, {
          entity: "category",
          record: categoryRecord,
          previousKey: previousKey && previousKey !== categoryRecord.key ? previousKey : null
        });
      }
      state.snapshot = upsertCategory(
        state.snapshot,
        categoryRecord,
        previousKey && previousKey !== categoryRecord.key ? previousKey : null
      );
      state.snapshot = remapPropsToCategoryKey(
        state.snapshot,
        previousKey,
        categoryRecord.key
      );
      if (!previousKey || state.draftCategoryKey === previousKey || ensureDraftProp().categoryKey === previousKey) {
        setDraftCategoryKey(categoryRecord.key);
      }
      setCategoryEditorKey(categoryRecord.key);
      persistHomepageCatalogSnapshot2(state.snapshot);
      renderAll();
      log(`Saved category ${categoryRecord.label} ${state.publishEnabled ? "to the live game" : "locally"}.`);
      showCreatorNotice({
        tone: "success",
        eyebrow: "Category Saved",
        title: `${categoryRecord.label} updated`,
        message: `${categoryRecord.label} is ready to use in the prop category dropdown.`,
        timeoutMs: 4600
      });
    }
    async function deleteCurrentCategory() {
      const categoryRecord = getCategoryEditorRecord();
      if (!(categoryRecord == null ? void 0 : categoryRecord.key)) {
        throw new Error("Select a saved category before deleting it.");
      }
      if (CORE_CATEGORY_KEYS.has(categoryRecord.key)) {
        throw new Error("XiO core categories stay available and cannot be deleted.");
      }
      const propCount = state.snapshot.props.filter((entry) => entry.categoryKey === categoryRecord.key).length;
      const confirmed = await requestDestructiveConfirmation({
        eyebrow: "Delete Category",
        title: `Delete ${categoryRecord.label}?`,
        message: propCount > 0 ? `This removes the category and ${propCount} prop${propCount === 1 ? "" : "s"} assigned to it from the live inventory.` : `This removes the category from the live inventory and the prop category dropdown.`,
        confirmLabel: "Delete Category"
      });
      if (!confirmed) {
        return false;
      }
      if (state.publishEnabled) {
        await sendHostRequest(HOMEPAGE_PROP_SAVE_REQUEST2, {
          entity: "category",
          action: "delete",
          record: categoryRecord
        });
      }
      state.snapshot = removeCategory(state.snapshot, categoryRecord.key);
      const nextAvailableCategory = state.snapshot.categories[0] || null;
      const deletedDraftCategory = ensureDraftProp().categoryKey === categoryRecord.key;
      if ((state.draftCategoryKey === categoryRecord.key || deletedDraftCategory) && nextAvailableCategory) {
        setDraftCategoryKey(nextAvailableCategory.key);
      }
      if (deletedDraftCategory) {
        clearEditSession();
        clearDraftTemplateSources({ releaseObjectUrl: true });
        state.draftProp = createEmptyDraftProp((nextAvailableCategory == null ? void 0 : nextAvailableCategory.key) || state.draftCategoryKey);
        state.draftSourceLabel = "No GLB loaded";
        resetWingSyncPreviewState({ draftProp: state.draftProp });
        rebuildDraftStage();
        resetDraftHistory();
      }
      if (state.liveCategoryFilter === categoryRecord.key) {
        state.liveCategoryFilter = "all";
      }
      if (state.selectedLivePropKey && !getProps().some((entry) => entry.key === state.selectedLivePropKey)) {
        state.selectedLivePropKey = null;
      }
      setCategoryEditorKey((nextAvailableCategory == null ? void 0 : nextAvailableCategory.key) || null);
      persistHomepageCatalogSnapshot2(state.snapshot);
      renderAll();
      log(`Deleted category ${categoryRecord.label} ${state.publishEnabled ? "from the live game" : "locally"}.`);
      showCreatorNotice({
        tone: "success",
        eyebrow: "Category Deleted",
        title: `${categoryRecord.label} removed`,
        message: "The category list and prop dropdown were updated right away.",
        timeoutMs: 5200
      });
      return true;
    }
    function beginNewCategoryDraft({ focusKeyField = false } = {}) {
      setCategoryEditorKey(null);
      syncCategoryForm(null);
      renderCategoryOptions();
      if (categoryManagerSection) {
        categoryManagerSection.open = true;
      }
      if (focusKeyField) {
        window.setTimeout(() => {
          categoryLabelInput == null ? void 0 : categoryLabelInput.focus();
        }, 0);
      }
    }
    async function hydrateDraftFromPropRecord(propRecord, {
      announce = true,
      resetView = true,
      preserveEditSession = false
    } = {}) {
      const draftLoadPlan = await buildDraftLoadPlanFromPropRecord(propRecord);
      commitDraftLoadPlan(draftLoadPlan, {
        preserveEditSession,
        resetView,
        announceMessage: announce ? `Equipped ${propRecord.label} on XiO.` : null
      });
    }
    async function loadLiveProp(propKey, options = {}) {
      const propRecord = getProps().find((entry) => entry.key === propKey);
      if (!propRecord) return false;
      try {
        await hydrateDraftFromPropRecord(propRecord, options);
        return true;
      } catch (error) {
        const fallbackMessage = `Unable to load ${propRecord.label} on XiO.`;
        if ((error == null ? void 0 : error.code) === "link-required") {
          log(error.message || fallbackMessage);
          renderAll();
          return false;
        }
        if ((error == null ? void 0 : error.code) === "missing-asset") {
          log(error.message || fallbackMessage);
          renderAll();
          return false;
        }
        log(error instanceof Error ? error.message : fallbackMessage);
        renderAll();
        return false;
      }
    }
    function loadRandomPropFromCategory(categoryKey) {
      const options = getVisibleLiveProps().filter((entry) => entry.categoryKey === categoryKey);
      if (!options.length) {
        log(`No live ${categoryKey} props are available yet.`);
        return;
      }
      const choice = options[Math.floor(Math.random() * options.length)];
      void loadLiveProp(choice.key);
    }
    window.addEventListener("message", (event) => {
      var _a2, _b2, _c;
      if (event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.type === HOMEPAGE_CATALOG_SYNC2) {
        if ((_a2 = event.data.payload) == null ? void 0 : _a2.snapshot) {
          state.snapshot = withCatalogFallback(event.data.payload.snapshot);
          persistHomepageCatalogSnapshot2(state.snapshot);
        }
        state.publishEnabled = ((_b2 = event.data.payload) == null ? void 0 : _b2.publishEnabled) === true;
        state.publishReason = ((_c = event.data.payload) == null ? void 0 : _c.reason) || null;
        updatePublishStatus();
        renderAll();
        return;
      }
      if (event.data.type === HOMEPAGE_PROP_SAVE_RESULT2) {
        const pending = state.pendingRequests.get(event.data.requestId);
        if (!pending) return;
        state.pendingRequests.delete(event.data.requestId);
        if (event.data.ok) {
          pending.resolve(event.data);
        } else {
          pending.reject(new Error(event.data.error || "Creator request failed."));
        }
      }
    });
    window.parent.postMessage({ type: HOMEPAGE_CREATOR_READY2 }, BRIDGE_TARGET_ORIGIN);
    function resizeRenderer() {
      const width = stageShell.clientWidth;
      const height = stageShell.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    }
    new ResizeObserver(() => resizeRenderer()).observe(stageShell);
    resizeRenderer();
    let stageDragDepth = 0;
    creatorCanvas.addEventListener("click", (event) => {
      const selectableTargets = getSelectableStageTargets();
      if (!selectableTargets.length) return;
      const bounds = creatorCanvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      pointer.x = (event.clientX - bounds.left) / bounds.width * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(selectableTargets, true)[0];
      if (!hit) return;
      const selectedTarget = findSelectableTarget(hit.object);
      if (!selectedTarget) return;
      const wasAlreadySelected = state.stageSelection === selectedTarget;
      setStageSelection(selectedTarget);
      syncPropForm();
      if (!wasAlreadySelected) {
        const selectedProp = getSelectedLiveProp();
        const label = (selectedProp == null ? void 0 : selectedProp.label) || ensureDraftProp().label || "current prop";
        log(`Selected ${label} for direct transform editing.`);
      }
    });
    $("toggle-preview-motion-button").addEventListener("click", () => {
      setMotionPreviewEnabled(!state.motionPreviewEnabled);
    });
    $("auto-lock-fit-button").addEventListener("click", () => {
      autoLockDraftPlacementToSlot();
    });
    $("sync-both-wings-button").addEventListener("click", () => {
      syncBothWingsAnimationPreview();
    });
    $("sync-one-wing-button").addEventListener("click", () => {
      syncOneWingAnimationPreview();
    });
    $("toggle-turntable-button").addEventListener("click", () => {
      if (state.motionPreviewEnabled) {
        return;
      }
      state.turntableEnabled = !state.turntableEnabled;
      renderStageToolbarControls();
    });
    $("fit-view-button").addEventListener("click", presentCurrentLoadInStage);
    $("focus-prop-button").addEventListener("click", focusCurrentProp);
    $("edit-prop-button").addEventListener("click", () => {
      void activatePropEditing();
    });
    togglePlacementDepthButton.addEventListener("click", () => {
      toggleDraftPlacementDepth();
    });
    undoAdjustmentButton.addEventListener("click", () => {
      undoDraftAdjustment();
    });
    redoAdjustmentButton.addEventListener("click", () => {
      redoDraftAdjustment();
    });
    saveEditButton.addEventListener("click", async () => {
      try {
        await saveActiveEditSession();
      } catch (error) {
        log(error instanceof Error ? error.message : "Unable to save prop edits.");
      }
    });
    cancelEditButton.addEventListener("click", async () => {
      try {
        await cancelActiveEditSession();
      } catch (error) {
        log(error instanceof Error ? error.message : "Unable to cancel prop edits.");
      }
    });
    $("refresh-live-button").addEventListener("click", () => {
      window.parent.postMessage({ type: HOMEPAGE_CREATOR_READY2 }, BRIDGE_TARGET_ORIGIN);
    });
    $("clear-stage-button").addEventListener("click", () => {
      clearEditSession();
      state.selectedLivePropKey = null;
      clearDraftTemplateSources({ releaseObjectUrl: true });
      state.draftProp = createEmptyDraftProp(state.draftCategoryKey);
      state.draftSourceLabel = "No GLB loaded";
      resetWingSyncPreviewState({ draftProp: state.draftProp });
      rebuildDraftStage();
      resetDraftHistory();
      renderAll();
      log("Cleared the stage and reset the workspace draft.");
    });
    $("duplicate-prop-button").addEventListener("click", () => {
      clearEditSession();
      const draftProp = deepCopyProp(ensureDraftProp());
      draftProp.key = draftProp.key ? `${draftProp.key}-copy` : "";
      draftProp.label = draftProp.label ? `${draftProp.label} Copy` : "";
      delete draftProp.creatorOnly;
      state.draftProp = draftProp;
      state.selectedLivePropKey = null;
      resetWingSyncPreviewState({ draftProp: state.draftProp });
      resetDraftHistory();
      renderAll();
      log("Duplicated the current prop draft.");
    });
    $("random-wings-button").addEventListener("click", () => loadRandomPropFromCategory("wingSet"));
    $("random-crown-button").addEventListener("click", () => loadRandomPropFromCategory("headWear"));
    $("random-body-gear-button") == null ? void 0 : $("random-body-gear-button").addEventListener("click", () => loadRandomPropFromCategory("bodyAccessory"));
    randomPropGeneratorButton == null ? void 0 : randomPropGeneratorButton.addEventListener("click", () => {
      openRandomGeneratorModal();
    });
    randomGeneratorCloseButton == null ? void 0 : randomGeneratorCloseButton.addEventListener("click", () => {
      if (!randomGeneratorIsBusy) {
        closeRandomGeneratorModal();
      }
    });
    randomGeneratorCancelButton == null ? void 0 : randomGeneratorCancelButton.addEventListener("click", () => {
      if (!randomGeneratorIsBusy) {
        closeRandomGeneratorModal();
      }
    });
    randomGeneratorGenerateButton == null ? void 0 : randomGeneratorGenerateButton.addEventListener("click", () => {
      void generateRandomWingDraftToStage();
    });
    [
      randomGeneratorCategorySelect,
      randomGeneratorRaritySelect,
      randomGeneratorThemeModeSelect,
      randomGeneratorThemeInput,
      randomGeneratorDetailDensitySelect,
      randomGeneratorColorHarmonySelect,
      randomGeneratorFitModeSelect,
      randomGeneratorBaseReferenceSelect
    ].filter(Boolean).forEach((input) => {
      input.addEventListener("input", renderRandomGeneratorSummary);
      input.addEventListener("change", renderRandomGeneratorSummary);
    });
    wingAutoIsolateButton == null ? void 0 : wingAutoIsolateButton.addEventListener("click", () => {
      void applyWingAuthoringState({
        mode: "isolatedHalf",
        sourceSide: getPreferredWingAuthoringSide(),
        mirrorToBoth: true
      }, {
        announceMessage: "Auto-isolated the active wing source and mirrored it to both wings."
      });
    });
    wingResetSourceButton == null ? void 0 : wingResetSourceButton.addEventListener("click", () => {
      resetWingAuthoringToOriginal();
    });
    wingUseLeftButton == null ? void 0 : wingUseLeftButton.addEventListener("click", () => {
      void applyWingAuthoringState({
        mode: "isolatedHalf",
        sourceSide: "left"
      }, {
        announceMessage: "Switched the wing source to the left half."
      });
    });
    wingUseRightButton == null ? void 0 : wingUseRightButton.addEventListener("click", () => {
      void applyWingAuthoringState({
        mode: "isolatedHalf",
        sourceSide: "right"
      }, {
        announceMessage: "Switched the wing source to the right half."
      });
    });
    wingMirrorBothToggle == null ? void 0 : wingMirrorBothToggle.addEventListener("change", () => {
      void applyWingAuthoringState({
        mode: "isolatedHalf",
        mirrorToBoth: wingMirrorBothToggle.checked
      }, {
        announceMessage: wingMirrorBothToggle.checked ? "Mirroring the isolated wing source to both wings." : "Previewing only one authored wing side."
      });
    });
    wingSplitOffsetInput == null ? void 0 : wingSplitOffsetInput.addEventListener("input", () => {
      if (getDraftWingAuthoringPreview().mode !== "isolatedHalf") return;
      void applyWingAuthoringState({
        splitOffset: Number(wingSplitOffsetInput.value)
      }, {
        commitHistoryStep: false,
        autoFit: false,
        silent: true
      });
    });
    wingSplitOffsetInput == null ? void 0 : wingSplitOffsetInput.addEventListener("change", () => {
      if (getDraftWingAuthoringPreview().mode !== "isolatedHalf") return;
      void applyWingAuthoringState({
        splitOffset: Number(wingSplitOffsetInput.value)
      }, {
        commitHistoryStep: true,
        autoFit: false,
        announceMessage: "Updated the wing split offset."
      });
    });
    wingTrimMarginInput == null ? void 0 : wingTrimMarginInput.addEventListener("input", () => {
      if (getDraftWingAuthoringPreview().mode !== "isolatedHalf") return;
      void applyWingAuthoringState({
        trimMargin: Number(wingTrimMarginInput.value)
      }, {
        commitHistoryStep: false,
        autoFit: false,
        silent: true
      });
    });
    wingTrimMarginInput == null ? void 0 : wingTrimMarginInput.addEventListener("change", () => {
      if (getDraftWingAuthoringPreview().mode !== "isolatedHalf") return;
      void applyWingAuthoringState({
        trimMargin: Number(wingTrimMarginInput.value)
      }, {
        commitHistoryStep: true,
        autoFit: false,
        announceMessage: "Updated the wing trim margin."
      });
    });
    wingMotionPreviewButton == null ? void 0 : wingMotionPreviewButton.addEventListener("click", () => {
      setMotionPreviewEnabled(!state.motionPreviewEnabled);
    });
    wingMotionLinkedToggle == null ? void 0 : wingMotionLinkedToggle.addEventListener("change", () => {
      setDraftWingMotionLinked(wingMotionLinkedToggle.checked, { commitHistoryStep: true });
      refreshWingMotionPreviewLive({ autoStart: true });
    });
    Object.entries(wingMotionInputs).forEach(([groupKey, controls]) => {
      Object.values(controls).forEach((input) => {
        if (!input) return;
        input.addEventListener("input", () => {
          applyWingMotionInputGroup(groupKey, { commitHistoryStep: false });
          refreshWingMotionPreviewLive({ autoStart: true });
          renderAll();
        });
        input.addEventListener("change", () => {
          applyWingMotionInputGroup(groupKey, { commitHistoryStep: true });
          refreshWingMotionPreviewLive({ autoStart: true });
          renderAll();
        });
      });
    });
    linkPropsFolderButton == null ? void 0 : linkPropsFolderButton.addEventListener("click", () => {
      void promptToLinkStandalonePropsFolder();
    });
    $("publish-prop-button").addEventListener("click", async () => {
      try {
        await publishDraftProp({ archive: false });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to publish prop.";
        log(message);
        showCreatorNotice({
          tone: "error",
          eyebrow: "Save Failed",
          title: "Prop was not saved",
          message,
          timeoutMs: 7200
        });
      }
    });
    $("archive-prop-button").addEventListener("click", async () => {
      try {
        await publishDraftProp({ archive: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to archive prop.";
        log(message);
        showCreatorNotice({
          tone: "error",
          eyebrow: "Archive Failed",
          title: "Prop was not archived",
          message,
          timeoutMs: 7200
        });
      }
    });
    $("save-category-button").addEventListener("click", async () => {
      try {
        await saveCategory();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save category.";
        log(message);
        showCreatorNotice({
          tone: "error",
          eyebrow: "Category Failed",
          title: "Category was not saved",
          message,
          timeoutMs: 6200
        });
      }
    });
    $("use-category-button").addEventListener("click", () => {
      var _a2;
      const nextCategoryKey = (_a2 = getCategoryEditorRecord()) == null ? void 0 : _a2.key;
      if (!nextCategoryKey) {
        showCreatorNotice({
          tone: "error",
          eyebrow: "Save Category First",
          title: "Category is not ready yet",
          message: "Save the category before using it in the prop draft dropdown.",
          timeoutMs: 4200
        });
        return;
      }
      setDraftCategoryKey(nextCategoryKey);
      showCreatorNotice({
        tone: "success",
        eyebrow: "Draft Updated",
        title: "Draft category changed",
        message: "New props will save into the selected category.",
        timeoutMs: 3200
      });
      renderAll();
    });
    categoryEditorSelect == null ? void 0 : categoryEditorSelect.addEventListener("change", () => {
      const nextValue = categoryEditorSelect.value;
      if (nextValue === CATEGORY_EDITOR_NEW_VALUE) {
        beginNewCategoryDraft();
        return;
      }
      setCategoryEditorKey(nextValue);
      syncCategoryForm();
    });
    newCategoryButton == null ? void 0 : newCategoryButton.addEventListener("click", () => {
      beginNewCategoryDraft({ focusKeyField: true });
    });
    deleteCategoryButton == null ? void 0 : deleteCategoryButton.addEventListener("click", async () => {
      try {
        await deleteCurrentCategory();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to delete category.";
        log(message);
        showCreatorNotice({
          tone: "error",
          eyebrow: "Delete Failed",
          title: "Category was not deleted",
          message,
          timeoutMs: 7200
        });
      }
    });
    categoryLabelInput == null ? void 0 : categoryLabelInput.addEventListener("input", () => {
      if (!categoryKeyInput.value.trim()) {
        categoryKeyInput.value = slugify(categoryLabelInput.value);
      }
    });
    $("load-selected-live-button").addEventListener("click", () => {
      if (!state.selectedLivePropKey) {
        log("Select a live prop from the right panel first.");
        return;
      }
      void loadLiveProp(state.selectedLivePropKey);
    });
    $("reset-appearance-button").addEventListener("click", () => {
      const draftProp = ensureDraftProp();
      draftProp.eyePreset = null;
      draftProp.materialPreset = null;
      rebuildDraftStage();
      commitDraftHistoryStep();
      renderAll();
    });
    transformModeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setTransformMode(button.dataset.transformMode);
      });
    });
    [
      propLabelInput,
      propKeyInput,
      propCategorySelect,
      propRaritySelect,
      propDescriptionInput,
      propTagsInput,
      propActiveToggle,
      propMysteryToggle,
      propMirrorToggle,
      eyePresetSelect,
      materialPresetSelect,
      ...transformInputs.position,
      ...transformInputs.rotation,
      ...transformInputs.scale
    ].forEach((input) => input.addEventListener("change", applyDraftFromInputs));
    window.addEventListener("keydown", (event) => {
      if (!(randomGeneratorModal == null ? void 0 : randomGeneratorModal.hidden)) {
        if (event.key === "Escape" && !randomGeneratorIsBusy) {
          event.preventDefault();
          closeRandomGeneratorModal();
          return;
        }
        trapFocusInsideRandomGenerator(event);
      }
      if (!(saveSuccessModal == null ? void 0 : saveSuccessModal.hidden) && event.key === "Escape") {
        event.preventDefault();
        resolveSaveSuccessPrompt(false);
        return;
      }
      if (!(deleteConfirmModal == null ? void 0 : deleteConfirmModal.hidden) && event.key === "Escape") {
        event.preventDefault();
        resolveDeleteConfirm(false);
        return;
      }
      const target = event.target;
      const tagName = target instanceof HTMLElement ? target.tagName : "";
      const isTypingTarget = target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(tagName));
      if (isTypingTarget || !(event.ctrlKey || event.metaKey) || event.altKey) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "z" && event.shiftKey) {
        event.preventDefault();
        redoDraftAdjustment();
        return;
      }
      if (key === "z") {
        event.preventDefault();
        undoDraftAdjustment();
        return;
      }
      if (key === "y") {
        event.preventDefault();
        redoDraftAdjustment();
      }
    });
    propLabelInput.addEventListener("input", () => {
      if (!propKeyInput.value.trim()) {
        propKeyInput.value = slugify(propLabelInput.value);
      }
    });
    $("glb-upload-input").addEventListener("change", async (event) => {
      var _a2;
      const file = (_a2 = event.target.files) == null ? void 0 : _a2[0];
      if (!file) return;
      try {
        await uploadCurrentFile(file);
        const draftProp = ensureDraftProp();
        if (!draftProp.label) draftProp.label = file.name.replace(/\.[^.]+$/, "");
        if (!draftProp.key) draftProp.key = slugify(draftProp.label);
        renderAll();
      } catch (error) {
        log(error instanceof Error ? error.message : "Unable to upload GLB.");
      } finally {
        event.target.value = "";
      }
    });
    creatorNoticeCloseButton == null ? void 0 : creatorNoticeCloseButton.addEventListener("click", () => {
      hideCreatorNotice();
    });
    saveSuccessCloseButton == null ? void 0 : saveSuccessCloseButton.addEventListener("click", () => {
      resolveSaveSuccessPrompt(false);
    });
    saveSuccessStayButton == null ? void 0 : saveSuccessStayButton.addEventListener("click", () => {
      resolveSaveSuccessPrompt(false);
    });
    saveSuccessLaunchButton == null ? void 0 : saveSuccessLaunchButton.addEventListener("click", () => {
      resolveSaveSuccessPrompt(true);
    });
    deleteConfirmCloseButton == null ? void 0 : deleteConfirmCloseButton.addEventListener("click", () => {
      resolveDeleteConfirm(false);
    });
    deleteConfirmCancelButton == null ? void 0 : deleteConfirmCancelButton.addEventListener("click", () => {
      resolveDeleteConfirm(false);
    });
    deleteConfirmConfirmButton == null ? void 0 : deleteConfirmConfirmButton.addEventListener("click", () => {
      resolveDeleteConfirm(true);
    });
    deleteConfirmModal == null ? void 0 : deleteConfirmModal.addEventListener("click", (event) => {
      if (event.target === deleteConfirmModal) {
        resolveDeleteConfirm(false);
      }
    });
    saveSuccessModal == null ? void 0 : saveSuccessModal.addEventListener("click", (event) => {
      if (event.target === saveSuccessModal) {
        resolveSaveSuccessPrompt(false);
      }
    });
    randomGeneratorModal == null ? void 0 : randomGeneratorModal.addEventListener("click", (event) => {
      if (event.target === randomGeneratorModal && !randomGeneratorIsBusy) {
        closeRandomGeneratorModal();
      }
    });
    ["dragenter", "dragover"].forEach((eventName) => {
      stageShell.addEventListener(eventName, (event) => {
        if (!hasFileDataTransfer(event.dataTransfer)) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (eventName === "dragenter") {
          stageDragDepth += 1;
        }
        dropOverlay.classList.add("is-visible");
      });
    });
    stageShell.addEventListener("dragleave", (event) => {
      event.preventDefault();
      event.stopPropagation();
      stageDragDepth = Math.max(0, stageDragDepth - 1);
      if (stageDragDepth === 0) {
        dropOverlay.classList.remove("is-visible");
      }
    });
    stageShell.addEventListener("drop", (event) => {
      event.preventDefault();
      event.stopPropagation();
      stageDragDepth = 0;
      dropOverlay.classList.remove("is-visible");
      const file = extractGlbFileFromDataTransfer(event.dataTransfer);
      if (!file) {
        log("Drop a .glb file directly into the XiO stage to preview it.");
        return;
      }
      void uploadCurrentFile(file).then(() => {
        const draftProp = ensureDraftProp();
        if (!draftProp.label) draftProp.label = file.name.replace(/\.[^.]+$/, "");
        if (!draftProp.key) draftProp.key = slugify(draftProp.label);
        renderAll();
      }).catch((error) => {
        log(error instanceof Error ? error.message : "Unable to upload dropped GLB.");
      });
    });
    window.addEventListener("dragover", (event) => {
      if (!hasFileDataTransfer(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
    });
    window.addEventListener("drop", (event) => {
      if (!hasFileDataTransfer(event.dataTransfer)) {
        return;
      }
      const stageTarget = event.target instanceof Node && stageShell.contains(event.target);
      if (stageTarget) {
        return;
      }
      event.preventDefault();
    });
    function focusCategoryCard(categoryKey) {
      const category = getCategoryByKey(categoryKey);
      if (!category) return;
      state.draftCategoryKey = category.key;
      state.liveCategoryFilter = category.key;
      setDraftCategoryKey(category.key);
      setCategoryEditorKey(category.key);
      syncCategoryForm(category);
      if (categoryManagerSection) categoryManagerSection.open = true;
      renderAll();
      log(`Focused ${category.label} in the workspace.`);
    }
    liveCategoryList.addEventListener("click", (event) => {
      const unequipWingsButton = event.target.closest("[data-unequip-wings]");
      if (unequipWingsButton) {
        event.preventDefault();
        event.stopPropagation();
        void loadLiveProp("xioNoWings");
        return;
      }
      const target = event.target.closest("[data-category-card]");
      if (!target) return;
      focusCategoryCard(target.dataset.categoryCard);
    });
    liveCategoryList.addEventListener("keydown", (event) => {
      const target = event.target.closest("[data-category-card]");
      if (!target || event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      focusCategoryCard(target.dataset.categoryCard);
    });
    livePropList.addEventListener("click", (event) => {
      const deleteButton = event.target.closest("[data-delete-prop]");
      if (deleteButton) {
        event.preventDefault();
        event.stopPropagation();
        void permanentlyDeleteProp(deleteButton.dataset.deleteProp).catch((error) => {
          const message = error instanceof Error ? error.message : "Unable to permanently delete this prop.";
          log(message);
          showCreatorNotice({
            tone: "error",
            eyebrow: "Delete Failed",
            title: "Prop was not deleted",
            message,
            timeoutMs: 7200
          });
        });
        return;
      }
      const editPropButton = event.target.closest("[data-edit-prop]");
      if (editPropButton) {
        event.stopPropagation();
        void activatePropEditing(editPropButton.dataset.editProp);
        return;
      }
      const loadButton = event.target.closest("[data-load-prop]");
      if (loadButton) {
        void loadLiveProp(loadButton.dataset.loadProp);
      }
    });
    livePropList.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target.closest("[data-load-prop]");
      if (!target) return;
      event.preventDefault();
      void loadLiveProp(target.dataset.loadProp);
    });
    liveSearchInput.addEventListener("input", (event) => {
      state.liveSearchQuery = event.target.value || "";
      renderLiveCatalog();
    });
    liveCategoryFilter.addEventListener("change", (event) => {
      state.liveCategoryFilter = event.target.value || "all";
      renderLiveCatalog();
    });
    fitCameraToCharacter();
    state.draftProp = createEmptyDraftProp(state.draftCategoryKey);
    resetWingSyncPreviewState({ draftProp: state.draftProp });
    setTransformMode(state.transformMode);
    initializeLeftPanelSectionState();
    populateRandomGeneratorOptions();
    populateRandomGeneratorBaseReferences();
    renderRandomGeneratorSummary();
    renderAll();
    resetDraftHistory();
    syncPropForm();
    syncCategoryForm();
    void restoreStandalonePropsFolderLink();
    log("Creator ready. Drag a GLB into the stage to begin.");
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      orbitControls.update();
      if (state.motionPreviewEnabled) {
        updatePreviewMotion(dt);
      } else {
        if (state.turntableEnabled && performance.now() >= state.turntablePauseUntilMs) {
          xio.creatureGroup.rotation.y += dt * 0.32;
        }
        xio.leftEye.update(0.02, 0, dt);
        xio.rightEye.update(-0.02, 0, dt);
      }
      renderer.render(scene, camera);
    }
    animate();
  })().catch((error) => {
    console.error("[XiO Creator] Failed to initialize.", error);
    const workspaceLogElement = document.getElementById("workspace-log");
    if (workspaceLogElement) {
      const message = error instanceof Error ? error.message : "Unknown initialization failure.";
      workspaceLogElement.innerHTML = `
      <article class="workspace-log__entry">
        <span class="workspace-log__time">Boot Failure</span>
        <p class="workspace-log__message">${escapeHtml(message)}</p>
      </article>
    `;
    }
  });
})();
