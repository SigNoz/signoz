package signozapiserver

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/query-service/dao"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/gorilla/mux"
)

// externalIssueHandler handles external issue operations
type externalIssueHandler struct {
	repo   dao.ExternalIssueRepo
	logger *slog.Logger
}

// newExternalIssueHandler creates a new external issue handler
func newExternalIssueHandler(repo dao.ExternalIssueRepo, logger *slog.Logger) *externalIssueHandler {
	return &externalIssueHandler{
		repo:   repo,
		logger: logger,
	}
}

// ListExternalIssues lists all external issues with optional filters
func (h *externalIssueHandler) ListExternalIssues(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	orgID, ok := ctx.Value("orgId").(string)
	if !ok || orgID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse query parameters
	var req model.QueryExternalIssuesRequest
	req.RuleID = r.URL.Query().Get("ruleId")
	req.ExternalSystem = model.ExternalIssueSystem(r.URL.Query().Get("externalSystem"))
	req.SyncStatus = model.SyncStatus(r.URL.Query().Get("syncStatus"))

	// Parse pagination
	var limit, offset int
	if _, err := fmt.Sscanf(r.URL.Query().Get("limit"), "%d", &limit); err == nil {
		req.Limit = limit
	}
	if _, err := fmt.Sscanf(r.URL.Query().Get("offset"), "%d", &offset); err == nil {
		req.Offset = offset
	}

	response, err := h.repo.ListExternalIssues(ctx, &req, orgID)
	if err != nil {
		h.logger.ErrorContext(ctx, "failed to list external issues", slog.String("error", err.Error()))
		http.Error(w, "failed to list external issues", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetExternalIssue retrieves a single external issue by ID
func (h *externalIssueHandler) GetExternalIssue(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	orgID, ok := ctx.Value("orgId").(string)
	if !ok || orgID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	issue, err := h.repo.GetExternalIssueByID(ctx, id, orgID)
	if err != nil {
		if errors.Asc(err, dao.ErrExternalIssueNotFound) {
			http.Error(w, "external issue not found", http.StatusNotFound)
			return
		}
		h.logger.ErrorContext(ctx, "failed to get external issue", slog.String("error", err.Error()))
		http.Error(w, "failed to get external issue", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(issue)
}

// GetExternalIssuesByAlert retrieves all external issues for an alert
func (h *externalIssueHandler) GetExternalIssuesByAlert(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	orgID, ok := ctx.Value("orgId").(string)
	if !ok || orgID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	var fingerprint uint64
	if _, err := fmt.Sscanf(vars["fingerprint"], "%d", &fingerprint); err != nil {
		http.Error(w, "invalid fingerprint", http.StatusBadRequest)
		return
	}

	issues, err := h.repo.GetExternalIssuesByAlertFingerprint(ctx, fingerprint, orgID)
	if err != nil {
		h.logger.ErrorContext(ctx, "failed to get external issues by alert", slog.String("error", err.Error()))
		http.Error(w, "failed to get external issues", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"items": issues,
		"total": len(issues),
	})
}

// GetExternalIssuesByRule retrieves all external issues for a rule
func (h *externalIssueHandler) GetExternalIssuesByRule(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	orgID, ok := ctx.Value("orgId").(string)
	if !ok || orgID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	ruleID := vars["ruleId"]

	issues, err := h.repo.GetExternalIssuesByRuleID(ctx, ruleID, orgID)
	if err != nil {
		h.logger.ErrorContext(ctx, "failed to get external issues by rule", slog.String("error", err.Error()))
		http.Error(w, "failed to get external issues", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"items": issues,
		"total": len(issues),
	})
}

// CreateExternalIssue creates a new external issue mapping
func (h *externalIssueHandler) CreateExternalIssue(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	orgID, ok := ctx.Value("orgId").(string)
	if !ok || orgID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req model.CreateExternalIssueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	issue, err := h.repo.CreateExternalIssue(ctx, &req, orgID)
	if err != nil {
		if errors.Asc(err, dao.ErrExternalIssueDuplicate) {
			http.Error(w, "external issue mapping already exists", http.StatusConflict)
			return
		}
		h.logger.ErrorContext(ctx, "failed to create external issue", slog.String("error", err.Error()))
		http.Error(w, "failed to create external issue", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(issue)
}

// UpdateExternalIssue updates an external issue
func (h *externalIssueHandler) UpdateExternalIssue(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	orgID, ok := ctx.Value("orgId").(string)
	if !ok || orgID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	var req model.UpdateExternalIssueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	err := h.repo.UpdateExternalIssue(ctx, id, &req, orgID)
	if err != nil {
		if errors.Asc(err, dao.ErrExternalIssueNotFound) {
			http.Error(w, "external issue not found", http.StatusNotFound)
			return
		}
		h.logger.ErrorContext(ctx, "failed to update external issue", slog.String("error", err.Error()))
		http.Error(w, "failed to update external issue", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DeleteExternalIssue deletes an external issue mapping
func (h *externalIssueHandler) DeleteExternalIssue(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	orgID, ok := ctx.Value("orgId").(string)
	if !ok || orgID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	err := h.repo.DeleteExternalIssue(ctx, id, orgID)
	if err != nil {
		if errors.Asc(err, dao.ErrExternalIssueNotFound) {
			http.Error(w, "external issue not found", http.StatusNotFound)
			return
		}
		h.logger.ErrorContext(ctx, "failed to delete external issue", slog.String("error", err.Error()))
		http.Error(w, "failed to delete external issue", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// addExternalIssueRoutes adds external issue routes to the router
func (provider *provider) addExternalIssueRoutes(router *mux.Router) error {
	externalIssueHandler := newExternalIssueHandler(provider.externalIssueRepo, provider.logger)
	webhookHandler := newWebhookHandler(provider.externalIssueRepo, provider.logger)

	// Get Jira webhook URL (authenticated endpoint)
	if err := router.Handle("/api/v1/webhooks/jira/url", handler.New(
		provider.authzMiddleware.ViewAccess(webhookHandler.GetJiraWebhookURL),
		handler.OpenAPIDef{
			ID:                  "GetJiraWebhookURL",
			Tags:                []string{"integrations"},
			Summary:             "Get Jira webhook URL",
			Description:         "Get the unique webhook URL for Jira integration",
			Request:             nil,
			RequestContentType:  "",
			Response:            nil,
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusUnauthorized},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	// List all external issues
	if err := router.Handle("/api/v1/external-issues", handler.New(
		provider.authzMiddleware.ViewAccess(externalIssueHandler.ListExternalIssues),
		handler.OpenAPIDef{
			ID:                  "ListExternalIssues",
			Tags:                []string{"external-issues"},
			Summary:             "List external issues",
			Description:         "List all external issue mappings with optional filters",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(model.ExternalIssueListResponse),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	// Get external issue by ID
	if err := router.Handle("/api/v1/external-issues/{id}", handler.New(
		provider.authzMiddleware.ViewAccess(externalIssueHandler.GetExternalIssue),
		handler.OpenAPIDef{
			ID:                  "GetExternalIssue",
			Tags:                []string{"external-issues"},
			Summary:             "Get external issue",
			Description:         "Get an external issue mapping by ID",
			Request:             nil,
			RequestContentType:  "",
			Response:            new(model.ExternalIssue),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusOK,
			ErrorStatusCodes:    []int{http.StatusNotFound},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleViewer),
		},
	)).Methods(http.MethodGet).GetError(); err != nil {
		return err
	}

	// Get external issues by alert fingerprint
	router.HandleFunc("/api/v1/alerts/{fingerprint}/external-issues", externalIssueHandler.GetExternalIssuesByAlert).Methods(http.MethodGet)

	// Get external issues by rule ID
	router.HandleFunc("/api/v1/rules/{ruleId}/external-issues", externalIssueHandler.GetExternalIssuesByRule).Methods(http.MethodGet)

	// Create external issue
	if err := router.Handle("/api/v1/external-issues", handler.New(
		provider.authzMiddleware.EditAccess(externalIssueHandler.CreateExternalIssue),
		handler.OpenAPIDef{
			ID:                  "CreateExternalIssue",
			Tags:                []string{"external-issues"},
			Summary:             "Create external issue mapping",
			Description:         "Create a new external issue mapping",
			Request:             new(model.CreateExternalIssueRequest),
			RequestContentType:  "application/json",
			Response:            new(model.ExternalIssue),
			ResponseContentType: "application/json",
			SuccessStatusCode:   http.StatusCreated,
			ErrorStatusCodes:    []int{http.StatusBadRequest, http.StatusConflict},
			Deprecated:          false,
			SecuritySchemes:     newSecuritySchemes(types.RoleEditor),
		},
	)).Methods(http.MethodPost).GetError(); err != nil {
		return err
	}

	// Update external issue
	router.HandleFunc("/api/v1/external-issues/{id}", externalIssueHandler.UpdateExternalIssue).Methods(http.MethodPut)

	// Delete external issue
	router.HandleFunc("/api/v1/external-issues/{id}", externalIssueHandler.DeleteExternalIssue).Methods(http.MethodDelete)

	return nil
}
