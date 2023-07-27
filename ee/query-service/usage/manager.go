package usage

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync/atomic"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/go-co-op/gocron"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"go.uber.org/zap"

	licenseserver "go.signoz.io/signoz/ee/query-service/integrations/signozio"
	"go.signoz.io/signoz/ee/query-service/license"
	"go.signoz.io/signoz/ee/query-service/model"
	"go.signoz.io/signoz/pkg/query-service/utils/encryption"
)

const (
	MaxRetries           = 3
	RetryInterval        = 5 * time.Second
	stateUnlocked uint32 = 0
	stateLocked   uint32 = 1
)

var (
	locker = stateUnlocked
)

type Manager struct {
	clickhouseConn clickhouse.Conn

	licenseRepo *license.Repo

	scheduler *gocron.Scheduler
}

func New(dbType string, db *sqlx.DB, licenseRepo *license.Repo, clickhouseConn clickhouse.Conn) (*Manager, error) {

	m := &Manager{
		// repository:     repo,
		clickhouseConn: clickhouseConn,
		licenseRepo:    licenseRepo,
		scheduler:      gocron.NewScheduler(time.UTC).Every(1).Day().At("00:00"), // send usage every at 00:00 UTC
	}
	return m, nil
}

// start loads collects and exports any exported snapshot and starts the exporter
func (lm *Manager) Start() error {
	// compares the locker and stateUnlocked if both are same lock is applied else returns error
	if !atomic.CompareAndSwapUint32(&locker, stateUnlocked, stateLocked) {
		return fmt.Errorf("usage exporter is locked")
	}

	_, err := lm.scheduler.Do(func() { lm.UploadUsage() })
	if err != nil {
		return err
	}

	// upload usage once when starting the service
	lm.UploadUsage()

	lm.scheduler.StartAsync()

	return nil
}
func (lm *Manager) UploadUsage() {
	ctx := context.Background()
	// check if license is present or not
	license, err := lm.licenseRepo.GetActiveLicense(ctx)
	if err != nil {
		zap.S().Errorf("failed to get active license: %v", zap.Error(err))
		return
	}
	if license == nil {
		// we will not start the usage reporting if license is not present.
		zap.S().Info("no license present, skipping usage reporting")
		return
	}

	usages := []model.UsageDB{}

	// get usage from clickhouse
	dbs := []string{"signoz_logs", "signoz_traces", "signoz_metrics"}
	query := `
		SELECT tenant, collector_id, exporter_id, timestamp, data
		FROM %s.distributed_usage as u1 
			GLOBAL INNER JOIN 
				(SELECT  
					tenant, collector_id, exporter_id, MAX(timestamp) as ts 
					FROM %s.distributed_usage as u2 
					where timestamp >= $1 
					GROUP BY tenant, collector_id, exporter_id 
				) as t1
		ON 
		u1.tenant = t1.tenant AND u1.collector_id = t1.collector_id AND u1.exporter_id = t1.exporter_id and u1.timestamp = t1.ts 
		order by timestamp
	`

	for _, db := range dbs {
		dbusages := []model.UsageDB{}
		err := lm.clickhouseConn.Select(ctx, &dbusages, fmt.Sprintf(query, db, db), time.Now().Add(-(24 * time.Hour)))
		if err != nil && !strings.Contains(err.Error(), "doesn't exist") {
			zap.S().Errorf("failed to get usage from clickhouse: %v", zap.Error(err))
			return
		}
		for _, u := range dbusages {
			u.Type = db
			usages = append(usages, u)
		}
	}

	if len(usages) <= 0 {
		zap.S().Info("no snapshots to upload, skipping.")
		return
	}

	zap.S().Info("uploading usage data")

	usagesPayload := []model.Usage{}
	for _, usage := range usages {
		usageDataBytes, err := encryption.Decrypt([]byte(usage.ExporterID[:32]), []byte(usage.Data))
		if err != nil {
			zap.S().Errorf("error while decrypting usage data: %v", zap.Error(err))
			return
		}

		usageData := model.Usage{}
		err = json.Unmarshal(usageDataBytes, &usageData)
		if err != nil {
			zap.S().Errorf("error while unmarshalling usage data: %v", zap.Error(err))
			return
		}

		usageData.CollectorID = usage.CollectorID
		usageData.ExporterID = usage.ExporterID
		usageData.Type = usage.Type
		usageData.Tenant = usage.Tenant
		usagesPayload = append(usagesPayload, usageData)
	}

	key, _ := uuid.Parse(license.Key)
	payload := model.UsagePayload{
		LicenseKey: key,
		Usage:      usagesPayload,
	}
	lm.UploadUsageWithExponentalBackOff(ctx, payload)
}

func (lm *Manager) UploadUsageWithExponentalBackOff(ctx context.Context, payload model.UsagePayload) {
	for i := 1; i <= MaxRetries; i++ {
		apiErr := licenseserver.SendUsage(ctx, payload)
		if apiErr != nil && i == MaxRetries {
			zap.S().Errorf("retries stopped : %v", zap.Error(apiErr))
			// not returning error here since it is captured in the failed count
			return
		} else if apiErr != nil {
			// sleeping for exponential backoff
			sleepDuration := RetryInterval * time.Duration(i)
			zap.S().Errorf("failed to upload snapshot retrying after %v secs : %v", sleepDuration.Seconds(), zap.Error(apiErr.Err))
			time.Sleep(sleepDuration)
		} else {
			break
		}
	}
}

func (lm *Manager) Stop() {
	lm.scheduler.Stop()

	zap.S().Debug("sending usage data before shutting down")
	// send usage before shutting down
	lm.UploadUsage()

	atomic.StoreUint32(&locker, stateUnlocked)
}
