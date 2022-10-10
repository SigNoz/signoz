package usage

import (
	"context"
	"encoding/json"
	"fmt"
	"sync/atomic"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"

	licenseserver "go.signoz.io/signoz/ee/query-service/integrations/signozio"
	"go.signoz.io/signoz/ee/query-service/license"
	"go.signoz.io/signoz/ee/query-service/model"
	"go.signoz.io/signoz/ee/query-service/usage/repository"
	"go.signoz.io/signoz/pkg/query-service/utils/encryption"
)

const (
	MaxRetries           = 3
	RetryInterval        = 5 * time.Second
	stateUnlocked uint32 = 0
	stateLocked   uint32 = 1
)

var (
	// collect usage every hour
	collectionFrequency = 1 * time.Hour

	// send usage every 24 hour
	uploadFrequency = 24 * time.Hour

	locker = stateUnlocked
)

type Manager struct {
	repository *repository.Repository

	clickhouseConn clickhouse.Conn

	licenseRepo *license.Repo

	// end the usage routine, this is important to gracefully
	// stopping usage reporting and protect in-consistent updates
	done chan struct{}

	// terminated waits for the UsageExporter go routine to end
	terminated chan struct{}
}

func New(dbType string, db *sqlx.DB, licenseRepo *license.Repo, clickhouseConn clickhouse.Conn) (*Manager, error) {
	repo := repository.New(db)

	err := repo.Init(dbType)
	if err != nil {
		return nil, fmt.Errorf("failed to initiate usage repo: %v", err)
	}

	m := &Manager{
		repository:     repo,
		clickhouseConn: clickhouseConn,
		licenseRepo:    licenseRepo,
	}
	return m, nil
}

// start loads collects and exports any exported snapshot and starts the exporter
func (lm *Manager) Start() error {
	// compares the locker and stateUnlocked if both are same lock is applied else returns error
	if !atomic.CompareAndSwapUint32(&locker, stateUnlocked, stateLocked) {
		return fmt.Errorf("usage exporter is locked")
	}

	// check if license is present or not
	license, err := lm.licenseRepo.GetActiveLicense(context.Background())
	if err != nil {
		return fmt.Errorf("failed to get active license")
	}
	if license == nil {
		// we will not start the usage reporting if license is not present.
		zap.S().Info("no license present, skipping usage reporting")
		return nil
	}

	// upload previous snapshots if any
	err = lm.UploadUsage(context.Background())
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
	alreadyCreated, err := lm.repository.CheckSnapshotGtCreatedAt(ctx, ts)
	if err != nil {
		return err
	}
	if !alreadyCreated {
		zap.S().Info("Collecting current usage")
		exportError := lm.CollectAndStoreUsage(ctx)
		if exportError != nil {
			return exportError
		}
	} else {
		zap.S().Info("Nothing to collect")
	}
	return nil
}

func (lm *Manager) UsageExporter(ctx context.Context) {
	defer close(lm.terminated)

	collectionTicker := time.NewTicker(collectionFrequency)
	defer collectionTicker.Stop()

	uploadTicker := time.NewTicker(uploadFrequency)
	defer uploadTicker.Stop()

	for {
		select {
		case <-lm.done:
			return
		case <-collectionTicker.C:
			lm.CollectAndStoreUsage(ctx)
		case <-uploadTicker.C:
			lm.UploadUsage(ctx)
			// remove the old snapshots
			lm.repository.DropOldSnapshots(ctx)
		}
	}
}

type TableSize struct {
	Table             string `ch:"table"`
	DiskName          string `ch:"disk_name"`
	Rows              uint64 `ch:"rows"`
	UncompressedBytes uint64 `ch:"uncompressed_bytes"`
}

func (lm *Manager) CollectAndStoreUsage(ctx context.Context) error {
	snap, err := lm.GetUsageFromClickHouse(ctx)
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

	err = lm.repository.InsertSnapshot(ctx, &payload)
	if err != nil {
		return err
	}

	return nil
}

func (lm *Manager) GetUsageFromClickHouse(ctx context.Context) (*model.UsageSnapshot, error) {
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
	err := lm.clickhouseConn.Select(ctx, &tableSizes, query)
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
				snap.CurrentSamplesCount = val.Rows
			} else {
				snap.CurrentSamplesCountColdStorage = val.Rows
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

func (lm *Manager) UploadUsage(ctx context.Context) error {
	snapshots, err := lm.repository.GetSnapshotsNotSynced(ctx)
	if err != nil {
		return err
	}

	if len(snapshots) <= 0 {
		zap.S().Info("no snapshots to upload, skipping.")
		return nil
	}

	zap.S().Info("uploading snapshots")
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

		err = lm.UploadUsageWithExponentalBackOff(ctx, model.UsagePayload{
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

func (lm *Manager) UploadUsageWithExponentalBackOff(ctx context.Context, payload model.UsagePayload) error {
	for i := 1; i <= MaxRetries; i++ {
		apiErr := licenseserver.SendUsage(ctx, &payload)
		if apiErr != nil && i == MaxRetries {
			err := lm.repository.IncrementFailedRequestCount(ctx, payload.Id)
			if err != nil {
				zap.S().Errorf("failed to updated the failure count for snapshot in DB : ", zap.Error(err))
				return err
			}
			zap.S().Errorf("retries stopped : %v", zap.Error(err))
			// not returning error here since it is captured in the failed count
			return nil
		} else if apiErr != nil {
			// sleeping for exponential backoff
			sleepDuration := RetryInterval * time.Duration(i)
			zap.S().Errorf("failed to upload snapshot retrying after %v secs : %v", sleepDuration.Seconds(), zap.Error(apiErr.Err))
			time.Sleep(sleepDuration)

			// update the failed request count
			err := lm.repository.IncrementFailedRequestCount(ctx, payload.Id)
			if err != nil {
				zap.S().Errorf("failed to updated the failure count for snapshot in DB : %v", zap.Error(err))
				return err
			}
		} else {
			break
		}
	}

	// update the database that it is synced
	err := lm.repository.MoveToSynced(ctx, payload.Id)
	if err != nil {
		return err
	}

	return nil
}

func (lm *Manager) Stop() {
	close(lm.done)
	atomic.StoreUint32(&locker, stateUnlocked)
	<-lm.terminated
}
