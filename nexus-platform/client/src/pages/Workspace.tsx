import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, Boxes, CheckCircle2, ChevronRight, CircleAlert, Compass, LogOut, Network, Plus, Radio, RefreshCw, ShieldCheck, Sparkles, Waves } from "lucide-react";
import { toast } from "sonner";

type WorkspaceView = "hubs" | "destinations" | "scenes" | "propagation";

const viewLabels: Array<{ id: WorkspaceView; label: string; icon: typeof Compass }> = [
  { id: "hubs", label: "Spatial hubs", icon: Compass },
  { id: "destinations", label: "Destinations", icon: Network },
  { id: "scenes", label: "Scene packages", icon: Boxes },
  { id: "propagation", label: "Propagation", icon: Waves },
];

type HubForm = { name: string; handle: string; description: string; visibility: "members" | "invite"; capacity: number };
type DestinationForm = { name: string; handle: string; kind: "browser" | "openusd" | "custom"; launchUrl: string; summary: string; compatibility: string; status: "ready" | "degraded" | "offline" | "pending" };
const initialHub: HubForm = { name: "", handle: "", description: "", visibility: "members", capacity: 24 };
const initialDestination: DestinationForm = { name: "", handle: "", kind: "browser", launchUrl: "", summary: "", compatibility: "Web, Desktop", status: "pending" };
type SceneForm = { destinationId: string; title: string; sourceUri: string; format: "usd" | "usda" | "usdc" | "usdz" | "glb" | "other"; packageVersion: string; compatibility: string; reviewState: "draft" | "reviewed" | "approved"; contentHash: string };
const initialScene: SceneForm = { destinationId: "", title: "", sourceUri: "", format: "usdz", packageVersion: "1.0.0", compatibility: "OpenUSD, Web", reviewState: "draft", contentHash: "" };

function timestamp(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function StatusPill({ status }: { status: string }) {
  const ready = status === "ready" || status === "succeeded" || status === "approved" || status === "active";
  const caution = status === "degraded" || status === "partial" || status === "pending" || status === "queued" || status === "reviewed";
  return <span className={cn("status-pill", ready ? "status-good" : caution ? "status-caution" : "status-muted")}><i />{status.replace("_", " ")}</span>;
}

export default function Workspace() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [view, setView] = useState<WorkspaceView>("hubs");
  const [showCreate, setShowCreate] = useState(false);
  const [hubForm, setHubForm] = useState(initialHub);
  const [destinationForm, setDestinationForm] = useState(initialDestination);
  const [sceneForm, setSceneForm] = useState(initialScene);
  const utils = trpc.useUtils();
  const queryOptions = { enabled: isAuthenticated };
  const hubs = trpc.nexus.spatialHubs.list.useQuery(undefined, queryOptions);
  const destinations = trpc.nexus.destinations.list.useQuery(undefined, queryOptions);
  const packages = trpc.nexus.scenePackages.list.useQuery(undefined, queryOptions);
  const events = trpc.nexus.propagation.list.useQuery(undefined, queryOptions);
  const safety = trpc.nexus.safety.useQuery();

  const createHub = trpc.nexus.spatialHubs.create.useMutation({
    onSuccess: async () => { await utils.nexus.spatialHubs.list.invalidate(); setHubForm(initialHub); setShowCreate(false); toast.success("Spatial hub created"); },
    onError: (error) => toast.error(error.message),
  });
  const joinHub = trpc.nexus.spatialHubs.join.useMutation({
    onSuccess: () => toast.success("Presence recorded. You are active in this hub."),
    onError: (error) => toast.error(error.message),
  });
  const createDestination = trpc.nexus.destinations.create.useMutation({
    onSuccess: async () => { await utils.nexus.destinations.list.invalidate(); setDestinationForm(initialDestination); setShowCreate(false); toast.success("Destination registered"); },
    onError: (error) => toast.error(error.message),
  });
  const createScene = trpc.nexus.scenePackages.create.useMutation({
    onSuccess: async () => { await utils.nexus.scenePackages.list.invalidate(); setSceneForm(initialScene); setShowCreate(false); toast.success("Scene package registered"); },
    onError: (error) => toast.error(error.message),
  });
  const recordPropagation = trpc.nexus.propagation.record.useMutation({
    onSuccess: async () => { await utils.nexus.propagation.list.invalidate(); toast.success("Propagation activity recorded"); },
    onError: (error) => toast.error(error.message),
  });
  const recordHealth = trpc.nexus.destinations.recordHealth.useMutation({
    onSuccess: async () => { await utils.nexus.destinations.list.invalidate(); toast.success("Integration health updated"); },
    onError: (error) => toast.error(error.message),
  });

  const metrics = useMemo(() => [
    { label: "Active hubs", value: hubs.data?.filter((hub) => hub.state === "active").length ?? 0, icon: Compass },
    { label: "Registered destinations", value: destinations.data?.length ?? 0, icon: Network },
    { label: "Scene packages", value: packages.data?.length ?? 0, icon: Boxes },
    { label: "Recorded operations", value: events.data?.length ?? 0, icon: Waves },
  ], [destinations.data, events.data, hubs.data, packages.data]);

  if (loading) return <div className="workspace-loading"><div className="brand-mark"><span /></div></div>;
  if (!isAuthenticated) return <MemberGate />;

  const createHubSubmit = (event: FormEvent) => {
    event.preventDefault();
    createHub.mutate(hubForm);
  };
  const createDestinationSubmit = (event: FormEvent) => {
    event.preventDefault();
    const compatibility = destinationForm.compatibility.split(",").map((item) => item.trim()).filter(Boolean);
    createDestination.mutate({ ...destinationForm, compatibility });
  };
  const createSceneSubmit = (event: FormEvent) => {
    event.preventDefault();
    createScene.mutate({ ...sceneForm, destinationId: Number(sceneForm.destinationId), compatibility: sceneForm.compatibility.split(",").map((item) => item.trim()).filter(Boolean), contentHash: sceneForm.contentHash || undefined });
  };

  return (
    <div className="workspace-shell min-h-screen">
      <aside className="workspace-rail">
        <Link href="/" className="flex items-center gap-3 px-3 py-3" aria-label="Return to ECHverse Nexus home"><span className="brand-mark"><span /></span><span className="font-display text-lg font-semibold tracking-[-.04em] text-white">ECHverse <em className="not-italic text-teal-200">Nexus</em></span></Link>
        <div className="rail-label">Member workspace</div>
        <nav className="space-y-1" aria-label="Workspace sections">
          {viewLabels.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setView(id); setShowCreate(false); }} className={cn("rail-link", view === id && "rail-link-active")}><Icon size={17} /><span>{label}</span></button>)}
        </nav>
        <div className="rail-spacer" />
        <div className="rail-safety"><ShieldCheck size={16} /><span>Metadata-only operations</span></div>
        <div className="rail-member"><div className="member-initial">{user?.name?.slice(0, 1).toUpperCase() || "M"}</div><div className="min-w-0 flex-1"><b>{user?.name || "Member"}</b><small>{user?.email || "Authenticated member"}</small></div><button onClick={logout} aria-label="Sign out" className="text-slate-500 transition-colors hover:text-white"><LogOut size={16} /></button></div>
      </aside>

      <main className="workspace-main">
        <header className="workspace-header">
          <div><div className="eyebrow"><Radio size={13} /> Live member environment</div><h1>{view === "hubs" ? "Spatial hubs" : view === "destinations" ? "Interoperability registry" : view === "scenes" ? "Scene package registry" : "Propagation console"}</h1></div>
          <div className="flex items-center gap-3"><Link href="/" className="hidden text-sm text-slate-400 transition-colors hover:text-white sm:block">Public overview</Link><Button onClick={() => setShowCreate((value) => !value)} className="create-button"><Plus size={16} /> {view === "hubs" ? "Create hub" : view === "destinations" ? "Register destination" : view === "scenes" ? "Register package" : "Record activity"}</Button></div>
        </header>

        <section className="metric-grid">
          {metrics.map(({ label, value, icon: Icon }) => <article key={label} className="metric-card"><span className="metric-icon"><Icon size={17} /></span><div><strong>{value}</strong><p>{label}</p></div></article>)}
        </section>

        <section className="workspace-content">
          {view === "hubs" && <HubsPanel hubs={hubs.data} loading={hubs.isLoading} showCreate={showCreate} form={hubForm} setForm={setHubForm} onSubmit={createHubSubmit} isCreating={createHub.isPending} onJoin={(hubId) => joinHub.mutate({ hubId })} joinPending={joinHub.isPending} />}
          {view === "destinations" && <DestinationsPanel destinations={destinations.data} packages={packages.data} loading={destinations.isLoading || packages.isLoading} showCreate={showCreate} form={destinationForm} setForm={setDestinationForm} onSubmit={createDestinationSubmit} isCreating={createDestination.isPending} />}
          {view === "scenes" && <ScenesPanel scenes={packages.data} destinations={destinations.data} loading={packages.isLoading || destinations.isLoading} showCreate={showCreate} form={sceneForm} setForm={setSceneForm} onSubmit={createSceneSubmit} isCreating={createScene.isPending} />}
          {view === "propagation" && <PropagationPanel events={events.data} destinations={destinations.data} loading={events.isLoading} showCreate={showCreate} onRecord={({ event, health }) => { recordPropagation.mutate(event); recordHealth.mutate(health); }} isRecording={recordPropagation.isPending || recordHealth.isPending} />}
        </section>

        <section className="workspace-boundary"><ShieldCheck size={19} className="text-teal-200" /><div><b>Protected integration boundary</b><p>{safety.data?.message || "This workspace stores operational metadata only."}</p></div><Link href="/" className="boundary-link">View public stance <ArrowUpRight size={15} /></Link></section>
      </main>
    </div>
  );
}

function MemberGate() {
  return <div className="member-gate"><div className="gate-panel"><span className="brand-mark"><span /></span><div className="eyebrow mt-7">Member access</div><h1>Enter the Nexus workspace.</h1><p>Create spatial hubs, register portable destinations, and observe publication activity in one protected environment.</p><Button className="create-button mt-7 w-full" onClick={() => startLogin()}>Sign in to continue <ChevronRight size={17} /></Button><Link href="/" className="mt-5 block text-center text-sm text-slate-400 hover:text-white">Return to public overview</Link></div></div>;
}

function HubsPanel({ hubs, loading, showCreate, form, setForm, onSubmit, isCreating, onJoin, joinPending }: { hubs: any[] | undefined; loading: boolean; showCreate: boolean; form: HubForm; setForm: (value: HubForm) => void; onSubmit: (event: FormEvent) => void; isCreating: boolean; onJoin: (id: number) => void; joinPending: boolean }) {
  return <div className="panel-stack">
    {showCreate && <form onSubmit={onSubmit} className="create-panel"><PanelHeading title="Create a persistent spatial hub" description="Set durable metadata that members can find and join." /><div className="form-grid"><Field label="Hub name"><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Northstar Assembly" /></Field><Field label="Handle"><Input required value={form.handle} onChange={(event) => setForm({ ...form, handle: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="northstar-assembly" /></Field><Field label="Member capacity"><Input required type="number" min={2} max={500} value={form.capacity} onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })} /></Field><Field label="Access"><select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value as "members" | "invite" })}><option value="members">All members</option><option value="invite">Invite only</option></select></Field><Field label="Purpose" wide><Textarea required minLength={12} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe the collaboration this hub will support." /></Field></div><div className="form-action"><Button type="submit" className="create-button" disabled={isCreating}>{isCreating ? "Creating…" : "Create spatial hub"}<ArrowUpRight size={16} /></Button></div></form>}
    <div className="section-heading"><div><span className="section-kicker">Persistent spaces</span><h2>Available hubs</h2></div><p>Browse active, member-managed spaces. Joining writes a durable presence record.</p></div>
    {loading ? <LoadingRows /> : hubs?.length ? <div className="hub-grid">{hubs.map((hub) => <article key={hub.id} className="hub-card"><div className="hub-card-top"><span className="hub-avatar">{hub.name.slice(0, 2).toUpperCase()}</span><StatusPill status={hub.state} /></div><h3>{hub.name}</h3><p>{hub.description}</p><div className="hub-card-footer"><span>{hub.visibility === "invite" ? "Invite access" : "Member access"} · {hub.capacity} capacity</span><Button variant="ghost" size="sm" onClick={() => onJoin(hub.id)} disabled={joinPending}>Join <ArrowRight size={15} /></Button></div></article>)}</div> : <EmptyState icon={Compass} title="No spatial hubs yet" detail="Create the first durable collaboration space for your member community." />}
  </div>;
}

function DestinationsPanel({ destinations, packages, loading, showCreate, form, setForm, onSubmit, isCreating }: { destinations: any[] | undefined; packages: any[] | undefined; loading: boolean; showCreate: boolean; form: DestinationForm; setForm: (value: DestinationForm) => void; onSubmit: (event: FormEvent) => void; isCreating: boolean }) {
  return <div className="panel-stack">
    {showCreate && <form onSubmit={onSubmit} className="create-panel"><PanelHeading title="Register an interoperable destination" description="Save public metadata and compatibility declarations; keep vendor credentials outside the workspace." /><div className="form-grid"><Field label="Destination name"><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Harbor Commons" /></Field><Field label="Handle"><Input required value={form.handle} onChange={(event) => setForm({ ...form, handle: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="harbor-commons" /></Field><Field label="Type"><select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as typeof form.kind })}><option value="browser">Browser destination</option><option value="openusd">OpenUSD registry</option><option value="custom">Custom endpoint</option></select></Field><Field label="Current status"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as typeof form.status })}><option value="pending">Pending</option><option value="ready">Ready</option><option value="degraded">Degraded</option><option value="offline">Offline</option></select></Field><Field label="Launch URL" wide><Input required type="url" value={form.launchUrl} onChange={(event) => setForm({ ...form, launchUrl: event.target.value })} placeholder="https://example.com/spatial-entry" /></Field><Field label="Compatibility labels" wide><Input required value={form.compatibility} onChange={(event) => setForm({ ...form, compatibility: event.target.value })} placeholder="Web, Desktop, USD" /><small>Separate labels with commas.</small></Field><Field label="Summary" wide><Textarea required minLength={12} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="Describe how this destination participates in the Nexus." /></Field></div><div className="form-action"><Button type="submit" className="create-button" disabled={isCreating}>{isCreating ? "Registering…" : "Register destination"}<ArrowUpRight size={16} /></Button></div></form>}
    <div className="section-heading"><div><span className="section-kicker">Portable connection map</span><h2>Registered destinations</h2></div><p>Declared compatibility is explicit. Health is independently observable.</p></div>
    {loading ? <LoadingRows /> : destinations?.length ? <div className="destination-table"><div className="table-head"><span>Destination</span><span>Compatibility</span><span>Health</span><span>Scene packages</span></div>{destinations.map((destination) => <article className="table-row" key={destination.id}><div><b>{destination.name}</b><small>{destination.kind} · {destination.summary}</small></div><div className="label-list">{destination.compatibility.map((item: string) => <span key={item}>{item}</span>)}</div><div><StatusPill status={destination.health?.state || destination.status} /><small className="mt-2 block text-slate-500">{destination.health?.detail || "No health detail reported."}</small></div><div><b>{packages?.filter((scene) => scene.destinationId === destination.id).length || 0}</b><small>registered references</small></div></article>)}</div> : <EmptyState icon={Network} title="No destinations registered" detail="Add a browser, OpenUSD, or custom destination without embedding vendor credentials." />}
  </div>;
}

function ScenesPanel({ scenes, destinations, loading, showCreate, form, setForm, onSubmit, isCreating }: { scenes: any[] | undefined; destinations: any[] | undefined; loading: boolean; showCreate: boolean; form: SceneForm; setForm: (value: SceneForm) => void; onSubmit: (event: FormEvent) => void; isCreating: boolean }) {
  const destinationName = (id: number) => destinations?.find((destination) => destination.id === id)?.name || "Unlinked destination";
  return <div className="panel-stack">
    {showCreate && <form onSubmit={onSubmit} className="create-panel"><PanelHeading title="Register a portable scene package" description="Reference a package externally, declare its compatibility, and retain a reviewable record." /><div className="form-grid"><Field label="Destination"><select required value={form.destinationId} disabled={!destinations?.length} onChange={(event) => setForm({ ...form, destinationId: event.target.value })}><option value="">Select a destination</option>{destinations?.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}</select></Field><Field label="Package title"><Input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Nexus atrium v1" /></Field><Field label="Format"><select value={form.format} onChange={(event) => setForm({ ...form, format: event.target.value as SceneForm["format"] })}><option value="usd">USD</option><option value="usda">USDA</option><option value="usdc">USDC</option><option value="usdz">USDZ</option><option value="glb">GLB</option><option value="other">Other</option></select></Field><Field label="Review state"><select value={form.reviewState} onChange={(event) => setForm({ ...form, reviewState: event.target.value as SceneForm["reviewState"] })}><option value="draft">Draft</option><option value="reviewed">Reviewed</option><option value="approved">Approved</option></select></Field><Field label="Source URI" wide><Input required type="url" value={form.sourceUri} onChange={(event) => setForm({ ...form, sourceUri: event.target.value })} placeholder="https://assets.example.com/nexus-atrium.usdz" /></Field><Field label="Version"><Input required value={form.packageVersion} onChange={(event) => setForm({ ...form, packageVersion: event.target.value })} /></Field><Field label="Content hash (optional)"><Input value={form.contentHash} onChange={(event) => setForm({ ...form, contentHash: event.target.value })} placeholder="sha256:…" /></Field><Field label="Compatibility labels" wide><Input required value={form.compatibility} onChange={(event) => setForm({ ...form, compatibility: event.target.value })} placeholder="OpenUSD, Web, iOS" /><small>Separate labels with commas.</small></Field></div><div className="form-action"><Button type="submit" className="create-button" disabled={!destinations?.length || isCreating}>{isCreating ? "Registering…" : "Register scene package"}<ArrowUpRight size={16} /></Button>{!destinations?.length && <span className="text-sm text-amber-200">Register a destination first.</span>}</div></form>}
    <div className="section-heading"><div><span className="section-kicker">USD and portable assets</span><h2>Scene package references</h2></div><p>Each reference retains its declared format, review state, and compatibility posture.</p></div>
    {loading ? <LoadingRows /> : scenes?.length ? <div className="scene-grid">{scenes.map((scene) => <article key={scene.id} className="scene-card"><div className="scene-top"><span className="scene-format">{scene.format}</span><StatusPill status={scene.reviewState} /></div><h3>{scene.title}</h3><p>{destinationName(scene.destinationId)} · {scene.packageVersion}</p><div className="label-list">{scene.compatibility.map((item: string) => <span key={item}>{item}</span>)}</div><a href={scene.sourceUri} target="_blank" rel="noreferrer" className="scene-link">Open reference <ArrowUpRight size={14} /></a></article>)}</div> : <EmptyState icon={Boxes} title="No scene packages registered" detail="Add an external USD or scene-package reference after registering its destination." />}
  </div>;
}

function PropagationPanel({ events, destinations, loading, showCreate, onRecord, isRecording }: { events: any[] | undefined; destinations: any[] | undefined; loading: boolean; showCreate: boolean; onRecord: (input: { event: any; health: any }) => void; isRecording: boolean }) {
  const [form, setForm] = useState({ destinationId: "", operation: "publish" as const, result: "queued" as const, severity: "info" as const, recoverable: "yes" as const, healthState: "unknown" as const, latencyMs: "", detail: "" });
  const canRecord = Boolean(destinations?.length);
  return <div className="panel-stack">
    {showCreate && <form onSubmit={(event) => { event.preventDefault(); const destinationId = Number(form.destinationId); onRecord({ event: { destinationId, operation: form.operation, result: form.result, severity: form.severity, recoverable: form.recoverable, detail: form.detail }, health: { destinationId, state: form.healthState, detail: form.detail, latencyMs: form.latencyMs ? Number(form.latencyMs) : undefined } }); }} className="create-panel"><PanelHeading title="Record propagation activity" description="Track publication, synchronization, health, and retry outcomes without storing external credentials." /><div className="form-grid"><Field label="Destination"><select required value={form.destinationId} disabled={!canRecord} onChange={(event) => setForm({ ...form, destinationId: event.target.value })}><option value="">Select a destination</option>{destinations?.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}</select></Field><Field label="Operation"><select value={form.operation} onChange={(event) => setForm({ ...form, operation: event.target.value as typeof form.operation })}><option value="publish">Publish</option><option value="synchronize">Synchronize</option><option value="health_check">Health check</option><option value="retry">Retry</option></select></Field><Field label="Result"><select value={form.result} onChange={(event) => setForm({ ...form, result: event.target.value as typeof form.result })}><option value="queued">Queued</option><option value="succeeded">Succeeded</option><option value="partial">Partial</option><option value="failed">Failed</option></select></Field><Field label="Severity"><select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value as typeof form.severity })}><option value="info">Info</option><option value="warning">Warning</option><option value="error">Error</option></select></Field><Field label="Integration health"><select value={form.healthState} onChange={(event) => setForm({ ...form, healthState: event.target.value as typeof form.healthState })}><option value="unknown">Unknown</option><option value="ready">Ready</option><option value="degraded">Degraded</option><option value="offline">Offline</option></select></Field><Field label="Observed latency (ms)"><Input type="number" min="0" max="600000" value={form.latencyMs} onChange={(event) => setForm({ ...form, latencyMs: event.target.value })} placeholder="Optional" /></Field><Field label="Recovery"><select value={form.recoverable} onChange={(event) => setForm({ ...form, recoverable: event.target.value as typeof form.recoverable })}><option value="yes">Recoverable</option><option value="no">Not recoverable</option></select></Field><Field label="Operational detail" wide><Textarea required minLength={8} value={form.detail} onChange={(event) => setForm({ ...form, detail: event.target.value })} placeholder="Record what happened and the recommended recovery path." /></Field></div><div className="form-action"><Button type="submit" className="create-button" disabled={!canRecord || isRecording}>{isRecording ? "Recording…" : "Record activity"}<ArrowUpRight size={16} /></Button>{!canRecord && <span className="text-sm text-amber-200">Register a destination before recording activity.</span>}</div></form>}
    <div className="section-heading"><div><span className="section-kicker">Operational history</span><h2>Propagation ledger</h2></div><p>Failures remain visible, classified, and recoverable where declared.</p></div>
    {loading ? <LoadingRows /> : events?.length ? <div className="event-list">{events.map((event) => <article key={event.id} className="event-row"><div className={cn("event-icon", event.severity === "error" ? "event-error" : event.severity === "warning" ? "event-warning" : "event-info")}>{event.severity === "error" ? <CircleAlert size={17} /> : event.result === "succeeded" ? <CheckCircle2 size={17} /> : <RefreshCw size={17} />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b className="capitalize">{event.operation.replace("_", " ")}</b><StatusPill status={event.result} /></div><p>{event.detail}</p></div><div className="event-meta"><span>{event.recoverable === "yes" ? "Recoverable" : "Manual review"}</span><small>{timestamp(event.occurredAt)}</small></div></article>)}</div> : <EmptyState icon={Waves} title="No activity recorded" detail="Record an operation after registering a destination to build an auditable propagation history." />}
  </div>;
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={cn("field", wide && "field-wide")}><Label>{label}</Label>{children}</label>; }
function PanelHeading({ title, description }: { title: string; description: string }) { return <div className="create-heading"><span className="feature-icon"><Plus size={18} /></span><div><h3>{title}</h3><p>{description}</p></div></div>; }
function EmptyState({ icon: Icon, title, detail }: { icon: typeof Compass; title: string; detail: string }) { return <div className="empty-state"><span className="empty-icon"><Icon size={24} /></span><h3>{title}</h3><p>{detail}</p></div>; }
function LoadingRows() { return <div className="loading-rows"><i /><i /><i /></div>; }
