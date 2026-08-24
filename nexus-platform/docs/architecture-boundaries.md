# ECHverse Nexus Architecture Boundaries

## Purpose

ECHverse Nexus is designed as a persistent coordination layer for member-managed spatial spaces, portable scene references, and observable publication activity. It is not a payment processor. The application may provide **financial-service discovery** as contextual information, but it does not accept, store, transmit, or orchestrate live payment credentials, payment tokens, bank data, settlement instructions, or payment execution.

## Interoperability posture

The scene registry treats a USD reference as portable metadata rather than a call to a specific vendor runtime. Each registered scene package carries a URI, declared format, package version, content hash when supplied, capability hints, and review status. This aligns with OpenUSD’s role as an extensible scene-description and composition system, including reference and payload composition mechanisms.[1]

Browser-facing immersive entry points remain optional and capability-led. An external destination can publish a browser URL and declare support for desktop, mobile, and immersive sessions. This preserves a standards-oriented path for WebXR-capable devices without claiming compatibility with every device or external engine; WebXR exposes interfaces for immersive applications across hardware form factors.[2]

## Durable records

| Record | Durable fields | Purpose |
| --- | --- | --- |
| Spatial hub | Name, handle, description, visibility, capacity, state, owner, timestamps | Creates a persistent collaborative destination within ECHverse Nexus. |
| Presence record | Member, hub, presence state, last activity time | Records join, active, and leave state without using transient client-only data as the source of truth. |
| External destination | Name, type, launch URL, compatibility profile, health, endpoint state | Registers a portable destination without embedded credentials or direct vendor API coupling. |
| Scene package | Title, source URI, format, compatibility labels, review state, destination relation | Associates a declared scene asset with a registered destination. |
| Propagation event | Operation, destination, result, severity, retryability, detail, timestamp | Supplies an auditable, recoverable history of publication and synchronization attempts. |
| Integration health | Destination, state, checked time, public diagnostics | Reports connection readiness without exposing secrets. |

## Server-side safety boundary

All mutations are authenticated and associate records with the authenticated member. The server validates URL, type, and enum inputs; it stores metadata only. Future external synchronization must be placed behind server-side adapters that read integration secrets only from environment configuration. User interfaces must never request or display credentials, wallet keys, payment tokens, account numbers, or live financial instructions.

## References

[1] [OpenUSD — Introduction to USD](https://openusd.org/release/intro.html)

[2] [W3C — WebXR Device API](https://www.w3.org/TR/webxr/)
