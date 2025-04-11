package alertmanagertypes

import (
	"net/url"
	"testing"
	"time"

	"github.com/prometheus/alertmanager/types"
	"github.com/prometheus/common/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFromGlobs(t *testing.T) {
	template, err := FromGlobs([]string{})
	require.NoError(t, err)
	template.ExternalURL = &url.URL{Scheme: "http", Host: "localhost:8080", Path: ""}

	testCases := []struct {
		name     string
		alerts   []*types.Alert
		expected string
	}{
		{
			name: "SingleAlertWithValidRuleId",
			alerts: []*types.Alert{
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"ruleId": "01961575-461c-7668-875f-05d374062bfc",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
			},
			expected: "http://localhost:8080/alerts/edit?ruleId=01961575-461c-7668-875f-05d374062bfc",
		},
		{
			name: "SingleAlertWithValidRuleUUIDv4",
			alerts: []*types.Alert{
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"ruleId": "2d8edca5-4f24-4266-afd1-28cefadcfa88",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
			},
			expected: "http://localhost:8080/alerts/edit?ruleId=2d8edca5-4f24-4266-afd1-28cefadcfa88",
		},
		{
			name: "SingleAlertWithInvalidRuleId",
			alerts: []*types.Alert{
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"ruleId": "43textabc",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
			},
			expected: "http://localhost:8080/alerts",
		},
		{
			name: "MultipleAlertsWithMismatchingRuleId",
			alerts: []*types.Alert{
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"ruleId": "01961575-461c-7668-875f-05d374062bfc",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"ruleId": "0196156c-990e-7ec5-b28f-8a3cfbb9c865",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
			},
			expected: "http://localhost:8080/alerts",
		},
		{
			name: "MultipleAlertsWithMatchingRuleId",
			alerts: []*types.Alert{
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"ruleId": "01961575-461c-7668-875f-05d374062bfc",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"ruleId": "01961575-461c-7668-875f-05d374062bfc",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
			},
			expected: "http://localhost:8080/alerts/edit?ruleId=01961575-461c-7668-875f-05d374062bfc",
		},
		{
			name: "MultipleAlertsWithNoRuleId",
			alerts: []*types.Alert{
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"label1": "1",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
				{
					Alert: model.Alert{
						Labels: model.LabelSet{
							"label2": "2",
						},
					},
					UpdatedAt: time.Now(),
					Timeout:   false,
				},
			},
			expected: "http://localhost:8080/alerts",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			data := template.Data("__receiver", model.LabelSet{}, tc.alerts...)

			url, err := template.ExecuteTextString(`{{ template "__alertmanagerURL" . }}`, data)
			require.NoError(t, err)
			assert.Equal(t, tc.expected, url)

			url, err = template.ExecuteHTMLString(`{{ template "__alertmanagerURL" . }}`, data)
			require.NoError(t, err)
			assert.Equal(t, tc.expected, url)
		})
	}
}
