import { redirect } from 'next/navigation';

/**
 * Home Page - Redireciona para dashboard
 */
export default function Home() {
  redirect('/dashboard');
}
