ere's the full guide. Dev server is at http://localhost:3301. The components are listed by what's easiest to find — top items  
 don't need any setup, bottom items need data (a dashboard with widgets, an alert, a funnel).

1. Sidebar — Help & Settings menus

File: src/container/SideNav/SideNav.tsx  
 Where to look: the left sidebar, scroll to the very bottom. Two icons sit there: a ? icon (Help & Support) and a gear icon  
 (Settings).  
 Click each → a menu pops up to the right.
Verify: items render with icons, divider lines between groups, click outside closes. Extra test: while the menu is open, cmd-click
(mac) / ctrl-click (linux) the "Shortcuts" item — should open shortcuts in a new tab, not navigate the current one.  
 URL: any page works, e.g. http://localhost:3301/

2. Alerts list — row "…" action menu

File: src/components/DropDown/DropDown.tsx (the shared wrapper, consumed here)  
 Where to look: the "Action" column at the right of each alert row — a three-dot (…) icon.
Click it → menu with Enable/Disable, Edit, etc.  
 URL: http://localhost:3301/alerts

3. Alerts list — column-filter button

File: src/components/ResizeTable/DynamicColumnTable.tsx  
 Where to look: the top-right of the alerts table — a sliders/filter icon ("additional filters" button).  
 Click → list of column names with a Switch next to each → toggle to hide/show columns.  
 URL: http://localhost:3301/alerts

4. Alert detail page — action menu in header

File: src/pages/AlertDetails/AlertHeader/ActionButtons/ActionButtons.tsx  
 Where to look: click any alert from the list to open detail page. Top-right of the header: an ellipsis (…) icon next to the  
 enable/disable toggle.  
 Click → Rename / Duplicate / Delete (Delete is red — that's the new danger: true styling).
URL: alerts list → click any alert.

5. Dashboards list — "New dashboard" split menu

File: src/container/ListOfDashboard/DashboardsList.tsx  
 Where to look: top-right of the dashboards page — a blue "New dashboard" button (or in the empty state, a "New Dashboard" button in
the center).  
 Click → menu with Create dashboard / Import JSON / View templates.
URL: http://localhost:3301/dashboard

6. Widget kebab menu (on a dashboard panel)

File: src/container/GridCardLayout/WidgetHeader/index.tsx  
 Where to look: open any dashboard with at least one panel. Hover over a panel — top-right of the panel header shows a
vertical-ellipsis icon (⋮).  
 Click (note: was hover-trigger before, now click — this is the intentional behavior change) → View / Edit / Clone / Create Alert /
Download / Delete.  
 URL: http://localhost:3301/dashboard/<dashboardId> — open any dashboard from list.

7. Widget builder — Columns add panel

File: src/container/NewWidget/LeftContainer/ExplorerColumnsRenderer.tsx  
 Where to look: from a dashboard, click "+ Add panel" (or edit an existing panel). In the panel builder, in the left "Columns"
section, there's a plus (+) button next to the column chips.  
 Click → a panel pops up above the button with a Search input + scrollable list of attribute keys to add as columns.  
 URL: http://localhost:3301/dashboard/<dashboardId>/new (a dashboard must already exist)

8. Widget builder — Threshold color picker

File: src/container/NewWidget/RightContainer/Threshold/ColorSelector.tsx  
 Where to look: same widget builder, scroll the right-side config panel to "Thresholds" → click "+ Add threshold" → on the new  
 threshold row, click the colored swatch button.  
 Click → Red / Orange / Green / Blue / Custom Color (Custom Color opens a nested color picker on hover).

9. Funnel step — Latency pointer picker

File: src/pages/TracesFunnelDetails/components/FunnelConfiguration/FunnelStep.tsx  
 Where to look: Traces Funnels page → open or create a funnel → expand a step's config. At the bottom of the step there's "Latency
pointer" with a dropdown trigger showing the current pointer + a down-chevron.  
 Click → list of pointer options with radio dots (this is the new selection UI — was previously a background highlight).  
 URL: http://localhost:3301/traces-funnels

10. Download button (Excel / CSV)

File: src/container/Download/Download.tsx  
 Where to look (easiest): any APM service detail page → scroll to the Top Operations table → top-right has a "Download" link with a
cloud icon.  
 Click → Excel / CSV options.
URL: http://localhost:3301/services/<service-name> — pick any service.  
 Also rendered (same component) on: Logs Explorer toolbar (/logs/logs-explorer) and any explorer page rendering a QueryTable.

11. Explorer card — saved view delete

File: src/components/ExplorerCard/ExplorerCard.tsx  
 Where to look: currently not visible in the UI — the parent component sets showSaveView = false (see ExplorerCard.tsx:165). The
migration is correct but you won't see it unless that flag is flipped. Skip this one.

---

Quick verification priority

If you only have time for a few, hit these — they cover all three migration patterns (Simple, compositional-controlled,
compositional-with-cmd-click):

1. Sidebar Help menu + cmd-click on "Shortcuts" (covers SideNav compositional + onOpenChange + native MouseEvent handling)
2. Widget kebab ⋮ on a dashboard panel (covers hover→click behavior change)
3. Column "+" panel in widget builder (covers controlled-open + custom content compositional API)
4. Any alert row … on /alerts (covers the shared DropDown wrapper)
