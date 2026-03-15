package licensing

import (
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/licensing"
)

var (
	config licensing.Config
	once   sync.Once
)

// initializes the licensing configuration
func Config(pollInterval time.Duration, failureThreshold int) (licensing.Config, error) {
once.Do(func() {
	config = licensing.Config{PollInterval: pollInterval, FailureThreshold: failureThreshold}
	if err := config.Validate(); err != nil {
		// Return error instead of panicking
		return
	}})

return config, nil
}
