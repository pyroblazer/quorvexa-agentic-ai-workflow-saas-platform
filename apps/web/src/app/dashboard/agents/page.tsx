'use client';

import { useState } from 'react';

import { Badge } from '@quorvexa/ui';
import { Button } from '@quorvexa/ui';
import { Card, CardContent, CardHeader } from '@quorvexa/ui';
import { Spinner } from '@quorvexa/ui';

import { useAgentEmbed, useAgentRun, useAgentSearch, useTools } from '@/hooks/use-agents';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AgentsPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [sessionId, setSessionId] = useState('');
  const { data: tools, isLoading: toolsLoading } = useTools();

  // Embed section
  const [embedContent, setEmbedContent] = useState('');
  const [embedResult, setEmbedResult] = useState<string | null>(null);

  // Search section
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ content: string; score: number }> | null>(null);

  const agentRun = useAgentRun();
  const agentEmbed = useAgentEmbed();
  const agentSearch = useAgentSearch();

  const handleRun = () => {
    if (!prompt.trim()) return;
    const userMsg = prompt;
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setPrompt('');

    agentRun.mutate(
      { prompt: userMsg, sessionId: sessionId || undefined },
      {
        onSuccess: (result) => {
          setSessionId(result.sessionId);
          setMessages((prev) => [...prev, { role: 'assistant', content: result.output }]);
        },
        onError: (err) => {
          setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
        },
      },
    );
  };

  const handleEmbed = () => {
    if (!embedContent.trim()) return;
    agentEmbed.mutate(
      { content: embedContent },
      {
        onSuccess: (result) => {
          setEmbedResult(result.success ? `Embedded (ID: ${result.pointId ?? 'N/A'})` : 'Failed');
          setEmbedContent('');
        },
      },
    );
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    agentSearch.mutate(
      { query: searchQuery },
      {
        onSuccess: (result) => {
          setSearchResults(result.results);
        },
      },
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Agents</h1>
        <p className="text-sm text-muted-foreground">Interact with AI agents, embed content, and search knowledge</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat — takes 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Agent Chat</h2>
                {sessionId && (
                  <button
                    onClick={() => { setSessionId(''); setMessages([]); }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    New Session
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="min-h-[300px] max-h-[400px] overflow-y-auto space-y-3 mb-4 border border-border rounded-md p-3">
                {messages.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Ask the agent something to get started.
                  </p>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {agentRun.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Spinner size="sm" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRun(); } }}
                  placeholder="Type a message..."
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button variant="primary" size="sm" loading={agentRun.isPending} onClick={handleRun}>
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar tools */}
        <div className="space-y-4">
          {/* Embed */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <h2 className="font-semibold text-sm">Embed Content</h2>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <textarea
                value={embedContent}
                onChange={(e) => setEmbedContent(e.target.value)}
                placeholder="Content to embed..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button variant="outline" size="sm" className="w-full" loading={agentEmbed.isPending} onClick={handleEmbed}>
                Embed
              </Button>
              {embedResult && <p className="text-xs text-muted-foreground">{embedResult}</p>}
            </CardContent>
          </Card>

          {/* Search */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <h2 className="font-semibold text-sm">Search Memory</h2>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="Search knowledge base..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button variant="outline" size="sm" className="w-full" loading={agentSearch.isPending} onClick={handleSearch}>
                Search
              </Button>
              {searchResults && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {searchResults.map((r, i) => (
                    <div key={i} className="rounded border border-border p-2 text-xs">
                      <span className="text-muted-foreground">Score: {r.score.toFixed(3)}</span>
                      <p className="truncate">{r.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tools */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <h2 className="font-semibold text-sm">Available Tools</h2>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {toolsLoading ? (
                <Spinner size="sm" />
              ) : tools && tools.length > 0 ? (
                <div className="space-y-2">
                  {tools.map((tool) => (
                    <div key={tool.name} className="text-sm">
                      <Badge variant="outline">{tool.name}</Badge>
                      <p className="text-xs text-muted-foreground mt-0.5">{tool.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No tools available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
