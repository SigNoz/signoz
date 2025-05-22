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
func Config(pollInterval time.Duration) licensing.Config {
	once.Do(func() {
		config = licensing.Config{PollInterval: pollInterval}
		if err := config.Validate(); err != nil {
			panic(fmt.Errorf("invalid licensing config: %w", err))
		}
	})

	return config
}
