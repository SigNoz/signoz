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

// collect usage every 24 hours
var collectionFrequency = 24 * time.Hour

const (
	MAX_RETRIES            = 3
	RETRY_INTERVAL_SECONDS = 5 * time.Second
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

// start loads collects and exports any exported snapshot and starts the exporter
func (lm *Manager) start() error {
	// export enexported snapshots if any
	err := lm.exportUnexportedSnapshots(context.Background())
	if err != nil {
		return err
	}

	// collect snapshot if incase it wasn't collect in (t - collectionFrequency)
	err = lm.CollectCurrentUsage(context.Background())
	if err != nil {
		return err
	}

	go lm.UsageExporter(context.Background())

	return nil
}

// CollectCurrentUsage checks if needs to collect usage data
func (lm *Manager) CollectCurrentUsage(ctx context.Context) error {
	// check the DB if anything exist  where timestamp > t - collectionFrequency
	ts := time.Now().Add(-collectionFrequency)
	alreadyCreated, err := lm.repo.CheckSnapshotGtCreatedAt(ctx, ts)
	if err != nil {
		return nil
	}
	if !alreadyCreated {
		zap.S().Info("Collecting current usage")
		exportError := lm.CollectAndExportUsage(ctx)
		if exportError != nil {
			return exportError
		}
	} else {
		zap.S().Info("Skipping current usage collection")
	}
	return nil
}

func (lm *Manager) exportUnexportedSnapshots(ctx context.Context) error {
	snapshots, err := lm.repo.GetSnapshotsNotSynced(ctx)
	if err != nil {
		return err
	}

	if len(snapshots) <= 0 {
		zap.S().Info("no unexported snapshots to export, skipping.")
		return nil
	}

	zap.S().Info("exporting unexported snapshots")
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
	tick := time.NewTicker(collectionFrequency)
	defer tick.Stop()

	for {
		select {
		case <-lm.done:
			return
		case <-tick.C:
			lm.exportUnexportedSnapshots(ctx)
			lm.CollectAndExportUsage(ctx)
		}
	}
}

type TableSize struct {
	Table             string `ch:"table"`
	DiskName          string `ch:"disk_name"`
	Rows              uint64 `ch:"rows"`
	UncompressedBytes uint64 `ch:"uncompressed_bytes"`
}

func (lm *Manager) CollectAndExportUsage(ctx context.Context) error {

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
