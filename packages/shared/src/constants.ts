/**
 * Shared constants
 */

// ===== POKER =====

export const POKER_VARIANTS = {
  TEXAS_HOLDEM: 'texas_holdem',
  TEXAS_HOLDEM_HEADS_UP: 'texas_holdem_heads_up',
  POT_LIMIT_OMAHA: 'pot_limit_omaha',
  FIVE_CARD_DRAW: 'five_card_draw',
  SHORT_DECK_HOLDEM: 'short_deck_holdem',
  CRAZY_PINEAPPLE: 'crazy_pineapple',
} as const;

export const HAND_RANKS = {
  ROYAL_FLUSH: 'Royal Flush',
  STRAIGHT_FLUSH: 'Straight Flush',
  FOUR_OF_A_KIND: 'Four of a Kind',
  FULL_HOUSE: 'Full House',
  FLUSH: 'Flush',
  STRAIGHT: 'Straight',
  THREE_OF_A_KIND: 'Three of a Kind',
  TWO_PAIR: 'Two Pair',
  ONE_PAIR: 'One Pair',
  HIGH_CARD: 'High Card',
} as const;

// ===== SALDO INICIAL =====

export const INITIAL_BALANCE_CENTS = 10_000; // R$ 100,00
export const RECOVERY_BALANCE_CENTS = 10_000; // R$ 100,00
export const RECOVERY_COOLDOWN_HOURS = 24;

export const CONVERSION_RATE = {
  CENTS_PER_CHIP: 1, // R$ 0,01 = 1 chip
  CENTS_PER_THOUSAND_CHIPS: 1_000, // R$ 10,00 = 1.000 chips
  CENTS_PER_TEN_THOUSAND_CHIPS: 10_000, // R$ 100,00 = 10.000 chips
} as const;

// ===== LIMITES DE TRANSFERÊNCIA =====

export const GIFT_LIMITS = {
  MAX_PER_TRANSACTION_CENTS: 10_000, // R$ 100,00
  MAX_PER_DAY_CENTS: 50_000, // R$ 500,00
} as const;

export const LOAN_LIMITS = {
  MAX_PER_TRANSACTION_CENTS: 100_000, // R$ 1.000,00
  MAX_ACTIVE_LOANS: 5,
  DEFAULT_RETURN_DAYS: 7,
} as const;

// ===== TEMPOS =====

export const TIMEOUTS = {
  GAME_ACTION_SECONDS: 30,
  GAME_RECONNECT_SECONDS: 30,
  HAND_TIMEOUT_SECONDS: 120,
  ROOM_IDLE_SECONDS: 600, // 10 min
} as const;

// ===== CONFIGURAÇÕES DE SEGURANÇA =====

export const SECURITY = {
  BCRYPT_ROUNDS: 10,
  JWT_EXPIRY: '1h',
  REFRESH_TOKEN_EXPIRY: '7d',
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
} as const;

// ===== RATE LIMITING =====

export const RATE_LIMITS = {
  API_REQUESTS_PER_MINUTE: 100,
  WEBSOCKET_EVENTS_PER_SECOND: 50,
  GAME_ACTIONS_PER_SECOND: 10,
  CHAT_MESSAGES_PER_MINUTE: 30,
} as const;

// ===== SCENARIOS =====

export const SCENARIOS = [
  'classic_casino',
  'modern_casino',
  'english_club',
  'vip_room',
  'vegas_night',
  'tropical_casino',
  'luxury_penthouse',
  'yacht',
  'medieval_hall',
  'old_west',
  'cyberpunk',
  'space',
  'beach',
  'forest',
  'home',
] as const;

// ===== TROPHIES =====

export const TROPHY_MATERIALS = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'crystal', 'special'] as const;
export const TROPHY_RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;

// ===== VALIDAÇÃO =====

export const VALIDATION = {
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  USERNAME_REGEX: /^[a-zA-Z0-9_-]+$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIRES_UPPERCASE: true,
  PASSWORD_REQUIRES_LOWERCASE: true,
  PASSWORD_REQUIRES_NUMBERS: true,
  PASSWORD_REQUIRES_SPECIAL: false,
} as const;

// ===== MODERAÇÃO =====

export const MODERATION = {
  ABUSE_DETECTION_THRESHOLD: 0.7, // 0-1
  AUTO_BAN_AFTER_REPORTS: 3,
  CHAT_PROFANITY_CHECK: true,
  MAX_REPORT_LENGTH: 500,
} as const;
