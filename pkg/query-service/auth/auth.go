package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/google/uuid"
	"github.com/pkg/errors"
	"go.signoz.io/query-service/constants"
	"go.signoz.io/query-service/dao"
	"go.signoz.io/query-service/model"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

const (
	opaqueTokenSize       = 16
	minimumPasswordLength = 8
)

var (
	ErrorInvalidCreds = fmt.Errorf("invalid credentials")
)

// Invite sends the invitation for users
// The root user should be able to invite people to create account on SigNoz cluster.
func Invite(ctx context.Context, req *model.InviteRequest) (*model.InviteResponse, error) {
	zap.S().Debugf("Got an invite request for email: %s\n", req.Email)

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
		return nil, errors.Wrap(err, "failed to query admin user from the DB")
	}
	inv := &model.InvitationObject{
		Name:      req.Name,
		Email:     req.Email,
		Token:     token,
		CreatedAt: time.Now().Unix(),
		Role:      req.Role,
		OrgId:     au.OrgId,
	}

	if err := dao.DB().CreateInviteEntry(ctx, inv); err != nil {
		return nil, errors.Wrap(err.Err, "failed to write to DB")
	}

	return &model.InviteResponse{Email: inv.Email, InviteToken: inv.Token}, nil
}

// RevokeInvite is used to revoke the invitation for the given email.
func RevokeInvite(ctx context.Context, email string) error {
	zap.S().Debugf("RevokeInvite method invoked for email: %s\n", email)

	if !isValidEmail(email) {
		return ErrorInvalidInviteToken
	}

	if err := dao.DB().DeleteInvitation(ctx, email); err != nil {
		return errors.Wrap(err.Err, "failed to write to DB")
	}
	return nil
}

// GetInvite returns an invitation object for the given token.
func GetInvite(ctx context.Context, token string) (*model.InvitationResponseObject, error) {
	zap.S().Debugf("GetInvite method invoked for token: %s\n", token)

	inv, apiErr := dao.DB().GetInviteFromToken(ctx, token)
	if apiErr != nil {
		return nil, errors.Wrap(apiErr.Err, "failed to query the DB")
	}

	if inv == nil {
		return nil, errors.New("user is not invited")
	}

	// TODO(Ahsan): This is not the best way to add org name in the invite response. We should
	// either include org name in the invite table or do a join query.
	org, apiErr := dao.DB().GetOrg(ctx, inv.OrgId)
	if apiErr != nil {
		return nil, errors.Wrap(apiErr.Err, "failed to query the DB")
	}
	return &model.InvitationResponseObject{
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

	if invitation == nil {
		return nil, ErrorAskAdmin
	}

	if invitation.Token != req.InviteToken {
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

	var groupName, orgId string

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
		groupName = constants.AdminGroup
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

		groupName = inv.Role
		if org != nil {
			orgId = org.Id
		}
	}

	group, apiErr := dao.DB().GetGroupByName(ctx, groupName)
	if apiErr != nil {
		zap.S().Debugf("GetGroupByName failed, err: %v\n", apiErr.Err)
		return apiErr
	}

	hash, err := passwordHash(req.Password)
	if err != nil {
		return &model.ApiError{Err: err, Typ: model.ErrorUnauthorized}
	}

	user := &model.User{
		Id:                 uuid.NewString(),
		Name:               req.Name,
		Email:              req.Email,
		Password:           hash,
		CreatedAt:          time.Now().Unix(),
		ProfilePirctureURL: "", // Currently unused
		GroupId:            group.Id,
		OrgId:              orgId,
	}

	// TODO(Ahsan): Ideally create user and delete invitation should happen in a txn.
	_, apiErr = dao.DB().CreateUser(ctx, user)
	if apiErr != nil {
		zap.S().Debugf("CreateUser failed, err: %v\n", apiErr.Err)
		return apiErr
	}

	return dao.DB().DeleteInvitation(ctx, user.Email)
}

// Login method returns access and refresh tokens on successful login, else it errors out.
func Login(ctx context.Context, request *model.LoginRequest) (*model.LoginResponse, error) {
	zap.S().Debugf("Login method called for user: %s\n", request.Email)

	user, err := authenticateLogin(ctx, request)
	if err != nil {
		zap.S().Debugf("Failed to authenticate login request, %v", err)
		return nil, err
	}

	accessJwtExpiry := time.Now().Add(JwtExpiry).Unix()

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":    user.Id,
		"gid":   user.GroupId,
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
		"gid":   user.GroupId,
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
func authenticateLogin(ctx context.Context, req *model.LoginRequest) (*model.UserPayload, error) {

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
