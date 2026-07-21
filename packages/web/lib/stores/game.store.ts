import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface Card {
  rank: string;
  suit: string;
}

interface GameState {
  gameId: string | null;
  roomId: string | null;
  players: any[];
  currentPlayer: string | null;
  community: Card[];
  holeCards: Card[];
  pot: number;
  round: string;
  isConnected: boolean;
  wallet: any;
  trophies: any[];
  leaderboardPosition: any;
  socket: Socket | null;

  // Actions
  createGame: (format: string, buyInCents: number) => void;
  joinGame: (gameId: string) => void;
  fold: () => void;
  check: () => void;
  call: (amount: number) => void;
  bet: (amount: number) => void;
  raise: (amount: number) => void;
  allIn: () => void;
  fetchWallet: () => Promise<void>;
  fetchTrophies: () => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
  connectSocket: (token: string) => void;
  disconnectSocket: () => void;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const useGameStore = create<GameState>((set, get) => ({
  gameId: null,
  roomId: null,
  players: [],
  currentPlayer: null,
  community: [],
  holeCards: [],
  pot: 0,
  round: 'preflop',
  isConnected: false,
  wallet: null,
  trophies: [],
  leaderboardPosition: null,
  socket: null,

  createGame: (format: string, buyInCents: number) => {
    const socket = get().socket;
    if (socket) {
      socket.emit('game:create', { format, buyInCents });
    }
  },

  joinGame: (gameId: string) => {
    const socket = get().socket;
    if (socket) {
      socket.emit('game:join', { gameId });
    }
  },

  fold: () => {
    const socket = get().socket;
    if (socket) {
      socket.emit('game:action', { action: 'fold' });
    }
  },

  check: () => {
    const socket = get().socket;
    if (socket) {
      socket.emit('game:action', { action: 'check' });
    }
  },

  call: (amount: number) => {
    const socket = get().socket;
    if (socket) {
      socket.emit('game:action', { action: 'call', amount });
    }
  },

  bet: (amount: number) => {
    const socket = get().socket;
    if (socket) {
      socket.emit('game:action', { action: 'bet', amount });
    }
  },

  raise: (amount: number) => {
    const socket = get().socket;
    if (socket) {
      socket.emit('game:action', { action: 'raise', amount });
    }
  },

  allIn: () => {
    const socket = get().socket;
    if (socket) {
      socket.emit('game:action', { action: 'all_in' });
    }
  },

  fetchWallet: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/wallet`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const wallet = await response.json();
      set({ wallet });
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    }
  },

  fetchTrophies: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/tournaments/trophies/my-trophies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { trophies } = await response.json();
      set({ trophies });
    } catch (error) {
      console.error('Failed to fetch trophies:', error);
    }
  },

  fetchLeaderboard: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/tournaments/leaderboard/my-position`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const position = await response.json();
      set({ leaderboardPosition: position });
    } catch (error) {
      console.error('Failed to fetch leaderboard position:', error);
    }
  },

  connectSocket: (token: string) => {
    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      set({ isConnected: true });
      console.log('Connected to game server');
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('game:state', (gameState) => {
      set({
        gameId: gameState.id,
        players: gameState.players,
        currentPlayer: gameState.currentPlayer,
        community: gameState.community,
        holeCards: gameState.yourCards,
        pot: gameState.pot,
        round: gameState.round,
      });
    });

    socket.on('game:action_required', (data) => {
      // Jogador deve agir
      console.log('Your turn to act:', data);
    });

    socket.on('game:finished', (result) => {
      console.log('Game finished:', result);
      // Atualiza wallet após jogo
      get().fetchWallet();
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },
}));
