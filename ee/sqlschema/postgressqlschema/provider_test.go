package postgressqlschema

import (
	"context"
	"database/sql/driver"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestGetIndices feeds GetIndices the exact rows the catalog query returns for a
// real table (captured from devenv postgres) and checks each unique-index shape
// is reconstructed: expression keys, partial (predicate), and plain columns.
func TestGetIndices(t *testing.T) {
	// column order must match the SELECT in GetIndices.
	columns := []string{"table_name", "index_name", "unique", "primary", "column_name", "column_position", "is_expression", "key_def", "predicate"}

	testCases := []struct {
		name  string
		table sqlschema.TableName
		rows  [][]driver.Value
		want  []sqlschema.Index
	}{
		{
			name:  "UniqueIndexWithExpressions",
			table: "tag",
			rows: [][]driver.Value{
				{"tag", "uq_tag_a36c51df", true, false, "org_id", 1, false, "org_id", nil},
				{"tag", "uq_tag_a36c51df", true, false, "kind", 2, false, "kind", nil},
				{"tag", "uq_tag_a36c51df", true, false, nil, 3, true, "lower(key)", nil},
				{"tag", "uq_tag_a36c51df", true, false, nil, 4, true, "lower(value)", nil},
			},
			want: []sqlschema.Index{
				&sqlschema.UniqueIndexWithExpressions{
					TableName:   "tag",
					Expressions: []string{"org_id", "kind", "lower(key)", "lower(value)"},
				},
			},
		},
		{
			name:  "PartialUniqueIndexes",
			table: "service_account",
			rows: [][]driver.Value{
				{"service_account", "puq_service_account_email_org_id_471d6134", true, false, "email", 1, false, "email", "(status <> 'deleted'::text)"},
				{"service_account", "puq_service_account_email_org_id_471d6134", true, false, "org_id", 2, false, "org_id", "(status <> 'deleted'::text)"},
				{"service_account", "puq_service_account_name_org_id_471d6134", true, false, "name", 1, false, "name", "(status <> 'deleted'::text)"},
				{"service_account", "puq_service_account_name_org_id_471d6134", true, false, "org_id", 2, false, "org_id", "(status <> 'deleted'::text)"},
			},
			want: []sqlschema.Index{
				(&sqlschema.PartialUniqueIndex{
					TableName:   "service_account",
					ColumnNames: []sqlschema.ColumnName{"email", "org_id"},
					Where:       "(status <> 'deleted'::text)",
				}).Named("puq_service_account_email_org_id_471d6134"),
				(&sqlschema.PartialUniqueIndex{
					TableName:   "service_account",
					ColumnNames: []sqlschema.ColumnName{"name", "org_id"},
					Where:       "(status <> 'deleted'::text)",
				}).Named("puq_service_account_name_org_id_471d6134"),
			},
		},
		{
			name:  "PlainUniqueIndex",
			table: "tag_relation",
			rows: [][]driver.Value{
				{"tag_relation", "uq_tag_relation_kind_resource_id_tag_id", true, false, "kind", 1, false, "kind", nil},
				{"tag_relation", "uq_tag_relation_kind_resource_id_tag_id", true, false, "resource_id", 2, false, "resource_id", nil},
				{"tag_relation", "uq_tag_relation_kind_resource_id_tag_id", true, false, "tag_id", 3, false, "tag_id", nil},
			},
			want: []sqlschema.Index{
				&sqlschema.UniqueIndex{
					TableName:   "tag_relation",
					ColumnNames: []sqlschema.ColumnName{"kind", "resource_id", "tag_id"},
				},
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			store := sqlstoretest.New(sqlstore.Config{Provider: "postgres"}, sqlmock.QueryMatcherRegexp)
			rows := sqlmock.NewRows(columns)
			for _, row := range testCase.rows {
				rows.AddRow(row...)
			}
			store.Mock().ExpectQuery("pg_index").WillReturnRows(rows)

			schema, err := New(context.Background(), instrumentationtest.New().ToProviderSettings(), sqlschema.Config{}, store)
			require.NoError(t, err)

			indices, err := schema.GetIndices(context.Background(), testCase.table)
			require.NoError(t, err)
			assert.Len(t, indices, len(testCase.want))

			// GetIndices iterates a map, so match by name rather than slice order.
			got := make(map[string]sqlschema.Index, len(indices))
			for _, index := range indices {
				got[index.Name()] = index
			}
			for _, want := range testCase.want {
				actual, ok := got[want.Name()]
				if !assert.True(t, ok, "expected index %s not returned", want.Name()) {
					// so that other items in the for loop can also be checked.
					continue
				}
				assert.True(t, want.Equals(actual), "index %s reconstructed differently", want.Name())
			}
		})
	}
}
