'use client';

import { Badge, Spinner } from '@quorvexa/ui';
import { useState } from 'react';

import { useDevPlaygroundStore } from '@/store/dev-playground.store';

interface JsonViewerProps {
  domain: string;
}

export function JsonViewer({ domain }: JsonViewerProps) {
  const response = useDevPlaygroundStore((s) => s.responses[domain]);
  const [copied, setCopied] = useState(false);

  if (!response) {
    return (
      <div className="rounded border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        No response yet. Execute an action above.
      </div>
    );
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={response.status === 'success' ? 'success' : 'destructive'}>
            {response.status === 'success' ? 'Success' : 'Error'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(response.timestamp).toISOString().slice(11, 19)}
          </span>
        </div>
        <button
          onClick={() => void handleCopy()}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
      </div>
      <pre className="max-h-80 overflow-auto rounded border border-border bg-muted/50 p-3 text-xs font-mono whitespace-pre-wrap break-words">
        {JSON.stringify(response.data, null, 2)}
      </pre>
    </div>
  );
}

export function JsonViewerLoading() {
  return (
    <div className="flex items-center justify-center p-4">
      <Spinner size="sm" />
      <span className="ml-2 text-sm text-muted-foreground">Executing...</span>
    </div>
  );
}
