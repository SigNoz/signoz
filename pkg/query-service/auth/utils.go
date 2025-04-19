package auth

import (
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/pkg/errors"
)

var (
	ErrorEmptyRequest = errors.New("Empty request")
	ErrorInvalidRole  = errors.New("Invalid role")

	ErrorInvalidInviteToken = errors.New("Invalid invite token")
	ErrorAskAdmin           = errors.New("An invitation is needed to create an account. Please ask your admin (the person who has first installed SIgNoz) to send an invite.")
)

func isValidRole(role string) bool {
	switch role {
	case authtypes.RoleAdmin, authtypes.RoleEditor, authtypes.RoleViewer:
		return true
	}
	return false
}

func validateInviteRequest(req *model.InviteRequest) error {
	if req == nil {
		return ErrorEmptyRequest
	}

	if !isValidRole(req.Role) {
		return ErrorInvalidRole
	}

	return nil
}
