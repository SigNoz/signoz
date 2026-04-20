# Dashboards List — Functional Checklist

Route: `/dashboard` | Title: `SigNoz | All Dashboards`

---

## Page Load

- [ ] Heading "Dashboards" and subtitle "Create and manage dashboards for your workspace." are visible
- [ ] "Browse dashboard templates" link is visible
- [ ] "Enter dashboard name..." input is visible (Admin / Editor only; not shown to Viewer)
- [ ] "Search by name, description, or tags..." input is visible
- [ ] "New dashboard" button is visible (Admin / Editor only; not shown to Viewer)
- [ ] "All Dashboards" label and sort toggle button are visible
- [ ] Table rows show a two-row layout: top row has thumbnail, name, tags, and action icon; bottom row has clock icon, last-updated timestamp, creator avatar, and creator email
- [ ] URL on default load is `/dashboard` with no query parameters
- [ ] Dashboards with more tags than fit show a `+ N` overflow indicator
- [ ] Dashboards with no tags show a clean row (no empty tag containers)
- [ ] If more than 20 dashboards exist, a pagination bar is shown ("1 — 20 of N")

---

## Search

- [ ] Typing filters list by name, description, or tags in real time
- [ ] URL updates to `?search=<term>`; navigating to that URL pre-fills search and filters list
- [ ] Clearing search restores the full list; `search` param is removed from the URL
- [ ] No-match search shows an empty state with no error and no broken layout
- [ ] Search is case-insensitive
- [ ] Searching while on page 2+ resets pagination to page 1

---

## Sorting

- [ ] Clicking the sort toggle next to "All Dashboards" sorts the list by updated date descending
- [ ] Clicking the sort toggle again does not flip to ascending — current behavior is descend only
- [ ] Clicking the sort toggle does not add or change URL query parameters

---

## Row Actions (three-dot menu) — Admin and Editor

- [ ] The action icon (`dashboard-action-icon`) is visible only for Admin and Editor; Viewer sees no action icon
- [ ] Clicking the action icon reveals a popover with exactly five items for Admin: View, Open in New Tab, Copy Link, Export JSON, Delete dashboard
- [ ] Clicking the action icon reveals a popover with exactly four items for Editor: View, Open in New Tab, Copy Link, Export JSON (no Delete dashboard)
- [ ] **View** — navigates to `/dashboard/<uuid>`; breadcrumb "Dashboard /" + name visible
- [ ] **Open in New Tab** — opens `/dashboard/<uuid>` in a new tab
- [ ] **Copy Link** — success feedback shown; clipboard contains the dashboard URL
- [ ] **Export JSON** — file download triggered; downloaded file is valid JSON
- [ ] Pressing Escape closes the popover; page stays on `/dashboard`

---

## Creating Dashboards _(Editor / Admin only)_

- [ ] Submit button is disabled when "Enter dashboard name..." input is empty
- [ ] Typing a name enables Submit; clicking Submit navigates to `/dashboard/<uuid>` with the typed name as the dashboard title
- [ ] **New dashboard** dropdown has exactly three items: Create dashboard, Import JSON, View templates
- [ ] **New dashboard → Create dashboard** — navigates to a new dashboard; default title is "Sample Title"; onboarding state shows Configure and New Panel buttons
- [ ] **New dashboard → Import JSON** — opens a dialog titled "Import Dashboard JSON" with a Monaco code editor, "Upload JSON file" button, "View templates" link, and "Import and Next" button
- [ ] Import dialog closes on Escape or clicking ×; no dashboard is created
- [ ] **New dashboard → View templates** — opens the external SigNoz docs templates link in a new tab

---

## Deleting Dashboards _(Admin only)_

- [ ] Action menu → Delete dashboard shows a confirmation dialog with a level-5 heading, the dashboard name in bold/emphasis, and Cancel and Delete buttons
- [ ] Clicking Cancel closes the dialog and navigates to the dashboard detail page (known current behavior — does not remain on the list page)
- [ ] Clicking Delete (confirm) removes the dashboard from the list; all other dashboards are unaffected

---

## Navigation

- [ ] Clicking a row (not the action icon) navigates to `/dashboard/<uuid>`; breadcrumb is visible
- [ ] Sidebar "Dashboards" link navigates to `/dashboard`

---

## URL / Deep-link State

- [ ] `/dashboard?search=PromQL` pre-fills search and filters the list on load
- [ ] Browser Back after navigating into a dashboard restores the search state (search param preserved)
- [ ] Sort state is not reflected in the URL and cannot be deep-linked

---

## Role Permissions

| Action                                     | Viewer | Editor | Admin |
| ------------------------------------------ | ------ | ------ | ----- |
| View / search / navigate                   | ✓      | ✓      | ✓     |
| See sort toggle                            | ✓      | ✓      | ✓     |
| See "Enter dashboard name..." input        | ✗      | ✓      | ✓     |
| See "New dashboard" button                 | ✗      | ✓      | ✓     |
| Create dashboards                          | ✗      | ✓      | ✓     |
| See three-dot action menu icon             | ✗      | ✓      | ✓     |
| Use View / Open in New Tab / Copy / Export | ✗      | ✓      | ✓     |
| Delete dashboards                          | ✗      | ✗      | ✓     |
