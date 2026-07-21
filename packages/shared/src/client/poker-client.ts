import { io, Socket } from 'socket.io-client';
import { GameState, PlayerAction, Room } from '../types/poker';

/**
 * PokerClient - Cliente WebSocket para conectar a partidas
 * Uso: const client = new PokerClient(token); await client.joinRoom(joinCode);
 */
export class PokerClient {
  private roomSocket: Socket | null = null;
  private gameSocket: Socket | null = null;
  private token: string;
  private apiUrl: string;

  constructor(token: string, apiUrl: string = 'http://localhost:3000') {
    this.token = token;
    this.apiUrl = apiUrl;
  }

  // ===== ROOM OPERATIONS =====

  /**
   * Conecta ao namespace de salas
   */
  async connectToRooms(): Promise<Socket> {
    if (this.roomSocket?.connected) {
      return this.roomSocket;
    }

    this.roomSocket = io(`${this.apiUrl}/rooms`, {
      auth: { token: this.token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    return new Promise((resolve, reject) => {
      this.roomSocket!.on('connect', () => resolve(this.roomSocket!));
      this.roomSocket!.on('error', reject);
      this.roomSocket!.on('connect_error', reject);
    });
  }

  /**
   * Cria nova sala
   */
  async createRoom(
    name: string,
    buyInCents: number,
    maxPlayers: number = 6,
  ): Promise<Room> {
    await this.connectToRooms();

    return new Promise((resolve, reject) => {
      this.roomSocket!.emit('room:create', {
        name,
        buyInCents,
        maxPlayers,
      });

      this.roomSocket!.once('room:created', resolve);
      this.roomSocket!.once('error', reject);
    });
  }

  /**
   * Entra em uma sala
   */
  async joinRoom(
    joinCode: string,
    balanceCents: number,
  ): Promise<Room> {
    await this.connectToRooms();

    return new Promise((resolve, reject) => {
      this.roomSocket!.emit('room:join', {
        joinCode,
        balanceCents,
      });

      this.roomSocket!.once('room:joined', resolve);
      this.roomSocket!.once('error', reject);
    });
  }

  /**
   * Sai da sala
   */
  async leaveRoom(): Promise<void> {
    if (!this.roomSocket?.connected) return;

    return new Promise((resolve, reject) => {
      this.roomSocket!.emit('room:leave');
      this.roomSocket!.once('room:left', () => resolve());
      this.roomSocket!.once('error', reject);
    });
  }

  /**
   * Marca como pronto
   */
  async setReady(): Promise<void> {
    if (!this.roomSocket?.connected) {
      throw new Error('Not connected to room');
    }

    this.roomSocket.emit('room:ready');
  }

  /**
   * Inicia partida
   */
  async startGame(): Promise<string> {
    if (!this.roomSocket?.connected) {
      throw new Error('Not connected to room');
    }

    return new Promise((resolve, reject) => {
      this.roomSocket!.emit('room:startGame');
      this.roomSocket!.once('error', reject);

      // Espera por game:started no namespace
      setTimeout(() => reject(new Error('Start game timeout')), 5000);
    });
  }

  /**
   * Obtém lista de salas
   */
  async getRoomsList(): Promise<any[]> {
    await this.connectToRooms();

    return new Promise((resolve, reject) => {
      this.roomSocket!.emit('rooms:refresh');
      this.roomSocket!.once('rooms:list', resolve);
      this.roomSocket!.once('error', reject);
      setTimeout(() => reject(new Error('Get rooms timeout')), 5000);
    });
  }

  // ===== GAME OPERATIONS =====

  /**
   * Conecta ao namespace de partidas
   */
  async connectToGame(): Promise<Socket> {
    if (this.gameSocket?.connected) {
      return this.gameSocket;
    }

    this.gameSocket = io(`${this.apiUrl}/games`, {
      auth: { token: this.token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    return new Promise((resolve, reject) => {
      this.gameSocket!.on('connect', () => resolve(this.gameSocket!));
      this.gameSocket!.on('error', reject);
      this.gameSocket!.on('connect_error', reject);
    });
  }

  /**
   * Executa ação na partida
   */
  async playAction(
    action: PlayerAction,
    amountCents: number = 0,
  ): Promise<GameState> {
    if (!this.gameSocket?.connected) {
      throw new Error('Not connected to game');
    }

    return new Promise((resolve, reject) => {
      this.gameSocket!.emit('game:action', {
        action,
        amountCents,
      });

      this.gameSocket!.once('game:actionProcessed', (data) => {
        resolve(data.gameState);
      });

      this.gameSocket!.once('error', reject);

      // Timeout
      setTimeout(() => reject(new Error('Action timeout')), 5000);
    });
  }

  /**
   * Dobra
   */
  async fold(): Promise<GameState> {
    return this.playAction(PlayerAction.FOLD);
  }

  /**
   * Passa
   */
  async check(): Promise<GameState> {
    return this.playAction(PlayerAction.CHECK);
  }

  /**
   * Iguala
   */
  async call(): Promise<GameState> {
    return this.playAction(PlayerAction.CALL);
  }

  /**
   * Aposta
   */
  async bet(amountCents: number): Promise<GameState> {
    return this.playAction(PlayerAction.BET, amountCents);
  }

  /**
   * Aumenta aposta
   */
  async raise(amountCents: number): Promise<GameState> {
    return this.playAction(PlayerAction.RAISE, amountCents);
  }

  /**
   * All-in
   */
  async allIn(): Promise<GameState> {
    return this.playAction(PlayerAction.ALL_IN);
  }

  /**
   * Envia mensagem no chat
   */
  async sendMessage(message: string): Promise<void> {
    if (!this.gameSocket?.connected) {
      throw new Error('Not connected to game');
    }

    this.gameSocket.emit('game:chat', { message });
  }

  /**
   * Reconecta ao jogo
   */
  async reconnect(): Promise<GameState> {
    if (!this.gameSocket?.connected) {
      await this.connectToGame();
    }

    return new Promise((resolve, reject) => {
      this.gameSocket!.emit('game:reconnect');
      this.gameSocket!.once('game:reconnected', (data) => {
        resolve(data.gameState);
      });
      this.gameSocket!.once('error', reject);
      setTimeout(() => reject(new Error('Reconnect timeout')), 5000);
    });
  }

  // ===== LISTENERS =====

  /**
   * Escuta eventos da sala
   */
  onRoomEvent(
    event: 'roomUpdated' | 'playerJoined' | 'playerLeft' | 'gameStarted' | 'error',
    callback: (data: any) => void,
  ) {
    if (!this.roomSocket) return;

    const eventMap = {
      roomUpdated: 'room:updated',
      playerJoined: 'room:playerJoined',
      playerLeft: 'room:playerLeft',
      gameStarted: 'room:gameStarted',
      error: 'error',
    };

    this.roomSocket.on(eventMap[event], callback);
  }

  /**
   * Escuta eventos da partida
   */
  onGameEvent(
    event: 'stateUpdate' | 'actionProcessed' | 'chatMessage' | 'playerDisconnected' | 'error',
    callback: (data: any) => void,
  ) {
    if (!this.gameSocket) return;

    const eventMap = {
      stateUpdate: 'game:state',
      actionProcessed: 'game:actionProcessed',
      chatMessage: 'game:chatMessage',
      playerDisconnected: 'game:playerDisconnected',
      error: 'error',
    };

    this.gameSocket.on(eventMap[event], callback);
  }

  // ===== LIFECYCLE =====

  /**
   * Desconecta
   */
  disconnect() {
    if (this.roomSocket?.connected) {
      this.roomSocket.disconnect();
    }
    if (this.gameSocket?.connected) {
      this.gameSocket.disconnect();
    }
  }

  /**
   * Verifica se conectado
   */
  isConnected(): boolean {
    return (this.roomSocket?.connected || false) && (this.gameSocket?.connected || false);
  }
}
