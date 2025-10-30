package sqlrulestore

import (
	"context"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/uptrace/bun"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type rule struct {
	sqlstore sqlstore.SQLStore
}

func NewRuleStore(store sqlstore.SQLStore) ruletypes.RuleStore {
	return &rule{sqlstore: store}
}

func (r *rule) CreateRule(ctx context.Context, storedRule *ruletypes.Rule, cb func(context.Context, valuer.UUID) error) (valuer.UUID, error) {
	err := r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		_, err := r.sqlstore.
			BunDBCtx(ctx).
			NewInsert().
			Model(storedRule).
			Exec(ctx)
		if err != nil {
			return err
		}

		return cb(ctx, storedRule.ID)
	})

	if err != nil {
		return valuer.UUID{}, err
	}

	return storedRule.ID, nil
}

func (r *rule) EditRule(ctx context.Context, storedRule *ruletypes.Rule, cb func(context.Context) error) error {
	return r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		_, err := r.sqlstore.
			BunDBCtx(ctx).
			NewUpdate().
			Model(storedRule).
			Where("id = ?", storedRule.ID.StringValue()).
			Exec(ctx)
		if err != nil {
			return err
		}

		return cb(ctx)
	})
}

func (r *rule) DeleteRule(ctx context.Context, id valuer.UUID, cb func(context.Context) error) error {
	if err := r.sqlstore.RunInTxCtx(ctx, nil, func(ctx context.Context) error {
		_, err := r.sqlstore.
			BunDBCtx(ctx).
			NewDelete().
			Model(new(ruletypes.Rule)).
			Where("id = ?", id.StringValue()).
			Exec(ctx)
		if err != nil {
			return err
		}

		return cb(ctx)
	}); err != nil {
		return err
	}

	return nil
}

func (r *rule) GetStoredRules(ctx context.Context, orgID string) ([]*ruletypes.Rule, error) {
	rules := make([]*ruletypes.Rule, 0)
	err := r.sqlstore.
		BunDB().
		NewSelect().
		Model(&rules).
		Where("org_id = ?", orgID).
		Scan(ctx)
	if err != nil {
		return rules, err
	}

	return rules, nil
}

func (r *rule) GetStoredRule(ctx context.Context, id valuer.UUID) (*ruletypes.Rule, error) {
	rule := new(ruletypes.Rule)
	err := r.sqlstore.
		BunDB().
		NewSelect().
		Model(rule).
		Where("id = ?", id.StringValue()).
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return rule, nil
}

func (r *rule) GetRuleLabelKeys(ctx context.Context, searchText string, limit int, orgId string) ([]string, error) {
	labelKeys := make([]string, 0)
	elements := r.sqlstore.Formatter().JSONKeys("data", "$.labels", "keys")
	searchText = searchText + "%"
	query := r.sqlstore.BunDB().
		NewSelect().
		Distinct().
		ColumnExpr("keys.key").
		TableExpr("rule, ?", bun.SafeQuery(elements)).
		Where("keys.key LIKE ?", searchText).
		Where("org_id = ?", orgId).
		Limit(limit)
	err := query.Scan(ctx, &labelKeys)
	if err != nil {
		return labelKeys, r.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "search keys for rule with orgId %s not found", orgId)
	}
	return labelKeys, nil
}

func (r *rule) GetThresholdNames(ctx context.Context, searchText string, limit int, orgId string) ([]string, error) {
	names := make([]string, 0)
	searchText = searchText + "%"
	specQuery, specCol := r.sqlstore.Formatter().JSONArrayElements("data",
		"$.condition.thresholds.spec", "spec")
	query := r.sqlstore.BunDB().
		NewSelect().
		Distinct().
		ColumnExpr("?", bun.SafeQuery(r.sqlstore.Formatter().JSONExtractString(specCol, "$.name"))).
		TableExpr("rule, ?",
			bun.Safe(specQuery)).
		Where("? LIKE ?", bun.SafeQuery(r.sqlstore.Formatter().JSONExtractString(specCol, "$.name")), searchText).
		Where("org_id = ?", orgId).Limit(limit)
	err := query.Scan(ctx, &names)
	if err != nil {
		return names, err
	}

	extractString := r.sqlstore.Formatter().JSONExtractString("data", "$.labels.severity")

	thresholds := make([]string, 0)
	query = r.sqlstore.BunDB().
		NewSelect().
		Distinct().
		ColumnExpr("?", bun.SafeQuery(extractString)).
		TableExpr("rule").
		Where("org_id = ?", orgId).
		Where("? LIKE ?", bun.SafeQuery(extractString), searchText).
		Limit(limit)
	err = query.Scan(ctx, &thresholds)
	if err != nil {
		return names, err
	}
	names = append(names, thresholds...)
	return names, nil
}

func (r *rule) GetChannel(ctx context.Context, searchText string, limit int, orgId string) ([]string, error) {
	names := make([]string, 0)
	specSQL, specCol := r.sqlstore.Formatter().JSONArrayElements("data", "$.condition.thresholds.spec", "spec")
	channelSql, channelCol := r.sqlstore.Formatter().JSONArrayOfStrings(specCol, "$.channels", "channels")

	searchText = searchText + "%"
	query := r.sqlstore.BunDB().
		NewSelect().
		Distinct().
		ColumnExpr("?", bun.SafeQuery(channelCol)).
		TableExpr("rule, ?, ?",
			bun.Safe(specSQL),
			bun.Safe(channelSql)).
		Where("? LIKE ?",
			bun.SafeQuery(channelCol), searchText).
		Where("org_id = ?", orgId).Limit(limit)
	err := query.Scan(ctx, &names)
	if err != nil {
		return nil, err
	}

	//v1 queries
	channelsSQL, channelsCol := r.sqlstore.Formatter().JSONArrayOfStrings("data", "$.preferredChannels", "channels")
	channels := make([]string, 0)
	query = r.sqlstore.BunDB().
		NewSelect().
		Distinct().
		ColumnExpr("?", bun.Safe(channelsCol)).
		TableExpr("rule, ?", bun.Safe(channelsSQL)).
		Where("? LIKE ?", bun.Safe(channelsCol), searchText).
		Where("org_id = ?", orgId).Limit(limit)
	err = query.Scan(ctx, &channels)
	if err != nil {
		return nil, err
	}
	names = append(names, channels...)
	return names, nil
}

func (r *rule) GetNames(ctx context.Context, searchText string, limit int, orgId string) ([]string, error) {
	names := make([]string, 0)
	namePath := r.sqlstore.Formatter().JSONExtractString("data", "$.names")
	searchText = searchText + "%"
	query := r.sqlstore.BunDB().
		NewSelect().
		Distinct().
		ColumnExpr("?", bun.SafeQuery(namePath)).
		Table("rule").
		Where("? LIKE ?", bun.SafeQuery(namePath), searchText).
		Where("org_id = ?", orgId).
		Limit(limit)
	err := query.Scan(ctx, &names)
	if err != nil {
		return names, err
	}
	return names, nil
}

func (r *rule) GetCreatedBy(ctx context.Context, searchText string, limit int, orgId string) ([]string, error) {
	names := make([]string, 0)
	searchText = searchText + "%"
	query := r.sqlstore.BunDB().NewSelect().
		Distinct().
		Column("created_by").
		Table("rule").
		Where("org_id = ?", orgId).
		Where("? LIKE ?", bun.SafeQuery("created_by"), searchText).
		Limit(limit)
	err := query.Scan(ctx, &names)
	if err != nil {
		return nil, err
	}
	return names, nil
}

func (r *rule) GetUpdatedBy(ctx context.Context, searchText string, limit int, orgId string) ([]string, error) {
	names := make([]string, 0)
	searchText = searchText + "%"
	query := r.sqlstore.BunDB().NewSelect().
		Distinct().
		Column("updated_by").
		Table("rule").
		Where("org_id = ?", orgId).
		Where("? LIKE ?", bun.SafeQuery("updated_by"), searchText).
		Limit(limit)
	err := query.Scan(ctx, &names)
	if err != nil {
		return nil, err
	}
	return names, nil
}

func (r *rule) GetRuleLabelValues(ctx context.Context, searchText string, limit int, labelKey string, orgId string) ([]string, error) {
	names := make([]string, 0)
	labelPath := r.sqlstore.Formatter().JSONExtractString("data", "$.labels."+labelKey)
	searchText = searchText + "%"
	query := r.sqlstore.BunDB().NewSelect().
		Distinct().
		ColumnExpr("?", bun.SafeQuery(labelPath)).
		TableExpr("rule").
		Where("org_id = ?", orgId).
		Where("? LIKE ?", bun.SafeQuery(labelPath), searchText).Limit(limit)
	err := query.Scan(ctx, &names)
	if err != nil {
		return nil, err
	}
	return names, nil
}
