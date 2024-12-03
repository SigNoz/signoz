package main

import (
	"flag"
	"strings"

	"github.com/spf13/cobra"
)

type config struct {
	uris []string
}

func (c *config) Set(val string) error {
	c.uris = append(c.uris, val)
	return nil
}

func (c *config) String() string {
	return "[" + strings.Join(c.uris, ", ") + "]"
}

func (c *config) registerFlags(cmd *cobra.Command) {
	flagSet := new(flag.FlagSet)
	flagSet.Var(c, "config", "Locations to the config file(s), note that only a"+
		" single location can be set per flag entry e.g. `--config=file:/path/to/first --config=file:path/to/second`.")

	cmd.Flags().AddGoFlagSet(flagSet)
}
