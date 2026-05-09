'use client';

import { Button } from '@quorvexa/ui';
import { useState } from 'react';

import { AgentsPanel } from './agents-panel';
import { AuthPanel } from './auth-panel';
import { NotificationsPanel } from './notifications-panel';
import { PreferencesPanel } from './preferences-panel';
import { SimulationGuide } from './simulation-guide';
import { TemplatesPanel } from './templates-panel';
import { UsersPanel } from './users-panel';
import { WorkflowsPanel } from './workflows-panel';

type TabId = 'auth-users' | 'workflows' | 'notifications' | 'agents' | 'preferences' | 'guide';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'auth-users', label: 'Auth & Users' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'agents', label: 'AI Agents' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'guide', label: 'Simulation Guide' },
];

export function PlaygroundTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('auth-users');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'auth-users' && (
          <div className="space-y-4">
            <AuthPanel />
            <UsersPanel />
          </div>
        )}
        {activeTab === 'workflows' && <WorkflowsPanel />}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <NotificationsPanel />
            <TemplatesPanel />
          </div>
        )}
        {activeTab === 'agents' && <AgentsPanel />}
        {activeTab === 'preferences' && <PreferencesPanel />}
        {activeTab === 'guide' && <SimulationGuide />}
      </div>
    </div>
  );
}
