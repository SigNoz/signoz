package featurecontrol

// type API struct {
// 	featureRegistry FeatureRegistry
// }

// func NewAPI(featureRegistry FeatureRegistry) *API {
// 	return &API{
// 		featureRegistry: featureRegistry,
// 	}
// }

// func (api *API) ListOrgFeatures(rw http.ResponseWriter, req *http.Request) {
// 	ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
// 	defer cancel()

// 	claims, ok := authtypes.ClaimsFromContext(ctx)
// 	if !ok {
// 		render.Error(rw, errors.Newf(errors.TypeUnauthenticated, errors.CodeUnauthenticated, "unauthenticated"))
// 		return
// 	}

// 	features, err := api.featureRegistry.ListOrgFeatures(ctx, claims.OrgID)
// 	if err != nil {
// 		render.Error(rw, err)
// 		return
// 	}

// 	render.Success(rw, http.StatusOK, featuretypes.NewGettableFeaturesFromOrgFeatures(features, api.featureRegistry.Registry()))
// }
