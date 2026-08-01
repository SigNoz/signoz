# SigNoz MCP Server — Integration Reference & Maintenance Audit

> Working doc for keeping the product-side MCP integration in `signoz/signoz` in
> sync with the standalone [`SigNoz/signoz-mcp-server`](https://github.com/SigNoz/signoz-mcp-server).
>
> Status: **living document** · Server version audited: **v0.10.0**

---

## 1. Why this doc exists

The MCP (Model Context Protocol) server that lets AI assistants query SigNoz
lives in its **own repository**, `SigNoz/signoz-mcp-server`. The main product
(`signoz/signoz`) only ships the *integration surface* for it:

- a Settings page that helps users connect their MCP client, and
- backend config that advertises the hosted MCP endpoint to the frontend.

Because the two repos ship on different cadences, the product-side integration
drifts out of date whenever the server adds a tool, a client, a transport, or an
auth mode. This document is the single place to:

1. record the **current capabilities** of the MCP server (so we don't have to
   re-read its README every time), and
2. **audit** the `signoz/signoz` integration against it and track the gaps.

If you bump the server version, update Section 3 and re-run the checklist in
Section 5.

---

## 2. Where the integration lives in `signoz/signoz`

| Concern | Location |
| --- | --- |
| Settings UI (client tabs, auth, use cases) | `frontend/src/container/MCPServerSettings/` |
| Supported MCP clients + install snippets | `frontend/src/container/MCPServerSettings/clients.ts` |
| "What you can do with it" copy | `frontend/src/container/MCPServerSettings/UseCasesCard/UseCasesCard.tsx` |
| Non-cloud fallback panel | `frontend/src/container/MCPServerSettings/NotCloudFallback/NotCloudFallback.tsx` |
| Route / nav entry | `frontend/src/constants/routes.ts`, `frontend/src/container/SideNav/menuItems.tsx` |
| Hosted endpoint config (`mcp_url`) | `pkg/global/config.go`, `pkg/global/signozglobal/provider.go`, `conf/example.yaml` |
| Docs deep-links | `MCP_DOCS_URL` / `MCP_USE_CASES_URL` in `clients.ts` → `/docs/ai/signoz-mcp-server/`, `/docs/ai/use-cases/` |

Key runtime behavior (from `MCPServerSettings.tsx`):

- The page reads the hosted endpoint from the global config field `mcp_url`
  (`useGetGlobalConfig().data.mcp_url`). If it is **empty**, the page renders
  `NotCloudFallback` instead of the connect flow — i.e. the connect UI is only
  shown when the deployment advertises a hosted MCP URL.
- The instance URL shown in the auth card comes from the Zeus hosts API
  (`useGetHosts`) for cloud users, falling back to `getBaseUrl()`.
- Auth is service-account-API-key based; there is a shortcut to create a service
  account from the auth card.

---

## 3. Server capabilities snapshot (v0.10.0)

Source of truth: `signoz-mcp-server` `README.md` and `server.json`.
Tool names are the wire names exposed to MCP clients (all `signoz_`-prefixed).

### 3.1 Tool catalogue (~43 tools)

**Metrics**
`signoz_list_metrics` · `signoz_query_metrics` · `signoz_get_top_metrics` ·
`signoz_check_metric_usage` · `signoz_check_metric_cardinality`

**Alerts**
`signoz_list_alerts` · `signoz_list_alert_rules` · `signoz_get_alert` ·
`signoz_get_alert_history` · `signoz_create_alert` · `signoz_update_alert` ·
`signoz_delete_alert`

**Dashboards**
`signoz_list_dashboards` · `signoz_get_dashboard` · `signoz_create_dashboard` ·
`signoz_update_dashboard` · `signoz_patch_dashboard` · `signoz_delete_dashboard` ·
`signoz_import_dashboard` · `signoz_list_dashboard_templates`

**Traces**
`signoz_list_services` · `signoz_get_service_top_operations` ·
`signoz_search_traces` · `signoz_aggregate_traces` · `signoz_get_trace_details`

**Logs**
`signoz_search_logs` · `signoz_aggregate_logs`

**Saved views**
`signoz_list_views` · `signoz_get_view` · `signoz_create_view` ·
`signoz_update_view` · `signoz_delete_view`

**Notification channels**
`signoz_list_notification_channels` · `signoz_get_notification_channel` ·
`signoz_create_notification_channel` · `signoz_update_notification_channel` ·
`signoz_delete_notification_channel`

**Field discovery**
`signoz_get_field_keys` · `signoz_get_field_values`

**Documentation**
`signoz_search_docs` · `signoz_fetch_doc`

**Advanced queries**
`signoz_execute_builder_query`

### 3.2 Transports

- **stdio** — default; direct binary/Docker execution configured in the client.
- **HTTP** — server listens on a configurable port; supports OAuth 2.1 for
  multi-tenant deployments. This is what the SigNoz Cloud hosted endpoint uses.

### 3.3 Authentication

1. **Direct API key** (stdio & simple HTTP): `SIGNOZ_URL` + `SIGNOZ_API_KEY`.
2. **HTTP header**: `SIGNOZ-API-KEY` header.
3. **OAuth 2.1** (HTTP multi-tenant): `OAUTH_ENABLED=true` with
   `OAUTH_TOKEN_SECRET` and `OAUTH_ISSUER_URL`; interactive browser auth.

### 3.4 Distribution

- OCI image `docker.io/signoz/signoz-mcp-server:v0.10.0`
- GitHub Releases binaries · `go install` · `make build`
- Hosted: `https://mcp.<region>.signoz.cloud/mcp`

### 3.5 Clients with first-class docs/install

Cursor · VS Code / GitHub Copilot · Claude Desktop · Claude Code · OpenAI Codex.

These map 1:1 to `MCP_CLIENTS` in `clients.ts` (`cursor`, `claude-code`,
`vscode`, `claude-desktop`, `codex`, plus a generic `other`). ✅ In sync as of
v0.10.0.

---

## 4. Audit: product-side vs. server (v0.10.0)

| Area | Server (v0.10.0) | `signoz/signoz` integration | Verdict |
| --- | --- | --- | --- |
| Client list | 5 named clients + generic | `MCP_CLIENTS` covers all 5 + `other` | ✅ In sync |
| One-click install | Cursor, VS Code deep-links documented | Implemented for `cursor`, `vscode` | ✅ In sync |
| Transport | stdio + HTTP(OAuth) | UI is HTTP-hosted-endpoint only (correct for Cloud) | ✅ Appropriate |
| Auth | API key / header / OAuth 2.1 | Service-account API key flow | ✅ Appropriate for Cloud UI |
| Endpoint discovery | `mcp.<region>.signoz.cloud/mcp` | `mcp_url` from global config, fallback panel when unset | ✅ In sync |
| Tool catalogue | ~43 tools | **Not surfaced anywhere in-product** | ⚠️ Gap — see 4.1 |
| Use-case copy | Rich examples in docs | 4 static bullets in `UseCasesCard` | ➖ Fine, links out |

### 4.1 Identified gap — no in-product tool catalogue

Neither the Settings page nor any in-repo doc lists *what the assistant can
actually do* (the tool catalogue). Users only get four example bullets and a
docs link. As the server crosses ~43 tools spanning metrics, traces, logs,
alerts, dashboards, saved views and notification channels, a discoverable
capability list would materially help users understand the value before
connecting.

This doc (Section 3.1) is the first step: an in-repo, version-pinned catalogue
that the Settings page copy and docs links can reference, and that reviewers can
diff against on every server bump.

---

## 5. Maintenance checklist (run on every server release)

When `signoz-mcp-server` cuts a release:

- [ ] Update the **version** and **tool catalogue** in Section 3 of this doc.
- [ ] Diff the server's supported-clients list against `MCP_CLIENTS` in
      `clients.ts`; add/remove clients and install deep-links as needed.
- [ ] Confirm the hosted endpoint pattern (`mcp.<region>.signoz.cloud/mcp`)
      still matches what `mcp_url` is populated with.
- [ ] If new auth modes ship, verify the auth-card copy in `AuthCard.tsx` is
      still accurate.
- [ ] Re-run the frontend verification gate for any touched files
      (`pnpm tsgo --noEmit`, `pnpm lint:js --quiet`, `pnpm oxlint <files>`,
      relevant `__tests__`).

---

## 6. Access / ownership notes

- The MCP **server code** is maintained in `SigNoz/signoz-mcp-server`. Changes
  to tools, transports, and auth land there.
- The MCP **product integration** (this repo) is maintained under
  `frontend/src/container/MCPServerSettings/` and the `mcp_url` global config.
- Cross-repo changes (e.g. a new tool that needs new UI copy) require a PR in
  each repo; use this doc to keep them coordinated.

---

_Last audited against `signoz-mcp-server` v0.10.0._
