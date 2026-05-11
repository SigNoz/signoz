package trustedheaderidentn

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

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
	return nil, nil
}

func (f *fakeUserGetter) GetFactorPasswordByUserID(context.Context, valuer.UUID) (*types.FactorPassword, error) {
	return nil, nil
}

func (f *fakeUserGetter) GetResetPasswordTokenByOrgIDAndUserID(context.Context, valuer.UUID, valuer.UUID) (*types.ResetPasswordToken, error) {
	return nil, nil
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

func (f *fakeUserGetter) OnBeforeRoleDelete(context.Context, valuer.UUID, valuer.UUID) error {
	return nil
}

var _ user.Getter = (*fakeUserGetter)(nil)

// fakeUserSetter records the last user passed to GetOrCreateUser.
//
// Most methods are stubs returning nil/zero — they exist purely to satisfy the
// user.Setter interface. Only GetOrCreateUser is exercised by these tests.
type fakeUserSetter struct {
	createdUsers []*types.User
	autoFail     bool
}

func (f *fakeUserSetter) CreateFirstUser(context.Context, *types.Organization, string, valuer.Email, string) (*types.User, error) {
	return nil, nil
}

func (f *fakeUserSetter) CreateUser(_ context.Context, u *types.User, _ ...user.CreateUserOption) error {
	if f.autoFail {
		return errors.New(errors.TypeInternal, errors.CodeInternal, "create user failed")
	}
	f.createdUsers = append(f.createdUsers, u)
	return nil
}

func (f *fakeUserSetter) GetOrCreateUser(_ context.Context, u *types.User, _ ...user.CreateUserOption) (*types.User, error) {
	if f.autoFail {
		return nil, errors.New(errors.TypeInternal, errors.CodeInternal, "get or create user failed")
	}
	f.createdUsers = append(f.createdUsers, u)
	return u, nil
}

func (f *fakeUserSetter) GetOrCreateResetPasswordToken(context.Context, valuer.UUID) (*types.ResetPasswordToken, error) {
	return nil, nil
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
	return nil, nil
}

func (f *fakeUserSetter) UpdateUser(context.Context, valuer.UUID, valuer.UUID, *types.UpdatableUser) (*types.User, error) {
	return nil, nil
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

func (f *fakeUserSetter) AddUserRole(context.Context, valuer.UUID, valuer.UUID, string) error {
	return nil
}

func (f *fakeUserSetter) RemoveUserRole(context.Context, valuer.UUID, valuer.UUID, valuer.UUID) error {
	return nil
}

func (f *fakeUserSetter) Collect(context.Context, valuer.UUID) (map[string]any, error) {
	return nil, nil
}

var _ user.Setter = (*fakeUserSetter)(nil)

func newConfig(emailHeader, nameHeader string, autoProvision bool) identn.Config {
	return identn.Config{
		TrustedHeader: identn.TrustedHeaderConfig{
			Enabled:       true,
			EmailHeader:   emailHeader,
			NameHeader:    nameHeader,
			AutoProvision: autoProvision,
		},
	}
}

func newProvider(t *testing.T, cfg identn.Config, orgGetter organization.Getter, userGetter user.Getter, userSetter user.Setter) identn.IdentN {
	t.Helper()

	p, err := New(context.Background(), instrumentationtest.New().ToProviderSettings(), cfg, orgGetter, userGetter, userSetter)
	require.NoError(t, err)

	return p
}

func TestProviderName(t *testing.T) {
	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	assert.Equal(t, authtypes.IdentNProviderTrustedHeader, p.Name())
}

func TestTestReturnsTrueWhenHeaderPresent(t *testing.T) {
	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Forwarded-Email", "alice@example.com")

	assert.True(t, p.Test(req))
}

func TestTestReturnsFalseWhenHeaderMissing(t *testing.T) {
	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	req := httptest.NewRequest(http.MethodGet, "/", nil)

	assert.False(t, p.Test(req))
}

func TestTestReturnsFalseWhenHeaderBlank(t *testing.T) {
	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
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

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Forwarded-Email", "alice@example.com")

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

func TestGetIdentityErrorsWhenHeaderMissing(t *testing.T) {
	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	req := httptest.NewRequest(http.MethodGet, "/", nil)

	identity, err := p.GetIdentity(req)
	require.Error(t, err)
	assert.Nil(t, identity)
	assert.True(t, errors.Ast(err, errors.TypeUnauthenticated), "expected unauthenticated error type")
}

func TestGetIdentityErrorsWhenEmailInvalid(t *testing.T) {
	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Forwarded-Email", "not-an-email")

	identity, err := p.GetIdentity(req)
	require.Error(t, err)
	assert.Nil(t, identity)
}

func TestGetIdentityErrorsWhenUserUnknownAndAutoProvisionDisabled(t *testing.T) {
	orgID := valuer.GenerateUUID()
	orgGetter := &fakeOrgGetter{orgs: []*types.Organization{{Identifiable: types.Identifiable{ID: orgID}, Name: "default"}}}

	p := newProvider(t, newConfig("X-Forwarded-Email", "", false), orgGetter, &fakeUserGetter{}, &fakeUserSetter{})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Forwarded-Email", "ghost@example.com")

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

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Forwarded-Email", "newcomer@example.com")
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

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Forwarded-Email", "carol@example.com")

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

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Forwarded-Email", "newcomer@example.com")

	identity, err := p.GetIdentity(req)
	require.Error(t, err)
	assert.Nil(t, identity)
}

func TestGetIdentityErrorsWhenNoOrganization(t *testing.T) {
	p := newProvider(t, newConfig("X-Forwarded-Email", "", true), &fakeOrgGetter{}, &fakeUserGetter{}, &fakeUserSetter{})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Forwarded-Email", "alice@example.com")

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

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Forwarded-Email", "root@example.com")

	identity, err := p.GetIdentity(req)
	require.Error(t, err)
	assert.Nil(t, identity)
}

// Multi-org case: when ListUsersByEmailAndOrgIDs returns both a root user
// and a regular user for the same email, the resolver must skip the root
// and pick the non-root regardless of slice order — DB query order is not
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

		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("X-Forwarded-Email", "shared@example.com")

		identity, err := p.GetIdentity(req)
		require.NoError(t, err)
		require.NotNil(t, identity)
		assert.Equal(t, regularUser.ID, identity.UserID)
		assert.Equal(t, regularOrgID, identity.OrgID)
	}
}
