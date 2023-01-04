package api

import (
	"net/http"

	"github.com/gorilla/mux"
	"go.signoz.io/signoz/ee/query-service/dao"
	"go.signoz.io/signoz/ee/query-service/interfaces"
	"go.signoz.io/signoz/ee/query-service/license"
	baseapp "go.signoz.io/signoz/pkg/query-service/app"
	baseint "go.signoz.io/signoz/pkg/query-service/interfaces"
	rules "go.signoz.io/signoz/pkg/query-service/rules"
	"go.signoz.io/signoz/pkg/query-service/version"
)

type APIHandlerOptions struct {
	DataConnector  interfaces.DataConnector
	AppDao         dao.ModelDao
	RulesManager   *rules.Manager
	FeatureFlags   baseint.FeatureLookup
	LicenseManager *license.Manager
}

type APIHandler struct {
	opts APIHandlerOptions
	baseapp.APIHandler
}

// NewAPIHandler returns an APIHandler
func NewAPIHandler(opts APIHandlerOptions) (*APIHandler, error) {

	baseHandler, err := baseapp.NewAPIHandler(baseapp.APIHandlerOpts{
		Reader:       opts.DataConnector,
		AppDao:       opts.AppDao,
		RuleManager:  opts.RulesManager,
		FeatureFlags: opts.FeatureFlags})

	if err != nil {
		return nil, err
	}

	ah := &APIHandler{
		opts:       opts,
		APIHandler: *baseHandler,
	}
	return ah, nil
}

func (ah *APIHandler) FF() baseint.FeatureLookup {
	return ah.opts.FeatureFlags
}

func (ah *APIHandler) RM() *rules.Manager {
	return ah.opts.RulesManager
}

func (ah *APIHandler) LM() *license.Manager {
	return ah.opts.LicenseManager
}

func (ah *APIHandler) AppDao() dao.ModelDao {
	return ah.opts.AppDao
}

func (ah *APIHandler) CheckFeature(f string) bool {
	err := ah.FF().CheckFeature(f)
	return err == nil
}

// RegisterRoutes registers routes for this handler on the given router
func (ah *APIHandler) RegisterRoutes(router *mux.Router) {
	// note: add ee override methods first

	// routes available only in ee version
	router.HandleFunc("/api/v1/licenses",
		baseapp.AdminAccess(ah.listLicenses)).
		Methods(http.MethodGet)

	router.HandleFunc("/api/v1/licenses",
		baseapp.AdminAccess(ah.applyLicense)).
		Methods(http.MethodPost)

	router.HandleFunc("/api/v1/featureFlags",
		baseapp.OpenAccess(ah.getFeatureFlags)).
		Methods(http.MethodGet)

	router.HandleFunc("/api/v1/loginPrecheck",
		baseapp.OpenAccess(ah.precheckLogin)).
		Methods(http.MethodGet)

	// paid plans specific routes
	router.HandleFunc("/api/v1/complete/saml",
		baseapp.OpenAccess(ah.receiveSAML)).
		Methods(http.MethodPost)

	router.HandleFunc("/api/v1/complete/google",
		baseapp.OpenAccess(ah.receiveGoogleAuth)).
		Methods(http.MethodGet)
		
	router.HandleFunc("/api/v1/orgs/{orgId}/domains",
		baseapp.AdminAccess(ah.listDomainsByOrg)).
		Methods(http.MethodGet)

	router.HandleFunc("/api/v1/domains",
		baseapp.AdminAccess(ah.postDomain)).
		Methods(http.MethodPost)

	router.HandleFunc("/api/v1/domains/{id}",
		baseapp.AdminAccess(ah.putDomain)).
		Methods(http.MethodPut)

	router.HandleFunc("/api/v1/domains/{id}",
		baseapp.AdminAccess(ah.deleteDomain)).
		Methods(http.MethodDelete)

	// base overrides
	router.HandleFunc("/api/v1/version", baseapp.OpenAccess(ah.getVersion)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/invite/{token}", baseapp.OpenAccess(ah.getInvite)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/register", baseapp.OpenAccess(ah.registerUser)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/login", baseapp.OpenAccess(ah.loginUser)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/traces/{traceId}", baseapp.ViewAccess(ah.searchTraces)).Methods(http.MethodGet)
	router.HandleFunc("/api/v2/metrics/query_range", baseapp.ViewAccess(ah.queryRangeMetricsV2)).Methods(http.MethodPost)

	ah.APIHandler.RegisterRoutes(router)

}

func (ah *APIHandler) getVersion(w http.ResponseWriter, r *http.Request) {
	version := version.GetVersion()
	ah.WriteJSON(w, r, map[string]string{"version": version, "ee": "Y"})
}
