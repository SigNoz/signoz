package logstelemetryschema

import (
	"regexp"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

// applyPatternMasks computes a pattern the way PatternExpr does in ClickHouse,
// with Go's regexp, the same RE2 dialect. It is how the collector will compute
// patterns, so the two must agree on every message.
func applyPatternMasks(message string) string {
	if runes := []rune(message); len(runes) > patternMaxMessageChars {
		message = string(runes[:patternMaxMessageChars])
	}
	group := regexp.MustCompile(`\\(\d)`)
	for _, mask := range patternMasks {
		// ClickHouse writes a group as \1, Go as ${1}
		message = regexp.MustCompile(mask.regexp).ReplaceAllString(message, group.ReplaceAllString(mask.replacement, "$${$1}"))
	}
	if message = strings.Trim(message, " "); message == "" {
		return patternEmpty
	}
	return message
}

// TestPatternMasks pins what each rule does, and what it must leave alone.
func TestPatternMasks(t *testing.T) {
	testCases := []struct {
		rule     string
		message  string
		expected string
	}{
		{rule: "ansi", message: "\u001b[32mINFO\u001b[0m server started", expected: "INFO server started"},
		{rule: "lead_ws", message: "\n  leading newline then text", expected: "leading newline then text"},
		{rule: "stack_cut", message: "java.lang.IllegalStateException: boom\n\tat com.foo.Bar.baz(Bar.java:42)\n\tat com.foo.Main.main(Main.java:7)", expected: "java.lang.IllegalStateException: boom"},
		{rule: "stack_cut", message: "boom\nCaused by: java.io.IOException: x", expected: "boom"},
		{rule: "stack_cut", message: "TypeError: x is undefined\n    at Consumer.handle (/app/node_modules/c/index.js:12:5)", expected: "TypeError: x is undefined"},
		{rule: "stack_cut", message: "Traceback (most recent call last):\n  File \"a.py\", line 3", expected: "Traceback (most recent call last):"},
		{rule: "stack_cut", message: "panic: boom\n\ngoroutine 1 [running]:\nmain.main()", expected: "panic: boom"},
		{rule: "stack_cut", message: "Executed DbCommand (5ms)\nSELECT id FROM t", expected: "Executed DbCommand (<*>) SELECT id FROM t"},
		{rule: "stack_cut", message: "meeting notes\nat noon we met", expected: "meeting notes at noon we met"},
		{rule: "empty", message: "", expected: "<EMPTY>"},
		{rule: "empty", message: "   \n ", expected: "<EMPTY>"},
		{rule: "uuid", message: "user 123e4567-e89b-12d3-a456-426614174000 logged in", expected: "user <UUID> logged in"},
		{rule: "mac", message: "device 00:1A:2B:3C:4D:5E connected", expected: "device <MAC> connected"},
		{rule: "mac", message: "aa:bb:cc:dd:ee:ff", expected: "<MAC>"},
		{rule: "mac", message: "mac=00-1a-2b-3c-4d-5e", expected: "mac=<*>"},
		{rule: "ts_iso", message: "started 2026-11-12 10:22:01,123 ok", expected: "started <TS> ok"},
		{rule: "ts_iso", message: "at 2026-11-12T10:22:01.123Z done", expected: "at <TS> done"},
		{rule: "ts_iso", message: "2026/11/12 10:59:56 [notice] 7#7: signal 3 received", expected: "<TS> [notice] <*>: signal <*> received"},
		{rule: "ts_weekday", message: "Thu Nov 12 10:22:01 UTC 2026 Unable to add frame", expected: "<TS> Unable to add frame"},
		{rule: "ts_weekday", message: "Date: Thu, 12 Nov 2026 10:22:01 GMT", expected: "Date: <TS>"},
		{rule: "ts_weekday", message: "Thu Nov  5 10:22:01 2026 x", expected: "<TS> x"},
		{rule: "ts_weekday", message: "Thursday standup moved", expected: "Thursday standup moved"},
		{rule: "ts_syslog", message: "Nov 12 10:22:01 host sshd[42]: accepted", expected: "<TS> host sshd[<*>]: accepted"},
		{rule: "ts_syslog", message: "May 3 users signed up", expected: "May <*> users signed up"},
		{rule: "ts_slash", message: "[Nest] 1 - 11/12/2026, 3:04:05 PM LOG ready", expected: "[Nest] <*> - <TS> LOG ready"},
		{rule: "ts_slash", message: "on 12/11/2026 15:04:05 done", expected: "on <TS> done"},
		{rule: "ip", message: "from 10.0.0.12:8080 to 192.168.1.1", expected: "from <IP> to <IP>"},
		{rule: "email", message: "sent to jane.doe+x@example.co.uk", expected: "sent to <EMAIL>"},
		{rule: "email", message: "loading module spring-core@5.3.1", expected: "loading module spring-core@<*>"},
		{rule: "email", message: "user root@localhost denied", expected: "user root@localhost denied"},
		{rule: "url", message: "GET https://api.example.com/v1/users?id=5 200", expected: "GET <URL> <*>"},
		{rule: "url", message: "{\"u\":\"https://a.com/x\",\"k\":\"v\"}", expected: "{\"u\":<STR>,\"k\":<STR>}"},
		{rule: "url", message: "(OkHttp https://a.com/x) failed", expected: "(OkHttp <URL>) failed"},
		{rule: "url", message: "see http://a.com/x, then retry", expected: "see <URL>, then retry"},
		{rule: "hex", message: "ptr 0x7ffde4a1 freed", expected: "ptr <HEX> freed"},
		{rule: "hex", message: "amount 12345678901234567890123 ok", expected: "amount <*> ok"},
		{rule: "hex", message: "trace 4bf92f3577b34da6a3ce929d0e0e4736", expected: "trace <*>"},
		{rule: "frame", message: "\tat com.foo.Bar.baz(Bar.java:42)", expected: "at <FRAME>"},
		{rule: "frame", message: "at com.foo.Bar$1.run(Bar.java:10)", expected: "at <FRAME>"},
		{rule: "frame", message: "at org.x.Y.z(Y.java:1) ~[spring-core-5.3.1.jar:5.3.1]", expected: "at <FRAME> ~[spring-core-<*>.jar:<*>]"},
		{rule: "frame", message: "at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)", expected: "at <FRAME>"},
		{rule: "frame", message: "at async Consumer.handle (/app/index.js:12:5)", expected: "at <FRAME>"},
		{rule: "frame", message: "at /home/app/services/log.js:42:7", expected: "at <FRAME>"},
		{rule: "frame", message: "at least(3) items", expected: "at least(<*>) items"},
		{rule: "frame", message: "look at this(thing)", expected: "look at this(thing)"},
		{rule: "json_scalar", message: "{\"ok\":true,\"count\":42,\"err\":null,\"name\":\"bob\",\"neg\": -1.5e3}", expected: "{\"ok\":<*>,\"count\":<*>,\"err\":<*>,\"name\":<STR>,\"neg\": <*>}"},
		{rule: "json_scalar", message: "feature enabled true", expected: "feature enabled true"},
		{rule: "json_scalar", message: "{\"trueValue\":\"x\"}", expected: "{\"trueValue\":<STR>}"},
		{rule: "str", message: "said \"hello world\" and \"key\": 5", expected: "said <STR> and \"key\": <*>"},
		{rule: "kv", message: "user_id=abc status=ok", expected: "user_id=<*> status=<*>"},
		{rule: "kv", message: "stats (total=10, idle=2)", expected: "stats (total=<*>, idle=<*>)"},
		{rule: "kv", message: "request=CallBackRequest(type=status, amount=5)", expected: "request=<*>(type=<*>, amount=<*>)"},
		{rule: "kv", message: "list=[a, b] map={x}", expected: "list=[a, b] map={x}"},
		{rule: "kv", message: "RequestId=123e4567-e89b-12d3-a456-426614174000 done", expected: "RequestId=<*> done"},
		{rule: "kv", message: "Response: path=/api/v1/123e4567-e89b-12d3-a456-426614174000/tests/start, code=200", expected: "Response: path=<*>, code=<*>"},
		{rule: "kv", message: "<req user=bob id=7>x</req>", expected: "<req user=<*> id=<*>><*></req>"},
		{rule: "digit", message: "order TTMW12AB34 created", expected: "order <*> created"},
		{rule: "digit", message: "vpc-d0011db5 ACCEPT", expected: "vpc-<*> ACCEPT"},
		{rule: "digit", message: "ref URF_1794490605914_3542935", expected: "ref URF_<*>"},
		{rule: "digit", message: "host ingest.us2.signoz.cloud", expected: "host ingest.<*>.signoz.cloud"},
		{rule: "digit", message: "took 150ms", expected: "took <*>"},
		{rule: "digit", message: "retry 3 of 5", expected: "retry <*> of <*>"},
		{rule: "digit", message: "v1 api over http2", expected: "<*> api over <*>"},
		{rule: "digit", message: "Started AgencyBankingArcaIntegrationApplication in 5.2 seconds", expected: "Started AgencyBankingArcaIntegrationApplication in <*> seconds"},
		{rule: "collapse", message: "id 12:34/56@78#9 end", expected: "id <*> end"},
		{rule: "collapse", message: "path /api/v1/users/12345/orders", expected: "path /api/<*>/users/<*>/orders"},
		{rule: "collapse", message: "ids 1, 2, 3 done", expected: "ids <*>, <*>, <*> done"},
		{rule: "unquote", message: "name '42' set", expected: "name <*> set"},
		{rule: "ws", message: "a  \t b", expected: "a b"},
		{rule: "url_order", message: "POST https://api.x.com/v1/ref/123e4567-e89b-12d3-a456-426614174000/reference failed", expected: "POST <URL> failed"},
		{rule: "url_order", message: "GET http://10.0.0.1:8080/health ok", expected: "GET <URL> ok"},
		{rule: "xml_text", message: "<response><code>200</code><message>success</message></response>", expected: "<response><code><*></code><message><*></message></response>"},
		{rule: "xml_text", message: "<oxip version=\"7.1\"><message>garbled message</message></oxip>", expected: "<oxip version=<*>><message><*></message></oxip>"},
		{rule: "xml_text", message: "<a>\n  </a>", expected: "<a> </a>"},
		{rule: "xml_text", message: "<TS> ERROR <*> failed for user", expected: "<TS> ERROR <*> failed for user"},
		{rule: "xml_text", message: "value <b>bold</b> text", expected: "value <b><*></b> text"},
		{rule: "xml_text", message: "list<String> and Map<K,V> types", expected: "list<String> and Map<K,V> types"},
		{rule: "pod_suffix", message: "PUSH for node:cos-business-logic-7bccd7b796-xrsrt.complianceos-uat ok", expected: "PUSH for node:cos-business-logic-<*>.complianceos-uat ok"},
		{rule: "pod_suffix", message: "var.log.containers.cilium-sfhtn_kube-system", expected: "var.log.containers.cilium-<*>_kube-system"},
		{rule: "pod_suffix", message: "restarting pod cilium-58spv, reason OOM", expected: "restarting pod cilium-<*>, reason OOM"},
		{rule: "pod_suffix", message: "kafka-consumer-b957fc547-lgzh5 started", expected: "kafka-consumer-<*> started"},
		{rule: "pod_suffix", message: "agent python-httpx/0.27.0", expected: "agent python-httpx/<*>"},
		{rule: "pod_suffix", message: "call url-https://x.com/a", expected: "call <URL>"},
		{rule: "pod_suffix", message: "level-crypt", expected: "level-crypt"},
		{rule: "b64", message: "ReceiptHandle': 'AQEBJ7UqUro46SFpG8hmPf4mWw4jSZk1qYCFGm/IAAlPT03l+NhgC3hCsuqliqvxIq5xqON=' done", expected: "ReceiptHandle': <*> done"},
		{rule: "b64", message: "payload eJydkltPAjEQhf/abc+def12345/XYZ+qwerty== ok", expected: "payload <*> ok"},
		{rule: "b64", message: "content_type application/cloudevents+json", expected: "content_type application/cloudevents+json"},
		{rule: "b64", message: "GET /api/v1/customers/12345/accounts/67890/items", expected: "GET /api/<*>/customers/<*>/accounts/<*>/items"},
		{rule: "b64", message: "Started AbstractAnnotationConfigDispatcherServletInitializer now", expected: "Started AbstractAnnotationConfigDispatcherServletInitializer now"},
		{rule: "b64", message: "sum 1+2+3 is six", expected: "sum <*>+<*>+<*> is six"},
	}
	for _, testCase := range testCases {
		t.Run(testCase.rule+"/"+testCase.message, func(t *testing.T) {
			assert.Equal(t, testCase.expected, applyPatternMasks(testCase.message))
		})
	}
}

func TestPatternMasksCutOnACharacterBoundary(t *testing.T) {
	message := strings.Repeat("a", patternMaxMessageChars-1) + "é and the rest"
	assert.Equal(t, strings.Repeat("a", patternMaxMessageChars-1)+"é", applyPatternMasks(message))
}
