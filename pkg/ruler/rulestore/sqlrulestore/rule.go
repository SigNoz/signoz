package sqlrulestore

import (
	"context"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/uptrace/bun"
	"strings"

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
	searchText = strings.ToLower(searchText) + "%"
	fmter := r.sqlstore.Formatter()

	elements, elementsAlias := fmter.JSONKeys("data", "$.labels", "keys")
	elementsAliasStr := string(fmter.LowerExpression(string(elementsAlias)))
	query := r.sqlstore.BunDB().
		NewSelect().
		Distinct().
		ColumnExpr("?", bun.SafeQuery(elementsAliasStr)).
		TableExpr("rule, ?", bun.SafeQuery(string(elements))).
		Where("? LIKE ?", bun.SafeQuery(elementsAliasStr), searchText).
		Where("org_id = ?", orgId).
		Limit(limit)
	err := query.Scan(ctx, &labelKeys)
	if err != nil {
		return nil, r.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "search keys for rule with orgId %s not found", orgId)
	}

	return labelKeys, nil
}

func (r *rule) GetThresholdNames(ctx context.Context, searchText string, limit int, orgId string) ([]string, error) {
	names := make([]string, 0)
	searchText = strings.ToLower(searchText) + "%"
	fmter := r.sqlstore.Formatter()

	// Query threshold spec names
	specQuery, specCol := fmter.JSONArrayElements("data", "$.condition.thresholds.spec", "spec")
	nameQuery := string(fmter.JSONExtractString(string(specCol), "$.name"))
	lowerNameQuery := string(fmter.LowerExpression(nameQuery))

	query := r.sqlstore.BunDB().
		NewSelect().
		Distinct().
		ColumnExpr("?", bun.SafeQuery(nameQuery)).
		TableExpr("rule, ?", bun.SafeQuery(string(specQuery))).
		Where("? LIKE ?", bun.SafeQuery(lowerNameQuery), searchText).
		Where("org_id = ?", orgId).
		Limit(limit)

	err := query.Scan(ctx, &names)
	if err != nil {
		return nil, r.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "threshold names for rule with orgId %s not found", orgId)
	}

	if len(names) >= limit {
		return names[:limit], nil
	}

	severityQuery := string(fmter.JSONExtractString("data", "$.labels.severity"))
	lowerSeverityQuery := string(fmter.LowerExpression(severityQuery))

	thresholds := make([]string, 0)
	query = r.sqlstore.BunDB().
		NewSelect().
		Distinct().
		ColumnExpr("?", bun.SafeQuery(severityQuery)).
		TableExpr("rule").
		Where("org_id = ?", orgId).
		Where("? LIKE ?", bun.SafeQuery(lowerSeverityQuery), searchText).
		Limit(limit - len(names))

	err = query.Scan(ctx, &thresholds)
	if err != nil {
		return nil, r.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "threshold names for rule with orgId %s not found", orgId)
	}

	names = append(names, thresholds...)
	return names, nil
}

func (r *rule) GetChannel(ctx context.Context, searchText string, limit int, orgId string) ([]string, error) {
	names := make([]string, 0)
	searchText = strings.ToLower(searchText) + "%"
	fmter := r.sqlstore.Formatter()

	// Query v2 threshold channels
	specSQL, specCol := fmter.JSONArrayElements("data", "$.condition.thresholds.spec", "spec")
	channelSQL, channelCol := fmter.JSONArrayOfStrings(string(specCol), "$.channels", "channels")
	lowerChannelCol := string(fmter.LowerExpression(string(channelCol)))

	query := r.sqlstore.BunDB().
		NewSelect().
		Distinct().
		ColumnExpr("?", bun.SafeQuery(string(channelCol))).
		TableExpr("rule, ?, ?",
			bun.SafeQuery(string(specSQL)),
			bun.SafeQuery(string(channelSQL))).
		Where("? LIKE ?", bun.SafeQuery(lowerChannelCol), searchText).
		Where("org_id = ?", orgId).
		Limit(limit)

	err := query.Scan(ctx, &names)
	if err != nil {
		return nil, r.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "channel for rule with orgId %s not found", orgId)
	}

	if len(names) >= limit {
		return names[:limit], nil
	}

	// Query v1 preferred channels
	channelsSQL, channelsCol := fmter.JSONArrayOfStrings("data", "$.preferredChannels", "channels")
	lowerChannelsCol := fmter.LowerExpression(string(channelsCol))

	channels := make([]string, 0)
	query = r.sqlstore.BunDB().
		NewSelect().
		Distinct().
		ColumnExpr("?", bun.SafeQuery(string(channelsCol))).
		TableExpr("rule, ?", bun.SafeQuery(string(channelsSQL))).
		Where("? LIKE ?", bun.SafeQuery(string(lowerChannelsCol)), searchText).
		Where("org_id = ?", orgId).
		Limit(limit - len(names))

	err = query.Scan(ctx, &channels)
	if err != nil {
		return nil, r.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "channel for rule with orgId %s not found", orgId)
	}

	names = append(names, channels...)
	return names, nil
}

func (r *rule) GetNames(ctx context.Context, searchText string, limit int, orgId string) ([]string, error) {
	names := make([]string, 0)
	searchText = strings.ToLower(searchText) + "%"
	fmter := r.sqlstore.Formatter()

	namePath := fmter.JSONExtractString("data", "$.alert")
	lowerNamePath := fmter.LowerExpression(string(namePath))

	query := r.sqlstore.BunDB().
		NewSelect().
		Distinct().
		ColumnExpr("?", bun.SafeQuery(string(namePath))).
		TableExpr("?", bun.SafeQuery("rule")).
		Where("? LIKE ?", bun.SafeQuery(string(lowerNamePath)), searchText).
		Where("org_id = ?", orgId).
		Limit(limit)

	err := query.Scan(ctx, &names)
	if err != nil {
		return nil, r.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "names for rule with orgId %s not found", orgId)
	}

	return names, nil
}

func (r *rule) GetCreatedBy(ctx context.Context, searchText string, limit int, orgId string) ([]string, error) {
	names := make([]string, 0)
	searchText = strings.ToLower(searchText) + "%"
	query := r.sqlstore.BunDB().NewSelect().
		Distinct().
		Column("created_by").
		TableExpr("?", bun.SafeQuery("rule")).
		Where("org_id = ?", orgId).
		Where("? LIKE ?", bun.SafeQuery(string(r.sqlstore.Formatter().LowerExpression("created_by"))), searchText).
		Limit(limit)
	err := query.Scan(ctx, &names)
	if err != nil {
		return nil, err
	}
	return names, nil
}

func (r *rule) GetUpdatedBy(ctx context.Context, searchText string, limit int, orgId string) ([]string, error) {
	names := make([]string, 0)
	searchText = strings.ToLower(searchText) + "%"
	query := r.sqlstore.BunDB().NewSelect().
		Distinct().
		Column("updated_by").
		TableExpr("?", bun.SafeQuery("rule")).
		Where("org_id = ?", orgId).
		Where("? LIKE ?", bun.SafeQuery(string(r.sqlstore.Formatter().LowerExpression("updated_by"))), searchText).
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
	searchText = strings.ToLower(searchText) + "%"
	query := r.sqlstore.BunDB().NewSelect().
		Distinct().
		ColumnExpr("?", bun.SafeQuery(string(labelPath))).
		TableExpr("?", bun.SafeQuery("rule")).
		Where("org_id = ?", orgId).
		Where("? LIKE ?", bun.SafeQuery(string(r.sqlstore.Formatter().LowerExpression(string(labelPath)))), searchText).Limit(limit)
	err := query.Scan(ctx, &names)
	if err != nil {
		return nil, r.sqlstore.WrapNotFoundErrf(err, errors.CodeNotFound, "search values for rule with orgId %s not found", orgId)
	}
	return names, nil
}
