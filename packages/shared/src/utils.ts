/**
 * Shared utility functions
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Gera um ID único
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Formata centavos para reais (ex: 12345 -> "R$ 123,45")
 */
export function formatCurrency(cents: number): string {
  const reais = cents / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(reais);
}

/**
 * Converte reais para centavos (ex: 123.45 -> 12345)
 */
export function toCents(reais: number): number {
  return Math.round(reais * 100);
}

/**
 * Converte centavos para reais (ex: 12345 -> 123.45)
 */
export function toReais(cents: number): number {
  return cents / 100;
}

/**
 * Gera um código de convite de 6 caracteres
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Valida email
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Valida username
 */
export function isValidUsername(username: string): boolean {
  if (username.length < 3 || username.length > 20) {
    return false;
  }
  const regex = /^[a-zA-Z0-9_-]+$/;
  return regex.test(username);
}

/**
 * Valida força de senha
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++; else feedback.push('Mínimo 8 caracteres');
  if (/[A-Z]/.test(password)) score++; else feedback.push('Inclua letra maiúscula');
  if (/[a-z]/.test(password)) score++; else feedback.push('Inclua letra minúscula');
  if (/\d/.test(password)) score++; else feedback.push('Inclua número');

  return {
    isValid: score >= 3,
    score,
    feedback,
  };
}

/**
 * Delay assíncrono
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calcula hash SHA256 (apenas útil no backend)
 * No frontend, usar apenas como placeholder
 */
export async function sha256(data: string): Promise<string> {
  if (typeof window !== 'undefined') {
    // Frontend: não implementar hash aqui
    throw new Error('Use backend para hash de dados sensíveis');
  }

  // Backend (Node.js)
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Shuffle array usando Fisher-Yates
 */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Deep clone de objeto
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Aguarda condição ficar verdadeira
 */
export async function waitFor(
  condition: () => boolean,
  maxWaitMs: number = 5000,
  checkIntervalMs: number = 100,
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    if (condition()) return true;
    await delay(checkIntervalMs);
  }
  return false;
}

/**
 * Pagina um array
 */
export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
): { items: T[]; total: number; page: number; pageSize: number } {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    items: items.slice(start, end),
    total: items.length,
    page,
    pageSize,
  };
}

/**
 * Agrupa items por chave
 */
export function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return items.reduce(
    (acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}

/**
 * Retry com backoff exponencial
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 100,
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxAttempts - 1) {
        await delay(delayMs * Math.pow(2, i));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
