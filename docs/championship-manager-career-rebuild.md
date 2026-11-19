# The Motor Trade — Championship Manager-style Career Rebuild

**Decision document — 19 November 2026. Status: gameplay redesign proposal; not implemented.**

## Why the last two gameplay sprints did not solve engagement

The game has many valid local economic systems but little connective tissue across months and employers. A 14-day opening challenge and three-checkpoint Saturday event add activities, not the persistent social and competitive world that makes classic Championship Manager compelling.

Current code inspection:
- `manager-career.js` defines 50 employers and an entry-level application process but does not maintain 50 live employer economies.
- `people.js` gives employees skills, salary, reliability and performance; their continuing careers and ambitions across different employers are not modelled.
- `manager-career.js` month-end review changes confidence and reputation, but its own board message says that sackings and offers are future work.
- `manager-weekend.js` executes real retail activity and genuine approvals at three checkpoints, but the same actions could be isolated from a larger career.
- `dashboard-view.js` surfaces many operational metrics. Adding more KPIs will not create a compelling game.

This is a **simulation architecture issue**, not a colour, typography or pop-up problem.

## Product promise

You start as an inexperienced, employed dealership manager. The goal is not to own a building or accumulate arbitrary achievement points. You compete in a persistent fictional UK motor-trade economy, improve a genuine dealership, attract and develop staff, seek better employment and build a multi-employer career. Each operating month advances every simulated dealer, not just your own.

The game should deliver the classic management arc:

**Scout → recruit → set a strategy → trade against rivals → watch outcomes → analyse the market → negotiate changes → earn or lose trust → move up or down in the industry.**

A new manager should be capable of a career setback and an eventual comeback.

## 1. Living dealership world: the non-negotiable foundation

Seed the existing 50 named dealerships with independent, persistent but economically bounded state:
- Employer reputation tier, market specialization, region and management vacancy status.
- Bank cash, inventory at book cost, forecast obligations, actual purchases and disposals, owner priorities.
- Real named staff roster and delegated commercial policies.
- Bounded, deterministic daily customer demand and stock supply.
- Verified retail completion, gross margin, cash, staff moves and monthly reports.
- Explicit acquisition/sale audit trail, no leaderboard values invented directly.
- Competitors affect player opportunities: limited shared auction units, recruitment candidates, dealer-to-dealer stock offers and rival bids.

**Implementation:** begin with TEN fully functional regional competitors for a proof-of-fun vertical slice; validate the model and performance before scaling to all 50. Competitive standings compare like-for-like dealers by contribution, stock efficiency and customer quality, not total turnover alone. Larger dealers must not automatically win the beginner league.

The player's dealership continues to use the existing detailed trading engine. AI employers can use an audited lighter simulation, but their ledger, stock movement and staff contracts must reconcile. Do not award "rival profits" from a random scoreboard formula.

## 2. Staff are the football squad

A persistent identity for every employee across careers:
- Age, role, pay, contract length, experience, reputation, professional potential and salary demands.
- Attributes (1–20) for negotiations, buying judgment, diagnostics, reliability, customer care and operational judgment.
- Confidence, morale and relationship with current manager; traits such as ambitious, loyal, cautious, independent.
- Staff history: employers, real completed sales/repairs, monthly performance and promotions.
- Negotiated responsibility, training, annual pay progression, recruitments, resignations and competing offers.
- Reports from scout-like references, with imperfect information; an apparently talented hire can still disappoint.

Staff must produce actual differences inside the sales, buying and workshop engines. Avoid superficial +10% magic stat boosts. Personnel decisions change time, pay, role assignment and accountable outcomes.

**Primary emotional goal:** the player notices when an excellent salesperson is poached or a junior technician becomes their most reliable employee.

## 3. True career employment system

Make the manager's contract real:
- Employer role, salary and duration, board objectives and review cycle.
- Warning, probation confirmed/extended, dismissal and compensation where appropriate.
- Internal advancement, resignation and applications while employed.
- Vacancy generation based on real rival performance and dismissals.
- Reputational suitability, job interviews and offers at appropriate tiers.
- Personal career CV listing jobs, records, achievements and departures.

Board decisions must use transparent trailing results. One unlucky trading week must not trigger instant dismissal.

## 4. The stock market is the transfer window

Cars are bought for resale, so they are *not* long-term squad members; the staff are the squad. Vehicles create short-term commercial opportunity:
- Buyer shortlists with incomplete but credible technical information.
- Auction bidding where another simulated dealer genuinely competes for the same stock.
- Competitive private-seller negotiation, not endless independently generated opportunities.
- Vehicle classes with distinct realistic margins, holding times, repair risk and selling demand.
- Stock concentration decisions: high-margin slow sellers vs faster low-margin volume.
- Stock flows visibly between seller, rival, auction, player, workshop, showroom and eventual customer.

Make the source of a rival bid visible and credible. The player should remember **which rival outbid them**, and see what that business later did with the vehicle.

## 5. CM-style trading commentary and outcomes

Replace forced Saturday menu checkpoints with a focused text commentary engine. The week's key trading activity unfolds in a readable compact event feed:
- Named staff actions and customer encounters.
- Competitor buy/sell headlines that matter to the player's stock or recruitment.
- User interventions only for significant, consequential decisions.
- Actual sale, lost sale, repair, staff incident and purchase outcomes.
- Quick skip during uneventful hours or days; no invented action every 30 seconds.

A session is not a match merely because we put "09:00" and "15:00" on three buttons. It must contain uncertainty, opportunity, named people and consequences that carry into the next week.

## 6. A genuine manager HQ, not a dashboard of data

Home screen must answer in one glance:
- Where am I employed, which league/tier is my dealership in, and how safe is my job?
- How does my own team compare with rivals?
- Who is my best salesperson/buyer and who is underperforming?
- What are the next three important upcoming events?
- Which vehicles or employees do I have targets on?
- What is the most useful next management action?

Primary navigation like classic management software: **Home / Inbox / Dealerships / Staff / Scouting / Market / Trading / Competitions / Jobs / Manager CV**. Dense compact sortable tables and specific player/employer profiles beat giant decorative KPI tiles. Use the game's existing colours, but prioritize content and high-speed navigation.

## 7. Pacing must preserve "one more week"

- A single Continue action can fast-forward across uneventful days to the next real, meaningful event.
- Don't interrupt for routine payroll, each completed repair, or every new enquiry.
- Staff and supervisors perform their delegated work unless an exceptional authority is needed.
- The user never loses a live, irreversible offer by auto-advance; all such blockers must be explicit.
- A trading week takes 5–10 minutes initially, with different viable play styles.
- Every month generates a genuine rival performance update and board reaction.
- No random artificial "press here to claim reward" or mandatory three-stop ceremony if there are no customers or stock.

## 8. First playable proof-of-fun (ONE 6-week demo save)

Do **not** implement all 50 businesses or 100 personality traits immediately.

Start with a small regional trading competition:
- Player dealership + 9 independent rival businesses, all with live audited stock and cash.
- Four named employees at player company and 30–40 named employees across rivals.
- Twenty realistic common-market stock opportunities across the opening period.
- At least three competing recruitment candidates; one could be hired away.
- A board objective and weekly league standing.
- An actual job-market event generated by a rival poor-performance dismissal.
- Weekly trading summaries with genuine sales and cash/stock values.
- A recruit vs retain vs sell-vs-hold management choice that makes two consecutive playthroughs different.

**Playtest success criteria (measured, not claimed):**
1. In the first 5 minutes: player learns who rivals are and has a consequential personnel or trading choice.
2. In 15 minutes: at least two decisions produce measurable different outcomes within the SAME simulation.
3. Within four game weeks: at least one rival has materially changed their business, and it is observable.
4. By six game weeks: real board pressure and a meaningful next career objective.
5. Users choose "one more week" voluntarily, not because an interface forces more Continue clicks.
6. Fully reproducible tests for cash, inventory, contracts and transfers; no duplicate money on save/reload.
7. Fast progress on desktop and mobile, including a one-click skip to next genuine decision.

## 9. Implementation sequence

**Stage A — Engine, before UI:** Ten persistent AI companies; opening rosters, stock and cash; bounded daily purchase/sale models and financial audits. Keep existing careers loadable.

**Stage B — League & news:** Real ranking and opponent profiles; observed rival personnel moves and stock acquisitions. No made-up news from untracked events.

**Stage C — Staff career market:** Contract offers, scout reports, player and AI staff transfers, training and staff histories.

**Stage D — Manager stakes:** probation, dismissal, job openings, applications while employed, new employer appointments.

**Stage E — Tactical gameplay and interface:** Rapid event-led Continue, text trading commentary, focused Manager HQ and optional deep data tables. Reuse the existing player customer/sales/workshop processes.

**Stage F — Expand to 50:** scale the background economies and ensure reasonable browser performance and safe save migration.

Do not call the result a Championship Manager-like experience until the TEN-company demo passes the first 6-week fun test. More panels and scripted mini-events don't count.

## Scope and compatibility

- Do not destroy existing owner careers, manager careers, recruitment interviews, induction or Saturday saves.
- Add versioned save migration and a clean rollback path.
- Keep company money distinct from employed manager personal income.
- Avoid promises that football-style promotions/relegations map literally to business life. Leagues are performance cohorts; changes of employer and dealership reputation replace sporting promotion.
- Keep all dealer and employee names fictional unless appropriately licensed.
- Prioritize credible consequences over flashy imagery or artificial drama.

**Status on creation:** design only; no part of this new connected rival/staff/job-world system has been released yet.
