import { Badge } from '@quorvexa/ui';
import { Bell, Bot, Clock, GitBranch, Globe, Play, Shuffle } from 'lucide-react';


import type { StepType } from '@/types/api-types';

const META: Record<StepType, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  action: { label: 'Action', Icon: Play },
  condition: { label: 'Condition', Icon: GitBranch },
  ai_agent: { label: 'AI Agent', Icon: Bot },
  http_request: { label: 'HTTP', Icon: Globe },
  notification: { label: 'Notify', Icon: Bell },
  delay: { label: 'Delay', Icon: Clock },
  transform: { label: 'Transform', Icon: Shuffle },
};

export function StepTypeBadge({ type }: { type: StepType }) {
  const { label, Icon } = META[type];
  return (
    <Badge variant="outline" className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
