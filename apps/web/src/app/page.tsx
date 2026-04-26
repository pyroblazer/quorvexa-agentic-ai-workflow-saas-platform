import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            Quorvexa
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Enterprise AI-powered workflow automation platform. Orchestrate agents,
            automate pipelines, collaborate in real-time.
          </p>
        </div>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Go to dashboard"
          >
            Get Started
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-sm font-medium hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Sign in to your account"
          >
            Sign In
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {[
            { title: 'AI Agents', desc: 'Orchestrate LLM-powered agents that automate complex workflows.' },
            { title: 'Real-time Collaboration', desc: 'SSE-powered live updates so your team stays in sync.' },
            { title: 'Full Observability', desc: 'Prometheus metrics, Grafana dashboards, and audit logs.' },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-border bg-card p-6 text-left"
            >
              <h3 className="font-semibold text-card-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
