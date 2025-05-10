package querybuildertypesv5

import "github.com/SigNoz/signoz/pkg/types/queryenginetypes"

type Renderer interface {
	Render(res queryenginetypes.Result) (any, error)
}
