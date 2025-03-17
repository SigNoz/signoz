package agentConf

import "go.signoz.io/signoz/pkg/types"

type ConfigElements struct {
	VersionID   string
	Version     int
	ElementType types.ElementTypeDef
	ElementId   string
}
