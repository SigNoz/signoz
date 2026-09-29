package middleware

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types/coretypes"
	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var countingDecodes atomic.Int32

type countingRequest struct {
	RoleID string `json:"roleId"`
}

func (req *countingRequest) UnmarshalJSON(data []byte) error {
	countingDecodes.Add(1)
	type alias countingRequest
	return json.Unmarshal(data, (*alias)(req))
}

func TestResourceDecodesBodyOnceForBodyExtractors(t *testing.T) {
	countingDecodes.Store(0)

	var extractorSaw string
	var handlerGot *countingRequest
	var resolvedIDs []string
	handlerCalls := 0

	router := mux.NewRouter()
	router.Use(NewResource(slog.New(slog.DiscardHandler)).Wrap)
	router.Handle("/roles", handler.New(func(rw http.ResponseWriter, req *http.Request) {
		handlerCalls++
		resolved, err := coretypes.ResolvedResourcesFromContext(req.Context())
		require.NoError(t, err)
		resolvedIDs = resolved[0].SourceIDs()

		handlerGot, err = coretypes.BodyFromContext[countingRequest](req.Context())
		require.NoError(t, err)
		rw.WriteHeader(http.StatusNoContent)
	}, handler.OpenAPIDef{ID: "AssignRole", Request: new(countingRequest), SuccessStatusCode: http.StatusNoContent},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceRole,
			Verb:     coretypes.VerbAttach,
			ID: coretypes.BodyField(func(req *countingRequest) string {
				extractorSaw = req.RoleID
				return req.RoleID
			}),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodPost)

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodPost, "/roles", strings.NewReader(`{"roleId":"viewer","roleId":"admin"}`)))

	require.Equal(t, http.StatusNoContent, recorder.Code)
	assert.Equal(t, int32(1), countingDecodes.Load())
	assert.Equal(t, "admin", extractorSaw)
	assert.Equal(t, []string{"admin"}, resolvedIDs)
	assert.Equal(t, "admin", handlerGot.RoleID)

	recorder = httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodPost, "/roles", strings.NewReader(`{"roleId":`)))

	assert.Equal(t, http.StatusBadRequest, recorder.Code)
	assert.Equal(t, 1, handlerCalls)
}

func TestResourceSkipsDecodeWithoutBodyExtractors(t *testing.T) {
	countingDecodes.Store(0)
	handlerCalls := 0

	router := mux.NewRouter()
	router.Use(NewResource(slog.New(slog.DiscardHandler)).Wrap)
	router.Handle("/roles/{id}", handler.New(func(rw http.ResponseWriter, req *http.Request) {
		handlerCalls++
		ec, err := coretypes.ExtractorContextFromContext(req.Context())
		require.NoError(t, err)
		assert.Nil(t, ec.Body)
		rw.WriteHeader(http.StatusNoContent)
	}, handler.OpenAPIDef{ID: "UpdateRole", Request: new(countingRequest), SuccessStatusCode: http.StatusNoContent},
		handler.WithResourceDefs(handler.BasicResourceDef{
			Resource: coretypes.ResourceRole,
			Verb:     coretypes.VerbUpdate,
			ID:       coretypes.PathParam("id"),
			Selector: coretypes.IDSelector,
		}),
	)).Methods(http.MethodPut)

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodPut, "/roles/r1", strings.NewReader(`{"legacy":`)))

	assert.Equal(t, http.StatusNoContent, recorder.Code)
	assert.Equal(t, int32(0), countingDecodes.Load())
	assert.Equal(t, 1, handlerCalls)
}
