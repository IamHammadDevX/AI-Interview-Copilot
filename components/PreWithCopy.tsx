// components/PreWithCopy.tsx
'use client';

import { HTMLAttributes, useRef, useState } from 'react';
import { Copy } from 'lucide-react';

type PreProps = HTMLAttributes<HTMLPreElement>;

export default function PreWithCopy({
  children,
  className = '',
  ...rest
}: PreProps) {
  /* 1.  hooks must run on every render (no early returns before here) */
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  /* 2. click handler grabs innerText from the live <pre> */
  const handleCopy = () => {
    if (!preRef.current) return;
    const text = preRef.current.innerText; // or .textContent
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  /* 3. inline <code> is unchanged — early-return AFTER the hooks */
  if ((rest as any).inline) {
    // ReactMarkdown won't actually send <pre inline>, but keep the guard
    return (
      <pre {...rest} className={className}>
        {children}
      </pre>
    );
  }

  /* 4. block code with overlay button */
  return (
    <pre ref={preRef} {...rest} className={`relative group ${className}`}>
      <button
        onClick={handleCopy}
        aria-label="Copy code"
        className="cursor-pointer
          absolute top-2 right-2 z-10 rounded-md bg-white/80 p-1 shadow
          backdrop-blur-sm transition
          opacity-0 group-hover:opacity-100
          hover:scale-105 active:scale-95
        "
      >
        {copied ? (
          <span className="text-xs font-semibold text-green-700 m-2">✓</span>
        ) : (
          <Copy className="w-4 h-4 text-gray-700" />
        )}
      </button>
      {children}
    </pre>
  );
}
