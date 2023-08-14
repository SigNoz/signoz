package model

import (
	"os"

	"gopkg.in/yaml.v2"
)

type SkipConfig struct {
	Services []ServiceSkipConfig `yaml:"services"`
}

type ServiceSkipConfig struct {
	Name       string   `yaml:"name"`
	Operations []string `yaml:"operations"`
}

func (s *SkipConfig) ShouldSkip(serviceName, name string) bool {
	for _, service := range s.Services {
		if service.Name == serviceName {
			for _, operation := range service.Operations {
				if name == operation {
					return true
				}
			}
		}
	}
	return false
}

func ReadYaml(path string, v interface{}) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	decoder := yaml.NewDecoder(f)
	err = decoder.Decode(v)
	if err != nil {
		return err
	}
	return nil
}

func ReadSkipConfig(path string) (*SkipConfig, error) {
	if path == "" {
		return &SkipConfig{}, nil
	}

	skipConfig := &SkipConfig{}
	err := ReadYaml(path, skipConfig)
	if err != nil {
		return nil, err
	}
	return skipConfig, nil
}
