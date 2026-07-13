package clickhousetelemetrystore

import "testing"

func TestValidateExplainStatement(t *testing.T) {
	cases := []struct {
		name string
		stmt string
		ok   bool
	}{
		{"simple select", "SELECT 1", true},
		{"with cte", "WITH x AS (SELECT 1) SELECT * FROM x", true},
		{"trailing semicolon", "SELECT 1;", true},
		{"trailing semicolon and space", "SELECT 1;  \n", true},
		{"double trailing semicolon", "SELECT 1;;", true},
		{"trailing line comment", "SELECT 1; -- done", true},
		{"trailing block comment", "SELECT 1; /* done */", true},
		{"semicolon inside string", "SELECT 'a; b' AS x", true},
		{"semicolon inside backtick ident", "SELECT 1 AS `a;b`", true},
		{"semicolon inside double-quoted ident", "SELECT 1 AS \"a;b\"", true},
		{"semicolon inside line comment", "SELECT 1 -- a; b", true},
		{"semicolon inside block comment", "SELECT /* a; b */ 1", true},
		{"escaped quote then semicolon in string", "SELECT 'a\\'; DROP' AS x", true},
		{"doubled quote then semicolon in string", "SELECT 'a''; DROP' AS x", true},

		{"empty", "", false},
		{"whitespace only", "   \n\t", false},
		{"stacked statement", "SELECT 1; DROP TABLE t", false},
		{"stacked statement no space", "SELECT 1;DROP TABLE t", false},
		{"stacked after string close", "SELECT 'a'; DROP TABLE t", false},
		{"stacked string statement", "SELECT 1; 'x'", false},
		{"stacked after comment", "SELECT 1; /* c */ SELECT 2", false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateExplainStatement(tc.stmt)
			if tc.ok && err != nil {
				t.Fatalf("expected valid, got error: %v", err)
			}
			if !tc.ok && err == nil {
				t.Fatalf("expected error, got nil")
			}
		})
	}
}
