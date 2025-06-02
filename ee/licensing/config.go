package licensing

import (
	"fmt"
	"sync"
	"time"

	"github.com/SigNoz/signoz/pkg/licensing"
)

var (
	config licensing.Config
	once   sync.Once
)

// initializes the licensing configuration
func Config(pollInterval time.Duration, failureThreshold int) licensing.Config {
	once.Do(func() {
		config = licensing.Config{PollInterval: pollInterval, FailureThreshold: failureThreshold}
		if err := config.Validate(); err != nil {
			panic(fmt.Errorf("invalid licensing config: %w", err))
		}
	})

	return config
}
