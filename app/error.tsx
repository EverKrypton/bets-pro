'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4">
      <div className="bg-surface border border-white/10 rounded-2xl p-6 max-w-md w-full text-center space-y-4">
        <h1 className="text-xl font-black text-red-400">Something went wrong</h1>
        <p className="text-sm text-gray-400">{error.message || 'An unexpected error occurred'}</p>
        <button
          onClick={reset}
          className="w-full bg-accent text-white py-3 rounded-xl font-black text-sm uppercase hover:bg-accent/90 transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="w-full bg-surface border border-white/10 py-3 rounded-xl font-black text-sm uppercase hover:bg-white/5 transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
