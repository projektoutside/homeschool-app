export type ExperienceKind = 'game' | 'classroom';
export type ExperienceRuntime = 'dom' | 'canvas' | 'phaser' | 'three' | 'react-three-fiber' | 'legacy-iframe';
export type OrientationPolicy = 'any' | 'portrait' | 'landscape';
export type ExperienceCapability = 'audio' | 'storage' | 'rewards' | 'speech' | 'camera' | 'microphone' | 'fullscreen' | 'orientation' | 'network';
export type ExperiencePermission = 'camera' | 'microphone' | 'geolocation' | 'accelerometer' | 'gyroscope';

export interface ExperienceCompatibility {
  legacyPaths: string[];
  protocolVersion: 1;
}

export interface BaseExperienceManifest {
  schemaVersion: 1;
  kind: ExperienceKind;
  id: string;
  title: string;
  version: string;
  orientation: OrientationPolicy;
  responsive: boolean;
  classification: string[];
  permissions: ExperiencePermission[];
  mediaBundles: string[];
  compatibility: ExperienceCompatibility;
}

export interface RewardDefinition {
  code: string;
  points: number;
}

export interface GameManifest extends BaseExperienceManifest {
  kind: 'game';
  entry: string;
  runtime: ExperienceRuntime;
  capabilities: ExperienceCapability[];
  rewards: RewardDefinition[];
}

export interface RoomDefinition {
  id: string;
  entry: string;
  runtime: Extract<ExperienceRuntime, 'dom' | 'canvas' | 'three' | 'react-three-fiber' | 'legacy-iframe'>;
  stations: string[];
  portals: Array<{ id: string; targetRoomId: string }>;
}

export interface StationDefinition {
  id: string;
  kind: 'catalog' | 'module';
  targetId: string;
  capabilities: ExperienceCapability[];
}

export interface ClassroomManifest extends BaseExperienceManifest {
  kind: 'classroom';
  entryRoomId: string;
  rooms: RoomDefinition[];
  stations: StationDefinition[];
}

export type ExperienceManifest = GameManifest | ClassroomManifest;
