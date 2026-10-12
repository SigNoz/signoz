package ruler

import "net/http"

type Handler interface {
	ListRules(http.ResponseWriter, *http.Request)
	ListRulesV3(http.ResponseWriter, *http.Request)
	GetRuleByID(http.ResponseWriter, *http.Request)
	CreateRule(http.ResponseWriter, *http.Request)
	UpdateRuleByID(http.ResponseWriter, *http.Request)
	DeleteRuleByID(http.ResponseWriter, *http.Request)
	PatchRuleByID(http.ResponseWriter, *http.Request)
	TestRule(http.ResponseWriter, *http.Request)

	ListRuleViews(http.ResponseWriter, *http.Request)
	CreateRuleView(http.ResponseWriter, *http.Request)
	UpdateRuleView(http.ResponseWriter, *http.Request)
	DeleteRuleView(http.ResponseWriter, *http.Request)

	ListDowntimeSchedules(http.ResponseWriter, *http.Request)
	GetDowntimeScheduleByID(http.ResponseWriter, *http.Request)
	CreateDowntimeSchedule(http.ResponseWriter, *http.Request)
	UpdateDowntimeScheduleByID(http.ResponseWriter, *http.Request)
	DeleteDowntimeScheduleByID(http.ResponseWriter, *http.Request)
}
