package emptystatetypes

import "time"

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

// LastIngestedAt carries per-signal latest ingest times; null means no data has been observed.
type LastIngestedAt struct {
	Logs    *time.Time `json:"logs" required:"true" description:"Null when no logs have been ingested."`
	Traces  *time.Time `json:"traces" required:"true" description:"Null when no traces have been ingested."`
	Metrics *time.Time `json:"metrics" required:"true" description:"Null when no metrics have been ingested."`
}
