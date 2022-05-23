package config

import (
	"fmt"
	"gopkg.in/yaml.v2"
	"io/ioutil"
	"os"
)

type DBEngine string

const (
	SQLLITE DBEngine = "sql"
	PG      DBEngine = "postgres"
)

// QsConfig contains configuration parameters to get query service
// up and running. The config can be set through a yaml file or
// command line parameters
type QsConfig struct {
	// primary database used by query service to store configuration items
	// like alert definitions, dashboard settings, alert rules etc
	DB *DBConfig `yaml:"db"`
}

// GetDB returns query service db that stores config items
func (q *QsConfig) GetDB() *DBConfig {
	return q.DB
}

// GetDBEngine returns the type of database engine that stores
// config items likes alerts, dashboard etc
func (q *QsConfig) GetDBEngine() DBEngine {
	return q.DB.Engine
}

// LoadQsConfigFromFile imports query service config from a given file
func LoadQsConfigFromFile(filename string) (*QsConfig, error) {
	cfg := &QsConfig{}
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

// DBConfig contains parameters used for database connection
type DBConfig struct {
	Engine DBEngine   `yaml:"kind"`
	SQL    *SQLConfig `yaml:"sql, omitempty"`
	PG     *PGConfig  `yaml:"pg, omitempty"`
}

// SQLConfig contains parameters for SQL Lite connection
type SQLConfig struct {
	Path string `yaml:"path"`
}

// PGConfig contains parameters for postgres connection
type PGConfig struct {
	User     string `yaml:"user, omitempty"`
	Password string `yaml:"password, omitempty"`
	File     string `yaml:"file, omitempty"`
	DBname   string `yaml:"db, omitempty"`
	SSLmode  string `yaml:"ssl, omitempty"`
	Host     string `yaml:"host, omitempty"`
	Port     int64  `yaml:"post, omitempty"`
}

// LoadPassword imports postgres password from a file.
// This is useful in securing password and would be preferred
// option in enterprise settings
func (pg *PGConfig) LoadPassword(path string) error {
	if path != "" {
		pg.File = path
	}

	// load password from file
	dat, err := os.ReadFile(pg.File)
	if err != nil {
		return err
	}

	pg.Password = string(dat)
	return nil
}
