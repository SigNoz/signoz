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

	licenseserver "go.signoz.io/query-service/ee/integrations/signozio"
	"go.signoz.io/query-service/ee/license"
	"go.signoz.io/query-service/ee/model"
	"go.signoz.io/query-service/utils/encryption"
)

// validate license every 24 hours
var validationFrequency = 30 * time.Second

const (
	MAX_RETRIES            = 2
	RETRY_INTERVAL_SECONDS = 2 * time.Second
)

type Manager struct {
	repo *Repo

	licenseRepo *license.Repo

	// end the usage routine, this is important to gracefully
	// stopping usage reporting and protect in-consistent updates
	done chan struct{}

	// terminated waits for the UsageExporter go routine to end
	terminated chan struct{}
}

func StartManager(dbType string, db *sqlx.DB, licenseRepo *license.Repo, clickhouseConn clickhouse.Conn) (*Manager, error) {

	repo := NewUsageRepo(db, clickhouseConn)
	err := repo.InitDB(dbType)

	if err != nil {
		return nil, fmt.Errorf("failed to initiate usage repo: %v", err)
	}

	m := &Manager{
		repo:        &repo,
		licenseRepo: licenseRepo,
	}

	if err := m.start(); err != nil {
		return m, err
	}

	return m, nil
}

// start loads active license in memory and initiates validator
func (lm *Manager) start() error {
	lm.exportOldSnapshots(context.Background())

	go lm.UsageExporter(context.Background())

	return nil
}

func (lm *Manager) exportOldSnapshots(ctx context.Context) error {
	snapshots, err := lm.repo.GetSnapshotsNotSynced(ctx)
	if err != nil {
		return err
	}

	for _, snap := range snapshots {
		metricsBytes, err := encryption.Decrypt([]byte(snap.ActivationId.String()[:32]), []byte(snap.Snapshot))
		if err != nil {
			return err
		}

		metrics := model.UsageSnapshot{}
		err = json.Unmarshal(metricsBytes, &metrics)
		if err != nil {
			return err
		}

		err = lm.ExportUsageWithExponentalBackOff(ctx, model.UsagePayload{
			UsageBase: model.UsageBase{
				Id:                snap.Id,
				InstallationId:    snap.InstallationId,
				ActivationId:      snap.ActivationId,
				FailedSyncRequest: snap.FailedSyncRequest,
			},
			SnapshotDate: snap.CreatedAt,
			Metrics:      metrics,
		})
		if err != nil {
			return err
		}
	}
	return nil
}

func (lm *Manager) UsageExporter(ctx context.Context) {
	defer close(lm.terminated)
	tick := time.NewTicker(validationFrequency)
	defer tick.Stop()

	for {
		select {
		case <-lm.done:
			return
		default:
			select {
			case <-lm.done:
				return
			case <-tick.C:
				lm.exportOldSnapshots(ctx)
				lm.ExportUsage(ctx)
			}
		}
	}
}

type TableSize struct {
	Table             string `ch:"table"`
	DiskName          string `ch:"disk_name"`
	Rows              uint64 `ch:"rows"`
	UncompressedBytes uint64 `ch:"uncompressed_bytes"`
}

func (lm *Manager) ExportUsage(ctx context.Context) error {

	snap, err := lm.GetUsage(ctx)
	if err != nil {
		return err
	}

	license, err := lm.licenseRepo.GetActiveLicense(ctx)
	if err != nil {
		return err
	}

	activationId, _ := uuid.Parse(license.ActivationId)
	// TODO (nitya) : Add installation ID in the payload
	payload := model.UsagePayload{
		UsageBase: model.UsageBase{
			ActivationId:      activationId,
			FailedSyncRequest: 0,
		},
		Metrics:      *snap,
		SnapshotDate: time.Now(),
	}

	snapshot, err := lm.repo.InsertSnapshot(ctx, payload)
	if err != nil {
		return err
	}

	err = lm.ExportUsageWithExponentalBackOff(ctx, *snapshot)
	if err != nil {
		return err
	}

	return nil
}

func (lm *Manager) GetUsage(ctx context.Context) (*model.UsageSnapshot, error) {
	tableSizes := []TableSize{}
	snap := model.UsageSnapshot{}

	// get usage from clickhouse
	query := `
		SELECT
			table,
			disk_name,
			sum(rows) as rows,
			sum(data_uncompressed_bytes) AS uncompressed_bytes
		FROM system.parts
		WHERE active AND (database in ('signoz_logs', 'signoz_metrics', 'signoz_traces')) AND (table in ('logs','samples_v2', 'signoz_index_v2'))
		GROUP BY
			table,
			disk_name
		ORDER BY table
	`
	err := lm.repo.clickhouseConn.Select(ctx, &tableSizes, query)
	if err != nil {
		return nil, err
	}

	for _, val := range tableSizes {
		switch val.Table {
		case "logs":
			if val.DiskName == "default" {
				snap.CurrentLogSizeBytes = val.UncompressedBytes
			} else {
				snap.CurrentLogSizeBytesColdStorage = val.UncompressedBytes
			}
		case "samples_v2":
			if val.DiskName == "default" {
				snap.CurrentTimeseriesCount = val.Rows
			} else {
				snap.CurrentTimeseriesCountColdStorage = val.Rows
			}
		case "signoz_index_v2":
			if val.DiskName == "default" {
				snap.CurrentSpansCount = val.Rows
			} else {
				snap.CurrentSpansCountColdStorage = val.Rows
			}
		}
	}

	return &snap, nil
}

func (lm *Manager) ExportUsageWithExponentalBackOff(ctx context.Context, payload model.UsagePayload) error {
	for i := 1; i <= MAX_RETRIES; i++ {
		apiErr := licenseserver.SendUsage(ctx, &payload)
		if apiErr != nil && i == MAX_RETRIES {
			err := lm.repo.IncrementFailedRequestCount(ctx, payload.Id)
			if err != nil {
				zap.S().Errorf("failed to updated the failure count for snapshot in DB : ", zap.Error(err))
				return err
			}
			zap.S().Errorf("retries stopped : ", zap.Error(err))
			return apiErr.Err
		} else if apiErr != nil {
			// sleeping for exponential backoff
			zap.S().Errorf("failed to upload snapshot retrying after %d secs : ", RETRY_INTERVAL_SECONDS*time.Duration(i), zap.Error(apiErr.Err))
			time.Sleep(RETRY_INTERVAL_SECONDS * time.Duration(i))

			// update the failed request count
			err := lm.repo.IncrementFailedRequestCount(ctx, payload.Id)
			if err != nil {
				zap.S().Errorf("failed to updated the failure count for snapshot in DB : ", zap.Error(err))
				return err
			}
		} else {
			break
		}
	}

	// update the database that it is synced
	err := lm.repo.MoveToSynced(ctx, payload.Id)
	if err != nil {
		return err
	}

	return nil
}

func (lm *Manager) Stop() {
	close(lm.done)
	<-lm.terminated
}
