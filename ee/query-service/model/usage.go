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

type UsagePayload struct {
	InstallationId uuid.UUID `json:"installationId"`
	ActivationId   uuid.UUID `json:"activationId"`
	Usage          []Usage   `json:"usage"`
}

type Usage struct {
	CollectorId string    `json:"collectorId"`
	Type        string    `json:"type"`
	Tenant      string    `json:"tenant"`
	TimeStamp   time.Time `json:"timestamp"`
	Count       int64     `json:"count"`
	Size        int64     `json:"size"`
}
