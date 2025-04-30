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

type module struct {
	store types.UserStore
	JWT   *authtypes.JWT
}

func NewModule(store types.UserStore) user.Module {
	jwtSecret := os.Getenv("SIGNOZ_JWT_SECRET")
	jwt := authtypes.NewJWT(jwtSecret, 30*time.Minute, 30*24*time.Hour)
	return &module{store: store, JWT: jwt}
}

func (m *module) SendUserTelemetry(user *types.User, firstRegistration bool) {
	data := map[string]interface{}{
		"name":              user.HName,
		"email":             user.Email,
		"firstRegistration": firstRegistration,
	}

	// telemetry.GetInstance().IdentifyUser(user)
	telemetry.GetInstance().SendEvent(telemetry.TELEMETRY_EVENT_USER, data, user.Email, true, false)
}

// CreateBulk implements invite.Module.
func (module *module) CreateBulkInvite(ctx context.Context, invites []*types.Invite) error {
	return module.store.CreateBulkInvite(ctx, invites)
}

func (module *module) ListInvite(ctx context.Context, orgID string) ([]*types.Invite, error) {
	return module.store.ListInvite(ctx, orgID)
}

func (module *module) DeleteInvite(ctx context.Context, orgID string, id valuer.UUID) error {
	return module.store.DeleteInvite(ctx, orgID, id)
}

func (module *module) GetInviteByToken(ctx context.Context, token string) (*types.Invite, error) {
	return module.store.GetInviteByToken(ctx, token)
}

func (module *module) GetInviteByEmailInOrg(ctx context.Context, orgID string, email string) (*types.Invite, error) {
	return module.store.GetInviteByEmailInOrg(ctx, orgID, email)
}

func (m *module) CreateUserWithPassword(ctx context.Context, user *types.User, password *types.FactorPassword) (*types.User, error) {

	user, err := m.store.CreateUserWithPassword(ctx, user, password)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (m *module) CreateUser(ctx context.Context, user *types.User) error {
	return m.store.CreateUser(ctx, user)
}

func (m *module) GetUserByID(ctx context.Context, orgID string, id string) (*types.User, error) {
	return m.store.GetUserByID(ctx, orgID, id)
}

func (m *module) GetUserByEmailInOrg(ctx context.Context, orgID string, email string) (*types.User, error) {
	return m.store.GetUserByEmailInOrg(ctx, orgID, email)
}

func (m *module) GetUsersByEmail(ctx context.Context, email string) ([]*types.User, error) {
	return m.store.GetUsersByEmail(ctx, email)
}

func (m *module) ListUsers(ctx context.Context, orgID string) ([]*types.User, error) {
	return m.store.ListUsers(ctx, orgID)
}

func (m *module) UpdateUser(ctx context.Context, orgID string, id string, user *types.User) (*types.User, error) {
	return m.store.UpdateUser(ctx, orgID, id, user)
}

func (m *module) DeleteUser(ctx context.Context, orgID string, id string) error {
	user, err := m.store.GetUserByID(ctx, orgID, id)
	if err != nil {
		return err
	}

	if slices.Contains(types.AllIntegrationUserEmails, types.IntegrationUserEmail(user.Email)) {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "integration user cannot be updated")
	}

	return m.store.DeleteUser(ctx, orgID, user.ID.StringValue())
}

func (m *module) CreateResetPasswordToken(ctx context.Context, userID string) (*types.FactorResetPasswordRequest, error) {
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

func (m *module) GetPasswordByUserID(ctx context.Context, id string) (*types.FactorPassword, error) {
	return m.store.GetPasswordByUserID(ctx, id)
}

func (m *module) GetFactorResetPassword(ctx context.Context, token string) (*types.FactorResetPasswordRequest, error) {
	return m.store.GetFactorResetPassword(ctx, token)
}

func (m *module) UpdatePasswordAndDeleteResetPasswordEntry(ctx context.Context, userID string, password string) error {
	hashedPassword, err := types.HashPassword(password)
	if err != nil {
		return err
	}

	return m.store.UpdatePasswordAndDeleteResetPasswordEntry(ctx, userID, hashedPassword)
}

func (m *module) UpdatePassword(ctx context.Context, userID string, password string) error {
	hashedPassword, err := types.HashPassword(password)
	if err != nil {
		return err
	}
	return m.store.UpdatePassword(ctx, userID, hashedPassword)
}

func (m *module) GetAuthenticatedUser(ctx context.Context, orgID, email, password, refreshToken string) (*types.User, error) {
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
	if len(user) != 1 {
		dbUser = user[0]
	} else {
		return nil, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "user not found")

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

func (m *module) GetJWTForUser(ctx context.Context, user *types.User) (types.GettableUserJwt, error) {
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
