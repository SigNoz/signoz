package usage

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/google/uuid"
	"go.opencensus.io/metric/metricdata"
	"go.opencensus.io/metric/metricexport"
)

// Options provides options for LogExporter
type Options struct {
	// ReportingInterval is a time interval between two successive metrics export.
	ReportingInterval time.Duration
}

type Usage struct {
	TimeStamp time.Time
	Count     int64
	Size      int64
}

type UsageCollector struct {
	exporterID           uuid.UUID
	reader               *metricexport.Reader
	ir                   *metricexport.IntervalReader
	initReaderOnce       sync.Once
	o                    Options
	db                   clickhouse.Conn
	dbName               string
	tableName            string
	distributedTableName string
	usageParser          func(metrics []*metricdata.Metric, exporterID uuid.UUID) (map[string]Usage, error)
	prevCount            int64
	prevSize             int64
	ttl                  int
}

var CollectorID uuid.UUID

func init() {
	CollectorID = uuid.New()
}

const cluster = "cluster"

func NewUsageCollector(exporterId uuid.UUID, db clickhouse.Conn, options Options, dbName string, usageParser func(metrics []*metricdata.Metric, id uuid.UUID) (map[string]Usage, error)) *UsageCollector {
	return &UsageCollector{
		exporterID:           exporterId,
		reader:               metricexport.NewReader(),
		o:                    options,
		db:                   db,
		dbName:               dbName,
		tableName:            UsageTableName,
		distributedTableName: "distributed_" + UsageTableName,
		usageParser:          usageParser,
		prevCount:            0,
		prevSize:             0,
		ttl:                  3,
	}
}

func (e *UsageCollector) Start() error {
	// start collector routine which
	e.initReaderOnce.Do(func() {
		e.ir, _ = metricexport.NewIntervalReader(&metricexport.Reader{}, e)
	})
	e.ir.ReportingInterval = e.o.ReportingInterval
	return e.ir.Start()
}

func (c *UsageCollector) Stop() error {
	c.ir.Stop()
	return nil
}

func (e *UsageCollector) ExportMetrics(ctx context.Context, metrics []*metricdata.Metric) error {
	usages, err := e.usageParser(metrics, e.exporterID)
	if err != nil {
		return err
	}
	time := time.Now()
	for tenant, usage := range usages {
		usage.TimeStamp = time
		usageBytes, err := json.Marshal(usage)
		if err != nil {
			return err
		}
		encryptedData, err := Encrypt([]byte(e.exporterID.String())[:32], usageBytes)
		if err != nil {
			return err
		}

		// insert everything as a new row
		err = e.db.Exec(ctx, fmt.Sprintf("insert into %s.%s values ($1, $2, $3, $4, $5)", e.dbName, e.distributedTableName), tenant, CollectorID.String(), e.exporterID.String(), time, string(encryptedData))
		if err != nil {
			return err
		}
	}
	return nil
}
