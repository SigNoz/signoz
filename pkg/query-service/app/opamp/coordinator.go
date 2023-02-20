package opamp

import "sync"

// responsible for managing subscribers on config change
type Coordinator struct {
	mutex       sync.Mutex
	subscribers []func(hash string) error
}

// OnSuccess listens to config changes and notifies subscribers
func (c *Coordinator) NotifySubscribers(hash string) error {
	for _, s := range c.subscribers {
		if err := s(hash); err != nil {
			return err
		}
	}

	return nil
}

// callers subscribe to this function to listen on config change requests
func (c *Coordinator) Subscribe(ss ...func(hash string) error) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	c.subscribers = append(c.subscribers, ss...)
}
