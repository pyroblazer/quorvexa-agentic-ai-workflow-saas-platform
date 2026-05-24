import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@quorvexa/ui';
import { Card, CardContent, CardHeader } from '@quorvexa/ui';

import { StepTypeBadge } from './step-type-badge';
import type { StepType } from '@/types/api-types';

export interface StepDraft {
  tempId: string;
  name: string;
  type: StepType;
  order: number;
  config: Record<string, unknown>;
  maxRetries: number;
  retryDelayMs: number;
}

interface StepEditorProps {
  step: StepDraft;
  isFirst: boolean;
  isLast: boolean;
  onChange: (step: StepDraft) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const STEP_TYPES: StepType[] = ['action', 'condition', 'ai_agent', 'http_request', 'notification', 'delay', 'transform'];

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const CHANNELS = ['email', 'webhook', 'in_app', 'sms', 'slack'];

function ConfigField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputClass = 'w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function StepEditor({ step, isFirst, isLast, onChange, onRemove, onMoveUp, onMoveDown }: StepEditorProps) {
  const [expanded, setExpanded] = useState(true);

  const updateConfig = (key: string, value: unknown) => {
    onChange({ ...step, config: { ...step.config, [key]: value } });
  };

  return (
    <Card>
      <CardHeader
        className="flex-row items-center justify-between gap-2 cursor-pointer select-none p-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-muted-foreground">#{step.order + 1}</span>
          <span className="text-sm font-medium truncate">{step.name || 'Untitled Step'}</span>
          {step.type && <StepTypeBadge type={step.type} />}
        </div>
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" disabled={isFirst} onClick={onMoveUp} aria-label="Move up">
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" disabled={isLast} onClick={onMoveDown} aria-label="Move down">
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemove} aria-label="Remove step">
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-3 px-3 pb-3">
          <div className="grid grid-cols-2 gap-3">
            <ConfigField label="Step Name">
              <input
                type="text"
                value={step.name}
                onChange={(e) => onChange({ ...step, name: e.target.value })}
                className={inputClass}
                placeholder="e.g. Send notification"
              />
            </ConfigField>
            <ConfigField label="Step Type">
              <select
                value={step.type}
                onChange={(e) => onChange({ ...step, type: e.target.value as StepType })}
                className={inputClass}
              >
                {STEP_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </ConfigField>
          </div>

          {/* Type-specific config */}
          <TypeConfigFields step={step} updateConfig={updateConfig} />

          {/* Retry settings */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
            <ConfigField label="Max Retries">
              <input
                type="number"
                min={0}
                value={step.maxRetries}
                onChange={(e) => onChange({ ...step, maxRetries: parseInt(e.target.value) || 0 })}
                className={inputClass}
              />
            </ConfigField>
            <ConfigField label="Retry Delay (ms)">
              <input
                type="number"
                min={0}
                value={step.retryDelayMs}
                onChange={(e) => onChange({ ...step, retryDelayMs: parseInt(e.target.value) || 0 })}
                className={inputClass}
              />
            </ConfigField>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function TypeConfigFields({ step, updateConfig }: { step: StepDraft; updateConfig: (key: string, value: unknown) => void }) {
  switch (step.type) {
    case 'action':
      return (
        <ConfigField label="Action Description">
          <input
            type="text"
            value={(step.config['action'] as string) ?? ''}
            onChange={(e) => updateConfig('action', e.target.value)}
            className={inputClass}
            placeholder="e.g. process_order"
          />
        </ConfigField>
      );

    case 'condition':
      return (
        <ConfigField label="Condition (context key to evaluate)">
          <input
            type="text"
            value={(step.config['condition'] as string) ?? ''}
            onChange={(e) => updateConfig('condition', e.target.value)}
            className={inputClass}
            placeholder="e.g. step_0.result"
          />
        </ConfigField>
      );

    case 'ai_agent':
      return (
        <>
          <ConfigField label="Prompt">
            <textarea
              value={(step.config['prompt'] as string) ?? ''}
              onChange={(e) => updateConfig('prompt', e.target.value)}
              className={inputClass}
              rows={3}
              placeholder="Enter the prompt for the AI agent..."
            />
          </ConfigField>
          <ConfigField label="Session ID (optional)">
            <input
              type="text"
              value={(step.config['sessionId'] as string) ?? ''}
              onChange={(e) => updateConfig('sessionId', e.target.value)}
              className={inputClass}
              placeholder="Leave empty for a new session"
            />
          </ConfigField>
        </>
      );

    case 'http_request':
      return (
        <>
          <div className="grid grid-cols-3 gap-3">
            <ConfigField label="Method">
              <select
                value={(step.config['method'] as string) ?? 'GET'}
                onChange={(e) => updateConfig('method', e.target.value)}
                className={inputClass}
              >
                {HTTP_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </ConfigField>
            <div className="col-span-2">
              <ConfigField label="URL">
                <input
                  type="text"
                  value={(step.config['url'] as string) ?? ''}
                  onChange={(e) => updateConfig('url', e.target.value)}
                  className={inputClass}
                  placeholder="https://api.example.com/endpoint"
                />
              </ConfigField>
            </div>
          </div>
          <ConfigField label="Headers (JSON)">
            <textarea
              value={typeof step.config['headers'] === 'object' ? JSON.stringify(step.config['headers'], null, 2) : '{}'}
              onChange={(e) => {
                try { updateConfig('headers', JSON.parse(e.target.value)); } catch { /* invalid, keep text */ }
              }}
              className={`${inputClass} font-mono text-xs`}
              rows={2}
              placeholder='{"Authorization": "Bearer ..."}'
            />
          </ConfigField>
          <ConfigField label="Body (JSON)">
            <textarea
              value={step.config['body'] ? JSON.stringify(step.config['body'], null, 2) : ''}
              onChange={(e) => {
                try { updateConfig('body', JSON.parse(e.target.value)); } catch { /* invalid */ }
              }}
              className={`${inputClass} font-mono text-xs`}
              rows={2}
              placeholder='{"key": "value"}'
            />
          </ConfigField>
        </>
      );

    case 'notification':
      return (
        <>
          <div className="grid grid-cols-2 gap-3">
            <ConfigField label="Channel">
              <select
                value={(step.config['channel'] as string) ?? 'email'}
                onChange={(e) => updateConfig('channel', e.target.value)}
                className={inputClass}
              >
                {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </ConfigField>
            <ConfigField label="Recipient">
              <input
                type="text"
                value={(step.config['recipient'] as string) ?? ''}
                onChange={(e) => updateConfig('recipient', e.target.value)}
                className={inputClass}
                placeholder="user@example.com"
              />
            </ConfigField>
          </div>
          <ConfigField label="Subject">
            <input
              type="text"
              value={(step.config['subject'] as string) ?? ''}
              onChange={(e) => updateConfig('subject', e.target.value)}
              className={inputClass}
              placeholder="Notification subject"
            />
          </ConfigField>
          <ConfigField label="Body">
            <textarea
              value={(step.config['body'] as string) ?? ''}
              onChange={(e) => updateConfig('body', e.target.value)}
              className={inputClass}
              rows={2}
              placeholder="Notification content..."
            />
          </ConfigField>
          <ConfigField label="User ID (optional)">
            <input
              type="text"
              value={(step.config['userId'] as string) ?? ''}
              onChange={(e) => updateConfig('userId', e.target.value)}
              className={inputClass}
              placeholder="Target user UUID"
            />
          </ConfigField>
        </>
      );

    case 'delay':
      return (
        <ConfigField label="Delay (milliseconds)">
          <input
            type="number"
            min={0}
            value={(step.config['delayMs'] as number) ?? 1000}
            onChange={(e) => updateConfig('delayMs', parseInt(e.target.value) || 1000)}
            className={inputClass}
          />
        </ConfigField>
      );

    case 'transform':
      return (
        <ConfigField label="Mapping (JSON — {outputKey: 'context.path.to.value'})">
          <textarea
            value={typeof step.config['mapping'] === 'object' ? JSON.stringify(step.config['mapping'], null, 2) : '{}'}
            onChange={(e) => {
              try { updateConfig('mapping', JSON.parse(e.target.value)); } catch { /* invalid */ }
            }}
            className={`${inputClass} font-mono text-xs`}
            rows={3}
            placeholder='{"name": "step_0.output.username"}'
          />
        </ConfigField>
      );

    default:
      return null;
  }
}
