package config

import (
	"github.com/go-viper/mapstructure/v2"
	"github.com/knadh/koanf/providers/confmap"
	"github.com/knadh/koanf/v2"
)

const (
	KoanfDelimiter string = "::"
)

// Conf is a wrapper around the koanf library.
type Conf struct {
	*koanf.Koanf
}

// NewConf creates a new Conf instance.
func NewConf() *Conf {
	return &Conf{koanf.New(KoanfDelimiter)}
}

// Merge merges the current configuration with the input configuration.
func (conf *Conf) Merge(input *Conf) error {
	return conf.Koanf.Merge(input.Koanf)
}

// Merge merges the current configuration with the input configuration.
func (conf *Conf) MergeAt(input *Conf, path string) error {
	return conf.Koanf.MergeAt(input.Koanf, path)
}

// func (conf *Conf) Unmarshal(input any) error {

// 	return conf.Koanf.UnmarshalWithConf("", input, koanf.UnmarshalConf{
// 		Tag: "mapstructure",
// 	})
// }

func (conf *Conf) Unmarshal(path string, input any) error {
	dc := &mapstructure.DecoderConfig{
		TagName:          "mapstructure",
		WeaklyTypedInput: true,
		DecodeHook: mapstructure.ComposeDecodeHookFunc(
			mapstructure.StringToSliceHookFunc(","),
			mapstructure.StringToTimeDurationHookFunc(),
			mapstructure.TextUnmarshallerHookFunc(),
		),
		Result: input,
	}

	return conf.Koanf.UnmarshalWithConf(path, input, koanf.UnmarshalConf{Tag: "mapstructure", DecoderConfig: dc})
}

func (conf *Conf) Set(key string, input any) error {
	m := map[string]any{}
	err := mapstructure.Decode(input, &m)
	if err != nil {
		return err
	}

	newConf := NewConf()
	if err := newConf.Koanf.Load(confmap.Provider(m, KoanfDelimiter), nil); err != nil {
		return err
	}

	if err := conf.Koanf.MergeAt(newConf.Koanf, key); err != nil {
		return err
	}

	return nil
}
