package traceFunnels

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"
)

// ClickHouseClient ClickHouse client
//type ClickHouseClient struct {
//	db *sql.DB
//}

// SQLiteClient handles persistence of funnels to SQLite database
type SQLiteClient struct {
	db *sql.DB
}

// NewSQLiteClient creates a new SQLite client
func NewSQLiteClient(db *sql.DB) (*SQLiteClient, error) {
	return &SQLiteClient{db: db}, nil
}

// SaveFunnelRequest is used to save a funnel to the SQLite database
type SaveFunnelRequest struct {
	FunnelID    string `json:"funnel_id"`             // Required: ID of the funnel to save
	UserID      string `json:"user_id,omitempty"`     // Optional: will use existing user ID if not provided
	OrgID       string `json:"org_id,omitempty"`      // Optional: will use existing org ID if not provided
	Tags        string `json:"tags,omitempty"`        // Optional: comma-separated tags
	Description string `json:"description,omitempty"` // Optional: human-readable description
	Timestamp   int64  `json:"timestamp,omitempty"`   // Optional: timestamp for update in milliseconds (uses current time if not provided)
}

// SaveFunnel saves a funnel to the SQLite database in the saved_views table
// Handles both creating new funnels and updating existing ones
func (c *SQLiteClient) SaveFunnel(funnel *Funnel, userID, orgID string, tags, extraData string) error {
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
	err = c.db.QueryRow("SELECT COUNT(*), IFNULL(created_by, ''), IFNULL(created_at, '') FROM saved_views WHERE uuid = ? AND category = 'funnel'", funnel.ID).Scan(&count, &existingCreatedBy, &existingCreatedAt)
	if err != nil {
		return fmt.Errorf("failed to check if funnel exists: %v", err)
	}

	if count > 0 {
		// Update existing funnel - preserve created_by and created_at
		_, err = c.db.Exec(
			"UPDATE saved_views SET name = ?, data = ?, updated_by = ?, updated_at = ?, tags = ?, extra_data = ? WHERE uuid = ? AND category = 'funnel'",
			funnel.Name, string(funnelData), updatedBy, updatedAt, tags, extraData, funnel.ID,
		)
		if err != nil {
			return fmt.Errorf("failed to update funnel: %v", err)
		}
	} else {
		// Insert new funnel - set both created and updated fields
		_, err = c.db.Exec(
			"INSERT INTO saved_views (uuid, name, category, created_by, updated_by, source_page, data, created_at, updated_at, org_id, tags, extra_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			funnel.ID, funnel.Name, "funnel", userID, updatedBy, "trace-funnels", string(funnelData), createdAt, updatedAt, orgID, tags, extraData,
		)
		if err != nil {
			return fmt.Errorf("failed to insert funnel: %v", err)
		}
	}

	return nil
}

// GetFunnelFromDB retrieves a funnel from the SQLite database
func (c *SQLiteClient) GetFunnelFromDB(funnelID string) (*Funnel, error) {
	var data string
	err := c.db.QueryRow("SELECT data FROM saved_views WHERE uuid = ? AND category = 'funnel'", funnelID).Scan(&data)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("funnel not found")
		}
		return nil, fmt.Errorf("failed to get funnel: %v", err)
	}

	var funnel Funnel
	if err := json.Unmarshal([]byte(data), &funnel); err != nil {
		return nil, fmt.Errorf("failed to unmarshal funnel data: %v", err)
	}

	return &funnel, nil
}

// ListFunnelsFromDB lists all funnels from the SQLite database
func (c *SQLiteClient) ListFunnelsFromDB(orgID string) ([]*Funnel, error) {
	rows, err := c.db.Query("SELECT data FROM saved_views WHERE category = 'funnel' AND org_id = ?", orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to list funnels: %v", err)
	}
	defer rows.Close()

	var funnels []*Funnel
	for rows.Next() {
		var data string
		if err := rows.Scan(&data); err != nil {
			return nil, fmt.Errorf("failed to scan funnel data: %v", err)
		}

		var funnel Funnel
		if err := json.Unmarshal([]byte(data), &funnel); err != nil {
			return nil, fmt.Errorf("failed to unmarshal funnel data: %v", err)
		}

		funnels = append(funnels, &funnel)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating funnel rows: %v", err)
	}

	return funnels, nil
}

// ListAllFunnelsFromDB lists all funnels from the SQLite database without org_id filter
func (c *SQLiteClient) ListAllFunnelsFromDB() ([]*Funnel, error) {
	rows, err := c.db.Query("SELECT data FROM saved_views WHERE category = 'funnel'")
	if err != nil {
		return nil, fmt.Errorf("failed to list all funnels: %v", err)
	}
	defer rows.Close()

	var funnels []*Funnel
	for rows.Next() {
		var data string
		if err := rows.Scan(&data); err != nil {
			return nil, fmt.Errorf("failed to scan funnel data: %v", err)
		}

		var funnel Funnel
		if err := json.Unmarshal([]byte(data), &funnel); err != nil {
			return nil, fmt.Errorf("failed to unmarshal funnel data: %v", err)
		}

		funnels = append(funnels, &funnel)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating funnel rows: %v", err)
	}

	return funnels, nil
}

// DeleteFunnelFromDB deletes a funnel from the SQLite database
func (c *SQLiteClient) DeleteFunnelFromDB(funnelID string) error {
	_, err := c.db.Exec("DELETE FROM saved_views WHERE uuid = ? AND category = 'funnel'", funnelID)
	if err != nil {
		return fmt.Errorf("failed to delete funnel: %v", err)
	}
	return nil
}
