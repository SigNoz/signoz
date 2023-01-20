package opamp

import (
	"sync"

	"github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor"
)

var AgentConfigUpdater *ChangeManager

type ChangeManager struct {
	OpA
	// lock to make sure only one update is sent to remote agents at a time
	m sync.Mutex
}

func (c ChangeManager) Available() bool {

}

func (c *ChangeManager) ApplySamplingRules(elementType ElementType, elements []interface{}, gen func(elements []interface{}) (filterprocessor.Config, error)) (*ConfigVersion, error) {
	c.m.Lock()
	defer c.m.Unlock()

	// create a new version

	// write to config elements table

	// prepare config by calling gen func

	// queue up the config through opamp

}

func (c *ChangeManager) ApplyDropRules(elementType ElementType, elements []interface{}, gen func(elements []interface{})) (*ConfigVersion, error) {

}
