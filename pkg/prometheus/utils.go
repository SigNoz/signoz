package prometheus

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/prometheus/prometheus/model/labels"
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

	dropLabels := func(metric labels.Labels) labels.Labels {
		b := labels.NewBuilder(metric)
		for name := range toRemove {
			b.Del(name)
		}
		return b.Labels()
	}

	switch res.Value.(type) {
	case promql.Vector:
		value := res.Value.(promql.Vector)
		for i := range value {
			(value)[i].Metric = dropLabels((value)[i].Metric)
		}
	case promql.Matrix:
		value := res.Value.(promql.Matrix)
		for i := range value {
			(value)[i].Metric = dropLabels((value)[i].Metric)
		}
	case promql.Scalar:
		return nil
	default:
		return errors.NewInternalf(errors.CodeInternal, "rule result is not a vector or scalar or matrix")
	}
	return nil
}
