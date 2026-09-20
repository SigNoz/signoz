# AI Vision integration tests

Run commands from the repository root against a test environment.

## OceanBase query tests

Requires Node.js, Go, and a running OceanBase instance.

```bash
GOFLAGS=-mod=readonly node integration/signoz-ob-ai-vision/test-main.mjs
```

Set `SIGNOZ_TEST_OCEANBASE_DSN` to the test database DSN. If unset, the script
uses Docker to read the DSN from `SIGNOZ_E2E_CONTAINER` (default: `signoz-ob-e2e`)
and replaces its address with `SIGNOZ_TEST_OCEANBASE_ADDRESS`
(default: `127.0.0.1:2881`). `GO_BINARY` optionally selects the Go executable.

Tests create and drop their own `sn_test_*` temporary tables.

## HTTP smoke tests

The Python standard-library script writes synthetic traces, logs, and metrics
through a test gateway and verifies SigNoz queries. Set `SIGNOZ_API_KEY`,
`SIGNOZ_ORG_ID`, `AIVISION_SPACE_ID`, and `AIVISION_USER_ID` for the same test
identity. Set `AIVISION_INGEST_AUTHORIZATION` to the gateway's complete
Authorization header value, including the `Bearer ` prefix when required.
Adjust the URLs for your environment.

```bash
python3 integration/signoz-ob-ai-vision/smoke.py \
  --collector-url http://127.0.0.1:4318 \
  --query-url http://127.0.0.1:18091 \
  --query-api-key-env SIGNOZ_API_KEY \
  --collector-header-env Authorization=AIVISION_INGEST_AUTHORIZATION \
  --org-id "$SIGNOZ_ORG_ID" \
  --space-id "$AIVISION_SPACE_ID" \
  --user-id "$AIVISION_USER_ID"
```

To also verify the AI Vision backend, set `AI_VISION_JWT` to the user's login
token and append these arguments. `AIVISION_USER_ID` must match that user's
`work_id`:

```bash
  --ai-vision-url http://127.0.0.1:8001 \
  --ai-vision-space-id "$AIVISION_SPACE_ID" \
  --ai-vision-token-env AI_VISION_JWT
```

The gateway token must match the organization, space, and user used for queries.
