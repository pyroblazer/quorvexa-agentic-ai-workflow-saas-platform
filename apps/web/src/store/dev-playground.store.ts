import { create } from 'zustand';

export type ResponseStatus = 'success' | 'error';

export interface StoredResponse {
  data: unknown;
  timestamp: number;
  status: ResponseStatus;
}

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface GuideStepState {
  status: StepStatus;
  response?: unknown;
}

interface DevPlaygroundState {
  responses: Record<string, StoredResponse>;
  guideSteps: Record<string, GuideStepState>;
  guideActiveStep: string | null;

  setResponse: (domain: string, data: unknown, status: ResponseStatus) => void;
  setGuideStep: (stepId: string, status: StepStatus, response?: unknown) => void;
  setActiveStep: (stepId: string | null) => void;
  resetGuide: () => void;
  clearResponses: () => void;
}

export const useDevPlaygroundStore = create<DevPlaygroundState>()((set) => ({
  responses: {},
  guideSteps: {},
  guideActiveStep: null,

  setResponse: (domain, data, status) =>
    set((state) => ({
      responses: {
        ...state.responses,
        [domain]: { data, timestamp: Date.now(), status },
      },
    })),

  setGuideStep: (stepId, status, response) =>
    set((state) => ({
      guideSteps: {
        ...state.guideSteps,
        [stepId]: { status, ...(response !== undefined ? { response } : state.guideSteps[stepId]?.response !== undefined ? { response: state.guideSteps[stepId].response } : {}) },
      },
    })),

  setActiveStep: (stepId) => set({ guideActiveStep: stepId }),

  resetGuide: () => set({ guideSteps: {}, guideActiveStep: null }),

  clearResponses: () => set({ responses: {} }),
}));
