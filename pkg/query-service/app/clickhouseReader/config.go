package clickhouseReader

import (
	"time"

	"github.com/spf13/pflag"
)

type Config struct {
	Engine                              string
	PrometheusConfigPath                string
	DSN                                 string
	MaxIdleConns                        int
	MaxOpenConns                        int
	DialTimeout                         time.Duration
	Cluster                             string
	OptimizeReadInOrderRegex            string
	MaxExecutionTimeLeaf                string
	TimeoutBeforeCheckingExecutionSpeed string
	MaxBytesToRead                      string
}

func (cfg *Config) RegisterFlags(pf *pflag.FlagSet) {
	pf.StringVar(&cfg.DSN, "storage.dsn", "tcp://localhost:9000", "The dsn of the underlying storage.")
	pf.IntVar(&cfg.MaxIdleConns, "storage.max-idle-conns", 50, "Number of connections to maintain in the pool, only used with clickhouse if not set in the dsn.")
	pf.IntVar(&cfg.MaxOpenConns, "storage.max-open-conns", 100, "Max connections for use at any time, only used with clickhouse if not set in the dsn.")
	pf.DurationVar(&cfg.DialTimeout, "storage.dial-timeout", 5*time.Second, "Maximum time to establish a connection, only used with clickhouse if not set in the DSN.")
	pf.StringVar(&cfg.Cluster, "storage.cluster", "cluster", "The name of the cluster.")
	pf.StringVar(&cfg.OptimizeReadInOrderRegex, "storage.optimize-read-in-order-regex", "", "")
	pf.StringVar(&cfg.MaxExecutionTimeLeaf, "storage.max-execution-time-leaf", "", "")
	pf.StringVar(&cfg.TimeoutBeforeCheckingExecutionSpeed, "storage.timeout-before-checking-execution-speed", "", "")
	pf.StringVar(&cfg.MaxBytesToRead, "storage.max-bytes-to-read", "", "")
	pf.StringVar(&cfg.PrometheusConfigPath, "storage.prometheus-config-path", "./config/prometheus.yml", "Prometheus config to read metrics.")
}
