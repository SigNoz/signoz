package traceFunnels

import (
	"fmt"
	"github.com/google/uuid"
	"sync"
)

type FunnelStore struct {
	sync.RWMutex
	funnels map[string]*Funnel
}

func (s *FunnelStore) CreateFunnel(name, userID, orgID string, timestamp int64) (*Funnel, error) {
	s.Lock()
	defer s.Unlock()

	for _, existingFunnel := range s.funnels {
		if existingFunnel.Name == name && existingFunnel.CreatedBy == userID {
			return nil, fmt.Errorf("funnel with name '%s' already exists for user '%s'", name, userID)
		}
	}

	if timestamp == 0 {
		return nil, fmt.Errorf("timestamp is required")
	}

	funnel := &Funnel{
		ID:        uuid.New().String(),
		Name:      name,
		CreatedAt: timestamp * 1000000, // Convert milliseconds to nanoseconds for internal storage
		CreatedBy: userID,
		OrgID:     orgID,
		Steps:     make([]FunnelStep, 0),
	}

	s.funnels[funnel.ID] = funnel
	return funnel, nil
}

func (s *FunnelStore) GetFunnel(id string) (*Funnel, error) {
	s.RLock()
	defer s.RUnlock()

	funnel, ok := s.funnels[id]
	if !ok {
		return nil, fmt.Errorf("funnel not found")
	}

	return funnel, nil
}

func (s *FunnelStore) ListFunnels() []*Funnel {
	s.RLock()
	defer s.RUnlock()

	funnels := make([]*Funnel, 0, len(s.funnels))
	for _, funnel := range s.funnels {
		funnels = append(funnels, funnel)
	}

	return funnels
}

func (s *FunnelStore) UpdateFunnelSteps(id string, steps []FunnelStep, updatedBy string, updatedAt int64) error {
	s.Lock()
	defer s.Unlock()

	var targetFunnel *Funnel
	for _, funnel := range s.funnels {
		if funnel.ID == id {
			targetFunnel = funnel
			break
		}
	}

	if targetFunnel == nil {
		return fmt.Errorf("funnel with ID %s not found", id)
	}

	targetFunnel.Steps = steps

	targetFunnel.UpdatedAt = updatedAt * 1000000
	targetFunnel.UpdatedBy = updatedBy

	return nil
}

// DeleteFunnel removes a funnel from the in-memory store
func (s *FunnelStore) DeleteFunnel(id string) error {
	s.Lock()
	defer s.Unlock()

	if _, ok := s.funnels[id]; !ok {
		return fmt.Errorf("funnel with ID %s not found", id)
	}

	delete(s.funnels, id)
	return nil
}

// ValidateFunnelSteps validates funnel steps and ensures they have unique and correct order
// Rules: At least 2 steps, max 3 steps, orders must be unique and include 1 and 2
func ValidateFunnelSteps(steps []FunnelStep) error {
	if len(steps) < 2 {
		return fmt.Errorf("at least 2 funnel steps are required")
	}

	if len(steps) > 3 {
		return fmt.Errorf("maximum 3 funnel steps are allowed")
	}

	orderMap := make(map[int64]bool)

	for _, step := range steps {
		if orderMap[step.StepOrder] {
			return fmt.Errorf("duplicate step order: %d", step.StepOrder)
		}
		orderMap[step.StepOrder] = true

		if step.StepOrder < 1 || step.StepOrder > 3 {
			return fmt.Errorf("step order must be between 1 and 3, got: %d", step.StepOrder)
		}
	}

	if !orderMap[1] || !orderMap[2] {
		return fmt.Errorf("funnel steps with orders 1 and 2 are mandatory")
	}

	return nil
}

// NormalizeFunnelSteps ensures steps have sequential orders starting from 1
// This sorts steps by order and then reassigns orders to be sequential
func NormalizeFunnelSteps(steps []FunnelStep) []FunnelStep {
	// Sort steps by order
	sortedSteps := make([]FunnelStep, len(steps))
	copy(sortedSteps, steps)

	// Sort by order
	for i := 0; i < len(sortedSteps); i++ {
		for j := i + 1; j < len(sortedSteps); j++ {
			if sortedSteps[i].StepOrder > sortedSteps[j].StepOrder {
				sortedSteps[i], sortedSteps[j] = sortedSteps[j], sortedSteps[i]
			}
		}
	}

	// Normalize orders to be sequential starting from 1
	for i := 0; i < len(sortedSteps); i++ {
		sortedSteps[i].StepOrder = int64(i + 1)
	}

	return sortedSteps
}
