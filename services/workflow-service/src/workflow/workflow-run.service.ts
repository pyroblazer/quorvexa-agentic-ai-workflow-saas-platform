import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createLogger } from '@quorvexa/observability';
import { Repository } from 'typeorm';

import { WorkflowStepEntity, StepStatus, StepType } from './entities/workflow-step.entity';
import { WorkflowEntity } from './entities/workflow.entity';

export interface WorkflowRunResult {
  workflowId: string;
  executedAt: Date;
  steps: Array<{ stepId: string; status: StepStatus; output: Record<string, unknown> | null }>;
  success: boolean;
}

@Injectable()
export class WorkflowRunService {
  private readonly logger = createLogger('workflow-service:runner');

  constructor(
    @InjectRepository(WorkflowStepEntity)
    private readonly stepRepo: Repository<WorkflowStepEntity>,
  ) {}

  async execute(
    workflow: WorkflowEntity,
    payload: Record<string, unknown>,
  ): Promise<WorkflowRunResult> {
    const steps = workflow.steps.sort((a, b) => a.order - b.order);
    const results: WorkflowRunResult['steps'] = [];

    // Context carries data between steps — each step can read previous step outputs
    const context: Record<string, unknown> = { trigger: payload };

    for (const step of steps) {
      try {
        const output = await this.executeStep(step, context);
        context[`step_${step.order}`] = output;
        results.push({ stepId: step.id, status: StepStatus.COMPLETED, output });

        await this.stepRepo.update(step.id, {
          lastStatus: StepStatus.COMPLETED,
          lastOutput: output as any,
        });
      } catch (err) {
        const errorOutput = { error: (err as Error).message };
        results.push({ stepId: step.id, status: StepStatus.FAILED, output: errorOutput });

        await this.stepRepo.update(step.id, {
          lastStatus: StepStatus.FAILED,
          lastOutput: errorOutput as any,
        });

        this.logger.error({ stepId: step.id, err }, 'Step execution failed');
        break;
      }
    }

    const success = results.every((r) => r.status === StepStatus.COMPLETED);
    this.logger.info({ workflowId: workflow.id, success, steps: results.length }, 'Workflow run complete');

    return { workflowId: workflow.id, executedAt: new Date(), steps: results, success };
  }

  private async executeStep(
    step: WorkflowStepEntity,
    context: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    switch (step.type) {
      case StepType.ACTION:
        return this.executeAction(step, context);
      case StepType.CONDITION:
        return this.evaluateCondition(step, context);
      case StepType.AI_AGENT:
        return this.callAiAgent(step, context);
      case StepType.HTTP_REQUEST:
        return this.makeHttpRequest(step, context);
      case StepType.NOTIFICATION:
        return this.sendNotification(step, context);
      case StepType.DELAY:
        return this.delay(step);
      case StepType.TRANSFORM:
        return this.transform(step, context);
      default:
        throw new Error(`Unknown step type: ${step.type as string}`);
    }
  }

  private async executeAction(
    step: WorkflowStepEntity,
    context: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    this.logger.debug({ stepId: step.id }, 'Executing action step');
    return { action: step.config['action'], executed: true, context: Object.keys(context) };
  }

  private async evaluateCondition(
    step: WorkflowStepEntity,
    context: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const condition = step.config['condition'] as string;
    // Simple expression evaluation — in production, use a safe evaluator like expr-eval
    const result = Boolean(context[condition]);
    return { condition, result, branch: result ? 'true' : 'false' };
  }

  private async callAiAgent(
    step: WorkflowStepEntity,
    context: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    // Calls the ai-agent-service via internal HTTP
    const agentUrl = process.env['AI_AGENT_SERVICE_URL'] ?? 'http://localhost:3005';
    const response = await fetch(`${agentUrl}/api/v1/agents/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: step.config, context }),
    });

    if (!response.ok) {
      throw new Error(`AI agent call failed: ${response.statusText}`);
    }

    return (await response.json()) as Record<string, unknown>;
  }

  private async makeHttpRequest(
    step: WorkflowStepEntity,
    _context: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { url, method = 'GET', headers = {}, body } = step.config as {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      body?: unknown;
    };

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseBody = await response.json() as Record<string, unknown>;
    return { status: response.status, body: responseBody };
  }

  private async sendNotification(
    step: WorkflowStepEntity,
    _context: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const notifUrl = process.env['NOTIFICATION_SERVICE_URL'] ?? 'http://localhost:3004';
    await fetch(`${notifUrl}/api/v1/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...step.config, context: _context }),
    });
    return { sent: true };
  }

  private async delay(step: WorkflowStepEntity): Promise<Record<string, unknown>> {
    const ms = (step.config['delayMs'] as number) ?? 1000;
    await new Promise((resolve) => setTimeout(resolve, ms));
    return { delayed: ms };
  }

  private transform(
    step: WorkflowStepEntity,
    context: Record<string, unknown>,
  ): Record<string, unknown> {
    const mapping = step.config['mapping'] as Record<string, string>;
    const output: Record<string, unknown> = {};
    for (const [key, sourcePath] of Object.entries(mapping)) {
      const parts = sourcePath.split('.');
      let value: unknown = context;
      for (const part of parts) {
        value = (value as Record<string, unknown>)[part];
      }
      output[key] = value;
    }
    return output;
  }
}
