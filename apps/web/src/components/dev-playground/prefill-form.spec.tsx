import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PrefillForm, type FormField } from './prefill-form';

jest.mock('@quorvexa/ui', () => ({
  Button: ({ children, disabled, onClick, type, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => (
    <button type={type} disabled={disabled} onClick={onClick} {...props}>{children}</button>
  ),
  Input: ({ value, onChange, id, type, placeholder, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder} {...props} />
  ),
}));

const fields: FormField[] = [
  { name: 'name', label: 'Name', defaultValue: 'Test Workflow' },
  { name: 'description', label: 'Description', defaultValue: 'A test description' },
];

describe('PrefillForm', () => {
  it('renders fields with default values', () => {
    render(<PrefillForm fields={fields} onSubmit={jest.fn()} />);
    expect(screen.getByLabelText('Name')).toHaveValue('Test Workflow');
    expect(screen.getByLabelText('Description')).toHaveValue('A test description');
  });

  it('renders select fields with options', () => {
    const selectFields: FormField[] = [
      {
        name: 'type',
        label: 'Type',
        type: 'select',
        defaultValue: 'manual',
        options: ['manual', 'scheduled', 'webhook'],
      },
    ];
    render(<PrefillForm fields={selectFields} onSubmit={jest.fn()} />);
    expect(screen.getByDisplayValue('manual')).toBeInTheDocument();
  });

  it('fires onSubmit with current values', async () => {
    const onSubmit = jest.fn();
    render(<PrefillForm fields={fields} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Test Workflow',
      description: 'A test description',
    });
  });

  it('fires onSubmit with edited values', async () => {
    const onSubmit = jest.fn();
    render(<PrefillForm fields={fields} onSubmit={onSubmit} />);
    await userEvent.clear(screen.getByLabelText('Name'));
    await userEvent.type(screen.getByLabelText('Name'), 'New Name');
    await userEvent.click(screen.getByRole('button'));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Name' }),
    );
  });

  it('uses custom submit label', () => {
    render(<PrefillForm fields={fields} onSubmit={jest.fn()} submitLabel="Run" />);
    expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument();
  });
});
