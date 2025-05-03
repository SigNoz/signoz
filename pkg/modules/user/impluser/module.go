package impluser

import (
	"context"
	"os"
	"slices"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/query-service/telemetry"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type Module struct {
	store types.UserStore
	JWT   *authtypes.JWT
}

func NewModule(store types.UserStore) user.Module {
	jwtSecret := os.Getenv("SIGNOZ_JWT_SECRET")
	jwt := authtypes.NewJWT(jwtSecret, 30*time.Minute, 30*24*time.Hour)
	return &Module{store: store, JWT: jwt}
}

func (m *Module) SendUserTelemetry(user *types.User, firstRegistration bool) {
	data := map[string]interface{}{
		"name":              user.HName,
		"email":             user.Email,
		"firstRegistration": firstRegistration,
	}

	// telemetry.GetInstance().IdentifyUser(user)
	telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_USER, data, user.Email, true, false)
}

// CreateBulk implements invite.Module.
func (m *Module) CreateBulkInvite(ctx context.Context, invites []*types.Invite) error {
	return m.store.CreateBulkInvite(ctx, invites)
}

func (m *Module) ListInvite(ctx context.Context, orgID string) ([]*types.Invite, error) {
	return m.store.ListInvite(ctx, orgID)
}

func (m *Module) DeleteInvite(ctx context.Context, orgID string, id valuer.UUID) error {
	return m.store.DeleteInvite(ctx, orgID, id)
}

func (m *Module) GetInviteByToken(ctx context.Context, token string) (*types.Invite, error) {
	return m.store.GetInviteByToken(ctx, token)
}

func (m *Module) GetInviteByEmailInOrg(ctx context.Context, orgID string, email string) (*types.Invite, error) {
	return m.store.GetInviteByEmailInOrg(ctx, orgID, email)
}

func (m *Module) CreateUserWithPassword(ctx context.Context, user *types.User, password *types.FactorPassword) (*types.User, error) {

	user, err := m.store.CreateUserWithPassword(ctx, user, password)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (m *Module) CreateUser(ctx context.Context, user *types.User) error {
	return m.store.CreateUser(ctx, user)
}

func (m *Module) GetUserByID(ctx context.Context, orgID string, id string) (*types.User, error) {
	return m.store.GetUserByID(ctx, orgID, id)
}

func (m *Module) GetUserByEmailInOrg(ctx context.Context, orgID string, email string) (*types.User, error) {
	return m.store.GetUserByEmailInOrg(ctx, orgID, email)
}

func (m *Module) GetUsersByEmail(ctx context.Context, email string) ([]*types.User, error) {
	return m.store.GetUsersByEmail(ctx, email)
}

func (m *Module) ListUsers(ctx context.Context, orgID string) ([]*types.User, error) {
	return m.store.ListUsers(ctx, orgID)
}

func (m *Module) UpdateUser(ctx context.Context, orgID string, id string, user *types.User) (*types.User, error) {
	return m.store.UpdateUser(ctx, orgID, id, user)
}

func (m *Module) DeleteUser(ctx context.Context, orgID string, id string) error {
	user, err := m.store.GetUserByID(ctx, orgID, id)
	if err != nil {
		return err
	}

	if slices.Contains(types.AllIntegrationUserEmails, types.IntegrationUserEmail(user.Email)) {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "integration user cannot be updated")
	}

	return m.store.DeleteUser(ctx, orgID, user.ID.StringValue())
}

func (m *Module) CreateResetPasswordToken(ctx context.Context, userID string) (*types.FactorResetPasswordRequest, error) {
	password, err := m.store.GetPasswordByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	resetPasswordRequest, err := types.NewFactorResetPasswordRequest(password.ID.StringValue())
	if err != nil {
		return nil, err
	}

	err = m.store.CreateResetPasswordToken(ctx, resetPasswordRequest)
	if err != nil {
		return nil, err
	}

	return resetPasswordRequest, nil
}

func (m *Module) GetPasswordByUserID(ctx context.Context, id string) (*types.FactorPassword, error) {
	return m.store.GetPasswordByUserID(ctx, id)
}

func (m *Module) GetFactorResetPassword(ctx context.Context, token string) (*types.FactorResetPasswordRequest, error) {
	return m.store.GetFactorResetPassword(ctx, token)
}

func (m *Module) UpdatePasswordAndDeleteResetPasswordEntry(ctx context.Context, userID string, password string) error {
	hashedPassword, err := types.HashPassword(password)
	if err != nil {
		return err
	}

	return m.store.UpdatePasswordAndDeleteResetPasswordEntry(ctx, userID, hashedPassword)
}

func (m *Module) UpdatePassword(ctx context.Context, userID string, password string) error {
	hashedPassword, err := types.HashPassword(password)
	if err != nil {
		return err
	}
	return m.store.UpdatePassword(ctx, userID, hashedPassword)
}

func (m *Module) GetAuthenticatedUser(ctx context.Context, orgID, email, password, refreshToken string) (*types.User, error) {
	if refreshToken != "" {
		// parse the refresh token
		claims, err := m.JWT.Claims(refreshToken)
		if err != nil {
			return nil, err
		}

		return m.store.GetUserByID(ctx, claims.OrgID, claims.UserID)
	}

	var dbUser *types.User

	// when the orgID is provided
	if orgID != "" {
		user, err := m.store.GetUserByEmailInOrg(ctx, orgID, email)
		if err != nil {
			return nil, err
		}
		dbUser = user
	}

	// when the orgID is not provided we login if the user exists in just one org
	user, err := m.store.GetUsersByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if len(user) == 1 {
		dbUser = user[0]
	} else {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "please provide an orgID")
	}

	existingPassword, err := m.store.GetPasswordByUserID(ctx, dbUser.ID.StringValue())
	if err != nil {
		return nil, err
	}

	if !types.ComparePassword(existingPassword.Password, password) {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "invalid password")
	}

	return dbUser, nil
}

func (m *Module) GetJWTForUser(ctx context.Context, user *types.User) (types.GettableUserJwt, error) {
	role, err := types.NewRole(user.Role)
	if err != nil {
		return types.GettableUserJwt{}, err
	}

	accessJwt, accessClaims, err := m.JWT.AccessToken(user.OrgID, user.ID.String(), user.Email, role)
	if err != nil {
		return types.GettableUserJwt{}, err
	}

	refreshJwt, refreshClaims, err := m.JWT.RefreshToken(user.OrgID, user.ID.String(), user.Email, role)
	if err != nil {
		return types.GettableUserJwt{}, err
	}

	return types.GettableUserJwt{
		AccessJwt:        accessJwt,
		RefreshJwt:       refreshJwt,
		AccessJwtExpiry:  accessClaims.ExpiresAt.Unix(),
		RefreshJwtExpiry: refreshClaims.ExpiresAt.Unix(),
	}, nil
}

func (m *Module) CreateUserForSAMLRequest(ctx context.Context, email string) (*types.User, error) {
	return nil, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "SAML login is not supported")
}

func (m *Module) PrepareSsoRedirect(ctx context.Context, redirectUri, email string, jwt *authtypes.JWT) (string, error) {
	return "", errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "SSO is not supported")
}

func (m *Module) CanUsePassword(ctx context.Context, email string) (bool, error) {
	return false, errors.New(errors.TypeUnsupported, errors.CodeUnsupported, "SSO is not supported")
}
