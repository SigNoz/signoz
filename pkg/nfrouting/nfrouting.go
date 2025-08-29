package nfrouting

import "github.com/SigNoz/signoz/pkg/statsreporter"

type NotificationRoutes interface {
	statsreporter.StatsCollector
}
