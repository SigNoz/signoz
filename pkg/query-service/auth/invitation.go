package auth

import "time"

// We should be able to invite a user to create an account on SigNoz.
// The invitation is generic i.e. It is always for non-root user. If a user wants admin access
// then an admin can add him to admin group after registration.

// Invitation claim will contain emailID, and while registration user will be able to create
// an account with this email only.

const (
	inviteValidity = 24 * time.Hour
)

type InviteRequest struct {
	Email string
}

type InviteResponse struct {
	Email       string
	InviteToken string
}

func Invite(req *InviteRequest) (*InviteResponse, error) {
	token, err := generateInviteJwt(req)
	if err != nil {
		return nil, err
	}
	return &InviteResponse{req.Email, token}, nil
}
