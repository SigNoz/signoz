package model

import (
	"time"

	"github.com/google/uuid"
)

type UsagePayload struct {
	InstallationId uuid.UUID `json:"installationId"`
	LicenseKey     uuid.UUID `json:"licenseKey"`
	Usage          []Usage   `json:"usage"`
}

type Usage struct {
	CollectorID string    `json:"collectorId"`
	ExporterID  string    `json:"exporterId"`
	Type        string    `json:"type"`
	Tenant      string    `json:"tenant"`
	TimeStamp   time.Time `json:"timestamp"`
	Count       int64     `json:"count"`
	Size        int64     `json:"size"`
	OrgName     string    `json:"orgName"`
	TenantId    string    `json:"tenantId"`
}

type UsageDB struct {
	CollectorID string    `ch:"collector_id" json:"collectorId"`
	ExporterID  string    `ch:"exporter_id" json:"exporterId"`
	Type        string    `ch:"-" json:"type"`
	TimeStamp   time.Time `ch:"timestamp" json:"timestamp"`
	Tenant      string    `ch:"tenant" json:"tenant"`
	Data        string    `ch:"data" json:"data"`
}
