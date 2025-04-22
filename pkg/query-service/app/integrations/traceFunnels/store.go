package traceFunnels

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"time"

	"github.com/SigNoz/signoz/pkg/valuer"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
)

// SQLClient handles persistence of funnels to the database
type SQLClient struct {
	funnels sqlstore.SQLStore
}

// NewSQLClient creates a new SQL client
func NewSQLClient(store sqlstore.SQLStore) (*SQLClient, error) {
	return &SQLClient{funnels: store}, nil
}

// SaveFunnelRequest is used to save a funnel to the database
type SaveFunnelRequest struct {
	FunnelID    string `json:"funnel_id"`             // Required: ID of the funnel to save
	UserID      string `json:"user_id,omitempty"`     // Optional: will use existing user ID if not provided
	OrgID       string `json:"org_id,omitempty"`      // Optional: will use existing org ID if not provided
	Tags        string `json:"tags,omitempty"`        // Optional: comma-separated tags
	Description string `json:"description,omitempty"` // Optional: human-readable description
	Timestamp   int64  `json:"timestamp,omitempty"`   // Optional: timestamp for update in milliseconds (uses current time if not provided)
}

// SaveFunnel saves a funnel to the database in the trace_funnels table
// Handles both creating new funnels and updating existing ones
func (c *SQLClient) SaveFunnel(funnel *Funnel, userID, orgID string, tags, extraData string) error {
	ctx := context.Background()
	db := c.funnels.BunDB()

	// Convert funnel to JSON for storage
	funnelData, err := json.Marshal(funnel)
	if err != nil {
		return fmt.Errorf("failed to marshal funnel data: %v", err)
	}

	// Format timestamps as RFC3339
	// Convert nanoseconds to milliseconds for display, then to time.Time for formatting
	createdAt := time.Unix(0, funnel.CreatedAt).UTC().Format(time.RFC3339)
	updatedAt := createdAt
	updatedBy := userID

	// If funnel has update metadata, use it
	if funnel.UpdatedAt > 0 {
		updatedAt = time.Unix(0, funnel.UpdatedAt).UTC().Format(time.RFC3339)
	}

	if funnel.UpdatedBy != "" {
		updatedBy = funnel.UpdatedBy
	}

	// Check if the funnel already exists
	var count int
	var existingCreatedBy string
	var existingCreatedAt string
	err = db.NewRaw("SELECT COUNT(*), IFNULL(\"created_by\", ''), IFNULL(\"created_at\", '') FROM trace_funnel WHERE \"id\" = ? AND \"category\" = 'funnel'", funnel.ID).
		Scan(ctx, &count, &existingCreatedBy, &existingCreatedAt)
	if err != nil {
		return fmt.Errorf("failed to check if funnel exists: %v", err)
	}

	if count > 0 {
		// Update existing funnel - preserve created_by and created_at
		_, err = db.NewRaw(
			"UPDATE trace_funnel SET \"name\" = ?, \"data\" = ?, \"updated_by\" = ?, \"updated_at\" = ?, \"tags\" = ?, \"extra_data\" = ? WHERE \"id\" = ? AND \"category\" = 'funnel'",
			funnel.Name, string(funnelData), updatedBy, updatedAt, tags, extraData, funnel.ID,
		).Exec(ctx)
		if err != nil {
			return fmt.Errorf("failed to update funnel: %v", err)
		}
	} else {
		// Insert new funnel - set both created and updated fields
		id, err := valuer.NewUUID(funnel.ID)
		if err != nil {
			return fmt.Errorf("failed to get the funnel id: %v", err)
		}
		savedView := &types.TraceFunnels{
			TimeAuditable: types.TimeAuditable{
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
			UserAuditable: types.UserAuditable{
				CreatedBy: userID,
				UpdatedBy: updatedBy,
			},
			Identifiable: types.Identifiable{
				ID: id,
			},
			OrgID:      orgID,
			Name:       funnel.Name,
			SourcePage: "trace-funnels",
			Tags:       tags,
			Data:       string(funnelData),
			ExtraData:  extraData,
		}

		_, err = db.NewInsert().Model(savedView).Exec(ctx)
		if err != nil {
			return fmt.Errorf("failed to insert funnel: %v", err)
		}
	}

	return nil
}

// GetFunnelFromDB retrieves a funnel from the database
func (c *SQLClient) GetFunnelFromDB(funnelID string) (*Funnel, error) {
	ctx := context.Background()
	db := c.funnels.BunDB()

	var savedView types.TraceFunnels
	err := db.NewSelect().
		Model(&savedView).
		Where("\"id\" = ? AND \"category\" = 'funnel'", funnelID).
		Scan(ctx)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("funnel not found")
		}
		return nil, fmt.Errorf("failed to get funnel: %v", err)
	}

	var funnel Funnel
	if err := json.Unmarshal([]byte(savedView.Data), &funnel); err != nil {
		return nil, fmt.Errorf("failed to unmarshal funnel data: %v", err)
	}

	return &funnel, nil
}

// ListFunnelsFromDB lists all funnels from the database
func (c *SQLClient) ListFunnelsFromDB(orgID string) ([]*Funnel, error) {
	ctx := context.Background()
	db := c.funnels.BunDB()

	var savedViews []types.TraceFunnels
	err := db.NewSelect().
		Model(&savedViews).
		Where("\"category\" = 'funnel' AND \"org_id\" = ?", orgID).
		Scan(ctx)

	if err != nil {
		return nil, fmt.Errorf("failed to list funnels: %v", err)
	}

	var funnels []*Funnel
	for _, view := range savedViews {
		var funnel Funnel
		if err := json.Unmarshal([]byte(view.Data), &funnel); err != nil {
			return nil, fmt.Errorf("failed to unmarshal funnel data: %v", err)
		}

		funnels = append(funnels, &funnel)
	}

	return funnels, nil
}

// DeleteFunnelFromDB deletes a funnel from the database
func (c *SQLClient) DeleteFunnelFromDB(funnelID string) error {
	ctx := context.Background()
	db := c.funnels.BunDB()

	_, err := db.NewDelete().
		Model(&types.TraceFunnels{}).
		Where("\"id\" = ? AND \"category\" = 'funnel'", funnelID).
		Exec(ctx)

	if err != nil {
		return fmt.Errorf("failed to delete funnel: %v", err)
	}
	return nil
}

// CheckFunnelNameCollision checks if a funnel with the given name exists for a user
func (c *SQLClient) CheckFunnelNameCollision(name, userID string) (bool, error) {
	ctx := context.Background()
	db := c.funnels.BunDB()

	var count int
	err := db.NewRaw("SELECT COUNT(*) FROM trace_funnel WHERE \"name\" = ? AND \"created_by\" = ? AND \"category\" = 'funnel'", name, userID).
		Scan(ctx, &count)

	if err != nil {
		return false, fmt.Errorf("failed to check funnel name collision: %v", err)
	}

	return count > 0, nil
}

// CreateFunnel creates a new funnel in the database
func (c *SQLClient) CreateFunnel(timestamp int64, funnelName, userID, orgID string) (*Funnel, error) {

	funnel := &Funnel{
		ID:        uuid.New().String(),
		Name:      funnelName,
		CreatedAt: timestamp * 1000000, // Convert milliseconds to nanoseconds for internal storage
		CreatedBy: userID,
		OrgID:     orgID,
		Steps:     make([]FunnelStep, 0),
	}

	ctx := context.Background()
	db := c.funnels.BunDB()

	// Convert funnel to JSON for storage
	funnelData, err := json.Marshal(funnel)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal funnel data: %v", err)
	}

	// Format timestamps as RFC3339
	createdAt := time.Unix(0, funnel.CreatedAt).UTC().Format(time.RFC3339)

	// Insert new funnel
	_, err = db.NewRaw(
		"INSERT INTO trace_funnel (\"id\", \"name\", \"category\", \"created_by\", \"updated_by\", \"source_page\", \"data\", \"created_at\", \"updated_at\", \"org_id\") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		funnel.ID, funnel.Name, "funnel", userID, userID, "trace-funnels", string(funnelData), createdAt, createdAt, orgID,
	).Exec(ctx)

	if err != nil {
		return nil, fmt.Errorf("failed to save funnel to database: %v", err)
	}

	return funnel, nil
}

// UpdateFunnel updates an existing funnel in the database
func (c *SQLClient) UpdateFunnel(funnel *Funnel, userID string) error {
	ctx := context.Background()
	db := c.funnels.BunDB()

	// Convert funnel to JSON for storage
	funnelData, err := json.Marshal(funnel)
	if err != nil {
		return fmt.Errorf("failed to marshal funnel data: %v", err)
	}

	// Format timestamp as RFC3339
	updatedAt := time.Unix(0, funnel.UpdatedAt).UTC().Format(time.RFC3339)

	// Update funnel in database
	_, err = db.NewRaw(
		"UPDATE trace_funnel SET \"data\" = ?, \"updated_by\" = ?, \"updated_at\" = ? WHERE \"id\" = ? AND \"category\" = 'funnel'",
		string(funnelData), userID, updatedAt, funnel.ID,
	).Exec(ctx)

	if err != nil {
		return fmt.Errorf("failed to update funnel in database: %v", err)
	}

	return nil
}

// GetFunnelMetadata retrieves metadata (created_at, updated_at, tags, extra_data) for a funnel
func (c *SQLClient) GetFunnelMetadata(funnelID string) (string, string, string, string, error) {
	ctx := context.Background()
	db := c.funnels.BunDB()

	var createdAt, updatedAt, tags, extraData string
	err := db.NewRaw(
		"SELECT \"created_at\", \"updated_at\", IFNULL(\"tags\", ''), IFNULL(\"extra_data\", '') FROM trace_funnel WHERE \"id\" = ? AND \"category\" = 'funnel'",
		funnelID,
	).Scan(ctx, &createdAt, &updatedAt, &tags, &extraData)

	if err != nil {
		return "", "", "", "", fmt.Errorf("failed to get funnel metadata: %v", err)
	}

	return createdAt, updatedAt, tags, extraData, nil
}

// GetFunnelExtraData retrieves extra_data and tags for a funnel
func (c *SQLClient) GetFunnelExtraData(funnelID string) (string, string, error) {
	ctx := context.Background()
	db := c.funnels.BunDB()

	var extraData, tags string
	err := db.NewRaw(
		"SELECT IFNULL(\"extra_data\", ''), IFNULL(\"tags\", '') FROM trace_funnel WHERE \"id\" = ? AND \"category\" = 'funnel'",
		funnelID,
	).Scan(ctx, &extraData, &tags)

	if err != nil {
		return "", "", fmt.Errorf("failed to get funnel extra data: %v", err)
	}

	return extraData, tags, nil
}

// GetFunnelExtraDataAndTags retrieves extra_data and tags for a funnel
func (c *SQLClient) GetFunnelExtraDataAndTags(funnelID string) (string, string, error) {
	ctx := context.Background()
	db := c.funnels.BunDB()

	var extraData, tags string
	err := db.NewRaw(
		"SELECT IFNULL(\"extra_data\", ''), IFNULL(\"tags\", '') FROM trace_funnel WHERE \"id\" = ? AND \"category\" = 'funnel'",
		funnelID,
	).Scan(ctx, &extraData, &tags)

	if err != nil {
		return "", "", fmt.Errorf("failed to get funnel extra data and tags: %v", err)
	}

	return extraData, tags, nil
}
