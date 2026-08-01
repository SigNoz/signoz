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
	ErrCodeTrustedHeaderEmailMissing    = errors.MustNewCode("trusted_header_email_missing")
	ErrCodeTrustedHeaderUserNotFound    = errors.MustNewCode("trusted_header_user_not_found")
	ErrCodeTrustedHeaderNoOrg           = errors.MustNewCode("trusted_header_no_org")
	ErrCodeTrustedHeaderMultipleOrgs    = errors.MustNewCode("trusted_header_multiple_orgs")
	ErrCodeTrustedHeaderAmbiguousUser   = errors.MustNewCode("trusted_header_ambiguous_user")
	ErrCodeTrustedHeaderAmbiguousHeader = errors.MustNewCode("trusted_header_ambiguous_header")
	ErrCodeTrustedHeaderBlankHeader     = errors.MustNewCode("trusted_header_blank_header")
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

// Test reports whether this provider should handle the request. It performs no
// I/O and does not mutate the request.
//
// There is deliberately no check for bearer-token or API-key headers here. The
// resolver registers this provider after the tokenizer and apikey resolvers and
// returns the first whose Test passes, and their Test bodies read the same
// configured header lists, so a request carrying either credential never
// reaches this provider. Duplicating the check here would be unreachable when
// those resolvers are enabled, and harmful when they are not, because the
// header lists stay populated in config even when the resolver is off.
func (provider *provider) Test(req *http.Request) bool {
	email, err := provider.extractEmail(req)
	return err == nil && email != ""
}

// GetIdentity resolves the request to an authenticated identity using only
// trusted headers injected by the upstream reverse proxy. The request is
// expected to have already been authenticated by the proxy; SigNoz simply
// trusts the headers.
func (provider *provider) GetIdentity(req *http.Request) (*authtypes.Identity, error) {
	ctx := req.Context()

	rawEmail, err := provider.extractEmail(req)
	if err != nil {
		return nil, err
	}

	if rawEmail == "" {
		return nil, errors.New(errors.TypeUnauthenticated, ErrCodeTrustedHeaderEmailMissing, "expected an email header but none was present")
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

	// Deleted, root and pending-invite users are not authenticatable through a
	// trusted header. Root can only authenticate by password. A pending invite
	// has not proved control of the mailbox, and GetOrCreateUser would activate
	// it as a side effect while resetting the role an admin chose.
	users = slices.DeleteFunc(users, func(u *types.User) bool {
		return u.ErrIfDeleted() != nil || u.ErrIfRoot() != nil || u.ErrIfPending() != nil
	})

	if len(users) > 1 {
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeTrustedHeaderAmbiguousUser, "email resolves to %d eligible users across owned organizations", len(users)).
			WithAdditional("the unique index on users is (email, org_id), so an email can exist in more than one organization; pin the organization instead of relying on lookup order")
	}

	if len(users) == 1 {
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
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeTrustedHeaderMultipleOrgs, "auto-provisioning is not supported with multiple organizations (found %d)", len(orgs))
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

	// GetOrCreateUser returns any pre-existing non-deleted record for this email
	// and org, including root, in which case the Viewer role option above is
	// never applied. implsession does the same check after provisioning an SSO
	// user.
	if err := createdUser.ErrIfRoot(); err != nil {
		return nil, errors.WithAdditionalf(err, "root user can only authenticate via password")
	}

	return authtypes.NewPrincipalUserIdentity(
		createdUser.ID,
		createdUser.OrgID,
		createdUser.Email,
		authtypes.IdentNProviderTrustedHeader,
	), nil
}

// extractEmail reads the first configured email header that is present on the
// request. A header carrying more than one value is refused: Header.Get would
// return only the first, so a proxy that appends rather than replaces would
// let a client-supplied value win. A header that is present but blank is also
// refused rather than skipped: a blank identity header means the proxy failed
// to authenticate the caller, and falling through to a later, less
// authoritative header would let an attacker supply that one instead. Only a
// header that is entirely absent falls through to the next configured header.
func (provider *provider) extractEmail(req *http.Request) (string, error) {
	for _, header := range provider.config.TrustedHeader.EmailHeaders {
		values := req.Header.Values(header)
		if len(values) == 0 {
			continue
		}

		if len(values) > 1 {
			return "", errors.Newf(errors.TypeUnauthenticated, ErrCodeTrustedHeaderAmbiguousHeader, "header carries %d values, expected exactly one", len(values)).
				WithAdditional(header)
		}

		value := strings.TrimSpace(values[0])
		if value == "" {
			return "", errors.Newf(errors.TypeUnauthenticated, ErrCodeTrustedHeaderBlankHeader, "header is present but carries no value").
				WithAdditional(header)
		}

		return value, nil
	}

	return "", nil
}

// extractDisplayName falls back through the configured name headers and then the
// local part of the email. A name header with several values is ignored rather
// than fatal: it decides only a display string.
func (provider *provider) extractDisplayName(req *http.Request, email valuer.Email) string {
	for _, header := range provider.config.TrustedHeader.NameHeaders {
		values := req.Header.Values(header)
		if len(values) != 1 {
			continue
		}

		if name := strings.TrimSpace(values[0]); name != "" {
			return name
		}
	}

	if at := strings.IndexByte(email.StringValue(), '@'); at > 0 {
		return email.StringValue()[:at]
	}

	return email.StringValue()
}
