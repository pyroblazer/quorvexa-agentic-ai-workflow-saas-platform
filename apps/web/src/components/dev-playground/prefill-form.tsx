'use client';

import { Button, Input } from '@quorvexa/ui';
import { useState } from 'react';

export interface FormField {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'select';
  defaultValue: string;
  options?: string[];
  placeholder?: string;
}

interface PrefillFormProps {
  fields: FormField[];
  onSubmit: (values: Record<string, string>) => Promise<void> | void;
  submitLabel?: string;
  loading?: boolean;
}

export function PrefillForm({ fields, onSubmit, submitLabel = 'Execute', loading }: PrefillFormProps) {
  const initialValues = Object.fromEntries(fields.map((f) => [f.name, f.defaultValue]));
  const [values, setValues] = useState(initialValues);

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {fields.map((field) => (
        <div key={field.name} className="space-y-1">
          <label htmlFor={field.name} className="text-xs font-medium text-muted-foreground">
            {field.label}
          </label>
          {field.type === 'select' && field.options ? (
            <select
              id={field.name}
              value={values[field.name]}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {field.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <Input
              id={field.name}
              type={field.type ?? 'text'}
              value={values[field.name]}
              onChange={(e) => handleChange(field.name, (e.target as HTMLInputElement).value)}
              placeholder={field.placeholder}
            />
          )}
        </div>
      ))}
      <Button type="submit" loading={loading} size="sm">
        {submitLabel}
      </Button>
    </form>
  );
}
