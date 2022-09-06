package api

import (
	"github.com/gorilla/mux"
	baseapp "go.signoz.io/query-service/app"
	"go.signoz.io/query-service/ee/dao"
	"go.signoz.io/query-service/ee/interfaces"
	"go.signoz.io/query-service/ee/license"
	baseint "go.signoz.io/query-service/interfaces"
	rules "go.signoz.io/query-service/rules"
	"go.signoz.io/query-service/version"
	"net/http"
)

type APIHandlerOptions struct {
	QueryBackend   interfaces.QueryBackend
	AppDB          dao.ModelDao
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
	baseHandler, err := baseapp.NewAPIHandler(opts.QueryBackend, opts.AppDB, opts.RulesManager)
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

func (ah *APIHandler) AppDB() dao.ModelDao {
	return ah.opts.AppDB
}

// RegisterRoutes registers routes for this handler on the given router
func (ah *APIHandler) RegisterRoutes(router *mux.Router) {
	// note: add ee override methods first

	// routes available only in ee version
	router.HandleFunc("/api/v1/licenses", baseapp.AdminAccess(ah.applyLicense)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/featureFlags", baseapp.OpenAccess(ah.getFeatureFlags)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/loginPrecheck", baseapp.OpenAccess(ah.precheckLogin)).Methods(http.MethodGet)

	// paid plans specific routes
	router.HandleFunc("/api/v1/domains-sso/{domain_id}/complete/saml", baseapp.OpenAccess(ah.ReceiveSAML)).Methods(http.MethodPost)

	// base overrides
	router.HandleFunc("/api/v1/version", baseapp.OpenAccess(ah.getVersion)).Methods(http.MethodGet)

	ah.APIHandler.RegisterRoutes(router)

}

func (ah *APIHandler) getVersion(w http.ResponseWriter, r *http.Request) {
	version := version.GetVersion()
	ah.WriteJSON(w, r, map[string]string{"version": version, "eeAvailable": "Y"})
}
