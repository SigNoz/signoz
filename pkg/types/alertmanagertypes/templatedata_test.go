package alertmanagertypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/stretchr/testify/assert"
)

func TestTemplateFailuresNotice(t *testing.T) {
	engineError := func(message string) error {
		return errors.New(errors.TypeInvalidInput, errors.CodeInvalidInput, message)
	}

	testCases := []struct {
		name     string
		failures TemplateFailures
		want     string
	}{
		{
			name: "NoFailure",
		},
		{
			// The position counts the preamble of a rule template, and the
			// angle brackets are markup in some channels.
			name:     "RuleTitle_ExecutionError_KeepsTheExpressionAndTheReason",
			failures: TemplateFailures{RuleTitle: engineError(`failed to execute custom title template: template: :1:431: executing "" at <.CommonLabels.alertname>: nil pointer evaluating interface {}.alertname`)},
			want:     "The rule title template failed: `.CommonLabels.alertname: nil pointer evaluating interface {}.alertname`. The channel title is shown.",
		},
		{
			name:     "RuleBody_ParseError",
			failures: TemplateFailures{RuleBody: engineError("template: template:1: unclosed action")},
			want:     "The rule body template failed: `unclosed action`. The channel body is shown.",
		},
		{
			name:     "ChannelTitle_UnknownFunction",
			failures: TemplateFailures{ChannelTitle: engineError(`template: :1: function "toUpperAndTrim" not defined`)},
			want:     "The channel title template failed: `function \"toUpperAndTrim\" not defined`. The built-in title is shown.",
		},
		{
			name:     "ChannelBody_ExecutionError",
			failures: TemplateFailures{ChannelBody: engineError(`failed to execute default template: template: :3:22: executing "" at <.Value>: can't evaluate field Value in type template.Alert`)},
			want:     "The channel body template failed: `.Value: can't evaluate field Value in type template.Alert`. The built-in body is shown.",
		},
		{
			name:     "BackticksAndLineBreaks_StayInOneCodeSpan",
			failures: TemplateFailures{RuleBody: engineError("template: :2:5: executing \"\" at <printf `%d`\n .labels.pod>: wrong type")},
			want:     "The rule body template failed: `printf '%d' .labels.pod: wrong type`. The channel body is shown.",
		},
		{
			name:     "NotAnEngineError_IsShownAsItIs",
			failures: TemplateFailures{RuleTitle: engineError("failed to build template data map")},
			want:     "The rule title template failed: `failed to build template data map`. The channel title is shown.",
		},
		{
			name: "EveryTemplateFailed_OneLineEach",
			failures: TemplateFailures{
				RuleTitle:    engineError("template: template:1: unexpected EOF"),
				RuleBody:     engineError("template: template:4: unclosed action"),
				ChannelTitle: engineError(`template: :1: function "upper" not defined`),
				ChannelBody:  engineError(`template: :1: function "lower" not defined`),
			},
			want: "The rule title template failed: `unexpected EOF`. The channel title is shown.\n\n" +
				"The rule body template failed: `unclosed action`. The channel body is shown.\n\n" +
				"The channel title template failed: `function \"upper\" not defined`. The built-in title is shown.\n\n" +
				"The channel body template failed: `function \"lower\" not defined`. The built-in body is shown.",
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, testCase.failures.Notice())
		})
	}
}
