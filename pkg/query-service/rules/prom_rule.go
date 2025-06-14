package rules

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"go.uber.org/zap"

	"github.com/SigNoz/signoz/pkg/prometheus"
	"github.com/SigNoz/signoz/pkg/query-service/formatter"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
	qslabels "github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	"github.com/SigNoz/signoz/pkg/query-service/utils/times"
	"github.com/SigNoz/signoz/pkg/query-service/utils/timestamp"
	ruletypes "github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/prometheus/prometheus/promql"
	yaml "gopkg.in/yaml.v2"
)

type PromRule struct {
	*BaseRule
	prometheus prometheus.Prometheus
}

func NewPromRule(
	id string,
	orgID valuer.UUID,
	postableRule *ruletypes.PostableRule,
	logger *zap.Logger,
	reader interfaces.Reader,
	prometheus prometheus.Prometheus,
	opts ...RuleOption,
) (*PromRule, error) {

	baseRule, err := NewBaseRule(id, orgID, postableRule, reader, opts...)
	if err != nil {
		return nil, err
	}

	p := PromRule{
		BaseRule:   baseRule,
		prometheus: prometheus,
	}
	p.logger = logger

	query, err := p.getPqlQuery()

	if err != nil {
		// can not generate a valid prom QL query
		return nil, err
	}
	zap.L().Info("creating new prom rule", zap.String("name", p.name), zap.String("query", query))
	return &p, nil
}

func (r *PromRule) Type() ruletypes.RuleType {
	return ruletypes.RuleTypeProm
}

func (r *PromRule) GetSelectedQuery() string {
	if r.ruleCondition != nil {
		// If the user has explicitly set the selected query, we return that.
		if r.ruleCondition.SelectedQuery != "" {
			return r.ruleCondition.SelectedQuery
		}
		// Historically, we used to have only one query in the alerts for promql.
		// So, if there is only one query, we return that.
		// This is to maintain backward compatibility.
		// For new rules, we will have to explicitly set the selected query.
		return "A"
	}
	// This should never happen.
	return ""
}

func (r *PromRule) getPqlQuery() (string, error) {

	if r.ruleCondition.CompositeQuery.QueryType == v3.QueryTypePromQL {
		if len(r.ruleCondition.CompositeQuery.PromQueries) > 0 {
			selectedQuery := r.GetSelectedQuery()
			if promQuery, ok := r.ruleCondition.CompositeQuery.PromQueries[selectedQuery]; ok {
				query := promQuery.Query
				if query == "" {
					return query, fmt.Errorf("a promquery needs to be set for this rule to function")
				}
				return query, nil
			}
		}
	}

	return "", fmt.Errorf("invalid promql rule query")
}

func (r *PromRule) Eval(ctx context.Context, ts time.Time) (interface{}, error) {

	prevState := r.State()

	start := ts.Add(-r.evalWindow)
	end := ts
	interval := 60 * time.Second // TODO(srikanthccv): this should be configurable

	valueFormatter := formatter.FromUnit(r.Unit())

	q, err := r.getPqlQuery()
	if err != nil {
		return nil, err
	}
	zap.L().Info("evaluating promql query", zap.String("name", r.Name()), zap.String("query", q))
	res, err := r.RunAlertQuery(ctx, q, start, end, interval)
	if err != nil {
		r.SetHealth(ruletypes.HealthBad)
		r.SetLastError(err)
		return nil, err
	}

	r.mtx.Lock()
	defer r.mtx.Unlock()

	resultFPs := map[uint64]struct{}{}

	var alerts = make(map[uint64]*ruletypes.Alert, len(res))

	for _, series := range res {
		l := make(map[string]string, len(series.Metric))
		for _, lbl := range series.Metric {
			l[lbl.Name] = lbl.Value
		}

		if len(series.Floats) == 0 {
			continue
		}

		alertSmpl, shouldAlert := r.ShouldAlert(toCommonSeries(series))
		if !shouldAlert {
			continue
		}
		zap.L().Debug("alerting for series", zap.String("name", r.Name()), zap.Any("series", series))

		threshold := valueFormatter.Format(r.targetVal(), r.Unit())

		tmplData := ruletypes.AlertTemplateData(l, valueFormatter.Format(alertSmpl.V, r.Unit()), threshold)
		// Inject some convenience variables that are easier to remember for users
		// who are not used to Go's templating system.
		defs := "{{$labels := .Labels}}{{$value := .Value}}{{$threshold := .Threshold}}"

		expand := func(text string) string {

			tmpl := ruletypes.NewTemplateExpander(
				ctx,
				defs+text,
				"__alert_"+r.Name(),
				tmplData,
				times.Time(timestamp.FromTime(ts)),
				nil,
			)
			result, err := tmpl.Expand()
			if err != nil {
				result = fmt.Sprintf("<error expanding template: %s>", err)
				r.logger.Warn("Expanding alert template failed", zap.Error(err), zap.Any("data", tmplData))
			}
			return result
		}

		lb := qslabels.NewBuilder(alertSmpl.Metric).Del(qslabels.MetricNameLabel)
		resultLabels := qslabels.NewBuilder(alertSmpl.Metric).Del(qslabels.MetricNameLabel).Labels()

		for name, value := range r.labels.Map() {
			lb.Set(name, expand(value))
		}

		lb.Set(qslabels.AlertNameLabel, r.Name())
		lb.Set(qslabels.AlertRuleIdLabel, r.ID())
		lb.Set(qslabels.RuleSourceLabel, r.GeneratorURL())

		annotations := make(qslabels.Labels, 0, len(r.annotations.Map()))
		for name, value := range r.annotations.Map() {
			annotations = append(annotations, qslabels.Label{Name: name, Value: expand(value)})
		}

		lbs := lb.Labels()
		h := lbs.Hash()
		resultFPs[h] = struct{}{}

		if _, ok := alerts[h]; ok {
			err = fmt.Errorf("vector contains metrics with the same labelset after applying alert labels")
			// We have already acquired the lock above hence using SetHealth and
			// SetLastError will deadlock.
			r.health = ruletypes.HealthBad
			r.lastError = err
			return nil, err
		}

		alerts[h] = &ruletypes.Alert{
			Labels:            lbs,
			QueryResultLables: resultLabels,
			Annotations:       annotations,
			ActiveAt:          ts,
			State:             model.StatePending,
			Value:             alertSmpl.V,
			GeneratorURL:      r.GeneratorURL(),
			Receivers:         r.preferredChannels,
		}
	}

	zap.L().Debug("found alerts for rule", zap.Int("count", len(alerts)), zap.String("name", r.Name()))
	// alerts[h] is ready, add or update active list now
	for h, a := range alerts {
		// Check whether we already have alerting state for the identifying label set.
		// Update the last value and annotations if so, create a new alert entry otherwise.
		if alert, ok := r.Active[h]; ok && alert.State != model.StateInactive {
			alert.Value = a.Value
			alert.Annotations = a.Annotations
			alert.Receivers = r.preferredChannels
			continue
		}

		r.Active[h] = a

	}

	itemsToAdd := []model.RuleStateHistory{}

	// Check if any pending alerts should be removed or fire now. Write out alert timeseries.
	for fp, a := range r.Active {
		labelsJSON, err := json.Marshal(a.QueryResultLables)
		if err != nil {
			zap.L().Error("error marshaling labels", zap.Error(err), zap.String("name", r.Name()))
		}
		if _, ok := resultFPs[fp]; !ok {
			// If the alert was previously firing, keep it around for a given
			// retention time so it is reported as resolved to the AlertManager.
			if a.State == model.StatePending || (!a.ResolvedAt.IsZero() && ts.Sub(a.ResolvedAt) > ruletypes.ResolvedRetention) {
				delete(r.Active, fp)
			}
			if a.State != model.StateInactive {
				a.State = model.StateInactive
				a.ResolvedAt = ts
				itemsToAdd = append(itemsToAdd, model.RuleStateHistory{
					RuleID:       r.ID(),
					RuleName:     r.Name(),
					State:        model.StateInactive,
					StateChanged: true,
					UnixMilli:    ts.UnixMilli(),
					Labels:       model.LabelsString(labelsJSON),
					Fingerprint:  a.QueryResultLables.Hash(),
				})
			}
			continue
		}

		if a.State == model.StatePending && ts.Sub(a.ActiveAt) >= r.holdDuration {
			a.State = model.StateFiring
			a.FiredAt = ts
			state := model.StateFiring
			if a.Missing {
				state = model.StateNoData
			}
			itemsToAdd = append(itemsToAdd, model.RuleStateHistory{
				RuleID:       r.ID(),
				RuleName:     r.Name(),
				State:        state,
				StateChanged: true,
				UnixMilli:    ts.UnixMilli(),
				Labels:       model.LabelsString(labelsJSON),
				Fingerprint:  a.QueryResultLables.Hash(),
				Value:        a.Value,
			})
		}

	}
	r.health = ruletypes.HealthGood
	r.lastError = err

	currentState := r.State()

	overallStateChanged := currentState != prevState
	for idx, item := range itemsToAdd {
		item.OverallStateChanged = overallStateChanged
		item.OverallState = currentState
		itemsToAdd[idx] = item
	}

	r.RecordRuleStateHistory(ctx, prevState, currentState, itemsToAdd)

	return len(r.Active), nil
}

func (r *PromRule) String() string {

	ar := ruletypes.PostableRule{
		AlertName:         r.name,
		RuleCondition:     r.ruleCondition,
		EvalWindow:        ruletypes.Duration(r.evalWindow),
		Labels:            r.labels.Map(),
		Annotations:       r.annotations.Map(),
		PreferredChannels: r.preferredChannels,
	}

	byt, err := yaml.Marshal(ar)
	if err != nil {
		return fmt.Sprintf("error marshaling alerting rule: %s", err.Error())
	}

	return string(byt)
}

func (r *PromRule) RunAlertQuery(ctx context.Context, qs string, start, end time.Time, interval time.Duration) (promql.Matrix, error) {
	q, err := r.prometheus.Engine().NewRangeQuery(ctx, r.prometheus.Storage(), nil, qs, start, end, interval)
	if err != nil {
		return nil, err
	}

	res := q.Exec(ctx)

	if res.Err != nil {
		return nil, res.Err
	}

	switch typ := res.Value.(type) {
	case promql.Vector:
		series := make([]promql.Series, 0, len(typ))
		value := res.Value.(promql.Vector)
		for _, smpl := range value {
			series = append(series, promql.Series{
				Metric: smpl.Metric,
				Floats: []promql.FPoint{{T: smpl.T, F: smpl.F}},
			})
		}
		return series, nil
	case promql.Scalar:
		value := res.Value.(promql.Scalar)
		series := make([]promql.Series, 0, 1)
		series = append(series, promql.Series{
			Floats: []promql.FPoint{{T: value.T, F: value.V}},
		})
		return series, nil
	case promql.Matrix:
		return res.Value.(promql.Matrix), nil
	default:
		return nil, fmt.Errorf("rule result is not a vector or scalar")
	}
}

func toCommonSeries(series promql.Series) v3.Series {
	commonSeries := v3.Series{
		Labels:      make(map[string]string),
		LabelsArray: make([]map[string]string, 0),
		Points:      make([]v3.Point, 0),
	}

	for _, lbl := range series.Metric {
		commonSeries.Labels[lbl.Name] = lbl.Value
		commonSeries.LabelsArray = append(commonSeries.LabelsArray, map[string]string{
			lbl.Name: lbl.Value,
		})
	}

	for _, f := range series.Floats {
		commonSeries.Points = append(commonSeries.Points, v3.Point{
			Timestamp: f.T,
			Value:     f.F,
		})
	}

	return commonSeries
}
