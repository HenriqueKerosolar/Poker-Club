import { Injectable, Logger } from '@nestjs/common';
import { Card, Hand, HandRank } from '../../shared/types/poker';
import { HandEvaluator } from './hand-evaluator.engine';

/**
 * OmahaEngine - Variante Omaha
 * 4 cartas na mão + 5 community cards
 * Obrigatório usar 2 da mão + 3 do board
 */
@Injectable()
export class OmahaEngine {
  private logger = new Logger('OmahaEngine');

  constructor(private handEvaluator: HandEvaluator) {}

  /**
   * Valida distribuição de cartas para Omaha
   * Cada jogador recebe 4 cartas
   */
  validateHole(cards: Card[]): boolean {
    if (cards.length !== 4) {
      throw new Error('Omaha requires exactly 4 hole cards');
    }

    // Verifica duplicatas
    const uniqueCards = new Set(cards.map((c) => `${c.rank}${c.suit}`));
    if (uniqueCards.size !== 4) {
      throw new Error('Duplicate cards not allowed');
    }

    return true;
  }

  /**
   * Encontra melhor mão Omaha (2 da mão + 3 do board)
   * Retorna a melhor combinação possível
   */
  findBestHand(hole: Card[], community: Card[]): Hand {
    if (hole.length !== 4 || community.length < 3) {
      throw new Error('Invalid Omaha hand setup');
    }

    let bestHand: Hand | null = null;
    let bestRank: HandRank = { rank: 0, value: 0 };

    // Gera todas as combinações de 2 cartas da mão
    const holeCombs = this.getCombinations(hole, 2);

    // Gera todas as combinações de 3 cartas do board
    const boardCombs = this.getCombinations(community, 3);

    // Testa todas as combinações possíveis
    for (const holeComb of holeCombs) {
      for (const boardComb of boardCombs) {
        const fiveCards = [...holeComb, ...boardComb];
        const hand: Hand = {
          cards: fiveCards,
          rank: this.handEvaluator.evaluateHand(fiveCards),
          description: this.handEvaluator.getHandDescription(fiveCards),
        };

        if (
          !bestHand ||
          hand.rank.value > bestRank.value ||
          (hand.rank.value === bestRank.value &&
            this.compareKickers(hand.rank, bestRank) > 0)
        ) {
          bestHand = hand;
          bestRank = hand.rank;
        }
      }
    }

    return bestHand!;
  }

  /**
   * Compara dois hands Omaha
   * Retorna: 1 se a > b, -1 se a < b, 0 se iguais
   */
  compareHands(handA: Hand, handB: Hand): number {
    if (handA.rank.value > handB.rank.value) {
      return 1;
    } else if (handA.rank.value < handB.rank.value) {
      return -1;
    }

    // Mesmo ranking, compara kickers
    return this.compareKickers(handA.rank, handB.rank);
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
   * Compara kickers entre dois hands de mesmo rank
   */
  private compareKickers(rankA: HandRank, rankB: HandRank): number {
    const kickersA = rankA.kickers || [];
    const kickersB = rankB.kickers || [];

    for (let i = 0; i < Math.max(kickersA.length, kickersB.length); i++) {
      const kickerA = kickersA[i] || 0;
      const kickerB = kickersB[i] || 0;

      if (kickerA > kickerB) return 1;
      if (kickerA < kickerB) return -1;
    }

    return 0;
  }

  /**
   * Calcula odds para Omaha
   * Aproximação baseada em equity
   */
  calculateOdds(hole: Card[], community: Card[], numOpponents: number): {
    equity: number;
    outs: number;
    odds: string;
  } {
    const hand = this.findBestHand(hole, community);

    // Simplificado: assume distribuição uniforme
    const equity = 1 / (numOpponents + 1);

    // Calcula outs (mãos que melhoram)
    const allCards = new Set<string>();
    hole.forEach((c) => allCards.add(`${c.rank}${c.suit}`));
    community.forEach((c) => allCards.add(`${c.rank}${c.suit}`));

    const deck = 52;
    const unseenCards = deck - allCards.size;
    const outs = Math.max(0, Math.floor(unseenCards * equity * 0.3)); // Heurística

    const oddsAgainst = 1 / equity - 1;
    const oddsStr = `${Math.round(oddsAgainst)}:1`;

    return {
      equity: Math.round(equity * 10000) / 100,
      outs,
      odds: oddsStr,
    };
  }
}
