import { Injectable, Logger } from '@nestjs/common';
import { Card, Hand, HandRank } from '../../shared/types/poker';
import { HandEvaluator } from './hand-evaluator.engine';

/**
 * StudEngine - Seven Card Stud
 * 7 cartas total: 2 hole (down) + 4 community (up) + 1 final (down)
 * Melhor mão de 5 cartas das 7
 */
@Injectable()
export class StudEngine {
  private logger = new Logger('StudEngine');

  constructor(private handEvaluator: HandEvaluator) {}

  /**
   * Valida distribuição de cartas para Stud
   * Começa com 3 cartas (2 down, 1 up)
   */
  validateInitialHand(downCards: Card[], upCards: Card[]): boolean {
    if (downCards.length !== 2 || upCards.length !== 1) {
      throw new Error('Stud requires 2 down cards and 1 up card initially');
    }

    // Verifica duplicatas
    const allCards = [...downCards, ...upCards];
    const uniqueCards = new Set(allCards.map((c) => `${c.rank}${c.suit}`));
    if (uniqueCards.size !== 3) {
      throw new Error('Duplicate cards not allowed');
    }

    return true;
  }

  /**
   * Valida ronda de Stud (3-7 total)
   */
  validateStud(
    downCards: Card[],
    upCards: Card[],
    round: number,
  ): boolean {
    const totalCards = downCards.length + upCards.length;

    // Round: 1=3 cards, 2=4, 3=5, 4=6, 5=7
    const expectedTotal = round + 2;

    if (totalCards !== expectedTotal) {
      throw new Error(
        `Round ${round} expects ${expectedTotal} cards, got ${totalCards}`,
      );
    }

    // Final round (7) deve ter 2 down, 4 up, 1 down
    if (round === 5) {
      if (downCards.length !== 3 || upCards.length !== 4) {
        throw new Error('Final round must have 3 down cards and 4 up cards');
      }
    }

    return true;
  }

  /**
   * Encontra melhor mão de 5 cartas em Stud
   */
  findBestHand(allCards: Card[]): Hand {
    if (allCards.length < 5) {
      throw new Error('Need at least 5 cards for Stud hand');
    }

    if (allCards.length > 7) {
      throw new Error('Stud allows maximum 7 cards');
    }

    return this.getBestFiveCardHand(allCards);
  }

  /**
   * Retorna a melhor mão de 5 cartas das 7 disponíveis
   */
  private getBestFiveCardHand(cards: Card[]): Hand {
    let bestHand: Hand | null = null;
    let bestRank: HandRank = { rank: 0, value: 0 };

    // Gera todas as combinações de 5 cartas
    const combinations = this.getCombinations(cards, 5);

    for (const fiveCards of combinations) {
      const hand: Hand = {
        cards: fiveCards,
        rank: this.handEvaluator.evaluateHand(fiveCards),
        description: this.handEvaluator.getHandDescription(fiveCards),
      };

      if (!bestHand || hand.rank.value > bestRank.value) {
        bestHand = hand;
        bestRank = hand.rank;
      }
    }

    return bestHand!;
  }

  /**
   * Retorna cartas visíveis (up cards) de um jogador
   * Usado para mostrar ao outros jogadores
   */
  getVisibleCards(downCards: Card[], upCards: Card[]): Card[] {
    return upCards;
  }

  /**
   * Retorna cartas escondidas (down cards) - apenas para o dono
   */
  getHoleCards(downCards: Card[]): Card[] {
    return downCards;
  }

  /**
   * Calcula "door card" (terceira carta, primeira up)
   * Importante em betting de Stud
   */
  getDoorCard(upCards: Card[]): Card | null {
    return upCards.length > 0 ? upCards[0] : null;
  }

  /**
   * Analisa mão visível para determinar força
   * Retorna: high, medium, low, pair, etc
   */
  analyzeVisibleStrength(upCards: Card[]): string {
    if (upCards.length === 0) return 'unknown';

    const ranks = upCards.map((c) => this.getRankValue(c.rank));
    const suits = upCards.map((c) => c.suit);

    // Verifica pair
    const hasPair = upCards.length >= 2 && this.hasPair(upCards);
    if (hasPair) return 'pair_or_better';

    // Verifica conectadas (sequência possível)
    const isConnected = this.isSequencePossible(ranks);
    if (isConnected) return 'sequence_draw';

    // Verifica flush draw (mesmo naipe)
    const isSuitedDraw = this.isSuitDraw(suits);
    if (isSuitedDraw) return 'flush_draw';

    // Verifica high card
    const maxRank = Math.max(...ranks);
    if (maxRank >= 11) return 'high_card'; // J or higher
    if (maxRank >= 8) return 'medium_card';
    return 'low_card';
  }

  /**
   * Gera todas as combinações de tamanho k
   */
  private getCombinations<T>(arr: T[], k: number): T[][] {
    if (k === 0) return [[]];
    if (arr.length === 0) return [];

    const head = arr[0];
    const tail = arr.slice(1);
    const withHead = this.getCombinations(tail, k - 1).map((comb) => [
      head,
      ...comb,
    ]);
    const withoutHead = this.getCombinations(tail, k);

    return [...withHead, ...withoutHead];
  }

  /**
   * Verifica se há pair em cartas visíveis
   */
  private hasPair(cards: Card[]): boolean {
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        if (cards[i].rank === cards[j].rank) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Verifica se sequência é possível
   */
  private isSequencePossible(ranks: number[]): boolean {
    const sorted = [...ranks].sort((a, b) => a - b);
    let maxGap = 0;

    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1] - sorted[i];
      maxGap = Math.max(maxGap, gap);
    }

    return maxGap <= 2; // Podem ser conectadas com desenho
  }

  /**
   * Verifica se há possibilidade de flush (mesmo naipe)
   */
  private isSuitDraw(suits: string[]): boolean {
    const suitCounts = {} as Record<string, number>;

    for (const suit of suits) {
      suitCounts[suit] = (suitCounts[suit] || 0) + 1;
    }

    return Math.max(...Object.values(suitCounts)) >= 2;
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
