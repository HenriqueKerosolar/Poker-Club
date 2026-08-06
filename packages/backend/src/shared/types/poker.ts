/**
 * Poker-related types
 * Shared across backend, web, and mobile
 */

// ===== CARTAS =====

export enum Suit {
  SPADES = 'S',
  HEARTS = 'H',
  DIAMONDS = 'D',
  CLUBS = 'C',
}

export enum Rank {
  ACE = 'A',
  KING = 'K',
  QUEEN = 'Q',
  JACK = 'J',
  TEN = '10',
  NINE = '9',
  EIGHT = '8',
  SEVEN = '7',
  SIX = '6',
  FIVE = '5',
  FOUR = '4',
  THREE = '3',
  TWO = '2',
}

export interface Card {
  suit: Suit;
  rank: Rank;
}

// ===== MODALIDADES DE POKER =====

export interface PokerVariantDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: 'traditional' | 'draw' | 'stud' | 'mixed';

  minimumPlayers: number;
  maximumPlayers: number;

  deckConfiguration: {
    numDecks: number;
    cardsPerDeck: number;
  };

  holeCards: number;
  communityCards: number;

  bettingStructure: 'no-limit' | 'pot-limit' | 'fixed-limit';

  handRankingSystem: 'standard' | 'lowball' | 'hi-lo';
  lowballSystem?: 'ace-to-five' | 'deuce-to-seven';

  splitPotRules: boolean;

  rounds: BettingRound[];

  drawRules?: DrawRule[];
  discardRules?: DiscardRule[];

  showdownRules: 'all' | 'necessary' | 'none';

  scoringRules: string; // Reference to scoring logic

  tutorialId?: string;
  botStrategyId?: string;
  tableLayoutId?: string;

  developmentStatus: 'planned' | 'in_development' | 'beta' | 'stable' | 'deprecated';
  rulesVersion: string;
}

export interface BettingRound {
  name: string;
  cardsDealt: number;
  playerOrder: 'clockwise' | 'reverse_clockwise';
}

export interface DrawRule {
  drawNumber: number;
  maxCards: number;
}

export interface DiscardRule {
  discardNumber: number;
  maxCards: number;
}

// ===== MÃOS DE POKER =====

export enum HandRank {
  ROYAL_FLUSH = 10,
  STRAIGHT_FLUSH = 9,
  FOUR_OF_A_KIND = 8,
  FULL_HOUSE = 7,
  FLUSH = 6,
  STRAIGHT = 5,
  THREE_OF_A_KIND = 4,
  TWO_PAIR = 3,
  ONE_PAIR = 2,
  HIGH_CARD = 1,
}

export interface Hand {
  rank: HandRank;
  rankName: string;
  cards: Card[];
  kickers: Card[]; // Para desempate
}

export interface HandEvaluationResult {
  hand: Hand;
  score: number; // Para comparação rápida
}

// ===== AÇÕES DO JOGADOR =====

export enum PlayerAction {
  FOLD = 'fold',
  CHECK = 'check',
  CALL = 'call',
  BET = 'bet',
  RAISE = 'raise',
  ALL_IN = 'allin',
  ANTE = 'ante',
  SMALL_BLIND = 'small_blind',
  BIG_BLIND = 'big_blind',
}

export interface GameAction {
  id: string;
  playerId: string;
  action: PlayerAction;
  amountCents: number;
  timestamp: number;
  sequence: number;
  gameId: string;
  handId: string;
}

// ===== ESTADO DA PARTIDA =====

export enum GameStatus {
  WAITING = 'waiting',
  READY = 'ready',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PlayerStatus {
  ACTIVE = 'active',
  FOLDED = 'folded',
  DISCONNECTED = 'disconnected',
  LEFT = 'left',
  ALL_IN = 'all_in',
}

export interface GamePlayer {
  id: string;
  userId: string;
  position: number;
  stackCents: number;
  status: PlayerStatus;
  holeCards?: Card[]; // Apenas visível para o jogador e ao servidor
  isConnected: boolean;
}

export interface GameState {
  id: string;
  variantId: string;
  status: GameStatus;
  players: GamePlayer[];
  currentPlayerIndex: number;
  currentBetCents: number;
  totalPotCents: number;
  sidePots: SidePot[];
  communityCards: Card[];
  boardRunout?: Card[][];
  handHistory: GameAction[];
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
}

// ===== POTES =====

export interface Pot {
  amountCents: number;
  eligiblePlayerIds: string[];
}

export interface SidePot extends Pot {
  type: 'main' | 'sidepot';
  allInPlayerStackCents: number;
}

// ===== RESULTADO =====

export interface GameResult {
  gameId: string;
  winners: WinnerInfo[];
  losers: PlayerGameResult[];
  createdAt: number;
}

export interface WinnerInfo {
  playerId: string;
  position: number;
  winningHand?: Hand;
  prizeAmountCents: number;
}

export interface PlayerGameResult {
  playerId: string;
  position: number;
  finalStackCents: number;
  resultCents: number; // positivo = ganho, negativo = perda
  bestHand?: Hand;
}

// ===== BOTS =====

export interface BotProfile {
  id: string;
  name: string;
  avatarUrl: string;
  personality: 'conservative' | 'aggressive' | 'unpredictable' | 'beginner' | 'mathematical' | 'bluffer' | 'patient' | 'emotional' | 'professional';
  difficulty: 'easy' | 'intermediate' | 'hard' | 'expert';
  dominantVariants: string[]; // variant IDs
  speed: number; // 1-10, milliseconds to decide
  riskProfile: number; // 1-10, likelihood of risky plays
  bluffFrequency: number; // 1-10
}

// ===== CAMPEONATOS =====

export enum TournamentFormat {
  QUICK = 'quick',
  BEST_OF_3 = 'best_of_3',
  BEST_OF_5 = 'best_of_5',
  ELIMINATION = 'elimination',
  POINTS = 'points',
}

export interface TournamentConfig {
  name: string;
  format: TournamentFormat;
  variantId: string;
  maxParticipants: number;
  buyInCents: number;
  blindStructure: BlindLevel[];
  prizeDistribution: number[]; // percentuais, soma = 100
}

export interface BlindLevel {
  level: number;
  smallBlindCents: number;
  bigBlindCents: number;
  durationMinutes: number;
}

export interface TournamentResult {
  tournamentId: string;
  rank: number;
  userId: string;
  prizeAmountCents: number;
  trophyId?: string;
}
