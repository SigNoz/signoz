package alertmanagertemplate

import (
	"context"
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateRuleTemplates(t *testing.T) {
	testCases := []struct {
		name          string
		titleTemplate string
		bodyTemplate  string
		wantMessages  []string
	}{
		{
			name: "NoTemplates",
		},
		{
			name:          "DollarReferences",
			titleTemplate: "$rule.name on $labels.host",
			bodyTemplate:  "$alert.status for $service.name",
		},
		{
			name:         "ActionBlockOnARuleVariable",
			bodyTemplate: "{{ if $alert.is_firing }}up{{ end }} $rule.name",
		},
		{
			name:          "NotifierFunctions",
			titleTemplate: "{{ .labels.pod | toUpper | trimSpace }}",
		},
		{
			// .CommonLabels is a field of the channel data model, so this fails
			// for every alert. Only execution can tell, and execution on a
			// sample is not proof for every alert.
			name:          "ChannelField_FailsOnlyWhenExecuted",
			titleTemplate: "Rule title: {{ .CommonLabels.alertname }}",
		},
		{
			name:         "SliceOutOfRange_FailsOnlyWhenExecuted",
			bodyTemplate: "{{ slice .labels.pod 0 40 }} is high",
		},
		{
			name:          "UnclosedAction",
			titleTemplate: "Lag on {{ $labels.queue",
			wantMessages:  []string{"title template: template: template:1: unclosed action"},
		},
		{
			name:         "UnknownFunction",
			bodyTemplate: "{{ $severity | toUpperAndTrim }}",
			wantMessages: []string{`body template: template: :1: function "toUpperAndTrim" not defined`},
		},
		{
			name:          "TitleAndBodyDoNotParse",
			titleTemplate: "{{ if $alert.is_firing }}firing",
			bodyTemplate:  "{{ $labels.pod | humanizeBytes }}",
			wantMessages: []string{
				"title template: template: template:1: unexpected EOF",
				`body template: template: :1: function "humanizeBytes" not defined`,
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			err := ValidateRuleTemplates(context.Background(), testCase.titleTemplate, testCase.bodyTemplate)
			if len(testCase.wantMessages) == 0 {
				require.NoError(t, err)
				return
			}

			require.Error(t, err)
			assert.True(t, errors.Ast(err, errors.TypeInvalidInput))
			got := make([]string, 0, len(testCase.wantMessages))
			for _, additional := range errors.AsJSON(err).Errors {
				got = append(got, additional.Message)
			}
			assert.Equal(t, testCase.wantMessages, got)
		})
	}
}
