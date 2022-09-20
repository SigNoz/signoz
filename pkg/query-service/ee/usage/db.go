package usage

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"

	"go.signoz.io/query-service/ee/model"
	"go.signoz.io/query-service/ee/usage/sqlite"
	"go.signoz.io/query-service/utils/encryption"
)

const (
	OVERALL_MAX_RETRIES = 9
)

// Repository is usage Repository which stores usage snapshot in a secured DB
type Repository struct {
	db             *sqlx.DB
	clickhouseConn clickhouse.Conn
}

// NewUsageRepo initiates a new usage Repository
func NewUsageRepo(db *sqlx.DB, clickhouseConn clickhouse.Conn) Repository {
	return Repository{
		db:             db,
		clickhouseConn: clickhouseConn,
	}
}

func (r *Repository) InitDB(engine string) error {
	switch engine {
	case "sqlite3", "sqlite":
		return sqlite.InitDB(r.db)
	default:
		return fmt.Errorf("unsupported db")
	}
}

func (r *Repository) InsertSnapshot(ctx context.Context, usage model.UsagePayload) (*model.UsagePayload, error) {

	snapshotBytes, err := json.Marshal(usage.Metrics)
	if err != nil {
		return nil, err
	}

	usage.Id = uuid.New()

	encryptedSnapshot, err := encryption.Encrypt([]byte(usage.ActivationId.String()[:32]), snapshotBytes)
	if err != nil {
		return nil, err
	}

	query := `INSERT INTO usage(id, activation_id, snapshot)
 				VALUES ($1, $2, $3)`
	_, err = r.db.ExecContext(ctx,
		query,
		usage.Id,
		usage.ActivationId,
		string(encryptedSnapshot),
	)
	if err != nil {
		zap.S().Errorf("error inserting usage data: %v", zap.Error(err))
		return nil, fmt.Errorf("failed to insert usage in db: %v", err)
	}
	return &usage, nil
}

func (r *Repository) MoveToSynced(ctx context.Context, id uuid.UUID) error {

	query := `UPDATE usage 
						SET synced = 'true',
						synced_at = $1
						WHERE id = $2`

	_, err := r.db.ExecContext(ctx, query, time.Now(), id)

	if err != nil {
		zap.S().Errorf("error in updating usage: ", zap.Error(err))
		return fmt.Errorf("failed to update usage in db: %v", err)
	}

	return nil
}

func (r *Repository) IncrementFailedRequestCount(ctx context.Context, id uuid.UUID) error {

	query := `UPDATE usage SET failed_sync_request_count = failed_sync_request_count + 1 WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		zap.S().Errorf("error in updating usage: ", zap.Error(err))
		return fmt.Errorf("failed to update usage in db: %v", err)
	}

	return nil
}

func (r *Repository) GetSnapshotsNotSynced(ctx context.Context) (*[]model.Usage, error) {
	snapshots := []model.Usage{}

	query := `SELECT id,created_at, activation_id, snapshot, failed_sync_request_count from usage where synced!='true' and failed_sync_request_count < $1 order by created_at asc `

	err := r.db.SelectContext(ctx, &snapshots, query, OVERALL_MAX_RETRIES)
	if err != nil {
		return nil, err
	}

	return &snapshots, nil
}

// CheckSnapshotGtCreatedAt checks if there is any snapshot greater than the provided timestamp
func (r *Repository) CheckSnapshotGtCreatedAt(ctx context.Context, ts time.Time) (bool, error) {
	snapshots := []model.Usage{}

	query := `SELECT id from usage where created_at > '$1'`
	err := r.db.SelectContext(ctx, &snapshots, query, ts)
	if err != nil {
		return false, err
	}

	return len(snapshots) > 0, err
}
