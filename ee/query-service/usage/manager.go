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

	"go.uber.org/zap"

	"github.com/SigNoz/signoz/ee/query-service/dao"
	"github.com/SigNoz/signoz/ee/query-service/license"
	"github.com/SigNoz/signoz/ee/query-service/model"
	"github.com/SigNoz/signoz/pkg/query-service/utils/encryption"
	"github.com/SigNoz/signoz/pkg/zeus"
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

	modelDao dao.ModelDao

	zeus zeus.Zeus
}

func New(modelDao dao.ModelDao, licenseRepo *license.Repo, clickhouseConn clickhouse.Conn, zeus zeus.Zeus) (*Manager, error) {
	m := &Manager{
		clickhouseConn: clickhouseConn,
		licenseRepo:    licenseRepo,
		scheduler:      gocron.NewScheduler(time.UTC).Every(1).Day().At("00:00"), // send usage every at 00:00 UTC
		modelDao:       modelDao,
		zeus:           zeus,
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
		zap.L().Error("failed to get active license", zap.Error(err))
		return
	}
	if license == nil {
		// we will not start the usage reporting if license is not present.
		zap.L().Info("no license present, skipping usage reporting")
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
			zap.L().Error("failed to get usage from clickhouse: %v", zap.Error(err))
			return
		}
		for _, u := range dbusages {
			u.Type = db
			usages = append(usages, u)
		}
	}

	if len(usages) <= 0 {
		zap.L().Info("no snapshots to upload, skipping.")
		return
	}

	zap.L().Info("uploading usage data")

	usagesPayload := []model.Usage{}
	for _, usage := range usages {
		usageDataBytes, err := encryption.Decrypt([]byte(usage.ExporterID[:32]), []byte(usage.Data))
		if err != nil {
			zap.L().Error("error while decrypting usage data: %v", zap.Error(err))
			return
		}

		usageData := model.Usage{}
		err = json.Unmarshal(usageDataBytes, &usageData)
		if err != nil {
			zap.L().Error("error while unmarshalling usage data: %v", zap.Error(err))
			return
		}

		usageData.CollectorID = usage.CollectorID
		usageData.ExporterID = usage.ExporterID
		usageData.Type = usage.Type
		usageData.Tenant = "default"
		usageData.OrgName = "default"
		usageData.TenantId = "default"
		usagesPayload = append(usagesPayload, usageData)
	}

	key, _ := uuid.Parse(license.Key)
	payload := model.UsagePayload{
		LicenseKey: key,
		Usage:      usagesPayload,
	}

	body, errv2 := json.Marshal(payload)
	if errv2 != nil {
		zap.L().Error("error while marshalling usage payload: %v", zap.Error(errv2))
		return
	}

	errv2 = lm.zeus.PutMeters(ctx, payload.LicenseKey.String(), body)
	if errv2 != nil {
		zap.L().Error("failed to upload usage: %v", zap.Error(errv2))
		// not returning error here since it is captured in the failed count
		return
	}
}

func (lm *Manager) Stop() {
	lm.scheduler.Stop()

	zap.L().Info("sending usage data before shutting down")
	// send usage before shutting down
	lm.UploadUsage()

	atomic.StoreUint32(&locker, stateUnlocked)
}
