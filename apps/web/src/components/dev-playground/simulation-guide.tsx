'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@quorvexa/ui';

import { SimulationStep } from './simulation-step';

import { agentApi, authApi, notificationsApi, usersApi, workflowApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useDevPlaygroundStore } from '@/store/dev-playground.store';


interface StepDef {
  id: string;
  description: string;
  dependsOn?: string[];
  execute: (getState: () => GuideState) => Promise<unknown>;
}

interface GuideState {
  guideSteps: Record<string, { status: string; response?: unknown }>;
  user: { id?: string; email?: string; tenantId?: string } | null;
}

const STEPS: StepDef[] = [
  {
    id: 'register',
    description: 'Register a test user',
    execute: async () => {
      return authApi.register({
        email: 'dev-test@quorvexa.io',
        password: 'DevPass123!',
        firstName: 'Test',
        lastName: 'User',
      });
    },
  },
  {
    id: 'login',
    description: 'Login as the test user',
    dependsOn: ['register'],
    execute: async () => {
      await useAuthStore.getState().login('dev-test@quorvexa.io', 'DevPass123!');
      return useAuthStore.getState().user;
    },
  },
  {
    id: 'profile',
    description: 'View your profile',
    dependsOn: ['login'],
    execute: async () => {
      return usersApi.getMe();
    },
  },
  {
    id: 'create-workflow',
    description: 'Create a workflow',
    dependsOn: ['profile'],
    execute: async () => {
      return workflowApi.create({
        name: 'Demo Workflow',
        description: 'Created by simulation guide',
        triggerType: 'manual',
      });
    },
  },
  {
    id: 'activate-workflow',
    description: 'Activate the workflow',
    dependsOn: ['create-workflow'],
    execute: async (getState) => {
      const step = getState().guideSteps['create-workflow'];
      const workflowId = (step?.response as { id?: string })?.id;
      if (!workflowId) throw new Error('No workflow ID from previous step');
      return workflowApi.activate(workflowId);
    },
  },
  {
    id: 'trigger-workflow',
    description: 'Trigger the workflow',
    dependsOn: ['activate-workflow'],
    execute: async (getState) => {
      const step = getState().guideSteps['create-workflow'];
      const workflowId = (step?.response as { id?: string })?.id;
      if (!workflowId) throw new Error('No workflow ID from previous step');
      return workflowApi.trigger(workflowId, {});
    },
  },
  {
    id: 'send-notification',
    description: 'Send a notification',
    dependsOn: ['trigger-workflow'],
    execute: async (getState) => {
      const user = getState().user;
      return notificationsApi.send({
        userId: user?.id ?? '',
        channel: 'in_app',
        subject: 'Guide Test',
        body: 'Hello from the playground simulation guide!',
        recipient: user?.email ?? 'dev-test@quorvexa.io',
      });
    },
  },
  {
    id: 'run-agent',
    description: 'Run an AI agent',
    dependsOn: ['send-notification'],
    execute: async () => {
      return agentApi.run({ prompt: 'Explain what Quorvexa does in one sentence.' });
    },
  },
];

export function SimulationGuide() {
  const guideSteps = useDevPlaygroundStore((s) => s.guideSteps);
  const setGuideStep = useDevPlaygroundStore((s) => s.setGuideStep);
  const resetGuide = useDevPlaygroundStore((s) => s.resetGuide);
  const user = useAuthStore((s) => s.user);

  const completedCount = Object.values(guideSteps).filter((s) => s.status === 'completed').length;
  const allDone = completedCount === STEPS.length;

  const getState = (): GuideState => ({
    guideSteps,
    user,
  });

  const canExecute = (step: StepDef): boolean => {
    if (!step.dependsOn || step.dependsOn.length === 0) return true;
    return step.dependsOn.every((depId) => guideSteps[depId]?.status === 'completed');
  };

  const handleExecute = async (step: StepDef) => {
    setGuideStep(step.id, 'running');
    try {
      const result = await step.execute(getState);
      setGuideStep(step.id, 'completed', result);
    } catch (err) {
      setGuideStep(step.id, 'failed', { error: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Simulation Guide</h2>
          <div className="flex items-center gap-2">
            <Badge variant={allDone ? 'success' : 'default'}>
              {completedCount}/{STEPS.length}
            </Badge>
            <Button size="sm" variant="ghost" onClick={resetGuide}>
              Reset
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Walk through every feature of the platform with one-click actions.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {STEPS.map((step, i) => (
          <SimulationStep
            key={step.id}
            stepNumber={i + 1}
            description={step.description}
            status={guideSteps[step.id]?.status ?? 'pending'}
            canExecute={canExecute(step)}
            onExecute={() => handleExecute(step)}
            response={guideSteps[step.id]?.response}
          />
        ))}
      </CardContent>
    </Card>
  );
}
