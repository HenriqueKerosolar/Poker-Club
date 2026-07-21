'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useGameStore } from '@/lib/stores/game.store';
import { WalletSummary } from '@/app/components/wallet-summary';
import { ActiveGames } from '@/app/components/active-games';
import { LeaderboardPreview } from '@/app/components/leaderboard-preview';
import { TrophyShowcase } from '@/app/components/trophy-showcase';

/**
 * Dashboard - Página principal após login
 */
export default function Dashboard() {
  const { user, isAuthenticated } = useAuthStore();
  const { wallet, trophies, leaderboardPosition } = useGameStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    setIsLoading(false);
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-slate-400">Ready to play some poker?</p>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Wallet Summary */}
          <div className="lg:col-span-1">
            <WalletSummary wallet={wallet} />
          </div>

          {/* Leaderboard Position */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">
                Your Rank
              </h2>
              {leaderboardPosition ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-amber-400">
                      #{leaderboardPosition.rank}
                    </div>
                    <p className="text-slate-400 mt-2">
                      {leaderboardPosition.winRate}% win rate
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {leaderboardPosition.gamesPlayed}
                      </div>
                      <p className="text-sm text-slate-400">Games Played</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-400">
                        R$ {(leaderboardPosition.totalWinnings / 100).toFixed(2)}
                      </div>
                      <p className="text-sm text-slate-400">Total Winnings</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400">Play some games to appear on leaderboard</p>
              )}
            </div>
          </div>

          {/* Trophy Showcase */}
          <div className="lg:col-span-1">
            <TrophyShowcase trophies={trophies} />
          </div>
        </div>

        {/* Active Games */}
        <ActiveGames />
      </div>
    </div>
  );
}
