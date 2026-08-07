# Cold Storage (S3) for Logs

Cold storage moves logs from a hot ClickHouse tier into an S3-backed tier once they age past a configured TTL. SigNoz keeps the hot tier fast for recent queries and uses S3 for older logs.

This page covers self-hosted deployments. Cloud and Enterprise manage storage for you, so most of this page does not apply.

## What is supported

| Signal | Cold storage |
|--------|--------------|
| Logs   | Supported via the General Settings UI and the `setRetentionApiV2` endpoint |
| Metrics | Not supported |
| Traces  | Not supported |

Cold storage for logs requires two things in your deployment:

1. A ClickHouse storage policy that includes an S3 volume. The SigNoz install scripts configure one when you bring your own S3 bucket.
2. A non-empty `cold_storage_volume` and a positive `cold_storage_ttl_days` sent to the backend.

If either is missing, logs stay in the hot tier regardless of the value you set in the UI.

## Retention fields

The logs retention UI exposes two numbers:

| Field | Meaning |
|-------|---------|
| Total retention (`default_ttl_days`) | How long a log is kept in any tier before deletion |
| Move to S3 (`cold_storage_ttl_days`) | After how many days the log is moved from hot to S3 |

`cold_storage_ttl_days` must be strictly less than `default_ttl_days`. Set it to `-1` (or leave it blank) to disable cold storage for logs. A value of `-1` means "no cold tier", not "move immediately".

A common mistake is setting `cold_storage_ttl_days` equal to `default_ttl_days`. SigNoz accepts it, but ClickHouse never moves anything because the move window is zero.

## Self-host checklist

Before changing the value in the UI, confirm:

- [ ] Your ClickHouse storage configuration has a `cold` volume with an S3 disk. The SigNoz installer (`deploy/install.sh`) creates one when you supply your own bucket. Check the running config with `SELECT * FROM system.storage_policies` on the ClickHouse host.
- [ ] The bucket exists and the ClickHouse process can read and write it
- [ ] `default_ttl_days` is greater than `cold_storage_ttl_days`

Then in General Settings → Logs:

1. Set the total retention period in days
2. Set "Move to S3" to a positive number of days, lower than the total retention
3. Save

If "Move to S3" stays at `-1` after saving, the POST request was rejected — check the browser network tab for `400` responses from `/api/v2/settings/ttl`.

## Troubleshooting

**Save button is disabled when the value is `-1`.** This is intentional: `-1` means cold storage is off, so there is nothing to save.

**Save succeeds but logs never move.** Run on the ClickHouse host:

```sql
SELECT * FROM system.storage_policies;
SELECT * FROM system.parts WHERE table = 'logs' AND active LIMIT 5;
```

If no policy lists an S3 disk, your `clickhouse.xml` does not declare one and SigNoz will silently drop the cold tier request.

**Move-to-S3 value keeps reverting to `-1` after page refresh.** Confirmed bug, fixed in PR [#11920](https://github.com/SigNoz/signoz/pull/11920). Upgrade to a build that includes that change if you hit it.

## References

- General Settings: [`frontend/src/container/GeneralSettings/GeneralSettings.tsx`](../../frontend/src/container/GeneralSettings/GeneralSettings.tsx)
- Retention API v2: [`frontend/src/api/settings/setRetentionV2.ts`](../../frontend/src/api/settings/setRetentionV2.ts)
- TTL types: [`pkg/types/retentiontypes/ttl.go`](../../pkg/types/retentiontypes/ttl.go)
- Install guides: [Docker](https://signoz.io/docs/install/docker/), [Kubernetes](https://signoz.io/docs/install/kubernetes/)