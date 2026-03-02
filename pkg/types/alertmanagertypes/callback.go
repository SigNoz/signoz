package alertmanagertypes

import "github.com/prometheus/alertmanager/types"

// AlertStoreCallback is a no-op implementation of mem.AlertStoreCallback.
type AlertStoreCallback struct{}

func (AlertStoreCallback) PreStore(_ *types.Alert, _ bool) error { return nil }
func (AlertStoreCallback) PostStore(_ *types.Alert, _ bool)      {}
func (AlertStoreCallback) PostDelete(_ *types.Alert)             {}
