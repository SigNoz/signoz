package middleware

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
)

func TestAuthN(t *testing.T) {
	t.Parallel()

	ok := func(rw http.ResponseWriter, _ *http.Request) { rw.WriteHeader(http.StatusNoContent) }

	newRouter := func(withClaims bool) *mux.Router {
		router := mux.NewRouter()
		if withClaims {
			router.Use(func(next http.Handler) http.Handler {
				return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
					claims := authtypes.Claims{OrgID: valuer.GenerateUUID().StringValue(), UserID: valuer.GenerateUUID().StringValue()}
					next.ServeHTTP(rw, req.WithContext(authtypes.NewContextWithClaims(req.Context(), claims)))
				})
			})
		}
		router.Use(NewAuthN(slog.New(slog.DiscardHandler)).Wrap)

		router.Handle("/anonymous", handler.New(ok, handler.OpenAPIDef{ID: "Anonymous", SuccessStatusCode: http.StatusNoContent}, handler.AllowAnonymous())).Methods(http.MethodGet)
		router.Handle("/protected", handler.New(ok, handler.OpenAPIDef{ID: "Protected", SuccessStatusCode: http.StatusNoContent})).Methods(http.MethodGet)
		router.HandleFunc("/raw", ok).Methods(http.MethodGet)
		subrouter := router.PathPrefix("/api/v3").Subrouter()
		subrouter.Handle("/protected-sub", handler.New(ok, handler.OpenAPIDef{ID: "ProtectedSub", SuccessStatusCode: http.StatusNoContent})).Methods(http.MethodGet)
		subrouter.HandleFunc("/raw-sub", ok).Methods(http.MethodGet)
		router.PathPrefix("/").Handler(http.HandlerFunc(ok))

		return router
	}

	testCases := []struct {
		name       string
		path       string
		withClaims bool
		status     int
	}{
		{name: "AnonymousHandlerWithoutClaims", path: "/anonymous", withClaims: false, status: http.StatusNoContent},
		{name: "RawCatchAllWithoutClaims", path: "/index.html", withClaims: false, status: http.StatusNoContent},
		{name: "RawWithoutClaims", path: "/raw", withClaims: false, status: http.StatusNoContent},
		{name: "RawSubrouterWithoutClaims", path: "/api/v3/raw-sub", withClaims: false, status: http.StatusNoContent},
		{name: "ProtectedHandlerWithoutClaims", path: "/protected", withClaims: false, status: http.StatusUnauthorized},
		{name: "ProtectedSubrouterWithoutClaims", path: "/api/v3/protected-sub", withClaims: false, status: http.StatusUnauthorized},
		{name: "ProtectedHandlerWithClaims", path: "/protected", withClaims: true, status: http.StatusNoContent},
		{name: "ProtectedSubrouterWithClaims", path: "/api/v3/protected-sub", withClaims: true, status: http.StatusNoContent},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()

			recorder := httptest.NewRecorder()
			newRouter(testCase.withClaims).ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, testCase.path, nil))
			assert.Equal(t, testCase.status, recorder.Code)
		})
	}
}
