package s100sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlmigration"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect"
	"github.com/uptrace/bun/migrate"
)

type v100 struct {
	sqlstore  sqlstore.SQLStore
	sqlschema sqlschema.SQLSchema
}

func NewV100Factory(sqlstore sqlstore.SQLStore, sqlschema sqlschema.SQLSchema) factory.ProviderFactory[sqlmigration.SQLMigration, sqlmigration.Config] {
	return factory.NewProviderFactory(factory.MustNewName("v100"), func(_ context.Context, _ factory.ProviderSettings, _ sqlmigration.Config) (sqlmigration.SQLMigration, error) {
		return &v100{
			sqlstore:  sqlstore,
			sqlschema: sqlschema,
		}, nil
	})
}

func (migration *v100) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *v100) Up(ctx context.Context, db *bun.DB) error {
	tables := []*sqlschema.Table{
		{
			Name: "organizations",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("name"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("display_name"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("alias"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("key"), DataType: sqlschema.DataTypeBigInt, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
		},
		{
			Name: "users",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("display_name"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("email"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("is_root"), DataType: sqlschema.DataTypeBoolean, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("status"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "saved_views",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("name"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("category"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_by"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_by"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("source_page"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("tags"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("data"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("extra_data"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""}, //Problematic
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "pipelines",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("order_id"), DataType: sqlschema.DataTypeInteger, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("enabled"), DataType: sqlschema.DataTypeBoolean, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("created_by"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("name"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("alias"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("description"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("filter"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("config_json"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("updated_by"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "notification_channel",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("name"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("type"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("data"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "alertmanager_config",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("config"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("hash"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "alertmanager_state",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("silences"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("nflog"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "org_preference",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("name"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("value"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "user_preference",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("name"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("value"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("user_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("user_id"), ReferencedTableName: sqlschema.TableName("users"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "apdex_setting",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("service_name"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("threshold"), DataType: sqlschema.DataTypeNumeric, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("exclude_status_codes"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "ttl_setting",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("transaction_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("table_name"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("ttl"), DataType: sqlschema.DataTypeInteger, Nullable: false, Default: "0"},
				{Name: sqlschema.ColumnName("cold_storage_ttl"), DataType: sqlschema.DataTypeInteger, Nullable: false, Default: "0"},
				{Name: sqlschema.ColumnName("status"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("condition"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "virtual_field",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("created_by"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_by"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("name"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("expression"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("description"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("signal"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "installed_integration",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("type"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("config"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("installed_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: "CURRENT_TIMESTAMP"},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "cloud_integration",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("provider"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("config"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("account_id"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("last_agent_report"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("removed_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "cloud_integration_service",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("type"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("config"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("cloud_integration_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("cloud_integration_id"), ReferencedTableName: sqlschema.TableName("cloud_integration"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "rule",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("created_by"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_by"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("deleted"), DataType: sqlschema.DataTypeInteger, Nullable: false, Default: "0"},
				{Name: sqlschema.ColumnName("data"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "planned_maintenance",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("created_by"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_by"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("name"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("description"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("schedule"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "planned_maintenance_rule",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("planned_maintenance_id"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("rule_id"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("planned_maintenance_id"), ReferencedTableName: sqlschema.TableName("planned_maintenance"), ReferencedColumnName: sqlschema.ColumnName("id")},
				{ReferencingColumnName: sqlschema.ColumnName("rule_id"), ReferencedTableName: sqlschema.TableName("rule"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "quick_filter",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("filter"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("signal"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("created_by"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_by"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "factor_password",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("password"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("temporary"), DataType: sqlschema.DataTypeBoolean, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("user_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("user_id"), ReferencedTableName: sqlschema.TableName("users"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "reset_password_token",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("token"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("password_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("expires_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("password_id"), ReferencedTableName: sqlschema.TableName("factor_password"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "factor_api_key",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("name"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("key"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("expires_at"), DataType: sqlschema.DataTypeInteger, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("last_observed_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("service_account_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("service_account_id"), ReferencedTableName: sqlschema.TableName("service_account"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "license",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("key"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("data"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("last_validated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "trace_funnel",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("created_by"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_by"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("name"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("description"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("steps"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("tags"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "dashboard",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("created_by"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_by"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("data"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("locked"), DataType: sqlschema.DataTypeBoolean, Nullable: false, Default: "false"},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "agent",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("agent_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("terminated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("status"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("config"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "agent_config_version",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("created_by"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_by"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("version"), DataType: sqlschema.DataTypeInteger, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("element_type"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("deploy_status"), DataType: sqlschema.DataTypeText, Nullable: false, Default: "'dirty'"},
				{Name: sqlschema.ColumnName("deploy_sequence"), DataType: sqlschema.DataTypeInteger, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("deploy_result"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("hash"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("config"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "agent_config_element",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("element_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("element_type"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("version_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("version_id"), ReferencedTableName: sqlschema.TableName("agent_config_version"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "auth_domain",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("name"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("data"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: false, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "route_policy",
			Columns: []*sqlschema.Column{
				{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
				{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
				{Name: "created_by", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "updated_by", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "expression", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "kind", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "channels", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "description", DataType: sqlschema.DataTypeText, Nullable: true},
				{Name: "enabled", DataType: sqlschema.DataTypeBoolean, Nullable: false, Default: "true"},
				{Name: "tags", DataType: sqlschema.DataTypeText, Nullable: true},
				{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "auth_token",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("meta"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("prev_access_token"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("access_token"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("prev_refresh_token"), DataType: sqlschema.DataTypeText, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("refresh_token"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("last_observed_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("rotated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("user_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("user_id"), ReferencedTableName: sqlschema.TableName("users"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "public_dashboard",
			Columns: []*sqlschema.Column{
				{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "time_range_enabled", DataType: sqlschema.DataTypeBoolean, Nullable: false},
				{Name: "default_time_range", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
				{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
				{Name: "dashboard_id", DataType: sqlschema.DataTypeText, Nullable: false},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("dashboard_id"), ReferencedTableName: sqlschema.TableName("dashboard"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "role",
			Columns: []*sqlschema.Column{
				{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
				{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
				{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "description", DataType: sqlschema.DataTypeText, Nullable: true},
				{Name: "type", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "user_role",
			Columns: []*sqlschema.Column{
				{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "user_id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "role_id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
				{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("user_id"), ReferencedTableName: sqlschema.TableName("users"), ReferencedColumnName: sqlschema.ColumnName("id")},
				{ReferencingColumnName: sqlschema.ColumnName("role_id"), ReferencedTableName: sqlschema.TableName("role"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "service_account",
			Columns: []*sqlschema.Column{
				{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "email", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "status", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
				{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
				{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "service_account_role",
			Columns: []*sqlschema.Column{
				{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
				{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
				{Name: "service_account_id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "role_id", DataType: sqlschema.DataTypeText, Nullable: false},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("service_account_id"), ReferencedTableName: sqlschema.TableName("service_account"), ReferencedColumnName: sqlschema.ColumnName("id")},
				{ReferencingColumnName: sqlschema.ColumnName("role_id"), ReferencedTableName: sqlschema.TableName("role"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "llm_pricing_rule",
			Columns: []*sqlschema.Column{
				{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "source_id", DataType: sqlschema.DataTypeText, Nullable: true},
				{Name: "model", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "provider", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "model_pattern", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "unit", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "pricing", DataType: sqlschema.DataTypeText, Nullable: false, Default: "'{}'"},
				{Name: "is_override", DataType: sqlschema.DataTypeBoolean, Nullable: false, Default: "false"},
				{Name: "synced_at", DataType: sqlschema.DataTypeTimestamp, Nullable: true},
				{Name: "enabled", DataType: sqlschema.DataTypeBoolean, Nullable: false, Default: "true"},
				{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
				{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
				{Name: "created_by", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "updated_by", DataType: sqlschema.DataTypeText, Nullable: false},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "span_mapper_group",
			Columns: []*sqlschema.Column{
				{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "condition", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "enabled", DataType: sqlschema.DataTypeBoolean, Nullable: false, Default: "true"},
				{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
				{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
				{Name: "created_by", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "updated_by", DataType: sqlschema.DataTypeText, Nullable: false},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "span_mapper",
			Columns: []*sqlschema.Column{
				{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "field_context", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "config", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "enabled", DataType: sqlschema.DataTypeBoolean, Nullable: false, Default: "true"},
				{Name: "group_id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
				{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
				{Name: "created_by", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "updated_by", DataType: sqlschema.DataTypeText, Nullable: false},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("group_id"), ReferencedTableName: sqlschema.TableName("span_mapper_group"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "tag",
			Columns: []*sqlschema.Column{
				{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "key", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "value", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "org_id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "kind", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
				{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "tag_relation",
			Columns: []*sqlschema.Column{
				{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "kind", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "resource_id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "tag_id", DataType: sqlschema.DataTypeText, Nullable: false},
				{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("tag_id"), ReferencedTableName: sqlschema.TableName("tag"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
	}

	// Adding authz tables which are dialect specific unfortunately due to the upstream.
	switch migration.sqlstore.BunDB().Dialect().Name() {
	case dialect.SQLite:
		tables = append(tables,
			&sqlschema.Table{
				Name: "tuple",
				Columns: []*sqlschema.Column{
					{Name: "store", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "object_type", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "object_id", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "relation", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "user_object_type", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "user_object_id", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "user_relation", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "user_type", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "ulid", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "inserted_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
					{Name: "condition_name", DataType: sqlschema.DataTypeText, Nullable: true},
					{Name: "condition_context", DataType: sqlschema.DataTypeText, Nullable: true},
				},
				PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"store", "object_type", "object_id", "relation", "user_object_type", "user_object_id", "user_relation"}},
			},
			&sqlschema.Table{
				Name: "authorization_model",
				Columns: []*sqlschema.Column{
					{Name: "store", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "authorization_model_id", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "schema_version", DataType: sqlschema.DataTypeText, Nullable: false, Default: "1.1"},
					{Name: "serialized_protobuf", DataType: sqlschema.DataTypeText, Nullable: false},
				},
				PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"store", "authorization_model_id"}},
			},
			&sqlschema.Table{
				Name: "store",
				Columns: []*sqlschema.Column{
					{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
					{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: true},
					{Name: "deleted_at", DataType: sqlschema.DataTypeTimestamp, Nullable: true},
				},
				PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
			},
			&sqlschema.Table{
				Name: "assertion",
				Columns: []*sqlschema.Column{
					{Name: "store", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "authorization_model_id", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "assertions", DataType: sqlschema.DataTypeText, Nullable: true},
				},
				PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"store", "authorization_model_id"}},
			},
			&sqlschema.Table{
				Name: "changelog",
				Columns: []*sqlschema.Column{
					{Name: "store", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "object_type", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "object_id", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "relation", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "user_object_type", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "user_object_id", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "user_relation", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "operation", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "ulid", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "inserted_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
					{Name: "condition_name", DataType: sqlschema.DataTypeText, Nullable: true},
					{Name: "condition_context", DataType: sqlschema.DataTypeText, Nullable: true},
				},
				PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"store", "ulid", "object_type"}},
			},
		)
	case dialect.PG:
		tables = append(tables,
			&sqlschema.Table{
				Name: "tuple",
				Columns: []*sqlschema.Column{
					{Name: "store", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "object_type", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "object_id", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "relation", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "_user", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "user_type", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "ulid", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "inserted_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
					{Name: "condition_name", DataType: sqlschema.DataTypeBytea, Nullable: true},
					{Name: "condition_context", DataType: sqlschema.DataTypeText, Nullable: true},
				},
				PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"store", "object_type", "object_id", "relation", "_user"}},
			},
			&sqlschema.Table{
				Name: "authorization_model",
				Columns: []*sqlschema.Column{
					{Name: "store", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "authorization_model_id", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "type", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "type_definition", DataType: sqlschema.DataTypeBytea, Nullable: true},
					{Name: "schema_version", DataType: sqlschema.DataTypeText, Nullable: false, Default: "1.1"},
					{Name: "serialized_protobuf", DataType: sqlschema.DataTypeBytea, Nullable: false},
				},
				PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"store", "authorization_model_id", "type"}},
			},
			&sqlschema.Table{
				Name: "store",
				Columns: []*sqlschema.Column{
					{Name: "id", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "name", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "created_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
					{Name: "updated_at", DataType: sqlschema.DataTypeTimestamp, Nullable: true},
					{Name: "deleted_at", DataType: sqlschema.DataTypeTimestamp, Nullable: true},
				},
				PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"id"}},
			},
			&sqlschema.Table{
				Name: "changelog",
				Columns: []*sqlschema.Column{
					{Name: "store", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "object_type", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "object_id", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "relation", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "_user", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "operation", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "ulid", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "inserted_at", DataType: sqlschema.DataTypeTimestamp, Nullable: false},
					{Name: "condition_name", DataType: sqlschema.DataTypeBytea, Nullable: true},
					{Name: "condition_context", DataType: sqlschema.DataTypeText, Nullable: true},
				},
				PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"store", "ulid", "object_type"}},
			},
			&sqlschema.Table{
				Name: "assertion",
				Columns: []*sqlschema.Column{
					{Name: "store", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "authorization_model_id", DataType: sqlschema.DataTypeText, Nullable: false},
					{Name: "assertions", DataType: sqlschema.DataTypeBytea, Nullable: true},
				},
				PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{"store", "authorization_model_id"}},
			},
		)
	default:
		return errors.Newf(errors.TypeUnsupported, errors.CodeUnsupported, "unsupported dialect for authz tables: %s", migration.sqlstore.BunDB().Dialect().Name())
	}

	indices := []sqlschema.Index{
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("organizations"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("name")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("organizations"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("alias")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("organizations"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("key")},
		},
		&sqlschema.PartialUniqueIndex{
			TableName:   sqlschema.TableName("users"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("email"), sqlschema.ColumnName("org_id")},
			Where:       "status != 'deleted'",
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("alertmanager_config"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("org_id")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("alertmanager_state"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("org_id")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("org_preference"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("name"), sqlschema.ColumnName("org_id")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("user_preference"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("name"), sqlschema.ColumnName("user_id")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("installed_integration"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("type"), sqlschema.ColumnName("org_id")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("cloud_integration_service"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("type"), sqlschema.ColumnName("cloud_integration_id")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("quick_filter"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("org_id"), sqlschema.ColumnName("signal")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("factor_password"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("user_id")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("reset_password_token"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("password_id")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("reset_password_token"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("token")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("factor_api_key"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("key")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("factor_api_key"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("name"), sqlschema.ColumnName("service_account_id")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("license"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("key")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("agent"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("agent_id")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("agent_config_version"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("org_id"), sqlschema.ColumnName("version"), sqlschema.ColumnName("element_type")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("agent_config_element"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("element_id"), sqlschema.ColumnName("element_type"), sqlschema.ColumnName("version_id")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("auth_domain"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("name"), sqlschema.ColumnName("org_id")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("public_dashboard"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("dashboard_id")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("role"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("name"), sqlschema.ColumnName("org_id")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("user_role"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("user_id"), sqlschema.ColumnName("role_id")},
		},
		&sqlschema.PartialUniqueIndex{
			TableName:   sqlschema.TableName("service_account"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("name"), sqlschema.ColumnName("org_id")},
			Where:       "status != 'deleted'",
		},
		&sqlschema.PartialUniqueIndex{
			TableName:   sqlschema.TableName("service_account"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("email"), sqlschema.ColumnName("org_id")},
			Where:       "status != 'deleted'",
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("service_account_role"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("service_account_id"), sqlschema.ColumnName("role_id")},
		},
		&sqlschema.PartialUniqueIndex{
			TableName:   sqlschema.TableName("llm_pricing_rule"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("org_id"), sqlschema.ColumnName("source_id")},
			Where:       "source_id IS NOT NULL",
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("span_mapper_group"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("org_id"), sqlschema.ColumnName("name")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("span_mapper"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("group_id"), sqlschema.ColumnName("name")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("tag_relation"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("kind"), sqlschema.ColumnName("resource_id"), sqlschema.ColumnName("tag_id")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("tuple"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("ulid")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("auth_token"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("access_token")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("auth_token"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("refresh_token")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("apdex_setting"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("service_name"), sqlschema.ColumnName("org_id")},
		},
		&sqlschema.PartialUniqueIndex{
			TableName:   sqlschema.TableName("cloud_integration"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("account_id"), sqlschema.ColumnName("provider"), sqlschema.ColumnName("org_id")},
			Where:       "removed_at IS NULL",
		},
	}

	if err := migration.sqlschema.ToggleFKEnforcement(ctx, db, false); err != nil {
		return err
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer func() {
		_ = tx.Rollback()
	}()

	tableSQLs := [][]byte{}

	// Alter or create tables.
	for _, table := range tables {
		existingTable, existingUniqueConstraints, err := migration.sqlschema.GetTable(ctx, table.Name)
		if err != nil {
			if errors.Ast(err, errors.TypeNotFound) {
				tableSQLs = append(tableSQLs, migration.sqlschema.Operator().CreateTable(table)...)
				continue
			}

			return err
		}

		tableSQLs = append(tableSQLs, migration.sqlschema.Operator().AlterTable(existingTable, existingUniqueConstraints, table)...)
	}

	// First, create/alter all tables. This is to ensure that the indices are created/altered after the tables are created/altered.
	for _, sql := range tableSQLs {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	var existingIndices []sqlschema.Index
	for _, table := range tables {
		indices, err := migration.sqlschema.GetIndices(ctx, table.Name)
		if err != nil {
			if errors.Ast(err, errors.TypeNotFound) {
				continue
			}

			return err
		}

		existingIndices = append(existingIndices, indices...)
	}

	indexSQLs := migration.sqlschema.Operator().DiffIndices(existingIndices, indices)

	for _, sql := range indexSQLs {
		if _, err := tx.ExecContext(ctx, string(sql)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	if err := migration.sqlschema.ToggleFKEnforcement(ctx, db, true); err != nil {
		return err
	}

	return nil
}

func (migration *v100) Down(ctx context.Context, db *bun.DB) error {
	return nil
}
