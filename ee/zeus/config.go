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
func Config() zeus.Config {
	once.Do(func() {
		parsedURL, err := neturl.Parse(url)
		if err != nil {
			panic(errors.WrapInternalf(err, errors.CodeInternal, "invalid zeus URL"))
		}

		deprecatedParsedURL, err := neturl.Parse(deprecatedURL)
		if err != nil {
			panic(errors.WrapInternalf(err, errors.CodeInternal, "invalid zeus deprecated URL"))
		}

		config = zeus.Config{URL: parsedURL, DeprecatedURL: deprecatedParsedURL}
		if err := config.Validate(); err != nil {
			panic(errors.WrapInternalf(err, errors.CodeInternal, "invalid zeus config"))
		}
	})

	return config
}
