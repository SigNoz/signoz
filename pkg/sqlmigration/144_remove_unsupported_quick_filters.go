package sqlmigration

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"

	"github.com/SigNoz/signoz/pkg/factory"
)

var unsupportedQuickFilterNames = map[string]struct{}{
	// IDs and per-record values
	"trace_id":            {},
	"traceID":             {},
	"span_id":             {},
	"spanID":              {},
	"parent_span_id":      {},
	"parentSpanID":        {},
	"timestamp":           {},
	"body":                {},
	"gen_ai.tool.call.id": {},

	// Free-text payloads
	"gen_ai.input.messages":       {},
	"gen_ai.output.messages":      {},
	"gen_ai.system_instructions":  {},
	"gen_ai.prompt":               {},
	"gen_ai.completion":           {},
	"gen_ai.tool.call.arguments":  {},
	"gen_ai.tool.call.result":     {},
	"ai.prompt.messages":          {},
	"ai.toolCall.result":          {},
	"llm.input_messages":          {},
	"input.value":                 {},
	"output.value":                {},
	"langfuse.observation.input":  {},
	"langfuse.observation.output": {},
	"traceloop.entity.input":      {},
	"traceloop.entity.output":     {},
	"final_result":                {},
	"exception.message":           {},
	"exception.stacktrace":        {},
	"db.statement":                {},
	"db.query.text":               {},

	// Token counts
	"gen_ai.usage.input_tokens":                              {},
	"gen_ai.usage.output_tokens":                             {},
	"gen_ai.usage.total_tokens":                              {},
	"gen_ai.usage.prompt_tokens":                             {},
	"gen_ai.usage.completion_tokens":                         {},
	"gen_ai.usage.cached_input_tokens":                       {},
	"gen_ai.usage.input_tokens.cached":                       {},
	"gen_ai.usage.cache_read.input_tokens":                   {},
	"gen_ai.usage.cache_read_input_tokens":                   {},
	"gen_ai.usage.cache_creation.input_tokens":               {},
	"gen_ai.usage.cache_creation_input_tokens":               {},
	"gen_ai.usage.cache_write.input_tokens":                  {},
	"gen_ai.usage.reasoning.output_tokens":                   {},
	"gen_ai.usage.reasoning_tokens":                          {},
	"gen_ai.usage.prompt_token_details.cached_read_tokens":   {},
	"gen_ai.usage.completion_token_details.reasoning_tokens": {},
	"ai.usage.inputTokens":                                   {},
	"ai.usage.outputTokens":                                  {},
	"ai.usage.promptTokens":                                  {},
	"ai.usage.completionTokens":                              {},
	"llm.token_count.prompt":                                 {},
	"llm.token_count.completion":                             {},
	"llm.token_count.total":                                  {},
	"llm.token_count.prompt_details.cache_read":              {},
	"llm.token_count.prompt_details.cache_write":             {},
	"llm.token_count.completion_details.reasoning":           {},
	"llm.usage.prompt_tokens":                                {},
	"llm.usage.completion_tokens":                            {},
	"llm.usage.total_tokens":                                 {},
	"input_tokens":                                           {},
	"output_tokens":                                          {},
	"cache_read_tokens":                                      {},
	"cache_creation_tokens":                                  {},

	// Per-span costs
	"signoz.gen_ai.usage.input_tokens.cost":             {},
	"signoz.gen_ai.usage.output_tokens.cost":            {},
	"signoz.gen_ai.usage.cache_read.input_tokens.cost":  {},
	"signoz.gen_ai.usage.cache_write.input_tokens.cost": {},
	"signoz.gen_ai.usage.tokens.cost":                   {},
}

type removeUnsupportedQuickFilters struct {
	settings factory.ProviderSettings
}

func NewRemoveUnsupportedQuickFiltersFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("drop_unsupported_quick_filters"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &removeUnsupportedQuickFilters{settings: ps}, nil
	})
}

func (migration *removeUnsupportedQuickFilters) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *removeUnsupportedQuickFilters) Up(ctx context.Context, db *bun.DB) error {
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
		filtered, changed, ok := removeUnsupportedQuickFilterEntries(row.Filter)
		if !ok {
			migration.settings.Logger.WarnContext(ctx, "quick filter could not be parsed, leaving it untouched", slog.String("quick_filter_id", row.ID), slog.String("raw_filter", row.Filter))
			skipped++
			continue
		}
		if !changed {
			continue
		}

		migrated++
		if _, err := tx.NewUpdate().Model((*quickFilterSourceRow)(nil)).Set("filter = ?", filtered).Where("id = ?", row.ID).Exec(ctx); err != nil {
			return err
		}
	}

	migration.settings.Logger.InfoContext(ctx, "removed unsupported quick filters", slog.Int("total", len(rows)), slog.Int("migrated", migrated), slog.Int("skipped", skipped))

	return tx.Commit()
}

func (migration *removeUnsupportedQuickFilters) Down(context.Context, *bun.DB) error {
	return nil
}

// removeUnsupportedQuickFilterEntries drops entries whose name is in
// unsupportedQuickFilterNames; the remaining entries are kept byte-for-byte.
// ok=false means unparseable.
func removeUnsupportedQuickFilterEntries(filter string) (filtered string, changed bool, ok bool) {
	var entries []json.RawMessage
	if err := json.Unmarshal([]byte(filter), &entries); err != nil {
		return "", false, false
	}

	kept := make([][]byte, 0, len(entries))
	for _, entry := range entries {
		var key struct {
			Name string `json:"name"`
		}
		if err := json.Unmarshal(entry, &key); err != nil {
			return "", false, false
		}
		if _, unsupported := unsupportedQuickFilterNames[key.Name]; unsupported {
			changed = true
			continue
		}
		kept = append(kept, entry)
	}

	if !changed {
		return "", false, true
	}

	return "[" + string(bytes.Join(kept, []byte(","))) + "]", true, true
}
