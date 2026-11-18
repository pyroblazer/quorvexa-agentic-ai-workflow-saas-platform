import { WorkflowRunService } from './workflow-run.service';
import { WorkflowStepEntity, StepStatus, StepType } from './entities/workflow-step.entity';
import { WorkflowEntity } from './entities/workflow.entity';

const makeStep = (order: number, type: StepType, config: Record<string, unknown> = {}) =>
  ({ id: `s${order}`, order, type, config, maxRetries: 0 }) as unknown as WorkflowStepEntity;

const makeWorkflow = (steps: WorkflowStepEntity[]) =>
  ({ id: 'w1', steps }) as unknown as WorkflowEntity;

describe('WorkflowRunService branching', () => {
  let service: WorkflowRunService;
  const updates: Array<{ id: string; status: unknown }> = [];

  beforeEach(() => {
    updates.length = 0;
    service = new WorkflowRunService(
      { update: (id: string, patch: any) => Promise.resolve(updates.push({ id, status: patch.lastStatus })) } as any,
      {} as any,
    );
  });

  it('runs steps sequentially when no branch targets are set', async () => {
    const wf = makeWorkflow([makeStep(1, StepType.ACTION), makeStep(2, StepType.ACTION), makeStep(3, StepType.ACTION)]);
    const result = await service.execute(wf, {});

    expect(result.success).toBe(true);
    expect(result.steps.map((s) => s.stepId)).toEqual(['s1', 's2', 's3']);
  });

  it('follows nextOnTrue and skips the untaken path', async () => {
    const wf = makeWorkflow([
      makeStep(1, StepType.CONDITION, { condition: 'trigger.go', nextOnTrue: 3, nextOnFalse: 4 }),
      makeStep(2, StepType.ACTION), // on neither path: must never run
      makeStep(3, StepType.ACTION),
      makeStep(4, StepType.ACTION),
    ]);

    const result = await service.execute(wf, { go: true });

    expect(result.success).toBe(true);
    expect(result.steps.map((s) => s.stepId)).toEqual(['s1', 's3']);
  });

  it('follows nextOnFalse when the condition is false', async () => {
    const wf = makeWorkflow([
      makeStep(1, StepType.CONDITION, { condition: 'trigger.go', nextOnTrue: 3, nextOnFalse: 4 }),
      makeStep(3, StepType.ACTION),
      makeStep(4, StepType.ACTION),
    ]);

    const result = await service.execute(wf, { go: false });

    expect(result.steps.map((s) => s.stepId)).toEqual(['s1', 's4']);
  });

  it('falls through to the next step for conditions without targets', async () => {
    const wf = makeWorkflow([
      makeStep(1, StepType.CONDITION, { condition: 'trigger.go' }),
      makeStep(2, StepType.ACTION),
    ]);

    const result = await service.execute(wf, { go: false });

    expect(result.success).toBe(true);
    expect(result.steps.map((s) => s.stepId)).toEqual(['s1', 's2']);
  });

  it('stops the run when a step fails', async () => {
    const wf = makeWorkflow([
      makeStep(1, StepType.HTTP_REQUEST, { url: 'http://127.0.0.1:1/' }),
      makeStep(2, StepType.ACTION),
    ]);

    const result = await service.execute(wf, {});

    expect(result.success).toBe(false);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].status).toBe(StepStatus.FAILED);
    expect(updates).toContainEqual({ id: 's1', status: StepStatus.FAILED });
  });

  it('fails a run whose branch target does not exist', async () => {
    const wf = makeWorkflow([
      makeStep(1, StepType.CONDITION, { condition: 'trigger.go', nextOnTrue: 99 }),
      makeStep(2, StepType.ACTION),
    ]);

    const result = await service.execute(wf, { go: true });

    expect(result.success).toBe(false);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[1].output).toEqual({ error: 'Branch target order 99 not found' });
  });

  it('detects branch cycles instead of looping forever', async () => {
    const wf = makeWorkflow([
      makeStep(1, StepType.CONDITION, { condition: 'trigger.go', nextOnTrue: 2 }),
      makeStep(2, StepType.CONDITION, { condition: 'trigger.go', nextOnTrue: 1 }),
    ]);

    const result = await service.execute(wf, { go: true });

    expect(result.success).toBe(false);
    expect(
      result.steps.some((s) => s.output?.['error'] === 'Workflow exceeded the maximum number of step executions (possible branch cycle)'),
    ).toBe(true);
  });
});
