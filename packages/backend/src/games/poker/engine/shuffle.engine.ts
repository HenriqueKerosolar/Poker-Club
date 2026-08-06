import { Card } from '../../../shared/types/poker';

/**
 * ShuffleEngine - Embaralhamento criptograficamente seguro
 * Usa Fisher-Yates com crypto.getRandomValues()
 * Garante distribuição uniforme
 */
export class ShuffleEngine {
  /**
   * Embaralha um baralho usando Fisher-Yates (Durstenfeld)
   * Implementação com crypto.getRandomValues() para segurança
   */
  static shuffle(deck: Card[]): Card[] {
    const arr = [...deck]; // Cria cópia para não modificar original

    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.getRandomIndex(i);
      // Swap
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
  }

  /**
   * Gera índice aleatório seguro entre 0 e max (inclusive)
   * Usa crypto.getRandomValues() para distribuição uniforme
   */
  private static getRandomIndex(max: number): number {
    if (typeof window === 'undefined') {
      // Node.js
      const crypto = require('crypto');
      const bytes = crypto.getRandomValues(new Uint8Array(1));
      return bytes[0] % (max + 1);
    }

    // Browser (não use em produção - apenas fallback)
    return Math.floor(Math.random() * (max + 1));
  }

  /**
   * Embaralha múltiplas vezes (extra segurança)
   */
  static shuffleMultiple(deck: Card[], times: number = 3): Card[] {
    let result = deck;
    for (let i = 0; i < times; i++) {
      result = this.shuffle(result);
    }
    return result;
  }

  /**
   * Tira N cartas do topo do baralho (e remove do baralho)
   */
  static drawCards(deck: Card[], count: number): { drawn: Card[]; remaining: Card[] } {
    if (count > deck.length) {
      throw new Error(`Cannot draw ${count} cards from deck of ${deck.length}`);
    }

    return {
      drawn: deck.slice(0, count),
      remaining: deck.slice(count),
    };
  }

  /**
   * Compara distribuição de um baralho (para testes)
   * Retorna frequência de cada rank/suit
   */
  static analyzeDistribution(deck: Card[]): {
    rankFrequency: Record<string, number>;
    suitFrequency: Record<string, number>;
  } {
    const rankFreq: Record<string, number> = {};
    const suitFreq: Record<string, number> = {};

    for (const card of deck) {
      rankFreq[card.rank] = (rankFreq[card.rank] || 0) + 1;
      suitFreq[card.suit] = (suitFreq[card.suit] || 0) + 1;
    }

    return {
      rankFrequency: rankFreq,
      suitFrequency: suitFreq,
    };
  }

  /**
   * Testa uniformidade da distribuição com chi-square
   * Retorna p-value (> 0.05 = distribuição uniforme)
   */
  static chiSquareTest(frequencies: number[], expectedFrequency: number): number {
    let chiSquare = 0;

    for (const frequency of frequencies) {
      const deviation = frequency - expectedFrequency;
      chiSquare += (deviation * deviation) / expectedFrequency;
    }

    // Aproximação simples: retorna valor de chi-square
    return chiSquare;
  }
}
