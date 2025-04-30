package auth

import (
	"context"
	"fmt"

	"github.com/SigNoz/signoz/pkg/errors"

	"github.com/SigNoz/signoz/pkg/query-service/dao"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/query-service/telemetry"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

const (
	// opaqueTokenSize       = 16
	minimumPasswordLength = 8
)

var (
	ErrorInvalidCreds       = fmt.Errorf("invalid credentials")
	ErrorEmptyRequest       = errors.New("Empty request")
	ErrorInvalidRole        = errors.New("Invalid role")
	ErrorInvalidInviteToken = errors.New("Invalid invite token")
	ErrorAskAdmin           = errors.New("An invitation is needed to create an account. Please ask your admin (the person who has first installed SIgNoz) to send an invite.")
)

func ResetPassword(ctx context.Context, req *model.ResetPasswordRequest) error {
	entry, apiErr := dao.DB().GetResetPasswordEntry(ctx, req.Token)
	if apiErr != nil {
		return errors.Wrap(apiErr.Err, "failed to query the DB")
	}

	if entry == nil {
		return errors.New("Invalid reset password request")
	}

	hash, err := PasswordHash(req.Password)
	if err != nil {
		return errors.Wrap(err, "Failed to generate password hash")
	}

	if apiErr := dao.DB().UpdateUserPassword(ctx, hash, entry.UserID); apiErr != nil {
		return apiErr.Err
	}

	if apiErr := dao.DB().DeleteResetPasswordEntry(ctx, req.Token); apiErr != nil {
		return errors.Wrap(apiErr.Err, "failed to delete reset token from DB")
	}

	return nil
}

func ChangePassword(ctx context.Context, req *model.ChangePasswordRequest) *model.ApiError {
	user, apiErr := dao.DB().GetUser(ctx, req.UserId)
	if apiErr != nil {
		return apiErr
	}

	if user == nil || !passwordMatch(user.Password, req.OldPassword) {
		return model.ForbiddenError(ErrorInvalidCreds)
	}

	hash, err := PasswordHash(req.NewPassword)
	if err != nil {
		return model.InternalError(errors.New("Failed to generate password hash"))
	}

	if apiErr := dao.DB().UpdateUserPassword(ctx, hash, user.ID); apiErr != nil {
		return apiErr
	}

	return nil
}

// Login method returns access and refresh tokens on successful login, else it errors out.
func Login(ctx context.Context, request *model.LoginRequest, jwt *authtypes.JWT) (*model.LoginResponse, error) {
	user, err := authenticateLogin(ctx, request, jwt)
	if err != nil {
		zap.L().Error("Failed to authenticate login request", zap.Error(err))
		return nil, err
	}

	userjwt, err := GenerateJWTForUser(&user.User, jwt)
	if err != nil {
		zap.L().Error("Failed to generate JWT against login creds", zap.Error(err))
		return nil, err
	}

	// ignoring identity for unnamed users as a patch for #3863
	if user.Name != "" {
		telemetry.GetInstance().IdentifyUser(&user.User)
	}

	return &model.LoginResponse{
		UserJwtObject: userjwt,
		UserId:        user.User.ID,
	}, nil
}

// authenticateLogin is responsible for querying the DB and validating the credentials.
func authenticateLogin(ctx context.Context, req *model.LoginRequest, jwt *authtypes.JWT) (*types.GettableUser, error) {
	// If refresh token is valid, then simply authorize the login request.
	if len(req.RefreshToken) > 0 {
		// parse the refresh token
		claims, err := jwt.Claims(req.RefreshToken)
		if err != nil {
			return nil, errors.Wrap(err, "failed to parse refresh token")
		}

		user := &types.GettableUser{
			User: types.User{
				ID:    claims.UserID,
				Role:  claims.Role.String(),
				Email: claims.Email,
				OrgID: claims.OrgID,
			},
		}
		return user, nil
	}

	user, err := dao.DB().GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.Wrap(err.Err, "user not found")
	}
	if user == nil || !passwordMatch(user.Password, req.Password) {
		return nil, ErrorInvalidCreds
	}
	return user, nil
}

// Generate hash from the password.
func PasswordHash(pass string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// Checks if the given password results in the given hash.
func passwordMatch(hash, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func GenerateJWTForUser(user *types.User, jwt *authtypes.JWT) (model.UserJwtObject, error) {
	role, err := authtypes.NewRole(user.Role)
	if err != nil {
		return model.UserJwtObject{}, err
	}

	accessJwt, accessClaims, err := jwt.AccessToken(user.OrgID, user.ID, user.Email, role)
	if err != nil {
		return model.UserJwtObject{}, err
	}

	refreshJwt, refreshClaims, err := jwt.RefreshToken(user.OrgID, user.ID, user.Email, role)
	if err != nil {
		return model.UserJwtObject{}, err
	}

	return model.UserJwtObject{
		AccessJwt:        accessJwt,
		RefreshJwt:       refreshJwt,
		AccessJwtExpiry:  accessClaims.ExpiresAt.Unix(),
		RefreshJwtExpiry: refreshClaims.ExpiresAt.Unix(),
	}, nil
}
