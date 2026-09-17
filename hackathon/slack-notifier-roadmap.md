# Roadmap: Slack Notifier + Webhook Receiver (Go)

Owner's part of SRE Sidekick: the Slack adapter (`Notifier` interface, PRD
section 18) plus the `watch` webhook mode, per PRD sections 12 (Detect) and
14 (Communicate). Scope and contracts below come only from the PRD
(`telemetry-health-auditor-prd.md`), not from any existing code.

---

## Phase 0 — Contracts first (don't touch Slack yet)

Add `internal/notify/notifier.go` inside the single Go service `sre-sidekick`
(PRD section 18):

```go
type Notifier interface {
    NotifyDiagnosis(ctx context.Context, d Diagnosis) error
    NotifyIndeterminate(ctx context.Context, reason IndeterminateReason) error
}
```

- Define `Diagnosis` struct mirroring the PRD section 13.3 JSON contract:
  `Service`, `Window`, `Status` (`diagnosed` | `indeterminate`),
  `Grounding{SLO, SLOState, BurnRate, ErrorBudgetRemaining,
  TelemetryTrusted}`, `RootCause`, `Confidence`, `Evidence[]` (`Kind`,
  `SignozLink`, `Note`), `ProposedFix`, `Reversible`; when `Status` is
  `indeterminate`, `RootCause`/`ProposedFix` are omitted and a
  `MissingEvidence[]` list is included instead.
- The audit output must never contain `slo_status`, `slo_compliance`,
  `error_budget_remaining`, `burn_rate`, or per-SLO impact (section 7) - the
  Slack layer only ever displays these deterministic facts, never computes
  them.
- This lets you build and test the Slack adapter with a fake `Diagnosis`
  before the RCA agent (Track C) exists - unblocks you immediately.

## Phase 1 — Slack app skeleton

- MVP adapter is a full Slack app: bot token, `chat.postMessage`, Block Kit
  formatting, and a `/diagnose` slash command (section 14) - not a bare
  incoming webhook.
- Go lib: `github.com/slack-go/slack` (bot API + Block Kit + slash command
  verification).
- `internal/notify/slack/client.go`: wraps the Slack client, config (target
  channel, token from env).

## Phase 2 — Message formatting (Block Kit)

- `internal/notify/slack/blocks.go`: pure functions
  `DiagnosisBlocks(d Diagnosis) []Block` and
  `IndeterminateBlocks(r IndeterminateReason) []Block`.
- Message contract (section 14), in order:
  1. Deterministic grounding block: SLO, state, budget, burn, trusted or
     indeterminate.
  2. Root cause, or the indeterminate reason.
  3. Evidence deep links to SigNoz.
  4. The recommended advisory action.
- Interactivity in the MVP is limited to acknowledgement; the loop is
  advisory only, so there is no execute button (section 14).
- Natural-language phrasing is the only LLM-authored part of the message;
  facts, numbers, and links stay deterministic (section 14) - block layout
  and data plumbing are code, never generated text.
- Every message is logged with a correlation id (sections 14, 20).
- Unit test with fixed `Diagnosis` values -> assert block structure, no
  live Slack call needed.

## Phase 3 — Implement `Notifier` for Slack

- `NotifyDiagnosis`: build blocks, post to the on-call channel.
- Log every message (correlation id, channel, timestamp) for audit
  (section 20: every diagnosis, message, approval, and action is logged).
- Handle transient Slack API failures with retry/backoff; a failure here
  must never affect the deterministic engine (section 25 risk: MCP/LLM
  failures should not take down grounding).

## Phase 4 — `/diagnose` slash command (human `ask` path)

- The human `ask` path is a Slack slash command behind the same entry point
  as the alert-driven trigger, but is not the MVP demo trigger (section 12).
- Verify the Slack request signature, parse the command, ack within Slack's
  time budget, then trigger the diagnose flow asynchronously and post the
  result back to the channel.
- This shares the sidekick's `watch` mode HTTP server (section 18) with the
  alert webhook receiver (section 12) - the alert webhook itself is not
  your part, but the server and routing are shared.

## Phase 5 — Config

- Config file `sidekick.yaml` (slack, llm provider, presentation rules) per
  section 18's file layout:

```yaml
notify:
  slack:
    bot_token_env: SLACK_BOT_TOKEN
    signing_secret_env: SLACK_SIGNING_SECRET
    default_channel: "#sre-sidekick"
```

- Load with a typed YAML loader (`internal/config`, section 18).

## Phase 6 — Fake/test harness

- `internal/notify/fake.go`: in-memory `Notifier` recording calls, so other
  tracks (RCA, Act) can be tested against the `Notifier` interface before
  Slack is wired live (section 22: adapter contract tests with a fake
  transport; assert approvals are logged).
- Integration test: fake Slack HTTP endpoint, assert posted blocks match the
  message contract in section 14.

## Phase 7 — Wire into the loop

- Detect -> Ground -> Diagnose -> Communicate -> Act -> Verify (section 4).
  Your stage is Communicate: once grounding (Track B) and diagnosis
  (Track C) produce a `Diagnosis`, call `NotifyDiagnosis`.
- If the completeness gate says telemetry is not trusted, the sequence
  (section 9.3) skips RCA entirely and calls `NotifyIndeterminate` directly
  with the missing-evidence reason.
- The loop runs one pass and then stops for human review (section 21,
  decision 7) - the notifier's job ends at posting; it never triggers Act.

## Phase 8 — Demo polish

- Emit `sidekick_incidents{service,status}` around notify calls (section
  17's metrics table) so the loop shows up in SigNoz dashboards too.
- Verify against the demo script (section 23): healthy run shows no
  message; dropped metric -> indeterminate Slack message ("telemetry
  incomplete, cannot diagnose reliably"); buggy mode -> burn-rate alert ->
  grounded diagnosis Slack message with root cause, evidence links, and
  recommended advisory action, then the sidekick stops for human review.

---

## Suggested file layout (per PRD section 18)

```text
sre-sidekick/
  internal/notify/
    notifier.go        # interface + Diagnosis/IndeterminateReason types
    fake.go            # test double
    slack/
      client.go
      blocks.go
      blocks_test.go
      command.go
      http.go
      client_test.go
  configs/
    sidekick.yaml
```

## Order to actually code (priority)

1. `notifier.go` contracts + fake (unblocks everyone else on the team).
2. `blocks.go` + tests (no network needed, fast iteration).
3. `client.go` real Slack post, manual test in a real workspace.
4. `command.go` + `http.go` slash command + signature verify.
5. Wire into `watch` mode's HTTP server.
6. Config loader + env docs.
