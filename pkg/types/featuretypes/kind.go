package featuretypes

import "github.com/SigNoz/signoz/pkg/valuer"

// A concrete type for a feature flag kind
type Kind struct{ valuer.String }

var (
	KindBoolean = Kind{valuer.NewString("boolean")}
	KindString  = Kind{valuer.NewString("string")}
	KindFloat   = Kind{valuer.NewString("float")}
	KindInt     = Kind{valuer.NewString("int")}
	KindObject  = Kind{valuer.NewString("object")}
)
