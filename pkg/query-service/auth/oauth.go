package auth

import (
	"context"
	"time"

	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/dao"
	"go.signoz.io/query-service/model"
	"go.uber.org/zap"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	"github.com/pkg/errors"
)

var ErrInvalidProvider = errors.Errorf("OAuth provider does not exist.")
var ErrOAuthValidationFailed = errors.Errorf("Failed to validate with OAuth provider.")

type OAuthUser struct {
	ID      string
	Email   string
	Picture string
}

type OAuthProvider interface {
	GetUserFromToken(code string) (*OAuthUser, error)
	GetRedirectURL(state string) string
}

func GetOAuthProvider(provider string) (OAuthProvider, error) {
	switch provider {
	case "google":
		return &GoogleOAuthProvider{
			Config: &oauth2.Config{
				ClientID:     constants.GOOGLE_CLIENT_ID,
				ClientSecret: constants.GOOGLE_CLIENT_SECRET,
				Scopes: []string{
					"https://www.googleapis.com/auth/userinfo.email",
					"https://www.googleapis.com/auth/userinfo.profile",
				},
				Endpoint: google.Endpoint,

				// Todo(Ahsan): Make this URL dynamic.
				RedirectURL: "http://localhost:8080/callback-google",
			},
		}, nil
	default:
		return nil, ErrInvalidProvider
	}
}

func OAuthRedirectURL(provider, state string) string {
	p, err := GetOAuthProvider(provider)
	if err != nil {
		return ""
	}

	return p.GetRedirectURL(state)
}

func OAuthRegisterOrLogin(ctx context.Context, provider string, code string) (*model.LoginResponse, error) {
	p, err := GetOAuthProvider(provider)
	if err != nil {
		return nil, err
	}

	oUser, err := p.GetUserFromToken(code)
	if err != nil {
		return nil, err
	}

	// Check if user with this identity exists
	u, apiErr := dao.DB().GetUser(ctx, oUser.ID)
	if apiErr != nil {
		return nil, apiErr.Err
	}

	if u != nil {
		zap.S().Infof("User %v already exists\n", oUser)
		return generateLoginResponse(&u.User)
	}

	// Create new user entity.
	inv, apiErr := dao.DB().GetInviteFromEmail(ctx, oUser.Email)
	if apiErr != nil {
		return nil, apiErr.Err
	}
	if inv == nil {
		return nil, ErrorAskAdmin
	}

	group, apiErr := dao.DB().GetGroupByName(ctx, inv.Role)
	if apiErr != nil {
		zap.S().Debugf("GetGroupByName failed, err: %v\n", apiErr.Err)
		return nil, apiErr.Err
	}

	user := &model.User{
		Id: oUser.ID,
		// Name:               oUser.Name,
		Email:              oUser.Email,
		CreatedAt:          time.Now().Unix(),
		ProfilePirctureURL: oUser.Picture, // Currently unused
		GroupId:            group.Id,
		OrgId:              inv.OrgId,
	}

	// TODO(Ahsan): Ideally create user and delete invitation should happen in a txn.
	_, apiErr = dao.DB().CreateUser(ctx, user)
	if apiErr != nil {
		zap.S().Debugf("CreateUser failed, err: %v\n", apiErr.Err)
		return nil, apiErr.Err
	}

	apiErr = dao.DB().DeleteInvitation(ctx, user.Email)
	if apiErr != nil {
		zap.S().Debugf("DeleteInvitation failed, err: %v\n", apiErr.Err)
		return nil, apiErr.Err
	}

	return generateLoginResponse(user)
}
