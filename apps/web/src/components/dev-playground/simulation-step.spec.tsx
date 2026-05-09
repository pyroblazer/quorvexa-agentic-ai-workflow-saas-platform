import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SimulationStep } from './simulation-step';

jest.mock('@quorvexa/ui', () => ({
  Button: ({ children, disabled, onClick, loading: _l, variant: _v, size: _s, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: string; size?: string }) => (
    <button disabled={disabled} onClick={onClick} {...rest}>{children}</button>
  ),
  Badge: ({ children, variant: _v, ...rest }: React.HTMLAttributes<HTMLSpanElement> & { variant?: string }) => (
    <span {...rest}>{children}</span>
  ),
}));

describe('SimulationStep', () => {
  it('renders step number and description', () => {
    render(
      <SimulationStep
        stepNumber={1}
        description="Register a test user"
        status="pending"
        canExecute={true}
        onExecute={jest.fn()}
      />,
    );
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Register a test user')).toBeInTheDocument();
  });

  it('shows pending badge', () => {
    render(
      <SimulationStep
        stepNumber={1}
        description="Step"
        status="pending"
        canExecute={true}
        onExecute={jest.fn()}
      />,
    );
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows completed badge', () => {
    render(
      <SimulationStep
        stepNumber={1}
        description="Step"
        status="completed"
        canExecute={true}
        onExecute={jest.fn()}
      />,
    );
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('disables execute button when canExecute is false', () => {
    render(
      <SimulationStep
        stepNumber={1}
        description="Step"
        status="pending"
        canExecute={false}
        onExecute={jest.fn()}
      />,
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onExecute when button is clicked', async () => {
    const onExecute = jest.fn().mockResolvedValue(undefined);
    render(
      <SimulationStep
        stepNumber={1}
        description="Step"
        status="pending"
        canExecute={true}
        onExecute={onExecute}
      />,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onExecute).toHaveBeenCalledTimes(1);
  });

  it('shows show/hide response toggle when response exists', () => {
    render(
      <SimulationStep
        stepNumber={1}
        description="Step"
        status="completed"
        canExecute={true}
        onExecute={jest.fn()}
        response={{ id: 'test' }}
      />,
    );
    expect(screen.getByText('Show response')).toBeInTheDocument();
  });
});
