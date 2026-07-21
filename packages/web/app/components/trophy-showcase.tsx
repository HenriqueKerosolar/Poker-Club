'use client';

interface Trophy {
  trophy: {
    id: string;
    name: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  };
  unlockedAt: string;
}

interface TrophyShowcaseProps {
  trophies: Trophy[];
}

/**
 * TrophyShowcase - Mostra troféus desbloqueados
 */
export function TrophyShowcase({ trophies }: TrophyShowcaseProps) {
  const getTrophyColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'text-amber-400';
      case 'epic':
        return 'text-purple-400';
      case 'rare':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h2 className="text-xl font-bold text-white mb-4">
        Troféus ({trophies.length})
      </h2>

      {trophies.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {trophies.map((t) => (
            <div
              key={t.trophy.id}
              className="flex flex-col items-center gap-1"
              title={t.trophy.name}
            >
              <div className={`text-3xl ${getTrophyColor(t.trophy.rarity)}`}>
                {t.trophy.icon}
              </div>
              <p className="text-xs text-slate-400 text-center truncate">
                {t.trophy.name}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-400 text-center py-8">
          Nenhum troféu desbloqueado ainda
        </p>
      )}

      <button className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded text-sm">
        Ver Progresso
      </button>
    </div>
  );
}
