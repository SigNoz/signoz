package prometheus

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/gorilla/mux"
	"github.com/prometheus/prometheus/model/labels"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakePrometheus lets handler tests control the LabelNames/LabelValues/Series
// results and errors without a real querier.
type fakePrometheus struct {
	labelNamesFn  func(ctx context.Context, matcherSets [][]*labels.Matcher, start, end time.Time, limit int) ([]string, error)
	labelValuesFn func(ctx context.Context, name string, matcherSets [][]*labels.Matcher, start, end time.Time, limit int) ([]string, error)
	seriesFn      func(ctx context.Context, matcherSets [][]*labels.Matcher, start, end time.Time, limit int) ([]labels.Labels, error)
}

func (f *fakePrometheus) QueryRange(context.Context, string, time.Time, time.Time, time.Duration) (*Result, error) {
	return nil, nil
}

func (f *fakePrometheus) Query(context.Context, string, time.Time) (*Result, error) {
	return nil, nil
}

func (f *fakePrometheus) Statements(context.Context, string, time.Time, time.Time, time.Duration) ([]CapturedStatement, error) {
	return nil, nil
}

func (f *fakePrometheus) LabelNames(ctx context.Context, matcherSets [][]*labels.Matcher, start, end time.Time, limit int) ([]string, error) {
	return f.labelNamesFn(ctx, matcherSets, start, end, limit)
}

func (f *fakePrometheus) LabelValues(ctx context.Context, name string, matcherSets [][]*labels.Matcher, start, end time.Time, limit int) ([]string, error) {
	return f.labelValuesFn(ctx, name, matcherSets, start, end, limit)
}

func (f *fakePrometheus) Series(ctx context.Context, matcherSets [][]*labels.Matcher, start, end time.Time, limit int) ([]labels.Labels, error) {
	return f.seriesFn(ctx, matcherSets, start, end, limit)
}

func newTestHandler(prom Prometheus) *handler {
	return &handler{logger: slog.New(slog.DiscardHandler), prom: prom, parser: NewParser()}
}

type wireResponse struct {
	Status    string          `json:"status"`
	Data      json.RawMessage `json:"data,omitempty"`
	ErrorType string          `json:"errorType,omitempty"`
	Error     string          `json:"error,omitempty"`
}

func decodeResponse(t *testing.T, rec *httptest.ResponseRecorder) wireResponse {
	t.Helper()
	var out wireResponse
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &out))
	return out
}

func TestHandlerLabels(t *testing.T) {
	testCases := []struct {
		name           string
		query          string
		labelNamesFn   func(ctx context.Context, matcherSets [][]*labels.Matcher, start, end time.Time, limit int) ([]string, error)
		expectedStatus int
		expectedType   string
		expectedData   string
	}{
		{
			name:  "NoMatch_ReturnsAllNames",
			query: "",
			labelNamesFn: func(_ context.Context, matcherSets [][]*labels.Matcher, _, _ time.Time, limit int) ([]string, error) {
				assert.Empty(t, matcherSets)
				assert.Zero(t, limit)
				return []string{"__name__", "job"}, nil
			},
			expectedStatus: http.StatusOK,
			expectedData:   `["__name__","job"]`,
		},
		{
			name:  "MatchParam_ParsedIntoOneGroup",
			query: `match[]=` + `{job="api"}`,
			labelNamesFn: func(_ context.Context, matcherSets [][]*labels.Matcher, _, _ time.Time, _ int) ([]string, error) {
				require.Len(t, matcherSets, 1)
				require.Len(t, matcherSets[0], 1)
				assert.Equal(t, "job", matcherSets[0][0].Name)
				assert.Equal(t, "api", matcherSets[0][0].Value)
				return []string{"job"}, nil
			},
			expectedStatus: http.StatusOK,
			expectedData:   `["job"]`,
		},
		{
			name: "NilResult_EncodesAsEmptyArray",
			labelNamesFn: func(context.Context, [][]*labels.Matcher, time.Time, time.Time, int) ([]string, error) {
				return nil, nil
			},
			expectedStatus: http.StatusOK,
			expectedData:   `[]`,
		},
		{
			name:  "InvalidLimit_RespondsBadData",
			query: "limit=-1",
			labelNamesFn: func(context.Context, [][]*labels.Matcher, time.Time, time.Time, int) ([]string, error) {
				t.Fatal("must not query the store")
				return nil, nil
			},
			expectedStatus: http.StatusBadRequest,
			expectedType:   "bad_data",
		},
		{
			name:  "InvalidMatchSelector_RespondsBadData",
			query: `match[]=not(a(selector`,
			labelNamesFn: func(context.Context, [][]*labels.Matcher, time.Time, time.Time, int) ([]string, error) {
				t.Fatal("must not query the store")
				return nil, nil
			},
			expectedStatus: http.StatusBadRequest,
			expectedType:   "bad_data",
		},
		{
			name:  "EndBeforeStart_RespondsBadData",
			query: "start=100&end=0",
			labelNamesFn: func(context.Context, [][]*labels.Matcher, time.Time, time.Time, int) ([]string, error) {
				t.Fatal("must not query the store")
				return nil, nil
			},
			expectedStatus: http.StatusBadRequest,
			expectedType:   "bad_data",
		},
		{
			name: "StoreInvalidInputError_RespondsBadData",
			labelNamesFn: func(context.Context, [][]*labels.Matcher, time.Time, time.Time, int) ([]string, error) {
				return nil, errors.NewInvalidInputf(errors.CodeInvalidInput, "bad matcher")
			},
			expectedStatus: http.StatusBadRequest,
			expectedType:   "bad_data",
		},
		{
			name: "StoreGenericError_RespondsInternal",
			labelNamesFn: func(context.Context, [][]*labels.Matcher, time.Time, time.Time, int) ([]string, error) {
				return nil, assert.AnError
			},
			expectedStatus: http.StatusInternalServerError,
			expectedType:   "internal",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			h := newTestHandler(&fakePrometheus{labelNamesFn: testCase.labelNamesFn})
			req := httptest.NewRequest(http.MethodGet, "/prometheus/api/v1/labels?"+testCase.query, nil)
			rec := httptest.NewRecorder()

			h.Labels(rec, req)

			assert.Equal(t, testCase.expectedStatus, rec.Code)
			resp := decodeResponse(t, rec)
			if testCase.expectedType != "" {
				assert.Equal(t, "error", resp.Status)
				assert.Equal(t, testCase.expectedType, resp.ErrorType)
				assert.NotEmpty(t, resp.Error)
			} else {
				assert.Equal(t, "success", resp.Status)
				assert.JSONEq(t, testCase.expectedData, string(resp.Data))
			}
		})
	}
}

func TestHandlerLabels_DefaultWindow(t *testing.T) {
	before := time.Now()
	h := newTestHandler(&fakePrometheus{
		labelNamesFn: func(_ context.Context, _ [][]*labels.Matcher, start, end time.Time, _ int) ([]string, error) {
			assert.True(t, start.Equal(time.Unix(0, 0)), "default start should be the Unix epoch")
			assert.False(t, end.Before(before), "default end should be roughly now")
			return []string{}, nil
		},
	})
	req := httptest.NewRequest(http.MethodGet, "/prometheus/api/v1/labels", nil)
	rec := httptest.NewRecorder()

	h.Labels(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
}

func TestHandlerLabelValues(t *testing.T) {
	testCases := []struct {
		name           string
		labelName      string
		labelValuesFn  func(ctx context.Context, name string, matcherSets [][]*labels.Matcher, start, end time.Time, limit int) ([]string, error)
		expectedStatus int
		expectedType   string
		expectedData   string
	}{
		{
			name:      "ValidName_ReturnsValues",
			labelName: "job",
			labelValuesFn: func(_ context.Context, name string, _ [][]*labels.Matcher, _, _ time.Time, _ int) ([]string, error) {
				assert.Equal(t, "job", name)
				return []string{"api", "worker"}, nil
			},
			expectedStatus: http.StatusOK,
			expectedData:   `["api","worker"]`,
		},
		{
			name:      "InvalidLabelName_RespondsBadData",
			labelName: "",
			labelValuesFn: func(context.Context, string, [][]*labels.Matcher, time.Time, time.Time, int) ([]string, error) {
				t.Fatal("must not query the store")
				return nil, nil
			},
			expectedStatus: http.StatusBadRequest,
			expectedType:   "bad_data",
		},
		{
			name:      "NilResult_EncodesAsEmptyArray",
			labelName: "job",
			labelValuesFn: func(context.Context, string, [][]*labels.Matcher, time.Time, time.Time, int) ([]string, error) {
				return nil, nil
			},
			expectedStatus: http.StatusOK,
			expectedData:   `[]`,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			h := newTestHandler(&fakePrometheus{labelValuesFn: testCase.labelValuesFn})
			req := httptest.NewRequest(http.MethodGet, "/prometheus/api/v1/label/"+testCase.labelName+"/values", nil)
			req = mux.SetURLVars(req, map[string]string{"name": testCase.labelName})
			rec := httptest.NewRecorder()

			h.LabelValues(rec, req)

			assert.Equal(t, testCase.expectedStatus, rec.Code)
			resp := decodeResponse(t, rec)
			if testCase.expectedType != "" {
				assert.Equal(t, "error", resp.Status)
				assert.Equal(t, testCase.expectedType, resp.ErrorType)
			} else {
				assert.Equal(t, "success", resp.Status)
				assert.JSONEq(t, testCase.expectedData, string(resp.Data))
			}
		})
	}
}

func TestHandlerSeries(t *testing.T) {
	testCases := []struct {
		name           string
		query          string
		seriesFn       func(ctx context.Context, matcherSets [][]*labels.Matcher, start, end time.Time, limit int) ([]labels.Labels, error)
		expectedStatus int
		expectedType   string
		expectedData   string
	}{
		{
			name:  "NoMatch_RespondsBadData",
			query: "",
			seriesFn: func(context.Context, [][]*labels.Matcher, time.Time, time.Time, int) ([]labels.Labels, error) {
				t.Fatal("must not query the store")
				return nil, nil
			},
			expectedStatus: http.StatusBadRequest,
			expectedType:   "bad_data",
		},
		{
			name:  "SingleMatch_ReturnsLabelSets",
			query: `match[]={__name__="up"}`,
			seriesFn: func(_ context.Context, matcherSets [][]*labels.Matcher, _, _ time.Time, _ int) ([]labels.Labels, error) {
				require.Len(t, matcherSets, 1)
				return []labels.Labels{labels.FromStrings("__name__", "up", "job", "api")}, nil
			},
			expectedStatus: http.StatusOK,
			expectedData:   `[{"__name__":"up","job":"api"}]`,
		},
		{
			name:  "MultipleMatch_ParsedIntoMultipleGroups",
			query: `match[]={__name__="up"}&match[]={__name__="down"}`,
			seriesFn: func(_ context.Context, matcherSets [][]*labels.Matcher, _, _ time.Time, _ int) ([]labels.Labels, error) {
				require.Len(t, matcherSets, 2)
				return []labels.Labels{}, nil
			},
			expectedStatus: http.StatusOK,
			expectedData:   `[]`,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			h := newTestHandler(&fakePrometheus{seriesFn: testCase.seriesFn})
			req := httptest.NewRequest(http.MethodGet, "/prometheus/api/v1/series?"+testCase.query, nil)
			rec := httptest.NewRecorder()

			h.Series(rec, req)

			assert.Equal(t, testCase.expectedStatus, rec.Code)
			resp := decodeResponse(t, rec)
			if testCase.expectedType != "" {
				assert.Equal(t, "error", resp.Status)
				assert.Equal(t, testCase.expectedType, resp.ErrorType)
			} else {
				assert.Equal(t, "success", resp.Status)
				assert.JSONEq(t, testCase.expectedData, string(resp.Data))
			}
		})
	}
}
