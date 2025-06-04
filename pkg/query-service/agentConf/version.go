package agentConf

import "github.com/SigNoz/signoz/pkg/types/opamptypes"

type ConfigElements struct {
	VersionID   string
	Version     int
	ElementType opamptypes.ElementTypeDef
	ElementId   string
}
