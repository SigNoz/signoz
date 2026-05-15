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
	TypeTelemetryResource,
}

var (
	TypeUser              = Type{valuer.NewString("user"), regexp.MustCompile(`^(^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$|\*)$`), []Verb{VerbCreate, VerbList, VerbRead, VerbUpdate, VerbDelete, VerbAttach, VerbDetach}}
	TypeServiceAccount    = Type{valuer.NewString("serviceaccount"), regexp.MustCompile(`^(^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$|\*)$`), []Verb{VerbCreate, VerbList, VerbRead, VerbUpdate, VerbDelete, VerbAttach, VerbDetach}}
	TypeAnonymous         = Type{valuer.NewString("anonymous"), regexp.MustCompile(`^\*$`), []Verb{}}
	TypeRole              = Type{valuer.NewString("role"), regexp.MustCompile(`^([a-z-]{1,50}|\*)$`), []Verb{VerbAssignee, VerbCreate, VerbList, VerbRead, VerbUpdate, VerbDelete, VerbAttach, VerbDetach}}
	TypeOrganization      = Type{valuer.NewString("organization"), regexp.MustCompile(`^(^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$|\*)$`), []Verb{VerbRead, VerbUpdate}}
	TypeMetaResource      = Type{valuer.NewString("metaresource"), regexp.MustCompile(`^(^[0-9a-f]{8}(?:\-[0-9a-f]{4}){3}-[0-9a-f]{12}$|\*)$`), []Verb{VerbCreate, VerbList, VerbRead, VerbUpdate, VerbDelete, VerbAttach, VerbDetach}}
	TypeTelemetryResource = Type{valuer.NewString("telemetryresource"), regexp.MustCompile(`^\*$`), []Verb{VerbRead}}
)
