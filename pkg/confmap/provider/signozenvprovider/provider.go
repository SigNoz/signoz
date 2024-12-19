package signozenvprovider

import (
	"context"
	"fmt"
	"os"
	"regexp"
	"sort"
	"strings"

	"go.opentelemetry.io/collector/confmap"
	"go.uber.org/zap"
	"gopkg.in/yaml.v3"
)

const (
	schemeName                string = "signozenv"
	envPrefix                 string = "signoz"
	separator                 string = "__"
	envPrefixWithOneSeparator string = "signoz_"
	envRegexString            string = `^[a-zA-Z][a-zA-Z0-9_]*$`
)

var (
	envRegex = regexp.MustCompile(envRegexString)
)

type provider struct {
	logger *zap.Logger
}

// NewFactory returns a factory for a confmap.Provider that reads the configuration from the environment.
// All variables starting with `SIGNOZ__` are read from the environment.
// The separator is `__` (2 underscores) in order to incorporate env variables having keys with a single `_`
func NewFactory() confmap.ProviderFactory {
	return confmap.NewProviderFactory(newProvider)
}

func newProvider(settings confmap.ProviderSettings) confmap.Provider {
	return &provider{
		logger: settings.Logger,
	}
}

func (provider *provider) Retrieve(_ context.Context, uri string, _ confmap.WatcherFunc) (*confmap.Retrieved, error) {
	if !strings.HasPrefix(uri, schemeName+":") {
		return nil, fmt.Errorf("%q uri is not supported by %q provider", uri, schemeName)
	}

	// Read and Sort environment variables for consistent output
	envvars := os.Environ()
	sort.Strings(envvars)

	// Create a map m containing key value pairs
	m := make(map[string]any)
	for _, envvar := range envvars {
		parts := strings.SplitN(envvar, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.ToLower(parts[0])
		val := parts[1]

		if strings.HasPrefix(key, envPrefixWithOneSeparator) {
			// Remove the envPrefix from the key
			key = strings.Replace(key, envPrefix+separator, "", 1)

			// Check whether the resulting key matches with the regex
			if !envRegex.MatchString(key) {
				provider.logger.Warn("Configuration references invalid environment variable key", zap.String("key", key))
				continue
			}

			// Convert key into yaml format
			key = strings.ToLower(strings.ReplaceAll(key, separator, confmap.KeyDelimiter))
			m[key] = val
		}
	}

	out, err := yaml.Marshal(m)
	if err != nil {
		return nil, err
	}

	return confmap.NewRetrievedFromYAML(out)
}

func (*provider) Scheme() string {
	return schemeName
}

func (*provider) Shutdown(context.Context) error {
	return nil
}
