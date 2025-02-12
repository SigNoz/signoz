package usage

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"sync/atomic"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/go-co-op/gocron"
	"github.com/google/uuid"

	"go.uber.org/zap"

	"go.signoz.io/signoz/ee/query-service/dao"
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

	modelDao dao.ModelDao

	tenantID string
}

func New(modelDao dao.ModelDao, licenseRepo *license.Repo, clickhouseConn clickhouse.Conn, chUrl string) (*Manager, error) {
	hostNameRegex := regexp.MustCompile(`tcp://(?P<hostname>.*):`)
	hostNameRegexMatches := hostNameRegex.FindStringSubmatch(chUrl)

	tenantID := ""
	if len(hostNameRegexMatches) == 2 {
		tenantID = hostNameRegexMatches[1]
		tenantID = strings.TrimSuffix(tenantID, "-clickhouse")
	}

	m := &Manager{
		// repository:     repo,
		clickhouseConn: clickhouseConn,
		licenseRepo:    licenseRepo,
		scheduler:      gocron.NewScheduler(time.UTC).Every(1).Day().At("00:00"), // send usage every at 00:00 UTC
		modelDao:       modelDao,
		tenantID:       tenantID,
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

	orgName := ""
	orgNames, orgError := lm.modelDao.GetOrgs(ctx)
	if orgError != nil {
		zap.L().Error("failed to get org data: %v", zap.Error(orgError))
	}
	if len(orgNames) == 1 {
		orgName = orgNames[0].Name
	}

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
		usageData.Tenant = usage.Tenant
		usageData.OrgName = orgName
		usageData.TenantId = lm.tenantID
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
			zap.L().Error("retries stopped : %v", zap.Error(apiErr))
			// not returning error here since it is captured in the failed count
			return
		} else if apiErr != nil {
			// sleeping for exponential backoff
			sleepDuration := RetryInterval * time.Duration(i)
			zap.L().Error("failed to upload snapshot retrying after %v secs : %v", zap.Duration("sleepDuration", sleepDuration), zap.Error(apiErr.Err))
			time.Sleep(sleepDuration)
		} else {
			break
		}
	}
}

func (lm *Manager) Stop() {
	lm.scheduler.Stop()

	zap.L().Info("sending usage data before shutting down")
	// send usage before shutting down
	lm.UploadUsage()

	atomic.StoreUint32(&locker, stateUnlocked)
}
