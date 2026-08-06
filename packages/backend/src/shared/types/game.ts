/**
 * Game and room types
 */

export interface GameConfig {
  variantId: string;
  buyInCents: number;
  scenarioId?: string;
  musicId?: string;
  useFacilitator?: boolean;
  allowRebuys?: boolean;
  maxRebuys?: number;
  minPlayers?: number;
  maxPlayers?: number;
}

export interface RoomConfig extends GameConfig {
  name: string;
  ownerId: string;
  isPublic: boolean;
  password?: string;
  maxWaitTimeSeconds?: number;
}

export interface Room {
  id: string;
  name: string;
  ownerId: string;
  gameId?: string; // Null até a partida começar
  players: RoomPlayer[];
  config: RoomConfig;
  status: 'open' | 'full' | 'playing' | 'closed';
  createdAt: number;
  startedAt?: number;
  closedAt?: number;
  joinCode: string;
}

export interface RoomPlayer {
  userId: string;
  username: string;
  avatarUrl?: string;
  status: 'waiting' | 'ready' | 'playing' | 'disconnected';
  balanceCents: number;
  isBot: boolean;
  joinedAt: number;
  readyAt?: number;
}

export enum Scenario {
  CLASSIC_CASINO = 'classic_casino',
  MODERN_CASINO = 'modern_casino',
  ENGLISH_CLUB = 'english_club',
  VIP_ROOM = 'vip_room',
  VEGAS_NIGHT = 'vegas_night',
  TROPICAL_CASINO = 'tropical_casino',
  LUXURY_PENTHOUSE = 'luxury_penthouse',
  YACHT = 'yacht',
  MEDIEVAL_HALL = 'medieval_hall',
  OLD_WEST = 'old_west',
  CYBERPUNK = 'cyberpunk',
  SPACE = 'space',
  BEACH = 'beach',
  FOREST = 'forest',
  HOME = 'home',
}

export interface ScenarioConfig {
  id: Scenario;
  name: string;
  backgroundUrl: string;
  ambientSoundUrl?: string;
  musicTracks: string[];
  dealers?: string[]; // NPC avatars
  NPCs?: NPC[];
  lighting?: LightingConfig;
  particles?: ParticleEffect[];
  performanceMode?: {
    disableAnimations: boolean;
    disableParticles: boolean;
    staticBackground: boolean;
  };
}

export interface NPC {
  id: string;
  name: string;
  avatarUrl: string;
  position: { x: number; y: number };
  animations?: string[]; // walking, talking, idle
}

export interface LightingConfig {
  brightness: number; // 0-1
  ambience: 'daylight' | 'evening' | 'night' | 'candlelight';
  shadows?: boolean;
}

export interface ParticleEffect {
  type: 'confetti' | 'sparkles' | 'smoke' | 'rain';
  frequency: number;
  intensity: number;
}

export interface ReplayFrame {
  timestamp: number;
  gameState: {
    currentPlayerIndex: number;
    boardCards: string[];
    playerStacks: number[];
    potAmount: number;
    actionHistory: string[];
  };
}

export interface ReplayData {
  gameId: string;
  variantId: string;
  players: string[];
  frames: ReplayFrame[];
  result: {
    winner: string;
    amount: number;
  };
  duration: number; // milliseconds
  recordedAt: number;
}
