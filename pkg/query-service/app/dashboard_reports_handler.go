package app

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/SigNoz/signoz/pkg/dashboardreports"
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	dashboardreporttypes "github.com/SigNoz/signoz/pkg/types/dashboardreporttypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

func (aH *APIHandler) listScheduledReportSchedules(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}

	dashboardIDParam := strings.TrimSpace(r.URL.Query().Get("dashboardId"))
	var dashboardID *valuer.UUID
	if dashboardIDParam != "" {
		id, err := valuer.NewUUID(dashboardIDParam)
		if err != nil {
			render.Error(w, err)
			return
		}
		dashboardID = &id
	}

	store := dashboardreports.NewScheduledReportsStore(aH.Signoz.SQLStore)
	reports, err := store.ListScheduledReports(r.Context(), claims.OrgID, dashboardID)
	if err != nil {
		render.Error(w, err)
		return
	}

	aH.Respond(w, reports)
}

func (aH *APIHandler) getScheduledReportSchedule(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}

	idStr := mux.Vars(r)["id"]
	id, err := valuer.NewUUID(idStr)
	if err != nil {
		render.Error(w, err)
		return
	}

	store := dashboardreports.NewScheduledReportsStore(aH.Signoz.SQLStore)
	report, err := store.GetScheduledReportByID(r.Context(), claims.OrgID, id)
	if err != nil {
		render.Error(w, err)
		return
	}

	aH.Respond(w, report)
}

func (aH *APIHandler) createScheduledReportSchedule(w http.ResponseWriter, r *http.Request) {
	var postable dashboardreporttypes.PostableScheduledDashboardReport
	if err := json.NewDecoder(r.Body).Decode(&postable); err != nil {
		render.Error(w, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, err.Error()))
		return
	}

	postable.Name = strings.TrimSpace(postable.Name)
	if postable.Name == "" {
		render.Error(w, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "name must be non-empty"))
		return
	}

	if postable.DashboardID.IsZero() {
		render.Error(w, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "dashboardId must be set to a valid non-zero UUID"))
		return
	}

	// Minimal validation: ensure recipients is a non-empty slice.
	normalizedRecipients := make(dashboardreporttypes.DashboardReportRecipients, 0, len(postable.Recipients))
	for _, recipient := range postable.Recipients {
		trimmed := strings.TrimSpace(recipient)
		if trimmed != "" {
			normalizedRecipients = append(normalizedRecipients, trimmed)
		}
	}
	if len(normalizedRecipients) == 0 {
		render.Error(w, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "recipients must be non-empty"))
		return
	}
	postable.Recipients = normalizedRecipients

	switch postable.Schedule.Frequency {
	case dashboardreporttypes.DashboardReportScheduleFrequencyDaily,
		dashboardreporttypes.DashboardReportScheduleFrequencyWeekly,
		dashboardreporttypes.DashboardReportScheduleFrequencyMonthly:
		// ok
	default:
		render.Error(w, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "schedule.frequency must be one of daily/weekly/monthly"))
		return
	}

	if strings.TrimSpace(postable.Schedule.Timezone) == "" {
		postable.Schedule.Timezone = "UTC"
	}

	if !postable.TimeRange.StartOffset.IsPositive() {
		render.Error(w, errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, "timeRange.startOffset must be > 0"))
		return
	}

	store := dashboardreports.NewScheduledReportsStore(aH.Signoz.SQLStore)
	report, err := store.CreateScheduledReport(r.Context(), postable)
	if err != nil {
		render.Error(w, err)
		return
	}

	aH.Respond(w, report)
}

func (aH *APIHandler) deleteScheduledReportSchedule(w http.ResponseWriter, r *http.Request) {
	claims, err := authtypes.ClaimsFromContext(r.Context())
	if err != nil {
		render.Error(w, err)
		return
	}

	idStr := mux.Vars(r)["id"]
	id, err := valuer.NewUUID(idStr)
	if err != nil {
		render.Error(w, err)
		return
	}

	store := dashboardreports.NewScheduledReportsStore(aH.Signoz.SQLStore)
	if err := store.DeleteScheduledReport(r.Context(), claims.OrgID, id); err != nil {
		render.Error(w, err)
		return
	}

	aH.Respond(w, nil)
}
