package types

import (
	"encoding/json"
	"slices"
	"time"
	"unicode"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/sethvargo/go-password/password"
	"github.com/uptrace/bun"
	"golang.org/x/crypto/bcrypt"
)

var (
	symbols                                []rune = []rune("~!@#$%^&*()_+`-={}|[]\\:\"<>?,./")
	minPasswordLength                      int    = 12
	ErrInvalidPassword                            = errors.Newf(errors.TypeInvalidInput, errors.MustNewCode("invalid_password"), "password must be at least %d characters long, should contain at least one uppercase letter [A-Z], one lowercase letter [a-z], one number [0-9], and one symbol [%c].", minPasswordLength, symbols)
	ErrCodeResetPasswordTokenAlreadyExists        = errors.MustNewCode("reset_password_token_already_exists")
	ErrCodePasswordNotFound                       = errors.MustNewCode("password_not_found")
	ErrCodeResetPasswordTokenNotFound             = errors.MustNewCode("reset_password_token_not_found")
	ErrCodePasswordAlreadyExists                  = errors.MustNewCode("password_already_exists")
	ErrCodeIncorrectPassword                      = errors.MustNewCode("incorrect_password")
)

type PostableResetPassword struct {
	Password string `json:"password"`
	Token    string `json:"token"`
}

type ChangePasswordRequest struct {
	UserID      valuer.UUID `json:"userId"`
	OldPassword string      `json:"oldPassword"`
	NewPassword string      `json:"newPassword"`
}

type ResetPasswordToken struct {
	bun.BaseModel `bun:"table:reset_password_token"`

	Identifiable
	Token      string      `bun:"token,type:text,notnull" json:"token"`
	PasswordID valuer.UUID `bun:"password_id,type:text,notnull,unique" json:"passwordId"`
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

	return NewFactorPassword(password+"Z", userID)
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

func NewResetPasswordToken(passwordID valuer.UUID) (*ResetPasswordToken, error) {
	return &ResetPasswordToken{
		Identifiable: Identifiable{
			ID: valuer.GenerateUUID(),
		},
		Token:      valuer.GenerateUUID().String(),
		PasswordID: passwordID,
	}, nil
}

func IsPasswordValid(password string) bool {
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
