import { describe, it, expect } from '@jest/globals';
import { Card, HandRank, Rank, Suit } from '@shared/types/poker';
import { HandEvaluator } from './hand.evaluator';

/**
 * Testes do HandEvaluator
 * CRÍTICO: Cada teste aqui define a integridade do jogo
 */
describe('HandEvaluator', () => {
  // ===== HELPERS =====

  const card = (rank: Rank, suit: Suit): Card => ({ rank, suit });

  // ===== TESTES: DETECÇÃO DE MÃOS =====

  describe('detecção de mãos', () => {
    it('reconhece Royal Flush', () => {
      const cards = [
        card(Rank.ACE, Suit.HEARTS),
        card(Rank.KING, Suit.HEARTS),
        card(Rank.QUEEN, Suit.HEARTS),
        card(Rank.JACK, Suit.HEARTS),
        card(Rank.TEN, Suit.HEARTS),
      ];

      const hand = HandEvaluator.evaluate(cards);
      expect(hand.rank).toBe(HandRank.ROYAL_FLUSH);
      expect(hand.rankName).toBe('Royal Flush');
    });

    it('reconhece Straight Flush', () => {
      const cards = [
        card(Rank.NINE, Suit.DIAMONDS),
        card(Rank.EIGHT, Suit.DIAMONDS),
        card(Rank.SEVEN, Suit.DIAMONDS),
        card(Rank.SIX, Suit.DIAMONDS),
        card(Rank.FIVE, Suit.DIAMONDS),
      ];

      const hand = HandEvaluator.evaluate(cards);
      expect(hand.rank).toBe(HandRank.STRAIGHT_FLUSH);
    });

    it('reconhece Four of a Kind', () => {
      const cards = [
        card(Rank.KING, Suit.HEARTS),
        card(Rank.KING, Suit.DIAMONDS),
        card(Rank.KING, Suit.CLUBS),
        card(Rank.KING, Suit.SPADES),
        card(Rank.TWO, Suit.HEARTS),
      ];

      const hand = HandEvaluator.evaluate(cards);
      expect(hand.rank).toBe(HandRank.FOUR_OF_A_KIND);
    });

    it('reconhece Full House', () => {
      const cards = [
        card(Rank.ACE, Suit.HEARTS),
        card(Rank.ACE, Suit.DIAMONDS),
        card(Rank.ACE, Suit.CLUBS),
        card(Rank.KING, Suit.HEARTS),
        card(Rank.KING, Suit.DIAMONDS),
      ];

      const hand = HandEvaluator.evaluate(cards);
      expect(hand.rank).toBe(HandRank.FULL_HOUSE);
    });

    it('reconhece Flush', () => {
      const cards = [
        card(Rank.KING, Suit.SPADES),
        card(Rank.JACK, Suit.SPADES),
        card(Rank.NINE, Suit.SPADES),
        card(Rank.FIVE, Suit.SPADES),
        card(Rank.THREE, Suit.SPADES),
      ];

      const hand = HandEvaluator.evaluate(cards);
      expect(hand.rank).toBe(HandRank.FLUSH);
    });

    it('reconhece Straight normal', () => {
      const cards = [
        card(Rank.NINE, Suit.HEARTS),
        card(Rank.EIGHT, Suit.DIAMONDS),
        card(Rank.SEVEN, Suit.CLUBS),
        card(Rank.SIX, Suit.SPADES),
        card(Rank.FIVE, Suit.HEARTS),
      ];

      const hand = HandEvaluator.evaluate(cards);
      expect(hand.rank).toBe(HandRank.STRAIGHT);
    });

    it('reconhece Straight baixo (A-2-3-4-5, wheel)', () => {
      const cards = [
        card(Rank.ACE, Suit.HEARTS),
        card(Rank.TWO, Suit.DIAMONDS),
        card(Rank.THREE, Suit.CLUBS),
        card(Rank.FOUR, Suit.SPADES),
        card(Rank.FIVE, Suit.HEARTS),
      ];

      const hand = HandEvaluator.evaluate(cards);
      expect(hand.rank).toBe(HandRank.STRAIGHT);
    });

    it('reconhece Three of a Kind', () => {
      const cards = [
        card(Rank.JACK, Suit.HEARTS),
        card(Rank.JACK, Suit.DIAMONDS),
        card(Rank.JACK, Suit.CLUBS),
        card(Rank.THREE, Suit.HEARTS),
        card(Rank.TWO, Suit.DIAMONDS),
      ];

      const hand = HandEvaluator.evaluate(cards);
      expect(hand.rank).toBe(HandRank.THREE_OF_A_KIND);
    });

    it('reconhece Two Pair', () => {
      const cards = [
        card(Rank.QUEEN, Suit.HEARTS),
        card(Rank.QUEEN, Suit.DIAMONDS),
        card(Rank.JACK, Suit.CLUBS),
        card(Rank.JACK, Suit.SPADES),
        card(Rank.TWO, Suit.HEARTS),
      ];

      const hand = HandEvaluator.evaluate(cards);
      expect(hand.rank).toBe(HandRank.TWO_PAIR);
    });

    it('reconhece One Pair', () => {
      const cards = [
        card(Rank.TEN, Suit.HEARTS),
        card(Rank.TEN, Suit.DIAMONDS),
        card(Rank.NINE, Suit.CLUBS),
        card(Rank.EIGHT, Suit.SPADES),
        card(Rank.SEVEN, Suit.HEARTS),
      ];

      const hand = HandEvaluator.evaluate(cards);
      expect(hand.rank).toBe(HandRank.ONE_PAIR);
    });

    it('reconhece High Card', () => {
      const cards = [
        card(Rank.ACE, Suit.HEARTS),
        card(Rank.KING, Suit.DIAMONDS),
        card(Rank.QUEEN, Suit.CLUBS),
        card(Rank.JACK, Suit.SPADES),
        card(Rank.NINE, Suit.HEARTS),
      ];

      const hand = HandEvaluator.evaluate(cards);
      expect(hand.rank).toBe(HandRank.HIGH_CARD);
    });
  });

  // ===== TESTES: COMPARAÇÃO (DESEMPATE) =====

  describe('comparação entre mãos (desempate)', () => {
    it('Royal Flush bate Straight Flush', () => {
      const royal = [
        card(Rank.ACE, Suit.HEARTS),
        card(Rank.KING, Suit.HEARTS),
        card(Rank.QUEEN, Suit.HEARTS),
        card(Rank.JACK, Suit.HEARTS),
        card(Rank.TEN, Suit.HEARTS),
      ];

      const straight = [
        card(Rank.KING, Suit.DIAMONDS),
        card(Rank.QUEEN, Suit.DIAMONDS),
        card(Rank.JACK, Suit.DIAMONDS),
        card(Rank.TEN, Suit.DIAMONDS),
        card(Rank.NINE, Suit.DIAMONDS),
      ];

      const hand1 = HandEvaluator.evaluate(royal);
      const hand2 = HandEvaluator.evaluate(straight);

      expect(HandEvaluator.compare(hand1, hand2)).toBe(1);
      expect(HandEvaluator.compare(hand2, hand1)).toBe(-1);
    });

    it('Four of a Kind bate Full House', () => {
      const quad = [
        card(Rank.ACE, Suit.HEARTS),
        card(Rank.ACE, Suit.DIAMONDS),
        card(Rank.ACE, Suit.CLUBS),
        card(Rank.ACE, Suit.SPADES),
        card(Rank.TWO, Suit.HEARTS),
      ];

      const full = [
        card(Rank.KING, Suit.HEARTS),
        card(Rank.KING, Suit.DIAMONDS),
        card(Rank.KING, Suit.CLUBS),
        card(Rank.QUEEN, Suit.HEARTS),
        card(Rank.QUEEN, Suit.DIAMONDS),
      ];

      const hand1 = HandEvaluator.evaluate(quad);
      const hand2 = HandEvaluator.evaluate(full);

      expect(HandEvaluator.compare(hand1, hand2)).toBe(1);
    });

    it('Par de Aces bate Par de Kings', () => {
      const aces = [
        card(Rank.ACE, Suit.HEARTS),
        card(Rank.ACE, Suit.DIAMONDS),
        card(Rank.KING, Suit.CLUBS),
        card(Rank.QUEEN, Suit.SPADES),
        card(Rank.JACK, Suit.HEARTS),
      ];

      const kings = [
        card(Rank.KING, Suit.HEARTS),
        card(Rank.KING, Suit.DIAMONDS),
        card(Rank.ACE, Suit.CLUBS),
        card(Rank.QUEEN, Suit.SPADES),
        card(Rank.JACK, Suit.HEARTS),
      ];

      const hand1 = HandEvaluator.evaluate(aces);
      const hand2 = HandEvaluator.evaluate(kings);

      expect(HandEvaluator.compare(hand1, hand2)).toBe(1);
    });

    it('Pair com Ace kicker bate Pair com King kicker', () => {
      const withAce = [
        card(Rank.TEN, Suit.HEARTS),
        card(Rank.TEN, Suit.DIAMONDS),
        card(Rank.ACE, Suit.CLUBS),
        card(Rank.KING, Suit.SPADES),
        card(Rank.QUEEN, Suit.HEARTS),
      ];

      const withKing = [
        card(Rank.TEN, Suit.HEARTS),
        card(Rank.TEN, Suit.DIAMONDS),
        card(Rank.KING, Suit.CLUBS),
        card(Rank.QUEEN, Suit.SPADES),
        card(Rank.JACK, Suit.HEARTS),
      ];

      const hand1 = HandEvaluator.evaluate(withAce);
      const hand2 = HandEvaluator.evaluate(withKing);

      expect(HandEvaluator.compare(hand1, hand2)).toBe(1);
    });

    it('High Card Ace bate High Card King', () => {
      const aceHigh = [
        card(Rank.ACE, Suit.HEARTS),
        card(Rank.KING, Suit.DIAMONDS),
        card(Rank.QUEEN, Suit.CLUBS),
        card(Rank.JACK, Suit.SPADES),
        card(Rank.NINE, Suit.HEARTS),
      ];

      const kingHigh = [
        card(Rank.KING, Suit.HEARTS),
        card(Rank.QUEEN, Suit.DIAMONDS),
        card(Rank.JACK, Suit.CLUBS),
        card(Rank.TEN, Suit.SPADES),
        card(Rank.NINE, Suit.HEARTS),
      ];

      const hand1 = HandEvaluator.evaluate(aceHigh);
      const hand2 = HandEvaluator.evaluate(kingHigh);

      expect(HandEvaluator.compare(hand1, hand2)).toBe(1);
    });

    it('detecta empate corretamente', () => {
      const hand1Cards = [
        card(Rank.TEN, Suit.HEARTS),
        card(Rank.TEN, Suit.DIAMONDS),
        card(Rank.NINE, Suit.CLUBS),
        card(Rank.EIGHT, Suit.SPADES),
        card(Rank.SEVEN, Suit.HEARTS),
      ];

      const hand2Cards = [
        card(Rank.TEN, Suit.CLUBS),
        card(Rank.TEN, Suit.SPADES),
        card(Rank.NINE, Suit.HEARTS),
        card(Rank.EIGHT, Suit.DIAMONDS),
        card(Rank.SEVEN, Suit.CLUBS),
      ];

      const hand1 = HandEvaluator.evaluate(hand1Cards);
      const hand2 = HandEvaluator.evaluate(hand2Cards);

      expect(HandEvaluator.compare(hand1, hand2)).toBe(0);
    });
  });

  // ===== TESTES: VALIDAÇÃO =====

  describe('validação', () => {
    it('lança erro se não tiver exatamente 5 cartas', () => {
      const cards = [
        card(Rank.ACE, Suit.HEARTS),
        card(Rank.KING, Suit.DIAMONDS),
        card(Rank.QUEEN, Suit.CLUBS),
      ];

      expect(() => HandEvaluator.evaluate(cards)).toThrow();
    });

    it('funciona com cartas em qualquer ordem', () => {
      const cards1 = [
        card(Rank.ACE, Suit.HEARTS),
        card(Rank.KING, Suit.DIAMONDS),
        card(Rank.QUEEN, Suit.CLUBS),
        card(Rank.JACK, Suit.SPADES),
        card(Rank.TEN, Suit.HEARTS),
      ];

      const cards2 = [
        card(Rank.TEN, Suit.HEARTS),
        card(Rank.ACE, Suit.HEARTS),
        card(Rank.JACK, Suit.SPADES),
        card(Rank.KING, Suit.DIAMONDS),
        card(Rank.QUEEN, Suit.CLUBS),
      ];

      const hand1 = HandEvaluator.evaluate(cards1);
      const hand2 = HandEvaluator.evaluate(cards2);

      expect(HandEvaluator.compare(hand1, hand2)).toBe(0);
    });
  });

  // ===== TESTES: INTEGRAÇÃO =====

  describe('testes reais de Texas Hold\'em', () => {
    it('avalia corretamente comunidade + hole cards', () => {
      // Community: Ks Qs Js 5h 2d
      // Hole: As Ac
      // Resultado esperado: Pair of Aces

      const allCards = [
        card(Rank.KING, Suit.SPADES),
        card(Rank.QUEEN, Suit.SPADES),
        card(Rank.JACK, Suit.SPADES),
        card(Rank.FIVE, Suit.HEARTS),
        card(Rank.ACE, Suit.HEARTS),
        card(Rank.ACE, Suit.CLUBS),
        card(Rank.TWO, Suit.DIAMONDS),
      ];

      // Pega as 5 melhores cartas (combinações)
      // Neste caso: AS AC KS QS JS
      const best5 = [
        card(Rank.ACE, Suit.HEARTS),
        card(Rank.ACE, Suit.CLUBS),
        card(Rank.KING, Suit.SPADES),
        card(Rank.QUEEN, Suit.SPADES),
        card(Rank.JACK, Suit.SPADES),
      ];

      const hand = HandEvaluator.evaluate(best5);
      expect(hand.rank).toBe(HandRank.ONE_PAIR);
    });
  });
});
