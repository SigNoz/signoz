package trustedheaderidentn

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/identn"
	"github.com/SigNoz/signoz/pkg/instrumentation/instrumentationtest"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

// fakeOrgGetter is a minimal organization.Getter test double.
type fakeOrgGetter struct {
	orgs []*types.Organization
}

func (f *fakeOrgGetter) Get(ctx context.Context, id valuer.UUID) (*types.Organization, error) {
	for _, org := range f.orgs {
		if org.ID == id {
			return org, nil
		}
	}
	return nil, errors.New(errors.TypeNotFound, errors.CodeNotFound, "organization not found")
}

func (f *fakeOrgGetter) GetByIDOrName(ctx context.Context, id valuer.UUID, name string) (*types.Organization, bool, error) {
	for _, org := range f.orgs {
		if org.ID == id {
			return org, false, nil
		}
	}
	for _, org := range f.orgs {
		if org.Name == name {
			return org, true, nil
		}
	}
	return nil, false, errors.New(errors.TypeNotFound, errors.CodeNotFound, "organization not found")
}

func (f *fakeOrgGetter) ListByOwnedKeyRange(ctx context.Context) ([]*types.Organization, error) {
	return f.orgs, nil
}

func (f *fakeOrgGetter) GetByName(ctx context.Context, name string) (*types.Organization, error) {
	for _, org := range f.orgs {
		if org.Name == name {
			return org, nil
		}
	}
	return nil, errors.New(errors.TypeNotFound, errors.CodeNotFound, "organization not found")
}

var _ organization.Getter = (*fakeOrgGetter)(nil)

// fakeUserGetter is a minimal user.Getter test double; only methods used by
// the trusted-header IdentN need real behaviour.
type fakeUserGetter struct {
	users []*types.User
}

func (f *fakeUserGetter) GetRootUserByOrgID(context.Context, valuer.UUID) (*types.User, []*authtypes.UserRole, error) {
	return nil, nil, errors.New(errors.TypeNotFound, errors.CodeNotFound, "not implemented")
}

func (f *fakeUserGetter) ListDeprecatedUsersByOrgID(context.Context, valuer.UUID) ([]*types.DeprecatedUser, error) {
	return nil, nil
}

func (f *fakeUserGetter) ListUsersByOrgID(context.Context, valuer.UUID) ([]*types.User, error) {
	return nil, nil
}

func (f *fakeUserGetter) GetDeprecatedUserByOrgIDAndID(context.Context, valuer.UUID, valuer.UUID) (*types.DeprecatedUser, error) {
	return nil, errors.New(errors.TypeNotFound, errors.CodeNotFound, "not implemented")
}

func (f *fakeUserGetter) GetUserByOrgIDAndID(context.Context, valuer.UUID, valuer.UUID) (*types.User, error) {
	return nil, errors.New(errors.TypeNotFound, errors.CodeNotFound, "not implemented")
}

func (f *fakeUserGetter) Get(context.Context, valuer.UUID) (*types.DeprecatedUser, error) {
	return nil, errors.New(errors.TypeNotFound, errors.CodeNotFound, "not implemented")
}

func (f *fakeUserGetter) ListUsersByEmailAndOrgIDs(_ context.Context, email valuer.Email, orgIDs []valuer.UUID) ([]*types.User, error) {
	matches := make([]*types.User, 0)
	for _, u := range f.users {
		if u.Email != email {
			continue
		}
		for _, orgID := range orgIDs {
			if u.OrgID == orgID {
				matches = append(matches, u)
				break
			}
		}
	}
	return matches, nil
}

func (f *fakeUserGetter) CountByOrgID(context.Context, valuer.UUID) (int64, error) {
	return 0, nil
}

func (f *fakeUserGetter) CountByOrgIDAndStatuses(context.Context, valuer.UUID, []string) (map[valuer.String]int64, error) {
	return nil, errors.New(errors.TypeNotFound, errors.CodeNotFound, "not implemented")
}

func (f *fakeUserGetter) GetFactorPasswordByUserID(context.Context, valuer.UUID) (*types.FactorPassword, error) {
	return nil, errors.New(errors.TypeNotFound, errors.CodeNotFound, "not implemented")
}

func (f *fakeUserGetter) GetResetPasswordTokenByOrgIDAndUserID(context.Context, valuer.UUID, valuer.UUID) (*types.ResetPasswordToken, error) {
	return nil, errors.New(errors.TypeNotFound, errors.CodeNotFound, "not implemented")
}

func (f *fakeUserGetter) GetNonDeletedUserByEmailAndOrgID(_ context.Context, email valuer.Email, orgID valuer.UUID) (*types.User, error) {
	for _, u := range f.users {
		if u.Email == email && u.OrgID == orgID && u.ErrIfDeleted() == nil {
			return u, nil
		}
	}
	return nil, errors.New(errors.TypeNotFound, types.ErrCodeUserNotFound, "user not found")
}

func (f *fakeUserGetter) GetRolesByUserID(context.Context, valuer.UUID) ([]*authtypes.UserRole, error) {
	return nil, nil
}

func (f *fakeUserGetter) GetUsersByOrgIDAndRoleID(context.Context, valuer.UUID, valuer.UUID) ([]*types.User, error) {
	return nil, nil
}

func (f *fakeUserGetter) OnBeforeRoleDelete(context.Context, valuer.UUID, valuer.UUID, string) error {
	return nil
}

func (f *fakeUserGetter) GetUserRoleByOrgIDAndID(context.Context, valuer.UUID, valuer.UUID) (*authtypes.UserRole, error) {
	return nil, errors.New(errors.TypeNotFound, errors.CodeNotFound, "not implemented")
}

func (f *fakeUserGetter) VerifyResetPasswordToken(context.Context, string) error {
	return nil
}

var _ user.Getter = (*fakeUserGetter)(nil)

// fakeUserSetter records the users passed to CreateUser.
//
// Most methods are stubs returning nil/zero: they exist purely to satisfy the
// user.Setter interface. Only CreateUser is exercised by these tests;
// GetIdentity no longer calls GetOrCreateUser (see provider.go), so that
// method is kept only to satisfy the interface and is not used to model any
// behaviour here.
type fakeUserSetter struct {
	createdUsers []*types.User
	autoFail     bool
	existing     []*types.User
}

// withExisting primes the fake with a non-deleted row that already occupies
// the (email, org_id) slot a later CreateUser call will try to insert into.
// It models the partial unique index on (email, org_id) WHERE status !=
// 'deleted' (pkg/sqlmigration/076_drop_user_deleted_at.go): a real INSERT
// colliding with that index fails, so CreateUser below returns an error
// instead of creating anything, rather than adopting the existing row the way
// GetOrCreateUser once did.
func (f *fakeUserSetter) withExisting(users ...*types.User) *fakeUserSetter {
	f.existing = append(f.existing, users...)
	return f
}

func (f *fakeUserSetter) CreateFirstUser(context.Context, *types.Organization, string, valuer.Email, string) (*types.User, error) {
	return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "not implemented")
}

func (f *fakeUserSetter) CreateUser(_ context.Context, u *types.User, _ ...user.CreateUserOption) error {
	if f.autoFail {
		return errors.New(errors.TypeInternal, errors.CodeInternal, "create user failed")
	}
	for _, e := range f.existing {
		if e.Email == u.Email && e.OrgID == u.OrgID && e.ErrIfDeleted() == nil {
			return errors.New(errors.TypeAlreadyExists, errors.CodeAlreadyExists, "a non-deleted user already exists for this email and org")
		}
	}
	f.createdUsers = append(f.createdUsers, u)
	return nil
}

func (f *fakeUserSetter) GetOrCreateUser(context.Context, *types.User, ...user.CreateUserOption) (*types.User, error) {
	return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "GetOrCreateUser is not used by the trusted-header provider and is not modelled by this fake")
}

func (f *fakeUserSetter) GetOrCreateResetPasswordToken(context.Context, valuer.UUID) (*types.ResetPasswordToken, error) {
	return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "not implemented")
}

func (f *fakeUserSetter) UpdatePasswordByResetPasswordToken(context.Context, string, string) error {
	return nil
}

func (f *fakeUserSetter) UpdatePassword(context.Context, valuer.UUID, string, string) error {
	return nil
}

func (f *fakeUserSetter) ForgotPassword(context.Context, valuer.UUID, valuer.Email, string) error {
	return nil
}

func (f *fakeUserSetter) UpdateUserDeprecated(context.Context, valuer.UUID, string, *types.DeprecatedUser) (*types.DeprecatedUser, error) {
	return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "not implemented")
}

func (f *fakeUserSetter) UpdateUser(context.Context, valuer.UUID, valuer.UUID, *types.UpdatableUser) (*types.User, error) {
	return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "not implemented")
}

func (f *fakeUserSetter) UpdateAnyUserDeprecated(context.Context, valuer.UUID, *types.DeprecatedUser) error {
	return nil
}

func (f *fakeUserSetter) UpdateAnyUser(context.Context, valuer.UUID, *types.User) error {
	return nil
}

func (f *fakeUserSetter) DeleteUser(context.Context, valuer.UUID, string, string) error {
	return nil
}

func (f *fakeUserSetter) CreateBulkInvite(context.Context, valuer.UUID, valuer.UUID, valuer.Email, *types.PostableBulkInviteRequest) ([]*types.Invite, error) {
	return nil, nil
}

func (f *fakeUserSetter) UpdateUserRoles(context.Context, valuer.UUID, valuer.UUID, []string) error {
	return nil
}

func (f *fakeUserSetter) CreatePendingInviteUser(context.Context, valuer.UUID, valuer.Email, string, *types.User, ...user.CreateUserOption) (*types.User, error) {
	return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "not implemented")
}

func (f *fakeUserSetter) AddUserRole(context.Context, valuer.UUID, valuer.UUID, string) (*authtypes.UserRole, error) {
	return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "not implemented")
}

func (f *fakeUserSetter) AddUserRoleByRoleID(context.Context, valuer.UUID, valuer.UUID, valuer.UUID) (*authtypes.UserRole, error) {
	return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "not implemented")
}

func (f *fakeUserSetter) RemoveUserRole(context.Context, valuer.UUID, valuer.UUID, valuer.UUID) error {
	return nil
}

func (f *fakeUserSetter) Collect(context.Context, valuer.UUID) (map[string]any, error) {
	return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "not implemented")
}

var _ user.Setter = (*fakeUserSetter)(nil)

const testSecretHeader = "X-Proxy-Auth"
const testSecretValue = "test-proxy-secret"

func newConfig(emailHeader, nameHeader string, autoProvision bool) identn.Config {
	cfg := identn.Config{
		TrustedHeader: identn.TrustedHeaderConfig{
			Enabled:       true,
			EmailHeaders:  []string{emailHeader},
			AutoProvision: autoProvision,
			Trust: identn.TrustConfig{
				Mode:   identn.TrustModeSecret,
				Secret: identn.SecretTrustConfig{Header: testSecretHeader, Value: testSecretValue},
			},
		},
	}

	if nameHeader != "" {
		cfg.TrustedHeader.NameHeaders = []string{nameHeader}
	}

	return cfg
}

// newConfigWithHeaders is like newConfig but accepts full header lists, so
// tests can exercise multi-header fallback and precedence behaviour that a
// single-header config cannot express.
func newConfigWithHeaders(emailHeaders []string, nameHeaders []string, autoProvision bool) identn.Config {
	return identn.Config{
		TrustedHeader: identn.TrustedHeaderConfig{
			Enabled:       true,
			EmailHeaders:  emailHeaders,
			NameHeaders:   nameHeaders,
			AutoProvision: autoProvision,
			Trust: identn.TrustConfig{
				Mode:   identn.TrustModeSecret,
				Secret: identn.SecretTrustConfig{Header: testSecretHeader, Value: testSecretValue},
			},
		},
	}
}

// newTrustedRequest builds a request that already satisfies the trust check,
// so tests can focus on identity resolution. header names which request
// header the email is set under; it must match the provider's configured
// email header, since a mismatch here would silently exercise the "header
// absent" path instead of the one the test intends. Tests exercising
// multi-value or multi-header setups build the request directly instead, so
// every current caller happens to pass "X-Forwarded-Email". header stays a
// parameter anyway: hardcoding it here would silently break the first test
// that configures a different single email header, exactly the mismatch this
// function exists to prevent (see above).
//
//nolint:unparam // kept to prevent a silent header mismatch; see comment above
func newTrustedRequest(header, email string) *http.Request {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set(testSecretHeader, testSecretValue)
	if email != "" {
		req.Header.Set(header, email)
	}
	return req
}

func newProvider(t *testing.T, cfg identn.Config, orgGetter organization.Getter, userGetter user.Getter, userSetter user.Setter) identn.IdentN {
	t.Helper()

	p, err := New(context.Background(), instrumentationtest.New().ToProviderSettings(), cfg, orgGetter, userGetter, userSetter)
	require.NoError(t, err)

	return p
}

// The email header below is deliberately not X-Forwarded-Email: Name() never
// looks at the request, so this pins that newConfig's emailHeader is honored
// verbatim regardless of which header an operator configures.
func TestProviderName(t *testing.T) {
	p := newProvider(t, newConfig("X-Custom-Auth-Email", "", false), &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	assert.Equal(t, authtypes.IdentNProviderTrustedHeader, p.Name())
}

// TestNewAcceptsJWTMode pins that jwt mode is a fully supported trust mode,
// not a placeholder: New must construct a working provider from a valid jwt
// config rather than refusing it. This replaces a now-obsolete assertion:
// jwt mode used to be rejected outright at construction time before this
// checker existed.
func TestNewAcceptsJWTMode(t *testing.T) {
	_, jwksURL, _ := newJWKSFixture(t)

	cfg := identn.Config{
		TrustedHeader: identn.TrustedHeaderConfig{
			Enabled: true,
			Trust: identn.TrustConfig{
				Mode: identn.TrustModeJWT,
				JWT: identn.JWTTrustConfig{
					AssertionHeader: "Teleport-Jwt-Assertion",
					JWKSURL:         jwksURL,
					Issuer:          "https://teleport.example",
					Audience:        "signoz",
					IdentityClaim:   "sub",
				},
			},
		},
	}

	p, err := New(context.Background(), instrumentationtest.New().ToProviderSettings(), cfg, &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})
	require.NoError(t, err)
	assert.NotNil(t, p)
}

func TestNewRefusesUnsetTrustMode(t *testing.T) {
	cfg := identn.Config{
		TrustedHeader: identn.TrustedHeaderConfig{
			Enabled: true,
		},
	}

	_, err := New(context.Background(), instrumentationtest.New().ToProviderSettings(), cfg, &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})
	require.Error(t, err)
}

// The following six tests pin down that Test actually consults the trust
// checker and the peer allowlist rather than only the email header. Deleting
// the provider.trust.Check call from Test, or the peerAllowed call, must make
// at least one of these fail; that experiment is recorded in the task report.
func TestTestReturnsFalseWhenSecretHeaderAbsent(t *testing.T) {
	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Forwarded-Email", "alice@example.com")

	assert.False(t, p.Test(req))
}

func TestTestReturnsFalseWhenSecretWrong(t *testing.T) {
	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Forwarded-Email", "alice@example.com")
	req.Header.Set(testSecretHeader, "wrong-value")

	assert.False(t, p.Test(req))
}

func TestTestReturnsFalseWhenSecretHeaderDuplicated(t *testing.T) {
	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Forwarded-Email", "alice@example.com")
	req.Header.Add(testSecretHeader, testSecretValue)
	req.Header.Add(testSecretHeader, testSecretValue)

	assert.False(t, p.Test(req))
}

func TestTestReturnsFalseWhenPeerOutsideTrustedProxies(t *testing.T) {
	cfg := newConfig("X-Forwarded-Email", "", false)
	cfg.TrustedHeader.TrustedProxies = []string{"10.0.0.0/24"}
	p := newProvider(t, cfg, &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	req := newTrustedRequest("X-Forwarded-Email", "alice@example.com")
	req.RemoteAddr = "192.168.1.5:12345"

	assert.False(t, p.Test(req))
}

func TestTestReturnsTrueWhenPeerInsideTrustedProxies(t *testing.T) {
	cfg := newConfig("X-Forwarded-Email", "", false)
	cfg.TrustedHeader.TrustedProxies = []string{"10.0.0.0/24"}
	p := newProvider(t, cfg, &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	req := newTrustedRequest("X-Forwarded-Email", "alice@example.com")
	req.RemoteAddr = "10.0.0.5:12345"

	assert.True(t, p.Test(req))
}

func TestTestReturnsTrueWhenTrustedProxiesEmptyRegardlessOfPeer(t *testing.T) {
	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	req := newTrustedRequest("X-Forwarded-Email", "alice@example.com")
	req.RemoteAddr = "203.0.113.7:54321"

	assert.True(t, p.Test(req))
}

func TestTestReturnsTrueWhenHeaderPresent(t *testing.T) {
	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	req := newTrustedRequest("X-Forwarded-Email", "alice@example.com")

	assert.True(t, p.Test(req))
}

func TestTestReturnsFalseWhenHeaderMissing(t *testing.T) {
	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	req := newTrustedRequest("X-Forwarded-Email", "")

	assert.False(t, p.Test(req))
}

func TestTestReturnsFalseWhenHeaderBlank(t *testing.T) {
	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	req := newTrustedRequest("X-Forwarded-Email", "")
	req.Header.Set("X-Forwarded-Email", "   ")

	assert.False(t, p.Test(req))
}

func TestGetIdentityReturnsExistingUser(t *testing.T) {
	orgID := valuer.GenerateUUID()
	email, err := valuer.NewEmail("alice@example.com")
	require.NoError(t, err)

	existing, err := types.NewUser("Alice", email, orgID, types.UserStatusActive)
	require.NoError(t, err)

	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{{Identifiable: types.Identifiable{ID: orgID}, Name: "default"}}}
	userGetter := &fakeUserGetter{users: []*types.User{existing}}
	userSetter := &fakeUserSetter{}

	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), orgGetter, userGetter, userSetter)

	req := newTrustedRequest("X-Forwarded-Email", "alice@example.com")

	identity, err := p.GetIdentity(req)
	require.NoError(t, err)
	require.NotNil(t, identity)

	assert.Equal(t, existing.ID, identity.UserID)
	assert.Equal(t, orgID, identity.OrgID)
	assert.Equal(t, email, identity.Email)
	assert.Equal(t, authtypes.PrincipalUser, identity.Principal)
	assert.Equal(t, authtypes.IdentNProviderTrustedHeader, identity.IdenNProvider)
	assert.Empty(t, userSetter.createdUsers, "expected no auto-provisioned users")
}

// GetIdentity must not rely on Test having already run: even a fully valid,
// known email must be refused if the request never proved it came from the
// trusted proxy.
func TestGetIdentityRefusesRequestWithoutSecret(t *testing.T) {
	orgID := valuer.GenerateUUID()
	email, err := valuer.NewEmail("alice@example.com")
	require.NoError(t, err)

	existing, err := types.NewUser("Alice", email, orgID, types.UserStatusActive)
	require.NoError(t, err)

	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{{Identifiable: types.Identifiable{ID: orgID}, Name: "default"}}}
	userGetter := &fakeUserGetter{users: []*types.User{existing}}

	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), orgGetter, userGetter, &fakeUserSetter{})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Forwarded-Email", "alice@example.com")

	identity, err := p.GetIdentity(req)
	require.Error(t, err)
	assert.Nil(t, identity)
	assert.True(t, errors.Asc(err, ErrCodeTrustedHeaderUntrusted))
}

func TestGetIdentityErrorsWhenHeaderMissing(t *testing.T) {
	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	req := newTrustedRequest("X-Forwarded-Email", "")

	identity, err := p.GetIdentity(req)
	require.Error(t, err)
	assert.Nil(t, identity)
	assert.True(t, errors.Ast(err, errors.TypeUnauthenticated), "expected unauthenticated error type")
}

func TestGetIdentityErrorsWhenEmailInvalid(t *testing.T) {
	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	req := newTrustedRequest("X-Forwarded-Email", "not-an-email")

	identity, err := p.GetIdentity(req)
	require.Error(t, err)
	assert.Nil(t, identity)
}

func TestGetIdentityErrorsWhenUserUnknownAndAutoProvisionDisabled(t *testing.T) {
	orgID := valuer.GenerateUUID()
	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{{Identifiable: types.Identifiable{ID: orgID}, Name: "default"}}}

	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), orgGetter, &fakeUserGetter{}, &fakeUserSetter{})

	req := newTrustedRequest("X-Forwarded-Email", "ghost@example.com")

	identity, err := p.GetIdentity(req)
	require.Error(t, err)
	assert.Nil(t, identity)
	assert.True(t, errors.Ast(err, errors.TypeUnauthenticated), "expected unauthenticated error type")
}

func TestGetIdentityAutoProvisionsWhenEnabled(t *testing.T) {
	orgID := valuer.GenerateUUID()
	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{{Identifiable: types.Identifiable{ID: orgID}, Name: "default"}}}
	userSetter := &fakeUserSetter{}

	p := newProvider(t, newConfig("X-Forwarded-Email", "X-Forwarded-User", true), orgGetter, &fakeUserGetter{}, userSetter)

	req := newTrustedRequest("X-Forwarded-Email", "newcomer@example.com")
	req.Header.Set("X-Forwarded-User", "Newcomer Bob")

	identity, err := p.GetIdentity(req)
	require.NoError(t, err)
	require.NotNil(t, identity)
	assert.Equal(t, orgID, identity.OrgID)
	assert.Equal(t, "newcomer@example.com", identity.Email.StringValue())
	assert.Equal(t, authtypes.IdentNProviderTrustedHeader, identity.IdenNProvider)

	require.Len(t, userSetter.createdUsers, 1)
	assert.Equal(t, "Newcomer Bob", userSetter.createdUsers[0].DisplayName)
	assert.Equal(t, orgID, userSetter.createdUsers[0].OrgID)
}

func TestGetIdentityAutoProvisionUsesEmailLocalPartWhenNoNameHeader(t *testing.T) {
	orgID := valuer.GenerateUUID()
	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{{Identifiable: types.Identifiable{ID: orgID}, Name: "default"}}}
	userSetter := &fakeUserSetter{}

	p := newProvider(t, newConfig("X-Forwarded-Email", "", true), orgGetter, &fakeUserGetter{}, userSetter)

	req := newTrustedRequest("X-Forwarded-Email", "carol@example.com")

	_, err := p.GetIdentity(req)
	require.NoError(t, err)

	require.Len(t, userSetter.createdUsers, 1)
	assert.Equal(t, "carol", userSetter.createdUsers[0].DisplayName)
}

func TestGetIdentityRefusesAutoProvisionWithMultipleOrgs(t *testing.T) {
	orgGetter := &fakeOrgGetter{
		orgs: []*types.Organization{
			{Identifiable: types.Identifiable{ID: valuer.GenerateUUID()}, Name: "one"},
			{Identifiable: types.Identifiable{ID: valuer.GenerateUUID()}, Name: "two"},
		},
	}

	p := newProvider(t, newConfig("X-Forwarded-Email", "", true), orgGetter, &fakeUserGetter{}, &fakeUserSetter{})

	req := newTrustedRequest("X-Forwarded-Email", "newcomer@example.com")

	identity, err := p.GetIdentity(req)
	require.Error(t, err)
	assert.Nil(t, identity)
}

func TestGetIdentityErrorsWhenNoOrganization(t *testing.T) {
	p := newProvider(t, newConfig("X-Forwarded-Email", "", true), &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	req := newTrustedRequest("X-Forwarded-Email", "alice@example.com")

	identity, err := p.GetIdentity(req)
	require.Error(t, err)
	assert.Nil(t, identity)
}

func TestGetIdentityRejectsRootUser(t *testing.T) {
	orgID := valuer.GenerateUUID()
	email, err := valuer.NewEmail("root@example.com")
	require.NoError(t, err)

	rootUser, err := types.NewRootUser("Root", email, orgID)
	require.NoError(t, err)

	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{{Identifiable: types.Identifiable{ID: orgID}, Name: "default"}}}
	userGetter := &fakeUserGetter{users: []*types.User{rootUser}}

	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), orgGetter, userGetter, &fakeUserSetter{})

	req := newTrustedRequest("X-Forwarded-Email", "root@example.com")

	identity, err := p.GetIdentity(req)
	require.Error(t, err)
	assert.Nil(t, identity)
}

// The root user is filtered out by the ineligible guard before the
// auto-provisioning branch is ever reached, even with AutoProvision enabled,
// so this test no longer exercises CreateUser at all: it pins the same
// refusal as TestGetIdentityRejectsRootUser, but confirms it holds regardless
// of AutoProvision. This used to describe GetOrCreateUser adopting the
// existing root record after a post-create check; that check was removed
// because CreateUser (unlike GetOrCreateUser) has no adoption path and so can
// never hand back a pre-existing record for the provider to inspect.
func TestGetIdentityDoesNotProvisionIntoRootUser(t *testing.T) {
	orgID := valuer.GenerateUUID()
	email, err := valuer.NewEmail("root@example.com")
	require.NoError(t, err)

	rootUser, err := types.NewRootUser("Root", email, orgID)
	require.NoError(t, err)

	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{{Identifiable: types.Identifiable{ID: orgID}, Name: "default"}}}
	userGetter := &fakeUserGetter{users: []*types.User{rootUser}}
	userSetter := &fakeUserSetter{}

	p := newProvider(t, newConfig("X-Forwarded-Email", "", true), orgGetter, userGetter, userSetter)

	req := newTrustedRequest("X-Forwarded-Email", "root@example.com")

	identity, err := p.GetIdentity(req)
	require.Error(t, err)
	assert.Nil(t, identity)
	assert.True(t, errors.Asc(err, ErrCodeTrustedHeaderUserNotEligible))
	assert.Empty(t, userSetter.createdUsers, "auto-provisioning must not run for a known ineligible user")
}

// Multi-org case: when ListUsersByEmailAndOrgIDs returns both a root user
// and a regular user for the same email, the resolver must skip the root
// and pick the non-root regardless of slice order - DB query order is not
// guaranteed.
func TestGetIdentityPicksNonRootWhenRootAndRegularShareEmail(t *testing.T) {
	rootOrgID := valuer.GenerateUUID()
	regularOrgID := valuer.GenerateUUID()
	email, err := valuer.NewEmail("shared@example.com")
	require.NoError(t, err)

	rootUser, err := types.NewRootUser("Root", email, rootOrgID)
	require.NoError(t, err)
	regularUser, err := types.NewUser("Regular", email, regularOrgID, types.UserStatusActive)
	require.NoError(t, err)

	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{
		{Identifiable: types.Identifiable{ID: rootOrgID}, Name: "root-org"},
		{Identifiable: types.Identifiable{ID: regularOrgID}, Name: "regular-org"},
	}}

	// Iterate both possible slice orderings so the test fails the same way
	// regardless of whether the DB returns the root or the regular user first.
	for _, ordering := range [][]*types.User{
		{rootUser, regularUser},
		{regularUser, rootUser},
	} {
		userGetter := &fakeUserGetter{users: ordering}
		p := newProvider(t, newConfig("X-Forwarded-Email", "", false), orgGetter, userGetter, &fakeUserSetter{})

		req := newTrustedRequest("X-Forwarded-Email", "shared@example.com")

		identity, err := p.GetIdentity(req)
		require.NoError(t, err)
		require.NotNil(t, identity)
		assert.Equal(t, regularUser.ID, identity.UserID)
		assert.Equal(t, regularOrgID, identity.OrgID)
	}
}

func TestGetIdentityRejectsPendingInviteUser(t *testing.T) {
	orgID := valuer.GenerateUUID()
	email, err := valuer.NewEmail("alice@example.com")
	require.NoError(t, err)

	pending, err := types.NewUser("Alice", email, orgID, types.UserStatusPendingInvite)
	require.NoError(t, err)

	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{{Identifiable: types.Identifiable{ID: orgID}, Name: "default"}}}
	userGetter := &fakeUserGetter{users: []*types.User{pending}}

	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), orgGetter, userGetter, &fakeUserSetter{})

	req := newTrustedRequest("X-Forwarded-Email", "alice@example.com")

	identity, err := p.GetIdentity(req)
	require.Error(t, err)
	assert.Nil(t, identity)
}

// TestGetIdentityRejectsPendingInviteUserEvenWithAutoProvision pins the
// escalation TestGetIdentityRejectsPendingInviteUser could not reach: that
// test runs with autoProvision=false, so it never exercises the provisioning
// branch. With autoProvision=true, a pending user is still filtered out of
// the matched set, so without the ineligible guard control would fall
// through to auto-provisioning believing no user existed. Here the pending
// row is visible to ListUsersByEmailAndOrgIDs, so the ineligible guard itself
// is what refuses the request before CreateUser is ever called; the
// narrower case where the pending row is invisible to that lookup but
// present by the time CreateUser runs is pinned separately by
// TestGetIdentityFailsClosedWhenPendingInviteAppearsBetweenLookupAndCreate.
func TestGetIdentityRejectsPendingInviteUserEvenWithAutoProvision(t *testing.T) {
	orgID := valuer.GenerateUUID()
	email, err := valuer.NewEmail("alice@example.com")
	require.NoError(t, err)

	pending, err := types.NewUser("Alice", email, orgID, types.UserStatusPendingInvite)
	require.NoError(t, err)

	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{{Identifiable: types.Identifiable{ID: orgID}, Name: "default"}}}
	userGetter := &fakeUserGetter{users: []*types.User{pending}}
	userSetter := &fakeUserSetter{}

	p := newProvider(t, newConfig("X-Forwarded-Email", "", true), orgGetter, userGetter, userSetter)

	req := newTrustedRequest("X-Forwarded-Email", "alice@example.com")

	identity, err := p.GetIdentity(req)
	require.Error(t, err)
	assert.Nil(t, identity)
	assert.True(t, errors.Asc(err, ErrCodeTrustedHeaderUserNotEligible))
	assert.Empty(t, userSetter.createdUsers, "auto-provisioning must not run for a known ineligible user")
}

// TestGetIdentityFailsClosedWhenPendingInviteAppearsBetweenLookupAndCreate is
// the regression test for the TOCTOU race: the ineligible guard reads the
// world once, through ListUsersByEmailAndOrgIDs, and CreateUser acts on it
// much later. An invite created inside that window is invisible to the
// guard, so unlike the test above, userGetter here returns no users at all
// (the read sees nothing), yet a pending row for the same email and org
// already exists by the time CreateUser runs, modelled with withExisting.
// GetOrCreateUser would have silently adopted that row and activated it;
// CreateUser has no adoption path, so the fake's conflict simulation (a
// stand-in for the partial unique index on (email, org_id) WHERE status !=
// 'deleted') must surface as an error instead, and no identity may be
// returned.
func TestGetIdentityFailsClosedWhenPendingInviteAppearsBetweenLookupAndCreate(t *testing.T) {
	orgID := valuer.GenerateUUID()
	email, err := valuer.NewEmail("alice@example.com")
	require.NoError(t, err)

	pending, err := types.NewUser("Alice", email, orgID, types.UserStatusPendingInvite)
	require.NoError(t, err)

	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{{Identifiable: types.Identifiable{ID: orgID}, Name: "default"}}}
	// The invite is absent here: the lookup this request performs runs before
	// the concurrent invite is created, so it sees nothing for this email.
	userGetter := &fakeUserGetter{}
	// But by the time CreateUser runs, the row already exists, exactly as it
	// would in the real store after the concurrent invite committed.
	userSetter := (&fakeUserSetter{}).withExisting(pending)

	p := newProvider(t, newConfig("X-Forwarded-Email", "", true), orgGetter, userGetter, userSetter)

	req := newTrustedRequest("X-Forwarded-Email", "alice@example.com")

	identity, err := p.GetIdentity(req)
	require.Error(t, err)
	assert.Nil(t, identity)
	assert.Empty(t, userSetter.createdUsers, "the race must fail closed instead of adopting the concurrently created invite")
}

// TestGetIdentityRejectsDeletedUser pins that a deleted user's email cannot
// authenticate. ListUsersByEmailAndOrgIDs (pkg/modules/user/impluser/store.go)
// applies no status filter at all, so the only thing keeping a deleted record
// out of the matched set is the in-provider ErrIfDeleted check; this test
// exists because nothing previously asserted that check directly, which is
// exactly why a prior edit could drop it unnoticed.
func TestGetIdentityRejectsDeletedUser(t *testing.T) {
	orgID := valuer.GenerateUUID()
	email, err := valuer.NewEmail("alice@example.com")
	require.NoError(t, err)

	deleted, err := types.NewUser("Alice", email, orgID, types.UserStatusDeleted)
	require.NoError(t, err)

	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{{Identifiable: types.Identifiable{ID: orgID}, Name: "default"}}}
	userGetter := &fakeUserGetter{users: []*types.User{deleted}}

	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), orgGetter, userGetter, &fakeUserSetter{})

	req := newTrustedRequest("X-Forwarded-Email", "alice@example.com")

	identity, err := p.GetIdentity(req)
	require.Error(t, err)
	assert.Nil(t, identity)
}

// TestGetIdentityAutoProvisionsFreshUserWhenOnlyMatchIsDeleted is the mirror
// of TestGetIdentityRejectsPendingInviteUserEvenWithAutoProvision: a deleted
// user is not "known but ineligible" the way root and pending are, so it is
// filtered out of the matched set without being counted, and provisioning
// must proceed. A deleted row sits outside the partial unique index on
// (email, org_id) WHERE status != 'deleted' (see
// pkg/sqlmigration/076_drop_user_deleted_at.go), so CreateUser's insert for
// this email and org never collides with it; a brand new user is created
// rather than the request being refused or the deleted row adopted.
func TestGetIdentityAutoProvisionsFreshUserWhenOnlyMatchIsDeleted(t *testing.T) {
	orgID := valuer.GenerateUUID()
	email, err := valuer.NewEmail("alice@example.com")
	require.NoError(t, err)

	deleted, err := types.NewUser("Alice", email, orgID, types.UserStatusDeleted)
	require.NoError(t, err)

	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{{Identifiable: types.Identifiable{ID: orgID}, Name: "default"}}}
	userGetter := &fakeUserGetter{users: []*types.User{deleted}}
	userSetter := &fakeUserSetter{}

	p := newProvider(t, newConfig("X-Forwarded-Email", "", true), orgGetter, userGetter, userSetter)

	req := newTrustedRequest("X-Forwarded-Email", "alice@example.com")

	identity, err := p.GetIdentity(req)
	require.NoError(t, err)
	require.NotNil(t, identity)
	assert.NotEqual(t, deleted.ID, identity.UserID)
	assert.Len(t, userSetter.createdUsers, 1, "a fresh user should be created rather than the deleted record being adopted")
}

// TestGetIdentityRejectsMixedDeletedAndPendingUsersForSameEmailAndOrg pins a
// combination the partial unique index on (email, org_id) WHERE status !=
// 'deleted' explicitly permits: a deleted row and a pending row can coexist
// for the same email and org, since only the pending row occupies the live
// slot the index protects. ListUsersByEmailAndOrgIDs returns both;
// ErrIfDeleted drops the deleted one uncounted, and the pending one is
// dropped by the root/pending pass and counted as ineligible, so the request
// must still be refused with user_not_eligible and nothing created,
// regardless of AutoProvision.
func TestGetIdentityRejectsMixedDeletedAndPendingUsersForSameEmailAndOrg(t *testing.T) {
	for _, autoProvision := range []bool{false, true} {
		t.Run(fmt.Sprintf("autoProvision=%v", autoProvision), func(t *testing.T) {
			orgID := valuer.GenerateUUID()
			email, err := valuer.NewEmail("alice@example.com")
			require.NoError(t, err)

			deleted, err := types.NewUser("Alice", email, orgID, types.UserStatusDeleted)
			require.NoError(t, err)
			pending, err := types.NewUser("Alice", email, orgID, types.UserStatusPendingInvite)
			require.NoError(t, err)

			orgGetter := &fakeOrgGetter{orgs: []*types.Organization{{Identifiable: types.Identifiable{ID: orgID}, Name: "default"}}}
			userGetter := &fakeUserGetter{users: []*types.User{deleted, pending}}
			userSetter := &fakeUserSetter{}

			p := newProvider(t, newConfig("X-Forwarded-Email", "", autoProvision), orgGetter, userGetter, userSetter)

			req := newTrustedRequest("X-Forwarded-Email", "alice@example.com")

			identity, err := p.GetIdentity(req)
			require.Error(t, err)
			assert.Nil(t, identity)
			assert.True(t, errors.Asc(err, ErrCodeTrustedHeaderUserNotEligible))
			assert.Empty(t, userSetter.createdUsers, "no user should be created for a mixed deleted/pending pair")
		})
	}
}

// Header.Get returns only the first value. A proxy that appends rather than
// replaces leaves the client's value ahead of the injected one, so the client
// would choose the identity. Both emails below belong to real active users in
// the same organization, so without the exactly-one rule this request resolves
// successfully as the attacker.
func TestGetIdentityRejectsDuplicateEmailHeaderValues(t *testing.T) {
	orgID := valuer.GenerateUUID()

	aliceEmail, err := valuer.NewEmail("alice@example.com")
	require.NoError(t, err)
	alice, err := types.NewUser("Alice", aliceEmail, orgID, types.UserStatusActive)
	require.NoError(t, err)

	attackerEmail, err := valuer.NewEmail("attacker@evil.example")
	require.NoError(t, err)
	attacker, err := types.NewUser("Attacker", attackerEmail, orgID, types.UserStatusActive)
	require.NoError(t, err)

	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{{Identifiable: types.Identifiable{ID: orgID}, Name: "default"}}}
	userGetter := &fakeUserGetter{users: []*types.User{alice, attacker}}

	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), orgGetter, userGetter, &fakeUserSetter{})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set(testSecretHeader, testSecretValue)
	req.Header.Add("X-Forwarded-Email", "attacker@evil.example")
	req.Header.Add("X-Forwarded-Email", "alice@example.com")

	identity, err := p.GetIdentity(req)
	require.Error(t, err)
	assert.Nil(t, identity)
	assert.True(t, errors.Asc(err, ErrCodeTrustedHeaderAmbiguousHeader))
}

// When the first configured email header is entirely absent from the
// request, the resolver falls through to the next configured header.
func TestGetIdentityFallsThroughToSecondEmailHeaderWhenFirstAbsent(t *testing.T) {
	orgID := valuer.GenerateUUID()
	email, err := valuer.NewEmail("alice@example.com")
	require.NoError(t, err)

	alice, err := types.NewUser("Alice", email, orgID, types.UserStatusActive)
	require.NoError(t, err)

	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{{Identifiable: types.Identifiable{ID: orgID}, Name: "default"}}}
	userGetter := &fakeUserGetter{users: []*types.User{alice}}

	cfg := newConfigWithHeaders([]string{"X-Forwarded-Email", "X-Authentik-Email"}, nil, false)
	p := newProvider(t, cfg, orgGetter, userGetter, &fakeUserSetter{})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set(testSecretHeader, testSecretValue)
	req.Header.Set("X-Authentik-Email", "alice@example.com")

	identity, err := p.GetIdentity(req)
	require.NoError(t, err)
	require.NotNil(t, identity)
	assert.Equal(t, alice.ID, identity.UserID)
}

// A configured email header that is present but blank is a proxy that failed
// to authenticate the caller, not a signal to try a less authoritative
// header. This must be refused rather than falling through to
// X-Authentik-Email, even though that header carries a real, active user's
// email in this test.
func TestGetIdentityRejectsBlankFirstEmailHeaderInsteadOfFallingThrough(t *testing.T) {
	orgID := valuer.GenerateUUID()
	email, err := valuer.NewEmail("alice@example.com")
	require.NoError(t, err)

	alice, err := types.NewUser("Alice", email, orgID, types.UserStatusActive)
	require.NoError(t, err)

	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{{Identifiable: types.Identifiable{ID: orgID}, Name: "default"}}}
	userGetter := &fakeUserGetter{users: []*types.User{alice}}

	cfg := newConfigWithHeaders([]string{"X-Forwarded-Email", "X-Authentik-Email"}, nil, false)
	p := newProvider(t, cfg, orgGetter, userGetter, &fakeUserSetter{})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set(testSecretHeader, testSecretValue)
	req.Header.Set("X-Forwarded-Email", "   ")
	req.Header.Set("X-Authentik-Email", "alice@example.com")

	identity, err := p.GetIdentity(req)
	require.Error(t, err)
	assert.Nil(t, identity)
	assert.True(t, errors.Asc(err, ErrCodeTrustedHeaderBlankHeader))
}

// When the first configured email header carries two values, the request is
// refused before the second configured header is ever consulted.
func TestGetIdentityRejectsDuplicateFirstEmailHeaderWithoutConsultingSecond(t *testing.T) {
	orgID := valuer.GenerateUUID()
	email, err := valuer.NewEmail("alice@example.com")
	require.NoError(t, err)

	alice, err := types.NewUser("Alice", email, orgID, types.UserStatusActive)
	require.NoError(t, err)

	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{{Identifiable: types.Identifiable{ID: orgID}, Name: "default"}}}
	userGetter := &fakeUserGetter{users: []*types.User{alice}}

	cfg := newConfigWithHeaders([]string{"X-Forwarded-Email", "X-Authentik-Email"}, nil, false)
	p := newProvider(t, cfg, orgGetter, userGetter, &fakeUserSetter{})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set(testSecretHeader, testSecretValue)
	req.Header.Add("X-Forwarded-Email", "attacker@evil.example")
	req.Header.Add("X-Forwarded-Email", "alice@example.com")
	req.Header.Set("X-Authentik-Email", "alice@example.com")

	identity, err := p.GetIdentity(req)
	require.Error(t, err)
	assert.Nil(t, identity)
	assert.True(t, errors.Asc(err, ErrCodeTrustedHeaderAmbiguousHeader))
}

// A name header carrying more than one value is ignored rather than fatal,
// so provisioning falls back to the email local part for the display name.
func TestGetIdentityAutoProvisionUsesEmailLocalPartWhenNameHeaderHasMultipleValues(t *testing.T) {
	orgID := valuer.GenerateUUID()
	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{{Identifiable: types.Identifiable{ID: orgID}, Name: "default"}}}
	userSetter := &fakeUserSetter{}

	cfg := newConfigWithHeaders([]string{"X-Forwarded-Email"}, []string{"X-Forwarded-User"}, true)
	p := newProvider(t, cfg, orgGetter, &fakeUserGetter{}, userSetter)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set(testSecretHeader, testSecretValue)
	req.Header.Set("X-Forwarded-Email", "newcomer@example.com")
	req.Header.Add("X-Forwarded-User", "Newcomer Bob")
	req.Header.Add("X-Forwarded-User", "Someone Else")

	identity, err := p.GetIdentity(req)
	require.NoError(t, err)
	require.NotNil(t, identity)

	require.Len(t, userSetter.createdUsers, 1)
	assert.Equal(t, "newcomer", userSetter.createdUsers[0].DisplayName)
}

func TestGetIdentityErrorsWhenEmailMatchesUsersInTwoOrgs(t *testing.T) {
	orgA, orgB := valuer.GenerateUUID(), valuer.GenerateUUID()
	email, err := valuer.NewEmail("alice@example.com")
	require.NoError(t, err)

	userA, err := types.NewUser("Alice", email, orgA, types.UserStatusActive)
	require.NoError(t, err)
	userB, err := types.NewUser("Alice", email, orgB, types.UserStatusActive)
	require.NoError(t, err)

	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{
		{Identifiable: types.Identifiable{ID: orgA}, Name: "a"},
		{Identifiable: types.Identifiable{ID: orgB}, Name: "b"},
	}}
	userGetter := &fakeUserGetter{users: []*types.User{userA, userB}}

	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), orgGetter, userGetter, &fakeUserSetter{})

	req := newTrustedRequest("X-Forwarded-Email", "alice@example.com")

	identity, err := p.GetIdentity(req)
	require.Error(t, err)
	assert.Nil(t, identity)
	assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
}

// TestJWTModeTestTrueButGetIdentityFailsOnGarbageAssertion pins a deliberate
// asymmetry that is specific to jwt mode: Check (and therefore Test) only
// counts assertion headers, since Test must stay free of I/O, so a request
// carrying a garbage assertion still makes Test report true. The real
// verification happens in Email, called only from GetIdentity, which must
// then fail. That sequence is correct and must not be "fixed" by moving
// signature verification into Check or Test.
func TestJWTModeTestTrueButGetIdentityFailsOnGarbageAssertion(t *testing.T) {
	_, jwksURL, _ := newJWKSFixture(t)

	cfg := identn.Config{
		TrustedHeader: identn.TrustedHeaderConfig{
			Enabled: true,
			Trust: identn.TrustConfig{
				Mode: identn.TrustModeJWT,
				JWT: identn.JWTTrustConfig{
					AssertionHeader: "Teleport-Jwt-Assertion",
					JWKSURL:         jwksURL,
					Issuer:          "https://teleport.example",
					Audience:        "signoz",
					IdentityClaim:   "sub",
				},
			},
		},
	}

	p := newProvider(t, cfg, &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Teleport-Jwt-Assertion", "garbage")

	assert.True(t, p.Test(req))

	identity, err := p.GetIdentity(req)
	assert.Error(t, err)
	assert.Nil(t, identity)
}

// TestJWTModeIgnoresEmailHeadersEvenWhenRootMatches pins the defining
// property of jwt mode: GetIdentity takes the identity only from the
// verified assertion (trust.Email), and never consults EmailHeaders, even
// when a client-supplied header on the very same request would resolve to a
// different, more privileged user. Both alice (matching the assertion) and
// root (matching the header) exist in the store, so if GetIdentity ever
// preferred the header, this test would not silently pass as root (root is
// filtered out of eligible users), but it would still fail, since
// auto-provisioning is disabled and no non-root user would remain: the FIX 3
// experiment in the task report demonstrates exactly that failure mode.
func TestJWTModeIgnoresEmailHeadersEvenWhenRootMatches(t *testing.T) {
	key, jwksURL, kid := newJWKSFixture(t)

	orgID := valuer.GenerateUUID()

	aliceEmail, err := valuer.NewEmail("alice@example.com")
	require.NoError(t, err)
	alice, err := types.NewUser("Alice", aliceEmail, orgID, types.UserStatusActive)
	require.NoError(t, err)

	rootEmail, err := valuer.NewEmail("root@example.com")
	require.NoError(t, err)
	rootUser, err := types.NewRootUser("Root", rootEmail, orgID)
	require.NoError(t, err)

	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{{Identifiable: types.Identifiable{ID: orgID}, Name: "default"}}}
	userGetter := &fakeUserGetter{users: []*types.User{alice, rootUser}}

	cfg := identn.Config{
		TrustedHeader: identn.TrustedHeaderConfig{
			Enabled:      true,
			EmailHeaders: []string{"X-Forwarded-Email"},
			Trust: identn.TrustConfig{
				Mode: identn.TrustModeJWT,
				JWT: identn.JWTTrustConfig{
					AssertionHeader: "Teleport-Jwt-Assertion",
					JWKSURL:         jwksURL,
					Issuer:          "https://teleport.example",
					Audience:        "signoz",
					IdentityClaim:   "sub",
				},
			},
		},
	}

	p := newProvider(t, cfg, orgGetter, userGetter, &fakeUserSetter{})

	assertion := signAssertion(t, key, kid, jwt.MapClaims{
		"iss": "https://teleport.example",
		"aud": "signoz",
		"sub": "alice@example.com",
		"exp": time.Now().Add(time.Minute).Unix(),
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Teleport-Jwt-Assertion", assertion)
	req.Header.Set("X-Forwarded-Email", "root@example.com")

	identity, err := p.GetIdentity(req)
	require.NoError(t, err)
	require.NotNil(t, identity)
	assert.Equal(t, alice.ID, identity.UserID)
	assert.NotEqual(t, rootUser.ID, identity.UserID)
}
