package s100sqlmigration

import (
	"context"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/sqlmigration"
	"github.com/SigNoz/signoz/pkg/sqlschema"
	"github.com/SigNoz/signoz/pkg/sqlschema/sqlschematest"
	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/sqlstore/sqlstoretest"
	"github.com/stretchr/testify/require"
)

func TestV100Migration(t *testing.T) {
	providerSettings := instrumentationtest.New().ToProviderSettings()

	testCases := []struct {
		name              string
		providers         []string
		tables            map[string]*sqlschema.Table
		uniqueConstraints map[string][]*sqlschema.UniqueConstraint
		indices           map[string]sqlschema.Index
		expectedSQLs      []string
	}{
		{
			name:              "StartWithEmptyDatabase",
			providers:         []string{"sqlite"},
			tables:            map[string]*sqlschema.Table{},
			uniqueConstraints: map[string][]*sqlschema.UniqueConstraint{},
			indices:           map[string]sqlschema.Index{},
			expectedSQLs: []string{
				`CREATE TABLE IF NOT EXISTS "organizations" ("id" TEXT NOT NULL, "name" TEXT, "display_name" TEXT NOT NULL, "alias" TEXT, "key" BIGINT, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, CONSTRAINT "pk_organizations" PRIMARY KEY ("id"))`,
				`CREATE TABLE IF NOT EXISTS "users" ("id" TEXT NOT NULL, "display_name" TEXT NOT NULL, "email" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'VIEWER', "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "org_id" TEXT NOT NULL, CONSTRAINT "pk_users" PRIMARY KEY ("id"), CONSTRAINT "fk_users_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "saved_views" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "category" TEXT NOT NULL, "created_by" TEXT, "updated_by" TEXT, "source_page" TEXT NOT NULL, "tags" TEXT, "data" TEXT NOT NULL, "extra_data" TEXT, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "org_id" TEXT, CONSTRAINT "pk_saved_views" PRIMARY KEY ("id"), CONSTRAINT "fk_saved_views_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "pipelines" ("id" TEXT NOT NULL, "order_id" INTEGER, "enabled" BOOLEAN, "created_by" TEXT, "created_at" TIMESTAMP, "name" TEXT NOT NULL, "alias" TEXT NOT NULL, "description" TEXT, "filter" TEXT NOT NULL, "config_json" TEXT, "org_id" TEXT NOT NULL, "updated_by" TEXT, "updated_at" TIMESTAMP, CONSTRAINT "pk_pipelines" PRIMARY KEY ("id"), CONSTRAINT "fk_pipelines_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "notification_channel" ("id" TEXT NOT NULL, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "name" TEXT, "type" TEXT, "data" TEXT, "org_id" TEXT, CONSTRAINT "pk_notification_channel" PRIMARY KEY ("id"), CONSTRAINT "fk_notification_channel_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "alertmanager_config" ("id" TEXT NOT NULL, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "config" TEXT NOT NULL, "hash" TEXT NOT NULL, "org_id" TEXT NOT NULL, CONSTRAINT "pk_alertmanager_config" PRIMARY KEY ("id"), CONSTRAINT "fk_alertmanager_config_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "alertmanager_state" ("id" TEXT NOT NULL, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "silences" TEXT, "nflog" TEXT, "org_id" TEXT NOT NULL, CONSTRAINT "pk_alertmanager_state" PRIMARY KEY ("id"), CONSTRAINT "fk_alertmanager_state_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "org_preference" ("id" TEXT NOT NULL, "preference_id" TEXT NOT NULL, "preference_value" TEXT NOT NULL, "org_id" TEXT NOT NULL, CONSTRAINT "pk_org_preference" PRIMARY KEY ("id"), CONSTRAINT "fk_org_preference_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "user_preference" ("id" TEXT NOT NULL, "preference_id" TEXT NOT NULL, "preference_value" TEXT NOT NULL, "user_id" TEXT NOT NULL, CONSTRAINT "pk_user_preference" PRIMARY KEY ("id"), CONSTRAINT "fk_user_preference_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "apdex_setting" ("id" TEXT NOT NULL, "org_id" TEXT, "service_name" TEXT, "threshold" NUMERIC NOT NULL, "exclude_status_codes" TEXT NOT NULL, CONSTRAINT "pk_apdex_setting" PRIMARY KEY ("id"), CONSTRAINT "fk_apdex_setting_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "ttl_setting" ("id" TEXT NOT NULL, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "transaction_id" TEXT NOT NULL, "table_name" TEXT NOT NULL, "ttl" INTEGER NOT NULL DEFAULT 0, "cold_storage_ttl" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL, "condition" TEXT, "org_id" TEXT NOT NULL, CONSTRAINT "pk_ttl_setting" PRIMARY KEY ("id"), CONSTRAINT "fk_ttl_setting_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "virtual_field" ("id" TEXT NOT NULL, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "created_by" TEXT, "updated_by" TEXT, "name" TEXT NOT NULL, "expression" TEXT NOT NULL, "description" TEXT, "signal" TEXT NOT NULL, "org_id" TEXT NOT NULL, CONSTRAINT "pk_virtual_field" PRIMARY KEY ("id"), CONSTRAINT "fk_virtual_field_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "installed_integration" ("id" TEXT NOT NULL, "type" TEXT, "config" TEXT, "installed_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "org_id" TEXT, CONSTRAINT "pk_installed_integration" PRIMARY KEY ("id"), CONSTRAINT "fk_installed_integration_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "cloud_integration" ("id" TEXT NOT NULL, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "provider" TEXT, "config" TEXT, "account_id" TEXT, "last_agent_report" TEXT, "removed_at" TIMESTAMP, "org_id" TEXT, CONSTRAINT "pk_cloud_integration" PRIMARY KEY ("id"), CONSTRAINT "fk_cloud_integration_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "cloud_integration_service" ("id" TEXT NOT NULL, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "type" TEXT NOT NULL, "config" TEXT, "cloud_integration_id" TEXT NOT NULL, CONSTRAINT "pk_cloud_integration_service" PRIMARY KEY ("id"), CONSTRAINT "fk_cloud_integration_service_cloud_integration_id" FOREIGN KEY ("cloud_integration_id") REFERENCES "cloud_integration" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "rule" ("id" TEXT NOT NULL, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "created_by" TEXT, "updated_by" TEXT, "deleted" INTEGER NOT NULL DEFAULT 0, "data" TEXT NOT NULL, "org_id" TEXT, CONSTRAINT "pk_rule" PRIMARY KEY ("id"), CONSTRAINT "fk_rule_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "planned_maintenance" ("id" TEXT NOT NULL, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "created_by" TEXT, "updated_by" TEXT, "name" TEXT NOT NULL, "description" TEXT, "schedule" TEXT NOT NULL, "org_id" TEXT, CONSTRAINT "pk_planned_maintenance" PRIMARY KEY ("id"), CONSTRAINT "fk_planned_maintenance_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "planned_maintenance_rule" ("id" TEXT NOT NULL, "planned_maintenance_id" TEXT, "rule_id" TEXT, CONSTRAINT "pk_planned_maintenance_rule" PRIMARY KEY ("id"), CONSTRAINT "fk_planned_maintenance_rule_planned_maintenance_id" FOREIGN KEY ("planned_maintenance_id") REFERENCES "planned_maintenance" ("id"), CONSTRAINT "fk_planned_maintenance_rule_rule_id" FOREIGN KEY ("rule_id") REFERENCES "rule" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "quick_filter" ("id" TEXT NOT NULL, "org_id" TEXT NOT NULL, "filter" TEXT NOT NULL, "signal" TEXT NOT NULL, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "created_by" TEXT, "updated_by" TEXT, CONSTRAINT "pk_quick_filter" PRIMARY KEY ("id"), CONSTRAINT "fk_quick_filter_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "factor_password" ("id" TEXT NOT NULL, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "password" TEXT NOT NULL, "temporary" BOOLEAN NOT NULL, "user_id" TEXT NOT NULL, CONSTRAINT "pk_factor_password" PRIMARY KEY ("id"), CONSTRAINT "fk_factor_password_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "reset_password_token" ("id" TEXT NOT NULL, "token" TEXT NOT NULL, "password_id" TEXT NOT NULL, CONSTRAINT "pk_reset_password_token" PRIMARY KEY ("id"), CONSTRAINT "fk_reset_password_token_password_id" FOREIGN KEY ("password_id") REFERENCES "factor_password" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "factor_api_key" ("id" TEXT NOT NULL, "created_at" TIMESTAMP NOT NULL, "updated_at" TIMESTAMP NOT NULL, "created_by" TEXT NOT NULL, "updated_by" TEXT NOT NULL, "token" TEXT NOT NULL, "role" TEXT NOT NULL, "name" TEXT NOT NULL, "expires_at" TIMESTAMP NOT NULL, "last_used" TIMESTAMP NOT NULL, "revoked" BOOLEAN NOT NULL DEFAULT false, "user_id" TEXT NOT NULL, CONSTRAINT "pk_factor_api_key" PRIMARY KEY ("id"), CONSTRAINT "fk_factor_api_key_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "license" ("id" TEXT NOT NULL, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "key" TEXT NOT NULL, "data" TEXT, "last_validated_at" TIMESTAMP NOT NULL, "org_id" TEXT NOT NULL, CONSTRAINT "pk_license" PRIMARY KEY ("id"), CONSTRAINT "fk_license_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "trace_funnel" ("id" TEXT NOT NULL, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "created_by" TEXT, "updated_by" TEXT, "name" TEXT NOT NULL, "description" TEXT, "org_id" TEXT NOT NULL, "steps" TEXT NOT NULL, "tags" TEXT, CONSTRAINT "pk_trace_funnel" PRIMARY KEY ("id"), CONSTRAINT "fk_trace_funnel_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "dashboard" ("id" TEXT NOT NULL, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "created_by" TEXT, "updated_by" TEXT, "data" TEXT NOT NULL, "locked" BOOLEAN NOT NULL DEFAULT false, "org_id" TEXT NOT NULL, CONSTRAINT "pk_dashboard" PRIMARY KEY ("id"), CONSTRAINT "fk_dashboard_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "agent" ("id" TEXT NOT NULL, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "agent_id" TEXT NOT NULL, "org_id" TEXT NOT NULL, "terminated_at" TIMESTAMP, "status" TEXT NOT NULL, "config" TEXT NOT NULL, CONSTRAINT "pk_agent" PRIMARY KEY ("id"), CONSTRAINT "fk_agent_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "agent_config_version" ("id" TEXT NOT NULL, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "created_by" TEXT, "updated_by" TEXT, "org_id" TEXT NOT NULL, "version" INTEGER, "element_type" TEXT NOT NULL, "deploy_status" TEXT NOT NULL DEFAULT 'dirty', "deploy_sequence" INTEGER, "deploy_result" TEXT, "hash" TEXT, "config" TEXT, CONSTRAINT "pk_agent_config_version" PRIMARY KEY ("id"), CONSTRAINT "fk_agent_config_version_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "agent_config_element" ("id" TEXT NOT NULL, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "element_id" TEXT NOT NULL, "element_type" TEXT NOT NULL, "version_id" TEXT NOT NULL, CONSTRAINT "pk_agent_config_element" PRIMARY KEY ("id"), CONSTRAINT "fk_agent_config_element_version_id" FOREIGN KEY ("version_id") REFERENCES "agent_config_version" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "user_invite" ("id" TEXT NOT NULL, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "token" TEXT NOT NULL, "role" TEXT NOT NULL, "org_id" TEXT NOT NULL, CONSTRAINT "pk_user_invite" PRIMARY KEY ("id"), CONSTRAINT "fk_user_invite_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "org_domains" ("id" TEXT NOT NULL, "org_id" TEXT NOT NULL, "name" TEXT NOT NULL, "data" TEXT NOT NULL, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, CONSTRAINT "pk_org_domains" PRIMARY KEY ("id"), CONSTRAINT "fk_org_domains_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "route_policy" ("id" TEXT NOT NULL, "created_at" TIMESTAMP NOT NULL, "updated_at" TIMESTAMP NOT NULL, "created_by" TEXT NOT NULL, "updated_by" TEXT NOT NULL, "expression" TEXT NOT NULL, "kind" TEXT NOT NULL, "channels" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "enabled" BOOLEAN NOT NULL DEFAULT true, "tags" TEXT, "org_id" TEXT NOT NULL, CONSTRAINT "pk_route_policy" PRIMARY KEY ("id"), CONSTRAINT "fk_route_policy_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "auth_token" ("id" TEXT NOT NULL, "meta" TEXT NOT NULL, "prev_access_token" TEXT, "access_token" TEXT NOT NULL, "prev_refresh_token" TEXT, "refresh_token" TEXT NOT NULL, "last_observed_at" TIMESTAMP, "rotated_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL, "updated_at" TIMESTAMP NOT NULL, "user_id" TEXT NOT NULL, CONSTRAINT "pk_auth_token" PRIMARY KEY ("id"), CONSTRAINT "fk_auth_token_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "public_dashboard" ("id" TEXT NOT NULL, "time_range_enabled" BOOLEAN NOT NULL, "default_time_range" TEXT NOT NULL, "created_at" TIMESTAMP NOT NULL, "updated_at" TIMESTAMP NOT NULL, "dashboard_id" TEXT NOT NULL, CONSTRAINT "pk_public_dashboard" PRIMARY KEY ("id"), CONSTRAINT "fk_public_dashboard_dashboard_id" FOREIGN KEY ("dashboard_id") REFERENCES "dashboard" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "role" ("id" TEXT NOT NULL, "created_at" TIMESTAMP NOT NULL, "updated_at" TIMESTAMP NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "type" TEXT NOT NULL, "org_id" TEXT NOT NULL, CONSTRAINT "pk_role" PRIMARY KEY ("id"), CONSTRAINT "fk_role_org_id" FOREIGN KEY ("org_id") REFERENCES "organizations" ("id"))`,
				`CREATE TABLE IF NOT EXISTS "tuple" ("store" TEXT NOT NULL, "object_type" TEXT NOT NULL, "object_id" TEXT NOT NULL, "relation" TEXT NOT NULL, "user_object_type" TEXT NOT NULL, "user_object_id" TEXT NOT NULL, "user_relation" TEXT NOT NULL, "user_type" TEXT NOT NULL, "ulid" TEXT NOT NULL, "inserted_at" TIMESTAMP NOT NULL, "condition_name" TEXT, "condition_context" TEXT, CONSTRAINT "pk_tuple" PRIMARY KEY ("store", "object_type", "object_id", "relation", "user_object_type", "user_object_id", "user_relation"))`,
				`CREATE TABLE IF NOT EXISTS "authorization_model" ("store" TEXT NOT NULL, "authorization_model_id" TEXT NOT NULL, "schema_version" TEXT NOT NULL DEFAULT 1.1, "serialized_protobuf" TEXT NOT NULL, CONSTRAINT "pk_authorization_model" PRIMARY KEY ("store", "authorization_model_id"))`,
				`CREATE TABLE IF NOT EXISTS "store" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "created_at" TIMESTAMP NOT NULL, "updated_at" TIMESTAMP, "deleted_at" TIMESTAMP, CONSTRAINT "pk_store" PRIMARY KEY ("id"))`,
				`CREATE TABLE IF NOT EXISTS "assertion" ("store" TEXT NOT NULL, "authorization_model_id" TEXT NOT NULL, "assertions" TEXT, CONSTRAINT "pk_assertion" PRIMARY KEY ("store", "authorization_model_id"))`,
				`CREATE TABLE IF NOT EXISTS "changelog" ("store" TEXT NOT NULL, "object_type" TEXT NOT NULL, "object_id" TEXT NOT NULL, "relation" TEXT NOT NULL, "user_object_type" TEXT NOT NULL, "user_object_id" TEXT NOT NULL, "user_relation" TEXT NOT NULL, "operation" TEXT NOT NULL, "ulid" TEXT NOT NULL, "inserted_at" TIMESTAMP NOT NULL, "condition_name" TEXT, "condition_context" TEXT, CONSTRAINT "pk_changelog" PRIMARY KEY ("store", "ulid", "object_type"))`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_organizations_name" ON "organizations" ("name")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_organizations_alias" ON "organizations" ("alias")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_organizations_key" ON "organizations" ("key")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_email_org_id" ON "users" ("email", "org_id")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_alertmanager_config_org_id" ON "alertmanager_config" ("org_id")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_alertmanager_state_org_id" ON "alertmanager_state" ("org_id")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_org_preference_preference_id_org_id" ON "org_preference" ("preference_id", "org_id")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_user_preference_preference_id_user_id" ON "user_preference" ("preference_id", "user_id")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_installed_integration_type_org_id" ON "installed_integration" ("type", "org_id")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_cloud_integration_service_type_cloud_integration_id" ON "cloud_integration_service" ("type", "cloud_integration_id")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_quick_filter_org_id_signal" ON "quick_filter" ("org_id", "signal")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_factor_password_user_id" ON "factor_password" ("user_id")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_reset_password_token_password_id" ON "reset_password_token" ("password_id")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_reset_password_token_token" ON "reset_password_token" ("token")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_factor_api_key_token" ON "factor_api_key" ("token")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_license_key" ON "license" ("key")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_agent_agent_id" ON "agent" ("agent_id")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_agent_config_version_org_id_version_element_type" ON "agent_config_version" ("org_id", "version", "element_type")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_agent_config_element_element_id_element_type_version_id" ON "agent_config_element" ("element_id", "element_type", "version_id")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_user_invite_email_org_id" ON "user_invite" ("email", "org_id")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_user_invite_token" ON "user_invite" ("token")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_org_domains_name_org_id" ON "org_domains" ("name", "org_id")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_public_dashboard_dashboard_id" ON "public_dashboard" ("dashboard_id")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_role_name_org_id" ON "role" ("name", "org_id")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_tuple_ulid" ON "tuple" ("ulid")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_auth_token_access_token" ON "auth_token" ("access_token")`,
				`CREATE UNIQUE INDEX IF NOT EXISTS "uq_auth_token_refresh_token" ON "auth_token" ("refresh_token")`,
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			sqlschema := sqlschematest.New(testCase.tables, testCase.uniqueConstraints, testCase.indices)
			for _, provider := range testCase.providers {
				sqlstore := sqlstoretest.New(sqlstore.Config{Provider: provider}, sqlmock.QueryMatcherEqual)
				migration, err := NewV100Factory(sqlstore, sqlschema).New(context.Background(), providerSettings, sqlmigration.Config{})
				require.NoError(t, err)

				sqlstore.Mock().ExpectBegin()
				for _, expectedSQL := range testCase.expectedSQLs {
					sqlstore.Mock().ExpectExec(expectedSQL).WillReturnResult(sqlmock.NewResult(1, 1))
				}
				sqlstore.Mock().ExpectCommit()

				err = migration.Up(context.Background(), sqlstore.BunDB())
				require.NoError(t, err)
			}
		})
	}
}
