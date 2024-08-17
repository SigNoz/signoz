package dao

import "github.com/spf13/pflag"

type Config struct {
	Engine string
	Path   string
}

func (cfg *Config) RegisterFlags(pf *pflag.FlagSet) {
	pf.StringVar(&cfg.Engine, "db.engine", "sqlite", "The database engine to use. Only \"sqlite\" is supported")
	pf.StringVar(&cfg.Path, "db.path", "/var/lib/signoz/signoz.db", "The path to the sqlite database.")
}
