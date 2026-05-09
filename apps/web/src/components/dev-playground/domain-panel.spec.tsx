import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import { DomainPanel } from './domain-panel';

jest.mock('@quorvexa/ui', () => ({
  Card: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="card" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="card-header" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="card-content" {...props}>{children}</div>,
  Badge: ({ children, variant: _v, ...rest }: React.HTMLAttributes<HTMLSpanElement> & { variant?: string }) => (
    <span {...rest}>{children}</span>
  ),
  Spinner: () => <span data-testid="spinner">Loading...</span>,
}));

jest.mock('@/store/dev-playground.store', () => ({
  useDevPlaygroundStore: jest.fn(),
}));

import { useDevPlaygroundStore } from '@/store/dev-playground.store';

const mockStore = useDevPlaygroundStore as unknown as jest.Mock;

describe('DomainPanel', () => {
  beforeEach(() => {
    mockStore.mockImplementation((selector: (s: Record<string, unknown>) => unknown) =>
      selector({ responses: {} }),
    );
  });

  it('renders title and children', () => {
    render(
      <DomainPanel title="Test Panel" domain="test">
        <div>Panel content</div>
      </DomainPanel>,
    );
    expect(screen.getByText('Test Panel')).toBeInTheDocument();
    expect(screen.getByText('Panel content')).toBeInTheDocument();
  });

  it('shows "no response yet" when no response exists', () => {
    render(
      <DomainPanel title="Test Panel" domain="test">
        <div>Content</div>
      </DomainPanel>,
    );
    expect(screen.getByText(/No response yet/)).toBeInTheDocument();
  });

  it('shows JSON response when one exists', () => {
    mockStore.mockImplementation((selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        responses: {
          test: { data: { id: 'x' }, timestamp: Date.now(), status: 'success' },
        },
      }),
    );
    render(
      <DomainPanel title="Test Panel" domain="test">
        <div>Content</div>
      </DomainPanel>,
    );
    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});
