package impluser

import (
	"context"
	"net/http"
	"net/url"
	"time"

	"github.com/SigNoz/signoz/ee/modules/authdomain"
	"github.com/SigNoz/signoz/ee/query-service/constants"
	eeTypes "github.com/SigNoz/signoz/ee/types"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/modules/user"
	"github.com/SigNoz/signoz/pkg/modules/user/impluser"
	"github.com/SigNoz/signoz/pkg/types"
	"go.uber.org/zap"
)

// EnterpriseHandler embeds the base handler implementation
type Handler struct {
	user.Handler     // Embed the base handler interface
	module           user.Module
	authDomainModule authdomain.Module
}

func NewHandler(module user.Module, authdomain authdomain.Module) user.Handler {
	baseHandler := impluser.NewHandler(module)
	return &Handler{
		Handler:          baseHandler,
		module:           module,
		authDomainModule: authdomain,
	}
}

// Override only the methods you need with enterprise-specific implementations
func (h *Handler) LoginPrecheck(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// assume user is valid unless proven otherwise and assign default values for rest of the fields
	resp := &types.GettableLoginPrecheck{IsUser: true, CanSelfRegister: false}

	email := r.URL.Query().Get("email")
	sourceUrl := r.URL.Query().Get("ref")
	orgID := r.URL.Query().Get("orgID")

	// check if email is a valid user
	users, baseApiErr := h.module.GetUsersByEmail(ctx, email)
	if baseApiErr != nil {
		render.Error(w, baseApiErr)
		return
	}

	if len(users) == 0 {
		resp.IsUser = false
		render.Success(w, http.StatusOK, resp)
		return
	}

	// give them an option to select an org
	if orgID == "" && len(users) > 1 {
		resp.SelectOrg = true
		resp.Orgs = make([]string, len(users))
		for i, user := range users {
			resp.Orgs[i] = user.OrgID
		}
		render.Success(w, http.StatusOK, resp)
		return
	}

	// user := users[0]
	// select the user with the corresponding orgID
	if len(users) > 1 {
		found := false
		for _, tuser := range users {
			if tuser.OrgID == orgID {
				// user = tuser
				found = true
				break
			}
		}
		if !found {
			resp.IsUser = false
			render.Success(w, http.StatusOK, resp)
			return
		}
	}

	ssoAvailable := true

	// err := m.checkFeature(model.SSO)
	// if err != nil {
	// 	switch err.(type) {
	// 	case basemodel.ErrFeatureUnavailable:
	// 		// do nothing, just skip sso
	// 		ssoAvailable = false
	// 	default:
	// 		zap.L().Error("feature check failed", zap.String("featureKey", model.SSO), zap.Error(err))
	// 		return resp, model.BadRequestStr(err.Error())
	// 	}
	// }

	if ssoAvailable {

		orgDomain := &eeTypes.GettableOrgDomain{}

		// TODO(Nitya): in multitenancy this should use orgId as well.
		orgDomain, err := h.authDomainModule.GetAuthDomainByEmail(ctx, email)
		if err != nil {
			zap.L().Error("failed to get org domain from email", zap.String("email", email), zap.Error(err))
			render.Error(w, errors.New(errors.TypeInternal, errors.CodeInternal, "failed to get domain for sso auth"))
		}

		if orgDomain != nil && orgDomain.SsoEnabled {
			// saml is enabled for this domain, lets prepare sso url

			if sourceUrl == "" {
				sourceUrl = constants.GetDefaultSiteURL()
			}

			// parse source url that generated the login request
			var err error
			escapedUrl, _ := url.QueryUnescape(sourceUrl)
			siteUrl, err := url.Parse(escapedUrl)
			if err != nil {
				zap.L().Error("failed to parse referer", zap.Error(err))
				render.Error(w, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "failed to parse referer"))
				return
			}

			// build Idp URL that will authenticat the user
			// the front-end will redirect user to this url
			resp.SsoUrl, err = orgDomain.BuildSsoUrl(siteUrl)
			if err != nil {
				zap.L().Error("failed to prepare saml request for domain", zap.String("domain", orgDomain.Name), zap.Error(err))
				render.Error(w, errors.New(errors.TypeInternal, errors.CodeInternal, "failed to prepare saml request for domain"))
				return
			}

			// set SSO to true, as the url is generated correctly
			resp.SSO = true
		}
	}

}
