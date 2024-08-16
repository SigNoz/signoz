package cfg

import (
	"os"
	"testing"

	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
)

var testCmd = func(logLevel *string) *cobra.Command {
	c := &cobra.Command{
		Use: "app",
		PersistentPreRun: func(cmd *cobra.Command, args []string) {
			Set(cmd, cmd.Use)
		},
		Run: func(cmd *cobra.Command, args []string) {},
	}
	c.Flags().StringVar(logLevel, "log-level", "debug", "The log level")
	return c
}

func TestSetWithFlag(t *testing.T) {
	var logLevel string
	cmd := testCmd(&logLevel)
	cmd.SetArgs([]string{"--log-level=info"})
	_ = cmd.Execute()

	assert.Equal(t, "info", logLevel)
}

// The *PreRun and *PostRun functions will only be executed if the Run function of the current command has been declared.
func TestSetWithEnv(t *testing.T) {
	os.Setenv("APP_LOG_LEVEL", "warn")
	var logLevel string
	cmd := testCmd(&logLevel)
	_ = cmd.Execute()

	assert.Equal(t, "warn", logLevel)
}

func TestSetWithFlagAndEnv(t *testing.T) {
	os.Setenv("APP_LOG_LEVEL", "warn")
	var logLevel string
	cmd := testCmd(&logLevel)
	cmd.SetArgs([]string{"--log-level=info"})
	_ = cmd.Execute()

	assert.Equal(t, "info", logLevel)
}
