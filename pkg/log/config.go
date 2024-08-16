package log

import "github.com/spf13/pflag"

type Config struct {
	LogLevel string
}

func (cfg *Config) RegisterFlags(pf *pflag.FlagSet) {
	pf.StringVar(&cfg.LogLevel, "log-level", "info", "The log level of SigNoz. The default is info. Valid values are \"debug\", \"info\", \"warn\", \"error\", \"dpanic\", \"panic\", \"fatal\"")
}
