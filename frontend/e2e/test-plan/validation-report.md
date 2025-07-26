# SigNoz Test Plan Validation Report

This report documents the validation of the E2E test plan against the current live application using Playwright MCP. Each module is reviewed for coverage, gaps, and required updates.

---

## Home Module

- **Coverage:**
  - Widgets for logs, traces, metrics, dashboards, alerts, services, saved views, onboarding checklist
  - Quick access buttons: Explore Logs, Create dashboard, Create an alert
- **Gaps/Updates:**
  - Add scenarios for checklist interactions (e.g., “I’ll do this later”, progress tracking)
  - Add scenarios for Saved Views and cross-module links
  - Add scenario for onboarding checklist completion

---

## Logs Module

- **Coverage:**
  - Explorer, Pipelines, Views tabs
  - Filtering by service, environment, severity, host, k8s, etc.
  - Search, save view, create alert, add to dashboard, export, view mode switching
- **Gaps/Updates:**
  - Add scenario for quick filter customization
  - Add scenario for “Old Explorer” button
  - Add scenario for frequency chart toggle
  - Add scenario for “Stage & Run Query” workflow

---

## Traces Module

- **Coverage:**
  - Tabs: Explorer, Funnels, Views
  - Filtering by name, error status, duration, environment, function, service, RPC, status code, HTTP, trace ID, etc.
  - Search, save view, create alert, add to dashboard, export, view mode switching (List, Traces, Time Series, Table)
  - Pagination, quick filter customization, group by, aggregation
- **Gaps/Updates:**
  - Add scenario for quick filter customization
  - Add scenario for “Stage & Run Query” workflow
  - Add scenario for all view modes (List, Traces, Time Series, Table)
  - Add scenario for group by/aggregation
  - Add scenario for trace detail navigation (clicking on trace row)
  - Add scenario for Funnels tab (create/edit/delete funnel)
  - Add scenario for Views tab (manage saved views)

---

## Metrics Module

- **Coverage:**
  - Tabs: Summary, Explorer, Views
  - Filtering by metric, type, unit, etc.
  - Search, save view, add to dashboard, export, view mode switching (chart, table, proportion view)
  - Pagination, group by, aggregation, custom queries
- **Gaps/Updates:**
  - Add scenario for Proportion View in Summary
  - Add scenario for all view modes (chart, table, proportion)
  - Add scenario for group by/aggregation
  - Add scenario for custom queries in Explorer
  - Add scenario for Views tab (manage saved views)

---

## Dashboards Module

- **Coverage:**
  - List, search, and filter dashboards
  - Create new dashboard (button and template link)
  - Edit, delete, and view dashboard details
  - Add/edit/delete widgets (implied by dashboard detail)
  - Pagination through dashboards
- **Gaps/Updates:**
  - Add scenario for browsing dashboard templates (external link)
  - Add scenario for requesting new template
  - Add scenario for dashboard owner and creation info
  - Add scenario for dashboard tags and filtering by tags
  - Add scenario for dashboard sharing (if available)
  - Add scenario for dashboard image/preview

---

## Messaging Queues Module

- **Coverage:**
  - Overview tab: queue metrics, filters (Service Name, Span Name, Msg System, Destination, Kind)
  - Search across all columns
  - Pagination of queue data
  - Sync and Share buttons
  - Tabs for Kafka and Celery
- **Gaps/Updates:**
  - Add scenario for Kafka tab (detailed metrics, actions)
  - Add scenario for Celery tab (detailed metrics, actions)
  - Add scenario for filter combinations and edge cases
  - Add scenario for sharing queue data
  - Add scenario for time range selection

---

## External APIs Module

- **Coverage:**
  - Accessed via side navigation under MORE
  - Explorer tab: domain, endpoints, last used, rate, error %, avg. latency
  - Filters: Deployment Environment, Service Name, Rpc Method, Show IP addresses
  - Table pagination
  - Share and Stage & Run Query buttons
- **Gaps/Updates:**
  - Add scenario for customizing quick filters
  - Add scenario for running and staging queries
  - Add scenario for sharing API data
  - Add scenario for edge cases in filters and table data

---

## Alerts Module

- **Coverage:**
  - Alert Rules tab: list, search, create (New Alert), edit, delete, enable/disable, severity, labels, actions
  - Triggered Alerts tab (visible in tablist)
  - Configuration tab (visible in tablist)
  - Table pagination
- **Gaps/Updates:**
  - Add scenario for triggered alerts (view, acknowledge, resolve)
  - Add scenario for alert configuration (settings, integrations)
  - Add scenario for edge cases in alert creation and management
  - Add scenario for searching and filtering alerts

---

## Integrations Module

- **Coverage:**
  - Integrations tab: list, search, configure (e.g., AWS), request new integration
  - One-click setup for AWS monitoring
  - Request more integrations (form)
- **Gaps/Updates:**
  - Add scenario for configuring integrations (step-by-step)
  - Add scenario for searching and filtering integrations
  - Add scenario for requesting new integrations
  - Add scenario for edge cases (e.g., failed configuration)

---

## Exceptions Module

- **Coverage:**
  - All Exceptions: list, search, filter (Deployment Environment, Service Name, Host Name, K8s Cluster/Deployment/Namespace, Net Peer Name)
  - Table: Exception Type, Error Message, Count, Last Seen, First Seen, Application
  - Pagination
  - Exception detail links
  - Share and Stage & Run Query buttons
- **Gaps/Updates:**
  - Add scenario for exception detail view
  - Add scenario for advanced filtering and edge cases
  - Add scenario for sharing and running queries
  - Add scenario for error grouping and navigation

---

## Service Map Module

- **Coverage:**
  - Service Map visualization (main graph)
  - Filters: environment, resource attributes
  - Time range selection
  - Sync and Share buttons
- **Gaps/Updates:**
  - Add scenario for interacting with the map (zoom, pan, select service)
  - Add scenario for filtering and edge cases
  - Add scenario for sharing the map
  - Add scenario for time range and environment combinations

---

## Billing Module

- **Coverage:**
  - Billing overview: cost monitoring, invoices, CSV download (disabled), manage billing (disabled)
  - Teams Cloud section
  - Billing table: Unit, Data Ingested, Price per Unit, Cost (Billing period to date)
- **Gaps/Updates:**
  - Add scenario for invoice download and management (when enabled)
  - Add scenario for cost monitoring and edge cases
  - Add scenario for billing table data validation
  - Add scenario for permissions and access control

---

## Usage Explorer Module

- **Status:**
  - Not accessible in the current environment. Removing from test plan flows.

---

## [Next modules will be filled as validation proceeds]
