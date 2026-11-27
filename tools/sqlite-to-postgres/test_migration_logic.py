#!/usr/bin/env python3
import os
import sqlite3
import unittest
from migrate import (
    EXCLUDED_TABLES,
    get_sqlite_columns,
    get_sqlite_tables,
    normalize_row_values,
)


class TestMigrationLogic(unittest.TestCase):
    def setUp(self):
        self.db_path = "/tmp/test_signoz_mock.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.conn = sqlite3.connect(self.db_path)
        cur = self.conn.cursor()
        cur.execute("CREATE TABLE organizations (id TEXT PRIMARY KEY, name TEXT, is_anonymous INTEGER);")
        cur.execute("CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, org_id TEXT);")
        cur.execute("CREATE TABLE bun_migrations (id INTEGER PRIMARY KEY);")
        cur.execute("INSERT INTO organizations VALUES ('org-1', 'Test Org', 1);")
        cur.execute("INSERT INTO organizations VALUES ('org-2', 'Second Org', 0);")
        self.conn.commit()

    def tearDown(self):
        self.conn.close()
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_get_sqlite_tables_filters_excluded(self):
        tables = get_sqlite_tables(self.conn)
        self.assertIn("organizations", tables)
        self.assertIn("users", tables)
        self.assertNotIn("bun_migrations", tables)
        for excluded in EXCLUDED_TABLES:
            self.assertNotIn(excluded, tables)

    def test_get_sqlite_columns(self):
        cols = get_sqlite_columns(self.conn, "organizations")
        self.assertEqual(cols, ["id", "name", "is_anonymous"])

    def test_normalize_row_values_booleans(self):
        row = ("org-1", "Test Org", 1)
        columns = ["id", "name", "is_anonymous"]
        pg_types = {"id": "text", "name": "text", "is_anonymous": "boolean"}

        normalized = normalize_row_values(row, columns, pg_types)
        self.assertEqual(normalized, ["org-1", "Test Org", True])

        # Test false value
        row_false = ("org-2", "Second Org", 0)
        normalized_false = normalize_row_values(row_false, columns, pg_types)
        self.assertEqual(normalized_false, ["org-2", "Second Org", False])

    def test_normalize_row_values_nulls(self):
        row = ("org-3", None, None)
        columns = ["id", "name", "is_anonymous"]
        pg_types = {"id": "text", "name": "text", "is_anonymous": "boolean"}

        normalized = normalize_row_values(row, columns, pg_types)
        self.assertEqual(normalized, ["org-3", None, None])


if __name__ == "__main__":
    unittest.main()
