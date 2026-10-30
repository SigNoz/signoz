package sqlmigration

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"

	"github.com/SigNoz/signoz/pkg/factory"
)

// deprecatedTraceFields maps the legacy camelCase trace fields to their current name.
var deprecatedTraceFields = map[string]string{
	"traceID":            "trace_id",
	"spanID":             "span_id",
	"parentSpanID":       "parent_span_id",
	"spanKind":           "kind_string",
	"durationNano":       "duration_nano",
	"statusCode":         "status_code",
	"statusMessage":      "status_message",
	"statusCodeString":   "status_code_string",
	"responseStatusCode": "response_status_code",
	"externalHttpUrl":    "external_http_url",
	"httpUrl":            "http_url",
	"externalHttpMethod": "external_http_method",
	"httpMethod":         "http_method",
	"httpHost":           "http_host",
	"dbName":             "db_name",
	"dbOperation":        "db_operation",
	"hasError":           "has_error",
	"isRemote":           "is_remote",
	"serviceName":        "service.name",
	"httpRoute":          "http.route",
	"msgSystem":          "messaging.system",
	"msgOperation":       "messaging.operation",
	"dbSystem":           "db.system",
	"rpcSystem":          "rpc.system",
	"rpcService":         "rpc.service",
	"rpcMethod":          "rpc.method",
	"peerService":        "peer.service",
}

func NewRenameSavedViewDeprecatedTraceFieldsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("rename_saved_view_trace_fields"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &renameSavedViewDeprecatedTraceFields{settings: ps}, nil
	})
}

type storableSavedViewTraceFieldsRow struct {
	bun.BaseModel `bun:"table:saved_view"`

	ID     string `bun:"id,pk,type:text"`
	Source string `bun:"source,type:text"`
	Data   string `bun:"data,type:text"`
}

type renameSavedViewDeprecatedTraceFields struct {
	settings factory.ProviderSettings
}

func (migration *renameSavedViewDeprecatedTraceFields) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *renameSavedViewDeprecatedTraceFields) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var rows []*storableSavedViewTraceFieldsRow
	if err := tx.NewSelect().Model(&rows).Where("source = ?", "traces").Scan(ctx); err != nil {
		return err
	}

	var renamed, skipped int
	for _, row := range rows {
		renamedData, changed, err := renameDeprecatedTraceFields(row.Data)
		if err != nil {
			migration.settings.Logger.WarnContext(ctx, "saved view data could not be parsed, leaving it untouched", slog.String("saved_view_id", row.ID), slog.Any("error", err))
			skipped++
			continue
		}
		if !changed {
			continue
		}

		renamed++
		if _, err := tx.NewUpdate().Model((*storableSavedViewTraceFieldsRow)(nil)).Set("data = ?", renamedData).Where("id = ?", row.ID).Exec(ctx); err != nil {
			return err
		}
	}

	migration.settings.Logger.InfoContext(ctx, "renamed deprecated trace fields in saved views", slog.Int("total", len(rows)), slog.Int("renamed", renamed), slog.Int("skipped", skipped))

	return tx.Commit()
}

func (migration *renameSavedViewDeprecatedTraceFields) Down(context.Context, *bun.DB) error {
	return nil
}

// renameDeprecatedTraceFields renames deprecated entries in spec.selectedFields and drops
// their fieldContext, which legacy entries carry as "attribute", so the query builder
// resolves it. Other keys of the entry are kept as is. A renamed entry whose new name is
// already selected is dropped. Returns changed=false if there was nothing to rename.
func renameDeprecatedTraceFields(data string) (string, bool, error) {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal([]byte(data), &raw); err != nil {
		return "", false, err
	}

	var spec map[string]json.RawMessage
	if err := json.Unmarshal(raw["spec"], &spec); err != nil {
		return "", false, err
	}

	var fields []map[string]json.RawMessage
	if selectedFields, ok := spec["selectedFields"]; ok {
		if err := json.Unmarshal(selectedFields, &fields); err != nil {
			return "", false, err
		}
	}

	names := make([]string, len(fields))
	selected := make(map[string]struct{}, len(fields))
	for i, field := range fields {
		_ = json.Unmarshal(field["name"], &names[i])
		selected[names[i]] = struct{}{}
	}

	changed := false
	renamedFields := make([]map[string]json.RawMessage, 0, len(fields))
	for i, field := range fields {
		newName, ok := deprecatedTraceFields[names[i]]
		if !ok {
			renamedFields = append(renamedFields, field)
			continue
		}

		changed = true
		if _, ok := selected[newName]; ok {
			continue
		}
		selected[newName] = struct{}{}

		field["name"], _ = json.Marshal(newName)
		delete(field, "fieldContext")
		renamedFields = append(renamedFields, field)
	}

	if !changed {
		return "", false, nil
	}

	var err error
	if spec["selectedFields"], err = marshalUnescaped(renamedFields); err != nil {
		return "", false, err
	}
	if raw["spec"], err = marshalUnescaped(spec); err != nil {
		return "", false, err
	}

	renamedData, err := marshalUnescaped(raw)
	if err != nil {
		return "", false, err
	}

	return string(renamedData), true, nil
}
