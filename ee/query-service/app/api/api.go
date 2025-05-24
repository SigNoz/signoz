package api

import (
	"context"
	"net/http"
	"net/http/httputil"
	"time"

	"github.com/SigNoz/signoz/ee/licensing/httplicensing"
	"github.com/SigNoz/signoz/ee/query-service/dao"
	"github.com/SigNoz/signoz/ee/query-service/integrations/gateway"
	"github.com/SigNoz/signoz/ee/query-service/interfaces"
	"github.com/SigNoz/signoz/ee/query-service/usage"
	"github.com/SigNoz/signoz/pkg/alertmanager"
	"github.com/SigNoz/signoz/pkg/apis/fields"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/middleware"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/licensing"
	baseapp "github.com/SigNoz/signoz/pkg/query-service/app"
	"github.com/SigNoz/signoz/pkg/query-service/app/cloudintegrations"
	"github.com/SigNoz/signoz/pkg/query-service/app/integrations"
	"github.com/SigNoz/signoz/pkg/query-service/app/logparsingpipeline"
	basemodel "github.com/SigNoz/signoz/pkg/query-service/model"
	rules "github.com/SigNoz/signoz/pkg/query-service/rules"
	"github.com/SigNoz/signoz/pkg/signoz"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/licensetypes"
	"github.com/SigNoz/signoz/pkg/version"
	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

type APIHandlerOptions struct {
	DataConnector                 interfaces.DataConnector
	PreferSpanMetrics             bool
	AppDao                        dao.ModelDao
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
		FieldsAPI:                     fields.NewAPI(signoz.TelemetryStore),
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

func (ah *APIHandler) AppDao() dao.ModelDao {
	return ah.opts.AppDao
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
	router.HandleFunc("/api/v1/loginPrecheck", am.OpenAccess(ah.loginPrecheck)).Methods(http.MethodGet)

	// invite
	router.HandleFunc("/api/v1/invite/{token}", am.OpenAccess(ah.getInvite)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/invite/accept", am.OpenAccess(ah.acceptInvite)).Methods(http.MethodPost)

	// paid plans specific routes
	router.HandleFunc("/api/v1/complete/saml", am.OpenAccess(ah.receiveSAML)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/complete/google", am.OpenAccess(ah.receiveGoogleAuth)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/orgs/{orgId}/domains", am.AdminAccess(ah.listDomainsByOrg)).Methods(http.MethodGet)

	router.HandleFunc("/api/v1/domains", am.AdminAccess(ah.postDomain)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/domains/{id}", am.AdminAccess(ah.putDomain)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/domains/{id}", am.AdminAccess(ah.deleteDomain)).Methods(http.MethodDelete)

	// base overrides
	router.HandleFunc("/api/v1/version", am.OpenAccess(ah.getVersion)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/login", am.OpenAccess(ah.loginUser)).Methods(http.MethodPost)

	// PAT APIs
	router.HandleFunc("/api/v1/pats", am.AdminAccess(ah.Signoz.Handlers.User.CreateAPIKey)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/pats", am.AdminAccess(ah.Signoz.Handlers.User.ListAPIKeys)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/pats/{id}", am.AdminAccess(ah.Signoz.Handlers.User.UpdateAPIKey)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/pats/{id}", am.AdminAccess(ah.Signoz.Handlers.User.RevokeAPIKey)).Methods(http.MethodDelete)

	router.HandleFunc("/api/v1/checkout", am.AdminAccess(ah.LicensingAPI.Checkout)).Methods(http.MethodPost)
	router.HandleFunc("/api/v1/billing", am.AdminAccess(ah.getBilling)).Methods(http.MethodGet)
	router.HandleFunc("/api/v1/portal", am.AdminAccess(ah.LicensingAPI.Portal)).Methods(http.MethodPost)

	router.HandleFunc("/api/v1/dashboards/{uuid}/lock", am.EditAccess(ah.lockDashboard)).Methods(http.MethodPut)
	router.HandleFunc("/api/v1/dashboards/{uuid}/unlock", am.EditAccess(ah.unlockDashboard)).Methods(http.MethodPut)

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

// TODO(nitya): remove this once we know how to get the FF's
func (ah *APIHandler) updateRequestContext(_ http.ResponseWriter, r *http.Request) (*http.Request, error) {
	ssoAvailable := true
	err := ah.Signoz.Licensing.CheckFeature(r.Context(), licensetypes.SSO)
	if err != nil && errors.Asc(err, licensing.ErrCodeFeatureUnavailable) {
		ssoAvailable = false
	} else if err != nil {
		zap.L().Error("feature check failed", zap.String("featureKey", licensetypes.SSO), zap.Error(err))
		return r, errors.New(errors.TypeInternal, errors.CodeInternal, "error checking SSO feature")
	}
	ctx := context.WithValue(r.Context(), types.SSOAvailable, ssoAvailable)
	return r.WithContext(ctx), nil
}

func (ah *APIHandler) loginPrecheck(w http.ResponseWriter, r *http.Request) {
	r, err := ah.updateRequestContext(w, r)
	if err != nil {
		render.Error(w, err)
		return
	}
	ah.Signoz.Handlers.User.LoginPrecheck(w, r)
}

func (ah *APIHandler) acceptInvite(w http.ResponseWriter, r *http.Request) {
	r, err := ah.updateRequestContext(w, r)
	if err != nil {
		render.Error(w, err)
		return
	}
	ah.Signoz.Handlers.User.AcceptInvite(w, r)
}

func (ah *APIHandler) getInvite(w http.ResponseWriter, r *http.Request) {
	r, err := ah.updateRequestContext(w, r)
	if err != nil {
		render.Error(w, err)
		return
	}
	ah.Signoz.Handlers.User.GetInvite(w, r)

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
