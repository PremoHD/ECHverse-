# Fibonacci Gateway Research Module

## Purpose

This document turns the attached project brief into a small, reproducible
software experiment: generate a planar Fibonacci spiral, expose its geometric
coordinates, and assign a deterministic **tri-realm** label (`time`, `space`,
`history`) for visualization or simulation.

The module is deliberately separate from ECHverse payment, ledger, identity,
and deployment services. It is a research/creative-computing artifact, not a
financial gateway and not a claim about a physical or spiritual gateway.

## Implemented model

- Fibonacci sequence: `F(0)=0`, `F(1)=1`.
- Golden-angle spacing: `2π(1 - 1/φ)` radians, where `φ` is the golden ratio.
- Area-balanced radius: `r = scale × √(index + 1)`.
- Cartesian projection: `x = r cos(θ)`, `y = r sin(θ)`.
- Tri-realm label: `index mod 3`, mapped to `time`, `space`, `history`.
- Dry-run routing: returns a serializable record and performs no network or
  ledger operation.

## Scientific boundary

The Fibonacci sequence, golden-angle spiral, and coordinate transforms are
well-defined mathematical constructions. The labels and names in the brief
(`many worlds`, `quantum substrates`, `spiritual enlightenment`, `hyper-sonic
time vacuum`, and related language) are treated here as **creative metadata**,
not as validated physics, medical claims, religious claims, or operational
infrastructure.

Any future physics work should define a falsifiable hypothesis, cite primary
literature, specify units and measurement procedures, and keep experimental
results separate from financial or identity systems.

## Usage

From the repository root:

```bash
python3 -m src.experimental.fibonacci_gateway 12
python3 -m unittest discover -s tests -v
```

The module can also be imported by a visualization or notebook without
introducing a runtime dependency into the existing payment stack.

## Follow-up options

1. Add a static SVG/HTML visualization under `web/experimental/`.
2. Add a notebook that compares radial distributions and angular spacing.
3. If this becomes a real research project, add citations and a peer-reviewable
   experiment specification before using stronger scientific terminology.
