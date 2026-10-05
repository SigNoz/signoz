package sqlmigration

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"

	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/sqlstore"
)

type quickFilterSourceRow struct {
	bun.BaseModel `bun:"table:quick_filter"`

	ID     string `bun:"id,pk"`
	Source string `bun:"source"`
	Filter string `bun:"filter"`
}

type quickFilterStaticField struct {
	name          string
	fieldContext  string
	fieldDataType string
}

// quickFilterSpanFields are the span-level fields the fields API serves with
// the span context, keyed by every name a stored filter may carry for them.
var quickFilterSpanFields = func() map[string]quickFilterStaticField {
	fields := map[string]quickFilterStaticField{}
	for name, dataType := range map[string]string{
		"trace_id": "string", "span_id": "string", "trace_state": "string", "parent_span_id": "string",
		"flags": "number", "name": "string", "kind": "number", "kind_string": "string",
		"duration_nano": "number", "status_code": "number", "status_message": "string", "status_code_string": "string",
		"response_status_code": "string", "external_http_url": "string", "http_url": "string",
		"external_http_method": "string", "http_method": "string", "http_host": "string",
		"db_name": "string", "db_operation": "string", "has_error": "bool", "is_remote": "string",
	} {
		fields[name] = quickFilterStaticField{name: name, fieldContext: "span", fieldDataType: dataType}
	}
	for deprecated, current := range map[string]string{
		"responseStatusCode": "response_status_code", "externalHttpUrl": "external_http_url", "httpUrl": "http_url",
		"externalHttpMethod": "external_http_method", "httpMethod": "http_method", "httpHost": "http_host",
		"dbName": "db_name", "dbOperation": "db_operation", "hasError": "has_error", "isRemote": "is_remote",
	} {
		fields[deprecated] = fields[current]
	}
	return fields
}()

// quickFilterLogFields are the log-level fields the fields API serves with
// the log context.
var quickFilterLogFields = map[string]quickFilterStaticField{
	"body":            {name: "body", fieldContext: "log", fieldDataType: "string"},
	"severity_text":   {name: "severity_text", fieldContext: "log", fieldDataType: "string"},
	"severity_number": {name: "severity_number", fieldContext: "log", fieldDataType: "number"},
	"trace_id":        {name: "trace_id", fieldContext: "log", fieldDataType: "string"},
	"span_id":         {name: "span_id", fieldContext: "log", fieldDataType: "string"},
	"trace_flags":     {name: "trace_flags", fieldContext: "log", fieldDataType: "number"},
}

type normalizeQuickFilterFields struct {
	settings factory.ProviderSettings
}

func NewNormalizeQuickFilterFieldsFactory(sqlstore sqlstore.SQLStore) factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("normalize_quick_filter_fields"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &normalizeQuickFilterFields{settings: ps}, nil
	})
}

func (migration *normalizeQuickFilterFields) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *normalizeQuickFilterFields) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var rows []*quickFilterSourceRow
	if err := tx.NewSelect().Model(&rows).Scan(ctx); err != nil {
		return err
	}

	var migrated, skipped int
	for _, row := range rows {
		normalized, changed, ok := normalizeQuickFilterEntries(row.Source, row.Filter)
		if !ok {
			migration.settings.Logger.WarnContext(ctx, "quick filter could not be parsed, leaving it untouched", slog.String("quick_filter_id", row.ID), slog.String("raw_filter", row.Filter))
			skipped++
			continue
		}
		if !changed {
			continue
		}

		migrated++
		if _, err := tx.NewUpdate().Model((*quickFilterSourceRow)(nil)).Set("filter = ?", normalized).Where("id = ?", row.ID).Exec(ctx); err != nil {
			return err
		}
	}

	migration.settings.Logger.InfoContext(ctx, "normalized quick filter static fields", slog.Int("total", len(rows)), slog.Int("migrated", migrated), slog.Int("skipped", skipped))

	return tx.Commit()
}

func (migration *normalizeQuickFilterFields) Down(context.Context, *bun.DB) error {
	return nil
}

// normalizeQuickFilterEntries rewrites the static fields of a stored filter
// list to the name, context and data type the fields API serves them with:
// span fields for the trace-based sources, log fields for logs, whatever
// context the legacy seeds gave them. Other keys are left as they are;
// ok=false means unparseable.
func normalizeQuickFilterEntries(source string, filter string) (normalized string, changed bool, ok bool) {
	var staticFields map[string]quickFilterStaticField
	switch source {
	case "traces", "api_monitoring", "exceptions", "ai_observability":
		staticFields = quickFilterSpanFields
	case "logs":
		staticFields = quickFilterLogFields
	default:
		return "", false, true
	}

	var entries []telemetryFieldKeyOutput
	if err := json.Unmarshal([]byte(filter), &entries); err != nil {
		return "", false, false
	}

	for i, entry := range entries {
		field, static := staticFields[entry.Name]
		if !static {
			continue
		}
		if entry.Name == field.name && entry.FieldContext == field.fieldContext && entry.FieldDataType == field.fieldDataType {
			continue
		}
		entries[i].Name = field.name
		entries[i].FieldContext = field.fieldContext
		entries[i].FieldDataType = field.fieldDataType
		changed = true
	}

	if !changed {
		return "", false, true
	}

	normalizedJSON, err := marshalUnescaped(entries)
	if err != nil {
		return "", false, false
	}
	return string(normalizedJSON), true, true
}
