package s100sqlmigration

import (
	"context"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlmigration"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/uptrace/bun"
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
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("display_name"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("email"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("role"), DataType: sqlschema.DataTypeText, Nullable: false, Default: "'VIEWER'"},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
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
				{Name: sqlschema.ColumnName("preference_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("preference_value"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
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
				{Name: sqlschema.ColumnName("preference_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("preference_value"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
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
				{Name: sqlschema.ColumnName("installed_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: "current_timestamp"},
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
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_by"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("updated_by"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("token"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("role"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("name"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("expires_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("last_used"), DataType: sqlschema.DataTypeTimestamp, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("revoked"), DataType: sqlschema.DataTypeBoolean, Nullable: false, Default: "false"},
				{Name: sqlschema.ColumnName("user_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("user_id"), ReferencedTableName: sqlschema.TableName("users"), ReferencedColumnName: sqlschema.ColumnName("id")},
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
			Name: "user_invite",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("name"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("email"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("token"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("role"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
		{
			Name: "org_domains",
			Columns: []*sqlschema.Column{
				{Name: sqlschema.ColumnName("id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("org_id"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("name"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("data"), DataType: sqlschema.DataTypeText, Nullable: false, Default: ""},
				{Name: sqlschema.ColumnName("created_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
				{Name: sqlschema.ColumnName("updated_at"), DataType: sqlschema.DataTypeTimestamp, Nullable: true, Default: ""},
			},
			PrimaryKeyConstraint: &sqlschema.PrimaryKeyConstraint{ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("id")}},
			ForeignKeyConstraints: []*sqlschema.ForeignKeyConstraint{
				{ReferencingColumnName: sqlschema.ColumnName("org_id"), ReferencedTableName: sqlschema.TableName("organizations"), ReferencedColumnName: sqlschema.ColumnName("id")},
			},
		},
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
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("users"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("email"), sqlschema.ColumnName("org_id")},
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
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("preference_id"), sqlschema.ColumnName("org_id")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("user_preference"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("preference_id"), sqlschema.ColumnName("user_id")},
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
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("token")},
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
			TableName:   sqlschema.TableName("user_invite"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("email"), sqlschema.ColumnName("org_id")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("user_invite"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("token")},
		},
		&sqlschema.UniqueIndex{
			TableName:   sqlschema.TableName("org_domains"),
			ColumnNames: []sqlschema.ColumnName{sqlschema.ColumnName("name"), sqlschema.ColumnName("org_id")},
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

	sqls := [][]byte{}

	// Alter or create tables.
	for _, table := range tables {
		existingTable, existingUniqueConstraints, err := migration.sqlschema.GetTable(ctx, table.Name)
		if err != nil {
			if errors.Ast(err, errors.TypeNotFound) {
				sqls = append(sqls, migration.sqlschema.Operator().CreateTable(table)...)
				continue
			}

			return err
		}

		sqls = append(sqls, migration.sqlschema.Operator().AlterTable(existingTable, existingUniqueConstraints, table)...)
	}

	// Create indices.
	for _, index := range indices {
		sqls = append(sqls, migration.sqlschema.Operator().CreateIndex(index)...)
	}

	for _, sql := range sqls {
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
