package zeus

import (
	"fmt"
	neturl "net/url"
	"sync"

	"github.com/SigNoz/signoz/pkg/factory"
)

var _ factory.Config = (*Config)(nil)

// This will be set via ldflags at build time.
var (
	url         string = "<unset>"
	once        sync.Once
	BuildConfig Config
)

type Config struct {
	URL *neturl.URL `mapstructure:"url"`
}

func (c Config) Validate() error {
	return nil
}

// init initializes and validates the Zeus configuration
func init() {
	once.Do(func() {
		parsedURL, err := neturl.Parse(url)
		if err != nil {
			panic(fmt.Errorf("invalid zeus URL: %w", err))
		}

		BuildConfig = Config{URL: parsedURL}
		if err := BuildConfig.Validate(); err != nil {
			panic(fmt.Errorf("invalid zeus config: %w", err))
		}
	})
}
