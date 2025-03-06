package funnels

import (
	"fmt"
	"github.com/google/uuid"
	"time"
)

// Funnel represents the core funnel structure
type Funnel struct {
	ID                uuid.UUID    `json:"id"`
	FunnelName        string       `json:"funnel_name"`
	CreationTimestamp time.Time    `json:"creation_timestamp"`
	User              string       `json:"user"`
	Steps             []FunnelStep `json:"steps"`
}

// FunnelStep represents individual steps within a funnel
type FunnelStep struct {
	Order       int64  `json:"funnel_order"`
	ServiceName string `json:"service_name"`
	SpanName    string `json:"span_name"`

	// ToDo: use QB filters
	Filters map[string]interface{} `json:"where_filters"`
}

// NewFunnel creates a new funnel with default values

// ToDp: use this funnel to create a new funnel with unique name, return error with the funnel with same name exists
func NewFunnel(name, user string) *Funnel {
	return &Funnel{
		ID:                uuid.New(),
		FunnelName:        name,
		CreationTimestamp: time.Now(),
		User:              user,
		Steps:             []FunnelStep{},
	}
}

// AddStep adds a new step to the funnel

// Modifies the current funnel, and adds a new step
// ToDo: use it
func (f *Funnel) AddStep(step FunnelStep) {
	step.Order = int64(len(f.Steps) + 1)
	f.Steps = append(f.Steps, step)
}

// UpdateStep updates an existing step in the funnel

// updates the given funnel step
// ToDo: use it
func (f *Funnel) UpdateStep(order int64, newStep FunnelStep) error {
	for i, step := range f.Steps {
		if step.Order == order {
			f.Steps[i] = newStep
			return nil
		}
	}
	return fmt.Errorf("step with order %d not found", order)
}

// DeleteStep removes a specific step from the funnel
// ToDo: use it
func (f *Funnel) DeleteStep(order int64) error {
	for i, step := range f.Steps {
		if step.Order == order {
			f.Steps = append(f.Steps[:i], f.Steps[i+1:]...)
			return nil
		}
	}
	return fmt.Errorf("step with order %d not found", order)
}
