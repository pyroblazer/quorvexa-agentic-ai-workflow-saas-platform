import { useDevPlaygroundStore } from './dev-playground.store';

beforeEach(() => {
  useDevPlaygroundStore.setState({
    responses: {},
    guideSteps: {},
    guideActiveStep: null,
  });
});

describe('dev-playground store', () => {
  describe('setResponse', () => {
    it('stores a success response', () => {
      useDevPlaygroundStore.getState().setResponse('workflows', { id: 'wf-1' }, 'success');
      const { responses } = useDevPlaygroundStore.getState();
      expect(responses.workflows).toBeDefined();
      expect(responses.workflows.data).toEqual({ id: 'wf-1' });
      expect(responses.workflows.status).toBe('success');
    });

    it('stores an error response', () => {
      useDevPlaygroundStore.getState().setResponse('auth', { message: 'failed' }, 'error');
      const { responses } = useDevPlaygroundStore.getState();
      expect(responses.auth.status).toBe('error');
    });

    it('overwrites previous response for same domain', () => {
      useDevPlaygroundStore.getState().setResponse('workflows', { id: 'wf-1' }, 'success');
      useDevPlaygroundStore.getState().setResponse('workflows', { id: 'wf-2' }, 'success');
      const { responses } = useDevPlaygroundStore.getState();
      expect(responses.workflows.data).toEqual({ id: 'wf-2' });
    });

    it('includes a timestamp', () => {
      useDevPlaygroundStore.getState().setResponse('workflows', {}, 'success');
      const { responses } = useDevPlaygroundStore.getState();
      expect(responses.workflows.timestamp).toBeGreaterThan(0);
    });
  });

  describe('setGuideStep', () => {
    it('sets step status to running', () => {
      useDevPlaygroundStore.getState().setGuideStep('step-1', 'running');
      const { guideSteps } = useDevPlaygroundStore.getState();
      expect(guideSteps['step-1'].status).toBe('running');
    });

    it('sets step status to completed with response', () => {
      useDevPlaygroundStore.getState().setGuideStep('step-1', 'completed', { id: 'wf-1' });
      const { guideSteps } = useDevPlaygroundStore.getState();
      expect(guideSteps['step-1'].status).toBe('completed');
      expect(guideSteps['step-1'].response).toEqual({ id: 'wf-1' });
    });

    it('sets step status to failed', () => {
      useDevPlaygroundStore.getState().setGuideStep('step-1', 'failed');
      const { guideSteps } = useDevPlaygroundStore.getState();
      expect(guideSteps['step-1'].status).toBe('failed');
    });
  });

  describe('setActiveStep', () => {
    it('sets the active step', () => {
      useDevPlaygroundStore.getState().setActiveStep('step-3');
      expect(useDevPlaygroundStore.getState().guideActiveStep).toBe('step-3');
    });

    it('clears the active step', () => {
      useDevPlaygroundStore.getState().setActiveStep('step-3');
      useDevPlaygroundStore.getState().setActiveStep(null);
      expect(useDevPlaygroundStore.getState().guideActiveStep).toBeNull();
    });
  });

  describe('resetGuide', () => {
    it('clears all guide steps and active step', () => {
      useDevPlaygroundStore.getState().setGuideStep('step-1', 'completed');
      useDevPlaygroundStore.getState().setActiveStep('step-2');
      useDevPlaygroundStore.getState().resetGuide();
      const state = useDevPlaygroundStore.getState();
      expect(state.guideSteps).toEqual({});
      expect(state.guideActiveStep).toBeNull();
    });
  });

  describe('clearResponses', () => {
    it('clears all stored responses', () => {
      useDevPlaygroundStore.getState().setResponse('workflows', {}, 'success');
      useDevPlaygroundStore.getState().setResponse('auth', {}, 'success');
      useDevPlaygroundStore.getState().clearResponses();
      expect(useDevPlaygroundStore.getState().responses).toEqual({});
    });
  });
});
