---
paths:
  - "tests/**"
  - "docs/contributing/tests/**"
---

# Local test stacks

- **Pass `--no-race` to every local stack bring-up**, integration and e2e: `test_setup`, `--rebuild`, and suite runs that create their own SigNoz. `make py-test-setup` does not pass it; run its pytest command from `tests/` with the flag added. CI keeps the race detector.
