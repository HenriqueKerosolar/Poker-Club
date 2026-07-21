import { describe, it, expect } from '@jest/globals';
import { Rank, Suit } from '@shared/types/poker';
import { DeckEngine } from './deck.engine';

describe('DeckEngine', () => {
  describe('criação de baralho', () => {
    it('cria um baralho com 52 cartas', () => {
      const deck = DeckEngine.createStandardDeck();
      expect(deck.length).toBe(52);
    });

    it('contém 13 cartas de cada naipe', () => {
      const deck = DeckEngine.createStandardDeck();
      const bySuit = deck.reduce(
        (acc, card) => {
          acc[card.suit] = (acc[card.suit] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      expect(bySuit[Suit.SPADES]).toBe(13);
      expect(bySuit[Suit.HEARTS]).toBe(13);
      expect(bySuit[Suit.DIAMONDS]).toBe(13);
      expect(bySuit[Suit.CLUBS]).toBe(13);
    });

    it('contém 4 cartas de cada rank', () => {
      const deck = DeckEngine.createStandardDeck();
      const byRank = deck.reduce(
        (acc, card) => {
          acc[card.rank] = (acc[card.rank] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      for (const rank of Object.values(Rank)) {
        expect(byRank[rank]).toBe(4);
      }
    });

    it('não tem cartas duplicadas', () => {
      const deck = DeckEngine.createStandardDeck();
      const serialized = new Set(deck.map(c => DeckEngine.cardToString(c)));
      expect(serialized.size).toBe(52);
    });
  });

  describe('validação', () => {
    it('valida um baralho correto', () => {
      const deck = DeckEngine.createStandardDeck();
      expect(DeckEngine.isValidDeck(deck)).toBe(true);
    });

    it('rejeita baralho com número errado de cartas', () => {
      const deck = DeckEngine.createStandardDeck();
      deck.pop();
      expect(DeckEngine.isValidDeck(deck)).toBe(false);
    });

    it('rejeita baralho com duplicatas', () => {
      const deck = DeckEngine.createStandardDeck();
      deck.push(deck[0]);
      expect(DeckEngine.isValidDeck(deck)).toBe(false);
    });
  });

  describe('conversão de cartas', () => {
    it('converte carta para string', () => {
      const card = { rank: Rank.ACE, suit: Suit.HEARTS };
      expect(DeckEngine.cardToString(card)).toBe('AH');
    });

    it('converte string para carta', () => {
      const card = DeckEngine.stringToCard('KS');
      expect(card.rank).toBe(Rank.KING);
      expect(card.suit).toBe(Suit.SPADES);
    });

    it('roundtrip: card -> string -> card', () => {
      const original = { rank: Rank.QUEEN, suit: Suit.DIAMONDS };
      const str = DeckEngine.cardToString(original);
      const restored = DeckEngine.stringToCard(str);

      expect(restored.rank).toBe(original.rank);
      expect(restored.suit).toBe(original.suit);
    });

    it('rejeita string inválida', () => {
      expect(() => DeckEngine.stringToCard('XX')).toThrow();
      expect(() => DeckEngine.stringToCard('A')).toThrow();
    });
  });

  describe('serialização', () => {
    it('serializa e desserializa baralho', () => {
      const original = DeckEngine.createStandardDeck();
      const serialized = DeckEngine.serialize(original);
      const restored = DeckEngine.deserialize(serialized);

      expect(restored.length).toBe(52);
      expect(DeckEngine.isValidDeck(restored)).toBe(true);
    });
  });

  describe('valores de rank', () => {
    it('retorna valores corretos', () => {
      expect(DeckEngine.getRankValue(Rank.ACE)).toBe(14);
      expect(DeckEngine.getRankValue(Rank.KING)).toBe(13);
      expect(DeckEngine.getRankValue(Rank.TWO)).toBe(2);
    });
  });

  describe('nomes de cartas', () => {
    it('retorna nome legível', () => {
      const card = { rank: Rank.ACE, suit: Suit.HEARTS };
      expect(DeckEngine.getCardName(card)).toBe('Ace of Hearts');
    });

    it('funciona com todos os ranks e naipes', () => {
      const deck = DeckEngine.createStandardDeck();
      for (const card of deck) {
        const name = DeckEngine.getCardName(card);
        expect(name).toMatch(/^(Ace|King|Queen|Jack|\d+) of (Spades|Hearts|Diamonds|Clubs)$/);
      }
    });
  });
});
