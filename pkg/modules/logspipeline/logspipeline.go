package logspipeline

import "github.com/SigNoz/signoz/pkg/statsreporter"

type Module interface {
	statsreporter.StatsCollector
}
