/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import '@testing-library/jest-dom';
import { Input } from './input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('defaults to type="text"', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
  });

  it('accepts custom type', () => {
    render(<Input type="email" />);
    expect(document.querySelector('input')).toHaveAttribute('type', 'email');
  });

  it('renders password input', () => {
    render(<Input type="password" />);
    expect(document.querySelector('input')).toHaveAttribute('type', 'password');
  });

  it('applies base input classes', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('rounded-md');
    expect(input.className).toContain('border');
  });

  it('merges custom className', () => {
    render(<Input className="custom-input" />);
    expect(screen.getByRole('textbox').className).toContain('custom-input');
  });

  it('shows placeholder text', () => {
    render(<Input placeholder="Enter value" />);
    expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument();
  });

  it('is disabled when disabled prop passed', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('fires onChange when user types', () => {
    const onChange = jest.fn();
    render(<Input onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('forwards ref to input element', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current?.tagName).toBe('INPUT');
  });

  it('has displayName', () => {
    expect(Input.displayName).toBe('Input');
  });
});
