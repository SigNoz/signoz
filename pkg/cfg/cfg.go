package cfg

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
	"github.com/spf13/viper"
)

// Merges command line flags and env variables, giving preference to command line argument when specified.
func Set(cmd *cobra.Command, prefix string) {
	v := viper.New()

	v.SetEnvPrefix(strings.TrimSpace(prefix))
	v.SetEnvKeyReplacer(strings.NewReplacer("-", "_", ".", "_"))
	v.AutomaticEnv()

	cmd.Flags().VisitAll(func(f *pflag.Flag) {
		configName := f.Name

		// If the user doesn't pass a flag but viper has an env variable,
		// the flag value is set to viper's env variable.
		if !f.Changed && v.IsSet(configName) {
			val := v.Get(configName)
			err := cmd.Flags().Set(f.Name, fmt.Sprintf("%v", val))
			if err != nil {
				// Panic if there is any issue in configuration
				panic(err)
			}
		}
	})

}
