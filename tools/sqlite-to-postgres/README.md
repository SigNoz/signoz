# SigNoz SQLite to PostgreSQL Migration Guide & Tool

This tool migrates existing SigNoz metadata (dashboards, alert rules, user accounts, organizations, saved views, and API keys) from a legacy standalone SQLite database (`signoz.db`) to PostgreSQL.

---

## Why Migrate from SQLite to PostgreSQL?

| Feature | SQLite (`signoz.db`) | PostgreSQL |
| :--- | :--- | :--- |
| **High Availability (HA)** | ❌ Single-replica only (file lock errors on shared mounts) | ✅ Multi-replica `query-service` pods supported |
| **Concurrency** | ❌ Single-writer bottle-neck | ✅ High-concurrency MVCC |
| **Backups & PITR** | ⚠️ File copy / manual backup | ✅ Streaming replication & Point-In-Time Recovery |
| **SigNoz v0.152.0+ / 1.0.0+** | Legacy default | Recommended production database |

---

## How It Works (Safety Guarantees)

1. **Schema-Preserving**: Assumes target PostgreSQL tables are created by SigNoz's built-in migrations (`bun_migrations`). This avoids brittle custom DDL.
2. **Circular FK Protection**: Temporarily executes with `SET session_replication_role = 'replica'`, disabling foreign key constraints during data load so tables can be loaded in any order without cyclic dependency errors (`users` ↔ `organizations` ↔ `org_users`).
3. **Sequence Synchronization (`setval`)**: Automatically inspects PostgreSQL `information_schema` for all `SERIAL` / `BIGSERIAL` sequences and executes `SELECT setval(seq, max(id))` so newly created dashboards and alerts in SigNoz UI never fail with duplicate key violations.
4. **Boolean & Type Mapping**: Converts SQLite 0/1 integer flags to PostgreSQL booleans.
5. **Column Intersection**: Only transfers columns shared by both databases, safeguarding against minor schema differences between SigNoz patch versions.

---

## Step-by-Step Migration Runbook

### Step 1: Backup SQLite Database
Ensure no active writes are occurring and make a safe copy:
```bash
cp /var/lib/signoz/signoz.db /var/lib/signoz/signoz.db.bak
```

### Step 2: Provision PostgreSQL Database
Create a clean database for SigNoz:
```sql
CREATE DATABASE signoz;
CREATE USER signoz WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE signoz TO signoz;
```

### Step 3: Boot SigNoz Once on PostgreSQL (Schema Provisioning)
Before copying rows, configure SigNoz `query-service` with PostgreSQL in your `docker-compose.yaml` or `casting.yaml`:
```yaml
SIGNOZ_SQLSTORE_PROVIDER: "postgres"
SIGNOZ_SQLSTORE_POSTGRES_DSN: "postgresql://signoz:your_secure_password@postgres:5432/signoz?sslmode=disable"
```
Start SigNoz once. The built-in `bun` migrations will execute automatically and create all tables, indexes, and sequences. Then stop or pause `query-service` while copying data.

### Step 4: Run the Migration Tool

#### Option A: Using Docker (Recommended — No Local Dependencies)
```bash
docker run --rm \
  -v /var/lib/signoz/signoz.db:/signoz.db:ro \
  --net=host \
  ghcr.io/signoz/sqlite-to-postgres:latest \
  --sqlite-path /signoz.db \
  --postgres-dsn "postgresql://signoz:your_secure_password@localhost:5432/signoz?sslmode=disable" \
  --truncate-target
```

#### Option B: Using Python Directly
```bash
cd tools/sqlite-to-postgres
pip install -r requirements.txt

python migrate.py \
  --sqlite-path /var/lib/signoz/signoz.db \
  --postgres-dsn "postgresql://signoz:your_secure_password@localhost:5432/signoz?sslmode=disable" \
  --truncate-target
```

---

## CLI Flags

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--sqlite-path` | Path to source `signoz.db` | *Required* |
| `--postgres-dsn` | Destination PostgreSQL connection string | *Required* |
| `--truncate-target` | Truncate target PostgreSQL tables before inserting | `False` |
| `--batch-size` | Batch size for data streaming | `500` |
| `--dry-run` | Inspect schemas and row counts without writing | `False` |
| `--verbose` | Output verbose debug logging | `False` |

---

## Verification
The tool prints a verification audit table at the conclusion of the migration:
```text
==================================================
TABLE NAME                     |   ROWS MIGRATED
==================================================
organizations                  |               1
users                          |               5
dashboards                     |              14
rules                          |              28
notification_channels          |               4
saved_views                    |              12
==================================================
TOTAL                          |              64
==================================================
```
Start `query-service` and verify that all dashboards and alert rules appear in the SigNoz UI.
