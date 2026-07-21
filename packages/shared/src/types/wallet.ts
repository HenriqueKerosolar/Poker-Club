/**
 * Wallet and virtual currency types
 */

export enum TransactionType {
  // Créditos
  CREDIT_INITIAL = 'credit_initial',
  RECOVERY_CREDIT = 'recovery_credit',
  GIFT_RECEIVED = 'gift_received',
  LOAN_RECEIVED = 'loan_received',
  SPONSORSHIP = 'sponsorship',
  PROMOTION = 'promotion',

  // Débitos
  GAME_ENTRY = 'game_entry',
  TOURNAMENT_ENTRY = 'tournament_entry',
  BUYIN = 'buyin',
  GIFT_SENT = 'gift_sent',
  LOAN_SENT = 'loan_sent',

  // Transferências
  TRANSFER_OUT = 'transfer_out',
  TRANSFER_IN = 'transfer_in',

  // Resultados
  GAME_RESULT = 'game_result',
  TOURNAMENT_RESULT = 'tournament_result',

  // Gerencialidade
  STOCK_DEPOSIT = 'stock_deposit',
  STOCK_WITHDRAWAL = 'stock_withdrawal',
  ADJUSTMENT = 'adjustment',
  REVERSAL = 'reversal',
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  userId: string;
  type: TransactionType;
  description: string;
  amountCents: number;
  balanceBeforeCents: number;
  balanceAfterCents: number;
  gameId?: string;
  tournamentId?: string;
  referenceId?: string;
  createdAt: number;
}

export interface VirtualWallet {
  id: string;
  userId: string;
  balanceCents: number;
  stockCents: number;
  reservedCents: number;
  totalAvailableCents: number; // balance - reserved
  lastRecoveryCredit?: number;
  nextRecoveryEligible?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ConversionRate {
  id: string;
  rateCentsPerChip: number; // R$ 0,01 = 1 chip
  effectiveDate: number;
  deprecated: boolean;
}

export interface Gift {
  id: string;
  senderId: string;
  recipientId: string;
  amountCents: number;
  message?: string;
  createdAt: number;
}

export interface VirtualLoan {
  id: string;
  lenderId: string;
  borrowerId: string;
  amountCents: number;
  status: 'active' | 'partially_returned' | 'returned' | 'forgiven' | 'cancelled';
  requestedAt: number;
  acceptedAt?: number;
  returnedAt?: number;
  forgivenAt?: number;
}

export interface Sponsorship {
  id: string;
  sponsorId: string;
  sponsoredId: string;
  gameId: string;
  buyInCents: number;
  agreementType: 'sponsor_only' | 'profit_split' | 'percentage_share';
  sharePercentage?: number;
  acceptedAt: number;
  completedAt?: number;
}
