package app

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// TODO(remove): Implemented at pkg/http/middleware/timeout_test.go
func TestGetRouteContextTimeout(t *testing.T) {
	var testGetRouteContextTimeoutData = []struct {
		Name          string
		OverrideValue string
		timeout       time.Duration
	}{
		{
			Name:          "default",
			OverrideValue: "",
			timeout:       60 * time.Second,
		},
		{
			Name:          "override",
			OverrideValue: "180",
			timeout:       180 * time.Second,
		},
		{
			Name:          "override more than max",
			OverrideValue: "610",
			timeout:       600 * time.Second,
		},
	}

	t.Parallel()

	for _, test := range testGetRouteContextTimeoutData {
		t.Run(test.Name, func(t *testing.T) {
			res := getRouteContextTimeout(test.OverrideValue)
			assert.Equal(t, test.timeout, res)
		})
	}
}
