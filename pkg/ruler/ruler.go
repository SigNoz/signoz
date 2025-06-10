package ruler

import "github.com/SigNoz/signoz/pkg/statsreporter"

type Ruler interface {
	statsreporter.StatsCollector
}
