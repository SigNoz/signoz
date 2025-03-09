package config

import (
	"net/url"
	"reflect"

	"github.com/go-viper/mapstructure/v2"
	"github.com/knadh/koanf/providers/confmap"
	"github.com/knadh/koanf/v2"
	yamlv2 "gopkg.in/yaml.v2"
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

// NewConfFromMap creates a new Conf instance from a map.
func NewConfFromMap(m map[string]any) (*Conf, error) {
	conf := NewConf()
	if err := conf.Koanf.Load(confmap.Provider(m, KoanfDelimiter), nil); err != nil {
		return nil, err
	}

	return conf, nil
}

// MustNewConfFromMap creates a new Conf instance from a map.
// It panics if the conf cannot be created.
func MustNewConfFromMap(m map[string]any) *Conf {
	conf, err := NewConfFromMap(m)
	if err != nil {
		panic(err)
	}

	return conf
}

// Merge merges the current configuration with the input configuration.
func (conf *Conf) Merge(input *Conf) error {
	return conf.Koanf.Merge(input.Koanf)
}

// Merge merges the current configuration with the input configuration.
func (conf *Conf) MergeAt(input *Conf, path string) error {
	return conf.Koanf.MergeAt(input.Koanf, path)
}

// Unmarshal unmarshals the configuration at the given path into the input.
// It uses a WeaklyTypedInput to allow for more flexible unmarshalling.
func (conf *Conf) Unmarshal(path string, input any, tags ...string) error {
	tags = append([]string{"mapstructure"}, tags...)

	for _, tag := range tags {
		dc := &mapstructure.DecoderConfig{
			TagName:          tag,
			WeaklyTypedInput: true,
			DecodeHook: mapstructure.ComposeDecodeHookFunc(
				mapstructure.StringToSliceHookFunc(","),
				mapstructure.StringToTimeDurationHookFunc(),
				mapstructure.TextUnmarshallerHookFunc(),
				StringToURLHookFunc(),
				YamlV2UnmarshalHookFunc(),
			),
			Result: input,
		}

		err := conf.Koanf.UnmarshalWithConf(path, input, koanf.UnmarshalConf{Tag: tag, DecoderConfig: dc})
		if err != nil {
			return err
		}
	}

	return nil
}

// Set sets the configuration at the given key.
// It decodes the input into a map as per mapstructure.Decode and then merges it into the configuration.
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

func StringToURLHookFunc() mapstructure.DecodeHookFunc {
	return func(
		f reflect.Type,
		t reflect.Type,
		data interface{},
	) (interface{}, error) {
		if f.Kind() != reflect.String {
			return data, nil
		}
		if t != reflect.TypeOf(url.URL{}) {
			return data, nil
		}

		// Convert it by parsing
		u, err := url.Parse(data.(string))
		return u, err
	}
}

func YamlV2UnmarshalHookFunc() mapstructure.DecodeHookFunc {
	return func(
		f reflect.Type,
		t reflect.Type,
		data interface{},
	) (interface{}, error) {
		if f.Kind() != reflect.String {
			return data, nil
		}
		result := reflect.New(t).Interface()
		_, ok := result.(yamlv2.Unmarshaler)
		if !ok {
			return data, nil
		}

		str, ok := data.(string)
		if !ok {
			str = reflect.Indirect(reflect.ValueOf(&data)).Elem().String()
		}

		if err := yamlv2.Unmarshal([]byte(str), result); err != nil {
			return nil, err
		}

		return result, nil
	}

}
