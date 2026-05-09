'use client';

import { Card, CardHeader, CardContent } from '@quorvexa/ui';

import { JsonViewer } from './json-viewer';

interface DomainPanelProps {
  title: string;
  domain: string;
  children: React.ReactNode;
}

export function DomainPanel({ title, domain, children }: DomainPanelProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">{title}</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        <JsonViewer domain={domain} />
      </CardContent>
    </Card>
  );
}
