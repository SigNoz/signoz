package version

import (
	"fmt"
	"runtime"
)

// These fields are set during an official build
// Global vars set from command-line arguments
var (
	buildVersion = "--"
	buildHash    = "--"
	buildTime    = "--"
	gitBranch    = "--"
)

// BuildDetails returns a string containing details about the SigNoz query-service binary.
func BuildDetails() string {
	licenseInfo := `Check SigNoz Github repo for license details`

	return fmt.Sprintf(`
SigNoz version   : %v
Commit SHA-1     : %v
Commit timestamp : %v
Branch           : %v
Go version       : %v

For SigNoz Official Documentation,  visit https://signoz.io/docs/
For SigNoz Community Slack,         visit http://signoz.io/slack/
For archive of discussions about SigNoz,       visit https://knowledgebase.signoz.io/

%s.
Copyright 2024 SigNoz
`,
		buildVersion, buildHash, buildTime, gitBranch,
		runtime.Version(), licenseInfo)
}

// PrintVersion prints version and other helpful information.
func PrintVersion() {
	fmt.Println(BuildDetails())
}

func GetVersion() string {
	return buildVersion
}
