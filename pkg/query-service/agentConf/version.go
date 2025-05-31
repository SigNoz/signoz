package agentConf

import "github.com/SigNoz/signoz/pkg/types"

type ConfigElements struct {
	VersionID   string
	Version     int
	ElementType types.ElementTypeDef
	ElementId   string
}
