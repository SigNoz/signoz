package rules

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/query-service/utils/labels"
	"github.com/SigNoz/signoz/pkg/query-service/utils/times"
	"github.com/SigNoz/signoz/pkg/query-service/utils/timestamp"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/units"
)

type EvalVectorOptions struct {
	DeleteLabels     []string
	ExtraAnnotations func(ctx context.Context, ts time.Time, metric labels.Labels) []labels.Label
}

func (r *BaseRule) EvalVector(ctx context.Context, ts time.Time, res ruletypes.Vector, opts EvalVectorOptions) (int, error) {
	prevState := r.State()
	valueFormatter := units.FormatterFromUnit(r.Unit())

	r.mtx.Lock()
	defer r.mtx.Unlock()

	resultFPs := map[uint64]struct{}{}
	alerts := make(map[uint64]*ruletypes.Alert, len(res))

	ruleReceivers := r.Threshold.GetRuleReceivers()
	ruleReceiverMap := make(map[string][]string)
	for _, value := range ruleReceivers {
		ruleReceiverMap[value.Name] = value.Channels
	}

	for _, smpl := range res {
		l := make(map[string]string, len(smpl.Metric))
		for _, lbl := range smpl.Metric {
			l[lbl.Name] = lbl.Value
		}

		r.logger.DebugContext(ctx, "alerting for series", "rule_name", r.Name(), "series", smpl)

		value := valueFormatter.Format(smpl.V, r.Unit())
		threshold := valueFormatter.Format(smpl.Target, smpl.TargetUnit)
		r.logger.DebugContext(ctx, "Alert template data for rule", "rule_name", r.Name(), "formatter", valueFormatter.Name(), "value", value, "threshold", threshold)

		tmplData := ruletypes.AlertTemplateData(l, value, threshold)
		// Inject some convenience variables that are easier to remember for users
		// who are not used to Go's templating system.
		defs := "{{$labels := .Labels}}{{$value := .Value}}{{$threshold := .Threshold}}"

		// utility function to apply go template on labels and annotations
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
				r.logger.ErrorContext(ctx, "Expanding alert template failed", "rule_name", r.Name(), errors.Attr(err), "data", tmplData)
			}
			return result
		}

		lb := labels.NewBuilder(smpl.Metric).Del(opts.DeleteLabels...).Del()
		resultLabels := labels.NewBuilder(smpl.Metric).Del(opts.DeleteLabels...).Labels()

		for name, value := range r.labels.Map() {
			lb.Set(name, expand(value))
		}

		lb.Set(labels.AlertNameLabel, r.Name())
		lb.Set(labels.AlertRuleIdLabel, r.ID())
		lb.Set(labels.RuleSourceLabel, r.GeneratorURL())

		annotations := make(labels.Labels, 0, len(r.annotations.Map()))
		for name, value := range r.annotations.Map() {
			annotations = append(annotations, labels.Label{Name: name, Value: expand(value)})
		}
		if smpl.IsMissing {
			lb.Set(labels.AlertNameLabel, "[No data] "+r.Name())
			lb.Set(labels.NoDataLabel, "true")
		}

		if opts.ExtraAnnotations != nil {
			extra := opts.ExtraAnnotations(ctx, ts, smpl.Metric)
			annotations = append(annotations, extra...)
		}

		lbs := lb.Labels()
		h := lbs.Hash()
		resultFPs[h] = struct{}{}

		if _, ok := alerts[h]; ok {
			r.logger.ErrorContext(ctx, "the alert query returns duplicate records", "rule_id", r.ID(), "alert", alerts[h])
			err := fmt.Errorf("duplicate alert found, vector contains metrics with the same labelset after applying alert labels")
			// We have already acquired the lock above hence using SetHealth and SetLastError will deadlock.
			r.health = ruletypes.HealthBad
			r.lastError = err
			return 0, err
		}

		alerts[h] = &ruletypes.Alert{
			Labels:            lbs,
			QueryResultLables: resultLabels,
			Annotations:       annotations,
			ActiveAt:          ts,
			State:             model.StatePending,
			Value:             smpl.V,
			GeneratorURL:      r.GeneratorURL(),
			Receivers:         ruleReceiverMap[lbs.Map()[ruletypes.LabelThresholdName]],
			Missing:           smpl.IsMissing,
			IsRecovering:      smpl.IsRecovering,
		}
	}

	r.logger.InfoContext(ctx, "number of alerts found", "rule_name", r.Name(), "alerts_count", len(alerts))

	// alerts[h] is ready, add or update active list now
	for h, a := range alerts {
		// Check whether we already have alerting state for the identifying label set.
		// Update the last value and annotations if so, create a new alert entry otherwise.
		if alert, ok := r.Active[h]; ok && alert.State != model.StateInactive {
			alert.Value = a.Value
			alert.Annotations = a.Annotations
			// Update the recovering and missing state of existing alert
			alert.IsRecovering = a.IsRecovering
			alert.Missing = a.Missing
			if v, ok := alert.Labels.Map()[ruletypes.LabelThresholdName]; ok {
				alert.Receivers = ruleReceiverMap[v]
			}
			continue
		}

		r.Active[h] = a
	}

	itemsToAdd := []model.RuleStateHistory{}

	// Check if any pending alerts should be removed or fire now. Write out alert timeseries.
	for fp, a := range r.Active {
		labelsJSON, err := json.Marshal(a.QueryResultLables)
		if err != nil {
			r.logger.ErrorContext(ctx, "error marshaling labels", errors.Attr(err), "rule_name", r.Name(), "labels", a.Labels)
		}
		if _, ok := resultFPs[fp]; !ok {
			// If the alert was previously firing, keep it around for a given
			// retention time so it is reported as resolved to the AlertManager.
			if a.State == model.StatePending || (!a.ResolvedAt.IsZero() && ts.Sub(a.ResolvedAt) > ruletypes.ResolvedRetention) {
				delete(r.Active, fp)
			}
			if a.State != model.StateInactive {
				r.logger.DebugContext(ctx, "converting firing alert to inActive", "name", r.Name())
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
					Value:        a.Value,
				})
			}
			continue
		}

		if a.State == model.StatePending && ts.Sub(a.ActiveAt) >= r.holdDuration.Duration() {
			r.logger.DebugContext(ctx, "converting pending alert to firing", "name", r.Name())
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

		// We need to change firing alert to recovering if the returned sample meets recovery threshold
		changeFiringToRecovering := a.State == model.StateFiring && a.IsRecovering
		// We need to change recovering alerts to firing if the returned sample meets target threshold
		changeRecoveringToFiring := a.State == model.StateRecovering && !a.IsRecovering && !a.Missing
		// in any of the above case we need to update the status of alert
		if changeFiringToRecovering || changeRecoveringToFiring {
			state := model.StateRecovering
			if changeRecoveringToFiring {
				state = model.StateFiring
			}
			a.State = state
			r.logger.DebugContext(ctx, "converting alert state", "name", r.Name(), "state", state)
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

	currentState := r.State()

	overallStateChanged := currentState != prevState
	for idx, item := range itemsToAdd {
		item.OverallStateChanged = overallStateChanged
		item.OverallState = currentState
		itemsToAdd[idx] = item
	}

	r.RecordRuleStateHistory(ctx, prevState, currentState, itemsToAdd)

	r.health = ruletypes.HealthGood
	r.lastError = nil

	return len(r.Active), nil
}
