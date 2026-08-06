import { Card, Rank, Suit } from '../../../shared/types/poker';

/**
 * DeckEngine - Gerencia operações com baralho
 * Responsável por criar, validar e converter cartas
 */
export class DeckEngine {
  /**
   * Cria um baralho novo com 52 cartas
   */
  static createStandardDeck(): Card[] {
    const suits = Object.values(Suit);
    const ranks = Object.values(Rank);

    const deck: Card[] = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank });
      }
    }

    return deck;
  }

  /**
   * Valida se um baralho tem exatamente 52 cartas únicas
   */
  static isValidDeck(deck: Card[]): boolean {
    if (deck.length !== 52) {
      return false;
    }

    const serialized = new Set(deck.map(c => this.cardToString(c)));
    return serialized.size === 52;
  }

  /**
   * Converte Card para string (ex: "AH" = Ace of Hearts)
   */
  static cardToString(card: Card): string {
    return `${card.rank}${card.suit}`;
  }

  /**
   * Converte string para Card
   */
  static stringToCard(str: string): Card {
    if (str.length < 2) {
      throw new Error('Invalid card string format');
    }

    const suit = str.slice(-1);
    const rank = str.slice(0, -1);

    if (!Object.values(Suit).includes(suit as Suit)) {
      throw new Error(`Invalid suit: ${suit}`);
    }

    if (!Object.values(Rank).includes(rank as Rank)) {
      throw new Error(`Invalid rank: ${rank}`);
    }

    return {
      rank: rank as Rank,
      suit: suit as Suit,
    };
  }

  /**
   * Serializa baralho para JSON
   */
  static serialize(deck: Card[]): string {
    return JSON.stringify(deck.map(c => this.cardToString(c)));
  }

  /**
   * Desserializa baralho do JSON
   */
  static deserialize(json: string): Card[] {
    try {
      const cards: string[] = JSON.parse(json);
      return cards.map(cardStr => this.stringToCard(cardStr));
    } catch (error) {
      throw new Error('Failed to deserialize deck');
    }
  }

  /**
   * Retorna os nomes de ranks em ordem (Ace = 14, Two = 2)
   */
  static getRankValue(rank: Rank): number {
    const values: Record<Rank, number> = {
      [Rank.ACE]: 14,
      [Rank.KING]: 13,
      [Rank.QUEEN]: 12,
      [Rank.JACK]: 11,
      [Rank.TEN]: 10,
      [Rank.NINE]: 9,
      [Rank.EIGHT]: 8,
      [Rank.SEVEN]: 7,
      [Rank.SIX]: 6,
      [Rank.FIVE]: 5,
      [Rank.FOUR]: 4,
      [Rank.THREE]: 3,
      [Rank.TWO]: 2,
    };
    return values[rank];
  }

  /**
   * Retorna nome legível da carta
   */
  static getCardName(card: Card): string {
    const ranks: Record<Rank, string> = {
      [Rank.ACE]: 'Ace',
      [Rank.KING]: 'King',
      [Rank.QUEEN]: 'Queen',
      [Rank.JACK]: 'Jack',
      [Rank.TEN]: '10',
      [Rank.NINE]: '9',
      [Rank.EIGHT]: '8',
      [Rank.SEVEN]: '7',
      [Rank.SIX]: '6',
      [Rank.FIVE]: '5',
      [Rank.FOUR]: '4',
      [Rank.THREE]: '3',
      [Rank.TWO]: '2',
    };

    const suits: Record<Suit, string> = {
      [Suit.SPADES]: 'Spades',
      [Suit.HEARTS]: 'Hearts',
      [Suit.DIAMONDS]: 'Diamonds',
      [Suit.CLUBS]: 'Clubs',
    };

    return `${ranks[card.rank]} of ${suits[card.suit]}`;
  }
}
