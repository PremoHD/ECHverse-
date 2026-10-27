"""Deterministic Fibonacci-lattice routing primitives for ECHverse experiments.

This module is a mathematical visualization and routing toy model. It does not
claim to model quantum mechanics, consciousness, spirituality, or physical
substrates, and it is intentionally independent of payment and ledger code.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from math import cos, pi, sin, sqrt
from typing import Any

GOLDEN_RATIO = (1 + sqrt(5)) / 2
GOLDEN_ANGLE = 2 * pi * (1 - 1 / GOLDEN_RATIO)
REALMS = ("time", "space", "history")


@dataclass(frozen=True)
class LatticePoint:
    """One point in a planar Fibonacci spiral and its deterministic realm."""

    index: int
    fibonacci: int
    radius: float
    angle_radians: float
    x: float
    y: float
    realm: str

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def fibonacci(n: int) -> int:
    """Return the n-th Fibonacci number using the conventional F(0)=0, F(1)=1."""
    if not isinstance(n, int) or isinstance(n, bool) or n < 0:
        raise ValueError("n must be a non-negative integer")
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a


def realm_for(index: int) -> str:
    """Assign a stable tri-realm label by index; this is a modeling convention."""
    if not isinstance(index, int) or isinstance(index, bool) or index < 0:
        raise ValueError("index must be a non-negative integer")
    return REALMS[index % len(REALMS)]


def generate_lattice(count: int, *, radius_scale: float = 1.0, phase: float = 0.0) -> list[LatticePoint]:
    """Generate ``count`` points with golden-angle spacing.

    The radius uses ``sqrt(index + 1)`` so points spread evenly by area. The
    optional phase is in radians and only rotates the output; it does not alter
    routing semantics.
    """
    if not isinstance(count, int) or isinstance(count, bool) or count < 0:
        raise ValueError("count must be a non-negative integer")
    if radius_scale <= 0:
        raise ValueError("radius_scale must be positive")

    points: list[LatticePoint] = []
    for index in range(count):
        fib = fibonacci(index)
        radius = radius_scale * sqrt(index + 1)
        angle = phase + index * GOLDEN_ANGLE
        points.append(
            LatticePoint(
                index=index,
                fibonacci=fib,
                radius=radius,
                angle_radians=angle,
                x=radius * cos(angle),
                y=radius * sin(angle),
                realm=realm_for(index),
            )
        )
    return points


def route(index: int, *, count: int = 1) -> dict[str, Any]:
    """Return a dry-run route record for one lattice index.

    ``count`` controls the generated context and must include ``index``. No
    network, wallet, ledger, or external gateway action is performed.
    """
    if index < 0 or index >= count:
        raise ValueError("index must be within the generated lattice count")
    point = generate_lattice(count)[index]
    return {"mode": "dry-run", "point": point.as_dict(), "external_action": False}


if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Print a Fibonacci lattice dry-run")
    parser.add_argument("count", type=int, nargs="?", default=12)
    args = parser.parse_args()
    print(json.dumps([p.as_dict() for p in generate_lattice(args.count)], indent=2))
