package funnels

import (
	"context"
	"fmt"
	"strings"
)

// FunnelStorage defines the interface for storing and retrieving funnels

type FunnelStorage interface {
	CreateFunnel(ctx context.Context, funnel Funnel) error
	GetFunnel(ctx context.Context, funnelName string, user string) (Funnel, error)
	UpdateFunnel(ctx context.Context, funnel Funnel) error
	DeleteFunnel(ctx context.Context, funnelName string, user string) error
	ListFunnels(ctx context.Context, user string) ([]Funnel, error)
}

// InMemoryFunnelStorage is a simple in-memory implementation for v0
type InMemoryFunnelStorage struct {
	funnels map[string]*Funnel
}

func NewInMemoryFunnelStorage() *InMemoryFunnelStorage {
	return &InMemoryFunnelStorage{
		funnels: make(map[string]*Funnel),
	}
}

func (s *InMemoryFunnelStorage) CreateFunnel(ctx context.Context, funnel *Funnel) error {
	key := funnel.User + ":" + funnel.FunnelName
	if _, exists := s.funnels[key]; exists {
		return fmt.Errorf("funnel already exists")
	}
	s.funnels[key] = funnel
	return nil
}

func (s *InMemoryFunnelStorage) GetFunnel(ctx context.Context, funnelName string, user string) (*Funnel, error) {
	key := user + ":" + funnelName
	funnel, exists := s.funnels[key]
	if !exists {
		return nil, fmt.Errorf("funnel not found")
	}
	return funnel, nil
}

func (s *InMemoryFunnelStorage) UpdateFunnel(ctx context.Context, funnel *Funnel) error {
	key := funnel.User + ":" + funnel.FunnelName
	if _, exists := s.funnels[key]; !exists {
		return fmt.Errorf("funnel not found")
	}
	s.funnels[key] = funnel
	return nil
}

func (s *InMemoryFunnelStorage) DeleteFunnel(ctx context.Context, funnelName string, user string) error {
	key := user + ":" + funnelName
	if _, exists := s.funnels[key]; !exists {
		return fmt.Errorf("funnel not found")
	}
	delete(s.funnels, key)
	return nil
}

func (s *InMemoryFunnelStorage) ListFunnels(ctx context.Context, user string) ([]Funnel, error) {
	var userFunnels []Funnel
	for key, funnel := range s.funnels {
		if strings.HasPrefix(key, user+":") {
			userFunnels = append(userFunnels, *funnel)
		}
	}
	return userFunnels, nil
}

////////////////////////////////////////////////////////////////////////////////

// ToDo: Persist the funnel using user preferences
// Funnel is a simple in-memory implementation for v0
type SQLiteFunnelStorage struct {
	funnels map[string]*Funnel
}

func NewSQLiteFunnelStorage() *SQLiteFunnelStorage {
	return &SQLiteFunnelStorage{
		funnels: make(map[string]*Funnel),
	}
}

func (s *SQLiteFunnelStorage) CreateFunnel(ctx context.Context, funnel *Funnel) error {
	key := funnel.User + ":" + funnel.FunnelName
	if _, exists := s.funnels[key]; exists {
		return fmt.Errorf("funnel already exists")
	}
	s.funnels[key] = funnel
	return nil
}

func (s *SQLiteFunnelStorage) GetFunnel(ctx context.Context, funnelName string, user string) (*Funnel, error) {
	key := user + ":" + funnelName
	funnel, exists := s.funnels[key]
	if !exists {
		return nil, fmt.Errorf("funnel not found")
	}
	return funnel, nil
}

func (s *SQLiteFunnelStorage) UpdateFunnel(ctx context.Context, funnel *Funnel) error {
	key := funnel.User + ":" + funnel.FunnelName
	if _, exists := s.funnels[key]; !exists {
		return fmt.Errorf("funnel not found")
	}
	s.funnels[key] = funnel
	return nil
}

func (s *SQLiteFunnelStorage) DeleteFunnel(ctx context.Context, funnelName string, user string) error {
	key := user + ":" + funnelName
	if _, exists := s.funnels[key]; !exists {
		return fmt.Errorf("funnel not found")
	}
	delete(s.funnels, key)
	return nil
}

func (s *SQLiteFunnelStorage) ListFunnels(ctx context.Context, user string) ([]Funnel, error) {
	var userFunnels []Funnel
	for key, funnel := range s.funnels {
		if strings.HasPrefix(key, user+":") {
			userFunnels = append(userFunnels, *funnel)
		}
	}
	return userFunnels, nil
}

////////
