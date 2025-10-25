package api

import (
	"net/http"
	"net/http/httputil"
	"time"

	"github.com/SigNoz/signoz/ee/licensing/httplicensing"
	"github.com/SigNoz/signoz/ee/query-service/integrations/gateway"
	"github.com/SigNoz/signoz/ee/query-service/usage"
	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/apis/fields"
	"github.com/SigNoz/signoz/pkg/http/middleware"
	querierAPI "github.com/SigNoz/signoz/pkg/querier"
	baseapp "github.com/SigNoz/signoz/pkg/query-service/app"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations"
	"github.com/SigNoz/signoz/pkg/query-service/app/integrations"
	"github.com/SigNoz/signoz/pkg/query-service/app/logparsingpipeline"
	"github.com/SigNoz/signoz/pkg/query-service/interfaces"
	basemodel "github.com/SigNoz/signoz/pkg/query-service/model"
	rules "github.com/SigNoz/signoz/pkg/query-service/rules"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/version"
	"github.com/gorilla/mux"
)

type APIHandlerOptions struct {
	DataConnector                 interfaces.Reader
	RulesManager                  *rules.Manager
	UsageManager                  *usage.Manager
	IntegrationsController        *integrations.Controller
	CloudIntegrationsController   *cloudintegrations.Controller
	LogsParsingPipelineController *logparsingpipeline.LogParsingPipelineController
	Gateway                       *httputil.ReverseProxy
	GatewayUrl                    string
	// Querier Influx Interval
	FluxInterval time.Duration
}

type APIHandler struct {
	opts APIHandlerOptions
	baseapp.APIHandler
}

// NewAPIHandler returns an APIHandler
func NewAPIHandler(opts APIHandlerOptions, signoz *signoz.SigNoz) (*APIHandler, error) {
	baseHandler, err := baseapp.NewAPIHandler(baseapp.APIHandlerOpts{
		Reader:                        opts.DataConnector,
		RuleManager:                   opts.RulesManager,
		IntegrationsController:        opts.IntegrationsController,
		CloudIntegrationsController:   opts.CloudIntegrationsController,
		LogsParsingPipelineController: opts.LogsParsingPipelineController,
		FluxInterval:                  opts.FluxInterval,
		AlertmanagerAPI:               alertmanager.NewAPI(signoz.Alertmanager),
		LicensingAPI:                  httplicensing.NewLicensingAPI(signoz.Licensing),
		FieldsAPI:                     fields.NewAPI(signoz.Instrumentation.ToProviderSettings(), signoz.TelemetryStore),
		Signoz:                        signoz,
		QuerierAPI:                    querierAPI.NewAPI(signoz.Instrumentation.ToProviderSettings(), signoz.Querier, signoz.Analytics),
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

func (ah *APIHandler) RM() *rules.Manager {
	return ah.opts.RulesManager
}

func (ah *APIHandler) UM() *usage.Manager {
	return ah.opts.UsageManager
}

func (ah *APIHandler) Gateway() *httputil.ReverseProxy {
	return ah.opts.Gateway
}

// RegisterRoutes registers routes for this handler on the given router
func (ah *APIHandler) RegisterRoutes(router *mux.Router, am *middleware.AuthZ) {
	// v1
	router.HandleFunc("/api/v1/features", am.ViewAccess(ah.getFeatureFlags)).Methods(http.MethodGet)

	// paid plans specific routes
	router.HandleFunc("/api/v1/complete/saml", am.OpenAccess(ah.Signoz.Handlers.Session.CreateSessionBySAMLCallback)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/complete/oidc", am.OpenAccess(ah.Signoz.Handlers.Session.CreateSessionByOIDCCallback)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/roles/resources", am.OpenAccess(ah.Signoz.Handlers.Role.GetResources)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/roles", am.OpenAccess(ah.Signoz.Handlers.Role.List)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/roles", am.OpenAccess(ah.Signoz.Handlers.Role.Create)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/roles/{id}", am.OpenAccess(ah.Signoz.Handlers.Role.Get)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/roles/{id}/relation/{relation}/objects", am.OpenAccess(ah.Signoz.Handlers.Role.GetObjects)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/roles/{id}", am.OpenAccess(ah.Signoz.Handlers.Role.Patch)).Methods(http.MethodPatch)
	router.HandleFunc("/api/v1/roles/{id}/relation/{relation}/objects", am.OpenAccess(ah.Signoz.Handlers.Role.PatchObjects)).Methods(http.MethodPatch)
	router.HandleFunc("/api/v1/roles/{id}", am.OpenAccess(ah.Signoz.Handlers.Role.Delete)).Methods(http.MethodDelete)

	// base overrides
	router.HandleFunc("/api/v1/version", am.OpenAccess(ah.getVersion)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/checkout", am.AdminAccess(ah.LicensingAPI.Checkout)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/billing", am.AdminAccess(ah.getBilling)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/portal", am.AdminAccess(ah.LicensingAPI.Portal)).Methods(http.MethodPost)

	// v3
	router.HandleFunc("/api/v3/licenses", am.AdminAccess(ah.LicensingAPI.Activate)).Methods(http.MethodPost)
	router.HandleFunc("/api/v3/licenses", am.AdminAccess(ah.LicensingAPI.Refresh)).Methods(http.MethodPut)
	router.HandleFunc("/api/v3/licenses/active", am.ViewAccess(ah.LicensingAPI.GetActive)).Methods(http.MethodGet)

	// v4
	router.HandleFunc("/api/v4/query_range", am.ViewAccess(ah.queryRangeV4)).Methods(http.MethodPost)

	// v5
	router.HandleFunc("/api/v5/query_range", am.ViewAccess(ah.queryRangeV5)).Methods(http.MethodPost)

	router.HandleFunc("/api/v5/substitute_vars", am.ViewAccess(ah.QuerierAPI.ReplaceVariables)).Methods(http.MethodPost)

	// Gateway
	router.PathPrefix(gateway.RoutePrefix).HandlerFunc(am.EditAccess(ah.ServeGatewayHTTP))

	ah.APIHandler.RegisterRoutes(router, am)

}

func (ah *APIHandler) RegisterCloudIntegrationsRoutes(router *mux.Router, am *middleware.AuthZ) {

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
