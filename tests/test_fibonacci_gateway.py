import math
import unittest

from src.experimental.fibonacci_gateway import (
    GOLDEN_ANGLE,
    generate_lattice,
    fibonacci,
    route,
)


class FibonacciGatewayTests(unittest.TestCase):
    def test_fibonacci_sequence(self):
        self.assertEqual([fibonacci(i) for i in range(8)], [0, 1, 1, 2, 3, 5, 8, 13])

    def test_lattice_is_deterministic_and_tri_realm(self):
        first = generate_lattice(6)
        second = generate_lattice(6)
        self.assertEqual(first, second)
        self.assertEqual([point.realm for point in first], ["time", "space", "history", "time", "space", "history"])
        self.assertAlmostEqual(first[1].angle_radians, GOLDEN_ANGLE)

    def test_coordinates_follow_polar_definition(self):
        point = generate_lattice(3, radius_scale=2.0, phase=0.25)[2]
        self.assertAlmostEqual(point.x, point.radius * math.cos(point.angle_radians))
        self.assertAlmostEqual(point.y, point.radius * math.sin(point.angle_radians))

    def test_route_is_explicitly_dry_run(self):
        record = route(2, count=5)
        self.assertEqual(record["mode"], "dry-run")
        self.assertFalse(record["external_action"])
        self.assertEqual(record["point"]["realm"], "history")

    def test_invalid_inputs(self):
        with self.assertRaises(ValueError):
            fibonacci(-1)
        with self.assertRaises(ValueError):
            generate_lattice(-1)
        with self.assertRaises(ValueError):
            generate_lattice(2, radius_scale=0)
        with self.assertRaises(ValueError):
            route(3, count=3)


if __name__ == "__main__":
    unittest.main()
