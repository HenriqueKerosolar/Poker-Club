import { Card, Hand, HandRank, Rank, Suit } from '../../../shared/types/poker';
import { DeckEngine } from '../engine/deck.engine';

/**
 * HandEvaluator - Avalia mãos de poker
 * CRÍTICO: deve ser 100% correto para integridade do jogo
 */
export class HandEvaluator {
  /**
   * Avalia 5 cartas e retorna mão com rank e kickers
   * ENTRADA: exatamente 5 cartas
   * SAÍDA: Hand com rank e kickers para desempate
   */
  static evaluate(cards: Card[]): Hand {
    if (cards.length !== 5) {
      throw new Error(`Hand must have exactly 5 cards, got ${cards.length}`);
    }

    // Testa em ordem de rank decrescente
    if (this.isRoyalFlush(cards)) {
      return this.buildRoyalFlushHand(cards);
    }

    if (this.isStraightFlush(cards)) {
      return this.buildStraightFlushHand(cards);
    }

    if (this.isFourOfAKind(cards)) {
      return this.buildFourOfAKindHand(cards);
    }

    if (this.isFullHouse(cards)) {
      return this.buildFullHouseHand(cards);
    }

    if (this.isFlush(cards)) {
      return this.buildFlushHand(cards);
    }

    if (this.isStraight(cards)) {
      return this.buildStraightHand(cards);
    }

    if (this.isThreeOfAKind(cards)) {
      return this.buildThreeOfAKindHand(cards);
    }

    if (this.isTwoPair(cards)) {
      return this.buildTwoPairHand(cards);
    }

    if (this.isOnePair(cards)) {
      return this.buildOnePairHand(cards);
    }

    // High Card
    return this.buildHighCardHand(cards);
  }

  // ===== DETECÇÃO =====

  private static isRoyalFlush(cards: Card[]): boolean {
    const byRank = this.groupByRank(cards);
    const suits = new Set(cards.map(c => c.suit));

    // Flush + Royal straight (10-J-Q-K-A)
    if (suits.size !== 1) return false;

    const ranks = Object.keys(byRank)
      .map(r => DeckEngine.getRankValue(r as Rank))
      .sort((a, b) => b - a);

    return (
      ranks.length === 5 &&
      ranks[0] === 14 && // Ace
      ranks[1] === 13 && // King
      ranks[2] === 12 && // Queen
      ranks[3] === 11 && // Jack
      ranks[4] === 10 // Ten
    );
  }

  private static isStraightFlush(cards: Card[]): boolean {
    const isStraight = this.isStraight(cards);
    const isFlush = this.isFlush(cards);
    return isStraight && isFlush;
  }

  private static isFourOfAKind(cards: Card[]): boolean {
    const byRank = this.groupByRank(cards);
    return Object.values(byRank).some(group => group.length === 4);
  }

  private static isFullHouse(cards: Card[]): boolean {
    const byRank = this.groupByRank(cards);
    const hasThree = Object.values(byRank).some(group => group.length === 3);
    const hasTwo = Object.values(byRank).some(group => group.length === 2);
    return hasThree && hasTwo;
  }

  private static isFlush(cards: Card[]): boolean {
    const suits = new Set(cards.map(c => c.suit));
    return suits.size === 1;
  }

  private static isStraight(cards: Card[]): boolean {
    const ranks = cards.map(c => DeckEngine.getRankValue(c.rank)).sort((a, b) => b - a);

    // Straight normal
    if (ranks[0] - ranks[4] === 4 && new Set(ranks).size === 5) {
      return true;
    }

    // Straight baixo (A-2-3-4-5, onde A conta como 1)
    if (
      ranks[0] === 14 &&
      ranks[1] === 5 &&
      ranks[2] === 4 &&
      ranks[3] === 3 &&
      ranks[4] === 2
    ) {
      return true;
    }

    return false;
  }

  private static isThreeOfAKind(cards: Card[]): boolean {
    const byRank = this.groupByRank(cards);
    return Object.values(byRank).some(group => group.length === 3);
  }

  private static isTwoPair(cards: Card[]): boolean {
    const byRank = this.groupByRank(cards);
    const pairs = Object.values(byRank).filter(group => group.length === 2);
    return pairs.length === 2;
  }

  private static isOnePair(cards: Card[]): boolean {
    const byRank = this.groupByRank(cards);
    const pairs = Object.values(byRank).filter(group => group.length === 2);
    return pairs.length === 1;
  }

  // ===== CONSTRUÇÃO DE MÃOS (com kickers) =====

  private static buildRoyalFlushHand(cards: Card[]): Hand {
    return {
      rank: HandRank.ROYAL_FLUSH,
      rankName: 'Royal Flush',
      cards: cards,
      kickers: [], // Royal Flush nunca empata
    };
  }

  private static buildStraightFlushHand(cards: Card[]): Hand {
    const sorted = this.getSortedByRankDesc(cards);
    return {
      rank: HandRank.STRAIGHT_FLUSH,
      rankName: 'Straight Flush',
      cards: sorted,
      kickers: sorted, // Highest card do straight é o desempate
    };
  }

  private static buildFourOfAKindHand(cards: Card[]): Hand {
    const byRank = this.groupByRank(cards);
    const quad = Object.entries(byRank).find(([, group]) => group.length === 4)![0];
    const kicker = Object.entries(byRank).find(([rank]) => rank !== quad)![1][0];

    return {
      rank: HandRank.FOUR_OF_A_KIND,
      rankName: 'Four of a Kind',
      cards: [...byRank[quad as Rank], kicker],
      kickers: [kicker],
    };
  }

  private static buildFullHouseHand(cards: Card[]): Hand {
    const byRank = this.groupByRank(cards);
    const trips = Object.entries(byRank).find(([, group]) => group.length === 3)![1];
    const pair = Object.entries(byRank).find(([, group]) => group.length === 2)![1];

    return {
      rank: HandRank.FULL_HOUSE,
      rankName: 'Full House',
      cards: [...trips, ...pair],
      kickers: trips, // Trips decide o desempate
    };
  }

  private static buildFlushHand(cards: Card[]): Hand {
    const sorted = this.getSortedByRankDesc(cards);
    return {
      rank: HandRank.FLUSH,
      rankName: 'Flush',
      cards: sorted,
      kickers: sorted, // Ordena por rank (high card)
    };
  }

  private static buildStraightHand(cards: Card[]): Hand {
    const sorted = this.getSortedByRankDesc(cards);
    return {
      rank: HandRank.STRAIGHT,
      rankName: 'Straight',
      cards: sorted,
      kickers: [sorted[0]], // Highest card do straight
    };
  }

  private static buildThreeOfAKindHand(cards: Card[]): Hand {
    const byRank = this.groupByRank(cards);
    const trips = Object.entries(byRank).find(([, group]) => group.length === 3)![1];
    const kickers = cards
      .filter(c => !trips.includes(c))
      .sort((a, b) => DeckEngine.getRankValue(b.rank) - DeckEngine.getRankValue(a.rank));

    return {
      rank: HandRank.THREE_OF_A_KIND,
      rankName: 'Three of a Kind',
      cards: [...trips, ...kickers],
      kickers: kickers,
    };
  }

  private static buildTwoPairHand(cards: Card[]): Hand {
    const byRank = this.groupByRank(cards);
    const pairs = Object.entries(byRank)
      .filter(([, group]) => group.length === 2)
      .map(([, group]) => group)
      .sort((a, b) => DeckEngine.getRankValue(b[0].rank) - DeckEngine.getRankValue(a[0].rank));

    const kicker = cards.find(
      c => !pairs[0].includes(c) && !pairs[1].includes(c),
    )!;

    return {
      rank: HandRank.TWO_PAIR,
      rankName: 'Two Pair',
      cards: [...pairs[0], ...pairs[1], kicker],
      kickers: [pairs[0][0], pairs[1][0], kicker], // Par alto, par baixo, kicker
    };
  }

  private static buildOnePairHand(cards: Card[]): Hand {
    const byRank = this.groupByRank(cards);
    const pair = Object.entries(byRank).find(([, group]) => group.length === 2)![1];
    const kickers = cards
      .filter(c => !pair.includes(c))
      .sort((a, b) => DeckEngine.getRankValue(b.rank) - DeckEngine.getRankValue(a.rank));

    return {
      rank: HandRank.ONE_PAIR,
      rankName: 'One Pair',
      cards: [...pair, ...kickers],
      kickers: kickers,
    };
  }

  private static buildHighCardHand(cards: Card[]): Hand {
    const sorted = this.getSortedByRankDesc(cards);
    return {
      rank: HandRank.HIGH_CARD,
      rankName: 'High Card',
      cards: sorted,
      kickers: sorted,
    };
  }

  // ===== UTILITÁRIOS =====

  private static groupByRank(cards: Card[]): Record<Rank, Card[]> {
    const grouped: Record<string, Card[]> = {};

    for (const card of cards) {
      if (!grouped[card.rank]) {
        grouped[card.rank] = [];
      }
      grouped[card.rank].push(card);
    }

    return grouped as Record<Rank, Card[]>;
  }

  private static getSortedByRankDesc(cards: Card[]): Card[] {
    return [...cards].sort(
      (a, b) => DeckEngine.getRankValue(b.rank) - DeckEngine.getRankValue(a.rank),
    );
  }

  /**
   * Compara duas mãos, retorna: 1 se hand1 > hand2, -1 se hand1 < hand2, 0 se empate
   */
  static compare(hand1: Hand, hand2: Hand): number {
    // Primeiro: compara rank
    if (hand1.rank !== hand2.rank) {
      return hand1.rank > hand2.rank ? 1 : -1;
    }

    // Mesmo rank: compara kickers
    for (let i = 0; i < hand1.kickers.length; i++) {
      const k1 = DeckEngine.getRankValue(hand1.kickers[i].rank);
      const k2 = DeckEngine.getRankValue(hand2.kickers[i].rank);

      if (k1 !== k2) {
        return k1 > k2 ? 1 : -1;
      }
    }

    return 0; // Empate
  }
}
