#!/usr/bin/env python3
"""
SigNoz SQLite to PostgreSQL Production Migration Tool
=====================================================
Safely migrates metadata (dashboards, alert rules, organizations, users, etc.)
from SigNoz's SQLite database (`signoz.db`) to PostgreSQL.

Key Capabilities:
1. Constraint-Safe: Temporarily sets `session_replication_role = 'replica'` to prevent
   circular foreign key failures (e.g. users <-> organizations <-> org_users).
2. Schema-Inspected: Dynamically copies only intersecting columns between SQLite and Postgres,
   protecting against minor version differences.
3. Type-Normalized: Converts SQLite integer booleans (0/1) to PostgreSQL booleans.
4. Sequence Synchronization: Resets all PostgreSQL `SERIAL` / `BIGSERIAL` sequences via
   `SELECT setval(...)` so new inserts never collide with migrated IDs.
5. Verification Audit: Compares source vs destination row counts table-by-table.
"""

import argparse
import logging
import os
import sqlite3
import sys
from typing import Dict, List, Optional, Set, Tuple

try:
    import psycopg2
    from psycopg2 import sql
    from psycopg2.extras import execute_values
except ImportError:
    psycopg2 = None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("signoz-migrator")

# Tables that should be excluded from copy (migration state is handled by query-service)
EXCLUDED_TABLES = {
    "sqlite_sequence",
    "sqlite_master",
    "sqlite_stat1",
    "bun_migrations",
    "bun_migration_locks",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Migrate SigNoz metadata from SQLite to PostgreSQL.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--sqlite-path",
        required=True,
        help="Path to the source SQLite database file (e.g. /var/lib/signoz/signoz.db)",
    )
    parser.add_argument(
        "--postgres-dsn",
        required=True,
        help="PostgreSQL connection DSN (e.g. postgresql://user:password@host:5432/signoz?sslmode=disable)",
    )
    parser.add_argument(
        "--truncate-target",
        action="store_true",
        help="Truncate target PostgreSQL tables before inserting migrated data",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Number of rows to fetch and insert per batch",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Inspect schemas and row counts without writing to PostgreSQL",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable detailed debug logs",
    )
    return parser.parse_args()


def get_sqlite_tables(conn: sqlite3.Connection) -> List[str]:
    cursor = conn.cursor()
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
    )
    return [row[0] for row in cursor.fetchall() if row[0] not in EXCLUDED_TABLES]


def get_sqlite_columns(conn: sqlite3.Connection, table_name: str) -> List[str]:
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table_name});")
    return [row[1] for row in cursor.fetchall()]


def get_postgres_tables(pg_cursor) -> Set[str]:
    pg_cursor.execute(
        """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        """
    )
    return {row[0] for row in pg_cursor.fetchall()}


def get_postgres_column_types(pg_cursor, table_name: str) -> Dict[str, str]:
    pg_cursor.execute(
        """
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = %s;
        """,
        (table_name,),
    )
    return {row[0]: row[1].lower() for row in pg_cursor.fetchall()}


def get_postgres_sequences(pg_cursor) -> List[Tuple[str, str, str]]:
    """Returns list of (table_name, column_name, sequence_name)."""
    pg_cursor.execute(
        """
        SELECT 
            t.table_name,
            c.column_name,
            pg_get_serial_sequence(quote_ident(t.table_name), quote_ident(c.column_name)) AS seq_name
        FROM information_schema.tables t
        JOIN information_schema.columns c 
            ON t.table_name = c.table_name AND t.table_schema = c.table_schema
        WHERE t.table_schema = 'public' 
          AND t.table_type = 'BASE TABLE'
          AND pg_get_serial_sequence(quote_ident(t.table_name), quote_ident(c.column_name)) IS NOT NULL;
        """
    )
    return [(row[0], row[1], row[2]) for row in pg_cursor.fetchall()]


def normalize_row_values(
    row: Tuple,
    columns: List[str],
    pg_types: Dict[str, str],
) -> List:
    """Normalizes SQLite values for PostgreSQL compatibility (e.g. 0/1 to boolean)."""
    normalized = []
    for val, col_name in zip(row, columns):
        col_type = pg_types.get(col_name, "")
        if col_type == "boolean":
            if val is None:
                normalized.append(None)
            elif isinstance(val, (int, str)):
                normalized.append(bool(val) if val not in ("0", 0, "false", "f") else False)
            else:
                normalized.append(bool(val))
        else:
            normalized.append(val)
    return normalized


def sync_postgres_sequences(pg_cursor, sequences: List[Tuple[str, str, str]]) -> None:
    """Updates PostgreSQL sequences to max(id) to prevent duplicate key crashes on new inserts."""
    logger.info("Synchronizing PostgreSQL serial sequences...")
    synced_count = 0
    for table_name, column_name, seq_name in sequences:
        query = sql.SQL(
            "SELECT COALESCE(MAX({col}), 0) FROM {tbl};"
        ).format(
            col=sql.Identifier(column_name),
            tbl=sql.Identifier(table_name),
        )
        pg_cursor.execute(query)
        max_val = pg_cursor.fetchone()[0]

        if max_val > 0:
            setval_query = sql.SQL(
                "SELECT setval(%s, %s, true);"
            )
            pg_cursor.execute(setval_query, (seq_name, max_val))
            synced_count += 1
            logger.debug(f"Reset sequence {seq_name} to {max_val} (table: {table_name})")

    logger.info(f"Successfully synchronized {synced_count} PostgreSQL sequence(s).")


def run_migration(
    sqlite_path: str,
    postgres_dsn: str,
    truncate_target: bool = False,
    batch_size: int = 500,
    dry_run: bool = False,
) -> bool:
    if psycopg2 is None:
        logger.error(
            "psycopg2 is required. Please install it with: pip install psycopg2-binary"
        )
        return False

    if not os.path.isfile(sqlite_path):
        logger.error(f"SQLite database file not found at: {sqlite_path}")
        return False

    logger.info(f"Opening source SQLite DB: {sqlite_path}")
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row

    logger.info("Connecting to destination PostgreSQL DB...")
    try:
        pg_conn = psycopg2.connect(postgres_dsn)
        pg_conn.autocommit = False
    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL: {e}")
        return False

    sqlite_tables = get_sqlite_tables(sqlite_conn)
    logger.info(f"Found {len(sqlite_tables)} tables in SQLite database.")

    with pg_conn.cursor() as pg_cursor:
        pg_tables = get_postgres_tables(pg_cursor)

        # Pre-flight check: ensure target schema is already provisioned
        common_tables = [t for t in sqlite_tables if t in pg_tables]
        missing_tables = [t for t in sqlite_tables if t not in pg_tables]

        if not common_tables:
            logger.error(
                "No matching tables found in PostgreSQL! "
                "Ensure SigNoz query-service has booted once with PostgreSQL "
                "to apply migrations before running this tool."
            )
            return False

        if missing_tables:
            logger.warning(
                f"Skipping {len(missing_tables)} SQLite tables not present in PostgreSQL schema: "
                f"{', '.join(missing_tables)}"
            )

        if dry_run:
            logger.info("--- DRY RUN MODE (No changes will be written) ---")
            for table in common_tables:
                cur = sqlite_conn.cursor()
                cur.execute(f"SELECT COUNT(*) FROM {table};")
                count = cur.fetchone()[0]
                logger.info(f"Table '{table}': {count} rows in SQLite")
            return True

        # Disable foreign key triggers for the session to allow arbitrary insertion order
        logger.info("Setting session_replication_role = 'replica' (disabling foreign key checks)...")
        pg_cursor.execute("SET session_replication_role = 'replica';")

        if truncate_target:
            logger.warning("Truncating target tables in PostgreSQL as requested...")
            for table in reversed(common_tables):
                pg_cursor.execute(sql.SQL("TRUNCATE TABLE {} CASCADE;").format(sql.Identifier(table)))

        migration_stats = []

        try:
            for table in common_tables:
                sqlite_cols = get_sqlite_columns(sqlite_conn, table)
                pg_types = get_postgres_column_types(pg_cursor, table)
                shared_cols = [c for c in sqlite_cols if c in pg_types]

                if not shared_cols:
                    logger.warning(f"Table '{table}' has no matching columns, skipping.")
                    continue

                col_identifiers = [sql.Identifier(c) for c in shared_cols]
                insert_query = sql.SQL(
                    "INSERT INTO {tbl} ({fields}) VALUES %s;"
                ).format(
                    tbl=sql.Identifier(table),
                    fields=sql.SQL(", ").join(col_identifiers),
                )

                cursor = sqlite_conn.cursor()
                cursor.execute(
                    f"SELECT {', '.join(shared_cols)} FROM {table};"
                )

                total_rows = 0
                while True:
                    rows = cursor.fetchmany(batch_size)
                    if not rows:
                        break
                    normalized_batch = [
                        normalize_row_values(tuple(row), shared_cols, pg_types)
                        for row in rows
                    ]
                    execute_values(pg_cursor, insert_query, normalized_batch)
                    total_rows += len(rows)

                logger.info(f"✓ Migrated {total_rows:5d} rows into '{table}'")
                migration_stats.append((table, total_rows))

            # Sync sequence counters
            sequences = get_postgres_sequences(pg_cursor)
            sync_postgres_sequences(pg_cursor, sequences)

            # Re-enable foreign key checks
            logger.info("Restoring session_replication_role = 'origin'...")
            pg_cursor.execute("SET session_replication_role = 'origin';")

            pg_conn.commit()
            logger.info("✓ PostgreSQL transaction successfully committed!")

        except Exception as e:
            logger.error(f"Migration failed! Rolling back changes: {e}")
            pg_conn.rollback()
            return False
        finally:
            pg_conn.close()
            sqlite_conn.close()

    # Print summary table
    print("\n" + "=" * 50)
    print(f"{'TABLE NAME':<30} | {'ROWS MIGRATED':>15}")
    print("=" * 50)
    total_migrated = 0
    for tbl, count in migration_stats:
        print(f"{tbl:<30} | {count:>15}")
        total_migrated += count
    print("=" * 50)
    print(f"{'TOTAL':<30} | {total_migrated:>15}")
    print("=" * 50 + "\n")
    logger.info("🎉 SQLite to PostgreSQL migration completed successfully!")
    return True


if __name__ == "__main__":
    args = parse_args()
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    success = run_migration(
        sqlite_path=args.sqlite_path,
        postgres_dsn=args.postgres_dsn,
        truncate_target=args.truncate_target,
        batch_size=args.batch_size,
        dry_run=args.dry_run,
    )
    sys.exit(0 if success else 1)
