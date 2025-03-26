package fileprovider

import (
	"context"

	"github.com/SigNoz/signoz/pkg/config"
	koanfyaml "github.com/knadh/koanf/parsers/yaml"
	koanffile "github.com/knadh/koanf/providers/file"
)

const (
	scheme string = "file"
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
	err := conf.Load(koanffile.Provider(uri.Value()), koanfyaml.Parser())

	return conf, err
}
