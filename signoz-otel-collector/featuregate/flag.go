package featuregate

import (
	"strings"

	flag "github.com/spf13/pflag"
	"go.opentelemetry.io/collector/featuregate"

	"go.uber.org/multierr"
)

// NewFlag returns a flag.Value that directly applies feature gate statuses to a Registry.
func NewFlag(reg *featuregate.Registry) flag.Value {
	return &flagValue{reg: reg}
}

// flagValue implements the flag.Value interface and directly applies feature gate statuses to a Registry.
type flagValue struct {
	reg *featuregate.Registry
}

func (f *flagValue) String() string {
	var ids []string
	f.reg.VisitAll(func(g *featuregate.Gate) {
		id := g.ID()
		if !g.IsEnabled() {
			id = "-" + id
		}
		ids = append(ids, id)
	})
	return strings.Join(ids, ",")
}

func (f *flagValue) Set(s string) error {
	if s == "" {
		return nil
	}

	var errs error
	ids := strings.Split(s, ",")
	for i := range ids {
		id := ids[i]
		val := true
		switch id[0] {
		case '-':
			id = id[1:]
			val = false
		case '+':
			id = id[1:]
		}
		errs = multierr.Append(errs, f.reg.Set(id, val))
	}
	return errs
}

func (f *flagValue) Type() string {
	return "featuregate"
}
