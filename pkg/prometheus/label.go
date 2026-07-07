package prometheus

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/prometheus/prometheus/model/labels"
	"github.com/prometheus/prometheus/promql"
)

const FingerprintAsPromLabelName string = "fingerprint"

func RemoveExtraLabels(res *promql.Result, labelsToRemove ...string) error {
	if len(labelsToRemove) == 0 || res == nil {
		return nil
	}

	switch res.Value.(type) {
	case promql.Vector:
		value := res.Value.(promql.Vector)
		for i := range value {
			b := labels.NewBuilder(value[i].Metric)
			b.Del(labelsToRemove...)
			newLabels := b.Labels()
			value[i].Metric = newLabels
		}
	case promql.Matrix:
		value := res.Value.(promql.Matrix)
		for i := range value {
			b := labels.NewBuilder(value[i].Metric)
			b.Del(labelsToRemove...)
			newLabels := b.Labels()
			value[i].Metric = newLabels
		}
	case promql.Scalar:
		return nil
	default:
		return errors.NewInternalf(errors.CodeInternal, "rule result is not a vector or scalar or matrix")
	}
	return nil
}
