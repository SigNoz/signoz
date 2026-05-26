package pprof

import "github.com/SigNoz/signoz/pkg/factory"

// PProf is the interface that wraps the pprof service lifecycle.
type PProf interface {
	factory.Service
}
