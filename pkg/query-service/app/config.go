package app

import (
	"time"

	"github.com/spf13/pflag"
	"go.signoz.io/signoz/pkg/query-service/constants"
)

// Deprecated: This struct is deprecated and no new variables should be added here.
// This is to support backwards compatibility with the existing values.
type Config struct {
	PromConfigPath    string
	SkipTopLvlOpsPath string
	DisableRules      bool
	PreferSpanMetrics bool
	RuleRepoURL       string
	CacheConfigPath   string
	FluxInterval      string
	Cluster           string
	MaxIdleConns      int
	MaxOpenConns      int
	DialTimeout       time.Duration
}

func (cfg *Config) RegisterFlags(pf *pflag.FlagSet) {
	pf.StringVar(&cfg.PromConfigPath, "config", "./config/prometheus.yml", "(prometheus config to read metrics)")
	pf.MarkDeprecated("config", "Use storage.prometheus-config instead.")
	pf.StringVar(&cfg.SkipTopLvlOpsPath, "skip-top-level-ops", "", "(config file to skip top level operations)")
	pf.BoolVar(&cfg.DisableRules, "rules.disable", false, "(disable rule evaluation)")
	pf.BoolVar(&cfg.PreferSpanMetrics, "prefer-span-metrics", false, "(prefer span metrics for service level metrics)")
	pf.StringVar(&cfg.RuleRepoURL, "rules.repo-url", constants.AlertHelpPage, "(host address used to build rule link in alert messages)")
	pf.StringVar(&cfg.CacheConfigPath, "experimental.cache-config", "", "(cache config to use)")
	pf.StringVar(&cfg.FluxInterval, "flux-interval", "5m", "(the interval to exclude data from being cached to avoid incorrect cache for data in motion)")
	pf.StringVar(&cfg.Cluster, "cluster", "cluster", "(cluster name - defaults to 'cluster')")
	pf.MarkDeprecated("cluster", "Use storage.cluster instead.")
	pf.StringVar(&cfg.Cluster, "cluster-name", "cluster", "(cluster name - defaults to 'cluster')")
	pf.MarkDeprecated("cluster-name", "Use storage.cluster instead.")
	pf.IntVar(&cfg.MaxIdleConns, "max-idle-conns", 50, "(number of connections to maintain in the pool, only used with clickhouse if not set in ClickHouseUrl env var DSN.)")
	pf.MarkDeprecated("max-idle-conns", "Use storage.max-idle-conns instead.")
	pf.IntVar(&cfg.MaxOpenConns, "max-open-conns", 100, "(max connections for use at any time, only used with clickhouse if not set in ClickHouseUrl env var DSN.)")
	pf.MarkDeprecated("max-open-conns", "Use storage.max-open-conns instead.")
	pf.DurationVar(&cfg.DialTimeout, "dial-timeout", 5*time.Second, "(the maximum time to establish a connection, only used with clickhouse if not set in ClickHouseUrl env var DSN.)")
	pf.MarkDeprecated("dial-timeout", "Use storage.dial-timeout instead.")
}
