package emptystatetypes

import "time"

// LastIngestedLookback bounds how far back the last-ingested probes search; older data reports null.
const LastIngestedLookback = 7 * 24 * time.Hour

type LicenseStatus string

const LicenseStatusUnknown LicenseStatus = "UNKNOWN"

func (status LicenseStatus) StringValue() string {
	return string(status)
}

type OrgContext struct {
	HasIngestedData bool           `json:"hasIngestedData" required:"true"`
	LastIngestedAt  LastIngestedAt `json:"lastIngestedAt" required:"true"`
	HasInfraMetrics bool           `json:"hasInfraMetrics" required:"true"`
	AlertsCount     int            `json:"alertsCount" required:"true"`
	DashboardsCount int            `json:"dashboardsCount" required:"true"`
	SavedViewsCount int            `json:"savedViewsCount" required:"true"`
	LicenseStatus   LicenseStatus  `json:"licenseStatus" required:"true" description:"Raw Zeus license state. Known values include DEFAULTED, ACTIVATED, EXPIRED, ISSUED, EVALUATING, EVALUATION_EXPIRED, TERMINATED, CANCELLED. UNKNOWN is emitted when no license state is available."`
}

// LastIngestedAt carries per-signal last ingest times; null means no data inside the lookback window.
type LastIngestedAt struct {
	Logs    *time.Time `json:"logs" required:"true" description:"Null when no logs were ingested in the last 7 days."`
	Traces  *time.Time `json:"traces" required:"true" description:"Null when no traces were ingested in the last 7 days."`
	Metrics *time.Time `json:"metrics" required:"true" description:"Null when no metrics were ingested in the last 7 days. Excludes span-generated metrics (signoz_ prefix), which only prove traces ingestion."`
}
