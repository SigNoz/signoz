package app

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
)

func TestPrepareQuery(t *testing.T) {
	type testCase struct {
		name        string
		postData    *model.DashboardVars
		query       string
		expectedErr bool
		errMsg      string
	}

	testCases := []testCase{
		{
			name: "test empty query",
			postData: &model.DashboardVars{
				Query: "",
			},
			expectedErr: true,
			errMsg:      "query is required",
		},
		{
			name: "test query with no variables",
			postData: &model.DashboardVars{
				Query: "select * from table",
			},
			expectedErr: false,
			query:       "select * from table",
		},
		{
			name: "test query with variables",
			postData: &model.DashboardVars{
				Query: "select * from table where id = {{.id}}",
				Variables: map[string]interface{}{
					"id": "1",
				},
			},
			query:       "select * from table where id = '1'",
			expectedErr: false,
		},
		// While this does seem like it should throw error, it shouldn't because empty value is a valid value
		// for certain scenarios and should be treated as such.
		{
			name: "test query with variables and no value",
			postData: &model.DashboardVars{
				Query: "select * from table where id = {{.id}}",
				Variables: map[string]interface{}{
					"id": "",
				},
			},
			query:       "select * from table where id = ''",
			expectedErr: false,
		},
		{
			name: "query contains alter table",
			postData: &model.DashboardVars{
				Query: "ALTER TABLE signoz_table DELETE where true",
			},
			expectedErr: true,
			errMsg:      "operation alter table is not allowed",
		},
		{
			name: "query text produces template exec error",
			postData: &model.DashboardVars{
				Query: "SELECT durationNano from signoz_traces.signoz_index_v2 WHERE id = {{if .X}}1{{else}}2{{else}}3{{end}}",
			},
			expectedErr: true,
			errMsg:      "expected end; found {{else}}",
		},
		{
			name: "variables contain array",
			postData: &model.DashboardVars{
				Query: "SELECT operation FROM table WHERE serviceName IN {{.serviceName}}",
				Variables: map[string]interface{}{
					"serviceName": []string{"frontend", "route"},
				},
			},
			query: "SELECT operation FROM table WHERE serviceName IN ['frontend','route']",
		},
		{
			name: "query uses mixed types of variables",
			postData: &model.DashboardVars{
				Query: "SELECT body FROM table Where id = {{.id}} AND elapsed_time >= {{.elapsed_time}} AND serviceName IN {{.serviceName}}",
				Variables: map[string]interface{}{
					"serviceName":  []string{"frontend", "route"},
					"id":           "id",
					"elapsed_time": 1.24,
				},
			},
			query: "SELECT body FROM table Where id = 'id' AND elapsed_time >= 1.240000 AND serviceName IN ['frontend','route']",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			var b bytes.Buffer
			err := json.NewEncoder(&b).Encode(tc.postData)
			if err != nil {
				t.Fatal(err)
			}

			req := httptest.NewRequest(http.MethodPost, "/api/v2/variables/query", &b)
			query, err := prepareQuery(req)

			if tc.expectedErr {
				if err == nil {
					t.Errorf("expected error, but got nil")
				}
				if !strings.Contains(err.Error(), tc.errMsg) {
					t.Errorf("expected error message contain: %s, but got: %s", tc.errMsg, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("expected no error, but got: %s", err.Error())
				}
				if query != tc.query {
					t.Errorf("expected query: %s, but got: %s", tc.query, query)
				}
			}
		})
	}
}

func TestGetRuleStats_InvalidUUID(t *testing.T) {
	reqCases := []struct {
		desc           string
		ruleID         string
		expectedStatus int
	}{
		{
			desc:           "SQL Injection payload",
			ruleID:         "123' OR 1=1 --",
			expectedStatus: http.StatusBadRequest,
		},
		{
			desc:           "Malformed text",
			ruleID:         "not-a-valid-uuid",
			expectedStatus: http.StatusBadRequest,
		},
		{
			desc:           "Empty string",
			ruleID:         " ",
			expectedStatus: http.StatusBadRequest,
		},
	}

	aH := &APIHandler{}

	for _, reqCase := range reqCases {
		t.Run(reqCase.desc, func(t *testing.T) {
			var b bytes.Buffer
			_ = json.NewEncoder(&b).Encode(model.QueryRuleStateHistory{})

			req := httptest.NewRequest("POST", "/api/v1/rules/dummy-id/history/stats", &b)

			req = mux.SetURLVars(req, map[string]string{"id": reqCase.ruleID})

			rr := httptest.NewRecorder()
			aH.getRuleStats(rr, req)

			assert.Equal(t, reqCase.expectedStatus, rr.Code)
		})
	}
}
