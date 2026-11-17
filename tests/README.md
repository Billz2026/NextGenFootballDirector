# Test suite maintenance (November 2026)

The Motor Trade runs the **current gameplay rules**, not an old calendar or an obsolete one-click retail shortcut.

## Active site gate

The central GitHub Actions workflow **The Motor Trade site checks** executes:

- `tests/site.test.mjs`: real production module boot, script/style paths, four-person opening staff, accounting integrity, full workshop QC, seven days of wages, actual November 2026 close on game day 22, migration and tamper resistance, read-only reporting, deterministic market behaviour.
- `tests/career-storage.test.mjs` and `tests/cloud-careers.test.mjs`: local and account career recovery.
- `tests/showroom-traffic.test.mjs`, `tests/customer-behaviour.test.mjs`: genuine showroom queues, bookings, deposits and handovers.
- `tests/staff-workshop-impact.test.mjs`, `tests/staff-performance.test.mjs`: workshop work and employee impact.
- `tests/aftersales.test.mjs`, `tests/stock-ageing.test.mjs`, `tests/cashflow-forecast.test.mjs`: financial consequences, month reporting, arrears and preservation of old saves.

Run it locally with:

```bash
node --test tests/site.test.mjs tests/career-storage.test.mjs tests/cloud-careers.test.mjs tests/showroom-traffic.test.mjs tests/customer-behaviour.test.mjs tests/staff-workshop-impact.test.mjs tests/staff-performance.test.mjs tests/aftersales.test.mjs tests/stock-ageing.test.mjs tests/cashflow-forecast.test.mjs
```

Real Chromium layout workflows separately check the Sales Office, Auction Hall, Management Reports, Premises, Deal Day, workshop, stock, staff and finances at specified desktop/phone/Fold viewport sizes.

## Historical reference

`tests/historical-site-regression.mjs` preserves the original 274-test full-site monolith as it existed before this maintenance PR. It remains available for researching previously tested concepts, but **must not be treated as a passing compatibility suite**. Its 127 failures were rooted largely in assumptions that were superseded by the actual game: historical script versions, the former first-month length, paid forecourt expansion, instant vehicle preparation, and fake retail handover adapters.

Those stale tests were **not** relabelled as successes or silently disabled individually. The current active site gate uses production business rules and the domain regressions above. When recovering a useful historical assertion, migrate it into an appropriate active test with genuine setup, rather than restoring the old mock engine.

## Principles

1. Financial assertions reconcile real ledger and state; no cash or sale is invented by a test shortcut.
2. Month-end follows the game calendar (9–30 November 2026 is days 1–22).
3. Snapshot and layout checks test actual UI structure and user actions, not outdated labels or cache versions.
4. A passing test means a real invariant was exercised. Do not turn tests into no-ops to obtain green status.
