import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
    private readonly jwtService: JwtService,
  ) {}

  async execute(
    workflow: WorkflowEntity,
    payload: Record<string, unknown>,
  ): Promise<WorkflowRunResult> {
    const steps = workflow.steps.sort((a, b) => a.order - b.order);
    const results: WorkflowRunResult['steps'] = [];

    const context: Record<string, unknown> = { trigger: payload };

    for (const step of steps) {
      const maxAttempts = (step.maxRetries ?? 3) + 1;
      let lastError: Error | null = null;
      let output: Record<string, unknown> | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          output = await this.executeStep(step, context);
          lastError = null;
          break;
        } catch (err) {
          lastError = err as Error;
          if (attempt < maxAttempts) {
            const delay = step.retryDelayMs ?? 0;
            if (delay > 0) await new Promise((r) => setTimeout(r, delay));
            this.logger.warn({ stepId: step.id, attempt, maxAttempts }, 'Step failed, retrying');
          }
        }
      }

      if (lastError) {
        const errorOutput = { error: lastError.message };
        results.push({ stepId: step.id, status: StepStatus.FAILED, output: errorOutput });

        await this.stepRepo.update(step.id, {
          lastStatus: StepStatus.FAILED,
          lastOutput: errorOutput as any,
        });

        this.logger.error({ stepId: step.id }, 'Step execution failed after all retries');
        break;
      }

      context[`step_${step.order}`] = output;
      results.push({ stepId: step.id, status: StepStatus.COMPLETED, output });

      await this.stepRepo.update(step.id, {
        lastStatus: StepStatus.COMPLETED,
        lastOutput: output as any,
      });
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
        return this.makeHttpRequest(step);
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

  // ── Dot-path context resolution ────────────────────────────────

  private resolvePath(context: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let value: unknown = context;
    for (const part of parts) {
      if (value === null || value === undefined || typeof value !== 'object') return undefined;
      value = (value as Record<string, unknown>)[part];
    }
    return value;
  }

  // ── Step implementations ───────────────────────────────────────

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
    const value = this.resolvePath(context, condition);
    const result = Boolean(value);
    return { condition, result, branch: result ? 'true' : 'false' };
  }

  private async callAiAgent(
    step: WorkflowStepEntity,
    context: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const agentUrl = process.env['AI_AGENT_SERVICE_URL'] ?? 'http://localhost:3005';
    const payload: Record<string, unknown> = {
      prompt: step.config['prompt'] ?? 'Execute the following task',
      session_id: step.config['sessionId'] ?? randomUUID(),
      config: step.config,
      context,
    };

    const response = await fetch(`${agentUrl}/api/v1/agents/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`AI agent call failed: ${response.statusText}`);
    }

    return (await response.json()) as Record<string, unknown>;
  }

  private async makeHttpRequest(
    step: WorkflowStepEntity,
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

    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = await response.text();
    }

    return { status: response.status, body: responseBody };
  }

  private async sendNotification(
    step: WorkflowStepEntity,
    context: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const notifUrl = process.env['NOTIFICATION_SERVICE_URL'] ?? 'http://localhost:3004';

    const token = this.jwtService.sign(
      { sub: 'system', role: 'super_admin', tenantId: 'default', email: 'system@quorvexa.dev' },
      { expiresIn: '5m' },
    );

    const response = await fetch(`${notifUrl}/api/v1/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ ...step.config, context }),
    });

    if (!response.ok) {
      this.logger.warn({ status: response.status }, 'Notification service returned non-OK');
      return { sent: false, status: response.status, error: response.statusText };
    }

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
      output[key] = this.resolvePath(context, sourcePath) ?? null;
    }
    return output;
  }
}
