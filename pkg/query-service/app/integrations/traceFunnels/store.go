package traceFunnels

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/SigNoz/signoz/pkg/sqlstore"
	"github.com/SigNoz/signoz/pkg/types"
)

// SQLClient handles persistence of funnels to the database
type SQLClient struct {
	store sqlstore.SQLStore
}

// NewSQLClient creates a new SQL client
func NewSQLClient(store sqlstore.SQLStore) (*SQLClient, error) {
	return &SQLClient{store: store}, nil
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

// SaveFunnel saves a funnel to the database in the saved_views table
// Handles both creating new funnels and updating existing ones
func (c *SQLClient) SaveFunnel(funnel *Funnel, userID, orgID string, tags, extraData string) error {
	ctx := context.Background()
	db := c.store.BunDB()

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
	err = db.NewRaw("SELECT COUNT(*), IFNULL(created_by, ''), IFNULL(created_at, '') FROM saved_views WHERE uuid = ? AND category = 'funnel'", funnel.ID).
		Scan(ctx, &count, &existingCreatedBy, &existingCreatedAt)
	if err != nil {
		return fmt.Errorf("failed to check if funnel exists: %v", err)
	}

	if count > 0 {
		// Update existing funnel - preserve created_by and created_at
		_, err = db.NewRaw(
			"UPDATE saved_views SET name = ?, data = ?, updated_by = ?, updated_at = ?, tags = ?, extra_data = ? WHERE uuid = ? AND category = 'funnel'",
			funnel.Name, string(funnelData), updatedBy, updatedAt, tags, extraData, funnel.ID,
		).Exec(ctx)
		if err != nil {
			return fmt.Errorf("failed to update funnel: %v", err)
		}
	} else {
		// Insert new funnel - set both created and updated fields
		savedView := &types.SavedView{
			TimeAuditable: types.TimeAuditable{
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
			UserAuditable: types.UserAuditable{
				CreatedBy: userID,
				UpdatedBy: updatedBy,
			},
			UUID:       funnel.ID,
			Name:       funnel.Name,
			Category:   "funnel",
			SourcePage: "trace-funnels",
			OrgID:      orgID,
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
	db := c.store.BunDB()

	var savedView types.SavedView
	err := db.NewSelect().
		Model(&savedView).
		Where("uuid = ? AND category = 'funnel'", funnelID).
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
	db := c.store.BunDB()

	var savedViews []types.SavedView
	err := db.NewSelect().
		Model(&savedViews).
		Where("category = 'funnel' AND org_id = ?", orgID).
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

// ListAllFunnelsFromDB lists all funnels from the database without org_id filter
func (c *SQLClient) ListAllFunnelsFromDB() ([]*Funnel, error) {
	ctx := context.Background()
	db := c.store.BunDB()

	var savedViews []types.SavedView
	err := db.NewSelect().
		Model(&savedViews).
		Where("category = 'funnel'").
		Scan(ctx)

	if err != nil {
		return nil, fmt.Errorf("failed to list all funnels: %v", err)
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
	db := c.store.BunDB()

	_, err := db.NewDelete().
		Model(&types.SavedView{}).
		Where("uuid = ? AND category = 'funnel'", funnelID).
		Exec(ctx)

	if err != nil {
		return fmt.Errorf("failed to delete funnel: %v", err)
	}
	return nil
}
