package api

import (
	"net/http"
	"net/http/httputil"
	"time"

	"github.com/SigNoz/signoz/ee/query-service/dao"
	"github.com/SigNoz/signoz/ee/query-service/integrations/gateway"
	"github.com/SigNoz/signoz/ee/query-service/interfaces"
	"github.com/SigNoz/signoz/ee/query-service/license"
	"github.com/SigNoz/signoz/ee/query-service/usage"
	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/modules/preference"
	preferencecore "github.com/SigNoz/signoz/pkg/modules/preference/core"
	baseapp "github.com/SigNoz/signoz/pkg/query-service/app"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations"
	"github.com/SigNoz/signoz/pkg/query-service/app/integrations"
	"github.com/SigNoz/signoz/pkg/query-service/app/logparsingpipeline"
	"github.com/SigNoz/signoz/pkg/query-service/cache"
	baseint "github.com/SigNoz/signoz/pkg/query-service/interfaces"
	basemodel "github.com/SigNoz/signoz/pkg/query-service/model"
	rules "github.com/SigNoz/signoz/pkg/query-service/rules"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/version"
	"github.com/gorilla/mux"
)

type APIHandlerOptions struct {
	DataConnector                 interfaces.DataConnector
	SkipConfig                    *basemodel.SkipConfig
	PreferSpanMetrics             bool
	AppDao                        dao.ModelDao
	RulesManager                  *rules.Manager
	UsageManager                  *usage.Manager
	FeatureFlags                  baseint.FeatureLookup
	LicenseManager                *license.Manager
	IntegrationsController        *integrations.Controller
	CloudIntegrationsController   *cloudintegrations.Controller
	LogsParsingPipelineController *logparsingpipeline.LogParsingPipelineController
	Cache                         cache.Cache
	Gateway                       *httputil.ReverseProxy
	GatewayUrl                    string
	// Querier Influx Interval
	FluxInterval      time.Duration
	UseLogsNewSchema  bool
	UseTraceNewSchema bool
	JWT               *authtypes.JWT
}

type APIHandler struct {
	opts APIHandlerOptions
	baseapp.APIHandler
}

// NewAPIHandler returns an APIHandler
func NewAPIHandler(opts APIHandlerOptions, signoz *signoz.SigNoz) (*APIHandler, error) {
	preference := preference.NewAPI(preferencecore.NewPreference(preferencecore.NewStore(signoz.SQLStore)))

	baseHandler, err := baseapp.NewAPIHandler(baseapp.APIHandlerOpts{
		Reader:                        opts.DataConnector,
		SkipConfig:                    opts.SkipConfig,
		PreferSpanMetrics:             opts.PreferSpanMetrics,
		AppDao:                        opts.AppDao,
		RuleManager:                   opts.RulesManager,
		FeatureFlags:                  opts.FeatureFlags,
		IntegrationsController:        opts.IntegrationsController,
		CloudIntegrationsController:   opts.CloudIntegrationsController,
		LogsParsingPipelineController: opts.LogsParsingPipelineController,
		Cache:                         opts.Cache,
		FluxInterval:                  opts.FluxInterval,
		UseLogsNewSchema:              opts.UseLogsNewSchema,
		UseTraceNewSchema:             opts.UseTraceNewSchema,
		AlertmanagerAPI:               alertmanager.NewAPI(signoz.Alertmanager),
		Signoz:                        signoz,
		Preference:                    preference,
	})

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

func (ah *APIHandler) UM() *usage.Manager {
	return ah.opts.UsageManager
}

func (ah *APIHandler) AppDao() dao.ModelDao {
	return ah.opts.AppDao
}

func (ah *APIHandler) Gateway() *httputil.ReverseProxy {
	return ah.opts.Gateway
}

func (ah *APIHandler) CheckFeature(f string) bool {
	err := ah.FF().CheckFeature(f)
	return err == nil
}

// RegisterRoutes registers routes for this handler on the given router
func (ah *APIHandler) RegisterRoutes(router *mux.Router, am *baseapp.AuthMiddleware) {
	// note: add ee override methods first

	// routes available only in ee version

	router.HandleFunc("/api/v1/featureFlags",
		am.OpenAccess(ah.getFeatureFlags)).
		Methods(http.MethodGet)

	router.HandleFunc("/api/v1/loginPrecheck",
		am.OpenAccess(ah.precheckLogin)).
		Methods(http.MethodGet)

	// paid plans specific routes
	router.HandleFunc("/api/v1/complete/saml",
		am.OpenAccess(ah.receiveSAML)).
		Methods(http.MethodPost)

	router.HandleFunc("/api/v1/complete/google",
		am.OpenAccess(ah.receiveGoogleAuth)).
		Methods(http.MethodGet)

	router.HandleFunc("/api/v1/orgs/{orgId}/domains",
		am.AdminAccess(ah.listDomainsByOrg)).
		Methods(http.MethodGet)

	router.HandleFunc("/api/v1/domains",
		am.AdminAccess(ah.postDomain)).
		Methods(http.MethodPost)

	router.HandleFunc("/api/v1/domains/{id}",
		am.AdminAccess(ah.putDomain)).
		Methods(http.MethodPut)

	router.HandleFunc("/api/v1/domains/{id}",
		am.AdminAccess(ah.deleteDomain)).
		Methods(http.MethodDelete)

	// base overrides
	router.HandleFunc("/api/v1/version", am.OpenAccess(ah.getVersion)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/invite/{token}", am.OpenAccess(ah.getInvite)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/register", am.OpenAccess(ah.registerUser)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/login", am.OpenAccess(ah.loginUser)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/traces/{traceId}", am.ViewAccess(ah.searchTraces)).Methods(http.MethodGet)

	// PAT APIs
	router.HandleFunc("/api/v1/pats", am.AdminAccess(ah.createPAT)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/pats", am.AdminAccess(ah.getPATs)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/pats/{id}", am.AdminAccess(ah.updatePAT)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/pats/{id}", am.AdminAccess(ah.revokePAT)).Methods(http.MethodDelete)

	router.HandleFunc("/api/v1/checkout", am.AdminAccess(ah.checkout)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/billing", am.AdminAccess(ah.getBilling)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/portal", am.AdminAccess(ah.portalSession)).Methods(http.MethodPost)

	router.HandleFunc("/api/v1/dashboards/{uuid}/lock", am.EditAccess(ah.lockDashboard)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/dashboards/{uuid}/unlock", am.EditAccess(ah.unlockDashboard)).Methods(http.MethodPut)

	// v3
	router.HandleFunc("/api/v3/licenses", am.ViewAccess(ah.listLicensesV3)).Methods(http.MethodGet)
	router.HandleFunc("/api/v3/licenses", am.AdminAccess(ah.applyLicenseV3)).Methods(http.MethodPost)
	router.HandleFunc("/api/v3/licenses", am.AdminAccess(ah.refreshLicensesV3)).Methods(http.MethodPut)
	router.HandleFunc("/api/v3/licenses/active", am.ViewAccess(ah.getActiveLicenseV3)).Methods(http.MethodGet)

	// v4
	router.HandleFunc("/api/v4/query_range", am.ViewAccess(ah.queryRangeV4)).Methods(http.MethodPost)

	// Gateway
	router.PathPrefix(gateway.RoutePrefix).HandlerFunc(am.EditAccess(ah.ServeGatewayHTTP))

	ah.APIHandler.RegisterRoutes(router, am)

}

func (ah *APIHandler) RegisterCloudIntegrationsRoutes(router *mux.Router, am *baseapp.AuthMiddleware) {

	ah.APIHandler.RegisterCloudIntegrationsRoutes(router, am)

	router.HandleFunc(
		"/api/v1/cloud-integrations/{cloudProvider}/accounts/generate-connection-params",
		am.EditAccess(ah.CloudIntegrationsGenerateConnectionParams),
	).Methods(http.MethodGet)

}

func (ah *APIHandler) getVersion(w http.ResponseWriter, r *http.Request) {
	versionResponse := basemodel.GetVersionResponse{
		Version:        version.Info.Version(),
		EE:             "Y",
		SetupCompleted: ah.SetupCompleted,
	}

	ah.WriteJSON(w, r, versionResponse)
}
