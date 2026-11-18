# The Motor Trade — Manager Career Design Plan

**Status:** Implementation roadmap, not a claim that all systems are playable.
**Game start:** Monday 9 November 2026.
**Core premise:** The player is a salaried motor-trade manager hired to run someone else's dealership. The business owns its cars, staff, premises and cash. The player owns only their personal CV, reputation, career history and eventually their wages/savings.

## 1. Manager creation — foundation delivered

A newly generated career asks for:

| Field | Rules |
|---|---|
| Manager name | 2–36 characters |
| Date of birth | Real calendar date; 21–65 years old at game start |
| Age | Always derived from DOB and the **in-game** date; automatically increases on birthdays |
| Home town | 2–40 characters |
| Prior motor-trade role | Sales Assistant, Junior Sales Executive, Buying Assistant, Service Administrator, or Vehicle Preparation Assistant |
| Industry experience | 1–3 years; no previous management appointment |
| Relevant education | GCSE/equivalent, Level 2 sales, Level 2 vehicle, or Level 3 business administration |

**Conservative example:** Alex Morgan, 25, from Birmingham; Sales Assistant for 2 years; GCSEs; no management roles; manager reputation 5/100. A small independent offering an acting manager trial is credible; appointment to a multi-site national group is not.

The manager's original CV choices are stored in the career and shown in a dedicated Manager Profile page. For saves made before CV capture existed, the historical fields remain unrecorded instead of inventing someone's age and home town.

**Do not fabricate:** degrees, directorships, previous dealership manager jobs, awards, vehicle sales or employer references.

**Realism boundary:** The first appointment is described as a 90-game-day probationary trial. The game displays that progress, but **confirmation, contract enforcement and dismissals are not yet implemented**.

## 2. Career world — 50 companies

- 20 entry-level independents, starting manager reputation requirement 0;
- 12 established local dealers, requirement 25;
- 10 regional groups, requirement 50;
- 6 prestige motor groups, requirement 75;
- 2 elite luxury dealerships, requirement 90.

All 50 dealerships appear in the employment catalogue, including locked firms. Search by employer, city, stock focus, and tier. At least one starter employer is located in London. Their cities, brand names, price ranges, stock focus and board expectations must differ; the initially playable employer must feed the existing **real trading engine** rather than cosmetic values.

**Current limitation:** Other companies are catalogue records, not independently simulated rival businesses. Reputation requirements are gates for *first availability*, not guaranteed future offers.

## 3. Gameplay loop

1. Create a conservative candidate CV.
2. View actual eligible vacancies; initially small independents are prepared to take an inexperienced candidate on probation.
3. Receive an appointment with a defined company budget and sales/operating objectives.
4. Supervise delegated sales staff, vehicle buying, repair workshop, QC, advertising and customer service. Exercise management authority when decisions exceed staff limits.
5. Review genuine daily operating reports, actual monthly cash flow, completed retail sales, wages, employer trust and cash reserves.
6. Receive monthly board reviews, which adjust **manager reputation** and **board confidence** without overwriting **customer/dealership trust**.
7. Later, qualify for interviews, negotiate employment offers, change employers, resign or be dismissed without taking any old employer assets.
8. Work toward elite appointments based on verified multi-year achievements, not merely elapsed days.

## 4. Next system to build: genuine employment

### Phase 2A — Application and interview system

- New careers should ultimately begin **unemployed**, with a set of actual posted first-job vacancies. Starting appointments will no longer be instant.
- Eligibility screening should consider manager reputation, CV, role experience and preferred location; allow application to stretch roles with low probability rather than a magical hard lock.
- Application states: submitted → shortlist/reject → interview → offer/reject → accepted or declined. No fake job offers or forced outcomes.
- An interview should ask several relevant trade questions (cash flow, staff management, customer trust, margin, ageing stock).
- Appointment should state role, expected monthly sales, authority limit, salary (once actual pay accounting exists), probation and contract expectations.
- AI boards should follow deterministic auditable selection logic; rejected applications do not create money, prestige or phantom experience.

### Phase 2B — Probation and board accountability

- First 90 days assessed on target sales, *operating contribution*, stock ageing, payroll/premises arrears and customer complaints.
- Define company-specific board tolerance: small independents may prioritise cash survival; high-reputation firms prioritise quality and results.
- Genuine probation outcome: confirm, extend for documented reason, or dismiss with traceable board decision. No instant dismissal from a single unlucky bid.
- If dismissed, transfer control to the **unemployed manager** state and keep the old dealership alive in the world.
- Manager reputation and career statistics cannot be edited by changing the employer name or tampering with UI.
- Board standards should be tested over 30, 90 and 365 game-day scenarios for difficulty and fairness.

## 5. World simulation and mobility

### Phase 3 — Persistent rival dealerships

- Simulate each non-player employer at a simplified aggregate daily/weekly or monthly level: inventory units, procurement, realistic costs, retail turnover, stock ageing, staff, cash, credit/arrears and results.
- Performance must come from market conditions and genuine modeled costs. Avoid instantly generating arbitrary profit, permanent growth or fake sales to serve an offer animation.
- Each dealership has a stable identity. When the player leaves, stock, cash, premises, employees, unpaid bills and past trading reports **stay** with that dealership.
- When moving to a new company, load that company's independent state; do not overwrite its ledger with the previous company's save.
- Create occasional vacancies due to manager departures, retirements, poor results and expansion. Show published jobs and allow realistic speculative applications.

### Phase 4 — Contracts, resignation, poaching and unemployment

- AI boards may contact high-performing managers with interviews or contract terms based on career standing, regional fit and actual vacancies.
- Player can resign, refuse offers, renew a contract, or negotiate better terms.
- Notice periods, contract expiry and performance dismissal affect realistic future hiring.
- A manager's **personal money and wages** must be on a separate ledger from the dealership's company cash. Never pay personal salaries before this model exists.
- Unemployment has a job-search calendar and offers from appropriate reputation tiers. It cannot strand the player permanently without actionable jobs.
- A financially struggling company is allowed to make a compelling but risky offer; prestige is not the only promotion variable.

## 6. Data model and migration (critical)

Current save has a single trading-company state plus optional `managerCareer`. That is sufficient for a first appointment but **not** for transferring between independent employers. Before adding resignation and poaching:

- Introduce `careerWorld` containing 50 persistent dealership identities, their financial states, AI operations, vacancies and contracts.
- Introduce player `managerRecord` with immutable original CV, DOB, reputation and verified milestones; store board warnings, employment terms, salary, trophies and managerial history as recorded events.
- Keep `activeEmployerId` referencing the one actively controlled dealership.
- Bridge the selected employer to the existing workshop/stock/customer/finance modules without duplicating balances, stock, payroll expenses, vehicles or reports.
- Preserve old owner careers through migration or retain an explicit owner-mode save flag. Never convert an existing successful owner's cash into personal funds.
- Do not let a salaried manager access owner-only group acquisitions, asset transfers, equity issuance or company ownership features.
- Add anti-corruption tests for manager transfer mid-month, completed auction invoice, pending repair, deposits, salary payments and bankruptcy.

## 7. UI targets

**New Career:** one premium editor for personal identity and conservative CV plus a searchable 50-employer list. Show a credible career-at-start rating and the explicit no-management-experience status.

**Manager Profile:** DOB, age, hometown, qualifications, former position, experience, employment timeline, board confidence, personal reputation and historical performance. Later add contract, wage, board warnings, promotions and resignation option.

**Manager Inbox:** board reviews, interviews, job offers, contract questions and managerial exceptions. Do not mix routine completed technician tasks with mandatory personal decisions.

**Job Centre (future):** vacancies, shortlist odds, applications and interview notices. Retain team and company performance context.

**Performance and difficulty:** no forced promotion, no automatically successful negotiation, no unstoppable profit, no fabricated rep from reloading or repeatedly visiting the same screen.

## 8. Release gates

1. **CV foundation (current):** 50 listings, manager DOB/age and CV, first employer selection, save/reload, accurate company cash, first board review, old saves untouched; owner-only expansion blocked.
2. **Employment phase:** applications, interviews, probation result, dismissal, unemployment, persisted contract state. Test complete 90-day career.
3. **World phase:** each of 50 companies actually advances in the background, logs accounting, and keeps its own state; 180-day save/reload stress test.
4. **Mobility phase:** resign, offers, negotiations, jobs and persistent transfers. Pass two-job-change scenario with no money/vehicle/employee duplication.
5. **Polish phase:** economy tuning, board personalities, annual awards, dynamic competing dealerships, accessibility, mobile and large-screen testing.

**Rule for every release:** an implemented feature must change real data or display accurate information from stored data, pass a reload test, and never silently credit or debit company cash to fabricate realism.
