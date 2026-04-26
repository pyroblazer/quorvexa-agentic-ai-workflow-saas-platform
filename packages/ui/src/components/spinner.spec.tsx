/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import React from 'react';

import '@testing-library/jest-dom';
import { Spinner } from './spinner';

describe('Spinner', () => {
  it('renders an SVG with role="status"', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('uses default aria-label "Loading..."', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading...');
  });

  it('uses custom label when provided', () => {
    render(<Spinner label="Please wait" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Please wait');
  });

  it('applies md size classes by default', () => {
    render(<Spinner />);
    expect(screen.getByRole('status').getAttribute('class')).toContain('h-6 w-6');
  });

  it('applies sm size classes', () => {
    render(<Spinner size="sm" />);
    expect(screen.getByRole('status').getAttribute('class')).toContain('h-4 w-4');
  });

  it('applies lg size classes', () => {
    render(<Spinner size="lg" />);
    expect(screen.getByRole('status').getAttribute('class')).toContain('h-8 w-8');
  });

  it('applies animate-spin class', () => {
    render(<Spinner />);
    expect(screen.getByRole('status').getAttribute('class')).toContain('animate-spin');
  });

  it('merges custom className', () => {
    render(<Spinner className="text-red-500" />);
    expect(screen.getByRole('status').getAttribute('class')).toContain('text-red-500');
  });
});
