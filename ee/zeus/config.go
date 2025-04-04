package zeus

import (
	"fmt"
	neturl "net/url"
	"sync"

	"github.com/SigNoz/signoz/pkg/zeus"
)

// This will be set via ldflags at build time.
var (
	url          string = "<unset>"
	once         sync.Once
	GlobalConfig zeus.Config
)

// init initializes and validates the Zeus configuration
func init() {
	once.Do(func() {
		parsedURL, err := neturl.Parse(url)
		if err != nil {
			panic(fmt.Errorf("invalid zeus URL: %w", err))
		}

		GlobalConfig = zeus.Config{URL: parsedURL}
		if err := GlobalConfig.Validate(); err != nil {
			panic(fmt.Errorf("invalid zeus config: %w", err))
		}
	})
}
