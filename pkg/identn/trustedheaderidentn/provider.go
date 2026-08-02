package trustedheaderidentn

import (
	"context"
	"net"
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
	ErrCodeTrustedHeaderUnsupportedMode = errors.MustNewCode("trusted_header_unsupported_trust_mode")
	ErrCodeTrustedHeaderUserNotEligible = errors.MustNewCode("trusted_header_user_not_eligible")
)

type provider struct {
	config         identn.Config
	settings       factory.ScopedProviderSettings
	orgGetter      organization.Getter
	userGetter     user.Getter
	userSetter     user.Setter
	trust          trust
	trustedProxies []*net.IPNet
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

	if config.TrustedHeader.Trust.Mode == identn.TrustModeSecret {
		settings.Logger().WarnContext(ctx,
			"trusted-header identity provider is enabled in secret mode; the proxy secret is only as private as the pod that holds it, and any peer that learns it can assert any identity",
		)
	}

	var checker trust
	switch config.TrustedHeader.Trust.Mode {
	case identn.TrustModeSecret:
		checker = newSecretTrust(config.TrustedHeader.Trust.Secret)
	case identn.TrustModeJWT:
		checker = newJWTTrust(ctx, config.TrustedHeader.Trust.JWT)
	default:
		return nil, errors.Newf(errors.TypeInvalidInput, ErrCodeTrustedHeaderUnsupportedMode, "identn::trusted_header::trust::mode %q is not supported", config.TrustedHeader.Trust.Mode.StringValue())
	}

	// Parsed once here, rather than per request, since config validation
	// already guarantees every entry parses as a CIDR.
	trustedProxies := make([]*net.IPNet, 0, len(config.TrustedHeader.TrustedProxies))
	for _, cidr := range config.TrustedHeader.TrustedProxies {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			return nil, err
		}
		trustedProxies = append(trustedProxies, network)
	}

	return &provider{
		config:         config,
		settings:       settings,
		orgGetter:      orgGetter,
		userGetter:     userGetter,
		userSetter:     userSetter,
		trust:          checker,
		trustedProxies: trustedProxies,
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
//
// Provenance is established first: the peer address must be allowed, and then
// the configured trust check (a proxy secret today; a verified JWT assertion
// in a later change) must pass. Only once the request is trusted does this
// look at identity at all.
func (provider *provider) Test(req *http.Request) bool {
	if !provider.peerAllowed(req) {
		return false
	}

	if err := provider.trust.Check(req); err != nil {
		return false
	}

	// When the proof carries the identity, Check having passed is enough to claim
	// the request. Verifying the assertion itself would mean network I/O, which
	// this method must not do; that happens in GetIdentity.
	if provider.trust.CarriesIdentity() {
		return true
	}

	email, err := provider.extractEmail(req)
	return err == nil && email != ""
}

// peerAllowed matches the immediate TCP peer against the configured CIDRs. It
// deliberately ignores X-Forwarded-For, which a client controls.
func (provider *provider) peerAllowed(req *http.Request) bool {
	if len(provider.trustedProxies) == 0 {
		return true
	}

	host, _, err := net.SplitHostPort(req.RemoteAddr)
	if err != nil {
		host = req.RemoteAddr
	}

	addr := net.ParseIP(host)
	if addr == nil {
		return false
	}

	for _, network := range provider.trustedProxies {
		if network.Contains(addr) {
			return true
		}
	}

	return false
}

// GetIdentity resolves the request to an authenticated identity using only
// trusted headers injected by the upstream reverse proxy. The request is
// expected to have already been authenticated by the proxy; SigNoz simply
// trusts the headers.
func (provider *provider) GetIdentity(req *http.Request) (*authtypes.Identity, error) {
	ctx := req.Context()

	// GetIdentity is reached only after the resolver's Test has already called
	// Check, but that is a property of how the resolver is wired today, not a
	// contract Test or GetIdentity enforce on each other. Test is a
	// provider-selection predicate on an exported interface, not an
	// authorization boundary, so provenance is verified again here rather than
	// relying on caller discipline.
	if err := provider.trust.Check(req); err != nil {
		return nil, err
	}

	var rawEmail string
	var err error
	if provider.trust.CarriesIdentity() {
		rawEmail, err = provider.trust.Email(req)
		if err != nil {
			return nil, err
		}
	} else {
		rawEmail, err = provider.extractEmail(req)
		if err != nil {
			return nil, err
		}
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

	// Deleted users are gone: the email is free to re-provision as a brand
	// new user. The live constraint on users (see
	// pkg/sqlmigration/076_drop_user_deleted_at.go, which superseded an
	// earlier (org_id, email, deleted_at) index from
	// pkg/sqlmigration/067_add_status_user.go) is a partial unique index on
	// (email, org_id) WHERE status != 'deleted', so a soft-deleted row sits
	// outside that constraint entirely and a freshly created active row for
	// the same email and org never collides with it. GetOrCreateUser's own
	// lookup (GetNonDeletedUserByEmailAndOrgID) also excludes deleted rows, so
	// it cannot adopt one either; a plain CreateUser follows and succeeds.
	// Filtering deleted users here is purely to keep them out of the
	// ambiguous/matched counting below; it does not, by itself, need to block
	// provisioning.
	users = slices.DeleteFunc(users, func(u *types.User) bool {
		return u.ErrIfDeleted() != nil
	})

	// Root and pending-invite users are not authenticatable through a trusted
	// header: root can only authenticate by password, and a pending invite
	// has not proved control of the mailbox. Unlike a deleted user, they still
	// occupy the live (org_id, email, deleted_at=zero) slot, so if control
	// reached the auto-provisioning branch below, GetOrCreateUser would find
	// and silently adopt one of these records instead of creating a new one:
	// for a pending invite that means activatePendingUser flips it active and
	// re-grants only Viewer, discarding whatever role an admin chose; for
	// root it would go on to mint an admin-privileged identity. ineligible
	// counts how many such records were filtered, so that case can be told
	// apart from "no user found at all" below.
	ineligible := 0
	users = slices.DeleteFunc(users, func(u *types.User) bool {
		if u.ErrIfRoot() != nil || u.ErrIfPending() != nil {
			ineligible++
			return true
		}
		return false
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

	// The address is already known but not eligible (root or pending). Refuse
	// outright rather than falling through to auto-provisioning, which would
	// otherwise read as "nobody here, safe to create" and let GetOrCreateUser
	// adopt the existing record. This applies regardless of AutoProvision:
	// with it off, "no user found" would also have been misleading, since a
	// user does exist for this email.
	if ineligible > 0 {
		return nil, errors.Newf(errors.TypeUnauthenticated, ErrCodeTrustedHeaderUserNotEligible, "email %q matches an existing user that cannot authenticate through a trusted header", email.StringValue()).
			WithAdditional("the user is root or has a pending invite; auto-provisioning is refused because GetOrCreateUser would otherwise adopt that record instead of creating a new one")
	}

	if !provider.config.TrustedHeader.AutoProvision {
		return nil, errors.Newf(errors.TypeUnauthenticated, ErrCodeTrustedHeaderUserNotFound, "no user found for email %q and auto-provisioning is disabled", email.StringValue())
	}

	// Auto-provision: create the user with Viewer role in the (only) org.
	// We refuse to guess when multiple orgs exist, operators must disable
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

	// CreateUser is used here, not GetOrCreateUser. The ineligible check above
	// and this insert are not atomic: a pending invite (or any other
	// non-deleted row for this email and org) can appear in the window between
	// them, invisible to that check. GetOrCreateUser would silently adopt such
	// a row through GetNonDeletedUserByEmailAndOrgID, reopening the very
	// pending-invite escalation the ineligible guard exists to close. CreateUser
	// has no adoption path at all, so a concurrent row instead collides with
	// the partial unique index on (email, org_id) WHERE status != 'deleted'
	// (pkg/sqlmigration/076_drop_user_deleted_at.go) and the insert fails: the
	// race fails closed rather than escalating. This also makes it impossible
	// for provisioning to ever hand back a pre-existing root record, so there
	// is no post-create root check to perform here.
	if err := provider.userSetter.CreateUser(ctx, newUser, user.WithRoleNames([]string{authtypes.SigNozViewerRoleName})); err != nil {
		return nil, err
	}

	return authtypes.NewPrincipalUserIdentity(
		newUser.ID,
		newUser.OrgID,
		newUser.Email,
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
