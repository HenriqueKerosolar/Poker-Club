/**
 * Real-time event types (WebSocket)
 * Versionado para suportar evolução de schema
 */

export interface GameEvent<T = unknown> {
  id: string;
  version: number;
  type: string;
  gameId: string;
  playerId?: string;
  timestamp: number;
  sequence: number;
  payload: T;
}

// ===== SALA DE ESPERA =====

export interface TableJoinedPayload {
  userId: string;
  username: string;
  avatarUrl?: string;
}

export interface TableLeftPayload {
  userId: string;
}

export interface PlayerReadyPayload {
  userId: string;
  buyInCents: number;
}

export interface GameStartingPayload {
  countdownSeconds: number;
  gameId: string;
}

// ===== MÃO DE POKER =====

export interface HandStartedPayload {
  handNumber: number;
  dealerPosition: number;
  smallBlindCents: number;
  bigBlindCents: number;
  players: {
    userId: string;
    stackCents: number;
    position: number;
  }[];
}

export interface CardsDealtPayload {
  playerId?: string; // Omitted para adversários
  holeCards?: [string, string]; // Apenas o jogador vê
}

export interface CommunityCardsPayload {
  round: 'flop' | 'turn' | 'river';
  cards: string[];
}

export interface TurnStartedPayload {
  playerToActId: string;
  timeoutSeconds: number;
  minBetCents?: number;
  maxBetCents?: number;
  availableActions: ('fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin')[];
}

// ===== AÇÕES DO JOGADOR =====

export interface PlayerActionPayload {
  playerId: string;
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';
  amountCents: number;
  stackAfterActionCents: number;
}

export interface PotUpdatedPayload {
  totalPotCents: number;
  sidePots: {
    type: 'main' | 'sidepot';
    amountCents: number;
    eligiblePlayerIds: string[];
  }[];
}

export interface PlayerDisconnectedPayload {
  playerId: string;
  reconnectDeadlineMs: number;
}

export interface PlayerReconnectedPayload {
  playerId: string;
}

// ===== SHOWDOWN =====

export interface ShowdownStartedPayload {
  eligiblePlayerIds: string[];
}

export interface HandRevealedPayload {
  playerId: string;
  holeCards: [string, string];
  bestHand: string; // "Royal Flush", etc
  rank: number;
}

// ===== RESULTADO =====

export interface HandCompletedPayload {
  winners: {
    playerId: string;
    winningSplitIndex?: number; // Se pote dividido
    prizeAmountCents: number;
    bestHand: string;
  }[];
  losers: {
    playerId: string;
    resultCents: number; // negativo
  }[];
  potAmountCents: number;
}

export interface GameCompletedPayload {
  finalResults: {
    playerId: string;
    finalStackCents: number;
    resultCents: number;
    position: number;
  }[];
  duration: number;
}

// ===== CHAT =====

export interface ChatMessagePayload {
  senderId: string;
  content: string;
  emoji?: string;
  timestamp: number;
}

// ===== VOZ =====

export interface VoiceStartedPayload {
  playerId: string;
  username: string;
}

export interface VoiceStoppedPayload {
  playerId: string;
}

export interface VoiceFailedPayload {
  playerId: string;
  reason: string;
}

// ===== SALDO / CARTEIRA =====

export interface BuyInRequestedPayload {
  playerId: string;
  amountCents: number;
  fromSourceType: 'main' | 'stock' | 'recovery';
}

export interface BuyInConfirmedPayload {
  playerId: string;
  amountCents: number;
  newStackCents: number;
}

export interface BuyInRejectedPayload {
  playerId: string;
  reason: string;
}

export interface LoanRequestedPayload {
  requesterId: string;
  recipientId: string;
  amountCents: number;
  message?: string;
}

export interface LoanAcceptedPayload {
  requesterId: string;
  recipientId: string;
  amountCents: number;
}

export interface LoanRejectedPayload {
  requesterId: string;
  recipientId: string;
}

// ===== CAMPEONATO =====

export interface TournamentUpdatedPayload {
  tournamentId: string;
  standings: {
    userId: string;
    points: number;
    gamesPlayed: number;
    wins: number;
  }[];
}

export interface TournamentCompletedPayload {
  tournamentId: string;
  winner: {
    userId: string;
    prizeAmountCents: number;
    trophyId?: string;
  };
}

// ===== NOTIFICAÇÕES =====

export interface NotificationPayload {
  type: 'invitation' | 'friend_request' | 'loan' | 'gift' | 'tournament_update' | 'achievement';
  title: string;
  body: string;
  relatedId?: string;
}

// ===== ERRO / SISTEMA =====

export interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface SystemNotificationPayload {
  level: 'info' | 'warning' | 'error';
  message: string;
}

// ===== EVENTO GENÉRICO TIPADO =====

export type GameEventType =
  | { type: 'table.joined'; payload: TableJoinedPayload }
  | { type: 'table.left'; payload: TableLeftPayload }
  | { type: 'player.ready'; payload: PlayerReadyPayload }
  | { type: 'game.starting'; payload: GameStartingPayload }
  | { type: 'hand.started'; payload: HandStartedPayload }
  | { type: 'cards.dealt'; payload: CardsDealtPayload }
  | { type: 'community.updated'; payload: CommunityCardsPayload }
  | { type: 'turn.started'; payload: TurnStartedPayload }
  | { type: 'player.action'; payload: PlayerActionPayload }
  | { type: 'pot.updated'; payload: PotUpdatedPayload }
  | { type: 'player.disconnected'; payload: PlayerDisconnectedPayload }
  | { type: 'player.reconnected'; payload: PlayerReconnectedPayload }
  | { type: 'showdown.started'; payload: ShowdownStartedPayload }
  | { type: 'hand.revealed'; payload: HandRevealedPayload }
  | { type: 'hand.completed'; payload: HandCompletedPayload }
  | { type: 'game.completed'; payload: GameCompletedPayload }
  | { type: 'chat.message'; payload: ChatMessagePayload }
  | { type: 'voice.started'; payload: VoiceStartedPayload }
  | { type: 'voice.stopped'; payload: VoiceStoppedPayload }
  | { type: 'buyin.requested'; payload: BuyInRequestedPayload }
  | { type: 'buyin.confirmed'; payload: BuyInConfirmedPayload }
  | { type: 'loan.requested'; payload: LoanRequestedPayload }
  | { type: 'loan.accepted'; payload: LoanAcceptedPayload }
  | { type: 'tournament.updated'; payload: TournamentUpdatedPayload }
  | { type: 'notification'; payload: NotificationPayload }
  | { type: 'error'; payload: ErrorPayload }
  | { type: 'system.notification'; payload: SystemNotificationPayload };
