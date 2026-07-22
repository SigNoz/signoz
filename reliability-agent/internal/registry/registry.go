package registry

import (
	"fmt"
	"sort"
	"sync"

	"github.com/guruvedhanth-s/reliability-agent/internal/profile"
)

type Registry struct {
	mu       sync.RWMutex
	profiles map[string]profile.Profile
	active   map[string]string
}

func New() *Registry {
	return &Registry{profiles: map[string]profile.Profile{}, active: map[string]string{}}
}

func (r *Registry) Put(p profile.Profile) error {
	if err := p.Validate(); err != nil {
		return err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.profiles[p.Metadata.Name] = p
	return nil
}

func (r *Registry) List() []profile.Profile {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := make([]profile.Profile, 0, len(r.profiles))
	for _, p := range r.profiles {
		result = append(result, p)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Metadata.Name < result[j].Metadata.Name })
	return result
}

func (r *Registry) Get(name string) (profile.Profile, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, ok := r.profiles[name]
	if !ok {
		return profile.Profile{}, fmt.Errorf("profile %q not found", name)
	}
	return p, nil
}

func (r *Registry) Activate(name string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	p, ok := r.profiles[name]
	if !ok {
		return fmt.Errorf("profile %q not found", name)
	}
	r.active[p.ServiceKey()] = name
	return nil
}

func (r *Registry) Active(service, environment string) (profile.Profile, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	name, ok := r.active[service+"|"+environment]
	if !ok {
		return profile.Profile{}, fmt.Errorf("no active profile for %s|%s", service, environment)
	}
	return r.profiles[name], nil
}
