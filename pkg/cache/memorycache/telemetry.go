package memorycache

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"go.opentelemetry.io/otel/metric"
)

type telemetry struct {
	cacheRatio   metric.Float64ObservableGauge
	cacheHits    metric.Int64ObservableGauge
	cacheMisses  metric.Int64ObservableGauge
	costAdded    metric.Int64ObservableGauge
	costEvicted  metric.Int64ObservableGauge
	keysAdded    metric.Int64ObservableGauge
	keysEvicted  metric.Int64ObservableGauge
	keysUpdated  metric.Int64ObservableGauge
	setsDropped  metric.Int64ObservableGauge
	setsRejected metric.Int64ObservableGauge
	getsDropped  metric.Int64ObservableGauge
	getsKept     metric.Int64ObservableGauge
	totalCost    metric.Int64ObservableGauge
}

func newMetrics(meter metric.Meter) (*telemetry, error) {
	var errs error
	cacheRatio, err := meter.Float64ObservableGauge("signoz.cache.ratio", metric.WithDescription("Ratio is the number of Hits over all accesses (Hits + Misses). This is the percentage of successful Get calls."), metric.WithUnit("1"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	cacheHits, err := meter.Int64ObservableGauge("signoz.cache.hits", metric.WithDescription("Hits is the number of Get calls where a value was found for the corresponding key."))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	cacheMisses, err := meter.Int64ObservableGauge("signoz.cache.misses", metric.WithDescription("Misses is the number of Get calls where a value was not found for the corresponding key"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	costAdded, err := meter.Int64ObservableGauge("signoz.cache.cost.added", metric.WithDescription("CostAdded is the sum of costs that have been added (successful Set calls)"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	costEvicted, err := meter.Int64ObservableGauge("signoz.cache.cost.evicted", metric.WithDescription("CostEvicted is the sum of all costs that have been evicted"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	keysAdded, err := meter.Int64ObservableGauge("signoz.cache.keys.added", metric.WithDescription("KeysAdded is the total number of Set calls where a new key-value item was added"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	keysEvicted, err := meter.Int64ObservableGauge("signoz.cache.keys.evicted", metric.WithDescription("KeysEvicted is the total number of keys evicted"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	keysUpdated, err := meter.Int64ObservableGauge("signoz.cache.keys.updated", metric.WithDescription("KeysUpdated is the total number of Set calls where the value was updated"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	setsDropped, err := meter.Int64ObservableGauge("signoz.cache.sets.dropped", metric.WithDescription("SetsDropped is the number of Set calls that don't make it into internal buffers (due to contention or some other reason)"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	setsRejected, err := meter.Int64ObservableGauge("signoz.cache.sets.rejected", metric.WithDescription("SetsRejected is the number of Set calls rejected by the policy (TinyLFU)"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	getsDropped, err := meter.Int64ObservableGauge("signoz.cache.gets.dropped", metric.WithDescription("GetsDropped is the number of Get calls that don't make it into internal buffers (due to contention or some other reason)"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	getsKept, err := meter.Int64ObservableGauge("signoz.cache.gets.kept", metric.WithDescription("GetsKept is the number of Get calls that make it into internal buffers"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	totalCost, err := meter.Int64ObservableGauge("signoz.cache.total.cost", metric.WithDescription("TotalCost is the available cost configured for the cache"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	if errs != nil {
		return nil, errs
	}

	return &telemetry{
		cacheRatio:   cacheRatio,
		cacheHits:    cacheHits,
		cacheMisses:  cacheMisses,
		costAdded:    costAdded,
		costEvicted:  costEvicted,
		keysAdded:    keysAdded,
		keysEvicted:  keysEvicted,
		keysUpdated:  keysUpdated,
		setsDropped:  setsDropped,
		setsRejected: setsRejected,
		getsDropped:  getsDropped,
		getsKept:     getsKept,
		totalCost:    totalCost,
	}, nil
}
