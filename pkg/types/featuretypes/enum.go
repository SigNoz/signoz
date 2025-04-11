package featuretypes

import "github.com/SigNoz/signoz/pkg/valuer"

const (
	KindBooleanVariantEnabled  string = "enabled"
	KindBooleanVariantDisabled string = "disabled"
)

var (
	KindBoolean Kind = Kind{valuer.NewString("bool")}
	KindString  Kind = Kind{valuer.NewString("string")}
	KindInt     Kind = Kind{valuer.NewString("int")}
	KindFloat   Kind = Kind{valuer.NewString("float")}
	KindObject  Kind = Kind{valuer.NewString("object")}
)

// Kind is the kind of the feature flag.
type Kind struct{ valuer.String }

var (
	// Is the feature experimental?
	StageExperimental = Stage{valuer.NewString("experimental")}

	// Does the feature work but is not ready for production?
	StagePreview = Stage{valuer.NewString("preview")}

	// Is the feature stable and ready for production?
	StageStable = Stage{valuer.NewString("stable")}

	// Is the feature deprecated and will be removed in the future?
	StageDeprecated = Stage{valuer.NewString("deprecated")}
)

type Stage struct{ valuer.String }
