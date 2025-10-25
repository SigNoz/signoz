package prometheus

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/prometheus/prometheus/promql"
)

func RemoveExtraLabels(res *promql.Result, labelsToRemove ...string) error {
	if len(labelsToRemove) == 0 || res == nil {
		return nil
	}

	toRemove := make(map[string]struct{}, len(labelsToRemove))
	for _, l := range labelsToRemove {
		toRemove[l] = struct{}{}
	}

	switch res.Value.(type) {
	case promql.Vector:
		value := res.Value.(promql.Vector)
		for i := range value {
			series := &(value)[i]
			dst := series.Metric[:0]
			for _, lbl := range series.Metric {
				if _, drop := toRemove[lbl.Name]; !drop {
					dst = append(dst, lbl)
				}
			}
			series.Metric = dst
		}
	case promql.Matrix:
		value := res.Value.(promql.Matrix)
		for i := range value {
			series := &(value)[i]
			dst := series.Metric[:0]
			for _, lbl := range series.Metric {
				if _, drop := toRemove[lbl.Name]; !drop {
					dst = append(dst, lbl)
				}
			}
			series.Metric = dst
		}
	case promql.Scalar:
		return nil
	default:
		return errors.NewInternalf(errors.CodeInternal, "rule result is not a vector or scalar or matrix")
	}
	return nil
}
