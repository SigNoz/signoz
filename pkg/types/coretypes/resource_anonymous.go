package coretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	AnonymousUser = valuer.UUID{}
)

type resourceAnonymous struct{}

func NewResourceAnonymous() Resource {
	return &resourceAnonymous{}
}

func (resourceAnonymous *resourceAnonymous) Type() Type {
	return TypeAnonymous
}

func (resourceAnonymous *resourceAnonymous) Kind() Kind {
	return MustNewKind("anonymous")
}

// example: anonymous:organization/0199c47d-f61b-7833-bc5f-c0730f12f046/anonymous
func (resourceAnonymous *resourceAnonymous) Prefix(orgID valuer.UUID) string {
	return resourceAnonymous.Type().StringValue() + ":" + "organization" + "/" + orgID.StringValue() + "/" + resourceAnonymous.Kind().String()
}

func (resourceAnonymous *resourceAnonymous) Object(orgID valuer.UUID, selector string) string {
	return resourceAnonymous.Prefix(orgID) + "/" + selector
}

func (resourceAnonymous *resourceAnonymous) Scope(verb Verb) string {
	return resourceAnonymous.Kind().String() + ":" + verb.StringValue()
}
