# Development collision optimization

The tested spatial lookup is now enabled in `movement.html` through `princess-key.js`. It reduces rapid-fire synergy collision candidates while preserving original narrowphase checks, candidate order, graphics, and effects.

The isolated `movement-optimized.html` page and copied modules remain available for further experiments. Both pages currently use the same optimization. Returning to the original page no longer disables this promoted optimization.

Run `node Development/tests/optimized-projectiles.test.cjs` to verify conservative coverage, candidate order, and existing synergy gameplay assertions. The seeded benchmark checks 1,000 sweeps against 400 enemies. Candidate reduction is not an FPS measurement.
