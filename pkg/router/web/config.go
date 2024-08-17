package web

import "github.com/spf13/pflag"

type Config struct {
	BasePath string
	Dir      string
}

func (cfg *Config) RegisterFlags(pf *pflag.FlagSet) {
	pf.StringVar(&cfg.BasePath, "web.base-path", "/", "The base path to serve web from. Defaults to /.")
	pf.StringVar(&cfg.Dir, "web.dir", "./build", "The directory to serve. Defaults to build in the current working directory.")
}
