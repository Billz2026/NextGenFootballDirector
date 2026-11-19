'use strict';
/* Independent, editorially authored UK used-car management interview questions.
   Every new question has four plausible managerial choices; the scoring index
   is hidden from the UI, and display order rotates by vacancy/attempt. */
(() => {
 const QUESTIONS=Object.freeze([
  {
    "id": "N001",
    "level": 1,
    "category": "liquidity",
    "text": "Your first stock purchase would leave only eight days of wages and rent covered. What do you propose?",
    "choices": [
      "Proceed if the margin forecast is strong",
      "Delay and request a smaller lot or revised cash plan",
      "Buy now and ask the owner for emergency funding later",
      "Retain a documented operating reserve before committing to stock"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N002",
    "level": 1,
    "category": "liquidity",
    "text": "A supplier offers a £300 discount for paying before delivery. Cash is tight. What do you do?",
    "choices": [
      "Accept because any saving improves profit",
      "Reject all early-payment offers on principle",
      "Take the discount using customer deposit money",
      "Compare the saving with the cash buffer and supplier reliability before authorising"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N003",
    "level": 1,
    "category": "liquidity",
    "text": "Your cash report shows deposits held for undelivered vehicles. Can you use them for a new purchase?",
    "choices": [
      "Use only part of the deposits",
      "Use the funds temporarily with a plan to replenish",
      "Treat deposits as ordinary sales income",
      "Keep customer funds separate and budget purchases against available business cash"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N004",
    "level": 1,
    "category": "liquidity",
    "text": "A car can be sold quickly for £200 less gross profit. Payroll is due next week. What is sensible?",
    "choices": [
      "Hold firm on price until month-end",
      "Approve the discount without checking the deal cost",
      "Cut the price on every vehicle to match",
      "Check full deal margin, liquidity and sales probability before approving"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N005",
    "level": 1,
    "category": "buying",
    "text": "Two similar used cars are offered: one cheaper with missing service records. How do you choose?",
    "choices": [
      "Buy whichever has the lowest invoice cost",
      "Prefer the better-documented car without checking price",
      "Buy both to diversify the risk",
      "Compare verified condition, preparation risk, demand and expected net margin"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N006",
    "level": 1,
    "category": "buying",
    "text": "Your buyer identifies a popular hatchback but the seller refuses inspection. What is your response?",
    "choices": [
      "Offer a slightly lower bid and proceed",
      "Ask the seller for a signed description instead",
      "Pay a deposit to reserve it before checking",
      "Do not commit until condition and ownership evidence are satisfactory"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N007",
    "level": 1,
    "category": "buying",
    "text": "The auction estimate excludes fees. Your bid ceiling was based on the hammer price alone. What now?",
    "choices": [
      "Use the original ceiling and absorb fees",
      "Raise the budget to preserve the buying opportunity",
      "Ask the buyer to negotiate fees after purchase",
      "Recalculate the all-in cost and lower the hammer ceiling accordingly"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N008",
    "level": 1,
    "category": "buying",
    "text": "An auction inspection flags worn tyres and a possible clutch issue. What next?",
    "choices": [
      "Allocate a standard preparation allowance",
      "Ask the technician to fix only the obvious tyres",
      "Discount the retail price but ignore inspection cost",
      "Estimate both repairs and uncertainty before deciding whether the bid still works"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N009",
    "level": 1,
    "category": "sales",
    "text": "A customer arrives without an appointment while your adviser has a booked viewing. What do you do?",
    "choices": [
      "Serve whoever is most likely to buy",
      "Ask the adviser to handle both simultaneously",
      "Cancel the existing viewing and prioritise the walk-in",
      "Protect the appointment and offer the walk-in a realistic alternative slot"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N010",
    "level": 1,
    "category": "sales",
    "text": "A salesperson requests a £400 discount on a car close to the minimum gross margin. What matters?",
    "choices": [
      "Permit it because any deal helps turnover",
      "Reject it automatically without knowing the customer terms",
      "Offer a larger part-ex allowance instead",
      "Calculate the deal floor and approve only within agreed authority"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N011",
    "level": 1,
    "category": "sales",
    "text": "A customer wants a test drive, but the vehicle has an unresolved workshop fault. Your decision?",
    "choices": [
      "Offer a short drive at low speed",
      "Let the customer sign a waiver",
      "Ask the salesperson to describe the fault after the drive",
      "Hold the drive until safety and roadworthiness are confirmed"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N012",
    "level": 1,
    "category": "sales",
    "text": "Your adviser has a strong conversion rate but poor customer feedback. What do you do?",
    "choices": [
      "Reward the sales figure alone",
      "Send them to a generic sales course immediately",
      "Reduce their sales targets as a permanent fix",
      "Review specific complaints and coach on both customer outcomes and conversion"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N013",
    "level": 1,
    "category": "operations",
    "text": "The technician is off sick and a promised delivery depends on a QC sign-off. What do you do?",
    "choices": [
      "Let the salesperson complete QC",
      "Move delivery without explaining to the customer",
      "Mark QC as complete to preserve the sales deadline",
      "Reallocate qualified cover or agree an honest revised collection date"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N014",
    "level": 1,
    "category": "operations",
    "text": "A routine repair quote exceeds the agreed supervisor limit by £150. What's appropriate?",
    "choices": [
      "Tell the supervisor to split the invoice",
      "Automatically approve because the excess is small",
      "Reject the repair and relist the car",
      "Review the quote and authority exception before a documented decision"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N015",
    "level": 1,
    "category": "operations",
    "text": "Your workshop completed an inspection but parts are two days late. What do you tell sales?",
    "choices": [
      "Promise delivery tomorrow to protect the deal",
      "Wait until the customer asks for updates",
      "Push the technician to use an unsuitable substitute",
      "Confirm the part ETA and revise the delivery promise with the customer"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N016",
    "level": 1,
    "category": "operations",
    "text": "The forecourt has one vacant space but three cars in preparation. What is your priority?",
    "choices": [
      "Buy another car for future stock",
      "Advertise all three unfinished cars immediately",
      "Dismiss the buyer until the workshop clears",
      "Coordinate workshop completion and physical capacity before further buying"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N017",
    "level": 1,
    "category": "customers",
    "text": "A customer says a listed car has an inaccurate mileage statement. What next?",
    "choices": [
      "Keep the listing while checking records",
      "Provide an informal apology but leave the advertisement",
      "Let the salesperson negotiate a discount first",
      "Pause misleading claims, verify records and correct the listing before proceeding"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N018",
    "level": 1,
    "category": "customers",
    "text": "A buyer requests a deposit refund under terms that may be unclear. What do you do?",
    "choices": [
      "Offer a partial refund without reviewing the agreement",
      "Keep the deposit until finance approves month-end accounts",
      "State that all deposits are non-refundable",
      "Check agreed terms, genuine costs and applicable consumer requirements promptly"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N019",
    "level": 1,
    "category": "customers",
    "text": "An unhappy customer has posted a public review. Your first step?",
    "choices": [
      "Reply with a defence of the dealership",
      "Offer a discount in exchange for removing it",
      "Tell staff to dispute the review without investigating",
      "Investigate the experience, respond professionally and address any verified problem"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N020",
    "level": 1,
    "category": "customers",
    "text": "A vehicle develops an issue before collection after a deposit is paid. What should happen?",
    "choices": [
      "Let the customer collect and return later",
      "Switch them to another car without discussion",
      "Use their deposit for immediate repairs without informing them",
      "Disclose the issue, fix it properly and revise or cancel the agreement fairly"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N021",
    "level": 1,
    "category": "staff",
    "text": "A new sales employee needs training but the showroom is busy. What is reasonable?",
    "choices": [
      "Schedule training only when there are no customers",
      "Ask the employee to learn from errors without guidance",
      "Cancel all customer appointments for a full training day",
      "Plan short supervised sessions while maintaining adequate showroom coverage"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N022",
    "level": 1,
    "category": "staff",
    "text": "Two staff members disagree over who owns a sales lead. How do you resolve it?",
    "choices": [
      "Give the lead to the longest-serving person",
      "Offer the customer a different salesperson without checking",
      "Allow both to receive full commission",
      "Review the allocation record and apply a consistent lead ownership policy"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N023",
    "level": 1,
    "category": "staff",
    "text": "Your buyer is exceeding purchase authority by small amounts. What next?",
    "choices": [
      "Ignore it while acquisition margins stay healthy",
      "Reduce the buyer's salary immediately",
      "Approve everything retrospectively without records",
      "Check transactions and enforce clear authorisation ceilings with coaching"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N024",
    "level": 1,
    "category": "staff",
    "text": "A technician proposes skipping a final check to free a bay. Your response?",
    "choices": [
      "Allow it for low-value stock",
      "Let the salesperson choose whether QC is needed",
      "Remove the QC requirement for this month",
      "Keep an independent final check and review capacity rather than bypassing it"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N025",
    "level": 1,
    "category": "finance",
    "text": "The stock value on a dashboard looks healthy but cash is falling. Why investigate?",
    "choices": [
      "Treat stock value as available cash",
      "Ask sales to raise asking prices on everything",
      "Book anticipated sales as receipts",
      "Compare cash commitments, purchase costs, unpaid bills and actual sales proceeds"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N026",
    "level": 1,
    "category": "finance",
    "text": "A vehicle sells at a £1,000 headline margin, but £700 of extra costs were recorded. What matters?",
    "choices": [
      "Report £1,000 gross regardless of costs",
      "Count the extra costs only if the buyer complains",
      "Exclude preparation from the deal because it was paid earlier",
      "Reconcile all acquisition, preparation and selling costs to the true deal outcome"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N027",
    "level": 1,
    "category": "finance",
    "text": "You are three sales below target but close to break-even. What would you report?",
    "choices": [
      "Explain that targets are irrelevant",
      "Record deposits as delivered vehicles",
      "Hide the sales shortfall until next month",
      "Report the shortfall and contribution honestly with a corrective action plan"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N028",
    "level": 1,
    "category": "finance",
    "text": "The month's payroll was higher due to commissions on completed sales. What do you check?",
    "choices": [
      "Cut commissions for the next month without review",
      "Ignore it because commissions are variable",
      "Treat the commissions as a supplier expense",
      "Compare incremental contribution from completed sales against contracted commission costs"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N029",
    "level": 1,
    "category": "compliance",
    "text": "You discover a vehicle's advertised fuel type is wrong. What should happen?",
    "choices": [
      "Correct it at handover",
      "Offer a goodwill payment if the customer notices",
      "Keep the listing until a complaint arrives",
      "Correct the advertisement immediately and review affected customer commitments"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N030",
    "level": 1,
    "category": "compliance",
    "text": "A seller offers a car without satisfactory ownership documents. What do you do?",
    "choices": [
      "Take the vehicle at a discount",
      "Ask for a verbal assurance",
      "Buy it for parts without recording the issue",
      "Verify right to sell and obtain the required documents before proceeding"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N031",
    "level": 2,
    "category": "margin",
    "text": "The dealership has two fast-selling lines with different gross margins. What measure improves buying decisions?",
    "choices": [
      "Prioritise the higher ticket price",
      "Buy whichever model staff prefer",
      "Use average margin alone",
      "Compare margin per day of stock holding and realistic sell-through"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N032",
    "level": 2,
    "category": "margin",
    "text": "A discount could complete a deal now but reduce gross below policy floor. What is appropriate?",
    "choices": [
      "Accept for the sake of monthly volume",
      "Raise the part-ex allowance instead",
      "Ask staff to absorb the difference",
      "Escalate the exception with full deal economics and obtain authority"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N033",
    "level": 2,
    "category": "margin",
    "text": "A high-margin vehicle has been held for 90 days. What should guide the exit?",
    "choices": [
      "Keep waiting because the book margin is attractive",
      "Move it into a prestige section",
      "Spend more on advertising without review",
      "Review actual demand, carrying costs and achievable disposal proceeds"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N034",
    "level": 2,
    "category": "margin",
    "text": "A retail deal includes a part exchange with costly faults. How do you evaluate it?",
    "choices": [
      "Focus solely on the cash difference",
      "Record the exchange at the customer's requested allowance",
      "Exclude the incoming car's preparation until sold",
      "Model both vehicles, their risk and the net transaction margin"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N035",
    "level": 2,
    "category": "stock",
    "text": "Your buyer wants five similar cars from one auction. What would you ask?",
    "choices": [
      "Approve because bulk purchasing simplifies stock",
      "Purchase one of each regardless of quality",
      "Commit to all five if total cost fits cash",
      "Check market demand, concentration risk, forecourt capacity and cash reserves"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N036",
    "level": 2,
    "category": "stock",
    "text": "A vehicle has a rare specification but few comparable listings. What should determine its price?",
    "choices": [
      "Use the highest asking price you can find",
      "Add a fixed premium for rarity",
      "Ignore specification and use base trade guide only",
      "Use condition evidence, genuine buyer demand and credible comparison ranges"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N037",
    "level": 2,
    "category": "stock",
    "text": "A seller insists on immediate payment before a vehicle history check. What is your stance?",
    "choices": [
      "Pay a refundable deposit without paperwork",
      "Trust the seller if the price is favourable",
      "Let the buyer take personal responsibility",
      "Defer payment until identity, title and material vehicle history are checked"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N038",
    "level": 2,
    "category": "stock",
    "text": "The forecourt is full of vehicles needing slow-moving specialist parts. What next?",
    "choices": [
      "Continue purchasing to maintain choice",
      "Advertise them as ready for same-day collection",
      "Stop the entire buying operation indefinitely",
      "Forecast completion delays and limit new purchases until bottlenecks ease"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N039",
    "level": 2,
    "category": "workshop",
    "text": "Internal preparation is cheaper but has a two-week backlog. An external supplier costs more. What matters?",
    "choices": [
      "Always choose internal cost",
      "Always outsource to maintain speed",
      "Split work without considering safety",
      "Compare total carrying cost, quality, capacity and credible delivery dates"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N040",
    "level": 2,
    "category": "workshop",
    "text": "A repair estimate has risen after a diagnostic strip-down. What is your process?",
    "choices": [
      "Approve automatically to protect sunk costs",
      "Reject every cost escalation",
      "Ask the technician to recode costs against another vehicle",
      "Review supporting findings and compare revised value with alternative disposal"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N041",
    "level": 2,
    "category": "workshop",
    "text": "QC passes mechanically but the vehicle listing uses incorrect tyre information. What do you do?",
    "choices": [
      "Sell it because mechanical QC passed",
      "Leave it until next update cycle",
      "Ask the buyer to confirm after sale",
      "Correct the listing and verify the actual specification before delivery"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N042",
    "level": 2,
    "category": "workshop",
    "text": "Workshop output is high but rework cases are rising. What metric is missing?",
    "choices": [
      "Number of jobs booked",
      "Total parts spend",
      "Average time to initial repair",
      "First-time-fix quality and repeat-fault cost by repair type"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N043",
    "level": 2,
    "category": "supervision",
    "text": "Your supervisor keeps requesting approval on low-risk routine repairs. What would you review?",
    "choices": [
      "Raise every limit immediately",
      "Remove approval controls entirely",
      "Tell the technician to authorise their own expenses",
      "Compare recurring request costs and adjust delegated limits within risk policy"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N044",
    "level": 2,
    "category": "supervision",
    "text": "The buyer has good purchase prices but weak retail conversion. What could explain this?",
    "choices": [
      "The buyer must be excellent because entry prices are low",
      "All losses are due to the sales team",
      "Replace every model in the forecourt",
      "Review condition, market demand, preparation time and stock fit"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N045",
    "level": 2,
    "category": "supervision",
    "text": "Sales and workshop each blame the other for missed handovers. Your first response?",
    "choices": [
      "Side with the higher-performing department",
      "Give staff a general warning",
      "Promise every future handover within 24 hours",
      "Audit readiness dates, commitments and the shared handover process"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N046",
    "level": 2,
    "category": "supervision",
    "text": "Your most reliable staff member is consistently covering for absences. What is the risk?",
    "choices": [
      "None if they agree to it",
      "Lower productivity elsewhere is acceptable",
      "Make overtime permanent without review",
      "Check workload, overtime cost, fatigue and whether cover is sustainable"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N047",
    "level": 2,
    "category": "customer",
    "text": "A sale is close but finance or supporting documents are incomplete. What do you do?",
    "choices": [
      "Hand over if the deposit is large",
      "Tell the customer to complete paperwork later",
      "Record the sale to meet target",
      "Confirm all necessary documents, payment and handover conditions before release"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N048",
    "level": 2,
    "category": "customer",
    "text": "Two employees gave different explanations of the same warranty terms. What next?",
    "choices": [
      "Use whichever version is more favourable to close",
      "Tell the customer to read small print",
      "Stop offering warranties indefinitely",
      "Review actual written terms, correct any misinformation and train staff consistently"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N049",
    "level": 2,
    "category": "customer",
    "text": "A customer asks for a written estimate before agreeing to a repair. What is right?",
    "choices": [
      "Give a verbal ballpark only",
      "Quote the lowest possible cost to reassure them",
      "Start repairs and invoice later",
      "Document scope, estimated costs, approval and possible diagnostic uncertainty"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N050",
    "level": 2,
    "category": "customer",
    "text": "A customer complains that the advertised photos concealed damage. What do you do?",
    "choices": [
      "Refer them to the inspection checklist alone",
      "Offer a small accessory as compensation",
      "Ask sales to avoid discussing cosmetic damage",
      "Verify the complaint, correct presentation and negotiate a fair remedy"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N051",
    "level": 2,
    "category": "payroll",
    "text": "A new hire appears productive but monthly payroll pressure is rising. What do you assess?",
    "choices": [
      "Retain all staff because sales might improve",
      "Dismiss the newest hire first",
      "Ignore training costs as one-off",
      "Track role utilisation, contribution, support and total employment cost"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N052",
    "level": 2,
    "category": "payroll",
    "text": "Your salesperson has a target but is often assigned low-intent leads. What do you review?",
    "choices": [
      "Increase their target to push performance",
      "Pay commission on every enquiry",
      "Judge only completed sales regardless of allocation",
      "Evaluate lead assignment fairness and conversion quality before performance action"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N053",
    "level": 2,
    "category": "payroll",
    "text": "A supervisor needs an experienced technician for QC but funds are limited. What would you do?",
    "choices": [
      "Let a sales adviser sign off QC",
      "Stop testing used vehicles for a week",
      "Outsource all workshop work without quotes",
      "Assess qualified cover, outsourcing costs and safety obligations before choosing"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N054",
    "level": 2,
    "category": "payroll",
    "text": "You suspect several employees are confused about their spending authority. What action helps?",
    "choices": [
      "Send a generic motivational email",
      "Disable all department activity",
      "Allow verbal approval for everything",
      "Publish role-specific limits and escalation rules, then confirm understanding"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N055",
    "level": 2,
    "category": "risk",
    "text": "A local market downturn reduces buyer enquiries. Which indicator helps you respond early?",
    "choices": [
      "Total stock value alone",
      "Highest possible retail guide value",
      "Number of social media followers",
      "Enquiry volume, conversion, stock days and cash commitments together"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N056",
    "level": 3,
    "category": "multi-site",
    "text": "A regional group has strong sales but inconsistent stock ageing between branches. What should be standardised?",
    "choices": [
      "Every branch's exact car mix",
      "All branch prices regardless of local demand",
      "Each manager's individual buying preferences",
      "Common ageing definitions and reporting, with local demand decisions retained"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N057",
    "level": 3,
    "category": "multi-site",
    "text": "One branch sends a vehicle to another without a clear transfer record. What's the risk?",
    "choices": [
      "Only transport expenses",
      "The receiving branch might reprice it",
      "The car might need another valet",
      "Duplicate inventory, incorrect costs and unclear accountability"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N058",
    "level": 3,
    "category": "multi-site",
    "text": "A branch manager repeatedly misses monthly stock-turn targets. What first?",
    "choices": [
      "Dismiss the manager after one month",
      "Reduce stock allowance without data",
      "Transfer all their cars to another site",
      "Review local demand, process bottlenecks and cash outcomes before intervention"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N059",
    "level": 3,
    "category": "multi-site",
    "text": "The group wants common discount limits, but branches have different customer profiles. What approach?",
    "choices": [
      "Apply the largest limit everywhere",
      "Allow each salesperson unlimited discretion",
      "Eliminate all branch-level thresholds",
      "Set group guardrails with evidence-based local exceptions and audit"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N060",
    "level": 3,
    "category": "forecast",
    "text": "Your group forecast assumes all listed cars sell within 20 days. What is the main problem?",
    "choices": [
      "20 days is always too slow",
      "The forecast should use only total sales targets",
      "The average price should be increased first",
      "It lacks realistic conversion distributions, condition delays and stress scenarios"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N061",
    "level": 3,
    "category": "forecast",
    "text": "You are deciding whether to increase stock spending during a seasonal peak. What is defensible?",
    "choices": [
      "Use last week's enquiry count only",
      "Buy ahead because competitors are doing so",
      "Use cash reserves to bid above ceiling",
      "Compare seasonal evidence, turnover, working capital and downside demand"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N062",
    "level": 3,
    "category": "forecast",
    "text": "The owner wants an annual plan based on a strong recent month. What should you include?",
    "choices": [
      "Multiply the best month by twelve",
      "Assume supplier costs will remain constant",
      "Exclude hiring and rent until final approval",
      "Use normalised results, monthly seasonality, cost assumptions and sensitivity tests"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N063",
    "level": 3,
    "category": "forecast",
    "text": "The business has higher retail gross profit but worsening bank balance. What analysis matters?",
    "choices": [
      "Only the balance-sheet inventory value",
      "Review cash once the annual report is complete",
      "Focus on headline margin growth",
      "Reconcile acquisition cash, working capital, deposits, arrears and payment timing"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N064",
    "level": 3,
    "category": "compliance",
    "text": "A branch's adverts repeatedly omit material condition information. What should management do?",
    "choices": [
      "Ask staff to use a shorter advert template",
      "Wait for regulators to contact the business",
      "Accept the issue if the cars are priced low",
      "Audit disclosures, correct listings and introduce documented sign-off checks"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N065",
    "level": 3,
    "category": "compliance",
    "text": "You find inconsistent consumer complaint response times across branches. What do you implement?",
    "choices": [
      "Let local managers invent different time limits",
      "Centralise every customer conversation with the CEO",
      "Measure only the number of settled complaints",
      "Define service standards, escalation ownership and audited response timing"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N066",
    "level": 3,
    "category": "compliance",
    "text": "An internal audit identifies unrecorded buying fees. What is the next action?",
    "choices": [
      "Absorb fees into a general overhead line",
      "Record fees only for unsold vehicles",
      "Ignore small variances to save time",
      "Reconcile per-vehicle purchase costs and correct ledgers and controls"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N067",
    "level": 3,
    "category": "compliance",
    "text": "An expensive part-exchange is booked without sufficient evidence of title. What should happen?",
    "choices": [
      "Accept it if the deal has a high gross margin",
      "Retrospectively ask the buyer to email the customer",
      "Keep it off the formal stock system for a week",
      "Suspend the asset transaction pending ownership checks and an audit trail"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N068",
    "level": 3,
    "category": "leadership",
    "text": "Two branch supervisors disagree on allocation of an experienced technician. How do you decide?",
    "choices": [
      "Give the technician to the most profitable branch always",
      "Split their hours evenly regardless of workload",
      "Delegate the dispute without reporting",
      "Compare safety-critical backlog, value, travel and capacity before allocation"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N069",
    "level": 3,
    "category": "leadership",
    "text": "A growing dealership group lacks clear replacement cover for key managers. What matters?",
    "choices": [
      "Hire a deputy at every site immediately",
      "Centralise all customer decisions",
      "Wait until somebody resigns",
      "Create succession and cross-training plans matched to operational risk"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N070",
    "level": 3,
    "category": "leadership",
    "text": "A promising assistant manager wants greater responsibility. What approach reduces risk?",
    "choices": [
      "Give immediate authority over all acquisition cash",
      "Offer a title change without responsibilities",
      "Delay all development until annual review",
      "Delegate staged measurable decisions with coaching, limits and review"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N071",
    "level": 3,
    "category": "leadership",
    "text": "A branch has a culture of reporting only positive figures. What should the group leader do?",
    "choices": [
      "Set even higher targets to push results",
      "Accept the figures if cash is positive",
      "Avoid challenging senior colleagues publicly",
      "Protect accurate reporting, investigate incentives and align rewards with real outcomes"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N072",
    "level": 3,
    "category": "procurement",
    "text": "A major supplier offers exclusivity in exchange for a small rebate. What do you weigh?",
    "choices": [
      "Accept any rebate on principle",
      "Avoid supplier negotiations entirely",
      "Compare only unit purchase price",
      "Review service levels, concentration risk, contract lock-in and total delivered cost"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N073",
    "level": 3,
    "category": "procurement",
    "text": "Workshop delays correlate with a particular parts category. How should buying respond?",
    "choices": [
      "Order larger volumes without checking demand",
      "Switch every supplier immediately",
      "Ask sales to reduce deliveries permanently",
      "Analyse lead-time variability, supplier performance and appropriate buffer stock"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N074",
    "level": 3,
    "category": "procurement",
    "text": "The group could centralise vehicle buying, but local branches know their customers. Best design?",
    "choices": [
      "Centralise every bid with no branch input",
      "Let branches compete against each other at auctions",
      "Remove all procurement limits",
      "Use central price/risk controls informed by local demand and stock turn"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N075",
    "level": 3,
    "category": "procurement",
    "text": "Several sites share the same vehicle model but pay different prices. What is your first move?",
    "choices": [
      "Set a single bid ceiling regardless of condition",
      "Publicly identify the branch paying most",
      "Stop buying that model altogether",
      "Compare condition, fees, mileage and timing before benchmarking cost"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N076",
    "level": 3,
    "category": "performance",
    "text": "A branch has high unit volume and weak post-sale customer satisfaction. What should affect its rating?",
    "choices": [
      "Volume only",
      "Ignore complaints until they become legal disputes",
      "Reduce targets and stop tracking quality",
      "Combine contribution, verified complaints, quality and repeat-customer outcomes"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N077",
    "level": 3,
    "category": "performance",
    "text": "Managers are gaming monthly sales targets with premature handovers. What remedy helps?",
    "choices": [
      "Raise targets further",
      "Accept deposits as completed sales",
      "Switch to quarterly targets without audit",
      "Verify completion milestones and incentives against valid recorded deliveries"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N078",
    "level": 3,
    "category": "performance",
    "text": "The group has a best-performing branch with unusually low staff costs. What needs checking?",
    "choices": [
      "Copy the staffing pattern everywhere",
      "Reward the manager without investigation",
      "Assume the figures are accurate",
      "Check vacancies, unpaid overtime, outsourcing and sustainable service levels"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N079",
    "level": 3,
    "category": "performance",
    "text": "You are considering a new site while several branches carry stock ageing losses. What should you do?",
    "choices": [
      "Expand because a new location diversifies profit",
      "Finance the opening with deposits",
      "Make all sites match the new branch forecast",
      "Stabilise existing cash and operating results before evaluating expansion"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N080",
    "level": 3,
    "category": "strategy",
    "text": "A competitor has dropped prices in your region. How should the dealer group respond?",
    "choices": [
      "Match every discount immediately",
      "Raise all asking prices to defend margin",
      "Stop retail selling until the competitor recovers",
      "Identify affected segments and test selective pricing versus sustainable margins"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N081",
    "level": 4,
    "category": "prestige",
    "text": "A prestige buyer expects a detailed provenance record. What should the retailer prioritise?",
    "choices": [
      "Create a polished sales brochure first",
      "Emphasise rarity over documentation",
      "Rely on an employee's verbal history summary",
      "Validate the vehicle's history, specification and claims before marketing"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N082",
    "level": 4,
    "category": "prestige",
    "text": "A low-mileage performance car has signs of track use. What is the appropriate judgement?",
    "choices": [
      "Reject every performance car with modified tyres",
      "Treat low mileage as proof of gentle use",
      "Buy first and inspect after resale enquiry",
      "Commission specialist inspection and reflect use and condition in valuation"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N083",
    "level": 4,
    "category": "prestige",
    "text": "The customer requests delivery of an expensive car with a known electronic warning. What is right?",
    "choices": [
      "Offer them an extended warranty only",
      "Give a discount and leave the fault for later",
      "Approve handover if the warning disappears on restart",
      "Complete diagnosis and ensure correct operation before transfer"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N084",
    "level": 4,
    "category": "prestige",
    "text": "Your best luxury salesperson builds relationships but regularly misses cash-flow limits. How do you react?",
    "choices": [
      "Allow exceptions based on client value",
      "Cut their commission to recover costs",
      "Require all future sales to be cash-only",
      "Protect authority limits while coaching and recognising legitimate client-service skill"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N085",
    "level": 4,
    "category": "prestige",
    "text": "A rare vehicle has sparse comparable transactions and a seller's high reserve. What guides the purchase?",
    "choices": [
      "Base purchase price on advertised collector listings",
      "Use the seller's historic purchase price",
      "Ignore preparation because low usage implies perfection",
      "Model evidenced demand, condition, provenance and a conservative exit scenario"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N086",
    "level": 4,
    "category": "prestige",
    "text": "A manufacturer specification claim is difficult to verify. What action is justified?",
    "choices": [
      "Repeat it because a specialist buyer expects details",
      "Remove the model from your catalogue entirely",
      "Ask sales to label the claim as guaranteed",
      "Check primary evidence and avoid unsupported claims in adverts or handover records"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N087",
    "level": 4,
    "category": "prestige",
    "text": "An overseas buyer requests a rapid export sale. What needs attention?",
    "choices": [
      "Take the largest deposit possible immediately",
      "Use normal domestic paperwork without review",
      "Let the buyer arrange everything independently",
      "Verify identity, payment, applicable export/documentation requirements and delivery obligations"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N088",
    "level": 4,
    "category": "prestige",
    "text": "A high-value vehicle returns from detailing with fresh paint defects. What do you do?",
    "choices": [
      "Deliver and offer free detailing later",
      "Tell the customer to accept normal wear",
      "List the car before a formal handover check",
      "Record the defect, assess remedy and ensure presentation matches the agreed sale"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N089",
    "level": 4,
    "category": "prestige",
    "text": "Two VIP clients want the same car and one has already placed a valid reservation. What is right?",
    "choices": [
      "Sell to the highest bidder",
      "Ask both clients for another deposit",
      "Offer the reserved car as available to both",
      "Honour the documented reservation and manage the second enquiry transparently"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N090",
    "level": 4,
    "category": "prestige",
    "text": "Your group wants prestige service standards without excessive nonessential spending. What matters?",
    "choices": [
      "Spend freely on every customer's request",
      "Cut all concierge services immediately",
      "Focus on superficial branding alone",
      "Measure service outcomes and allocate resources to reliability and genuine client needs"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N091",
    "level": 4,
    "category": "portfolio",
    "text": "The dealer group is overexposed to one expensive model class. How do you respond?",
    "choices": [
      "Purchase more while demand is good",
      "Set a uniform 30-day clearance price",
      "Ignore concentration if the stock is insured",
      "Set category exposure limits and use demand-adjusted acquisition plans"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N092",
    "level": 4,
    "category": "portfolio",
    "text": "Your high-value stock is insured but its cash conversion is slowing. What matters most?",
    "choices": [
      "Insurance removes working-capital risk",
      "Hold inventory until market prices rebound",
      "Increase listed values to strengthen the balance sheet",
      "Model price downside, ageing, funding cost and timed exits"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N093",
    "level": 4,
    "category": "portfolio",
    "text": "A regional manager proposes shifting prestige cars across branches frequently. What's the trade-off?",
    "choices": [
      "Transfer all stock weekly",
      "Avoid moving any car under any circumstances",
      "Value only the additional showroom space",
      "Compare local demand gains against transport, damage and holding risk"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N094",
    "level": 4,
    "category": "portfolio",
    "text": "Your owner wants a premium EV stock strategy. What do you establish first?",
    "choices": [
      "Buy only the latest models",
      "Assume EV demand will grow uniformly",
      "Ignore charging and battery records",
      "Model buyer profiles, battery evidence, warranties and model-specific demand"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N095",
    "level": 4,
    "category": "leadership",
    "text": "A senior salesperson's personal brand is stronger than your dealership. What is the management risk?",
    "choices": [
      "None, because the employee produces sales",
      "Remove them from all client relationships",
      "Pay them more without changing systems",
      "Preserve institutional customer records, clear conduct standards and succession cover"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N096",
    "level": 4,
    "category": "leadership",
    "text": "You discover an elite colleague is pressuring staff to conceal vehicle issues. Your response?",
    "choices": [
      "Protect the business reputation by keeping it internal",
      "Wait for a completed sale to investigate",
      "Ask them to apologise without evidence",
      "Preserve evidence, protect staff and initiate an impartial investigation"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N097",
    "level": 4,
    "category": "leadership",
    "text": "A prestigious site is profitable but has unusually high employee turnover. What might be missing?",
    "choices": [
      "Only salary benchmarking",
      "More ambitious unit sales targets",
      "A company-wide recruitment freeze",
      "A review of management culture, workloads, fairness and retention costs"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N098",
    "level": 4,
    "category": "leadership",
    "text": "The board asks you to deliver exceptional sales and zero customer complaints. What do you say?",
    "choices": [
      "Promise both regardless of circumstances",
      "Reject customer quality as a metric",
      "Lower targets without analysis",
      "Set ambitious but evidence-based targets with quality safeguards and variance reporting"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N099",
    "level": 4,
    "category": "governance",
    "text": "The finance team reports inconsistent valuation methods for prestige stock. What is appropriate?",
    "choices": [
      "Use the highest guide value for consistency",
      "Carry every car at original purchase cost indefinitely",
      "Change valuations only at year-end",
      "Apply documented evidence-based valuation and impairment review consistently"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N100",
    "level": 4,
    "category": "governance",
    "text": "An important supplier offers you a personal hospitality trip during negotiations. What should you do?",
    "choices": [
      "Accept because it builds relationships",
      "Delegate contract award while keeping the benefit",
      "Take the trip after signing",
      "Disclose the conflict and follow the group's gifts and procurement policy"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N101",
    "level": 5,
    "category": "board",
    "text": "An elite group wants a three-year growth strategy after a volatile market year. What is your first output?",
    "choices": [
      "Set an aggressive revenue target before cost analysis",
      "Acquire smaller competitors to signal ambition",
      "Use the best-performing branch as the universal benchmark",
      "Present risk-adjusted scenarios for capital, demand, margins, staffing and downside liquidity"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N102",
    "level": 5,
    "category": "board",
    "text": "A board member demands a private change to a published performance report. What do you do?",
    "choices": [
      "Agree if it avoids embarrassment",
      "Record the change informally outside the system",
      "Delay the report without explaining why",
      "Preserve an auditable evidence trail and escalate inappropriate pressure"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N103",
    "level": 5,
    "category": "board",
    "text": "A profitable luxury site relies on one model line for half its earnings. What is the primary risk?",
    "choices": [
      "The model is too popular to diversify",
      "Insurance eliminates concentration risk",
      "Price increases can offset all demand shifts",
      "Exposure to demand, supply and valuation shocks; plan measured diversification"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N104",
    "level": 5,
    "category": "board",
    "text": "Your group is planning a £1m inventory facility. What should determine borrowing capacity?",
    "choices": [
      "The maximum available from the lender",
      "Projected retail asking value alone",
      "Last year's record month",
      "Cash conversion timing, downside losses, covenant headroom and financing costs"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N105",
    "level": 5,
    "category": "board",
    "text": "A rival luxury group is offering a large acquisition premium for your best branch. What is the right evaluation?",
    "choices": [
      "Accept the offer because the premium is large",
      "Reject it to preserve management prestige",
      "Decide on headline price before due diligence",
      "Compare risk-adjusted strategic value, transaction terms, future earnings and alternatives"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N106",
    "level": 5,
    "category": "board",
    "text": "You are asked to recover losses by recognising unsigned customer orders as revenue. What do you do?",
    "choices": [
      "Recognise them if deposits exist",
      "Wait until the next quarter to reverse the entries",
      "Record them as cash sales with annotations",
      "Reject false recognition and report only qualifying completed transactions"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N107",
    "level": 5,
    "category": "board",
    "text": "A senior director proposes a rapid national expansion funded by selling productive assets. How do you evaluate it?",
    "choices": [
      "Approve because geographic growth reduces risk",
      "Avoid any expansion until every site is profitable",
      "Compare only forecast new-site gross profit",
      "Stress-test opportunity cost, operating capacity, asset returns, leverage and downside exit options"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N108",
    "level": 5,
    "category": "board",
    "text": "A substantial customer-data breach is suspected at a prestige group. Your first response?",
    "choices": [
      "Keep systems running quietly and investigate later",
      "Notify all customers before validating facts",
      "Delete affected records to reduce exposure",
      "Contain the issue, preserve evidence and engage appropriate legal/compliance response promptly"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N109",
    "level": 5,
    "category": "board",
    "text": "A finance forecast assumes current retail demand despite declining enquiry conversion. What do you require?",
    "choices": [
      "Keep the base case for budget consistency",
      "Raise average unit prices to offset lost volume",
      "Delay the forecast until sales recover",
      "Reforecast using leading indicators, multiple scenarios and explicit trigger actions"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  },
  {
    "id": "N110",
    "level": 5,
    "category": "board",
    "text": "The board wants to measure your performance across five dealerships. Which scorecard is most defensible?",
    "choices": [
      "Total sales only",
      "Growth in retail asking value and headcount",
      "Individual manager opinions",
      "Risk-adjusted contribution, capital efficiency, stock turn, customer outcomes and control compliance"
    ],
    "points": [
      1,
      2,
      0,
      3
    ]
  }
].map(q=>Object.freeze({
   ...q,choices:Object.freeze(q.choices),points:Object.freeze(q.points)
 })));
 window.MotorTradeInterviewBank=QUESTIONS;
})();