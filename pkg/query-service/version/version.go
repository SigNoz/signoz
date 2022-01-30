package version

import (
	"go.uber.org/zap"
)

// These fields are set during an official build
// Global vars set from command-line arguments
var (
	version   = "--"
	buildhash = "--"
	buildtime = "--"
)

//PrintVersionInfo displays the kyverno version - git version
func PrintVersionInfo() {
	zap.S().Info("Version: ", version)
	zap.S().Info("BuildHash: ", buildhash)
	zap.S().Info("BuildTime: ", buildtime)
}

func GetVersion() string {
	return version
}
