import React from 'react';
import { Upload } from 'lucide-react';

interface ShareButtonProps {
  title?: string;
  text?: string;
  className?: string;
}

export function ShareButton({ 
  title = 'OpenPecker', 
  text = 'Master chess openings through deliberate repetition with OpenPecker!',
  className = ""
}: ShareButtonProps) {
  return (
    <button 
      className={`p-2 bg-bg-card border border-border-dark rounded-xl shadow-xl text-text-muted hover:text-white hover:border-brand-gold/30 transition-all group ${className}`}
      onClick={() => {
        const shareData = {
          title,
          text,
          url: window.location.href
        };
        if (navigator.share && navigator.canShare?.(shareData)) {
          navigator.share(shareData).catch(console.error);
        } else {
          // Fallback: Copy to clipboard
          navigator.clipboard.writeText(`${title}: ${text} ${window.location.href}`);
          alert('Link copied to clipboard!');
        }
      }}
    >
      <Upload size={16} className="group-hover:scale-110 transition-transform" />
    </button>
  );
}
