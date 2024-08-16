package http

import "github.com/spf13/pflag"

type Config struct {
	Listen string
}

func (cfg *Config) RegisterFlags(pf *pflag.FlagSet) {
	pf.StringVar(&cfg.Listen, "http.listen-address", "0.0.0.0:8000", "Listen address of the http server.")
}
