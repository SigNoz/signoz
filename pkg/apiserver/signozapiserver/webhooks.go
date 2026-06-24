package signozapiserver

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/query-service/dao"
	"github.com/SigNoz/signoz/pkg/query-service/model"
	"github.com/SigNoz/signoz/pkg/types/authtypes"
	"github.com/gorilla/mux"
)

// JiraWebhookPayload represents the payload from Jira webhooks
type JiraWebhookPayload struct {
	WebhookEvent string `json:"webhookEvent"`
	Timestamp    int64  `json:"timestamp"`
	Issue        struct {
		ID     string `json:"id"`
		Key    string `json:"key"`
		Self   string `json:"self"`
		Fields struct {
			Status struct {
				Self           string `json:"self"`
				Description    string `json:"description"`
				IconURL        string `json:"iconUrl"`
				Name           string `json:"name"`
				ID             string `json:"id"`
				StatusCategory struct {
					Self      string `json:"self"`
					ID        int    `json:"id"`
					Key       string `json:"key"`
					ColorName string `json:"colorName"`
					Name      string `json:"name"`
				} `json:"statusCategory"`
			} `json:"status"`
			Priority struct {
				Self    string `json:"self"`
				IconURL string `json:"iconUrl"`
				Name    string `json:"name"`
				ID      string `json:"id"`
			} `json:"priority,omitempty"`
			Assignee struct {
				Self         string `json:"self"`
				AccountID    string `json:"accountId"`
				EmailAddress string `json:"emailAddress"`
				DisplayName  string `json:"displayName"`
			} `json:"assignee,omitempty"`
			Summary     string `json:"summary"`
			Description string `json:"description,omitempty"`
		} `json:"fields"`
	} `json:"issue"`
	User struct {
		Self         string `json:"self"`
		AccountID    string `json:"accountId"`
		EmailAddress string `json:"emailAddress"`
		DisplayName  string `json:"displayName"`
	} `json:"user,omitempty"`
	Changelog struct {
		Items []struct {
			Field      string `json:"field"`
			FieldType  string `json:"fieldtype"`
			From       string `json:"from"`
			FromString string `json:"fromString"`
			To         string `json:"to"`
			ToString   string `json:"toString"`
		} `json:"items"`
	} `json:"changelog,omitempty"`
	Comment struct {
		Self   string `json:"self"`
		ID     string `json:"id"`
		Author struct {
			Self         string `json:"self"`
			AccountID    string `json:"accountId"`
			EmailAddress string `json:"emailAddress"`
			DisplayName  string `json:"displayName"`
		} `json:"author"`
		Body    string `json:"body"`
		Created string `json:"created"`
		Updated string `json:"updated"`
	} `json:"comment,omitempty"`
}

// webhookHandler handles webhook-related operations
type webhookHandler struct {
	externalIssueRepo dao.ExternalIssueRepo
	logger            *slog.Logger
}

// newWebhookHandler creates a new webhook handler
func newWebhookHandler(externalIssueRepo dao.ExternalIssueRepo, logger *slog.Logger) *webhookHandler {
	return &webhookHandler{
		externalIssueRepo: externalIssueRepo,
		logger:            logger,
	}
}

// HandleJiraWebhook handles incoming webhooks from Jira
func (h *webhookHandler) HandleJiraWebhook(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	
	// Extract webhook token from URL path (e.g., /api/v1/webhooks/jira/{token})
	vars := mux.Vars(r)
	webhookToken := vars["token"]
	
	// If no token in path, try to get org ID from auth context (backward compatibility)
	var orgID string
	if webhookToken != "" {
		// Verify token and get org ID
		verifiedOrgID, err := h.verifyWebhookToken(ctx, webhookToken)
		if err != nil {
			h.logger.ErrorContext(ctx, "invalid webhook token", slog.String("error", err.Error()))
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		orgID = verifiedOrgID
	} else {
		// Fallback to auth middleware (backward compatibility)
		var ok bool
		orgID, ok = ctx.Value("orgId").(string)
		if !ok || orgID == "" {
			h.logger.ErrorContext(ctx, "org_id not found in context")
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
	}
	
	// Parse the webhook payload
	var payload JiraWebhookPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		h.logger.ErrorContext(ctx, "failed to decode jira webhook payload", slog.String("error", err.Error()))
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	h.logger.InfoContext(ctx, "received jira webhook",
		slog.String("event", payload.WebhookEvent),
		slog.String("issue_key", payload.Issue.Key),
		slog.String("status", payload.Issue.Fields.Status.Name),
		slog.String("org_id", orgID),
	)

	// Process the webhook based on event type
	switch payload.WebhookEvent {
	case "jira:issue_updated":
		if err := h.handleJiraIssueUpdated(ctx, &payload, orgID); err != nil {
			h.logger.ErrorContext(ctx, "failed to handle jira issue updated",
				slog.String("error", err.Error()),
				slog.String("issue_key", payload.Issue.Key),
			)
			http.Error(w, "failed to process webhook", http.StatusInternalServerError)
			return
		}
	case "jira:issue_deleted":
		if err := h.handleJiraIssueDeleted(ctx, &payload, orgID); err != nil {
			h.logger.ErrorContext(ctx, "failed to handle jira issue deleted",
				slog.String("error", err.Error()),
				slog.String("issue_key", payload.Issue.Key),
			)
			http.Error(w, "failed to process webhook", http.StatusInternalServerError)
			return
		}
	case "comment_created", "comment_updated":
		// Log comment events but don't take action
		h.logger.InfoContext(ctx, "jira comment event received",
			slog.String("event", payload.WebhookEvent),
			slog.String("issue_key", payload.Issue.Key),
		)
	default:
		h.logger.InfoContext(ctx, "unhandled jira webhook event",
			slog.String("event", payload.WebhookEvent),
		)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// handleJiraIssueUpdated processes Jira issue update events
func (h *webhookHandler) handleJiraIssueUpdated(ctx context.Context, payload *JiraWebhookPayload, orgID string) error {
	// Look up the external issue mapping
	externalIssue, err := h.externalIssueRepo.GetExternalIssueByExternalID(
		ctx,
		model.ExternalIssueSystemJira,
		payload.Issue.Key,
		orgID,
	)
	if err != nil {
		if errors.Asc(err, dao.ErrExternalIssueNotFound) {
			h.logger.InfoContext(ctx, "no mapping found for jira issue",
				slog.String("issue_key", payload.Issue.Key),
			)
			return nil
		}
		return err
	}

	// Check if status changed
	if payload.Changelog.Items != nil {
		for _, item := range payload.Changelog.Items {
			if item.Field == "status" {
				h.logger.InfoContext(ctx, "jira issue status changed",
					slog.String("issue_key", payload.Issue.Key),
					slog.String("from", item.FromString),
					slog.String("to", item.ToString),
				)
				break
			}
		}
	}

	// Update metadata with latest Jira status
	if externalIssue.Metadata == nil {
		externalIssue.Metadata = make(model.ExternalIssueMetadata)
	}
	externalIssue.Metadata["jira_status"] = payload.Issue.Fields.Status.Name
	externalIssue.Metadata["jira_status_category"] = payload.Issue.Fields.Status.StatusCategory.Key
	externalIssue.Metadata["last_webhook_event"] = payload.WebhookEvent
	externalIssue.Metadata["last_webhook_timestamp"] = time.Now().Unix()

	// Map Jira status to SigNoz alert state
	// This is where you would update the alert state in SigNoz
	// For now, we just update the sync status
	newAlertState := mapJiraStatusToAlertState(payload.Issue.Fields.Status.Name)
	h.logger.InfoContext(ctx, "mapped jira status to alert state",
		slog.String("jira_status", payload.Issue.Fields.Status.Name),
		slog.String("alert_state", newAlertState),
		slog.Uint64("alert_fingerprint", externalIssue.AlertFingerprint),
	)

	// TODO: Update the actual alert state in SigNoz
	// This would require integration with the alertmanager/rules system
	// For now, we just update the sync status to indicate successful sync

	err = h.externalIssueRepo.UpdateSyncStatus(
		ctx,
		externalIssue.ID,
		model.SyncStatusSynced,
		"",
		orgID,
	)
	if err != nil {
		return err
	}

	return nil
}

// handleJiraIssueDeleted processes Jira issue deletion events
func (h *webhookHandler) handleJiraIssueDeleted(ctx context.Context, payload *JiraWebhookPayload, orgID string) error {
	// Look up the external issue mapping
	externalIssue, err := h.externalIssueRepo.GetExternalIssueByExternalID(
		ctx,
		model.ExternalIssueSystemJira,
		payload.Issue.Key,
		orgID,
	)
	if err != nil {
		if errors.Asc(err, dao.ErrExternalIssueNotFound) {
			h.logger.InfoContext(ctx, "no mapping found for deleted jira issue",
				slog.String("issue_key", payload.Issue.Key),
			)
			return nil
		}
		return err
	}

	// Delete the mapping
	err = h.externalIssueRepo.DeleteExternalIssue(ctx, externalIssue.ID, orgID)
	if err != nil {
		return err
	}

	h.logger.InfoContext(ctx, "deleted external issue mapping",
		slog.String("issue_key", payload.Issue.Key),
		slog.String("mapping_id", externalIssue.ID),
	)

	return nil
}

// mapJiraStatusToAlertState maps Jira status to SigNoz alert state
func mapJiraStatusToAlertState(jiraStatus string) string {
	statusLower := strings.ToLower(jiraStatus)
	
	// Map common Jira statuses to alert states
	switch statusLower {
	case "open", "to do", "in progress", "reopened", "in review":
		return "firing"
	case "resolved", "closed", "done", "completed":
		return "inactive"
	case "on hold", "blocked", "waiting":
		return "pending"
	default:
		// Default to firing for unknown statuses
		return "firing"
	}
}

// addWebhookRoutes adds webhook routes to the router
func (provider *provider) addWebhookRoutes(router *mux.Router) error {
	webhookHandler := newWebhookHandler(provider.externalIssueRepo, provider.logger)

	// Get Jira webhook URL (authenticated endpoint) - needs to be added to authenticated routes
	// This will be added in addExternalIssueRoutes instead

	// Jira webhook endpoint with token (like Datadog) - public endpoint
	router.HandleFunc("/api/v1/webhooks/jira/{token}", webhookHandler.HandleJiraWebhook).Methods(http.MethodPost)
	
	// Backward compatibility: Jira webhook endpoint without token (uses auth middleware)
	router.HandleFunc("/api/v1/webhooks/jira", webhookHandler.HandleJiraWebhook).Methods(http.MethodPost)

	return nil
}

// verifyWebhookToken verifies the webhook token and returns the org ID
func (h *webhookHandler) verifyWebhookToken(ctx context.Context, token string) (string, error) {
	secret, err := h.webhookSigningSecret()
	if err != nil {
		return "", err
	}

	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 {
		return "", errors.NewInvalidInputf(errors.CodeUnauthenticated, "invalid token format")
	}

	orgID := parts[0]
	if orgID == "" {
		return "", errors.NewInvalidInputf(errors.CodeUnauthenticated, "invalid token")
	}

	providedSig, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "", errors.NewInvalidInputf(errors.CodeUnauthenticated, "invalid token signature")
	}

	expectedSig := h.signWebhookToken(orgID, secret)
	if !hmac.Equal(expectedSig, providedSig) {
		return "", errors.NewInvalidInputf(errors.CodeUnauthenticated, "invalid token signature")
	}

	return orgID, nil
}

// GetJiraWebhookURL returns the webhook URL for Jira integration
func (h *webhookHandler) GetJiraWebhookURL(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	
	// Get org ID from claims (proper way when using handler.New wrapper)
	claims, err := authtypes.ClaimsFromContext(ctx)
	if err != nil {
		h.logger.ErrorContext(ctx, "failed to get claims from context", slog.String("error", err.Error()))
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	
	orgID := claims.OrgID
	if orgID == "" {
		h.logger.ErrorContext(ctx, "org_id not found in claims")
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	
	// Generate webhook token for this org
	// In production, you'd store this in the database and allow regeneration
	webhookToken, err := h.generateWebhookToken(orgID)
	if err != nil {
		h.logger.ErrorContext(ctx, "failed to generate webhook token", slog.String("error", err.Error()))
		http.Error(w, "webhook token unavailable", http.StatusInternalServerError)
		return
	}
	
	// Get the base URL from request
	// Always use HTTPS for webhook URL (Jira requires HTTPS)
	// For local development, users should use ngrok or similar tunneling service
	scheme := "https"
	host := r.Host
	
	// If running locally (localhost), provide a note in the response
	isLocalhost := strings.Contains(host, "localhost") || strings.Contains(host, "127.0.0.1")
	
	webhookURL := fmt.Sprintf("%s://%s/api/v1/webhooks/jira/%s", scheme, host, webhookToken)
	
	response := map[string]interface{}{
		"webhook_url": webhookURL,
		"org_id":      orgID,
		"is_localhost": isLocalhost,
	}
	
	// Add helpful message for localhost
	if isLocalhost {
		response["note"] = "Jira requires HTTPS webhooks. For local testing, use ngrok or similar tunneling service. Run: ngrok http 8080"
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// generateWebhookToken generates a unique webhook token for an org
	secret, err := h.webhookSigningSecret()
	if err != nil {
		return "", err
	}

	signature := h.signWebhookToken(orgID, secret)
	encodedSignature := base64.RawURLEncoding.EncodeToString(signature)
	return fmt.Sprintf("%s.%s", orgID, encodedSignature), nil
}

func (h *webhookHandler) webhookSigningSecret() (string, error) {
	secret := os.Getenv("SIGNOZ_TOKENIZER_JWT_SECRET")
	if secret == "" {
		secret = os.Getenv("SIGNOZ_JWT_SECRET")
	}
	if secret == "" {
		return "", errors.NewInvalidInputf(errors.CodeUnauthenticated, "webhook signing secret not configured")
	}
	return secret, nil
}

func (h *webhookHandler) signWebhookToken(orgID string, secret string) []byte {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(orgID))
	return mac.Sum(nil)
}
