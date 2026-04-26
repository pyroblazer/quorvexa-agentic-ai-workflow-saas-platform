/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import React from 'react';

import '@testing-library/jest-dom';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders as a span', () => {
    const { container } = render(<Badge>Span</Badge>);
    expect(container.firstChild?.nodeName).toBe('SPAN');
  });

  it('applies default variant classes', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText('Default').className).toContain('bg-primary');
  });

  it('applies success variant classes', () => {
    render(<Badge variant="success">Success</Badge>);
    expect(screen.getByText('Success').className).toContain('bg-green-100');
  });

  it('applies warning variant classes', () => {
    render(<Badge variant="warning">Warning</Badge>);
    expect(screen.getByText('Warning').className).toContain('bg-yellow-100');
  });

  it('applies destructive variant classes', () => {
    render(<Badge variant="destructive">Error</Badge>);
    expect(screen.getByText('Error').className).toContain('bg-destructive');
  });

  it('applies outline variant classes', () => {
    render(<Badge variant="outline">Outline</Badge>);
    expect(screen.getByText('Outline').className).toContain('border border-input');
  });

  it('merges custom className', () => {
    render(<Badge className="my-badge">Custom</Badge>);
    expect(screen.getByText('Custom').className).toContain('my-badge');
  });

  it('passes additional HTML attributes', () => {
    render(<Badge data-testid="my-badge">Test</Badge>);
    expect(screen.getByTestId('my-badge')).toBeInTheDocument();
  });

  it('applies rounded-full and text-xs base classes', () => {
    render(<Badge>Base</Badge>);
    const el = screen.getByText('Base');
    expect(el.className).toContain('rounded-full');
    expect(el.className).toContain('text-xs');
  });
});
