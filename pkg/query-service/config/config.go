package config

import (
	"fmt"
	"go.signoz.io/query-service/constants"
	"gopkg.in/yaml.v2"
	"io/ioutil"
)

type DBEngine string

const (
	SQLLITE DBEngine = "sqllite"
	PG      DBEngine = "postgres"
)

type QsConfig struct {
	DB *DBConfig `yaml:"db"`
}

func GetDefaultConfigPath() string {
	return constants.GetOrDefaultEnv("SIGNOZ_QS_CONFIG_PATH", "./config/qs.yaml")
}

func LoadDefaultQsConfig() *QsConfig {
	return &QsConfig{
		DB: &DBConfig{
			Engine: PG,
			PG: &PGConfig{
				User:    "apple", //postgress todo
				DBname:  "postgres",
				Port:    5432,
				Host:    "localhost",
				SSLmode: "disable",
			},
		},
	}
}

// LoadQsConfigFromFile loads query service config from a given file
func LoadQsConfigFromFile(filename string) (*QsConfig, error) {
	cfg := LoadDefaultQsConfig()
	if filename == "" {
		return cfg, fmt.Errorf("config file must be set for query service to start")
	}

	content, err := ioutil.ReadFile(filename)
	if err != nil {
		return cfg, err
	}

	err = yaml.UnmarshalStrict(content, cfg)
	if err != nil {
		return nil, err
	}

	return cfg, nil
}

type DBConfig struct {
	Engine DBEngine   `yaml:"kind"`
	SQL    *SQLConfig `yaml:"sql, omitempty"`
	PG     *PGConfig  `yaml:"pg, omitempty"`
}

type SQLConfig struct {
	Path string `yaml:"path"`
}

type PGConfig struct {
	User     string `yaml:"user, omitempty"`
	Password string `yaml:"password, omitempty"`
	DBname   string `yaml:"db, omitempty"`
	SSLmode  string `yaml:"ssl, omitempty"`
	Host     string `yaml:"host, omitempty"`
	Port     int64  `yaml:"post, omitempty"`
}
