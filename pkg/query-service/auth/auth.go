package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/pkg/errors"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/dao"
	"go.signoz.io/query-service/model"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

const (
	opaqueTokenSize = 16
)

var (
	ErrorInvalidCreds = fmt.Errorf("Invalid credentials")
)

// The root user should be able to invite people to create account on SigNoz cluster.
func Invite(ctx context.Context, req *model.InviteRequest) (*model.InviteResponse, error) {
	token, err := randomHex(opaqueTokenSize)
	if err != nil {
		return nil, errors.Wrap(err, "failed to generate invite token")
	}

	user, apiErr := dao.DB().GetUserByEmail(ctx, req.Email)
	if apiErr != nil {
		return nil, errors.Wrap(apiErr.Err, "Failed to check already existing user")
	}

	if user != nil {
		return nil, errors.New("User already exists with the same email")
	}

	if err := validateInviteRequest(req); err != nil {
		return nil, errors.Wrap(err, "invalid invite request")
	}

	jwtAdmin, err := ExtractJwtFromContext(ctx)
	if err != nil {
		return nil, errors.Wrap(err, "failed to extract admin jwt token")
	}

	adminUser, err := validateUser(jwtAdmin)
	if err != nil {
		return nil, errors.Wrap(err, "failed to validate admin jwt token")
	}

	au, apiErr := dao.DB().GetUser(ctx, adminUser.Id)
	if apiErr != nil {
		return nil, errors.Wrap(err, "failed to validate admin jwt token")
	}
	inv := &model.InvitationObject{
		Name:      req.Name,
		Email:     req.Email,
		Token:     token,
		CreatedAt: time.Now().Unix(),
		Role:      req.Role,
		OrgId:     au.OrgId,
	}

	zap.S().Debugf("Creating invite: %+v\n", inv)

	if err := dao.DB().CreateInviteEntry(ctx, inv); err != nil {
		return nil, errors.Wrap(err.Err, "failed to write to DB")
	}

	return &model.InviteResponse{Email: inv.Email, InviteToken: inv.Token}, nil
}

func RevokeInvite(ctx context.Context, email string) error {
	if !isValidEmail(email) {
		return ErrorInvalidInviteToken
	}

	if err := dao.DB().DeleteInvitation(ctx, email); err != nil {
		return errors.Wrap(err.Err, "failed to write to DB")
	}
	return nil
}

func GetInvite(ctx context.Context, token string) (*model.InvitationResponse, error) {

	inv, apiErr := dao.DB().GetInviteFromToken(ctx, token)
	if apiErr != nil {
		return nil, errors.Wrap(apiErr.Err, "failed to query the DB")
	}

	org, apiErr := dao.DB().GetOrg(ctx, inv.OrgId)
	if apiErr != nil {
		return nil, errors.Wrap(apiErr.Err, "failed to query the DB")
	}
	return &model.InvitationResponse{
		Name:         inv.Name,
		Email:        inv.Email,
		Token:        inv.Token,
		CreatedAt:    inv.CreatedAt,
		Role:         inv.Role,
		Organization: org.Name,
	}, nil
}

func validateInvite(ctx context.Context, req *RegisterRequest) (*model.InvitationObject, error) {
	invitation, err := dao.DB().GetInviteFromEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.Wrap(err.Err, "Failed to read from DB")
	}

	if invitation == nil || invitation.Token != req.InviteToken {
		return nil, ErrorInvalidInviteToken
	}

	return invitation, nil
}

func CreateResetPasswordToken(ctx context.Context, userId string) (*model.ResetPasswordEntry, error) {
	token, err := randomHex(opaqueTokenSize)
	if err != nil {
		return nil, errors.Wrap(err, "failed to generate reset password token")
	}

	req := &model.ResetPasswordEntry{
		UserId: userId,
		Token:  token,
	}
	if apiErr := dao.DB().CreateResetPasswordEntry(ctx, req); err != nil {
		return nil, errors.Wrap(apiErr.Err, "failed to write to DB")
	}
	return req, nil
}

func ResetPassword(ctx context.Context, req *model.ResetPasswordRequest) error {
	entry, apiErr := dao.DB().GetResetPasswordEntry(ctx, req.Token)
	if apiErr != nil {
		return errors.Wrap(apiErr.Err, "failed to query the DB")
	}

	if entry == nil {
		return errors.New("Invalid reset password request")
	}

	hash, err := passwordHash(req.Password)
	if err != nil {
		return errors.Wrap(err, "Failed to generate password hash")
	}

	if apiErr := dao.DB().UpdateUserPassword(ctx, hash, entry.UserId); apiErr != nil {
		return apiErr.Err
	}

	if apiErr := dao.DB().DeleteResetPasswordEntry(ctx, req.Token); apiErr != nil {
		return errors.Wrap(apiErr.Err, "failed to delete reset token from DB")
	}

	return nil
}

func ChangePassword(ctx context.Context, req *model.ChangePasswordRequest) error {

	user, apiErr := dao.DB().GetUser(ctx, req.UserId)
	if apiErr != nil {
		return errors.Wrap(apiErr.Err, "failed to query user from the DB")
	}

	if user == nil || !passwordMatch(user.Password, req.OldPassword) {
		return ErrorInvalidCreds
	}

	hash, err := passwordHash(req.NewPassword)
	if err != nil {
		return errors.Wrap(err, "Failed to generate password hash")
	}

	if apiErr := dao.DB().UpdateUserPassword(ctx, hash, user.Id); apiErr != nil {
		return apiErr.Err
	}

	return nil
}

type RegisterRequest struct {
	Name        string `json:"name"`
	OrgName     string `json:"orgName"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	InviteToken string `json:"token"`
}

// Register registers a new user. For the first register request, it doesn't need an invite token
// and also the first registration is an enforced ADMIN registration. Every subsequent request will
// need an invite token to go through.
func Register(ctx context.Context, req *RegisterRequest) *model.ApiError {

	zap.S().Debugf("Got a register request for email: %v\n", req.Email)

	// TODO(Ahsan): We should optimize it, shouldn't make an extra DB call everytime to know if
	// this is the first register request.
	users, apiErr := dao.DB().GetUsers(ctx)
	if apiErr != nil {
		zap.S().Debugf("GetUser failed, err: %v\n", apiErr.Err)
		return apiErr
	}

	var group, orgId string

	// If there are no user, then this first user is granted Admin role. Also, an org is created
	// based on the request. Any other user can't use any other org name, if they do then
	// registration will fail because of foreign key violation while create user.
	// TODO(Ahsan): We need to re-work this logic for the case of multi-tenant system.
	if len(users) == 0 {
		org, apiErr := dao.DB().CreateOrg(ctx, &model.Organization{Name: req.OrgName})
		if apiErr != nil {
			zap.S().Debugf("CreateOrg failed, err: %v\n", apiErr.Err)
			return apiErr
		}
		group = constants.AdminGroup
		orgId = org.Id
	}

	if len(users) > 0 {
		inv, err := validateInvite(ctx, req)
		if err != nil {
			return &model.ApiError{Err: err, Typ: model.ErrorUnauthorized}
		}
		org, apiErr := dao.DB().GetOrgByName(ctx, req.OrgName)
		if apiErr != nil {
			zap.S().Debugf("GetOrgByName failed, err: %v\n", apiErr.Err)
			return apiErr
		}

		group = inv.Role
		if org != nil {
			orgId = org.Id
		}
	}

	user := &model.User{
		Name:      req.Name,
		OrgId:     orgId,
		Email:     req.Email,
		CreatedAt: time.Now().Unix(),
	}

	hash, err := passwordHash(req.Password)
	if err != nil {
		return &model.ApiError{Err: err, Typ: model.ErrorUnauthorized}
	}
	user.Password = hash
	userCreated, apiErr := dao.DB().CreateUserWithRole(ctx, user, group)
	if apiErr != nil {
		zap.S().Debugf("CreateUserWithRole failed, err: %v\n", apiErr.Err)
		return apiErr
	}

	userGroup, apiErr := dao.DB().GetGroupByName(ctx, group)
	if apiErr != nil {
		zap.S().Debugf("GetGroupByName failed, err: %v\n", apiErr.Err)
		return apiErr
	}

	AuthCacheObj.AddGroupUser(&model.GroupUser{UserId: userCreated.Id, GroupId: userGroup.Id})
	return dao.DB().DeleteInvitation(ctx, user.Email)
}

// Login method returns access and refresh tokens on successful login, else it errors out.
func Login(ctx context.Context, request *model.LoginRequest) (*model.LoginResponse, error) {
	user, err := authenticateLogin(ctx, request)
	if err != nil {
		return nil, err
	}

	accessJwtExpiry := time.Now().Add(JwtExpiry).Unix()

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":    user.Id,
		"email": user.Email,
		"exp":   accessJwtExpiry,
	})

	accessJwt, err := token.SignedString([]byte(JwtSecret))
	if err != nil {
		return nil, errors.Errorf("failed to encode jwt: %v", err)
	}

	refreshJwtExpiry := time.Now().Add(JwtRefresh).Unix()
	token = jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":    user.Id,
		"email": user.Email,
		"exp":   refreshJwtExpiry,
	})

	refreshJwt, err := token.SignedString([]byte(JwtSecret))
	if err != nil {
		return nil, errors.Errorf("failed to encode jwt: %v", err)
	}

	return &model.LoginResponse{
		AccessJwt:        accessJwt,
		AccessJwtExpiry:  accessJwtExpiry,
		RefreshJwt:       refreshJwt,
		RefreshJwtExpiry: refreshJwtExpiry,
		UserId:           user.Id,
	}, nil
}

// authenticateLogin is responsible for querying the DB and validating the credentials.
func authenticateLogin(ctx context.Context, req *model.LoginRequest) (*model.User, error) {

	// If refresh token is valid, then simply authorize the login request.
	if len(req.RefreshToken) > 0 {
		user, err := validateUser(req.RefreshToken)
		if err != nil {
			return nil, errors.Wrap(err, "failed to validate refresh token")
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
func passwordHash(pass string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// Checks if the given password results in the given hash.
func passwordMatch(hash, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err != nil {
		return false
	}
	return true
}
