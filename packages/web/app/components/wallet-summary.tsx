'use client';

interface Wallet {
  balance: number;
  stock: number;
  reserved: number;
  available: number;
  total: number;
}

interface WalletSummaryProps {
  wallet: Wallet | null;
}

/**
 * WalletSummary - Mostra saldo da carteira
 */
export function WalletSummary({ wallet }: WalletSummaryProps) {
  if (!wallet) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <p className="text-slate-400">Loading wallet...</p>
      </div>
    );
  }

  const formatCents = (cents: number) => {
    return `R$ ${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-amber-500/20">
      <h2 className="text-xl font-bold text-white mb-4">Carteira</h2>

      {/* Saldo Principal */}
      <div className="mb-6">
        <p className="text-sm text-slate-400 mb-1">Saldo Disponível</p>
        <p className="text-4xl font-bold text-amber-400">
          {formatCents(wallet.available)}
        </p>
      </div>

      {/* Breakdown */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">Saldo Total</span>
          <span className="font-semibold text-white">
            {formatCents(wallet.balance)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">Estoque</span>
          <span className="font-semibold text-slate-300">
            {formatCents(wallet.stock)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">Reservado (em jogo)</span>
          <span className="font-semibold text-orange-400">
            {formatCents(wallet.reserved)}
          </span>
        </div>

        <div className="h-px bg-slate-700 my-4"></div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-300">Total</span>
          <span className="text-lg font-bold text-green-400">
            {formatCents(wallet.total)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-2">
        <button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded">
          Jogar
        </button>
        <button className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded">
          Depositar
        </button>
      </div>
    </div>
  );
}
