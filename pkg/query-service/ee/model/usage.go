package model

import (
	"time"

	"github.com/google/uuid"
)

type UsageSnapshot struct {
	CurrentLogSizeBytes            uint64 `json:"currentLogSizeBytes"`
	CurrentLogSizeBytesColdStorage uint64 `json:"currentLogSizeBytesColdStorage"`
	CurrentSpansCount              uint64 `json:"currentSpansCount"`
	CurrentSpansCountColdStorage   uint64 `json:"currentSpansCountColdStorage"`
	CurrentSamplesCount            uint64 `json:"currentSamplesCount"`
	CurrentSamplesCountColdStorage uint64 `json:"currentSamplesCountColdStorage"`
}

type UsageBase struct {
	Id                uuid.UUID `json:"id" db:"id"`
	InstallationId    uuid.UUID `json:"installationId" db:"installation_id"`
	ActivationId      uuid.UUID `json:"activationId" db:"activation_id"`
	CreatedAt         time.Time `json:"createdAt" db:"created_at"`
	FailedSyncRequest int       `json:"failedSyncRequest" db:"failed_sync_request_count"`
}

type UsagePayload struct {
	UsageBase
	Metrics      UsageSnapshot `json:"metrics"`
	SnapshotDate time.Time     `json:"snapshotDate"`
}

type Usage struct {
	UsageBase
	Snapshot string `db:"snapshot"`
}
