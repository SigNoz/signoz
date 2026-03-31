package zeus

import (
	neturl "net/url"
	"sync"

	"github.com/SigNoz/signoz/pkg/errors"
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
func Config() (zeus.Config, error) {
	once.Do(func() {
		var err error
		parsedURL, err := neturl.Parse(url)
		if err != nil {
			// Return error instead of panicking
			return
		}

		deprecatedParsedURL, err := neturl.Parse(deprecatedURL)
		if err != nil {
			// Return error instead of panicking
			return
		}

		config = zeus.Config{URL: parsedURL, DeprecatedURL: deprecatedParsedURL}
		if err := config.Validate(); err != nil {
			// Return error instead of panicking
			return
		}
	})

	return config, nil
}
