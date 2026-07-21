import { Injectable, Logger } from '@nestjs/common';
import { Card, Hand } from '@shared/types/poker';

/**
 * RazzEngine - Razz (A-5 Lowball)
 * Melhor hand é A-2-3-4-5 (wheel)
 * Aces sempre baixos, straights/flushes não contam para low
 * Melhor low de 5 cartas (sem pares)
 */
@Injectable()
export class RazzEngine {
  private logger = new Logger('RazzEngine');

  /**
   * Calcula valor de uma hand de Razz
   * Quanto MENOR o valor, MELHOR a hand
   * A-2-3-4-5 = 5 (melhor possível - "wheel")
   * K-K-Q-J-T = invalido (tem par)
   */
  evaluateLow(cards: Card[]): {
    value: number;
    description: string;
    isQualified: boolean;
  } {
    if (cards.length !== 5) {
      throw new Error('Razz requires exactly 5 cards');
    }

    // Verifica pares - em Razz puro, qualquer par invalida a hand
    if (this.hasPair(cards)) {
      return {
        value: 99999, // Máximo possível (péssimo)
        description: 'Paired - Not a qualifying low',
        isQualified: false,
      };
    }

    // Calcula valor baseado em ranks
    const rankValues = cards.map((c) => this.getLowRankValue(c.rank));
    const sorted = rankValues.sort((a, b) => b - a); // Descendente

    // Valor = concatenação dos ranks de cima pra baixo
    // A-2-3-4-5 = 54321 = 54321
    // 9-8-7-6-4 = 98764 = 98764
    const value =
      sorted[0] * 10000 + sorted[1] * 1000 + sorted[2] * 100 + sorted[3] * 10 + sorted[4];

    // Descrição
    const description = this.getLowDescription(cards);

    return {
      value,
      description,
      isQualified: true,
    };
  }

  /**
   * Compara dois lows em Razz
   * Retorna: 1 se a é melhor, -1 se b é melhor, 0 se iguais
   */
  compareLows(
    handA: { value: number; isQualified: boolean },
    handB: { value: number; isQualified: boolean },
  ): number {
    // Se um não qualifica, o outro ganha
    if (handA.isQualified && !handB.isQualified) return 1;
    if (!handA.isQualified && handB.isQualified) return -1;
    if (!handA.isQualified && !handB.isQualified) return 0;

    // Ambos qualificam - menor valor é melhor
    if (handA.value < handB.value) return 1;
    if (handA.value > handB.value) return -1;
    return 0;
  }

  /**
   * Verifica se é o melhor low possível (wheel: A-2-3-4-5)
   */
  isWheel(cards: Card[]): boolean {
    if (cards.length !== 5) return false;

    const ranks = new Set(cards.map((c) => c.rank).sort());
    const wheelRanks = new Set(['A', '2', '3', '4', '5']);

    return ranks.size === wheelRanks.size && [...ranks].every((r) => wheelRanks.has(r));
  }

  /**
   * Encontra melhor low de até 7 cartas
   */
  findBestLow(cards: Card[]): Hand {
    if (cards.length < 5) {
      throw new Error('Need at least 5 cards for low hand');
    }

    if (cards.length > 7) {
      throw new Error('Razz maximum 7 cards');
    }

    let bestLow = null;
    let bestValue = 99999;

    // Gera todas combinações de 5 cartas
    const combinations = this.getCombinations(cards, 5);

    for (const fiveCards of combinations) {
      const evaluation = this.evaluateLow(fiveCards);

      if (evaluation.isQualified && evaluation.value < bestValue) {
        bestLow = fiveCards;
        bestValue = evaluation.value;
      }
    }

    if (!bestLow) {
      throw new Error('No qualifying low hand');
    }

    return {
      cards: bestLow,
      rank: { rank: 0, value: bestValue },
      description: this.getLowDescription(bestLow),
    };
  }

  /**
   * Retorna valor numérico para cada rank (baixo)
   * A=1 (melhor), então K=13 (pior)
   */
  private getLowRankValue(rank: string): number {
    const values: Record<string, number> = {
      A: 1,
      '2': 2,
      '3': 3,
      '4': 4,
      '5': 5,
      '6': 6,
      '7': 7,
      '8': 8,
      '9': 9,
      T: 10,
      J: 11,
      Q: 12,
      K: 13,
    };
    return values[rank] || 0;
  }

  /**
   * Gera descrição do low em Razz
   */
  private getLowDescription(cards: Card[]): string {
    const ranks = cards.map((c) => c.rank).sort((a, b) => {
      const valA = this.getLowRankValue(a);
      const valB = this.getLowRankValue(b);
      return valA - valB;
    });

    if (this.isWheel(cards)) {
      return 'Wheel (A-2-3-4-5) - Best low';
    }

    return `Low: ${ranks.join('-')}`;
  }

  /**
   * Verifica se há par
   */
  private hasPair(cards: Card[]): boolean {
    const rankCounts = {} as Record<string, number>;

    for (const card of cards) {
      rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
      if (rankCounts[card.rank] > 1) {
        return true;
      }
    }

    return false;
  }

  /**
   * Gera combinações de k cartas
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
}
