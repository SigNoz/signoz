package legacyalertmanager

import (
	"encoding/json"
	"testing"

	"github.com/SigNoz/signoz/pkg/types/alertmanagertypes"
	"github.com/prometheus/alertmanager/api/v2/models"
	"github.com/stretchr/testify/assert"
)

func TestProvider_TestAlert(t *testing.T) {
	pa := &postableAlert{
		PostableAlert: &alertmanagertypes.PostableAlert{
			Alert: models.Alert{
				Labels: models.LabelSet{
					"alertname": "test",
				},
				GeneratorURL: "http://localhost:9090/graph?g0.expr=up&g0.tab=1",
			},
			Annotations: models.LabelSet{
				"summary": "test",
			},
		},
		Receivers: []string{"receiver1", "receiver2"},
	}

	body, err := json.Marshal(pa)
	if err != nil {
		t.Fatalf("failed to marshal postable alert: %v", err)
	}

	assert.Contains(t, string(body), "receiver1")
	assert.Contains(t, string(body), "receiver2")
}
