package zeus

import (
	"fmt"
	neturl "net/url"

	"github.com/SigNoz/signoz/pkg/zeus"
)

// This will be set via ldflags at build time.
var (
	url           string = "<unset>"
	deprecatedURL string = "<unset>"
	Config        zeus.Config
)

// init initializes and validates the Zeus configuration
func init() {
	parsedURL, err := neturl.Parse(url)
	if err != nil {
		panic(fmt.Errorf("invalid zeus URL: %w", err))
	}

	deprecatedParsedURL, err := neturl.Parse(deprecatedURL)
	if err != nil {
		panic(fmt.Errorf("invalid zeus deprecated URL: %w", err))
	}

	Config = zeus.Config{URL: parsedURL, DeprecatedURL: deprecatedParsedURL}
	if err := Config.Validate(); err != nil {
		panic(fmt.Errorf("invalid zeus config: %w", err))
	}
}
