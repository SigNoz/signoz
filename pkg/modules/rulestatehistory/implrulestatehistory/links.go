package implrulestatehistory

import (
	"context"
	"encoding/json"
	"time"

	"github.com/SigNoz/signoz/pkg/contextlinks"
	"github.com/SigNoz/signoz/pkg/types/rulestatehistorytypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// relatedLinkBuilder builds logs/traces explorer links that carry the rule's
// filter and the entry's labels, so a history entry can be opened in the
// explorer with the context that produced it.
type relatedLinkBuilder struct {
	alertType  ruletypes.AlertType
	evaluation ruletypes.Evaluation
	pairs      []contextlinks.BuilderQueryPair
}

// relatedLinkBuilderForRule returns nil when the rule cannot be loaded or is
// not a logs/traces rule; callers then leave the links empty.
func (m *module) relatedLinkBuilderForRule(ctx context.Context, orgID valuer.UUID, ruleID string) *relatedLinkBuilder {
	id, err := valuer.NewUUID(ruleID)
	if err != nil {
		return nil
	}

	storableRule, err := m.ruleStore.GetStoredRule(ctx, orgID, id)
	if err != nil {
		return nil
	}

	rule := ruletypes.PostableRule{}
	if err := json.Unmarshal([]byte(storableRule.Data), &rule); err != nil {
		return nil
	}

	if rule.AlertType != ruletypes.AlertTypeLogs && rule.AlertType != ruletypes.AlertTypeTraces {
		return nil
	}
	if rule.RuleCondition == nil || rule.RuleCondition.CompositeQuery == nil {
		return nil
	}

	builder := &relatedLinkBuilder{alertType: rule.AlertType}
	if rule.Evaluation != nil {
		if evaluation, err := rule.Evaluation.GetEvaluation(); err == nil {
			builder.evaluation = evaluation
		}
	}
	if builder.evaluation == nil {
		evalWindow := rule.EvalWindow
		if evalWindow.IsZero() {
			evalWindow = valuer.MustParseTextDuration("5m")
		}
		builder.evaluation = ruletypes.RollingWindow{EvalWindow: evalWindow}
	}

	signal := telemetrytypes.SignalLogs
	if rule.AlertType == ruletypes.AlertTypeTraces {
		signal = telemetrytypes.SignalTraces
	}
	// links are still built from the labels alone when the rule has no builder
	// query for the signal (e.g. ClickHouse SQL alerts)
	builder.pairs, _ = contextlinks.BuilderQueriesForSignal(rule.RuleCondition.CompositeQuery.Queries, signal)

	return builder
}

// queryWindow returns the range the rule evaluated when it recorded a state
// change at unixMilli.
// why are we subtracting 3 minutes?
// the query range is calculated based on the rule's evaluation window and
// evalDelay; alerts have 2 minutes delay built in, so we need to subtract
// that from the start time to get the correct query range.
func (b *relatedLinkBuilder) queryWindow(unixMilli int64) (time.Time, time.Time) {
	start, end := b.evaluation.NextWindowFor(time.Unix(unixMilli/1000, 0))
	return start.Add(-3 * time.Minute), end
}

// links returns the encoded logs and traces explorer query params for the
// given entry labels and time range; at most one of the two is non-empty.
func (b *relatedLinkBuilder) links(labels rulestatehistorytypes.LabelsString, start, end time.Time) (string, string) {
	lbls := map[string]string{}
	if err := json.Unmarshal([]byte(labels), &lbls); err != nil {
		return "", ""
	}

	switch b.alertType {
	case ruletypes.AlertTypeLogs:
		return contextlinks.PrepareParamsForLogsV5(start, end, b.pairs, lbls).Encode(), ""
	case ruletypes.AlertTypeTraces:
		return "", contextlinks.PrepareParamsForTracesV5(start, end, b.pairs, lbls).Encode()
	}
	return "", ""
}
