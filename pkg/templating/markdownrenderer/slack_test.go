package markdownrenderer

import (
	"encoding/json"
	"testing"
)

func jsonEqual(a, b string) bool {
	var va, vb any
	if err := json.Unmarshal([]byte(a), &va); err != nil {
		return false
	}
	if err := json.Unmarshal([]byte(b), &vb); err != nil {
		return false
	}
	ja, _ := json.Marshal(va)
	jb, _ := json.Marshal(vb)
	return string(ja) == string(jb)
}

func prettyJSON(s string) string {
	var v any
	if err := json.Unmarshal([]byte(s), &v); err != nil {
		return s
	}
	b, _ := json.MarshalIndent(v, "", "  ")
	return string(b)
}

func TestRenderSlackBlockKit(t *testing.T) {
	tests := []struct {
		name     string
		markdown string
		expected string
	}{
		{
			name:     "simple paragraph",
			markdown: "Hello world",
			expected: `[
				{
					"type": "section",
					"text": { "type": "mrkdwn", "text": "Hello world" }
				}
			]`,
		},
		{
			name: "alert-themed with heading, list, and code block",
			markdown: `# Alert Triggered

- Service: **checkout-api**
- Status: _critical_

` + "```" + `
error: connection timeout after 30s
` + "```",
			expected: `[
				{
					"type": "section",
					"text": { "type": "mrkdwn", "text": "*Alert Triggered*" }
				},
				{
					"type": "rich_text",
					"elements": [
						{
							"type": "rich_text_list", "style": "bullet", "indent": 0, "border": 0,
							"elements": [
								{ "type": "rich_text_section", "elements": [
									{ "type": "text", "text": "Service: " },
									{ "type": "text", "text": "checkout-api", "style": { "bold": true } }
								]},
								{ "type": "rich_text_section", "elements": [
									{ "type": "text", "text": "Status: " },
									{ "type": "text", "text": "critical", "style": { "italic": true } }
								]}
							]
						}
					]
				},
				{
					"type": "rich_text",
					"elements": [
						{
							"type": "rich_text_preformatted",
							"border": 0,
							"elements": [
								{ "type": "text", "text": "error: connection timeout after 30s" }
							]
						}
					]
				}
			]`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := RenderSlackBlockKit(tt.markdown)
			if err != nil {
				t.Fatalf("Render error: %v", err)
			}

			if !json.Valid([]byte(got)) {
				t.Fatalf("output is not valid JSON:\n%s", got)
			}

			if !jsonEqual(got, tt.expected) {
				t.Errorf("JSON mismatch\n\nMarkdown:\n%s\n\nExpected:\n%s\n\nGot:\n%s",
					tt.markdown, prettyJSON(tt.expected), prettyJSON(got))
			}
		})
	}
}

func TestRenderSlackMrkdwn(t *testing.T) {
	markdown := `# Alert Triggered

- Service: **checkout-api**
- Status: _critical_
- Dashboard: [View Dashboard](https://example.com/dashboard)

| Metric | Value | Threshold |
| --- | --- | --- |
| Latency | 250ms | 100ms |
| Error Rate | 5.2% | 1% |

` + "```" + `
error: connection timeout after 30s
` + "```"

	expected := "*Alert Triggered*\n\n" +
		"• Service: *checkout-api*\n" +
		"• Status: _critical_\n" +
		"• Dashboard: <https://example.com/dashboard|View Dashboard>\n\n" +
		"```\nMetric     | Value | Threshold\n-----------|-------|----------\nLatency    | 250ms | 100ms    \nError Rate | 5.2%  | 1%       \n```\n\n" +
		"```\nerror: connection timeout after 30s\n```\n\n"

	got, err := RenderSlackMrkdwn(markdown)
	if err != nil {
		t.Fatalf("Render error: %v", err)
	}

	if got != expected {
		t.Errorf("mrkdwn mismatch\n\nExpected:\n%q\n\nGot:\n%q", expected, got)
	}
}
