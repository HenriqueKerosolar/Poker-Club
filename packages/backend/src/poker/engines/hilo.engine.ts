import { Injectable, Logger } from '@nestjs/common';
import { Card, Hand } from '../../shared/types/poker';
import { HandEvaluator } from './hand-evaluator.engine';
import { RazzEngine } from './razz.engine';

/**
 * HiLoEngine - Hi-Lo Split (8-or-better)
 * Pote é dividido entre melhor high e melhor low
 * Low qualifica apenas se for 8-high ou melhor
 * Se não há qualifying low, high vence tudo
 */
@Injectable()
export class HiLoEngine {
  private logger = new Logger('HiLoEngine');

  constructor(
    private handEvaluator: HandEvaluator,
    private razzEngine: RazzEngine,
  ) {}

  /**
   * Valida mão hi-lo (como Texas Hold'em de 5 cartas)
   * Qualquer 5 cartas serve
   */
  validateHiLoHand(cards: Card[]): boolean {
    if (cards.length !== 5) {
      throw new Error('Hi-Lo hand requires exactly 5 cards');
    }

    // Verifica duplicatas
    const uniqueCards = new Set(cards.map((c) => `${c.rank}${c.suit}`));
    if (uniqueCards.size !== 5) {
      throw new Error('Duplicate cards not allowed');
    }

    return true;
  }

  /**
   * Calcula best hi e best lo para um jogador
   * Retorna objeto com ambas as mãos
   */
  evaluateHiLo(cards: Card[]): {
    high: Hand;
    low: Hand | null;
    canQualifyLow: boolean;
  } {
    this.validateHiLoHand(cards);

    // High = poker normal (melhor de 5)
    const high: Hand = {
      cards,
      rank: this.handEvaluator.evaluateHand(cards),
      description: this.handEvaluator.getHandDescription(cards),
    };

    // Low = se qualifica com 8-high ou melhor
    let low: Hand | null = null;
    let canQualifyLow = false;

    // Verifica se pode qualificar low (tem 5 cartas diferentes, 8 ou melhor)
    const hasNoPair = this.hasNoPair(cards);
    const maxRank = this.getHighestRankValue(cards);

    if (hasNoPair && maxRank <= 8) {
      // Qualifica para low
      const lowEval = this.razzEngine.evaluateLow(cards);
      if (lowEval.isQualified) {
        low = {
          cards,
          rank: { rank: 0, value: lowEval.value },
          description: lowEval.description,
        };
        canQualifyLow = true;
      }
    }

    return { high, low, canQualifyLow };
  }

  /**
   * Distribui pote entre vencedores de high e low
   * Retorna divisão do pote
   */
  distributeHiLoPot(
    playerHilos: Array<{
      userId: string;
      hand: ReturnType<HiLoEngine['evaluateHiLo']>;
    }>,
    potCents: number,
  ): {
    highWinner: string;
    lowWinner: string | null;
    highShare: number;
    lowShare: number;
  } {
    // Encontra vencedor high
    let highWinner = playerHilos[0];
    for (const player of playerHilos.slice(1)) {
      const cmp = this.handEvaluator.compareHands(
        player.hand.high,
        highWinner.hand.high,
      );
      if (cmp > 0) {
        highWinner = player;
      }
    }

    // Encontra vencedor low (se houver)
    let lowWinner = null;
    const playersWithLow = playerHilos.filter((p) => p.hand.low !== null);

    if (playersWithLow.length > 0) {
      lowWinner = playersWithLow[0];
      for (const player of playersWithLow.slice(1)) {
        const cmp = this.compareLows(player.hand.low!, lowWinner.hand.low!);
        if (cmp > 0) {
          lowWinner = player;
        }
      }
    }

    // Distribui pote
    if (lowWinner && lowWinner.userId !== highWinner.userId) {
      // Split entre high e low
      const highShare = Math.ceil(potCents / 2);
      const lowShare = potCents - highShare;

      return {
        highWinner: highWinner.userId,
        lowWinner: lowWinner.userId,
        highShare,
        lowShare,
      };
    } else if (lowWinner && lowWinner.userId === highWinner.userId) {
      // Mesma pessoa ganha ambos (scoop)
      return {
        highWinner: highWinner.userId,
        lowWinner: highWinner.userId,
        highShare: potCents,
        lowShare: 0,
      };
    } else {
      // Nenhum low qualificado, high vence tudo
      return {
        highWinner: highWinner.userId,
        lowWinner: null,
        highShare: potCents,
        lowShare: 0,
      };
    }
  }

  /**
   * Retorna mão que ganha hi
   */
  getHighWinner(
    hands: Array<{ userId: string; high: Hand }>,
  ): { userId: string; high: Hand } {
    let winner = hands[0];

    for (const player of hands.slice(1)) {
      const cmp = this.handEvaluator.compareHands(player.high, winner.high);
      if (cmp > 0) {
        winner = player;
      }
    }

    return winner;
  }

  /**
   * Retorna mão que ganha low (se qualificar)
   */
  getLowWinner(
    hands: Array<{ userId: string; low: Hand | null }>,
  ): { userId: string; low: Hand } | null {
    const playersWithLow = hands.filter((h) => h.low !== null);
    if (playersWithLow.length === 0) return null;

    let winner = playersWithLow[0];

    for (const player of playersWithLow.slice(1)) {
      const cmp = this.compareLows(player.low!, winner.low!);
      if (cmp > 0) {
        winner = player;
      }
    }

    return winner as any;
  }

  /**
   * Compara dois lows
   */
  private compareLows(lowA: Hand, lowB: Hand): number {
    if (lowA.rank.value < lowB.rank.value) return 1;
    if (lowA.rank.value > lowB.rank.value) return -1;
    return 0;
  }

  /**
   * Verifica se não há pares
   */
  private hasNoPair(cards: Card[]): boolean {
    const ranks = {} as Record<string, number>;

    for (const card of cards) {
      ranks[card.rank] = (ranks[card.rank] || 0) + 1;
      if (ranks[card.rank] > 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Retorna valor da maior carta
   */
  private getHighestRankValue(cards: Card[]): number {
    const values = cards.map((c) => this.getRankValue(c.rank));
    return Math.max(...values);
  }

  /**
   * Retorna valor numérico de rank
   */
  private getRankValue(rank: string): number {
    const values: Record<string, number> = {
      A: 14,
      K: 13,
      Q: 12,
      J: 11,
      T: 10,
      '9': 9,
      '8': 8,
      '7': 7,
      '6': 6,
      '5': 5,
      '4': 4,
      '3': 3,
      '2': 2,
    };
    return values[rank] || 0;
  }
}
