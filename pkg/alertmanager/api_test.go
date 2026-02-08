package alertmanager

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/SigNoz/signoz/pkg/alertmanager/alertmanagertest"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func newTestAPI(t *testing.T) (*API, *alertmanagertest.MockAlertmanager) {
	mockAM := alertmanagertest.NewMockAlertmanager(t)
	api := NewAPI(mockAM)
	return api, mockAM
}

func requestWithClaims(req *http.Request, orgID string) *http.Request {
	ctx := authtypes.NewContextWithClaims(req.Context(), authtypes.Claims{
		OrgID: orgID,
	})
	return req.WithContext(ctx)
}

func decodeSuccessResponse(t *testing.T, rr *httptest.ResponseRecorder, v any) {
	t.Helper()
	var resp struct {
		Status string          `json:"status"`
		Data   json.RawMessage `json:"data"`
	}
	err := json.Unmarshal(rr.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "success", resp.Status)
	if v != nil {
		err = json.Unmarshal(resp.Data, v)
		require.NoError(t, err)
	}
}

// --- ListDowntimeSchedules ---

func TestListDowntimeSchedules_Success(t *testing.T) {
	api, mockAM := newTestAPI(t)
	orgID := "org-123"

	schedules := []*alertmanagertypes.GettablePlannedMaintenance{
		{
			Id:   "sched-1",
			Name: "Weekly maintenance",
			Schedule: &alertmanagertypes.Schedule{
				Timezone: "UTC",
				Recurrence: &alertmanagertypes.Recurrence{
					StartTime:  time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
					Duration:   alertmanagertypes.Duration(2 * time.Hour),
					RepeatType: alertmanagertypes.RepeatTypeWeekly,
					RepeatOn:   []alertmanagertypes.RepeatOn{alertmanagertypes.RepeatOnSunday},
				},
			},
		},
		{
			Id:   "sched-2",
			Name: "One-time maintenance",
			Schedule: &alertmanagertypes.Schedule{
				Timezone:  "UTC",
				StartTime: time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
				EndTime:   time.Date(2024, 6, 1, 4, 0, 0, 0, time.UTC),
			},
		},
	}

	mockAM.On("GetAllPlannedMaintenance", mock.Anything, orgID).Return(schedules, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v2/downtime_schedules", nil)
	req = requestWithClaims(req, orgID)
	rr := httptest.NewRecorder()

	api.ListDowntimeSchedules(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result []*alertmanagertypes.GettablePlannedMaintenance
	decodeSuccessResponse(t, rr, &result)
	assert.Len(t, result, 2)
	assert.Equal(t, "sched-1", result[0].Id)
	assert.Equal(t, "sched-2", result[1].Id)
}

func TestListDowntimeSchedules_EmptyResult(t *testing.T) {
	api, mockAM := newTestAPI(t)
	orgID := "org-123"

	mockAM.On("GetAllPlannedMaintenance", mock.Anything, orgID).Return([]*alertmanagertypes.GettablePlannedMaintenance{}, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v2/downtime_schedules", nil)
	req = requestWithClaims(req, orgID)
	rr := httptest.NewRecorder()

	api.ListDowntimeSchedules(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result []*alertmanagertypes.GettablePlannedMaintenance
	decodeSuccessResponse(t, rr, &result)
	assert.Empty(t, result)
}

func TestListDowntimeSchedules_NoClaims(t *testing.T) {
	api, _ := newTestAPI(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v2/downtime_schedules", nil)
	rr := httptest.NewRecorder()

	api.ListDowntimeSchedules(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestListDowntimeSchedules_StoreError(t *testing.T) {
	api, mockAM := newTestAPI(t)
	orgID := "org-123"

	mockAM.On("GetAllPlannedMaintenance", mock.Anything, orgID).
		Return(([]*alertmanagertypes.GettablePlannedMaintenance)(nil), fmt.Errorf("db error"))

	req := httptest.NewRequest(http.MethodGet, "/api/v2/downtime_schedules", nil)
	req = requestWithClaims(req, orgID)
	rr := httptest.NewRecorder()

	api.ListDowntimeSchedules(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestListDowntimeSchedules_FilterRecurring(t *testing.T) {
	api, mockAM := newTestAPI(t)
	orgID := "org-123"

	schedules := []*alertmanagertypes.GettablePlannedMaintenance{
		{
			Id:   "sched-recurring",
			Name: "Recurring",
			Schedule: &alertmanagertypes.Schedule{
				Timezone: "UTC",
				Recurrence: &alertmanagertypes.Recurrence{
					StartTime:  time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
					Duration:   alertmanagertypes.Duration(2 * time.Hour),
					RepeatType: alertmanagertypes.RepeatTypeDaily,
				},
			},
		},
		{
			Id:   "sched-fixed",
			Name: "Fixed",
			Schedule: &alertmanagertypes.Schedule{
				Timezone:  "UTC",
				StartTime: time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
				EndTime:   time.Date(2024, 6, 1, 4, 0, 0, 0, time.UTC),
			},
		},
	}

	mockAM.On("GetAllPlannedMaintenance", mock.Anything, orgID).Return(schedules, nil)

	// Filter for recurring=true
	req := httptest.NewRequest(http.MethodGet, "/api/v2/downtime_schedules?recurring=true", nil)
	req = requestWithClaims(req, orgID)
	rr := httptest.NewRecorder()

	api.ListDowntimeSchedules(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result []*alertmanagertypes.GettablePlannedMaintenance
	decodeSuccessResponse(t, rr, &result)
	assert.Len(t, result, 1)
	assert.Equal(t, "sched-recurring", result[0].Id)
}

func TestListDowntimeSchedules_FilterNonRecurring(t *testing.T) {
	api, mockAM := newTestAPI(t)
	orgID := "org-123"

	schedules := []*alertmanagertypes.GettablePlannedMaintenance{
		{
			Id:   "sched-recurring",
			Name: "Recurring",
			Schedule: &alertmanagertypes.Schedule{
				Timezone: "UTC",
				Recurrence: &alertmanagertypes.Recurrence{
					StartTime:  time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
					Duration:   alertmanagertypes.Duration(2 * time.Hour),
					RepeatType: alertmanagertypes.RepeatTypeDaily,
				},
			},
		},
		{
			Id:   "sched-fixed",
			Name: "Fixed",
			Schedule: &alertmanagertypes.Schedule{
				Timezone:  "UTC",
				StartTime: time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
				EndTime:   time.Date(2024, 6, 1, 4, 0, 0, 0, time.UTC),
			},
		},
	}

	mockAM.On("GetAllPlannedMaintenance", mock.Anything, orgID).Return(schedules, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v2/downtime_schedules?recurring=false", nil)
	req = requestWithClaims(req, orgID)
	rr := httptest.NewRecorder()

	api.ListDowntimeSchedules(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result []*alertmanagertypes.GettablePlannedMaintenance
	decodeSuccessResponse(t, rr, &result)
	assert.Len(t, result, 1)
	assert.Equal(t, "sched-fixed", result[0].Id)
}

func TestListDowntimeSchedules_FilterActive(t *testing.T) {
	api, mockAM := newTestAPI(t)
	orgID := "org-123"

	now := time.Now().UTC()
	schedules := []*alertmanagertypes.GettablePlannedMaintenance{
		{
			Id:   "sched-active",
			Name: "Currently active",
			Schedule: &alertmanagertypes.Schedule{
				Timezone:  "UTC",
				StartTime: now.Add(-time.Hour),
				EndTime:   now.Add(time.Hour),
			},
		},
		{
			Id:   "sched-expired",
			Name: "Already expired",
			Schedule: &alertmanagertypes.Schedule{
				Timezone:  "UTC",
				StartTime: now.Add(-3 * time.Hour),
				EndTime:   now.Add(-1 * time.Hour),
			},
		},
	}

	mockAM.On("GetAllPlannedMaintenance", mock.Anything, orgID).Return(schedules, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v2/downtime_schedules?active=true", nil)
	req = requestWithClaims(req, orgID)
	rr := httptest.NewRecorder()

	api.ListDowntimeSchedules(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result []*alertmanagertypes.GettablePlannedMaintenance
	decodeSuccessResponse(t, rr, &result)
	assert.Len(t, result, 1)
	assert.Equal(t, "sched-active", result[0].Id)
}

// --- GetDowntimeSchedule ---

func TestGetDowntimeSchedule_Success(t *testing.T) {
	api, mockAM := newTestAPI(t)

	id := valuer.GenerateUUID()
	schedule := &alertmanagertypes.GettablePlannedMaintenance{
		Id:   id.StringValue(),
		Name: "Test schedule",
		Schedule: &alertmanagertypes.Schedule{
			Timezone:  "UTC",
			StartTime: time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
			EndTime:   time.Date(2024, 6, 1, 4, 0, 0, 0, time.UTC),
		},
	}

	mockAM.On("GetPlannedMaintenanceByID", mock.Anything, id).Return(schedule, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v2/downtime_schedules/"+id.StringValue(), nil)
	req = mux.SetURLVars(req, map[string]string{"id": id.StringValue()})
	rr := httptest.NewRecorder()

	api.GetDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result alertmanagertypes.GettablePlannedMaintenance
	decodeSuccessResponse(t, rr, &result)
	assert.Equal(t, id.StringValue(), result.Id)
	assert.Equal(t, "Test schedule", result.Name)
}

func TestGetDowntimeSchedule_InvalidUUID(t *testing.T) {
	api, _ := newTestAPI(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v2/downtime_schedules/not-a-uuid", nil)
	req = mux.SetURLVars(req, map[string]string{"id": "not-a-uuid"})
	rr := httptest.NewRecorder()

	api.GetDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestGetDowntimeSchedule_MissingID(t *testing.T) {
	api, _ := newTestAPI(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v2/downtime_schedules/", nil)
	// No mux vars set
	rr := httptest.NewRecorder()

	api.GetDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestGetDowntimeSchedule_NotFound(t *testing.T) {
	api, mockAM := newTestAPI(t)

	id := valuer.GenerateUUID()
	mockAM.On("GetPlannedMaintenanceByID", mock.Anything, id).
		Return((*alertmanagertypes.GettablePlannedMaintenance)(nil), errors.New(errors.TypeNotFound, errors.CodeNotFound, "not found"))

	req := httptest.NewRequest(http.MethodGet, "/api/v2/downtime_schedules/"+id.StringValue(), nil)
	req = mux.SetURLVars(req, map[string]string{"id": id.StringValue()})
	rr := httptest.NewRecorder()

	api.GetDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

// --- CreateDowntimeSchedule ---

func TestCreateDowntimeSchedule_Success(t *testing.T) {
	api, mockAM := newTestAPI(t)

	newID := valuer.GenerateUUID()
	schedule := alertmanagertypes.GettablePlannedMaintenance{
		Name: "New maintenance",
		Schedule: &alertmanagertypes.Schedule{
			Timezone:  "UTC",
			StartTime: time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
			EndTime:   time.Date(2024, 6, 1, 4, 0, 0, 0, time.UTC),
		},
	}

	mockAM.On("CreatePlannedMaintenance", mock.Anything, mock.MatchedBy(func(m alertmanagertypes.GettablePlannedMaintenance) bool {
		return m.Name == "New maintenance"
	})).Return(newID, nil)

	body, err := json.Marshal(schedule)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/v2/downtime_schedules", bytes.NewReader(body))
	rr := httptest.NewRecorder()

	api.CreateDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestCreateDowntimeSchedule_InvalidJSON(t *testing.T) {
	api, _ := newTestAPI(t)

	req := httptest.NewRequest(http.MethodPost, "/api/v2/downtime_schedules", bytes.NewReader([]byte("{invalid")))
	rr := httptest.NewRecorder()

	api.CreateDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateDowntimeSchedule_ValidationError_MissingName(t *testing.T) {
	api, _ := newTestAPI(t)

	schedule := alertmanagertypes.GettablePlannedMaintenance{
		Name: "",
		Schedule: &alertmanagertypes.Schedule{
			Timezone:  "UTC",
			StartTime: time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
			EndTime:   time.Date(2024, 6, 1, 4, 0, 0, 0, time.UTC),
		},
	}

	body, err := json.Marshal(schedule)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/v2/downtime_schedules", bytes.NewReader(body))
	rr := httptest.NewRecorder()

	api.CreateDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateDowntimeSchedule_ValidationError_MissingSchedule(t *testing.T) {
	api, _ := newTestAPI(t)

	body := []byte(`{"name": "Test", "schedule": null}`)

	req := httptest.NewRequest(http.MethodPost, "/api/v2/downtime_schedules", bytes.NewReader(body))
	rr := httptest.NewRecorder()

	api.CreateDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateDowntimeSchedule_ValidationError_InvalidTimezone(t *testing.T) {
	api, _ := newTestAPI(t)

	// Send raw JSON because json.Marshal on Schedule fails for invalid timezones
	body := []byte(`{
		"name": "Test",
		"schedule": {
			"timezone": "Invalid/Timezone",
			"startTime": "2024-06-01T00:00:00Z",
			"endTime": "2024-06-01T04:00:00Z"
		}
	}`)

	req := httptest.NewRequest(http.MethodPost, "/api/v2/downtime_schedules", bytes.NewReader(body))
	rr := httptest.NewRecorder()

	api.CreateDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateDowntimeSchedule_ValidationError_StartAfterEnd(t *testing.T) {
	api, _ := newTestAPI(t)

	schedule := alertmanagertypes.GettablePlannedMaintenance{
		Name: "Test",
		Schedule: &alertmanagertypes.Schedule{
			Timezone:  "UTC",
			StartTime: time.Date(2024, 6, 2, 0, 0, 0, 0, time.UTC),
			EndTime:   time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
		},
	}

	body, err := json.Marshal(schedule)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/v2/downtime_schedules", bytes.NewReader(body))
	rr := httptest.NewRecorder()

	api.CreateDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateDowntimeSchedule_ValidationError_RecurringMissingRepeatType(t *testing.T) {
	api, _ := newTestAPI(t)

	schedule := alertmanagertypes.GettablePlannedMaintenance{
		Name: "Test",
		Schedule: &alertmanagertypes.Schedule{
			Timezone: "UTC",
			Recurrence: &alertmanagertypes.Recurrence{
				StartTime:  time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
				Duration:   alertmanagertypes.Duration(2 * time.Hour),
				RepeatType: "",
			},
		},
	}

	body, err := json.Marshal(schedule)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/v2/downtime_schedules", bytes.NewReader(body))
	rr := httptest.NewRecorder()

	api.CreateDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateDowntimeSchedule_ValidationError_RecurringMissingDuration(t *testing.T) {
	api, _ := newTestAPI(t)

	schedule := alertmanagertypes.GettablePlannedMaintenance{
		Name: "Test",
		Schedule: &alertmanagertypes.Schedule{
			Timezone: "UTC",
			Recurrence: &alertmanagertypes.Recurrence{
				StartTime:  time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
				Duration:   0,
				RepeatType: alertmanagertypes.RepeatTypeDaily,
			},
		},
	}

	body, err := json.Marshal(schedule)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/v2/downtime_schedules", bytes.NewReader(body))
	rr := httptest.NewRecorder()

	api.CreateDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateDowntimeSchedule_StoreError(t *testing.T) {
	api, mockAM := newTestAPI(t)

	schedule := alertmanagertypes.GettablePlannedMaintenance{
		Name: "New maintenance",
		Schedule: &alertmanagertypes.Schedule{
			Timezone:  "UTC",
			StartTime: time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
			EndTime:   time.Date(2024, 6, 1, 4, 0, 0, 0, time.UTC),
		},
	}

	mockAM.On("CreatePlannedMaintenance", mock.Anything, mock.Anything).
		Return(valuer.UUID{}, fmt.Errorf("db error"))

	body, err := json.Marshal(schedule)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/v2/downtime_schedules", bytes.NewReader(body))
	rr := httptest.NewRecorder()

	api.CreateDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestCreateDowntimeSchedule_WithRecurrence(t *testing.T) {
	api, mockAM := newTestAPI(t)

	newID := valuer.GenerateUUID()
	schedule := alertmanagertypes.GettablePlannedMaintenance{
		Name: "Daily maintenance",
		Schedule: &alertmanagertypes.Schedule{
			Timezone: "America/New_York",
			Recurrence: &alertmanagertypes.Recurrence{
				StartTime:  time.Date(2024, 1, 1, 2, 0, 0, 0, time.UTC),
				Duration:   alertmanagertypes.Duration(2 * time.Hour),
				RepeatType: alertmanagertypes.RepeatTypeDaily,
			},
		},
		Expression: `env == "prod"`,
	}

	mockAM.On("CreatePlannedMaintenance", mock.Anything, mock.MatchedBy(func(m alertmanagertypes.GettablePlannedMaintenance) bool {
		return m.Name == "Daily maintenance" && m.Expression == `env == "prod"`
	})).Return(newID, nil)

	body, err := json.Marshal(schedule)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/v2/downtime_schedules", bytes.NewReader(body))
	rr := httptest.NewRecorder()

	api.CreateDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

// --- EditDowntimeSchedule ---

func TestEditDowntimeSchedule_Success(t *testing.T) {
	api, mockAM := newTestAPI(t)

	id := valuer.GenerateUUID()
	schedule := alertmanagertypes.GettablePlannedMaintenance{
		Name: "Updated maintenance",
		Schedule: &alertmanagertypes.Schedule{
			Timezone:  "UTC",
			StartTime: time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
			EndTime:   time.Date(2024, 6, 1, 4, 0, 0, 0, time.UTC),
		},
	}

	mockAM.On("EditPlannedMaintenance", mock.Anything, mock.MatchedBy(func(m alertmanagertypes.GettablePlannedMaintenance) bool {
		return m.Name == "Updated maintenance"
	}), id).Return(nil)

	body, err := json.Marshal(schedule)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPut, "/api/v2/downtime_schedules/"+id.StringValue(), bytes.NewReader(body))
	req = mux.SetURLVars(req, map[string]string{"id": id.StringValue()})
	rr := httptest.NewRecorder()

	api.EditDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestEditDowntimeSchedule_InvalidUUID(t *testing.T) {
	api, _ := newTestAPI(t)

	body := []byte(`{"name": "test", "schedule": {"timezone": "UTC"}}`)
	req := httptest.NewRequest(http.MethodPut, "/api/v2/downtime_schedules/bad-uuid", bytes.NewReader(body))
	req = mux.SetURLVars(req, map[string]string{"id": "bad-uuid"})
	rr := httptest.NewRecorder()

	api.EditDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestEditDowntimeSchedule_MissingID(t *testing.T) {
	api, _ := newTestAPI(t)

	body := []byte(`{"name": "test", "schedule": {"timezone": "UTC"}}`)
	req := httptest.NewRequest(http.MethodPut, "/api/v2/downtime_schedules/", bytes.NewReader(body))
	rr := httptest.NewRecorder()

	api.EditDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestEditDowntimeSchedule_InvalidJSON(t *testing.T) {
	api, _ := newTestAPI(t)

	id := valuer.GenerateUUID()
	req := httptest.NewRequest(http.MethodPut, "/api/v2/downtime_schedules/"+id.StringValue(), bytes.NewReader([]byte("{bad json")))
	req = mux.SetURLVars(req, map[string]string{"id": id.StringValue()})
	rr := httptest.NewRecorder()

	api.EditDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestEditDowntimeSchedule_ValidationError(t *testing.T) {
	api, _ := newTestAPI(t)

	id := valuer.GenerateUUID()
	schedule := alertmanagertypes.GettablePlannedMaintenance{
		Name:     "",
		Schedule: &alertmanagertypes.Schedule{Timezone: "UTC"},
	}

	body, err := json.Marshal(schedule)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPut, "/api/v2/downtime_schedules/"+id.StringValue(), bytes.NewReader(body))
	req = mux.SetURLVars(req, map[string]string{"id": id.StringValue()})
	rr := httptest.NewRecorder()

	api.EditDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestEditDowntimeSchedule_NotFound(t *testing.T) {
	api, mockAM := newTestAPI(t)

	id := valuer.GenerateUUID()
	schedule := alertmanagertypes.GettablePlannedMaintenance{
		Name: "Updated",
		Schedule: &alertmanagertypes.Schedule{
			Timezone:  "UTC",
			StartTime: time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
			EndTime:   time.Date(2024, 6, 1, 4, 0, 0, 0, time.UTC),
		},
	}

	mockAM.On("EditPlannedMaintenance", mock.Anything, mock.Anything, id).
		Return(errors.New(errors.TypeNotFound, errors.CodeNotFound, "not found"))

	body, err := json.Marshal(schedule)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPut, "/api/v2/downtime_schedules/"+id.StringValue(), bytes.NewReader(body))
	req = mux.SetURLVars(req, map[string]string{"id": id.StringValue()})
	rr := httptest.NewRecorder()

	api.EditDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

// --- DeleteDowntimeSchedule ---

func TestDeleteDowntimeSchedule_Success(t *testing.T) {
	api, mockAM := newTestAPI(t)

	id := valuer.GenerateUUID()
	mockAM.On("DeletePlannedMaintenance", mock.Anything, id).Return(nil)

	req := httptest.NewRequest(http.MethodDelete, "/api/v2/downtime_schedules/"+id.StringValue(), nil)
	req = mux.SetURLVars(req, map[string]string{"id": id.StringValue()})
	rr := httptest.NewRecorder()

	api.DeleteDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
}

func TestDeleteDowntimeSchedule_InvalidUUID(t *testing.T) {
	api, _ := newTestAPI(t)

	req := httptest.NewRequest(http.MethodDelete, "/api/v2/downtime_schedules/not-valid", nil)
	req = mux.SetURLVars(req, map[string]string{"id": "not-valid"})
	rr := httptest.NewRecorder()

	api.DeleteDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestDeleteDowntimeSchedule_MissingID(t *testing.T) {
	api, _ := newTestAPI(t)

	req := httptest.NewRequest(http.MethodDelete, "/api/v2/downtime_schedules/", nil)
	rr := httptest.NewRecorder()

	api.DeleteDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestDeleteDowntimeSchedule_NotFound(t *testing.T) {
	api, mockAM := newTestAPI(t)

	id := valuer.GenerateUUID()
	mockAM.On("DeletePlannedMaintenance", mock.Anything, id).
		Return(errors.New(errors.TypeNotFound, errors.CodeNotFound, "not found"))

	req := httptest.NewRequest(http.MethodDelete, "/api/v2/downtime_schedules/"+id.StringValue(), nil)
	req = mux.SetURLVars(req, map[string]string{"id": id.StringValue()})
	rr := httptest.NewRecorder()

	api.DeleteDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestDeleteDowntimeSchedule_StoreError(t *testing.T) {
	api, mockAM := newTestAPI(t)

	id := valuer.GenerateUUID()
	mockAM.On("DeletePlannedMaintenance", mock.Anything, id).
		Return(fmt.Errorf("db error"))

	req := httptest.NewRequest(http.MethodDelete, "/api/v2/downtime_schedules/"+id.StringValue(), nil)
	req = mux.SetURLVars(req, map[string]string{"id": id.StringValue()})
	rr := httptest.NewRecorder()

	api.DeleteDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// --- Validate edge cases ---

func TestCreateDowntimeSchedule_EmptyBody(t *testing.T) {
	api, _ := newTestAPI(t)

	req := httptest.NewRequest(http.MethodPost, "/api/v2/downtime_schedules", bytes.NewReader([]byte("")))
	rr := httptest.NewRecorder()

	api.CreateDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestEditDowntimeSchedule_RecurrenceEndBeforeStart(t *testing.T) {
	api, _ := newTestAPI(t)

	id := valuer.GenerateUUID()
	endTime := time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)
	schedule := alertmanagertypes.GettablePlannedMaintenance{
		Name: "Test",
		Schedule: &alertmanagertypes.Schedule{
			Timezone: "UTC",
			Recurrence: &alertmanagertypes.Recurrence{
				StartTime:  time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
				EndTime:    &endTime,
				Duration:   alertmanagertypes.Duration(2 * time.Hour),
				RepeatType: alertmanagertypes.RepeatTypeDaily,
			},
		},
	}

	body, err := json.Marshal(schedule)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPut, "/api/v2/downtime_schedules/"+id.StringValue(), bytes.NewReader(body))
	req = mux.SetURLVars(req, map[string]string{"id": id.StringValue()})
	rr := httptest.NewRecorder()

	api.EditDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCreateDowntimeSchedule_WeeklyWithRepeatOn(t *testing.T) {
	api, mockAM := newTestAPI(t)

	newID := valuer.GenerateUUID()
	schedule := alertmanagertypes.GettablePlannedMaintenance{
		Name: "Weekly Mon/Wed",
		Schedule: &alertmanagertypes.Schedule{
			Timezone: "UTC",
			Recurrence: &alertmanagertypes.Recurrence{
				StartTime:  time.Date(2024, 1, 1, 10, 0, 0, 0, time.UTC),
				Duration:   alertmanagertypes.Duration(2 * time.Hour),
				RepeatType: alertmanagertypes.RepeatTypeWeekly,
				RepeatOn:   []alertmanagertypes.RepeatOn{alertmanagertypes.RepeatOnMonday, alertmanagertypes.RepeatOnWednesday},
			},
		},
	}

	mockAM.On("CreatePlannedMaintenance", mock.Anything, mock.Anything).Return(newID, nil)

	body, err := json.Marshal(schedule)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/v2/downtime_schedules", bytes.NewReader(body))
	rr := httptest.NewRecorder()

	api.CreateDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestCreateDowntimeSchedule_WithExpression(t *testing.T) {
	api, mockAM := newTestAPI(t)

	newID := valuer.GenerateUUID()
	schedule := alertmanagertypes.GettablePlannedMaintenance{
		Name: "Expression-scoped maintenance",
		Schedule: &alertmanagertypes.Schedule{
			Timezone:  "UTC",
			StartTime: time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
			EndTime:   time.Date(2024, 6, 1, 4, 0, 0, 0, time.UTC),
		},
		Expression: `env == "prod" && severity == "critical"`,
	}

	mockAM.On("CreatePlannedMaintenance", mock.Anything, mock.MatchedBy(func(m alertmanagertypes.GettablePlannedMaintenance) bool {
		return m.Name == "Expression-scoped maintenance" && m.Expression == `env == "prod" && severity == "critical"`
	})).Return(newID, nil)

	body, err := json.Marshal(schedule)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/v2/downtime_schedules", bytes.NewReader(body))
	rr := httptest.NewRecorder()

	api.CreateDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestCreateDowntimeSchedule_WithComplexExpression(t *testing.T) {
	api, mockAM := newTestAPI(t)

	newID := valuer.GenerateUUID()
	schedule := alertmanagertypes.GettablePlannedMaintenance{
		Name: "Complex expression maintenance",
		Schedule: &alertmanagertypes.Schedule{
			Timezone:  "UTC",
			StartTime: time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
			EndTime:   time.Date(2024, 6, 1, 4, 0, 0, 0, time.UTC),
		},
		Expression: `env == "prod" && severity == "critical"`,
	}

	mockAM.On("CreatePlannedMaintenance", mock.Anything, mock.MatchedBy(func(m alertmanagertypes.GettablePlannedMaintenance) bool {
		return m.Expression == `env == "prod" && severity == "critical"`
	})).Return(newID, nil)

	body, err := json.Marshal(schedule)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/v2/downtime_schedules", bytes.NewReader(body))
	rr := httptest.NewRecorder()

	api.CreateDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestCreateDowntimeSchedule_ValidationError_InvalidExpression(t *testing.T) {
	api, _ := newTestAPI(t)

	body := []byte(`{
		"name": "Test",
		"schedule": {
			"timezone": "UTC",
			"startTime": "2024-06-01T00:00:00Z",
			"endTime": "2024-06-01T04:00:00Z"
		},
		"expression": "env ==== \"prod\""
	}`)

	req := httptest.NewRequest(http.MethodPost, "/api/v2/downtime_schedules", bytes.NewReader(body))
	rr := httptest.NewRecorder()

	api.CreateDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestEditDowntimeSchedule_WithExpression(t *testing.T) {
	api, mockAM := newTestAPI(t)

	id := valuer.GenerateUUID()
	schedule := alertmanagertypes.GettablePlannedMaintenance{
		Name: "Updated with expression",
		Schedule: &alertmanagertypes.Schedule{
			Timezone:  "UTC",
			StartTime: time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC),
			EndTime:   time.Date(2024, 6, 1, 4, 0, 0, 0, time.UTC),
		},
		Expression: `env == "staging"`,
	}

	mockAM.On("EditPlannedMaintenance", mock.Anything, mock.MatchedBy(func(m alertmanagertypes.GettablePlannedMaintenance) bool {
		return m.Expression == `env == "staging"`
	}), id).Return(nil)

	body, err := json.Marshal(schedule)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPut, "/api/v2/downtime_schedules/"+id.StringValue(), bytes.NewReader(body))
	req = mux.SetURLVars(req, map[string]string{"id": id.StringValue()})
	rr := httptest.NewRecorder()

	api.EditDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestCreateDowntimeSchedule_MonthlyRecurrence(t *testing.T) {
	api, mockAM := newTestAPI(t)

	newID := valuer.GenerateUUID()
	schedule := alertmanagertypes.GettablePlannedMaintenance{
		Name: "Monthly maintenance",
		Schedule: &alertmanagertypes.Schedule{
			Timezone: "Europe/London",
			Recurrence: &alertmanagertypes.Recurrence{
				StartTime:  time.Date(2024, 1, 15, 22, 0, 0, 0, time.UTC),
				Duration:   alertmanagertypes.Duration(4 * time.Hour),
				RepeatType: alertmanagertypes.RepeatTypeMonthly,
			},
		},
	}

	mockAM.On("CreatePlannedMaintenance", mock.Anything, mock.Anything).Return(newID, nil)

	body, err := json.Marshal(schedule)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/v2/downtime_schedules", bytes.NewReader(body))
	rr := httptest.NewRecorder()

	api.CreateDowntimeSchedule(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

// --- GetRuleStateHistoryTimeline ---

func validQueryParams() alertmanagertypes.QueryRuleStateHistory {
	return alertmanagertypes.QueryRuleStateHistory{
		Start:  1700000000000,
		End:    1700003600000,
		Offset: 0,
		Limit:  10,
		Order:  alertmanagertypes.SortOrderDesc,
	}
}

func TestGetRuleStateHistoryTimeline_Success(t *testing.T) {
	api, mockAM := newTestAPI(t)
	orgID := "org-123"
	ruleID := "rule-1"

	timeline := &alertmanagertypes.RuleStateTimeline{
		Items: []alertmanagertypes.RuleStateHistory{
			{RuleID: ruleID, State: "firing", UnixMilli: 1700000100000, Fingerprint: 111},
			{RuleID: ruleID, State: "inactive", UnixMilli: 1700000200000, Fingerprint: 111},
		},
		Total:  2,
		Labels: map[string][]string{"env": {"prod"}},
	}

	mockAM.On("GetRuleStateHistoryTimeline", mock.Anything, orgID, ruleID, mock.Anything).Return(timeline, nil)

	params := validQueryParams()
	body, _ := json.Marshal(params)
	req := httptest.NewRequest(http.MethodPost, "/api/v2/rules/"+ruleID+"/history/timeline", bytes.NewReader(body))
	req = requestWithClaims(req, orgID)
	req = mux.SetURLVars(req, map[string]string{"id": ruleID})
	rr := httptest.NewRecorder()

	api.GetRuleStateHistoryTimeline(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result alertmanagertypes.RuleStateTimeline
	decodeSuccessResponse(t, rr, &result)
	assert.Len(t, result.Items, 2)
	assert.Equal(t, uint64(2), result.Total)
	assert.Equal(t, []string{"prod"}, result.Labels["env"])
}

// --- GetRuleStats ---

func TestGetRuleStats_Success(t *testing.T) {
	api, mockAM := newTestAPI(t)
	orgID := "org-123"
	ruleID := "rule-1"

	stats := &alertmanagertypes.RuleStats{
		TotalCurrentTriggers:     5,
		TotalPastTriggers:        3,
		CurrentAvgResolutionTime: 120.5,
		PastAvgResolutionTime:    90.0,
	}

	mockAM.On("GetRuleStats", mock.Anything, orgID, ruleID, mock.Anything).Return(stats, nil)

	params := validQueryParams()
	body, _ := json.Marshal(params)
	req := httptest.NewRequest(http.MethodPost, "/api/v2/rules/"+ruleID+"/history/stats", bytes.NewReader(body))
	req = requestWithClaims(req, orgID)
	req = mux.SetURLVars(req, map[string]string{"id": ruleID})
	rr := httptest.NewRecorder()

	api.GetRuleStats(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result alertmanagertypes.RuleStats
	decodeSuccessResponse(t, rr, &result)
	assert.Equal(t, uint64(5), result.TotalCurrentTriggers)
	assert.Equal(t, uint64(3), result.TotalPastTriggers)
	assert.Equal(t, 120.5, result.CurrentAvgResolutionTime)
}

// --- GetRuleStateHistoryTopContributors ---

func TestGetRuleStateHistoryTopContributors_Success(t *testing.T) {
	api, mockAM := newTestAPI(t)
	orgID := "org-123"
	ruleID := "rule-1"

	contributors := []alertmanagertypes.RuleStateHistoryContributor{
		{Fingerprint: 111, Labels: `{"host":"server-1"}`, Count: 10},
		{Fingerprint: 222, Labels: `{"host":"server-2"}`, Count: 5},
	}

	mockAM.On("GetRuleStateHistoryTopContributors", mock.Anything, orgID, ruleID, mock.Anything).Return(contributors, nil)

	params := validQueryParams()
	body, _ := json.Marshal(params)
	req := httptest.NewRequest(http.MethodPost, "/api/v2/rules/"+ruleID+"/history/top_contributors", bytes.NewReader(body))
	req = requestWithClaims(req, orgID)
	req = mux.SetURLVars(req, map[string]string{"id": ruleID})
	rr := httptest.NewRecorder()

	api.GetRuleStateHistoryTopContributors(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result []alertmanagertypes.RuleStateHistoryContributor
	decodeSuccessResponse(t, rr, &result)
	assert.Len(t, result, 2)
	assert.Equal(t, uint64(10), result[0].Count)
	assert.Equal(t, uint64(5), result[1].Count)
}

// --- GetOverallStateTransitions ---

func TestGetOverallStateTransitions_Success(t *testing.T) {
	api, mockAM := newTestAPI(t)
	orgID := "org-123"
	ruleID := "rule-1"

	transitions := []alertmanagertypes.RuleStateTransition{
		{State: alertmanagertypes.AlertStateFiring, Start: 1700000000000, End: 1700001800000},
		{State: alertmanagertypes.AlertStateInactive, Start: 1700001800000, End: 1700003600000},
	}

	mockAM.On("GetOverallStateTransitions", mock.Anything, orgID, ruleID, mock.Anything).Return(transitions, nil)

	params := validQueryParams()
	body, _ := json.Marshal(params)
	req := httptest.NewRequest(http.MethodPost, "/api/v2/rules/"+ruleID+"/history/overall_status", bytes.NewReader(body))
	req = requestWithClaims(req, orgID)
	req = mux.SetURLVars(req, map[string]string{"id": ruleID})
	rr := httptest.NewRecorder()

	api.GetOverallStateTransitions(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var result []alertmanagertypes.RuleStateTransition
	decodeSuccessResponse(t, rr, &result)
	assert.Len(t, result, 2)
	assert.Equal(t, "firing", result[0].State.StringValue())
	assert.Equal(t, "inactive", result[1].State.StringValue())
}

