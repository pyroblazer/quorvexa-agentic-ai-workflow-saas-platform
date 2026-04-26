/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import React from 'react';

import '@testing-library/jest-dom';
import { Card, CardHeader, CardContent, CardFooter } from './card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies base card classes', () => {
    const { container } = render(<Card />);
    expect(container.firstChild).toHaveClass('rounded-lg', 'border', 'shadow-sm');
  });

  it('merges custom className', () => {
    const { container } = render(<Card className="my-custom" />);
    expect(container.firstChild).toHaveClass('my-custom');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Card ref={ref} />);
    expect(ref.current?.tagName).toBe('DIV');
  });

  it('has displayName', () => {
    expect(Card.displayName).toBe('Card');
  });
});

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader>Header</CardHeader>);
    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  it('applies padding and flex classes', () => {
    const { container } = render(<CardHeader />);
    expect(container.firstChild).toHaveClass('flex', 'flex-col', 'p-6');
  });

  it('has displayName', () => {
    expect(CardHeader.displayName).toBe('CardHeader');
  });
});

describe('CardContent', () => {
  it('renders children', () => {
    render(<CardContent>Content</CardContent>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('applies padding classes', () => {
    const { container } = render(<CardContent />);
    expect(container.firstChild).toHaveClass('p-6', 'pt-0');
  });

  it('has displayName', () => {
    expect(CardContent.displayName).toBe('CardContent');
  });
});

describe('CardFooter', () => {
  it('renders children', () => {
    render(<CardFooter>Footer</CardFooter>);
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('applies flex and padding classes', () => {
    const { container } = render(<CardFooter />);
    expect(container.firstChild).toHaveClass('flex', 'items-center', 'p-6');
  });

  it('has displayName', () => {
    expect(CardFooter.displayName).toBe('CardFooter');
  });
});
