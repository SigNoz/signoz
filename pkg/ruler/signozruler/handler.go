package signozruler

import (
	"context"
	"io"
	"net/http"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/binding"
	"github.com/SigNoz/signoz/pkg/http/render"
	"github.com/SigNoz/signoz/pkg/ruler"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/SigNoz/signoz/pkg/types/ruletypes"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/gorilla/mux"
)

type handler struct {
	ruler ruler.Ruler
}

func NewHandler(ruler ruler.Ruler) ruler.Handler {
	return &handler{ruler: ruler}
}

func (handler *handler) ListRules(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	rules, err := handler.ruler.ListRuleStates(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	view := make([]*ruletypes.Rule, 0, len(rules.Rules))
	for _, rule := range rules.Rules {
		view = append(view, ruletypes.NewRule(rule))
	}

	render.Success(rw, http.StatusOK, view)
}

func (handler *handler) GetRuleByID(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	id, err := valuer.NewUUID(mux.Vars(req)["id"])
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}

	rule, err := handler.ruler.GetRule(ctx, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, ruletypes.NewRule(rule))
}

func (handler *handler) CreateRule(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	body, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer req.Body.Close() //nolint:errcheck

	rule, err := handler.ruler.CreateRule(ctx, string(body))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, ruletypes.NewRule(rule))
}

func (handler *handler) UpdateRuleByID(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	id, err := valuer.NewUUID(mux.Vars(req)["id"])
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}

	body, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer req.Body.Close() //nolint:errcheck

	err = handler.ruler.EditRule(ctx, string(body), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) DeleteRuleByID(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	id, err := valuer.NewUUID(mux.Vars(req)["id"])
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}

	err = handler.ruler.DeleteRule(ctx, id.StringValue())
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) PatchRuleByID(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	id, err := valuer.NewUUID(mux.Vars(req)["id"])
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}

	body, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer req.Body.Close() //nolint:errcheck

	rule, err := handler.ruler.PatchRule(ctx, string(body), id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, ruletypes.NewRule(rule))
}

func (handler *handler) TestRule(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 1*time.Minute)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	orgID, err := valuer.NewUUID(claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	body, err := io.ReadAll(req.Body)
	if err != nil {
		render.Error(rw, err)
		return
	}
	defer req.Body.Close() //nolint:errcheck

	alertCount, err := handler.ruler.TestNotification(ctx, orgID, string(body))
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, ruletypes.GettableTestRule{AlertCount: alertCount, Message: "notification sent"})
}

func (handler *handler) ListDowntimeSchedules(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		render.Error(rw, err)
		return
	}

	var params ruletypes.ListPlannedMaintenanceParams
	if err := binding.Query.BindQuery(req.URL.Query(), &params); err != nil {
		render.Error(rw, err)
		return
	}

	schedules, err := handler.ruler.MaintenanceStore().ListPlannedMaintenance(ctx, claims.OrgID)
	if err != nil {
		render.Error(rw, err)
		return
	}

	if params.Active != nil {
		activeSchedules := make([]*ruletypes.PlannedMaintenance, 0)
		for _, schedule := range schedules {
			now := time.Now().In(time.FixedZone(schedule.Schedule.Timezone, 0))
			if schedule.IsActive(now) == *params.Active {
				activeSchedules = append(activeSchedules, schedule)
			}
		}
		schedules = activeSchedules
	}

	if params.Recurring != nil {
		recurringSchedules := make([]*ruletypes.PlannedMaintenance, 0)
		for _, schedule := range schedules {
			if schedule.IsRecurring() == *params.Recurring {
				recurringSchedules = append(recurringSchedules, schedule)
			}
		}
		schedules = recurringSchedules
	}

	render.Success(rw, http.StatusOK, schedules)
}

func (handler *handler) GetDowntimeScheduleByID(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	id, err := valuer.NewUUID(mux.Vars(req)["id"])
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}

	schedule, err := handler.ruler.MaintenanceStore().GetPlannedMaintenanceByID(ctx, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusOK, schedule)
}

func (handler *handler) CreateDowntimeSchedule(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	schedule := new(ruletypes.PostablePlannedMaintenance)
	if err := binding.JSON.BindBody(req.Body, schedule); err != nil {
		render.Error(rw, err)
		return
	}

	if err := schedule.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	created, err := handler.ruler.MaintenanceStore().CreatePlannedMaintenance(ctx, schedule)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusCreated, created)
}

func (handler *handler) UpdateDowntimeScheduleByID(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	id, err := valuer.NewUUID(mux.Vars(req)["id"])
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}

	schedule := new(ruletypes.PostablePlannedMaintenance)
	if err := binding.JSON.BindBody(req.Body, schedule); err != nil {
		render.Error(rw, err)
		return
	}

	if err := schedule.Validate(); err != nil {
		render.Error(rw, err)
		return
	}

	err = handler.ruler.MaintenanceStore().UpdatePlannedMaintenance(ctx, schedule, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}

func (handler *handler) DeleteDowntimeScheduleByID(rw http.ResponseWriter, req *http.Request) {
	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	id, err := valuer.NewUUID(mux.Vars(req)["id"])
	if err != nil {
		render.Error(rw, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "id is not a valid uuid-v7"))
		return
	}

	err = handler.ruler.MaintenanceStore().DeletePlannedMaintenance(ctx, id)
	if err != nil {
		render.Error(rw, err)
		return
	}

	render.Success(rw, http.StatusNoContent, nil)
}
