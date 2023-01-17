package opamp

import (
	"fmt"
	"sync"

	"go.signoz.io/signoz/pkg/query-service/app/opamp/filterprocessor"
)

var AgentConfigUpdater *RequestQueue

type RequestQueue struct {
	// lock to make sure only one update is sent to remote agents at a time
	m sync.Mutex
}

// AddFilter will go through all pipelines and add a filter processor
func (rq *RequestQueue) ApplyFilterConfig(c *filterprocessor.Config) error {
	rq.m.Lock()
	defer rq.m.Unlock()

	// todo: apply filter config and send to agents
	return fmt.Errorf("unimplemented")
}
