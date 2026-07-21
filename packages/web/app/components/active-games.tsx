'use client';

/**
 * ActiveGames - Lista jogos ativos
 */
export function ActiveGames() {
  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h2 className="text-2xl font-bold text-white mb-6">Jogos Ativos</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Game Card */}
        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-amber-500 cursor-pointer transition">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-white">Texas Hold'em</h3>
              <p className="text-sm text-slate-400">3 players</p>
            </div>
            <span className="bg-green-500/20 text-green-400 text-xs font-semibold px-2 py-1 rounded">
              RUNNING
            </span>
          </div>

          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-slate-400">Buy-in</span>
              <span className="text-white font-semibold">R$ 50,00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Pot</span>
              <span className="text-amber-400 font-semibold">R$ 450,00</span>
            </div>
          </div>

          <button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded text-sm">
            Entrar Jogo
          </button>
        </div>

        {/* Game Card */}
        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-amber-500 cursor-pointer transition">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-white">Omaha Hi-Lo</h3>
              <p className="text-sm text-slate-400">5 players</p>
            </div>
            <span className="bg-blue-500/20 text-blue-400 text-xs font-semibold px-2 py-1 rounded">
              WAITING
            </span>
          </div>

          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-slate-400">Buy-in</span>
              <span className="text-white font-semibold">R$ 100,00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Players</span>
              <span className="text-blue-400 font-semibold">5/8</span>
            </div>
          </div>

          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded text-sm">
            Entrar Jogo
          </button>
        </div>

        {/* Empty State */}
        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 flex items-center justify-center min-h-32">
          <div className="text-center">
            <p className="text-slate-400 mb-2">Sem mais jogos disponíveis</p>
            <button className="text-amber-400 hover:text-amber-300 font-semibold text-sm">
              Criar novo jogo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
