package alertmanagertypes

import (
	"bytes"
	"encoding/json"
	"net/url"
	"reflect"
	"sort"
	"strconv"
	"strings"

	"github.com/SigNoz/signoz/pkg/errors"
)

// RedactedSecretValue is the marker read APIs substitute for credential-bearing
// values. It matches upstream alertmanager's own elision output, so clients see
// the same placeholder they would from a stock alertmanager.
const RedactedSecretValue = "<secret>"

var (
	prometheusConfigPkgs = map[string]struct{}{
		"github.com/prometheus/alertmanager/config": {},
		"github.com/prometheus/common/config":       {},
	}
)

// isSecretStringType matches the named string types prometheus uses for
// credentials: Secret, SecretTemplateURL, and any future Secret* string type
// added to either config package.
func isSecretStringType(t reflect.Type) bool {
	if t.Kind() != reflect.String {
		return false
	}
	_, ok := prometheusConfigPkgs[t.PkgPath()]
	return ok && strings.HasPrefix(t.Name(), "Secret")
}

// isSecretURLType matches the struct-wrapped URL types (SecretURL in both
// config packages). Plain URL fields are endpoint locations, not credentials,
// and are deliberately left alone.
func isSecretURLType(t reflect.Type) bool {
	if t.Kind() != reflect.Struct {
		return false
	}
	_, ok := prometheusConfigPkgs[t.PkgPath()]
	return ok && t.Name() == "SecretURL"
}

// redactedURLValue builds a SecretURL whose String() is the marker. Opaque is
// used because a plain Path would be percent-escaped on marshal.
func redactedURLValue(t reflect.Type) reflect.Value {
	v := reflect.New(t).Elem()
	v.Field(0).Set(reflect.ValueOf(&url.URL{Opaque: RedactedSecretValue}))
	return v
}

// redactSecretsIn walks the receiver and overwrites every credential-bearing
// field with the marker. The walk is type-driven rather than key-driven, so
// notifiers added later — upstream or native — are covered as long as they use
// the prometheus secret types, which is the established pattern here.
func redactSecretsIn(v reflect.Value) {
	switch v.Kind() {
	case reflect.Pointer, reflect.Interface:
		if v.IsNil() {
			return
		}
		if v.Kind() == reflect.Pointer && isSecretURLType(v.Type().Elem()) {
			v.Set(reflect.New(v.Type().Elem()))
			v.Elem().Set(redactedURLValue(v.Type().Elem()))
			return
		}
		redactSecretsIn(v.Elem())
	case reflect.Struct:
		if isSecretURLType(v.Type()) && v.CanSet() {
			v.Set(redactedURLValue(v.Type()))
			return
		}
		for i := 0; i < v.NumField(); i++ {
			if v.Field(i).CanSet() {
				redactSecretsIn(v.Field(i))
			}
		}
	case reflect.String:
		if isSecretStringType(v.Type()) && v.String() != "" {
			v.SetString(RedactedSecretValue)
		}
	case reflect.Slice, reflect.Array:
		for i := 0; i < v.Len(); i++ {
			redactSecretsIn(v.Index(i))
		}
	}
	// Maps carry no credential fields today (they hold user metadata such as
	// custom_fields), so they are intentionally not walked.
}

// Redacted returns a copy of the channel whose Data has every credential
// replaced by RedactedSecretValue. The stored channel is never mutated.
func (c *Channel) Redacted() (*Channel, error) {
	receiver, err := NewReceiver(c.Data)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "unmarshal receiver for redaction")
	}

	redactSecretsIn(reflect.ValueOf(receiver))

	data, err := json.Marshal(receiver)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "marshal redacted receiver")
	}

	redacted := *c
	redacted.Data = string(data)
	return &redacted, nil
}

// RestoreRedactedSecrets substitutes the real credentials from storedData into
// incoming wherever incoming carries the marker at a position that was secret
// in storedData. Positions are taken from the stored receiver's own structure,
// so a marker anywhere else — user-typed, or under a config that did not exist
// before — is rejected rather than silently persisted.
func RestoreRedactedSecrets(incoming []byte, storedData string) ([]byte, error) {
	storedReceiver, err := NewReceiver(storedData)
	if err != nil {
		return nil, errors.WrapInternalf(err, errors.CodeInternal, "unmarshal stored receiver for secret restore")
	}

	storedSecrets := map[string]string{}
	collectSecretPaths(reflect.ValueOf(storedReceiver), "", storedSecrets)

	var body map[string]any
	if err := json.Unmarshal(incoming, &body); err != nil {
		return nil, errors.WrapInvalidInputf(err, errors.CodeInvalidInput, "unmarshal channel update body")
	}

	for path, value := range storedSecrets {
		restoreSecretAtPath(body, strings.Split(path, "."), value)
	}

	if leftover := findMarkerLeaf(body, ""); leftover != "" {
		return nil, errors.NewInvalidInputf(
			ErrCodeAlertmanagerChannelInvalid,
			"%q at %s has no stored credential to restore; provide the actual value",
			RedactedSecretValue,
			leftover,
		)
	}

	return json.Marshal(body)
}

// collectSecretPaths records the JSON path of every non-empty credential in
// the receiver, keyed as dot-separated tags with slice indices, e.g.
// "slack_configs.0.api_url".
func collectSecretPaths(v reflect.Value, path string, out map[string]string) {
	switch v.Kind() {
	case reflect.Pointer, reflect.Interface:
		if v.IsNil() {
			return
		}
		if v.Kind() == reflect.Pointer && isSecretURLType(v.Type().Elem()) {
			if s := secretURLString(v.Elem()); s != "" {
				out[path] = s
			}
			return
		}
		collectSecretPaths(v.Elem(), path, out)
	case reflect.Struct:
		if isSecretURLType(v.Type()) {
			if s := secretURLString(v); s != "" {
				out[path] = s
			}
			return
		}
		t := v.Type()
		for i := 0; i < v.NumField(); i++ {
			field := t.Field(i)
			if field.PkgPath != "" {
				continue
			}
			tag := strings.Split(field.Tag.Get("json"), ",")[0]
			if tag == "-" {
				continue
			}
			// Untagged and inline embeds contribute their fields to the
			// enclosing object rather than a nested key.
			fieldPath := path
			if tag != "" {
				if fieldPath != "" {
					fieldPath += "."
				}
				fieldPath += tag
			}
			collectSecretPaths(v.Field(i), fieldPath, out)
		}
	case reflect.String:
		if isSecretStringType(v.Type()) && v.String() != "" && path != "" {
			out[path] = v.String()
		}
	case reflect.Slice, reflect.Array:
		for i := 0; i < v.Len(); i++ {
			collectSecretPaths(v.Index(i), path+"."+strconv.Itoa(i), out)
		}
	}
}

func secretURLString(v reflect.Value) string {
	u, ok := v.Field(0).Interface().(*url.URL)
	if !ok || u == nil {
		return ""
	}
	return u.String()
}

func restoreSecretAtPath(node any, path []string, value string) {
	if len(path) == 0 || node == nil {
		return
	}
	switch n := node.(type) {
	case map[string]any:
		child, ok := n[path[0]]
		if !ok {
			return
		}
		if len(path) == 1 {
			if s, ok := child.(string); ok && s == RedactedSecretValue {
				n[path[0]] = value
			}
			return
		}
		restoreSecretAtPath(child, path[1:], value)
	case []any:
		idx, err := strconv.Atoi(path[0])
		if err != nil || idx < 0 || idx >= len(n) {
			return
		}
		restoreSecretAtPath(n[idx], path[1:], value)
	}
}

// findMarkerLeaf returns the path of the first remaining marker value, or ""
// when none is left. Deterministic order so the reported path is stable.
func findMarkerLeaf(node any, path string) string {
	switch n := node.(type) {
	case map[string]any:
		keys := make([]string, 0, len(n))
		for k := range n {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			p := k
			if path != "" {
				p = path + "." + k
			}
			if s, ok := n[k].(string); ok && s == RedactedSecretValue {
				return p
			}
			if found := findMarkerLeaf(n[k], p); found != "" {
				return found
			}
		}
	case []any:
		for i, item := range n {
			if found := findMarkerLeaf(item, path+"."+strconv.Itoa(i)); found != "" {
				return found
			}
		}
	}
	return ""
}

// HasRedactedSecretMarker reports whether the body carries the marker in
// either JSON spelling: literal from JS clients, escaped from Go clients.
func HasRedactedSecretMarker(body []byte) bool {
	return bytes.Contains(body, []byte(`"`+RedactedSecretValue+`"`)) ||
		bytes.Contains(body, []byte(`"\u003csecret\u003e"`))
}
