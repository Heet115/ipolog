# IPO Tracker — Product Specification & Phased AI IDE Build Prompt

## 1. Project Overview

Build a simple personal web application called **IPO Tracker**.

The product is for tracking IPO applications made through many application accounts and many bank accounts.

The core problem:

> I apply for IPOs through several application accounts, using different bank accounts. I need to quickly record which account applied for which IPO, how much money is blocked in each bank account, what happened at allotment, how much was invested, and what profit I finally made.

Some application accounts are mine and some are other/friend accounts. For **Other Accounts**, a percentage of profit is shared. The default share is **40%**, but it must be configurable per account.

The product should remain deliberately simple. Do not turn it into a stock trading platform, IPO research portal, or banking application.

---

# 2. Technology Stack

Use:

- **Next.js**
- **TypeScript**
- **shadcn/ui**
- **Firebase**

Recommended Firebase services:

- Firebase Authentication
- Cloud Firestore
- Firebase Storage only if a future feature actually needs files
- Firebase App Check if appropriate
- Firebase Hosting is optional; deployment can remain compatible with Vercel

Use the current stable project conventions already present in the user's Next.js project.

Do not introduce unnecessary libraries when the existing stack can solve the requirement.

---

# 3. Product Principles

## Keep it simple

The user should be able to record an IPO application very quickly.

The most important workflow is:

1. Add/select an IPO
2. Select multiple application accounts
3. Assign the bank account for each selected application
4. Enter lots
5. Save
6. Later update allotment
7. Later enter listing/sale details
8. See blocked money and profit automatically

## Avoid unnecessary data collection

Do not require:

- Person names
- Broker names
- Demat numbers
- PAN
- Bank login credentials
- UPI PIN
- OTP
- Broker passwords
- Trading passwords

Application accounts are only labels such as:

- My Account 1
- My Account 2
- Other Account 1
- Other Account 2

Bank accounts are identified with simple information such as:

- HDFC Bank •1234
- SBI •5678

---

# 4. Main Navigation

Keep navigation minimal:

- Dashboard
- My IPOs
- Application Accounts
- Bank Accounts

Do not create unnecessary top-level pages.

Application details should primarily be accessed from the relevant IPO.

---

# 5. Core Entities

There are four core concepts:

```text
User
 ├── IPOs
 ├── Application Accounts
 ├── Bank Accounts
 └── Applications
```

An application connects:

```text
IPO
 +
Application Account
 +
Bank Account
```

Example:

```text
ABC IPO
    |
    +-- My Account 1 ---- HDFC •1234
    +-- My Account 2 ---- SBI •5678
    +-- Other Account 1 - ICICI •9012
```

---

# 6. Data Model

## 6.1 User

Firebase Authentication owns identity.

Firestore user profile can contain:

```ts
{
  uid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Keep user profile minimal.

---

## 6.2 IPO

Suggested structure:

```ts
{
  id: string;
  userId: string;

  name: string;
  companyName?: string;

  type: "mainboard" | "sme";

  issuePrice: number;
  priceBandMin?: number;
  priceBandMax?: number;
  lotSize: number;

  openDate?: Timestamp;
  closeDate?: Timestamp;
  allotmentDate?: Timestamp;
  listingDate?: Timestamp;

  notes?: string;

  archived: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

IPO status can be derived from dates/application state where practical.

Possible UI statuses:

- Upcoming
- Open
- Closed
- Allotment Pending
- Listed
- Completed

Do not create unnecessary status complexity.

---

## 6.3 Application Account

This is a simple label, not a person record.

```ts
{
  id: string;
  userId: string;

  name: string;

  type: "my" | "other";

  profitSharePercent: number;

  notes?: string;

  archived: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Rules:

- `my` accounts should normally have `profitSharePercent = 0`
- `other` accounts should default to `40`
- User can change the percentage for an individual Other Account
- Example: Other Account 1 = 40%, Other Account 2 = 30%

---

## 6.4 Bank Account

```ts
{
  id: string;
  userId: string;

  bankName: string;
  nickname?: string;
  last4?: string;

  notes?: string;

  archived: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Display examples:

- HDFC Bank •1234
- SBI •5678

Do not store sensitive banking credentials.

---

## 6.5 Application

This is the most important entity.

```ts
{
  id: string;
  userId: string;

  ipoId: string;
  accountId: string;
  bankAccountId: string;

  applicationDate: Timestamp;

  lotsApplied: number;
  sharesApplied: number;
  amountApplied: number;

  status: "pending" | "allotted" | "not_allotted" | "sold";

  allottedLots?: number;
  allottedShares?: number;

  listingPrice?: number;
  currentPrice?: number;

  sharesSold?: number;
  salePrice?: number;
  saleDate?: Timestamp;

  notes?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Do not duplicate unnecessary IPO/account/bank data into applications unless there is a strong reason.

---

# 7. Calculation Rules

Centralize financial calculations in reusable utility functions.

Do not duplicate calculation logic across UI components.

## 7.1 Shares Applied

```text
sharesApplied = lotsApplied × lotSize
```

## 7.2 Amount Applied

```text
amountApplied = lotsApplied × lotSize × issuePrice
```

## 7.3 Allotted Investment

```text
investment = allottedShares × issuePrice
```

## 7.4 Listing Value

```text
listingValue = allottedShares × listingPrice
```

## 7.5 Current Value

```text
currentValue = remainingShares × currentPrice
```

## 7.6 Sale Value

```text
saleValue = sharesSold × salePrice
```

## 7.7 Gross Profit

For sold shares:

```text
grossProfit = saleValue - (sharesSold × issuePrice)
```

For unsold holdings:

```text
grossProfit = currentValue - (remainingShares × issuePrice)
```

If the system supports a mixed sold/unsold position, show realized and unrealized portions separately.

Keep the initial implementation simple and robust.

---

# 8. Profit Sharing Rules

Profit sharing is based on **profit only**, not invested capital.

Example:

```text
Investment = ₹15,000
Sale Value = ₹20,400

Gross Profit = ₹5,400

Share = 40%

Other Account Share = ₹2,160
Your Profit = ₹3,240
```

Formula:

```text
profitShared = grossProfit × (profitSharePercent / 100)

yourProfit = grossProfit - profitShared
```

For My Accounts:

```text
profitSharePercent = 0%
```

Therefore:

```text
profitShared = 0
yourProfit = grossProfit
```

The UI must clearly distinguish:

- Gross Profit
- Profit Shared
- Your Profit

Never apply the 40% to the original investment.

---

# 9. Multiple Applications for One IPO

An IPO may have many applications.

Example:

| Application Account | Bank Account | Lots | Amount | Status |
|---|---|---:|---:|---|
| My Account 1 | HDFC •1234 | 1 | ₹15,000 | Allotted |
| My Account 2 | SBI •5678 | 1 | ₹15,000 | Not Allotted |
| Other Account 1 | ICICI •9012 | 1 | ₹15,000 | Allotted |
| Other Account 2 | HDFC •1234 | 1 | ₹15,000 | Pending |

The IPO detail page should be centered around this table.

---

# 10. Bulk Application Entry

This is a key requirement.

The user should not have to create 10–20 applications one by one.

Workflow:

```text
Open IPO
    ↓
Select application accounts
    ↓
Set lots per account
    ↓
Assign bank accounts
    ↓
Review
    ↓
Create applications
```

Example:

```text
ABC Limited

MY ACCOUNTS
☑ My Account 1
☑ My Account 2
☑ My Account 5

OTHER ACCOUNTS
☑ Other Account 1
☑ Other Account 2
☑ Other Account 4

Lots per selected account: 1

Next
```

Then:

```text
My Account 1       HDFC •1234
My Account 2       SBI •5678
My Account 5       HDFC •1234
Other Account 1    ICICI •9012
Other Account 2    SBI •5678
Other Account 4    HDFC •1234
```

Allow the user to change an individual bank account before saving.

This workflow should be fast on desktop and mobile.

---

# 11. Dashboard Requirements

Dashboard should show:

## Summary

- Total IPOs
- Active IPOs
- Total applications
- Pending applications
- Allotted applications
- Not allotted applications
- Total amount applied
- Currently blocked money
- Total invested
- Expected refund
- Gross profit
- Profit shared
- Your profit

## Active IPOs

Show IPOs with pending applications or incomplete updates.

Example:

```text
ABC Limited
8 Applications
₹1,20,000 Applied
3 Pending
2 Allotted
3 Not Allotted
```

## Money by Bank

Example:

```text
HDFC •1234      ₹45,000
SBI •5678       ₹30,000
ICICI •9012     ₹15,000
```

This should represent money currently blocked in pending applications.

## Recent Activity

Examples:

```text
ABC IPO — 5 applications added
XYZ IPO — 2 applications allotted
PQR IPO — 3 applications marked Not Allotted
```

Keep activity lightweight.

---

# 12. IPO Detail Page

An IPO detail page should contain:

## Header

- IPO name
- Company
- Mainboard/SME
- Issue price
- Lot size
- Important dates
- IPO status

## Summary

- Applications
- Total lots applied
- Total amount applied
- Allotted
- Not allotted
- Pending
- Currently blocked
- Invested
- Refund expected
- Gross profit
- Profit shared
- Your profit

## Application List

Show:

- Account
- Bank
- Lots
- Amount
- Status
- Allotted shares where applicable

## Actions

- Add applications
- Update allotment
- Enter listing price
- Enter current price
- Record sale
- Edit IPO
- Archive IPO

---

# 13. Application Update

Each application should be easy to update.

Pending:

```text
Status: Pending
```

Allotted:

```text
Status: Allotted
Allotted Lots: 1
Allotted Shares: 20
```

Not allotted:

```text
Status: Not Allotted
```

Sold:

```text
Status: Sold
Shares Sold: 20
Sale Price: ₹1,020
Sale Date: ...
```

---

# 14. Money State Logic

Use application status to derive money state.

## Pending

Money is:

```text
Blocked
```

## Allotted

Money becomes:

```text
Invested
```

## Not Allotted

Money becomes:

```text
Refund Expected
```

## Sold

Investment has been converted into sale proceeds.

Avoid asking the user to manually maintain separate "blocked" amounts when the application data already determines them.

---

# 15. Bank Account Page

Bank account list:

```text
HDFC Bank •1234
SBI •5678
ICICI Bank •9012
```

Each bank account should show:

- Active applications
- Total applied
- Currently blocked
- Invested
- Related IPOs

Example:

```text
HDFC •1234

Active IPOs: 3
Total Applied: ₹60,000
Currently Blocked: ₹30,000
Invested: ₹15,000
```

---

# 16. Application Account Page

Each application account should show:

- Account name
- My/Other type
- Profit-sharing %
- Total applications
- Allotted
- Not allotted
- Pending
- Total applied
- Total invested
- Gross profit
- Profit shared
- Your profit

Example:

```text
Other Account 1

Applications: 12
Allotted: 4
Not Allotted: 7
Pending: 1

Total Applied: ₹1,80,000
Total Invested: ₹60,000

Gross Profit: ₹12,000
Share: 40%
Profit Shared: ₹4,800
Your Profit: ₹7,200
```

---

# 17. Investment Tracking

Once an application is allotted, allow:

- Allotted lots
- Allotted shares
- Issue price
- Investment amount
- Listing price
- Listing value
- Current price
- Current value
- Gross profit/loss

Example:

```text
Issue Price: ₹750
Allotted Shares: 20
Investment: ₹15,000

Listing Price: ₹920
Listing Value: ₹18,400

Gross Profit: ₹3,400
Return: 22.67%
```

---

# 18. Sale Tracking

When selling shares, record:

- Shares sold
- Sale price
- Sale date

Example:

```text
Shares Sold: 20
Sale Price: ₹1,020
Sale Date: 10 Sep 2026

Investment: ₹15,000
Sale Value: ₹20,400
Gross Profit: ₹5,400
```

Then apply the account's configured profit-sharing percentage.

---

# 19. Profit Summary

For each IPO:

```text
Gross Profit: ₹18,000
Profit Shared: ₹3,600
Your Final Profit: ₹14,400
```

Show account-level breakdown:

| Account | Gross Profit | Share | Shared Amount | Your Profit |
|---|---:|---:|---:|---:|
| My Account 1 | ₹5,000 | 0% | ₹0 | ₹5,000 |
| My Account 2 | ₹4,000 | 0% | ₹0 | ₹4,000 |
| Other Account 1 | ₹6,000 | 40% | ₹2,400 | ₹3,600 |
| Other Account 2 | ₹3,000 | 40% | ₹1,200 | ₹1,800 |

---

# 20. Application Filters

Allow filtering by:

- Pending
- Allotted
- Not Allotted
- Sold
- My Accounts
- Other Accounts
- Specific application account
- Specific bank account

Search should support:

- IPO name
- Application account
- Bank account

---

# 21. Account Grouping

The UI should clearly separate:

```text
My Accounts

My Account 1
My Account 2
My Account 3

Other Accounts

Other Account 1
Other Account 2
Other Account 3
```

This is important because Other Accounts have profit-sharing rules.

---

# 22. Notes

Allow optional notes on:

- IPO
- Application
- Application account
- Bank account

Examples:

```text
Applied through multiple accounts.
40% profit-sharing agreement.
Need to update allotment.
```

---

# 23. Activity History

Maintain only useful activity events.

Examples:

- IPO created
- Applications added
- Application status changed
- Allotment updated
- Listing price updated
- Sale recorded

Do not turn this into a complicated audit platform.

---

# 24. Data Operations

Support:

- Create
- Read
- Update
- Delete
- Archive

Records should be soft-archived where practical instead of immediately destroying historical data.

---

# 25. CSV Export

Provide a simple export.

The user should be able to export application/history data to CSV.

Useful columns:

```text
IPO
Application Account
Account Type
Bank
Lots Applied
Shares Applied
Amount Applied
Status
Allotted Shares
Issue Price
Listing Price
Current Price
Shares Sold
Sale Price
Gross Profit
Profit Share %
Profit Shared
Your Profit
```

Do not build Excel/PDF exports unless later required.

---

# 26. Authentication

Use Firebase Authentication.

Required:

- Sign up
- Login
- Logout
- Password reset

Google sign-in may be included if it fits cleanly, but it is not mandatory.

Each user's Firestore data must be isolated.

---

# 27. Firestore Security

Security rules must ensure a user can only access their own data.

Every user-owned document must include or otherwise be scoped to the authenticated user.

Applications must not be readable or writable across users.

Do not rely only on client-side filtering for security.

---

# 28. UX Requirements

The design should be:

- Clean
- Simple
- Professional
- Fast
- Responsive
- Mobile-friendly

Use shadcn/ui components consistently.

Important UI areas:

- Dashboard cards
- Tables
- Dialogs
- Forms
- Dropdowns
- Tabs where useful
- Badges for statuses
- Confirmation dialogs
- Toast feedback for successful actions
- Empty states
- Loading states
- Error states

Do not overuse cards, modals, charts, or decorative elements.

---

# 29. Responsive Requirements

The application must work on:

- Desktop
- Laptop
- Tablet
- Mobile

On mobile:

- Tables should become responsive cards or horizontally scrollable where appropriate
- Account selection for bulk applications must remain easy
- Add/update workflows must not require excessive scrolling
- Important totals must remain easy to find

---

# 30. Important UX Workflow: Add IPO

Form fields:

```text
IPO Name
Company Name
IPO Type
Issue Price
Price Band (optional)
Lot Size
Open Date
Close Date
Allotment Date
Listing Date
Notes
```

After save, open the IPO detail page or provide a clear next action to add applications.

---

# 31. Important UX Workflow: Add Accounts

## Application Account

```text
Name
Type: My / Other

If Other:
Profit Share % (default 40%)

Notes
```

## Bank Account

```text
Bank Name
Nickname (optional)
Last 4 Digits (optional)
Notes
```

---

# 32. Important UX Workflow: Add Applications

### Step 1

Select accounts.

### Step 2

Choose lots per selected account.

### Step 3

Assign bank accounts.

### Step 4

Review:

```text
Account              Bank            Lots       Amount
My Account 1         HDFC •1234      1          ₹15,000
My Account 2         SBI •5678       1          ₹15,000
Other Account 1      ICICI •9012     1          ₹15,000
```

### Step 5

Save.

---

# 33. Important UX Workflow: Update Allotment

Provide a bulk editing interface.

Example:

```text
Account             Result

My Account 1        Allotted
My Account 2        Not Allotted
Other Account 1     Allotted
Other Account 2     Not Allotted
```

For allotted:

```text
Allotted Lots
Allotted Shares
```

Save all changes together.

---

# 34. Important UX Workflow: Record Sale

For an allotted application:

```text
Shares Sold
Sale Price
Sale Date
```

Then show:

```text
Gross Profit
Profit Shared
Your Profit
```

---

# 35. Dashboard Money Logic

The dashboard should calculate totals from application data.

## Total Applied

Sum `amountApplied` for all active/non-deleted applications.

## Currently Blocked

Sum `amountApplied` for applications with status `pending`.

## Invested

Sum allotted investment for applications with status `allotted` or `sold` as appropriate, without double-counting sold capital.

## Expected Refund

Sum applied amount for `not_allotted` applications.

Make the logic explicit and centralized.

---

# 36. Handling Sold Applications

A sold application can contain:

- Allotted shares
- Shares sold
- Sale price
- Sale date
- Remaining shares

Prefer storing enough data to support both fully sold and partially sold positions.

For V1 of the implementation, prioritize fully sold positions but structure the model so partial sales can be supported without redesign.

---

# 37. Validation

Validate:

- Positive lot counts
- Positive prices
- Valid percentages between 0 and 100
- Allotted shares cannot exceed applied shares
- Sold shares cannot exceed allotted shares
- Sale price cannot be negative
- Required IPO/account/bank relationships must exist

Prevent invalid states in both UI validation and server-side/business logic.

---

# 38. Empty States

Every page should have useful empty states.

Examples:

```text
No IPOs yet
Add your first IPO to start tracking.

No bank accounts
Add the bank accounts you use for IPO applications.

No applications
Add applications to this IPO.
```

Provide a clear primary action.

---

# 39. Error Handling

Implement clear error handling for:

- Firebase unavailable
- Permission denied
- Failed writes
- Failed reads
- Invalid form input
- Missing references
- Deleted/archived referenced records

Do not silently fail.

---

# 40. No Notification Features

Do not build notification-related features.

Do not add:

- Push notifications
- Email notifications
- SMS notifications
- Notification center
- Reminder system
- Notification preferences
- Scheduled alerts
- IPO closing alerts
- Allotment alerts

The user explicitly does not want notification features.

---

# 41. Scope Boundaries

Do not build features outside the agreed product scope, including:

- Broker integrations
- Bank integrations
- UPI integrations
- Live bank balance integrations
- Live stock-price integrations
- Automatic allotment checking
- GMP tracking
- Live subscription tracking
- Company financial analysis
- AI IPO recommendations
- Trading execution
- Tax management
- Social features
- People/contact management
- Complex portfolio-management systems

The application is a **personal IPO tracker**, not a trading or IPO research platform.

---

# 42. Suggested Project Structure

Adapt to the existing Next.js app, but a sensible structure is:

```text
app/
  (auth)/
  dashboard/
  ipos/
  accounts/
  bank-accounts/

components/
  dashboard/
  ipo/
  applications/
  accounts/
  bank-accounts/
  shared/
  ui/

lib/
  firebase/
  calculations/
  validation/
  utils/

types/
  ipo.ts
  application.ts
  account.ts
  bank-account.ts

hooks/
services/
```

Do not blindly recreate this structure if the existing project has a better established convention.

---

# 43. Suggested Firestore Organization

A practical structure:

```text
users/{userId}

users/{userId}/ipos/{ipoId}
users/{userId}/applicationAccounts/{accountId}
users/{userId}/bankAccounts/{bankAccountId}
users/{userId}/applications/{applicationId}
users/{userId}/activities/{activityId}
```

This makes user-level security straightforward.

Use references/IDs between documents.

---

# 44. Derived Calculations vs Stored Data

Store source-of-truth data:

- IPO issue price
- Lot size
- Application lots
- Allotment
- Listing price
- Current price
- Sale details
- Account share %

Derive:

- Amount applied
- Shares applied
- Investment
- Blocked money
- Refund expected
- Gross profit
- Profit shared
- Your profit
- Return %

Avoid storing calculated totals unless there is a demonstrated performance requirement.

---

# 45. Design Direction

Use a modern financial-dashboard feel without making it look like a trading terminal.

The visual direction should be:

- Clean
- Minimal
- High readability
- Strong information hierarchy
- Clear status badges
- Clear money figures
- Subtle borders
- Comfortable spacing
- Responsive tables/cards

Use shadcn/ui primitives rather than building a custom component library.

Do not make the UI visually complicated.

---

# 46. Development Rules for the AI IDE Agent

You are an implementation agent working inside a Next.js + shadcn/ui + Firebase codebase.

Follow these rules:

1. Read the existing project before changing architecture.
2. Reuse existing components and patterns when possible.
3. Do not introduce unnecessary dependencies.
4. Keep business logic separate from UI.
5. Centralize calculations.
6. Use TypeScript strictly.
7. Validate all important inputs.
8. Keep Firebase access organized.
9. Keep Firestore security rules aligned with the data model.
10. Do not expose secrets in client code.
11. Do not overbuild outside the approved scope.
12. Build in phases.
13. At the end of every phase, stop.
14. Do not start the next phase automatically.
15. Report what was completed, what was tested, and any known issues.
16. Wait for the user to explicitly approve the next phase.

---

# 47. Phase-by-Phase Build Plan

## PHASE 1 — Project Foundation

### Goal

Understand and prepare the existing Next.js project.

### Tasks

- Inspect the project structure.
- Confirm Next.js and TypeScript setup.
- Confirm shadcn/ui setup.
- Confirm Firebase setup or add the minimum required Firebase configuration.
- Establish environment variable structure.
- Establish a clean Firebase client/server access pattern.
- Set up base application layout.
- Set up global styles/theme.
- Set up authentication foundation.
- Create the initial app navigation shell.
- Create placeholder pages:
  - Dashboard
  - My IPOs
  - Application Accounts
  - Bank Accounts

### Acceptance Criteria

- Project runs successfully.
- No TypeScript errors.
- No major runtime errors.
- shadcn/ui components render correctly.
- Firebase configuration is organized.
- Authentication foundation is ready.
- Basic navigation works.
- The app is responsive at a basic level.

### Stop Condition

STOP after Phase 1.

Report:

- Files changed
- Firebase setup status
- Authentication status
- Tests/checks performed
- Known issues

Then wait for explicit permission to continue.

---

# PHASE 2 — Authentication & User Data Isolation

### Goal

Implement real authentication and secure user isolation.

### Tasks

- Implement Firebase Authentication.
- Add login.
- Add signup.
- Add logout.
- Add password reset.
- Add authenticated app layout.
- Create minimal user profile document if needed.
- Add Firestore security rules.
- Ensure users can only access their own data.
- Add route protection.

### Acceptance Criteria

- User can sign up.
- User can log in.
- User can log out.
- User can reset password.
- Unauthenticated users cannot access protected pages.
- User A cannot read User B's data.
- Auth state persists correctly.

### Stop Condition

STOP after Phase 2.

Report implementation and testing, then wait for permission.

---

# PHASE 3 — Application Accounts & Bank Accounts

### Goal

Build the reusable account setup required before tracking applications.

### Tasks

Implement Application Accounts:

- Create
- Edit
- Rename
- Archive
- Delete if safe
- My/Other grouping
- Default 40% profit share for Other Accounts
- 0% for My Accounts
- Custom profit share for Other Accounts

Implement Bank Accounts:

- Create
- Edit
- Rename
- Archive
- Delete if safe
- Bank name
- Nickname
- Last 4 digits
- Notes

Build clean list/table views.

### Acceptance Criteria

- User can create multiple My Accounts.
- User can create multiple Other Accounts.
- User can assign custom percentages.
- User can create multiple bank accounts.
- Archived records are excluded from active selectors.
- Data persists in Firestore.
- Security rules protect all records.

### Stop Condition

STOP after Phase 3.

---

# PHASE 4 — IPO Management

### Goal

Build IPO creation and the My IPOs experience.

### Tasks

- IPO list
- Add IPO
- Edit IPO
- Archive IPO
- Delete safely
- Search IPOs
- Filter by status
- IPO detail page
- IPO dates
- Price
- Lot size
- Notes
- IPO summary placeholders

### Acceptance Criteria

- User can add IPOs.
- User can edit IPOs.
- User can archive IPOs.
- User can search.
- IPO details display correctly.
- IPO status behaves sensibly.
- Data persists and is user-specific.

### Stop Condition

STOP after Phase 4.

---

# PHASE 5 — Application Tracking

### Goal

Build the core feature: applications linked to IPO + application account + bank account.

### Tasks

- Add application flow.
- Bulk account selection.
- My/Other grouping.
- Lots per selected account.
- Bank assignment.
- Review before save.
- Create multiple applications in one action.
- Application table inside IPO detail.
- Edit application.
- Delete application.
- Status badges.
- Amount and share calculations.
- Application date.
- Notes.

### Acceptance Criteria

A user can:

1. Open an IPO.
2. Select 10+ accounts.
3. Enter lots.
4. Assign the correct bank account to each.
5. Review the applications.
6. Save them all.
7. See correct amount/share calculations.
8. Edit or remove an application.

The bulk-entry process should remain usable on mobile.

### Stop Condition

STOP after Phase 5.

---

# PHASE 6 — Allotment & Money Tracking

### Goal

Make the application useful for real IPO tracking after allotment.

### Tasks

- Bulk allotment update.
- Allotted/not allotted updates.
- Allotted lots.
- Allotted shares.
- Money state calculations.
- IPO money summary.
- Bank-wise blocked money.
- Expected refunds.
- Invested amount.
- Application account summaries.
- Bank account summaries.

### Acceptance Criteria

For any IPO the system can correctly show:

- Total applied
- Pending
- Allotted
- Not allotted
- Currently blocked
- Invested
- Refund expected

For any bank account the system can correctly show:

- Related applications
- Blocked amount
- Invested amount

No duplicated or inconsistent totals.

### Stop Condition

STOP after Phase 6.

---

# PHASE 7 — Listing, Sale & Profit Sharing

### Goal

Track the financial outcome of allotted applications.

### Tasks

- Listing price
- Current price
- Sale details
- Gross profit
- Return %
- Account-level profit calculations
- 40% default profit share for Other Accounts
- Custom profit share
- Profit shared
- Your profit
- IPO profit summary
- Account profit summary
- Dashboard profit totals

### Acceptance Criteria

Example:

```text
Investment: ₹15,000
Sale Value: ₹20,400
Gross Profit: ₹5,400
Share: 40%

Profit Shared: ₹2,160
Your Profit: ₹3,240
```

The system must never calculate the 40% against the investment amount.

Verify calculations with multiple My and Other Accounts.

### Stop Condition

STOP after Phase 7.

---

# PHASE 8 — Dashboard, Search, Filters & Activity

### Goal

Complete the main usability layer.

### Tasks

- Real dashboard statistics
- Active IPOs
- Money by bank
- Recent activity
- Global/simple search
- Application filters
- Account filters
- Bank filters
- My/Other filters
- Useful empty states
- Loading states
- Error states
- Lightweight activity history

### Acceptance Criteria

Dashboard figures match underlying application data.

Search and filters do not expose another user's data.

Activity history contains only useful actions.

### Stop Condition

STOP after Phase 8.

---

# PHASE 9 — Export, Validation, Polish & Final QA

### Goal

Finish the product for reliable everyday use.

### Tasks

- CSV export
- Strong form validation
- Edge-case handling
- Mobile responsiveness
- Accessibility improvements
- Loading/error states
- Confirmation dialogs
- Toast feedback
- Firestore rule review
- Security review
- Calculation tests
- Cleanup unused code
- Remove unnecessary dependencies
- Final UI consistency pass

### QA Scenarios

Test at minimum:

1. One IPO with one application.
2. One IPO with 20 applications.
3. Multiple applications using the same bank account.
4. Applications across many bank accounts.
5. All applications not allotted.
6. All applications allotted.
7. Mixed allotment.
8. My Account profit.
9. Other Account with 40% share.
10. Other Account with custom share.
11. Fully sold position.
12. Pending applications and blocked money.
13. Archived account no longer selectable.
14. User A cannot access User B data.
15. Mobile add-application workflow.

### Stop Condition

STOP after Phase 9 and provide a final implementation report.

---

# 48. Master Prompt for the AI IDE Agent

Use the following as the main instruction when starting implementation:

---

You are the lead engineer building **IPO Tracker** inside this existing Next.js project.

Read the repository first and understand the current architecture before making changes.

The product is a simple personal IPO application tracker.

## Tech Stack

- Next.js
- TypeScript
- shadcn/ui
- Firebase Authentication
- Cloud Firestore

Use the existing project's conventions whenever possible.

## Product Goal

The user tracks IPO applications made through many simple application accounts and many bank accounts.

Application accounts are only labels:

- My Account 1
- My Account 2
- Other Account 1
- Other Account 2

Do not create people/contact management.

Bank accounts are simple tracking records such as:

- HDFC •1234
- SBI •5678

Do not integrate with actual banks.

For Other Accounts, profit share defaults to 40%, but the user can configure the percentage.

## Core Workflow

```text
Add Bank Accounts
        ↓
Add Application Accounts
        ↓
Add IPO
        ↓
Select multiple application accounts
        ↓
Assign bank account to each
        ↓
Enter lots
        ↓
Save applications
        ↓
Update allotment
        ↓
Track blocked/invested/refunded money
        ↓
Enter listing/current/sale price
        ↓
Calculate gross profit
        ↓
Apply profit sharing
        ↓
Show user's final profit
```

## Non-Negotiable Product Rules

- Keep the UX simple.
- Bulk application entry is essential.
- Bank-wise blocked money is essential.
- Application account and bank account are separate entities.
- Do not require names of friends/family.
- Do not require broker names.
- Do not require demat numbers.
- Do not integrate with banks, brokers, or UPI.
- Do not store passwords, PINs, OTPs, or similar secrets.
- Profit sharing applies to profit only.
- Other Accounts default to 40%.
- My Accounts default to 0%.
- Profit share is configurable per Other Account.
- Do not add notification features.
- Do not add unrelated IPO research/trading features.

## Core Pages

- Dashboard
- My IPOs
- Application Accounts
- Bank Accounts

IPO detail pages contain applications and investment details.

## Core Entities

- User
- IPO
- Application Account
- Bank Account
- Application
- Activity

## Core Application Fields

```text
IPO
Application Account
Bank Account
Application Date
Lots Applied
Shares Applied
Amount Applied
Status
Allotted Lots
Allotted Shares
Listing Price
Current Price
Shares Sold
Sale Price
Sale Date
Notes
```

## Application Status

Only use:

- pending
- allotted
- not_allotted
- sold

Do not invent additional status layers unless required to fix a real implementation issue.

## Core Financial Rules

```text
sharesApplied = lotsApplied × lotSize

amountApplied = lotsApplied × lotSize × issuePrice

investment = allottedShares × issuePrice

saleValue = sharesSold × salePrice

grossProfit = saleValue - (sharesSold × issuePrice)

profitShared = grossProfit × (sharePercent / 100)

yourProfit = grossProfit - profitShared
```

For unsold holdings, current value and unrealized profit may be shown using current price.

## Implementation Quality

- Strong TypeScript typing.
- Reusable calculation utilities.
- Reusable validation.
- Clean Firestore service layer.
- Secure Firestore rules.
- User-level data isolation.
- Good loading/error/empty states.
- Responsive UI.
- Accessible controls.
- Minimal dependencies.
- No duplicated business logic.

## Phase Execution Rule

Build exactly one phase at a time from the phase plan in this document.

At the beginning of each phase:

1. Read the current codebase.
2. Reconcile the phase with existing implementation.
3. Implement only what belongs to that phase.
4. Test the phase.
5. Check TypeScript/build/lint where available.
6. Fix issues introduced by that phase.
7. Report:
   - What was implemented
   - Files/areas changed
   - Tests/checks performed
   - Known issues or limitations
8. STOP.

Do not automatically continue to the next phase.

Only continue when the user explicitly says to proceed.

## Scope Discipline

Do not add new features because they seem interesting.

Before implementing anything not explicitly covered here, ask whether it is required for the current phase. Prefer leaving it out.

The success criterion is a **small, fast, reliable personal IPO tracker**, not a large financial platform.

---

# 49. Final Definition of Done

The product is complete when a user can:

1. Create bank accounts.
2. Create My and Other application accounts.
3. Configure Other Account profit-sharing percentages.
4. Create an IPO.
5. Select many accounts for that IPO.
6. Assign bank accounts.
7. Enter lots.
8. Save all applications together.
9. See exact application amounts.
10. Update allotment results quickly.
11. See money currently blocked in each bank.
12. See invested and expected refund amounts.
13. Enter listing/current/sale information.
14. See gross profit.
15. See profit shared with Other Accounts.
16. See their own final profit.
17. Search and filter records.
18. Review activity.
19. Export CSV data.
20. Use the entire site comfortably on desktop and mobile.
21. Keep all data private to their own Firebase account.

The application should remain focused on this workflow and nothing more.
