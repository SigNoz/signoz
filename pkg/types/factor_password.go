package types

import (
	"encoding/json"
	"fmt"
	"slices"
	"time"
	"unicode"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/sethvargo/go-password/password"
	"github.com/uptrace/bun"
	"golang.org/x/crypto/bcrypt"
)

// sha256HexLen is the length of a hex-encoded SHA-256 digest (32 bytes -> 64 hex chars).
const sha256HexLen = 64

var (
	symbols                                []rune = []rune("~!@#$%^&*()_+`-={}|[]\\:\"<>?,./")
	minPasswordLength                      int    = 12
	ErrInvalidPassword                            = errors.Newf(errors.TypeInvalidInput, errors.MustNewCode("invalid_password"), "password must be at least %d characters long, should contain at least one uppercase letter [A-Z], one lowercase letter [a-z], one number [0-9], and one symbol [%c].", minPasswordLength, symbols)
	ErrCodeResetPasswordTokenAlreadyExists        = errors.MustNewCode("reset_password_token_already_exists")
	ErrCodePasswordNotFound                       = errors.MustNewCode("password_not_found")
	ErrCodeResetPasswordTokenNotFound             = errors.MustNewCode("reset_password_token_not_found")
	ErrCodeResetPasswordTokenExpired              = errors.MustNewCode("reset_password_token_expired")
	ErrCodePasswordAlreadyExists                  = errors.MustNewCode("password_already_exists")
	ErrCodeIncorrectPassword                      = errors.MustNewCode("incorrect_password")
)

type PostableVerifyResetPasswordToken struct {
	Token string `json:"token" required:"true"`
}

type PostableResetPassword struct {
	Password string `json:"password"`
	Token    string `json:"token"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"newPassword"`
}

type PostableForgotPassword struct {
	OrgID           valuer.UUID  `json:"orgId" required:"true"`
	Email           valuer.Email `json:"email" required:"true"`
	FrontendBaseURL string       `json:"frontendBaseURL"`
}

type ResetPasswordToken struct {
	bun.BaseModel `bun:"table:reset_password_token"`

	Identifiable
	Token      string      `bun:"token,type:text,notnull" json:"token"`
	PasswordID valuer.UUID `bun:"password_id,type:text,notnull,unique" json:"passwordId"`
	ExpiresAt  time.Time   `bun:"expires_at,type:timestamptz,nullzero" json:"expiresAt"`
}

type FactorPassword struct {
	bun.BaseModel `bun:"table:factor_password"`

	Identifiable
	Password  string `bun:"password,type:text,notnull" json:"password"`
	Temporary bool   `bun:"temporary,type:boolean,notnull" json:"temporary"`
	UserID    string `bun:"user_id,type:text,notnull,unique" json:"userId"`
	TimeAuditable
}

func (request *ChangePasswordRequest) UnmarshalJSON(data []byte) error {
	type Alias ChangePasswordRequest

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if !IsPasswordValid(temp.NewPassword) {
		return ErrInvalidPassword
	}

	*request = ChangePasswordRequest(temp)
	return nil
}

func (request *PostableResetPassword) UnmarshalJSON(data []byte) error {
	type Alias PostableResetPassword

	var temp Alias
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	if !IsPasswordValid(temp.Password) {
		return ErrInvalidPassword
	}

	*request = PostableResetPassword(temp)
	return nil
}

func NewFactorPassword(password string, userID string) (*FactorPassword, error) {
	if !IsPasswordValid(password) {
		return nil, ErrInvalidPassword
	}

	hashedPassword, err := NewHashedPassword(password)
	if err != nil {
		return nil, err
	}

	return &FactorPassword{
		Identifiable: Identifiable{
			ID: valuer.GenerateUUID(),
		},
		Password:  string(hashedPassword),
		Temporary: false,
		UserID:    userID,
		TimeAuditable: TimeAuditable{
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}, nil
}

func GenerateFactorPassword(userID string) (*FactorPassword, error) {
	password, err := password.Generate(12, 1, 1, false, false)
	if err != nil {
		return nil, err
	}

	return NewFactorPassword(password+"zZ", userID)
}

func MustGenerateFactorPassword(userID string) *FactorPassword {
	password, err := GenerateFactorPassword(userID)
	if err != nil {
		panic(err)
	}

	return password
}

func NewHashedPassword(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	return string(hashedPassword), nil
}

func NewResetPasswordToken(passwordID valuer.UUID, expiresAt time.Time) (*ResetPasswordToken, error) {
	return &ResetPasswordToken{
		Identifiable: Identifiable{
			ID: valuer.GenerateUUID(),
		},
		Token:      valuer.GenerateUUID().String(),
		PasswordID: passwordID,
		ExpiresAt:  expiresAt,
	}, nil
}

// IsPasswordValid accepts two shapes of input:
//  1. A hex-encoded SHA-256 digest (64 lowercase hex chars) -- this is what
//     every browser-facing flow now sends, since the frontend hashes the
//     password client-side before it ever reaches the server (see
//     frontend/src/utils/hashPassword.ts). Complexity is validated on the
//     raw password client-side (frontend/src/utils/passwordPolicy.ts)
//     before hashing, since the server can no longer see the raw password.
//  2. A raw, complex password meeting isComplexPassword's rules -- this
//     path exists for callers that never go through the browser/frontend
//     JS: the config-driven admin bootstrap password
//     (pkg/modules/user/impluser/service.go) and the internal placeholder
//     password generated for SSO users pending their first reset
//     (GenerateFactorPassword below).
func IsPasswordValid(password string) bool {
	if isSHA256Hex(password) {
		return true
	}

	return isComplexPassword(password)
}

func isSHA256Hex(s string) bool {
	if len(s) != sha256HexLen {
		return false
	}

	for _, char := range s {
		isDigit := char >= '0' && char <= '9'
		isLowerHex := char >= 'a' && char <= 'f'
		if !isDigit && !isLowerHex {
			return false
		}
	}

	return true
}

func isComplexPassword(password string) bool {
	if len(password) < minPasswordLength {
		return false
	}

	hasUpperCase := false
	hasLowerCase := false
	hasNumber := false
	hasSymbol := false

	for _, char := range password {
		if !hasLowerCase && unicode.IsLower(char) {
			hasLowerCase = true
		}

		if !hasUpperCase && unicode.IsUpper(char) {
			hasUpperCase = true
		}

		if !hasNumber && unicode.IsNumber(char) {
			hasNumber = true
		}

		if !hasSymbol && slices.Contains(symbols, char) {
			hasSymbol = true
		}

		if !unicode.IsLetter(char) && !unicode.IsNumber(char) && !slices.Contains(symbols, char) {
			return false
		}
	}

	if !hasUpperCase || !hasLowerCase || !hasNumber || !hasSymbol {
		return false
	}

	return true
}

func (f *FactorPassword) Update(password string) error {
	if !IsPasswordValid(password) {
		return ErrInvalidPassword
	}

	hashedPassword, err := NewHashedPassword(password)
	if err != nil {
		return err
	}

	f.Password = hashedPassword
	f.UpdatedAt = time.Now()

	return nil
}

func (f *FactorPassword) Equals(password string) bool {
	return comparePassword(f.Password, password)
}

func comparePassword(hashedPassword string, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password)) == nil
}

func (r *ResetPasswordToken) IsExpired() bool {
	return r.ExpiresAt.Before(time.Now())
}

func (r *ResetPasswordToken) FactorPasswordResetLink(frontendBaseUrl string) string {
	return fmt.Sprintf("%s/password-reset?token=%s", frontendBaseUrl, r.Token)
}
