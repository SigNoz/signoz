package zeus

import (
	"fmt"
	neturl "net/url"
	"sync"

	"github.com/SigNoz/signoz/pkg/zeus"
)

// This will be set via ldflags at build time.
var (
	url           string = "<unset>"
	deprecatedURL string = "<unset>"
)

var (
	config zeus.Config
	once   sync.Once
)

// initializes the Zeus configuration
func Config() zeus.Config {
	once.Do(func() {
		parsedURL, err := neturl.Parse(url)
		if err != nil {
			panic(fmt.Errorf("invalid zeus URL: %w", err))
		}

		deprecatedParsedURL, err := neturl.Parse(deprecatedURL)
		if err != nil {
			panic(fmt.Errorf("invalid zeus deprecated URL: %w", err))
		}

		config = zeus.Config{URL: parsedURL, DeprecatedURL: deprecatedParsedURL}
		if err := config.Validate(); err != nil {
			panic(fmt.Errorf("invalid zeus config: %w", err))
		}
	})

	return config
}
