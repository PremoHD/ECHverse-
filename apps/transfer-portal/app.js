const $ = (id) => document.getElementById(id);
const log = (message) => { $('log').textContent += `[${new Date().toISOString()}] ${message}\n`; };

function buildTransfer() {
  return {
    source: $('source').value.trim(),
    destination: $('destination').value.trim(),
    amount: Number($('amount').value || 0),
    currency: $('currency').value.trim().toUpperCase(),
    rail: $('rail').value,
    reference: $('reference').value.trim()
  };
}

function routeFor(t) {
  if (t.rail !== 'auto') return t.rail;
  if (/sftp/i.test(t.source + t.destination)) return 'SFTP';
  if (/wallet|0x|web3/i.test(t.source + t.destination)) return 'WEB3';
  return 'ACH/ISO20022';
}

function preview() {
  const t = buildTransfer();
  const route = routeFor(t);
  $('routeView').textContent = JSON.stringify({
    protocol: 'ECH336',
    action: 'TRANSFER_PREVIEW',
    actor: t.source || 'unknown',
    target: t.destination || 'unknown',
    route,
    state: 'PENDING_AUTHORIZATION',
    trace: crypto.randomUUID()
  }, null, 2);
  log(`Route selected: ${route}`);
}

$('route').addEventListener('click', preview);
$('submit').addEventListener('click', () => {
  const t = buildTransfer();
  if (!t.source || !t.destination || !t.amount) return log('Rejected: source, destination and positive amount are required.');
  const route = routeFor(t);
  log(`Gateway handoff queued: ${route} / ${t.currency} ${t.amount.toFixed(2)}`);
  $('routeView').textContent = JSON.stringify({ ...t, route, state: 'QUEUED_FOR_MCP_GATEWAY' }, null, 2);
});

$('status').textContent = `MCP: ${location.protocol === 'https:' ? 'READY' : 'LOCAL'}`;
log('ECH.ai transfer portal initialized.');
