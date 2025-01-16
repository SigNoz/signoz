package envprovider

import (
	"context"
	"strings"

	koanfenv "github.com/knadh/koanf/providers/env"
	"go.signoz.io/signoz/pkg/config"
)

const (
	prefix string = "SIGNOZ_"
	scheme string = "env"
)

type provider struct{}

func NewFactory() config.ProviderFactory {
	return config.NewProviderFactory(New)
}

func New(config config.ProviderConfig) config.Provider {
	return &provider{}
}

func (provider *provider) Scheme() string {
	return scheme
}

func (provider *provider) Get(ctx context.Context, uri config.Uri) (*config.Conf, error) {
	conf := config.NewConf()
	err := conf.Load(
		koanfenv.Provider(
			prefix,
			// Do not set this to `_`. The correct delimiter is being set by the custom callback provided below.
			// Since this had to be passed, using `config.KoanfDelimiter` eliminates any possible side effect.
			config.KoanfDelimiter,
			func(s string) string {
				s = strings.ToLower(strings.TrimPrefix(s, prefix))
				return provider.cb(s, config.KoanfDelimiter)
			},
		),
		nil,
	)

	return conf, err
}

func (provider *provider) cb(s string, delim string) string {
	delims := []rune(delim)
	runes := []rune(s)
	result := make([]rune, 0, len(runes))

	for i := 0; i < len(runes); i++ {
		// Check for double underscore pattern
		if i < len(runes)-1 && runes[i] == '_' && runes[i+1] == '_' {
			result = append(result, '_')
			i++ // Skip next underscore
			continue
		}

		if runes[i] == '_' {
			result = append(result, delims...)
			continue
		}

		result = append(result, runes[i])
	}

	return string(result)
}
