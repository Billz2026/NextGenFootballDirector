# Month-one playtest — The Motor Trade

**Goal:** Test one complete 30-game-day career under the game's actual trading, repair, staffing and cash constraints. **Do not use a month with zero sales as evidence the commercial model is profitable.** Record failures, unrealistic outcomes and UI obstacles.

**Before starting:** From the current career select **SAVE & BACKUP → EXPORT CAREER**, and keep the JSON file away from browser storage. Starting a new career can replace the local career. Use a desktop browser at 100% zoom for the main trial; check a phone or unfolded tablet when possible. Use one tab for the career. The main game is https://billz2026.github.io/TheMotorTrade/.

## Day-one baseline to verify

| Live fact | Expected new-career value |
|---|---|
| Bank balance | £45,000 |
| Current team | Lewis Carter (sales), Sophie Reed (buyer), Chloe Baker (technician), Tom Fletcher (supervisor) |
| Nominal monthly base wages | £7,320 |
| Daily salary debits | £246 |
| Initial premises rent/utilities per game day | £25 |
| Daily running commitment before stock or extra hires | **£271** |
| Forecourt | Four spaces |
| Workshop | Four physical bays, **one available technician**, not four repair crews |
| Month-one sales objective | Four completed handovers **and positive operating contribution** |
| Initial reputation | 5/100 |
| Facilities | Upgrades reputation locked initially; first forecourt needs 20, first workshop needs 40 |

**Important:** Day 1 begins before the first daily wage/rent settlement. Continuing from Day 1 to Day 2 charges the staff and premises bill. There are 29 such charges through Day 30. With **no purchases, no new hires and no sales**, the Day 30 reference is £45,000 − 29 × £271 = **£37,141**. This is a *cash runway benchmark*, not a sales or profit forecast.

## Play one complete month

| Game days | Test actions | Record or verify |
|---|---|---|
| 1 | Hold the mandatory monthly management meeting; confirm all four employees and starting finances. Visit Buying Desk, Auction Hall, Stock, Workshop, Sales Office, Finances, Operations Diary, Reports and My Dealership. | Can navigate every department? Are responsibilities, cash and capacity clear? |
| 1–7 | Assess two realistic acquisition opportunities. Negotiate or bid based on estimated retail price, fees, faults and cash reserves. Buy at least one viable car if available. | Buying price, acquisition fee, cash paid, mileage, grade and what preparation still needs funding |
| 2–14 | Assess purchased stock, compare **in-house** versus **external** repair estimates, approve one sensible job, advance game days and finish QC. Advertise a prepared vehicle. | Real elapsed days, technician availability, one-time prep fees, inspection costs and listing state |
| 8–21 | Process enquiries, viewing appointments, test drives and offers through Sales Office. Follow up genuine customers. Try to complete a sale via valid handover, not by recording an offer as revenue. | Is enquiry demand realistic? No-show/cancellation outcomes? Deposit held separately? Actual gross contribution vs daily costs? |
| Any day | Compare named staff with applicants; if a vacancy and cash permit, hire a technician or train somebody. | Immediate £150 hiring fee, Day+1 employee start, increased daily salary; £275 training charge and training downtime |
| 15–29 | Revisit aged stock, prices, repair delays, payroll, rent, supplier reputation and remaining cash. Export the career halfway through; resume/reload it once. | Stock age, unsold capital, bad deals, fees, cash reconciliation and saved state after reload |
| 30 | Run the five Deal Day sessions at 09:00, 11:00, 13:00, 15:00 and 17:00. Attempt any sensible time-limited trades and close the month. | Sessions don't charge extra daily wages/rent or advance the game date; don't treat expired enquiries as persistent |
| 31 | Inspect the frozen Month 1 Management Report and attend the next required board meeting. Export the career again. | Monthly closing cash matches the report; sales volume, cost, arrears, stock and morale reconcile with your experience |

### Premises & Facilities specifically

The **My Dealership** sidebar entry opens **Premises & Facilities**. The page should show **occupied/total stock spaces**, **physical workshop bays versus active technicians**, **premises + wages/day**, repair reserves and any unpaid bills.

Forecourt expansion begins at **20 reputation**: 4 → 6 vehicle spaces, £1,800 investment, **£10 additional premises cost per game day** (original premises £25 → £35). Workshop expansion begins at **40 reputation**: 4 → 6 physical repair bays, £2,600 investment, **£14 additional premises cost per game day** (if no previous upgrades). These are independent illustrative game options: you may not unlock them during the first month.

Never approve an upgrade solely because the current bank balance covers the one-off fee. Its **minimum cash needed** must also cover protected workshop work, unpaid wages/rent, three days of salaries and seven days of the expanded premises cost. Upgrading adds **capacity**, not staff; a new repair bay doesn't automatically hire a technician. The game is expected to prevent blocked investments and charge a successful investment exactly once.

### Daily checkpoint log

Record a short note at the end of each game day (you can copy this row format into a spreadsheet or notebook):

| Day | Cash | Cars owned / listed | New enquiries / handovers | Staff / daily pay | Arrears | Problem or decision |
|---|---|---|---|---|---|---|
| 1 | £45,000 before transactions | 0 / 0 | 0 / 0 | 4 / £246 | £0 | Opening meeting + first decision |
| … | | | | | | |
| 30 | | | | | | End-of-month result |

**Track these separately:** sales revenue versus cash deposits; gross trading margin versus operating contribution; cash invested in unsold vehicles versus available bank funds; accrued premises expenses versus paid rent; permanent salaries versus temporary training and notice charges.

### What would fail the playtest?

**Critical/blocker:** A purchase, inspection, auction invoice, deposit, refund, payroll or premises fee is applied twice; saved cash fails its ledger reconciliation; a valid career won't reload; a required decision is bypassable; a paid and completed repair never advances; negative or invented cash appears; a mandatory action is inaccessible on screen.

**Economy/design:** Four monthly handovers cannot reasonably be achieved despite sensible stock, pricing and follow-up; plausible margins consistently fail to cover the £7,859 baseline month-one operating overhead; buyer demand is far too sparse or too easy; inventory sits unprepared without enough actions to unblock it; expansion/extra staffing is financially irrational even with earned reputation.

**Presentation:** Repeated wording, important action hidden below dense figures, incorrect available staff/bay counts, unreadable finance comparisons, horizontal page overflow, or unclear status/eligibility explanations.

### Established automated benchmarks

The CI release gate includes a deterministic 30-day **no-purchase/no-sale** wage-and-rent scenario: Day 30 cash **£37,141**, no payroll/rent arrears, £7,859 operating loss. A separate browser test uses two real seller acquisitions and a booked external workshop repair, with no sales; its Day 30 cash was **£30,871**, and its archived Month 1 operating contribution was **−£7,859**. These tests verify continuity, cash arithmetic and liquidity under inactivity. They **do not prove customer conversion, profitability, or a fair four-car sales target**; that is the main purpose of your manual month.

When reporting an issue, include the **game day, department, the action taken, expected result, actual result**, and a screenshot. Export the affected career file if you can share it safely.
