// Servidor Express simples - Poker Club Demo
const express = require('express');
const path = require('path');
const app = express();

app.use(express.static('packages/web/public'));
app.use(express.json());

// Mock API endpoints
app.get('/api/user', (req, res) => {
  res.json({
    id: '123',
    email: 'teste@email.com',
    displayName: 'alice_player'
  });
});

app.get('/api/wallet', (req, res) => {
  res.json({
    saldoCents: 512500,
    availableCents: 287500,
    reservedCents: 75000
  });
});

app.get('/api/games', (req, res) => {
  res.json([
    { id: '1', name: 'Texas Hold\'em', players: 3, buyIn: 5000, pot: 45000, status: 'RUNNING' },
    { id: '2', name: 'Omaha Hi-Lo', players: 5, buyIn: 10000, pot: 0, status: 'WAITING' },
    { id: '3', name: '7-Card Stud', players: 4, buyIn: 7500, pot: 60000, status: 'RUNNING' }
  ]);
});

app.get('/api/leaderboard', (req, res) => {
  res.json([
    { rank: 1, name: 'alice_player', wins: 152, winRate: 75.2 },
    { rank: 2, name: 'bob_poker', wins: 89, winRate: 62.8 },
    { rank: 3, name: 'charlie_king', wins: 67, winRate: 58.5 }
  ]);
});

// Serve demo.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'demo.html'));
});

const PORT = 3003;
app.listen(PORT, () => {
  console.log(`
════════════════════════════════════
🎰 POKER CLUB MVP - DEMO SERVER
════════════════════════════════════

✅ Servidor rodando em: http://localhost:${PORT}
✅ Dashboard disponível
✅ APIs mock funcionando

Acesse: http://localhost:${PORT}
════════════════════════════════════
  `);
});
