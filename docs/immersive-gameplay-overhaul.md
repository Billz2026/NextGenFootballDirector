# The Motor Trade — Immersive Gameplay Overhaul

**Status:** Proposed design and implementation plan; not yet implemented.  
**Prepared:** 19 November 2026  
**Product:** NextGen Sessions — The Motor Trade  
**Primary objective:** Replace the "keep pressing Continue" experience with a credible, consequential, repeatable motor-dealership management loop.

## Implementation status — Sprint 1 playable foundation (19 November 2026)

**Now implemented for newly accepted manager appointments:**
- Three inherited employer vehicles with book costs, non-cash opening-capital evidence, real catalogue specs, two advertised cars and one requiring the workshop/QC pipeline.
- One 48-day aged car whose age is carried into actual holding costs and market pricing, without illegal negative acquisition days.
- First-14-day Manager's Desk objective with real sales/profit/cash metrics and reprice-versus-hold management decisions.
- Daily navigation to Manager's Desk when no urgent exception takes priority.
- Board check-ins on game days 8 and 15, derived from actual transaction, stock and cash records.
- Validated, backward-compatible save data. All 20 new starter employer integration flows passed simulated creation, induction, repricing, hold, and save/reload.

**Explicitly NOT yet implemented:** dedicated Weekend Trading session with live checkpoints, persistent weekly tactics, expanded staff relationship model, full 90-day probation/dismissal and autonomous 50-company rival simulation. A 14-day goal does not by itself ensure long-term engagement. Do not confuse this foundational sprint with the complete design.

### Player test gate

Start a **new management career** (do not overwrite an old one without exporting it). Accept an offer, finish induction, return to Dashboard. Confirm 3 inherited cars, an active 48-day aged stock decision and 14-day challenge, run actual workshop and sales activity, and test both price-holding and repricing across separate test careers. Old saves remain unchanged and will not receive stock retroactively. Observe day-8 and day-15 factual board reviews. Send screenshots or report any save error.

## Sprint 2 status — Interactive Saturday Trading (19 November 2026)

**Playable source implementation added:** Saturday Manager's Desk briefing; three genuine 09:00/12:00/15:00 showroom checkpoints; temporary, reversible live sales-authority tactics; new arrivals and customer handling through the existing real trading engines; manager interventions for live staff approval requests; genuine sales/walkaway and gross/cash results; saved/resumable checkpoints; and compact previous-week recap. This is not a separate trading economy and no sales are guaranteed.

**Compatibility:** Unmodified owner and older manager saves remain valid. Managers need at least one actually advertised car for a Saturday session; without stock the calendar does not force meaningless extra clicks. The existing month-end Deal Day remains separate even when it falls on a Saturday. A new session cannot duplicate the previous session after refresh or acknowledgement.

**Tests:** Integration simulation passed 20/20 starter employers, including each checkpoint, sales/approval cases, saving and acknowledgement. A sample deterministic sweep of the 20 varied employers produced six sessions with completed retail sales and eleven with staff exceptions. These are test scenario outcomes, not target probabilities. Full visual browser/deployment QA is still outstanding.

**Next milestone:** Add genuine weekly operational objectives and relationship-based staff development. This sprint provides a substantially better session loop but is not the entire Football Manager-like metagame. See Sprint 4 below.

## 1. Product north star

The intended emotional loop is **one more trading week**, analogous to "one more match" in Football Manager. The player is a newly employed manager, not a business owner. They should be constantly aware of their company, staff, stock, cash, customer commitments, upcoming trading opportunities and job security.

Every substantial management choice must have:
1. **Information:** enough verifiable context to understand the trade-offs.
2. **Agency:** at least two defensible strategies, not a quiz with an obvious right answer.
3. **Cost:** measurable cash, margin, staff capacity, time, trust or board consequences.
4. **Response:** a visible change in real operating state soon after the choice.
5. **Persistence:** a decision and outcome that survive refresh, save/reload and employer transfer (when that exists).

**Not a feature:** large amounts of text, synthetic emergency messages, guaranteed sales, cosmetic personality meters, hundreds of unconnected scenarios, forced praise, or "press Continue" as the only meaningful action.

### Baseline verified in current repository

- The engine already supports live customer cases, staff-supervised sales, real vehicle stock and auction bidding.
- Current delegated sales policies affect staff discounts, margin floor and part-exchange authority.
- Current delegated operations policies affect purchase, repair and stock limits; a buyer scouts opportunities and the workshop completes routine tasks.
- `advanceDay()` runs staff payroll, premises, stock ageing, workshop, buying recommendations, customers, aftersales, month-end reports and management Inbox notifications.
- Monthly Deal Day has multiple sessions (09:00–17:00), and there is a calendar-based monthly management meeting.
- Current manager career has a hired/inducted profile, reputation, board confidence and genuine monthly reviews.
- The typical first managed employer currently starts with **no vehicle stock**, despite having four real paid employees.
- The 49 non-active dealerships are **not** autonomous competitor economies. Do not build fake league tables using invented profit data.

## 2. The three nested gameplay loops

| Horizon | Player experience | Core tension | Feedback |
|---|---|---|---|
| Every trading day | Critical alerts, customer cases, auction/reconditioning progress | What deserves intervention? | Short end-of-day brief with transaction-backed changes |
| Every trading week | Set one commercial plan, allocate staff authority, prepare for a focused weekend retail session | How do we convert limited stock, cash and people into deals? | Sales pipeline, profit/cash movement, missed opportunities and staff outcomes |
| Every operating month | Present results to the owner/board; address weaknesses and agree next priorities | Are results good enough to keep this job and move up? | Board confidence, manager reputation, probation and career history |

**Week loop:** Assess → Plan → Delegate → Watch events → Intervene → Review → Adjust.

Make the whole week 6–12 minutes of active gameplay as an initial tuning target, not a rigid timer. A low-activity day should fast-forward quickly. A complicated auction/retail day can last longer.

## 3. The first 14 days — "Turn Around the Lot" vertical slice

The first new-career appointment should present a functioning but imperfect employer, not a cash balance, four staff and an empty forecourt.

**Illustrative scenario:** Parkside Independent Motors, Manchester. Company cash £35,000; three existing vehicles, two monthly retail handovers expected, a real salaried team and 65/100 initial board confidence.

**Opening vehicles (example only, not guaranteed real market data):**
- A 48-day-old hatchback, overpriced relative to nearby comparable listings.
- A clean, sellable family car with an upcoming viewing and a narrow negotiation window.
- A newly acquired car awaiting a real repair assessment and final QC.

The player already has a legitimate first appointment and induction. The board asks for *one achievable 14-day improvement* (e.g., reduce aged inventory, deliver one profitable car, keep cash above a reserve), with meaningful but recoverable failure.

### Accounting constraint

An inherited car is **employer-owned opening inventory**, not a free new acquisition and not the manager's personal asset. The design must record an auditable book cost and opening-inventory reconciliation. It must not silently subtract an acquisition payment from cash for cars already held, duplicate purchase transactions or create false profits. Any opening inventory schema change must pass full save migration and financial reconciliation tests.

### Scenario outline

- **Days 1–2:** Induction; board sets a grounded objective; review actual opening stock, staff and a constrained cash budget. Make first decision.
- **Days 3–5:** Sales executive manages appointments, buyer presents plausible stock choices, workshop raises a QC or cost exception. The player intervenes only when authority or strategy warrants it.
- **Weekend Trading:** Play an interactive, live-update retail session with incoming customers and a staff plan. Same customer and financial engine as normal days; no fabricated transactions.
- **Days 8–12:** Show the actual effect of pricing, buying, workshop and coaching decisions, including possible missed sales.
- **Day 14:** A short owner check-in on verified results; the next two weeks become dynamically generated from the actual business state, not another identical script.

**No forced happy endings:** A good decision can still fail because of market demand, imperfect staff or a customer's preference. Bad choices should expose downside risk, but one bad week should not end a career unfairly.

## 4. The central playable screen: Manager's Desk

Replace the information-heavy default experience with a *working command desk*, not an additional large menu.

Above-the-fold priorities:
1. **Today:** game date, role, employer, upcoming session and a clear "what is happening" status.
2. **One current objective:** "Sell at least one of the three cars by Sunday without falling below the reserve."
3. **Live operational pipeline:** Cars: sourcing → acquired → preparation/QC → advertised → enquiry → viewing → offer → handover. Display only real vehicles and live case states.
4. **Up to three actionable management items:** urgent live offer; repair exception; strategic pricing decision. Urgent items must link directly to the real action.
5. **Four business health signals:** available cash vs commitments, ready-for-sale stock, live customer pipeline, current board confidence.
6. **Next meaningful step:** "Prepare trading session", "Review live offer", "Advance to next decision" or "Review results"; not a generic Continue label in every state.

All extended finance reports, stock audit trails, employment records and historical notes stay accessible in their specialist sections but do not dominate the daily view.

### Attention system

- **Mandatory interruption:** live irreversible/expiring commitment (e.g. auction bid requiring payment), consumer safety/compliance issue or a truly critical exception.
- **Recommended decision:** buyer's top opportunity, repricing, staff coaching, discretionary repair; may be ignored or snoozed.
- **Routine notification:** delegated work completed, premises charged, minor enquiry outcome; digest only.
- **Quiet day:** fast-forward to next trading event, with an auditable summary.

A notification without a possible managerial response must **not** block time. No more than one forced decision at once.

## 5. Weekly plan — the equivalent of football tactics

Once each trading week, set a business approach using real engine parameters:

| Approach | Benefits | Costs/risk | Integration |
|---|---|---|---|
| Protect cash & margins | Higher gross floor, smaller acquisition exposure, safer reserves | Fewer deals, stock may age | Existing sales delegation and operations authority ceilings |
| Balanced trade | Moderate price authority, controlled repairs, generalist buying | Neither fastest nor highest-margin | Existing balanced policies |
| Push stock turnover | Faster negotiation, broader sales discretion, prioritise sell-through | Lower average gross, part-ex and cash risk | Existing growth sales policy + current stock pricing |
| Customer-first service | Better follow-up/QC outcomes if staff can deliver | More staff time and possible near-term expense | Requires a *new, causally linked* service-quality model before being selectable |

**Important:** Existing induction policies already implement part of this. The weekly plan must apply *real changes* and respect managerial authority. Do not add a separate "team tactics" slider that merely increases sales by an arbitrary percentage.

Allow limited midweek changes, with operational costs or a change budget so switching tactics every click is not optimal.

## 6. Interactive Trading Session — the match-day equivalent

Use **Weekend Trading** as a flagship weekly session, leveraging the current showroom/appointment engine. Preserve the current month-end Deal Day as a special higher-activity event rather than duplicating it.

Before the session:
- Display ready stock, actual appointments, expected footfall band, available sales staff and repair/delivery holds.
- Pick a staff focus: maximise handovers, protect deal margin or follow up unsold leads.
- Review no more than three top risks and opportunities.

During the session:
- Advance through a few **meaningful checkpoints**, not dozens of empty clicks: opening, peak customer period, closing.
- Show real customer statuses and salesperson activities on a concise live timeline; no pretend handovers.
- Auto-handle ordinary viewings, objection handling and routine discounts.
- Pause only when manager intervention affects outcome: price exception, conflicting booking, trade-in risk, urgent workshop exception, or real buyer negotiation.
- Show expected uncertainty rather than exact hidden customer acceptance thresholds.

After the session:
- Show **real** units sold, gross margin and cash movement, successful/failed viewings, stock ageing, missed opportunities and exactly which decisions mattered.
- Offer one rational follow-up for the coming week.

A dry Saturday is possible. We need an interesting commercial review even when nobody buys; never manufacture a guaranteed sale.

## 7. Real management decisions and consequences

Decisions are **generated from existing state**, not randomly displayed as disconnected stories.

| Trigger | Management options | What changes | What the player later sees |
|---|---|---|---|
| Vehicle unsold 30+ days | Reprice, hold, improve advert, seek trade disposal | Asking price; marketing cost (if modelled); stock/day risk; disposal route | Enquiry changes, margin and stock-carrying cost |
| Customer offers below staff limit | Accept, counter, reject | Real customer case, deal economics, authority audit | Handover / customer walking away; gross and commission |
| Workshop diagnosis exceeds cap | Approve, defer, dispose after valuation | Real vehicle prep stage, repair cost, time and safety status | Readiness date and revised net margin |
| Buyer finds risky auction stock | Set bid ceiling, walk away, seek inspection | Actual auction ceiling, fees, risk and cash | Winning, losing, or overpaying, never a scripted award |
| Sales employee underperforming | Coach, redistribute leads, monitor | Staff time/capacity, lead routing and skill development *only after model exists* | Conversion and morale trends |
| Cash tight ahead of payroll | Freeze buying, dispose of stock, negotiate obligations where legal | Actual spending authority and stock/cash positions | Solvency, ageing and board reaction |

Every choice needs a **typed action**, validations, permanent event ID, cost accounting, staff response and outcome trail. Show why it mattered, not just "+5 confidence".

Staff personality should add *predicted preferences* and follow-through, not unexplained random buffs.

## 8. Staff should feel like a squad

Each existing employee becomes a named character whose actions are visible but still automated:

- Skills: buying judgement, negotiation, customer care, technical accuracy, organisation.
- Professional attributes: reliability, autonomy, confidence under pressure, adaptability.
- Relationships: morale, trust in manager, performance expectations and conflict history.
- Growth: occasional coaching and additional responsibility, with capacity/time costs.
- Consequences: a well-run team becomes more reliable; poor supervision can produce errors, frustration and departures.

**Build only after** stable sales/customer/stock simulation and accurate performance measurement. Never let morale instantly override vehicle condition, legal requirements or transaction outcomes.

## 9. Board pressure and manager career stakes

Give the board a small number of transparent expectations each month, not a giant scoreboard:

- Trading target: real completed sales and operating contribution.
- Capital discipline: cash reserve, arrears and aged stock.
- Customer quality: verified complaints, QC/compliance and successful lawful handovers.

A weekly owner message can acknowledge progress or flag one developing issue. Monthly reviews must use genuine reports and a **rolling performance window**, never punish one unlucky day.

Future probation: day 30 informal assessment → day 60 warning or acknowledgement → day 90 confirm/extend/end employment with clear reasons. Do **not** claim this is already implemented. Future career mobility and autonomous competing employers follow later.

A manager's **career reputation** and employment prospects must remain separate from company customer trust and company cash.

## 10. Architecture and integration

**Reuse before creating:**
- `MotorTradeDelegation` for customer handling and sales authority.
- `MotorTradeOperations` for buying/repairs/QC delegations.
- `MotorTradeEvents` for calendar sessions and month-end meeting.
- `MotorTradeMonthly` for actual performance.
- `MotorTradeManagerCareer` for employer-specific career standing and board reviews.
- Existing `MotorTradeEngine` vehicle/customer/stock/cash methods.

**Proposed thin additions:**
- `manager-agenda.js` — derive priority matters and weekly objective from real data; never fabricate a pending task.
- `trading-session.js` — a presentation/orchestration state for key checkpoints using *existing* customer and financial methods.
- `manager-decision-log.js` — idempotent durable decision/outcome references for reliable follow-up and save/reload.
- `opening-business.js` — opening inventory and employer-specific initial position with proper financial balancing.

All new saved fields need defaults/migration and validation. Avoid a second parallel simulation. No rewards from merely reloading a screen. All irreversible actions must be idempotent.

## 11. Delivery sequence with objective acceptance gates

### Sprint 0: Instrument current play (no redesign)

- Record number of Continue clicks, actual decisions, completed sales, days with no action, and elapsed gameplay time (local, no user analytics upload required).
- Build several 14-day deterministic seed fixtures; record performance and simulate failures.
- Preserve exportable old careers and owner mode.

**Exit:** There is a reproducible baseline demonstrating where the existing loop stalls.

### Sprint 1: Working 14-day appointment

- Opening employer with 2–4 real, book-valued vehicles, existing paid employees, genuine risks and one board objective.
- One visible "today's priority" per day. Repair, sale or stock action derives from actual stock.
- One-page management desk with pipeline and no fake "urgent" alerts.

**Exit:** At least three genuine consequential choices within the first 10 minutes and a visible 14-day progress story.

### Sprint 2: Gameplay director & decisions

- Classify mandatory vs optional vs routine matters.
- Manager choice flows for ageing stock, sales-floor exceptions, workshop authorisations and buying limits.
- Persistent causal feedback in the Inbox/history; safe fast-forward for quiet days.

**Exit:** Save/reload at every decision state without duplicating costs, customer cases or rewards.

### Sprint 3: Weekend Trading

- Session briefing, staff plan, live timeline, intervention prompts and results.
- Preserve monthly Deal Day; maintain existing real retail sales engine.
- Tune for varied successful, neutral and unsuccessful trading sessions.

**Exit:** A complete trading weekend produces coherent, auditable cash/stock/customer outcomes under multiple seeded test runs.

### Sprint 4: Staff & board personality

- Real individual staff contributions, limited coaching and relationship effects.
- Transparent weekly owner response and the rolling 90-day probation test.
- No invented employee skill bonus without a link to real staff/customer/workshop performance.

**Exit:** Different tactical choices and staffing profiles change longer-term outcomes, and setbacks can be recovered from.

### Sprint 5: Career world expansion

- Only after the first 14–90 days are consistently engaging: persistent AI employers, vacancies, poaching, contract negotiation, resignation and transfers.
- Design the future competitor dashboard from actual simulated rival economics, not arbitrary scores.

## 12. Playtest scoring — measurable goals, not promises

Suggested initial targets to tune:
- First genuine consequential managerial decision within **2 minutes** after induction.
- At least **3 decisions with traceable consequences** in a 10-minute test.
- No more than **2 consecutive empty Continue actions** in normal flow; use fast-forward instead.
- Clear objective and visible progress within every **7 game days**.
- At least **two materially different viable strategies** for each featured situation.
- One 14-day test should tell a coherent story even if no vehicle sells.
- Across 100 deterministic trial careers, check softlocks, cash conservation, outcome diversity, customer safety and excessive failure streaks.
- Test desktop and narrow/mobile viewports; the important decisions must remain accessible at 100% browser zoom.

**Never artificially boost success rates solely to hit engagement targets.** Adjust supply/demand, market conditions and event frequency transparently. Always distinguish real transaction results from purely narrative achievements.

## 13. Immediate build decision

**Begin with Sprint 1 — the playable first 14 days, real opening inventory and one management desk.**

Do not add staff morale, 50-company AI competition, salary systems or more interview questions yet. Those are expansion systems. The core challenge must already be satisfying before we scale it.

> **Acceptance question:** After completing a trading week, does the player understand which decisions mattered and want to see the result of their next strategy? If not, the gameplay loop is not ready.
