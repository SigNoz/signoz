package inframonitoringtypes

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/swaggest/jsonschema-go"
)

// fullPodAttrs is a metadata map with every guaranteed pod key plus a dynamic
// group-by key, used across the round-trip cases.
func fullPodAttrs() map[string]string {
	return map[string]string{
		"k8s.pod.uid":          "uid-1",
		"k8s.pod.name":         "pod-1",
		"k8s.namespace.name":   "ns-1",
		"k8s.node.name":        "node-1",
		"k8s.deployment.name":  "dep-1",
		"k8s.statefulset.name": "",
		"k8s.daemonset.name":   "",
		"k8s.job.name":         "",
		"k8s.cronjob.name":     "",
		"k8s.cluster.name":     "cluster-1",
		"k8s.pod.start_time":   "2024-01-01T00:00:00Z",
		"custom.groupby":       "gv",
	}
}

func TestPodMeta_RoundTripAndRouting(t *testing.T) {
	attrs := fullPodAttrs()
	m := NewPodMeta(attrs)

	// known keys route to typed fields
	require.Equal(t, "uid-1", m.PodUID)
	require.Equal(t, "cluster-1", m.ClusterName)
	require.Equal(t, "2024-01-01T00:00:00Z", m.PodStartTime)
	// dynamic key routes to Extra, guaranteed keys do not
	require.Equal(t, map[string]string{"custom.groupby": "gv"}, m.Extra)

	// marshals to a single flat object equal to the input map
	b, err := json.Marshal(m)
	require.NoError(t, err)
	var flat map[string]string
	require.NoError(t, json.Unmarshal(b, &flat))
	require.Equal(t, attrs, flat)
	require.NotContains(t, string(b), "Extra")

	// round-trip back into the struct is stable
	var back PodMeta
	require.NoError(t, json.Unmarshal(b, &back))
	require.Equal(t, m, back)
}

func TestMeta_EmptyMarshalsToObjectNotNull(t *testing.T) {
	b, err := json.Marshal(NewClusterMeta(nil))
	require.NoError(t, err)
	require.JSONEq(t, `{"k8s.cluster.name":""}`, string(b))

	// a nil-Extra zero value still marshals its guaranteed keys, never null
	b, err = json.Marshal(ClusterMeta{})
	require.NoError(t, err)
	require.JSONEq(t, `{"k8s.cluster.name":""}`, string(b))
}

func TestMeta_AbsentGuaranteedKeyEmitsEmptyString(t *testing.T) {
	// os.type absent from attrs -> still present as "" (accepted behavior)
	m := NewHostMeta(map[string]string{"host.name": "h1"})
	require.Equal(t, "", m.OSType)
	b, err := json.Marshal(m)
	require.NoError(t, err)
	require.JSONEq(t, `{"host.name":"h1","os.type":""}`, string(b))
}

func TestMeta_DynamicKeyDoesNotDuplicateKnownKey(t *testing.T) {
	// a dynamic key colliding with a known key must not double-emit; the typed
	// field wins and there is exactly one occurrence on the wire.
	m := NewClusterMeta(map[string]string{"k8s.cluster.name": "c1"})
	require.Empty(t, m.Extra)
	require.Equal(t, "c1", m.ClusterName)
	b, err := json.Marshal(m)
	require.NoError(t, err)
	require.JSONEq(t, `{"k8s.cluster.name":"c1"}`, string(b))
}

func TestMetaKeys_ExpectedSetAndOrder(t *testing.T) {
	require.Equal(t, []string{"os.type", "host.name"}, HostMetaKeys)
	require.Equal(t, []string{"k8s.node.uid", "k8s.cluster.name", "k8s.node.name"}, NodeMetaKeys)
	require.Equal(t, []string{
		"k8s.pod.uid", "k8s.pod.name", "k8s.namespace.name", "k8s.node.name",
		"k8s.deployment.name", "k8s.statefulset.name", "k8s.daemonset.name",
		"k8s.job.name", "k8s.cronjob.name", "k8s.cluster.name", "k8s.pod.start_time",
	}, PodMetaKeys)
}

// TestMetaKeys_MatchStructTags guards against a field rename/reorder silently
// changing the fetch column list: every key must correspond to a json tag on
// the struct, and the two must be in the same order.
func TestMetaKeys_MatchStructTags(t *testing.T) {
	cases := []struct {
		keys []string
		typ  reflect.Type
	}{
		{HostMetaKeys, reflect.TypeOf(HostMeta{})},
		{PodMetaKeys, reflect.TypeOf(PodMeta{})},
		{ContainerMetaKeys, reflect.TypeOf(ContainerMeta{})},
		{NodeMetaKeys, reflect.TypeOf(NodeMeta{})},
		{NamespaceMetaKeys, reflect.TypeOf(NamespaceMeta{})},
		{ClusterMetaKeys, reflect.TypeOf(ClusterMeta{})},
		{DeploymentMetaKeys, reflect.TypeOf(DeploymentMeta{})},
		{DaemonSetMetaKeys, reflect.TypeOf(DaemonSetMeta{})},
		{StatefulSetMetaKeys, reflect.TypeOf(StatefulSetMeta{})},
		{JobMetaKeys, reflect.TypeOf(JobMeta{})},
		{VolumeMetaKeys, reflect.TypeOf(VolumeMeta{})},
	}
	for _, c := range cases {
		t.Run(c.typ.Name(), func(t *testing.T) {
			var tagKeys []string
			for i := range c.typ.NumField() {
				tag := c.typ.Field(i).Tag.Get("json")
				if tag == "" || tag == "-" {
					continue
				}
				tagKeys = append(tagKeys, tag)
			}
			require.Equal(t, tagKeys, c.keys)
		})
	}
}

// TestMeta_SchemaShape locks the OpenAPI contract the frontend depends on: known
// keys as properties + all required + additionalProperties:{type:string}.
func TestMeta_SchemaShape(t *testing.T) {
	r := jsonschema.Reflector{}
	s, err := r.Reflect(PodMeta{})
	require.NoError(t, err)

	require.Equal(t, PodMetaKeys, s.Required)
	require.Len(t, s.Properties, len(PodMetaKeys))
	for _, k := range PodMetaKeys {
		prop, ok := s.Properties[k]
		require.True(t, ok, "missing property %s", k)
		require.NotNil(t, prop.TypeObject)
		require.Equal(t, jsonschema.String.Type(), *prop.TypeObject.Type)
	}
	require.NotNil(t, s.AdditionalProperties)
	require.NotNil(t, s.AdditionalProperties.TypeObject)
	require.Equal(t, jsonschema.String.Type(), *s.AdditionalProperties.TypeObject.Type)
}
