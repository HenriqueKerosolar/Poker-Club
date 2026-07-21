import { describe, it, expect, beforeEach } from '@jest/globals';
import { OmahaEngine } from './omaha.engine';
import { StudEngine } from './stud.engine';
import { RazzEngine } from './razz.engine';
import { HiLoEngine } from './hilo.engine';
import { Card } from '@shared/types/poker';

describe('Poker Variants Engines', () => {
  let omahaEngine: OmahaEngine;
  let studEngine: StudEngine;
  let razzEngine: RazzEngine;
  let hiloEngine: HiLoEngine;

  const mockHandEvaluator = {
    evaluateHand: jest.fn(),
    getHandDescription: jest.fn(),
    compareHands: jest.fn(),
  };

  beforeEach(() => {
    omahaEngine = new OmahaEngine(mockHandEvaluator as any);
    studEngine = new StudEngine(mockHandEvaluator as any);
    razzEngine = new RazzEngine();
    hiloEngine = new HiLoEngine(mockHandEvaluator as any, razzEngine);

    jest.clearAllMocks();
  });

  describe('OmahaEngine', () => {
    it('valida exatamente 4 cartas na mão', () => {
      const cards: Card[] = [
        { rank: 'A', suit: 's' },
        { rank: 'K', suit: 'h' },
        { rank: 'Q', suit: 'd' },
        { rank: 'J', suit: 'c' },
      ];

      expect(omahaEngine.validateHole(cards)).toBe(true);
    });

    it('rejeita menos de 4 cartas', () => {
      const cards: Card[] = [
        { rank: 'A', suit: 's' },
        { rank: 'K', suit: 'h' },
        { rank: 'Q', suit: 'd' },
      ];

      expect(() => omahaEngine.validateHole(cards)).toThrow('4');
    });

    it('rejeita cartas duplicadas', () => {
      const cards: Card[] = [
        { rank: 'A', suit: 's' },
        { rank: 'A', suit: 's' }, // Duplicada
        { rank: 'K', suit: 'h' },
        { rank: 'Q', suit: 'd' },
      ];

      expect(() => omahaEngine.validateHole(cards)).toThrow('Duplicate');
    });

    it('calcula odds em Omaha', () => {
      const hole: Card[] = [
        { rank: 'A', suit: 's' },
        { rank: 'K', suit: 'h' },
        { rank: 'Q', suit: 'd' },
        { rank: 'J', suit: 'c' },
      ];
      const community: Card[] = [
        { rank: 'T', suit: 's' },
        { rank: '9', suit: 'h' },
        { rank: '8', suit: 'd' },
      ];

      mockHandEvaluator.evaluateHand.mockReturnValue({ rank: 4, value: 100 });

      const odds = omahaEngine.calculateOdds(hole, community, 3);

      expect(odds.equity).toBeGreaterThan(0);
      expect(odds.odds).toContain(':1');
    });
  });

  describe('StudEngine', () => {
    it('valida 3 cartas iniciais (2 down, 1 up)', () => {
      const down: Card[] = [
        { rank: 'A', suit: 's' },
        { rank: 'K', suit: 'h' },
      ];
      const up: Card[] = [{ rank: 'Q', suit: 'd' }];

      expect(studEngine.validateInitialHand(down, up)).toBe(true);
    });

    it('rejeita número errado de cartas iniciais', () => {
      const down: Card[] = [{ rank: 'A', suit: 's' }]; // Apenas 1
      const up: Card[] = [{ rank: 'Q', suit: 'd' }];

      expect(() => studEngine.validateInitialHand(down, up)).toThrow(
        '2 down',
      );
    });

    it('retorna cartas visíveis (up cards)', () => {
      const down: Card[] = [
        { rank: 'A', suit: 's' },
        { rank: 'K', suit: 'h' },
      ];
      const up: Card[] = [
        { rank: 'Q', suit: 'd' },
        { rank: 'J', suit: 'c' },
      ];

      const visible = studEngine.getVisibleCards(down, up);

      expect(visible).toEqual(up);
    });

    it('analisa força de cartas visíveis', () => {
      const up: Card[] = [
        { rank: 'A', suit: 's' },
        { rank: 'K', suit: 'h' },
        { rank: 'Q', suit: 'd' },
      ];

      const strength = studEngine.analyzeVisibleStrength(up);

      expect(['high_card', 'sequence_draw', 'flush_draw']).toContain(
        strength,
      );
    });
  });

  describe('RazzEngine', () => {
    it('calcula corretamente um low em Razz', () => {
      const cards: Card[] = [
        { rank: 'A', suit: 's' },
        { rank: '2', suit: 'h' },
        { rank: '3', suit: 'd' },
        { rank: '4', suit: 'c' },
        { rank: '5', suit: 's' },
      ];

      const evaluation = razzEngine.evaluateLow(cards);

      expect(evaluation.isQualified).toBe(true);
      expect(evaluation.description).toContain('Wheel');
    });

    it('reconhece wheel como melhor low possível', () => {
      const cards: Card[] = [
        { rank: 'A', suit: 's' },
        { rank: '2', suit: 'h' },
        { rank: '3', suit: 'd' },
        { rank: '4', suit: 'c' },
        { rank: '5', suit: 's' },
      ];

      expect(razzEngine.isWheel(cards)).toBe(true);
    });

    it('rejeita hand com pair em Razz', () => {
      const cards: Card[] = [
        { rank: 'A', suit: 's' },
        { rank: 'A', suit: 'h' }, // Pair
        { rank: '3', suit: 'd' },
        { rank: '4', suit: 'c' },
        { rank: '5', suit: 's' },
      ];

      const evaluation = razzEngine.evaluateLow(cards);

      expect(evaluation.isQualified).toBe(false);
    });

    it('compara lows corretamente', () => {
      const wheelLow = {
        value: 54321,
        isQualified: true,
      };
      const regularLow = {
        value: 87654,
        isQualified: true,
      };

      const result = razzEngine.compareLows(wheelLow, regularLow);

      expect(result).toBe(1); // wheel é melhor
    });
  });

  describe('HiLoEngine', () => {
    it('valida hand hi-lo com 5 cartas', () => {
      const cards: Card[] = [
        { rank: 'A', suit: 's' },
        { rank: 'K', suit: 'h' },
        { rank: 'Q', suit: 'd' },
        { rank: 'J', suit: 'c' },
        { rank: 'T', suit: 's' },
      ];

      expect(hiloEngine.validateHiLoHand(cards)).toBe(true);
    });

    it('encontra best high e low qualificado', () => {
      const cards: Card[] = [
        { rank: 'A', suit: 's' },
        { rank: '2', suit: 'h' },
        { rank: '3', suit: 'd' },
        { rank: '4', suit: 'c' },
        { rank: '8', suit: 's' },
      ];

      mockHandEvaluator.evaluateHand.mockReturnValue({
        rank: 0,
        value: 100,
      });

      const result = hiloEngine.evaluateHiLo(cards);

      expect(result.high).toBeDefined();
      expect(result.canQualifyLow).toBe(true);
    });

    it('distribui pote corretamente para split', () => {
      const hands = [
        {
          userId: 'user_1',
          hand: {
            high: { cards: [], rank: { rank: 1, value: 100 } },
            low: { cards: [], rank: { rank: 0, value: 50000 } },
            canQualifyLow: true,
          },
        },
        {
          userId: 'user_2',
          hand: {
            high: { cards: [], rank: { rank: 0, value: 50 } },
            low: { cards: [], rank: { rank: 0, value: 60000 } },
            canQualifyLow: true,
          },
        },
      ];

      const distribution = hiloEngine.distributeHiLoPot(hands, 100000);

      expect(distribution.highWinner).toBe('user_1');
      expect(distribution.lowWinner).toBe('user_2');
      expect(distribution.highShare + distribution.lowShare).toBe(100000);
    });

    it('faz scoop quando mesmo jogador vence high e low', () => {
      const hands = [
        {
          userId: 'user_1',
          hand: {
            high: { cards: [], rank: { rank: 1, value: 100 } },
            low: { cards: [], rank: { rank: 0, value: 50000 } },
            canQualifyLow: true,
          },
        },
        {
          userId: 'user_2',
          hand: {
            high: { cards: [], rank: { rank: 0, value: 50 } },
            low: null,
            canQualifyLow: false,
          },
        },
      ];

      const distribution = hiloEngine.distributeHiLoPot(hands, 100000);

      expect(distribution.highWinner).toBe('user_1');
      expect(distribution.lowWinner).toBe('user_1');
      expect(distribution.highShare).toBe(100000);
    });
  });
});
