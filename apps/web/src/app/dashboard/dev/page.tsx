'use client';

import { Button } from '@quorvexa/ui';

import { PlaygroundTabs } from '@/components/dev-playground/playground-tabs';
import { useAuthStore } from '@/store/auth.store';
import { useDevPlaygroundStore } from '@/store/dev-playground.store';

export default function DevPlaygroundPage() {
  const clearResponses = useDevPlaygroundStore((s) => s.clearResponses);
  const user = useAuthStore((s) => s.user);

  if (process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS !== 'true' || !user || (user.role !== 'super_admin' && user.role !== 'admin')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">This page is not available.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Developer Playground</h1>
          <p className="text-sm text-muted-foreground">
            Create, test, and simulate every object in the platform. Click through the tabs or run the Simulation Guide.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={clearResponses}>
          Clear Responses
        </Button>
      </div>
      <PlaygroundTabs />
    </div>
  );
}
