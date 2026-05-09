import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              Q
            </div>
            <span className="text-base font-semibold tracking-tight">Quorvexa</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/login"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-20">
        <div className="max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            AI-Powered Workflow Automation
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Orchestrate intelligent agents, automate complex pipelines, and
            collaborate in real-time — all in one enterprise-grade platform.
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center rounded-md border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-20 grid w-full max-w-4xl grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'AI Agents',
              desc: 'Orchestrate LLM-powered agents that execute complex tasks with tool use and memory.',
            },
            {
              title: 'Workflow Engine',
              desc: 'Build, trigger, and monitor multi-step workflows with conditions, delays, and retries.',
            },
            {
              title: 'Full Observability',
              desc: 'Prometheus metrics, distributed tracing, audit logs, and real-time SSE updates.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-border bg-card p-5"
            >
              <h3 className="font-semibold text-card-foreground">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <p className="text-center text-xs text-muted-foreground">
          Quorvexa Enterprise Platform
        </p>
      </footer>
    </div>
  );
}
