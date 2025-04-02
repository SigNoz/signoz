package featuretypes

import "github.com/SigNoz/signoz/pkg/valuer"

var (
	KindBoolean Kind = Kind{valuer.NewString("boolean")}

	KindString Kind = Kind{valuer.NewString("string")}

	KindInt Kind = Kind{valuer.NewString("int")}

	KindFloat Kind = Kind{valuer.NewString("float")}

	KindObject Kind = Kind{valuer.NewString("object")}
)

// Kind is the kind of the feature flag. Inspired from https://github.com/open-feature/go-sdk/blob/main/openfeature/interfaces.go
type Kind struct{ valuer.String }
