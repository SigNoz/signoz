package trustedheaderidentn

import (
	"context"
	"net/http"
	"slices"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/factory"
	"github.com/SigNoz/signoz/pkg/identn"
	"github.com/SigNoz/signoz/pkg/modules/organization"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

var (
	ErrCodeTrustedHeaderEmailMissing = errors.MustNewCode("trusted_header_email_missing")
	ErrCodeTrustedHeaderUserNotFound = errors.MustNewCode("trusted_header_user_not_found")
	ErrCodeTrustedHeaderNoOrg        = errors.MustNewCode("trusted_header_no_org")
)

type provider struct {
	config     identn.Config
	settings   factory.ScopedProviderSettings
	orgGetter  organization.Getter
	userGetter user.Getter
	userSetter user.Setter
}

func NewFactory(orgGetter organization.Getter, userGetter user.Getter, userSetter user.Setter) factory.ProviderFactory[identn.IdentN, identn.Config] {
	return factory.NewProviderFactory(
		factory.MustNewName(authtypes.IdentNProviderTrustedHeader.StringValue()),
		func(ctx context.Context, providerSettings factory.ProviderSettings, config identn.Config) (identn.IdentN, error) {
			return New(ctx, providerSettings, config, orgGetter, userGetter, userSetter)
		},
	)
}

func New(ctx context.Context, providerSettings factory.ProviderSettings, config identn.Config, orgGetter organization.Getter, userGetter user.Getter, userSetter user.Setter) (identn.IdentN, error) {
	settings := factory.NewScopedProviderSettings(providerSettings, "github.com/SigNoz/signoz/pkg/identn/trustedheaderidentn")

	settings.Logger().WarnContext(ctx,
		"trusted-header identity provider is enabled; SigNoz must be deployed behind a reverse proxy that strips client-supplied identity headers, otherwise any client can forge identity",
	)

	return &provider{
		config:     config,
		settings:   settings,
		orgGetter:  orgGetter,
		userGetter: userGetter,
		userSetter: userSetter,
	}, nil
}

func (provider *provider) Name() authtypes.IdentNProvider {
	return authtypes.IdentNProviderTrustedHeader
}

// Test returns true when the configured email header is present on the request.
// Test is intentionally cheap (header presence) — full email validation and the
// user lookup happen in GetIdentity.
func (provider *provider) Test(req *http.Request) bool {
	return provider.extractEmail(req) != ""
}

// GetIdentity resolves the request to an authenticated identity using only
// trusted headers injected by the upstream reverse proxy. The request is
// expected to have already been authenticated by the proxy; SigNoz simply
// trusts the headers.
func (provider *provider) GetIdentity(req *http.Request) (*authtypes.Identity, error) {
	ctx := req.Context()

	rawEmail := provider.extractEmail(req)
	if rawEmail == "" {
		return nil, errors.New(errors.TypeUnauthenticated, ErrCodeTrustedHeaderEmailMissing, "trusted-header IdentN expected an email header but none was present")
	}

	email, err := valuer.NewEmail(rawEmail)
	if err != nil {
		return nil, err
	}

	orgs, err := provider.orgGetter.ListByOwnedKeyRange(ctx)
	if err != nil {
		return nil, err
	}

	if len(orgs) == 0 {
		return nil, errors.New(errors.TypeNotFound, ErrCodeTrustedHeaderNoOrg, "trusted-header IdentN cannot resolve identity because no organization exists")
	}

	orgIDs := make([]valuer.UUID, 0, len(orgs))
	for _, org := range orgs {
		orgIDs = append(orgIDs, org.ID)
	}

	users, err := provider.userGetter.ListUsersByEmailAndOrgIDs(ctx, email, orgIDs)
	if err != nil {
		return nil, err
	}

	// Drop ineligible users — deleted ones (soft-deleted accounts) and root users.
	// Root users are filtered (not hard-failed on first encounter) because
	// ListUsersByEmailAndOrgIDs has no guaranteed ordering: in a multi-org
	// installation where the same email exists in multiple orgs, hard-failing
	// on `users[0]` being root would non-deterministically block a valid
	// non-root user that happens to come later in the slice.
	//
	// Root users are deliberately not authenticatable via trusted headers
	// (matches the SAML/OIDC posture) — treating them as "not a match" here
	// keeps the resolver consistent.
	users = slices.DeleteFunc(users, func(u *types.User) bool {
		return u.ErrIfDeleted() != nil || u.ErrIfRoot() != nil
	})

	if len(users) > 0 {
		// Pick the first remaining match. Multi-org installations should pin
		// the user to a specific org via the proxy or a separate header in a
		// future enhancement.
		matched := users[0]

		return authtypes.NewPrincipalUserIdentity(
			matched.ID,
			matched.OrgID,
			matched.Email,
			authtypes.IdentNProviderTrustedHeader,
		), nil
	}

	if !provider.config.TrustedHeader.AutoProvision {
		return nil, errors.Newf(errors.TypeUnauthenticated, ErrCodeTrustedHeaderUserNotFound, "no user found for email %q and auto-provisioning is disabled", email.StringValue())
	}

	// Auto-provision: create the user with Viewer role in the (only) org.
	// We refuse to guess when multiple orgs exist — operators must disable
	// AutoProvision or pin a single org.
	if len(orgs) > 1 {
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeTrustedHeaderNoOrg, "trusted-header auto-provisioning is not supported with multiple organizations (found %d)", len(orgs))
	}

	orgID := orgs[0].ID
	displayName := provider.extractDisplayName(req, email)

	newUser, err := types.NewUser(displayName, email, orgID, types.UserStatusActive)
	if err != nil {
		return nil, err
	}

	createdUser, err := provider.userSetter.GetOrCreateUser(ctx, newUser, user.WithRoleNames([]string{authtypes.SigNozViewerRoleName}))
	if err != nil {
		return nil, err
	}

	return authtypes.NewPrincipalUserIdentity(
		createdUser.ID,
		createdUser.OrgID,
		createdUser.Email,
		authtypes.IdentNProviderTrustedHeader,
	), nil
}

// extractEmail reads the configured email header and trims whitespace.
func (provider *provider) extractEmail(req *http.Request) string {
	return strings.TrimSpace(req.Header.Get(provider.config.TrustedHeader.EmailHeader))
}

// extractDisplayName falls back through:
//
//  1. The configured NameHeader (when set and non-empty)
//  2. The local-part of the email address
func (provider *provider) extractDisplayName(req *http.Request, email valuer.Email) string {
	if provider.config.TrustedHeader.NameHeader != "" {
		if name := strings.TrimSpace(req.Header.Get(provider.config.TrustedHeader.NameHeader)); name != "" {
			return name
		}
	}

	if at := strings.IndexByte(email.StringValue(), '@'); at > 0 {
		return email.StringValue()[:at]
	}

	return email.StringValue()
}
