package clickhouseOptimizeS3

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/go-co-op/gocron"
	"go.uber.org/zap"
)

// General
const (
	CH_OPTIMIZE_INTERVAL_IN_HOURS = 24
	CH_TIMEOUT_WAIT_IN_MINUTES    = 30
	S3_DISK_TYPE                  = "s3"
)

// Error message templates
const (
	ERROR_RUNNING_CRON_JOB    = "error running ch optimize cron job"
	ERROR_SCHEDULING_CRON_JOB = "error scheduling cron job for %s"
)

func InitChOptimizer(cluster string) error {

	chConn, err := initClickhouse()
	if err != nil {
		zap.L().Error("failed to initialize ClickHouse", zap.Error(err))
		return err
	}

	if s3Enabled, err := checkS3Enabled(chConn); err != nil {
		zap.L().Error("failed to check if S3 is enabled", zap.Error(err))
		return err
	} else if !s3Enabled {
		zap.L().Info("S3 is not enabled, skipping clickhouse s3 optimization")
		return nil
	}

	err = runCronJobAsync(chConn, cluster)
	if err != nil {
		zap.L().Error(ERROR_RUNNING_CRON_JOB, zap.Error(err))
		return err
	}

	zap.L().Info("clickhouseOptimizeS3 cron job started successfully")

	return nil
}

func initClickhouse() (driver.Conn, error) {
	datasource := os.Getenv("ClickHouseUrl")
	ctx := context.Background()
	options, err := clickhouse.ParseDSN(datasource)
	if err != nil {
		zap.L().Error("failed to parse DSN", zap.Error(err))
		return nil, err
	}

	zap.L().Info("Connecting to Clickhouse", zap.String("at", options.Addr[0]))
	db, err := clickhouse.Open(options)
	if err != nil {
		zap.L().Error("failed to initialize ClickHouse", zap.Error(err))
		return nil, err
	}

	if err := db.Ping(ctx); err != nil {
		zap.L().Error("failed to ping ClickHouse", zap.Error(err))
		return nil, err
	}

	return db, nil
}

func runCronJobAsync(chConn driver.Conn, cluster string) error {
	var s *gocron.Scheduler
	var err error

	s = gocron.NewScheduler(time.UTC)
	_, err = s.Every(CH_OPTIMIZE_INTERVAL_IN_HOURS).Hour().Do(optimizeTables, chConn, cluster)
	if err != nil {
		return fmt.Errorf(ERROR_SCHEDULING_CRON_JOB, err)
	}

	s.StartAsync()

	return nil
}

func optimizeTables(conn driver.Conn, cluster string) {

	// Array of db_name.table_name
	tables := []string{
		"signoz_logs.logs",
		"signoz_metrics.samples_v2",
		"signoz_metrics.time_series_v4",
		"signoz_metrics.time_series_v3",
		"signoz_metrics.time_series_v2",
		"signoz_traces.usage_explorer",
		"signoz_traces.span_attributes",
		"signoz_traces.dependency_graph_minutes",
		"signoz_traces.dependency_graph_minutes_v2",
		"signoz_traces.signoz_error_index_v2",
		"signoz_traces.signoz_index_v2",
		"signoz_traces.signoz_spans",
		"signoz_traces.durationSort",
	}
	for _, table := range tables {
		// run OPTIMIZE TABLE db_name.table_name ON CLUSTER cluster FINAL SETTINGS optimize_skip_merged_partitions=1;
		err := conn.Exec(context.Background(), "OPTIMIZE TABLE "+table+" ON CLUSTER "+cluster+" FINAL SETTINGS optimize_skip_merged_partitions=1;")

		if err != nil {
			if exception, ok := err.(*clickhouse.Exception); ok {
				if exception.Code == 159 {
					// sleep for CH_TIMEOUT_WAIT_IN_MINUTES if there's TIMEOUT_EXCEEDED - 159 error
					time.Sleep(CH_TIMEOUT_WAIT_IN_MINUTES * time.Minute)
				} else {
					log.Println("Error while optimizing table: ", table, err)
				}
			}
		}
	}
}

func checkS3Enabled(conn clickhouse.Conn) (bool, error) {
	var s3DiskCount uint64
	ctx := context.Background()
	query := fmt.Sprintf("SELECT count() FROM system.disks where type='%v'", S3_DISK_TYPE)
	row := conn.QueryRow(ctx, query)
	if err := row.Scan(&s3DiskCount); err != nil {
		return false, err
	}
	if s3DiskCount > 0 {
		return true, nil
	}
	return false, nil
}
