# Home Page Test Plan

## Overview

The SigNoz home page (`/home`) is the landing page after login. It provides:
- Ingestion status indicators for Logs, Traces, and Metrics
- Quick-action explore/create buttons
- Live summary widgets: Alerts, Dashboards, Services, Saved Views
- Onboarding checklist (step progress)

## Test Cases

### TC-01: Home page loads after login `@viewer`
- Navigate to `/home`
- Verify URL contains `/home`
- Verify heading "Hello there, Welcome to your SigNoz workspace" is visible
- Verify page title contains "Home"

### TC-02: Ingestion status banners are visible `@viewer`
- Navigate to `/home`
- Verify "Logs ingestion is active" text is visible
- Verify "Traces ingestion is active" text is visible
- Verify "Metrics ingestion is active" text is visible

### TC-03: Explore Logs navigates to logs explorer `@viewer`
- Click "Explore Logs" button
- Verify URL contains `/logs/logs-explorer`

### TC-04: Explore Traces navigates to traces explorer `@viewer`
- Click "Explore Traces" button
- Verify URL contains `/traces-explorer`

### TC-05: Explore Metrics navigates to metrics explorer `@viewer`
- Click "Explore Metrics" button
- Verify URL contains `/metrics-explorer`

### TC-06: Open Logs Explorer shortcut navigates `@viewer`
- Click "Open Logs Explorer" button
- Verify URL contains `/logs/logs-explorer`

### TC-07: Open Traces Explorer shortcut navigates `@viewer`
- Click "Open Traces Explorer" button
- Verify URL contains `/traces-explorer`

### TC-08: Open Metrics Explorer shortcut navigates `@viewer`
- Click "Open Metrics Explorer" button
- Verify URL contains `/metrics-explorer`

### TC-09: Create dashboard button navigates `@editor`
- Click "Create dashboard" button
- Verify URL contains `/dashboard`

### TC-10: Create an alert button navigates `@editor`
- Click "Create an alert" button
- Verify URL contains `/alerts`

### TC-11: Services table is visible with correct columns `@viewer`
- Verify "Services" section heading is visible
- Verify table columns: APPLICATION, P99 LATENCY, ERROR RATE, OPS / SEC
- Verify at least one service row is present

### TC-12: All Services link navigates `@viewer`
- Click "All Services" link
- Verify URL contains `/services`

### TC-13: Alerts section shows firing alerts `@viewer`
- Verify "Alerts" section heading is visible
- Verify at least one alert item is listed

### TC-14: All Alert Rules link navigates `@viewer`
- Click "All Alert Rules" button/link
- Verify URL contains `/alerts`

### TC-15: Dashboards section shows recent dashboards `@viewer`
- Verify "Dashboards" section heading is visible
- Verify at least one dashboard item is listed

### TC-16: All Dashboards link navigates `@viewer`
- Click "All Dashboards" button/link
- Verify URL contains `/dashboard`

### TC-17: Saved Views tabs switch between signal types `@viewer`
- Verify "Saved Views" section is visible
- Verify Logs tab is active by default
- Click "Traces" tab, verify it becomes active
- Click "Metrics" tab, verify it becomes active
- Click "Logs" tab, verify it returns to active

### TC-18: All Views link navigates `@viewer`
- Ensure Logs tab is active in Saved Views
- Click "All Views" link
- Verify URL contains `/logs/saved-views`
