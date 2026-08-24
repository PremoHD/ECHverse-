import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Link } from "wouter";
import { ArrowRight, Boxes, Compass, Network, Orbit, ShieldCheck, Sparkles } from "lucide-react";

const principles = [
  { icon: Orbit, title: "Spatial continuity", detail: "Persistent member hubs retain their identity, operating state, and collaborative context." },
  { icon: Network, title: "Open interoperability", detail: "Register destinations and USD scene references without tying the workspace to one runtime." },
  { icon: ShieldCheck, title: "Controlled boundaries", detail: "Operational metadata stays separate from payment execution and credential handling." },
];

export default function Home() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="nexus-shell min-h-screen overflow-hidden">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" className="group flex items-center gap-3" aria-label="ECHverse Nexus home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="font-display text-lg font-semibold tracking-[-0.04em] text-white">ECHverse <em className="not-italic text-teal-200">Nexus</em></span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Primary navigation">
          <a href="#architecture" className="hidden px-3 py-2 text-sm text-slate-300 transition-colors hover:text-white sm:block">Architecture</a>
          {isAuthenticated ? (
            <Link href="/workspace" className="nexus-button nexus-button-primary text-sm">Open workspace <ArrowRight size={15} /></Link>
          ) : (
            <button onClick={() => startLogin()} className="nexus-button nexus-button-outline text-sm">Member sign in</button>
          )}
        </nav>
      </header>

      <main>
        <section className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10 lg:pb-28">
          <div className="relative z-10 max-w-2xl">
            <div className="eyebrow"><Sparkles size={14} /> The interoperable spatial layer</div>
            <h1 className="mt-7 font-display text-5xl font-medium leading-[.98] tracking-[-0.065em] text-white sm:text-6xl lg:text-7xl">
              A clear way to <span className="text-gradient">coordinate worlds.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
              ECHverse Nexus is the member workspace for persistent spatial hubs, portable scene references, and visible propagation across the evolving immersive web.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/workspace" className="nexus-button nexus-button-primary">{isAuthenticated ? "Enter your workspace" : "Explore the member workspace"} <ArrowRight size={17} /></Link>
              {!isAuthenticated && <button onClick={() => startLogin()} className="nexus-button nexus-button-quiet">Sign in to collaborate</button>}
            </div>
            <p className="mt-5 text-sm text-slate-400">{isAuthenticated ? `Signed in as ${user?.name || "member"}.` : "Secure member access unlocks collaborative operations."}</p>
          </div>

          <div className="relative mx-auto w-full max-w-[560px] lg:mx-0">
            <div className="orbital-stage">
              <div className="stage-grid" />
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="orbit orbit-three" />
              <div className="orbital-core"><span>ECH</span><small>nexus</small></div>
              <div className="satellite satellite-one"><Boxes size={16} /><span>USD</span></div>
              <div className="satellite satellite-two"><Compass size={16} /><span>Hubs</span></div>
              <div className="satellite satellite-three"><Network size={16} /><span>Sync</span></div>
              <div className="signal-card signal-card-top"><span className="status-dot" /> Persistence layer <b>active</b></div>
              <div className="signal-card signal-card-bottom">Metadata stays portable <ArrowRight size={14} /></div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="glass-panel grid divide-y divide-white/10 overflow-hidden rounded-[1.6rem] border border-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
            {principles.map(({ icon: Icon, title, detail }) => (
              <article key={title} className="p-7 sm:p-8">
                <span className="feature-icon"><Icon size={19} /></span>
                <h2 className="mt-6 font-display text-2xl tracking-[-0.04em] text-white">{title}</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">{detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="architecture" className="relative mx-auto grid max-w-7xl gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:px-10 lg:py-32">
          <div>
            <div className="eyebrow">Design principle</div>
            <h2 className="mt-5 max-w-md font-display text-4xl leading-[1.02] tracking-[-0.055em] text-white">Interoperability without accidental exposure.</h2>
          </div>
          <div className="max-w-2xl space-y-6 text-base leading-7 text-slate-300">
            <p>Destinations are registered as explicit metadata, scene packages are referenced rather than absorbed, and propagation activity is recorded with recoverable outcomes.</p>
            <div className="boundary-callout"><ShieldCheck size={20} className="mt-0.5 shrink-0 text-teal-200" /><p><strong>Financial-service discovery is contextual only.</strong> ECHverse Nexus does not accept payment credentials, payment tokens, banking data, or live settlement instructions.</p></div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mx-auto flex max-w-7xl flex-col gap-4 border-t border-white/10 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <span>ECHverse Nexus · Spatial interoperability with deliberate boundaries.</span>
        <Link href="/workspace" className="text-slate-300 transition-colors hover:text-white">Member workspace <ArrowRight className="inline" size={14} /></Link>
      </footer>
    </div>
  );
}
