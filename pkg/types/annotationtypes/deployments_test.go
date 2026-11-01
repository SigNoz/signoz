package annotationtypes

import (
	"testing"

	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewDeploymentID(t *testing.T) {
	testCases := []struct {
		name    string
		service string
		env     string
		version string
		wantEq  bool
	}{
		{name: "SameTuple_SameID", service: "checkout", env: "prod", version: "1.2.0", wantEq: true},
		{name: "DifferentVersion_DifferentID", service: "checkout", env: "prod", version: "1.2.1", wantEq: false},
		{name: "DifferentEnv_DifferentID", service: "checkout", env: "staging", version: "1.2.0", wantEq: false},
		{name: "DifferentService_DifferentID", service: "cart", env: "prod", version: "1.2.0", wantEq: false},
	}

	base := NewDeploymentID("checkout", "prod", "1.2.0")
	require.Len(t, base, len("dep_")+8)
	assert.True(t, len(base) > 4 && base[:4] == "dep_")

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			got := NewDeploymentID(testCase.service, testCase.env, testCase.version)
			assert.Equal(t, testCase.wantEq, got == base)
		})
	}
}

func TestNewDeploymentSpecFromRow(t *testing.T) {
	testCases := []struct {
		name      string
		row       DeploymentRow
		wantAttrs map[string]string
		wantErr   bool
	}{
		{
			name: "IdentityKeysStripped_OthersKept",
			row: DeploymentRow{
				Signal: telemetrytypes.SignalTraces, Service: "checkout", Environment: "prod", Version: "1.2.0", FirstSeen: 1700000000123,
				TraceID: "abc", SpanID: "def",
				Labels: `{"service.name":"checkout","deployment.environment":"prod","deployment.environment.name":"prod","service.version":"1.2.0","k8s.namespace.name":"shop","host.name":"node-1"}`,
			},
			wantAttrs: map[string]string{"k8s.namespace.name": "shop", "host.name": "node-1"},
		},
		{
			name:      "EmptyLabels_EmptyMap",
			row:       DeploymentRow{Signal: telemetrytypes.SignalLogs, Service: "cart", Environment: "prod", Version: "2.0.0", LogID: "log-1"},
			wantAttrs: map[string]string{},
		},
		{
			name:    "MalformedLabels_Error",
			row:     DeploymentRow{Service: "cart", Environment: "prod", Version: "2.0.0", Labels: `{"service.name":`},
			wantErr: true,
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			spec, err := NewDeploymentSpecFromRow(testCase.row)
			if testCase.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, NewDeploymentID(testCase.row.Service, testCase.row.Environment, testCase.row.Version), spec.ID)
			assert.Equal(t, testCase.row.Signal, spec.Signal)
			assert.Equal(t, testCase.row.FirstSeen, spec.FirstSeen)
			assert.Equal(t, testCase.row.TraceID, spec.TraceID)
			assert.Equal(t, testCase.row.SpanID, spec.SpanID)
			assert.Equal(t, testCase.row.LogID, spec.LogID)
			assert.Equal(t, testCase.wantAttrs, spec.ResourceAttributes)
		})
	}
}

func TestMergeDeployments(t *testing.T) {
	traces := []DeploymentSpec{
		{Service: "checkout", Environment: "prod", Version: "1.2.0", FirstSeen: 200, Signal: telemetrytypes.SignalTraces, TraceID: "t1"},
		{Service: "cart", Environment: "prod", Version: "3.0.0", FirstSeen: 100, Signal: telemetrytypes.SignalTraces, TraceID: "t2"},
		{Service: "api", Environment: "prod", Version: "9.0.0", FirstSeen: 300, Signal: telemetrytypes.SignalTraces, TraceID: "t3"},
	}
	logs := []DeploymentSpec{
		{Service: "checkout", Environment: "prod", Version: "1.2.0", FirstSeen: 150, Signal: telemetrytypes.SignalLogs, LogID: "l1"},
		{Service: "cart", Environment: "prod", Version: "3.0.0", FirstSeen: 100, Signal: telemetrytypes.SignalLogs, LogID: "l2"},
		{Service: "worker", Environment: "prod", Version: "0.1.0", FirstSeen: 300, Signal: telemetrytypes.SignalLogs, LogID: "l3"},
	}

	testCases := []struct {
		name         string
		inputs       [][]DeploymentSpec
		wantOrder    []string
		wantSignalOf map[string]telemetrytypes.Signal
	}{
		{
			name:      "EarliestWins_TieKeepsFirstInput_SortedByFirstSeenThenService",
			inputs:    [][]DeploymentSpec{traces, logs},
			wantOrder: []string{"cart", "checkout", "api", "worker"},
			wantSignalOf: map[string]telemetrytypes.Signal{
				"cart":     telemetrytypes.SignalTraces,
				"checkout": telemetrytypes.SignalLogs,
				"api":      telemetrytypes.SignalTraces,
				"worker":   telemetrytypes.SignalLogs,
			},
		},
		{
			name:         "SingleInput_Sorted",
			inputs:       [][]DeploymentSpec{traces},
			wantOrder:    []string{"cart", "checkout", "api"},
			wantSignalOf: map[string]telemetrytypes.Signal{"cart": telemetrytypes.SignalTraces, "checkout": telemetrytypes.SignalTraces, "api": telemetrytypes.SignalTraces},
		},
		{
			name:         "NoInput_Empty",
			inputs:       nil,
			wantOrder:    []string{},
			wantSignalOf: map[string]telemetrytypes.Signal{},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			merged := MergeDeployments(testCase.inputs...)
			require.Len(t, merged, len(testCase.wantOrder))
			for i, spec := range merged {
				assert.Equal(t, testCase.wantOrder[i], spec.Service)
				assert.Equal(t, testCase.wantSignalOf[spec.Service], spec.Signal)
			}
		})
	}
}

func TestApplyLimit(t *testing.T) {
	specs := []DeploymentSpec{{Service: "a"}, {Service: "b"}, {Service: "c"}}

	testCases := []struct {
		name      string
		limit     int
		wantLen   int
		wantTotal int
	}{
		{name: "LimitBelowCount_Truncated", limit: 2, wantLen: 2, wantTotal: 3},
		{name: "LimitEqualsCount_All", limit: 3, wantLen: 3, wantTotal: 3},
		{name: "LimitAboveCount_All", limit: 100, wantLen: 3, wantTotal: 3},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			page, total := ApplyLimit(specs, testCase.limit)
			assert.Len(t, page, testCase.wantLen)
			assert.Equal(t, testCase.wantTotal, total)
		})
	}
}

func TestEarliestHistoryEdge(t *testing.T) {
	testCases := []struct {
		name  string
		edges []int64
		want  int64
	}{
		{name: "BothZero_Zero", edges: []int64{0, 0}, want: 0},
		{name: "OneZero_OtherWins", edges: []int64{0, 500}, want: 500},
		{name: "BothSet_Smallest", edges: []int64{900, 500}, want: 500},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.want, EarliestHistoryEdge(testCase.edges...))
		})
	}
}

func TestNewDeploymentSpecsFromRows(t *testing.T) {
	specs, err := NewDeploymentSpecsFromRows([]DeploymentRow{
		{Service: "a", Environment: "prod", Version: "1", Labels: `{"service.name":"a","host.name":"h1"}`},
		{Service: "b", Environment: "prod", Version: "2"},
	})
	require.NoError(t, err)
	require.Len(t, specs, 2)
	assert.Equal(t, map[string]string{"host.name": "h1"}, specs[0].ResourceAttributes)
	assert.Equal(t, map[string]string{}, specs[1].ResourceAttributes)

	_, err = NewDeploymentSpecsFromRows([]DeploymentRow{{Labels: `{`}})
	assert.Error(t, err)
}

func TestNewAnnotationsFromDeployments(t *testing.T) {
	got := NewAnnotationsFromDeployments([]DeploymentSpec{{Service: "a"}}, 7, 1234)
	require.Len(t, got.Records, 1)
	assert.Equal(t, AnnotationKindDeployment, got.Records[0].Kind)
	assert.Equal(t, 7, got.Total)
	assert.Equal(t, int64(1234), got.HistoryAvailableFrom)

	empty := NewAnnotationsFromDeployments(nil, 0, 0)
	assert.NotNil(t, empty.Records)
	assert.Len(t, empty.Records, 0)
}
