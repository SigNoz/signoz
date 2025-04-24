package traceFunnels

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"

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

// SaveFunnel saves a funnel to the database in the trace_funnels table
func (c *SQLClient) SaveFunnel(funnel *Funnel, userID, orgID string) error {
	db := c.funnels.BunDB()

	// Convert funnel to JSON for storage
	funnelData, err := json.Marshal(funnel)
	if err != nil {
		return fmt.Errorf("failed to marshal funnel data: %v", err)
	}

	// Format timestamps for database
	var updatedAt, updatedBy string

	// If funnel has update metadata, use it
	if funnel.UpdatedAt > 0 {
		updatedAt = time.Unix(0, funnel.UpdatedAt).UTC().Format(time.RFC3339)
	}

	if funnel.UpdatedBy != "" {
		updatedBy = funnel.UpdatedBy
	}

	// Check if the funnel already exists
	var count int
	var existingCreatedBy, existingCreatedAt string
	err = db.NewRaw("SELECT COUNT(*), IFNULL(\"created_by\", ''), IFNULL(\"created_at\", '') FROM trace_funnel WHERE \"id\" = ?", funnel.ID).
		Scan(context.Background(), &count, &existingCreatedBy, &existingCreatedAt)
	if err != nil {
		return fmt.Errorf("failed to check if funnel exists: %v", err)
	}

	if count > 0 {
		// Update existing funnel - preserve created_by and created_at
		_, err = db.NewRaw(
			"UPDATE trace_funnel SET \"name\" = ?, \"data\" = ?, \"updated_by\" = ?, \"updated_at\" = ?, \"description\" = ? WHERE \"id\" = ?",
			funnel.Name, string(funnelData), updatedBy, updatedAt, funnel.Description, funnel.ID,
		).Exec(context.Background())
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
			OrgID:       orgID,
			Name:        funnel.Name,
			Description: funnel.Description,
			Data:        string(funnelData),
		}

		_, err = db.NewInsert().Model(savedView).Exec(context.Background())
		if err != nil {
			return fmt.Errorf("failed to insert funnel: %v", err)
		}
	}

	return nil
}

// GetFunnelFromDB retrieves a funnel from the database
func (c *SQLClient) GetFunnelFromDB(funnelID string) (*Funnel, error) {
	db := c.funnels.BunDB()

	var savedView types.TraceFunnels
	err := db.NewSelect().
		Model(&savedView).
		Where("\"id\" = ?", funnelID).
		Scan(context.Background())

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("funnel not found")
	} else if err != nil {
		return nil, fmt.Errorf("failed to get funnel: %v", err)
	}

	var funnel Funnel
	if err := json.Unmarshal([]byte(savedView.Data), &funnel); err != nil {
		return nil, fmt.Errorf("failed to unmarshal funnel data: %v", err)
	}

	// Set the description from the database
	funnel.Description = savedView.Description

	return &funnel, nil
}

// ListFunnelsFromDB retrieves all funnels from the database for a given org
func (c *SQLClient) ListFunnelsFromDB(orgID string) ([]*Funnel, error) {
	db := c.funnels.BunDB()

	var views []types.TraceFunnels
	err := db.NewSelect().
		Model(&views).
		Where("\"org_id\" = ?", orgID).
		Scan(context.Background())

	if err != nil {
		return nil, err
	}

	var funnels []*Funnel
	for _, view := range views {
		var funnel Funnel
		if err := json.Unmarshal([]byte(view.Data), &funnel); err != nil {
			return nil, fmt.Errorf("failed to unmarshal funnel data: %v", err)
		}

		// Set the description from the database
		funnel.Description = view.Description

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
		Where("\"id\" = ?", funnelID).
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
	err := db.NewRaw("SELECT COUNT(*) FROM trace_funnel WHERE \"name\" = ? AND \"created_by\" = ?", name, userID).
		Scan(ctx, &count)

	if err != nil {
		return false, fmt.Errorf("failed to check funnel name collision: %v", err)
	}

	return count > 0, nil
}

// CreateFunnel creates a new funnel in the database
func (c *SQLClient) CreateFunnel(timestamp int64, funnelName, userID, orgID string) (*Funnel, error) {
	// Create new funnel
	funnel := &Funnel{
		ID:        uuid.New().String(),
		Name:      funnelName,
		CreatedAt: timestamp * 1000000, // Convert ms to ns
		CreatedBy: userID,
		OrgID:     orgID,
		Steps:     []FunnelStep{},
	}

	// Convert funnel to JSON for storage
	funnelData, err := json.Marshal(funnel)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal funnel data: %v", err)
	}

	db := c.funnels.BunDB()
	createdAt := time.Unix(0, funnel.CreatedAt).UTC().Format(time.RFC3339)

	_, err = db.NewRaw(
		"INSERT INTO trace_funnel (\"id\", \"name\", \"created_by\", \"updated_by\", \"data\", \"created_at\", \"updated_at\", \"org_id\") VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		funnel.ID, funnel.Name, userID, userID, string(funnelData), createdAt, createdAt, orgID,
	).Exec(context.Background())

	if err != nil {
		return nil, fmt.Errorf("failed to save funnel to database: %v", err)
	}

	return funnel, nil
}

// UpdateFunnel updates an existing funnel in the database
func (c *SQLClient) UpdateFunnel(funnel *Funnel, userID string) error {
	db := c.funnels.BunDB()

	// Convert funnel to JSON for storage
	funnelData, err := json.Marshal(funnel)
	if err != nil {
		return fmt.Errorf("failed to marshal funnel data: %v", err)
	}

	updatedAt := time.Unix(0, funnel.UpdatedAt).UTC().Format(time.RFC3339)

	// Update funnel in database
	_, err = db.NewRaw(
		"UPDATE trace_funnel SET \"data\" = ?, \"updated_by\" = ?, \"updated_at\" = ? WHERE \"id\" = ?",
		string(funnelData), userID, updatedAt, funnel.ID,
	).Exec(context.Background())

	if err != nil {
		return fmt.Errorf("failed to update funnel in database: %v", err)
	}

	return nil
}

// GetFunnelMetadata retrieves metadata for a funnel from the database
func (c *SQLClient) GetFunnelMetadata(funnelID string) (string, string, string, error) {
	db := c.funnels.BunDB()

	var createdAt, updatedAt, description string
	err := db.NewRaw(
		"SELECT \"created_at\", \"updated_at\", IFNULL(\"description\", '') FROM trace_funnel WHERE \"id\" = ?",
		funnelID,
	).Scan(context.Background(), &createdAt, &updatedAt, &description)

	if err != nil {
		return "", "", "", fmt.Errorf("failed to get funnel metadata: %v", err)
	}

	return createdAt, updatedAt, description, nil
}
