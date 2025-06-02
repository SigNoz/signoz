package api

import (
	"context"
	"net/http"
	"net/http/httputil"
	"time"

	"github.com/SigNoz/signoz/ee/licensing/httplicensing"
	"github.com/SigNoz/signoz/ee/query-service/integrations/gateway"
	"github.com/SigNoz/signoz/ee/query-service/interfaces"
	"github.com/SigNoz/signoz/ee/query-service/usage"
	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/apis/fields"
	"github.com/SigNoz/signoz/pkg/http/middleware"
	baseapp "github.com/SigNoz/signoz/pkg/query-service/app"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations"
	"github.com/SigNoz/signoz/pkg/query-service/app/integrations"
	"github.com/SigNoz/signoz/pkg/query-service/app/logparsingpipeline"
	basemodel "github.com/SigNoz/signoz/pkg/query-service/model"
	rules "github.com/SigNoz/signoz/pkg/query-service/rules"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/version"
	"github.com/gorilla/mux"
)

type APIHandlerOptions struct {
	DataConnector                 interfaces.DataConnector
	PreferSpanMetrics             bool
	RulesManager                  *rules.Manager
	UsageManager                  *usage.Manager
	IntegrationsController        *integrations.Controller
	CloudIntegrationsController   *cloudintegrations.Controller
	LogsParsingPipelineController *logparsingpipeline.LogParsingPipelineController
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
	baseHandler, err := baseapp.NewAPIHandler(baseapp.APIHandlerOpts{
		Reader:                        opts.DataConnector,
		PreferSpanMetrics:             opts.PreferSpanMetrics,
		RuleManager:                   opts.RulesManager,
		IntegrationsController:        opts.IntegrationsController,
		CloudIntegrationsController:   opts.CloudIntegrationsController,
		LogsParsingPipelineController: opts.LogsParsingPipelineController,
		FluxInterval:                  opts.FluxInterval,
		AlertmanagerAPI:               alertmanager.NewAPI(signoz.Alertmanager),
		LicensingAPI:                  httplicensing.NewLicensingAPI(signoz.Licensing),
		FieldsAPI:                     fields.NewAPI(signoz.TelemetryStore, signoz.Instrumentation.Logger()),
		Signoz:                        signoz,
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

func (ah *APIHandler) CheckFeature(ctx context.Context, key string) bool {
	err := ah.Signoz.Licensing.CheckFeature(ctx, key)
	return err == nil
}

// RegisterRoutes registers routes for this handler on the given router
func (ah *APIHandler) RegisterRoutes(router *mux.Router, am *middleware.AuthZ) {
	// note: add ee override methods first

	// routes available only in ee version
	router.HandleFunc("/api/v1/featureFlags", am.OpenAccess(ah.getFeatureFlags)).Methods(http.MethodGet)

	// paid plans specific routes
	router.HandleFunc("/api/v1/complete/saml", am.OpenAccess(ah.receiveSAML)).Methods(http.MethodPost)

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
