package coretypes

import (
	"github.com/SigNoz/signoz/pkg/valuer"
)

type resourceServiceAccount struct {
	kind Kind
}

func NewResourceServiceAccount() Resource {
	return &resourceServiceAccount{
		kind: KindServiceAccount,
	}
}

func (resourceServiceAccount *resourceServiceAccount) Type() Type {
	return TypeServiceAccount
}

func (resourceServiceAccount *resourceServiceAccount) Kind() Kind {
	return resourceServiceAccount.kind
}

// example: serviceaccount:organization/0199c47d-f61b-7833-bc5f-c0730f12f046/serviceaccount
func (resourceServiceAccount *resourceServiceAccount) Prefix(orgID valuer.UUID) string {
	return resourceServiceAccount.Type().StringValue() + ":" + "organization" + "/" + orgID.StringValue() + "/" + resourceServiceAccount.Kind().String()
}

func (resourceServiceAccount *resourceServiceAccount) Object(orgID valuer.UUID, selector string) string {
	return resourceServiceAccount.Prefix(orgID) + "/" + selector
}

func (resourceServiceAccount *resourceServiceAccount) Scope(verb Verb) string {
	return resourceServiceAccount.Kind().String() + ":" + verb.StringValue()
}
