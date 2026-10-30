package sqlmigration

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"

	"github.com/SigNoz/signoz/pkg/factory"
)

// deprecatedTraceFields maps the legacy camelCase trace fields to their current key.
var deprecatedTraceFields = map[string]renamedTraceField{
	"traceID":            {"trace_id", "span"},
	"spanID":             {"span_id", "span"},
	"parentSpanID":       {"parent_span_id", "span"},
	"spanKind":           {"kind_string", "span"},
	"durationNano":       {"duration_nano", "span"},
	"statusCode":         {"status_code", "span"},
	"statusMessage":      {"status_message", "span"},
	"statusCodeString":   {"status_code_string", "span"},
	"responseStatusCode": {"response_status_code", "span"},
	"externalHttpUrl":    {"external_http_url", "span"},
	"httpUrl":            {"http_url", "span"},
	"externalHttpMethod": {"external_http_method", "span"},
	"httpMethod":         {"http_method", "span"},
	"httpHost":           {"http_host", "span"},
	"dbName":             {"db_name", "span"},
	"dbOperation":        {"db_operation", "span"},
	"hasError":           {"has_error", "span"},
	"isRemote":           {"is_remote", "span"},
	"serviceName":        {"service.name", "resource"},
	"httpRoute":          {"http.route", "attribute"},
	"msgSystem":          {"messaging.system", "attribute"},
	"msgOperation":       {"messaging.operation", "attribute"},
	"dbSystem":           {"db.system", "attribute"},
	"rpcSystem":          {"rpc.system", "attribute"},
	"rpcService":         {"rpc.service", "attribute"},
	"rpcMethod":          {"rpc.method", "attribute"},
	"peerService":        {"peer.service", "attribute"},
}

func NewRenameSavedViewDeprecatedTraceFieldsFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("rename_saved_view_deprecated_trace_fields"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &renameSavedViewDeprecatedTraceFields{settings: ps}, nil
	})
}

type storableSavedViewTraceFieldsRow struct {
	bun.BaseModel `bun:"table:saved_view"`

	ID     string `bun:"id,pk,type:text"`
	Source string `bun:"source,type:text"`
	Data   string `bun:"data,type:text"`
}

type renamedTraceField struct {
	name         string
	fieldContext string
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
		renamedData, changed, ok := renameDeprecatedTraceFields(row.Data)
		if !ok {
			migration.settings.Logger.WarnContext(ctx, "saved view data could not be parsed, leaving it untouched", slog.String("saved_view_id", row.ID))
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

// renameDeprecatedTraceFields rewrites deprecated names in spec.selectedFields. Returns
// ok=false if data can't be parsed, and changed=false if there was nothing to rename.
func renameDeprecatedTraceFields(data string) (renamed string, changed bool, ok bool) {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal([]byte(data), &raw); err != nil {
		return "", false, false
	}

	var spec map[string]json.RawMessage
	if err := json.Unmarshal(raw["spec"], &spec); err != nil {
		return "", false, false
	}

	fields, ok := spec["selectedFields"]
	if !ok {
		return "", false, true
	}

	renamedFields, changed, ok := renameDeprecatedTraceFieldList(fields)
	if !ok {
		return "", false, false
	}
	if !changed {
		return "", false, true
	}
	spec["selectedFields"] = renamedFields

	renamedSpec, err := marshalUnescaped(spec)
	if err != nil {
		return "", false, false
	}
	raw["spec"] = renamedSpec

	renamedData, err := marshalUnescaped(raw)
	if err != nil {
		return "", false, false
	}

	return string(renamedData), true, true
}

// renameDeprecatedTraceFieldList renames deprecated entries, keeping every other key
// of the entry as is. A renamed entry already selected with the same context is dropped.
func renameDeprecatedTraceFieldList(fieldsRaw json.RawMessage) (json.RawMessage, bool, bool) {
	if isJSONNull(fieldsRaw) {
		return nil, false, true
	}

	var fields []map[string]json.RawMessage
	if err := json.Unmarshal(fieldsRaw, &fields); err != nil {
		return nil, false, false
	}

	keys := make([]renamedTraceField, len(fields))
	selected := make(map[renamedTraceField]struct{}, len(fields))
	for i, field := range fields {
		_ = json.Unmarshal(field["name"], &keys[i].name)
		_ = json.Unmarshal(field["fieldContext"], &keys[i].fieldContext)
		selected[keys[i]] = struct{}{}
	}

	changed := false
	renamedFields := make([]map[string]json.RawMessage, 0, len(fields))
	for i, field := range fields {
		renamedField, ok := deprecatedTraceFields[keys[i].name]
		if !ok {
			renamedFields = append(renamedFields, field)
			continue
		}

		changed = true
		if _, ok := selected[renamedField]; ok {
			continue
		}
		selected[renamedField] = struct{}{}

		field["name"], _ = json.Marshal(renamedField.name)
		field["fieldContext"], _ = json.Marshal(renamedField.fieldContext)
		renamedFields = append(renamedFields, field)
	}

	if !changed {
		return nil, false, true
	}

	renamedFieldsJSON, err := marshalUnescaped(renamedFields)
	if err != nil {
		return nil, false, false
	}

	return renamedFieldsJSON, true, true
}

func isJSONNull(raw json.RawMessage) bool {
	return len(raw) == 0 || string(raw) == "null"
}
