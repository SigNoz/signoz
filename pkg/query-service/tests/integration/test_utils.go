package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"runtime/debug"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/open-telemetry/opentelemetry-collector-contrib/pkg/stanza/entry"
	mockhouse "github.com/srikanthccv/ClickHouse-go-mock"
	"github.com/stretchr/testify/require"
	"go.signoz.io/signoz/pkg/query-service/app"
	"go.signoz.io/signoz/pkg/query-service/app/clickhouseReader"
	"go.signoz.io/signoz/pkg/query-service/auth"
	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/dao"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.signoz.io/signoz/pkg/query-service/model"
	"go.signoz.io/signoz/pkg/types/authtypes"
	"golang.org/x/exp/maps"
)

var jwt = authtypes.NewJWT("secret", 1*time.Hour, 2*time.Hour)

func NewMockClickhouseReader(
	t *testing.T, testDB *sqlx.DB, featureFlags interfaces.FeatureLookup,
) (
	*clickhouseReader.ClickHouseReader, mockhouse.ClickConnMockCommon,
) {
	require.NotNil(t, testDB)

	mockDB, err := mockhouse.NewClickHouseWithQueryMatcher(nil, sqlmock.QueryMatcherRegexp)

	require.Nil(t, err, "could not init mock clickhouse")
	reader := clickhouseReader.NewReaderFromClickhouseConnection(
		mockDB,
		clickhouseReader.NewOptions("", ""),
		testDB,
		"",
		featureFlags,
		"",
		true,
		true,
		time.Duration(time.Second),
		nil,
	)

	return reader, mockDB
}

func addLogsQueryExpectation(
	mockClickhouse mockhouse.ClickConnMockCommon,
	logsToReturn []model.SignozLog,
) {
	cols := []mockhouse.ColumnType{}
	cols = append(cols, mockhouse.ColumnType{Type: "UInt64", Name: "timestamp"})
	cols = append(cols, mockhouse.ColumnType{Type: "UInt64", Name: "observed_timestamp"})
	cols = append(cols, mockhouse.ColumnType{Type: "String", Name: "id"})
	cols = append(cols, mockhouse.ColumnType{Type: "String", Name: "trace_id"})
	cols = append(cols, mockhouse.ColumnType{Type: "String", Name: "span_id"})
	cols = append(cols, mockhouse.ColumnType{Type: "UInt32", Name: "trace_flags"})
	cols = append(cols, mockhouse.ColumnType{Type: "String", Name: "severity_text"})
	cols = append(cols, mockhouse.ColumnType{Type: "UInt8", Name: "severity_number"})
	cols = append(cols, mockhouse.ColumnType{Type: "String", Name: "body"})
	cols = append(cols, mockhouse.ColumnType{Type: "Array(String)", Name: "resources_string_key"})
	cols = append(cols, mockhouse.ColumnType{Type: "Array(String)", Name: "resources_string_value"})
	cols = append(cols, mockhouse.ColumnType{Type: "Array(String)", Name: "attributes_string_key"})
	cols = append(cols, mockhouse.ColumnType{Type: "Array(String)", Name: "attributes_string_value"})
	cols = append(cols, mockhouse.ColumnType{Type: "Array(String)", Name: "attributes_int64_key"})
	cols = append(cols, mockhouse.ColumnType{Type: "Array(Int64)", Name: "attributes_int64_value"})
	cols = append(cols, mockhouse.ColumnType{Type: "Array(String)", Name: "attributes_float64_key"})
	cols = append(cols, mockhouse.ColumnType{Type: "Array(Float64)", Name: "attributes_float64_value"})
	cols = append(cols, mockhouse.ColumnType{Type: "Array(String)", Name: "attributes_bool_key"})
	cols = append(cols, mockhouse.ColumnType{Type: "Array(Bool)", Name: "attributes_bool_value"})

	values := [][]any{}
	for _, l := range logsToReturn {
		rowValues := []any{}
		rowValues = append(rowValues, l.Timestamp)
		rowValues = append(rowValues, l.Timestamp)
		rowValues = append(rowValues, l.ID)
		rowValues = append(rowValues, l.TraceID)
		rowValues = append(rowValues, l.SpanID)
		rowValues = append(rowValues, l.TraceFlags)
		rowValues = append(rowValues, l.SeverityText)
		rowValues = append(rowValues, l.SeverityNumber)
		rowValues = append(rowValues, l.Body)
		rowValues = append(rowValues, maps.Keys(l.Resources_string))
		rowValues = append(rowValues, maps.Values(l.Resources_string))
		rowValues = append(rowValues, maps.Keys(l.Attributes_string))
		rowValues = append(rowValues, maps.Values(l.Attributes_string))
		rowValues = append(rowValues, maps.Keys(l.Attributes_int64))
		rowValues = append(rowValues, maps.Values(l.Attributes_int64))
		rowValues = append(rowValues, maps.Keys(l.Attributes_float64))
		rowValues = append(rowValues, maps.Values(l.Attributes_float64))
		rowValues = append(rowValues, maps.Keys(l.Attributes_bool))
		rowValues = append(rowValues, maps.Values(l.Attributes_bool))
		values = append(values, rowValues)
	}

	rows := mockhouse.NewRows(cols, values)
	mockClickhouse.ExpectQuery(
		"SELECT .*? from signoz_logs.distributed_logs.*",
	).WillReturnRows(rows)
}

func makeTestSignozLog(
	body string,
	attributes map[string]interface{},
) model.SignozLog {

	testLog := model.SignozLog{
		Timestamp:          uint64(time.Now().UnixNano()),
		Body:               body,
		Attributes_bool:    map[string]bool{},
		Attributes_string:  map[string]string{},
		Attributes_int64:   map[string]int64{},
		Attributes_float64: map[string]float64{},
		Resources_string:   map[string]string{},
		SeverityText:       entry.Info.String(),
		SeverityNumber:     uint8(entry.Info),
		SpanID:             uuid.New().String(),
		TraceID:            uuid.New().String(),
	}

	for k, v := range attributes {
		switch v := v.(type) {
		case bool:
			testLog.Attributes_bool[k] = v
		case string:
			testLog.Attributes_string[k] = v
		case int:
			testLog.Attributes_int64[k] = int64(v)
		case float64:
			testLog.Attributes_float64[k] = v
		default:
			panic(fmt.Sprintf("found attribute value of unsupported type %T in test log", v))
		}
	}

	return testLog
}

func createTestUser() (*model.User, *model.ApiError) {
	// Create a test user for auth
	ctx := context.Background()
	org, apiErr := dao.DB().CreateOrg(ctx, &model.Organization{
		Name: "test",
	})
	if apiErr != nil {
		return nil, apiErr
	}

	group, apiErr := dao.DB().GetGroupByName(ctx, constants.AdminGroup)
	if apiErr != nil {
		return nil, apiErr
	}

	auth.InitAuthCache(ctx)

	userId := uuid.NewString()
	return dao.DB().CreateUser(
		ctx,
		&model.User{
			Id:       userId,
			Name:     "test",
			Email:    userId[:8] + "test@test.com",
			Password: "test",
			OrgId:    org.Id,
			GroupId:  group.ID,
		},
		true,
	)
}

func AuthenticatedRequestForTest(
	user *model.User,
	path string,
	postData interface{},
) (*http.Request, error) {
	userJwt, err := auth.GenerateJWTForUser(user, jwt)
	if err != nil {
		return nil, err
	}

	var req *http.Request

	if postData != nil {
		var body bytes.Buffer
		err = json.NewEncoder(&body).Encode(postData)
		if err != nil {
			return nil, err
		}
		req = httptest.NewRequest(http.MethodPost, path, &body)
	} else {
		req = httptest.NewRequest(http.MethodGet, path, nil)
	}

	req.Header.Add("Authorization", "Bearer "+userJwt.AccessJwt)
	return req, nil
}

func HandleTestRequest(handler http.Handler, req *http.Request, expectedStatus int) (*app.ApiResponse, error) {
	respWriter := httptest.NewRecorder()
	handler.ServeHTTP(respWriter, req)
	response := respWriter.Result()
	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, fmt.Errorf("couldn't read response body received from QS: %w", err)
	}

	if response.StatusCode != expectedStatus {
		return nil, fmt.Errorf(
			"unexpected response status from query service for path %s. status: %d, body: %v\n%v",
			req.URL.Path, response.StatusCode, string(responseBody), string(debug.Stack()),
		)
	}

	var result app.ApiResponse
	err = json.Unmarshal(responseBody, &result)
	if err != nil {
		return nil, fmt.Errorf(
			"Could not unmarshal QS response into an ApiResponse.\nResponse body: %s",
			string(responseBody),
		)
	}

	return &result, nil
}
