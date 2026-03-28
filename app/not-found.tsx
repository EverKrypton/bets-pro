import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-white">
      <h1 className="text-6xl font-black text-accent mb-4">404</h1>
      <p className="text-xl text-gray-400 mb-8">Page not found</p>
      <Link
        href="/"
        className="flex items-center gap-2 bg-surface border border-white/10 px-6 py-3 rounded-xl hover:bg-white/5 transition-colors"
      >
        <Home size={20} />
        <span className="font-bold">Return Home</span>
      </Link>
    </div>
  );
}
