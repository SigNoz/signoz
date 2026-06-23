package memorycache

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"go.opentelemetry.io/otel/metric"
)

type telemetry struct {
	cacheRatio   metric.Float64ObservableGauge
	cacheHits    metric.Int64ObservableCounter
	cacheMisses  metric.Int64ObservableCounter
	costAdded    metric.Int64ObservableCounter
	costEvicted  metric.Int64ObservableCounter
	keysAdded    metric.Int64ObservableCounter
	keysEvicted  metric.Int64ObservableCounter
	keysUpdated  metric.Int64ObservableCounter
	setsDropped  metric.Int64ObservableCounter
	setsRejected metric.Int64ObservableCounter
	getsDropped  metric.Int64ObservableCounter
	getsKept     metric.Int64ObservableCounter
	costUsed     metric.Int64ObservableGauge
	totalCost    metric.Int64ObservableGauge
}

func newMetrics(meter metric.Meter) (*telemetry, error) {
	var errs error
	cacheRatio, err := meter.Float64ObservableGauge("signoz.cache.ratio", metric.WithDescription("Ratio is the number of Hits over all accesses (Hits + Misses). This is the percentage of successful Get calls."), metric.WithUnit("1"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	cacheHits, err := meter.Int64ObservableCounter("signoz.cache.hits", metric.WithDescription("Hits is the number of Get calls where a value was found for the corresponding key."))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	cacheMisses, err := meter.Int64ObservableCounter("signoz.cache.misses", metric.WithDescription("Misses is the number of Get calls where a value was not found for the corresponding key"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	costAdded, err := meter.Int64ObservableCounter("signoz.cache.cost.added", metric.WithDescription("CostAdded is the sum of costs that have been added (successful Set calls)"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	costEvicted, err := meter.Int64ObservableCounter("signoz.cache.cost.evicted", metric.WithDescription("CostEvicted is the sum of all costs that have been evicted"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	keysAdded, err := meter.Int64ObservableCounter("signoz.cache.keys.added", metric.WithDescription("KeysAdded is the total number of Set calls where a new key-value item was added"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	keysEvicted, err := meter.Int64ObservableCounter("signoz.cache.keys.evicted", metric.WithDescription("KeysEvicted is the total number of keys evicted"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	keysUpdated, err := meter.Int64ObservableCounter("signoz.cache.keys.updated", metric.WithDescription("KeysUpdated is the total number of Set calls where the value was updated"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	setsDropped, err := meter.Int64ObservableCounter("signoz.cache.sets.dropped", metric.WithDescription("SetsDropped is the number of Set calls that don't make it into internal buffers (due to contention or some other reason)"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	setsRejected, err := meter.Int64ObservableCounter("signoz.cache.sets.rejected", metric.WithDescription("SetsRejected is the number of Set calls rejected by the policy (TinyLFU)"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	getsDropped, err := meter.Int64ObservableCounter("signoz.cache.gets.dropped", metric.WithDescription("GetsDropped is the number of Get calls that don't make it into internal buffers (due to contention or some other reason)"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	getsKept, err := meter.Int64ObservableCounter("signoz.cache.gets.kept", metric.WithDescription("GetsKept is the number of Get calls that make it into internal buffers"))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	costUsed, err := meter.Int64ObservableGauge("signoz.cache.cost.used", metric.WithDescription("CostUsed is the current retained cost in the cache (CostAdded - CostEvicted)."))
	if err != nil {
		errs = errors.Join(errs, err)
	}

	totalCost, err := meter.Int64ObservableGauge("signoz.cache.total.cost", metric.WithDescription("TotalCost is the configured MaxCost ceiling for the cache."))
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
		costUsed:     costUsed,
		totalCost:    totalCost,
	}, nil
}
