package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/google/uuid"
	"github.com/pkg/errors"

	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/utils"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

const (
	opaqueTokenSize       = 16
	minimumPasswordLength = 8
)

var (
	ErrorInvalidCreds = fmt.Errorf("Invalid credentials")
)

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

func ValidateInvite(ctx context.Context, req *RegisterRequest) (*model.InvitationObject, error) {
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

	// reference URL to track where the register request is coming from
	SourceUrl string `json:"sourceUrl"`
}

func RegisterFirstUser(ctx context.Context, req *RegisterRequest) (*model.User, *model.ApiError) {

	if req.Email == "" {
		return nil, model.BadRequest(model.ErrEmailRequired{})
	}

	if req.Password == "" {
		return nil, model.BadRequest(model.ErrPasswordRequired{})
	}

	groupName := constants.AdminGroup

	org, apierr := dao.DB().CreateOrg(ctx,
		&model.Organization{Name: req.OrgName})
	if apierr != nil {
		zap.S().Debugf("CreateOrg failed, err: %v\n", zap.Error(apierr.ToError()))
		return nil, apierr
	}

	group, apiErr := dao.DB().GetGroupByName(ctx, groupName)
	if apiErr != nil {
		zap.S().Debugf("GetGroupByName failed, err: %v\n", apiErr.Err)
		return nil, apiErr
	}

	var hash string
	var err error

	hash, err = passwordHash(req.Password)
	if err != nil {
		zap.S().Errorf("failed to generate password hash when registering a user", zap.Error(err))
		return nil, model.InternalError(model.ErrSignupFailed{})
	}

	user := &model.User{
		Id:                 uuid.NewString(),
		Name:               req.Name,
		Email:              req.Email,
		Password:           hash,
		CreatedAt:          time.Now().Unix(),
		ProfilePirctureURL: "", // Currently unused
		GroupId:            group.Id,
		OrgId:              org.Id,
	}

	return dao.DB().CreateUser(ctx, user, true)
}

// RegisterInvitedUser handles registering a invited user
func RegisterInvitedUser(ctx context.Context, req *RegisterRequest, nopassword bool) (*model.User, *model.ApiError) {

	if req.InviteToken == "" {
		return nil, model.BadRequest(fmt.Errorf("invite token is required"))
	}

	if !nopassword && req.Password == "" {
		return nil, model.BadRequest(model.ErrPasswordRequired{})
	}

	invite, err := ValidateInvite(ctx, req)
	if err != nil {
		zap.S().Errorf("failed to validate invite token", err)
		return nil, model.BadRequest(model.ErrSignupFailed{})
	}

	// checking if user email already exists, this is defensive but
	// required as delete invitation and user creation dont happen
	// in the same transaction at the end of this function
	userPayload, apierr := dao.DB().GetUserByEmail(ctx, invite.Email)
	if apierr != nil {
		zap.S().Debugf("failed to get user by email", apierr.Err)
		return nil, apierr
	}

	if userPayload != nil {
		// user already exists
		return &userPayload.User, nil
	}

	if invite.OrgId == "" {
		zap.S().Errorf("failed to find org in the invite")
		return nil, model.InternalError(fmt.Errorf("invalid invite, org not found"))
	}

	if invite.Role == "" {
		// if role is not provided, default to viewer
		invite.Role = constants.ViewerGroup
	}

	group, apiErr := dao.DB().GetGroupByName(ctx, invite.Role)
	if apiErr != nil {
		zap.S().Debugf("GetGroupByName failed, err: %v\n", apiErr.Err)
		return nil, model.InternalError(model.ErrSignupFailed{})
	}

	var hash string

	// check if password is not empty, as for SSO case it can be
	if req.Password != "" {
		hash, err = passwordHash(req.Password)
		if err != nil {
			zap.S().Errorf("failed to generate password hash when registering a user", zap.Error(err))
			return nil, model.InternalError(model.ErrSignupFailed{})
		}
	} else {
		hash, err = passwordHash(utils.GeneratePassowrd())
		if err != nil {
			zap.S().Errorf("failed to generate password hash when registering a user", zap.Error(err))
			return nil, model.InternalError(model.ErrSignupFailed{})
		}
	}

	user := &model.User{
		Id:                 uuid.NewString(),
		Name:               req.Name,
		Email:              req.Email,
		Password:           hash,
		CreatedAt:          time.Now().Unix(),
		ProfilePirctureURL: "", // Currently unused
		GroupId:            group.Id,
		OrgId:              invite.OrgId,
	}

	// TODO(Ahsan): Ideally create user and delete invitation should happen in a txn.
	user, apiErr = dao.DB().CreateUser(ctx, user, false)
	if apiErr != nil {
		zap.S().Debugf("CreateUser failed, err: %v\n", apiErr.Err)
		return nil, apiErr
	}

	apiErr = dao.DB().DeleteInvitation(ctx, user.Email)
	if apiErr != nil {
		zap.S().Debugf("delete invitation failed, err: %v\n", apiErr.Err)
		return nil, apiErr
	}

	return user, nil
}

// Register registers a new user. For the first register request, it doesn't need an invite token
// and also the first registration is an enforced ADMIN registration. Every subsequent request will
// need an invite token to go through.
func Register(ctx context.Context, req *RegisterRequest) (*model.User, *model.ApiError) {
	users, err := dao.DB().GetUsers(ctx)
	if err != nil {
		return nil, model.InternalError(fmt.Errorf("failed to get user count"))
	}

	switch len(users) {
	case 0:
		return RegisterFirstUser(ctx, req)
	default:
		return RegisterInvitedUser(ctx, req, false)
	}
}

// Login method returns access and refresh tokens on successful login, else it errors out.
func Login(ctx context.Context, request *model.LoginRequest) (*model.LoginResponse, error) {
	zap.S().Debugf("Login method called for user: %s\n", request.Email)

	user, err := authenticateLogin(ctx, request)
	if err != nil {
		zap.S().Debugf("Failed to authenticate login request, %v", err)
		return nil, err
	}

	userjwt, err := GenerateJWTForUser(&user.User)
	if err != nil {
		zap.S().Debugf("Failed to generate JWT against login creds, %v", err)
		return nil, err
	}

	return &model.LoginResponse{
		UserJwtObject: userjwt,
		UserId:        user.User.Id,
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

func GenerateJWTForUser(user *model.User) (model.UserJwtObject, error) {
	j := model.UserJwtObject{}
	var err error
	j.AccessJwtExpiry = time.Now().Add(JwtExpiry).Unix()

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":    user.Id,
		"gid":   user.GroupId,
		"email": user.Email,
		"exp":   j.AccessJwtExpiry,
	})

	j.AccessJwt, err = token.SignedString([]byte(JwtSecret))
	if err != nil {
		return j, errors.Errorf("failed to encode jwt: %v", err)
	}

	j.RefreshJwtExpiry = time.Now().Add(JwtRefresh).Unix()
	token = jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":    user.Id,
		"gid":   user.GroupId,
		"email": user.Email,
		"exp":   j.RefreshJwtExpiry,
	})

	j.RefreshJwt, err = token.SignedString([]byte(JwtSecret))
	if err != nil {
		return j, errors.Errorf("failed to encode jwt: %v", err)
	}
	return j, nil
}
