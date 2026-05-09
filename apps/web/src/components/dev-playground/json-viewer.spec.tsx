import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { JsonViewer, JsonViewerLoading } from './json-viewer';

jest.mock('@quorvexa/ui', () => ({
  Badge: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: string }) => (
    <span {...props}>{children}</span>
  ),
  Spinner: () => <span data-testid="spinner">Loading...</span>,
}));

jest.mock('@/store/dev-playground.store', () => ({
  useDevPlaygroundStore: jest.fn(),
}));

import { useDevPlaygroundStore } from '@/store/dev-playground.store';

const mockStore = useDevPlaygroundStore as unknown as jest.Mock;

describe('JsonViewer', () => {
  beforeEach(() => {
    mockStore.mockImplementation((selector: (s: Record<string, unknown>) => unknown) =>
      selector({ responses: {} }),
    );
  });

  it('shows "no response yet" when no response exists', () => {
    render(<JsonViewer domain="test" />);
    expect(screen.getByText(/No response yet/)).toBeInTheDocument();
  });

  it('shows success badge for successful response', () => {
    const ts = new Date('2025-06-15T14:30:45.000Z').getTime();
    mockStore.mockImplementation((selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        responses: {
          test: { data: { id: 'x' }, timestamp: ts, status: 'success' },
        },
      }),
    );
    render(<JsonViewer domain="test" />);
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Copy JSON')).toBeInTheDocument();
    // Verify deterministic UTC format (HH:MM:SS), not locale-dependent
    expect(screen.getByText('14:30:45')).toBeInTheDocument();
  });

  it('shows error badge for error response', () => {
    mockStore.mockImplementation((selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        responses: {
          test: { data: { message: 'fail' }, timestamp: Date.now(), status: 'error' },
        },
      }),
    );
    render(<JsonViewer domain="test" />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('copies JSON to clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    mockStore.mockImplementation((selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        responses: {
          test: { data: { id: 'x' }, timestamp: Date.now(), status: 'success' },
        },
      }),
    );
    render(<JsonViewer domain="test" />);
    await userEvent.click(screen.getByText('Copy JSON'));
    expect(writeText).toHaveBeenCalled();
  });
});

describe('JsonViewerLoading', () => {
  it('renders loading state', () => {
    render(<JsonViewerLoading />);
    expect(screen.getByText('Executing...')).toBeInTheDocument();
  });
});
