package sqlmigration

import (
	"context"
	"encoding/json"
	"log/slog"
	"regexp"
	"strings"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"

	"github.com/SigNoz/signoz/pkg/factory"
)

const deleteLLMPricingRulesBatchSize = 500

// Mirrors the zeus LLMPriceFilter and its default model authors.
// https://github.com/SigNoz/zeus/pull/591/changes
var (
	llmPricingRuleProviders = map[string]struct{}{
		"openai": {}, "anthropic": {}, "google": {}, "mistralai": {}, "deepseek": {},
		"qwen": {}, "x-ai": {}, "meta-llama": {}, "cohere": {}, "amazon": {},
	}
	qwenHostedModelPattern = regexp.MustCompile(`max|plus|flash|turbo`)
)

type llmPricingRuleSyncedRow struct {
	bun.BaseModel `bun:"table:llm_pricing_rule"`

	ID       string `bun:"id,pk"`
	Provider string `bun:"provider"`
	Model    string `bun:"model"`
	Pricing  string `bun:"pricing"`
}

type llmPricingRulePrices struct {
	Input  float64 `json:"input"`
	Output float64 `json:"output"`
}

type deleteUnsupportedLLMPricingRules struct {
	settings factory.ProviderSettings
}

func NewDeleteUnsupportedLLMPricingRulesFactory() factory.ProviderFactory[SQLMigration, Config] {
	return factory.NewProviderFactory(factory.MustNewName("delete_unsupported_llm_pricing_rules"), func(ctx context.Context, ps factory.ProviderSettings, c Config) (SQLMigration, error) {
		return &deleteUnsupportedLLMPricingRules{settings: ps}, nil
	})
}

func (migration *deleteUnsupportedLLMPricingRules) Register(migrations *migrate.Migrations) error {
	return migrations.Register(migration.Up, migration.Down)
}

func (migration *deleteUnsupportedLLMPricingRules) Up(ctx context.Context, db *bun.DB) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var rows []*llmPricingRuleSyncedRow
	if err := tx.NewSelect().
		Model(&rows).
		Where("source_id IS NOT NULL").
		Where("NOT is_override").
		Scan(ctx); err != nil {
		return err
	}

	ids := make([]string, 0)
	for _, row := range rows {
		var prices llmPricingRulePrices
		if err := json.Unmarshal([]byte(row.Pricing), &prices); err != nil {
			migration.settings.Logger.WarnContext(ctx, "llm pricing rule has unparseable pricing, leaving it untouched", slog.String("rule_id", row.ID), slog.String("raw_pricing", row.Pricing))
			continue
		}
		if !llmPricingRuleSupported(row.Provider, row.Model, prices) {
			ids = append(ids, row.ID)
		}
	}

	for start := 0; start < len(ids); start += deleteLLMPricingRulesBatchSize {
		end := min(start+deleteLLMPricingRulesBatchSize, len(ids))
		if _, err := tx.NewDelete().
			Model((*llmPricingRuleSyncedRow)(nil)).
			Where("id IN (?)", bun.In(ids[start:end])).
			Exec(ctx); err != nil {
			return err
		}
	}

	migration.settings.Logger.InfoContext(ctx, "deleted unsupported llm pricing rules", slog.Int("total", len(rows)), slog.Int("deleted", len(ids)))

	return tx.Commit()
}

func (migration *deleteUnsupportedLLMPricingRules) Down(context.Context, *bun.DB) error {
	return nil
}

// The provider allowlist also rejects "~" alias ids, whose provider segment
// starts with "~", and ids without a "/" that were stored as "unknown".
func llmPricingRuleSupported(provider, model string, prices llmPricingRulePrices) bool {
	if _, ok := llmPricingRuleProviders[provider]; !ok {
		return false
	}
	if strings.Contains(model, ":") {
		return false
	}
	if prices.Input <= 0 || prices.Output <= 0 {
		return false
	}
	if provider == "qwen" && !qwenHostedModelPattern.MatchString(model) {
		return false
	}
	return true
}
