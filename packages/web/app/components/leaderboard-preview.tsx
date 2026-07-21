'use client';

/**
 * LeaderboardPreview - Preview do leaderboard
 */
export function LeaderboardPreview() {
  const players = [
    { rank: 1, username: 'alice_pro', winRate: 75.2, wins: 152 },
    { rank: 2, username: 'bob_poker', winRate: 62.8, wins: 89 },
    { rank: 3, username: 'charlie_king', winRate: 58.5, wins: 67 },
  ];

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h2 className="text-xl font-bold text-white mb-4">Top Players</h2>

      <div className="space-y-3">
        {players.map((player) => (
          <div
            key={player.rank}
            className="flex items-center justify-between p-3 bg-slate-700 rounded border border-slate-600"
          >
            <div className="flex items-center gap-3">
              <div className="text-xl font-bold text-amber-400 w-8 text-center">
                #{player.rank}
              </div>
              <div>
                <p className="font-semibold text-white">{player.username}</p>
                <p className="text-xs text-slate-400">{player.wins} wins</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-green-400">{player.winRate}%</p>
              <p className="text-xs text-slate-400">win rate</p>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded">
        Ver Leaderboard Completo
      </button>
    </div>
  );
}
