package coretypes

import (
	"regexp"

	"github.com/SigNoz/signoz/pkg/valuer"
)

var Types = []Type{
	TypeUser,
	TypeServiceAccount,
	TypeAnonymous,
	TypeRole,
	TypeOrganization,
	TypeMetaResource,
	TypeMetaResources,
	TypeTelemetryResource,
}

var (
	TypeUser              = Type{valuer.NewString("user"), regexp.MustCompile(`^(^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$|\*)$`), []Verb{VerbAttach, VerbRead, VerbUpdate, VerbDelete}}
	TypeServiceAccount    = Type{valuer.NewString("serviceaccount"), regexp.MustCompile(`^(^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$|\*)$`), []Verb{VerbAttach, VerbRead, VerbUpdate, VerbDelete}}
	TypeAnonymous         = Type{valuer.NewString("anonymous"), regexp.MustCompile(`^\*$`), []Verb{}}
	TypeRole              = Type{valuer.NewString("role"), regexp.MustCompile(`^([a-z-]{1,50}|\*)$`), []Verb{VerbAssignee, VerbAttach, VerbRead, VerbUpdate, VerbDelete}}
	TypeOrganization      = Type{valuer.NewString("organization"), regexp.MustCompile(`^(^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$|\*)$`), []Verb{VerbRead, VerbUpdate, VerbDelete}}
	TypeMetaResource      = Type{valuer.NewString("metaresource"), regexp.MustCompile(`^(^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$|\*)$`), []Verb{VerbRead, VerbUpdate, VerbDelete}}
	TypeMetaResources     = Type{valuer.NewString("metaresources"), regexp.MustCompile(`^\*$`), []Verb{VerbCreate, VerbList}}
	TypeTelemetryResource = Type{valuer.NewString("telemetryresource"), regexp.MustCompile(`^\*$`), []Verb{VerbRead}}
)
