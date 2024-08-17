package opamp

import "github.com/spf13/pflag"

type Config struct {
	ListenAddress string
}

func (cfg *Config) RegisterFlags(pf *pflag.FlagSet) {
	pf.StringVar(&cfg.ListenAddress, "opamp.listen-address", "0.0.0.0:4320", "Listen address of the opamp server.")
}
