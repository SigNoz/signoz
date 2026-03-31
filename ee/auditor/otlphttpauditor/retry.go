package otlphttpauditor

import (
	"time"

	"github.com/SigNoz/signoz/pkg/auditor"
	client "github.com/SigNoz/signoz/pkg/http/client"
)

// retrier implements client.Retriable with exponential backoff
// derived from auditor.RetryConfig.
type retrier struct {
	initialInterval time.Duration
	maxInterval     time.Duration
}

func newRetrier(cfg auditor.RetryConfig) *retrier {
	return &retrier{
		initialInterval: cfg.InitialInterval,
		maxInterval:     cfg.MaxInterval,
	}
}

// NextInterval returns the backoff duration for the given retry attempt.
// Uses exponential backoff: initialInterval * 2^retry, capped at maxInterval.
func (r *retrier) NextInterval(retry int) time.Duration {
	interval := r.initialInterval
	for range retry {
		interval *= 2
	}
	return min(interval, r.maxInterval)
}

func retrierOption(cfg auditor.RetryConfig) client.Option {
	return client.WithRetriable(newRetrier(cfg))
}

func retryCountFromConfig(cfg auditor.RetryConfig) int {
	if !cfg.Enabled || cfg.MaxElapsedTime <= 0 {
		return 0
	}

	count := 0
	elapsed := time.Duration(0)
	interval := cfg.InitialInterval
	for elapsed < cfg.MaxElapsedTime {
		elapsed += interval
		interval = min(interval*2, cfg.MaxInterval)
		count++
	}
	return count
}
