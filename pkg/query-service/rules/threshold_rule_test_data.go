package rules

import (
	"time"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
)

type recoveryTestCase struct {
	description          string
	values               v3.Series
	expectAlert          bool
	expectRecovery       bool // IsRecovering flag check
	compareOp            string
	matchType            string
	target               float64
	recoveryTarget       *float64            // nil to test case where only target value is checked
	activeAlerts         map[uint64]struct{} // simulates active alert fingerprints. nil = auto-calculate from labels+thresholdName, empty map = no active alerts
	additionalThresholds []struct {          // additional thresholds to add to the rule (for testing multiple thresholds)
		name           string
		target         float64
		recoveryTarget *float64
		matchType      string
		compareOp      string
	}
	expectedAlertSample    v3.Point
	expectedTarget         float64
	expectedRecoveryTarget float64
	thresholdName          string // for hash calculation
}

// thresholdExpectation defines expected behavior for a single threshold in multi-threshold tests
type thresholdExpectation struct {
	ShouldReturnSample bool     // Should this threshold return a sample?
	IsRecovering       bool     // Should IsRecovering be true?
	SampleValue        float64  // Expected sample value
	TargetValue        float64  // Expected Target field in sample
	RecoveryValue      *float64 // Expected RecoveryTarget field in sample (can be nil)
}

// multiThresholdTestCase extends recoveryTestCase for testing multiple thresholds with detailed per-threshold expectations
type multiThresholdTestCase struct {
	// Embed the base struct to reuse all fields
	recoveryTestCase

	// ============================================================
	// Multi-threshold expectations
	// ============================================================

	// Map of threshold name → expected behavior
	// Key: threshold name (matches thresholdName or additionalThresholds[].name)
	// Value: what we expect for that specific threshold
	ExpectedResults map[string]thresholdExpectation

	// Total expected samples (for quick validation)
	ExpectedSampleCount int

	// Optional: Expected order of samples (by threshold name)
	// Used to verify sorting is correct
	ExpectedSampleOrder []string
}

var (
	testCases = []struct {
		targetUnit         string
		yAxisUnit          string
		values             [][]interface{}
		metaValues         [][]interface{}
		attrMetaValues     [][]interface{}
		resourceMetaValues [][]interface{}
		createTableValues  [][]interface{}
		expectAlerts       int
		compareOp          string
		matchType          string
		target             float64
		summaryAny         []string
	}{
		{
			targetUnit: "s",
			yAxisUnit:  "ns",
			values: [][]interface{}{
				{float64(572588400), "attr", time.Now()},                              // 0.57 seconds
				{float64(572386400), "attr", time.Now().Add(1 * time.Second)},         // 0.57 seconds
				{float64(300947400), "attr", time.Now().Add(2 * time.Second)},         // 0.3 seconds
				{float64(299316000), "attr", time.Now().Add(3 * time.Second)},         // 0.3 seconds
				{float64(66640400.00000001), "attr", time.Now().Add(4 * time.Second)}, // 0.06 seconds
			},
			metaValues: [][]interface{}{},
			createTableValues: [][]interface{}{
				{"statement"},
			},
			attrMetaValues:     [][]interface{}{},
			resourceMetaValues: [][]interface{}{},
			expectAlerts:       0,
			compareOp:          "1", // Above
			matchType:          "1", // Once
			target:             1,   // 1 second
		},
		{
			targetUnit: "ms",
			yAxisUnit:  "ns",
			values: [][]interface{}{
				{float64(572588400), "attr", time.Now()},                              // 572.58 ms
				{float64(572386400), "attr", time.Now().Add(1 * time.Second)},         // 572.38 ms
				{float64(300947400), "attr", time.Now().Add(2 * time.Second)},         // 300.94 ms
				{float64(299316000), "attr", time.Now().Add(3 * time.Second)},         // 299.31 ms
				{float64(66640400.00000001), "attr", time.Now().Add(4 * time.Second)}, // 66.64 ms
			},
			metaValues: [][]interface{}{},
			createTableValues: [][]interface{}{
				{"statement"},
			},
			attrMetaValues:     [][]interface{}{},
			resourceMetaValues: [][]interface{}{},
			expectAlerts:       4,
			compareOp:          "1", // Above
			matchType:          "1", // Once
			target:             200, // 200 ms
			summaryAny: []string{
				"observed metric value is 299 ms",
				"the observed metric value is 573 ms",
				"the observed metric value is 572 ms",
				"the observed metric value is 301 ms",
			},
		},
		{
			targetUnit: "decgbytes",
			yAxisUnit:  "bytes",
			values: [][]interface{}{
				{float64(2863284053), "attr", time.Now()},                             // 2.86 GB
				{float64(2863388842), "attr", time.Now().Add(1 * time.Second)},        // 2.86 GB
				{float64(300947400), "attr", time.Now().Add(2 * time.Second)},         // 0.3 GB
				{float64(299316000), "attr", time.Now().Add(3 * time.Second)},         // 0.3 GB
				{float64(66640400.00000001), "attr", time.Now().Add(4 * time.Second)}, // 66.64 MB
			},
			metaValues: [][]interface{}{},
			createTableValues: [][]interface{}{
				{"statement"},
			},
			attrMetaValues:     [][]interface{}{},
			resourceMetaValues: [][]interface{}{},
			expectAlerts:       0,
			compareOp:          "1", // Above
			matchType:          "1", // Once
			target:             200, // 200 GB
		},
		{
			targetUnit: "decgbytes",
			yAxisUnit:  "By",
			values: [][]interface{}{
				{float64(2863284053), "attr", time.Now()},                             // 2.86 GB
				{float64(2863388842), "attr", time.Now().Add(1 * time.Second)},        // 2.86 GB
				{float64(300947400), "attr", time.Now().Add(2 * time.Second)},         // 0.3 GB
				{float64(299316000), "attr", time.Now().Add(3 * time.Second)},         // 0.3 GB
				{float64(66640400.00000001), "attr", time.Now().Add(4 * time.Second)}, // 66.64 MB
			},
			metaValues: [][]interface{}{},
			createTableValues: [][]interface{}{
				{"statement"},
			},
			attrMetaValues:     [][]interface{}{},
			resourceMetaValues: [][]interface{}{},
			expectAlerts:       0,
			compareOp:          "1", // Above
			matchType:          "1", // Once
			target:             200, // 200 GB
		},
	}

	tcThresholdRuleEvalNoRecoveryTarget = []recoveryTestCase{
		// Test cases for Equals Always
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
				},
			},
			expectAlert:         true,
			compareOp:           "3", // Equals
			matchType:           "2", // Always
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 0.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 1.0},
				},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 1.0},
					{Value: 0.0},
					{Value: 1.0},
					{Value: 1.0},
				},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
				},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		// Test cases for Equals Once
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
				},
			},
			expectAlert:         true,
			compareOp:           "3", // Equals
			matchType:           "1", // Once
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 0.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 1.0},
				},
			},
			expectAlert:         true,
			compareOp:           "3", // Equals
			matchType:           "1", // Once
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 0.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 1.0},
					{Value: 0.0},
					{Value: 1.0},
					{Value: 1.0},
				},
			},
			expectAlert:         true,
			compareOp:           "3", // Equals
			matchType:           "1", // Once
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 0.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
				},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "1", // Once
			target:      0.0,
		},
		// Test cases for Greater Than Always
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "1", // Greater Than
			matchType:           "2", // Always
			target:              1.5,
			expectedAlertSample: v3.Point{Value: 2.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert: false,
			compareOp:   "1", // Greater Than
			matchType:   "2", // Always
			target:      4.5,
		},
		// Test cases for Greater Than Once
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "1", // Greater Than
			matchType:           "1", // Once
			target:              4.5,
			expectedAlertSample: v3.Point{Value: 10.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 4.0},
					{Value: 4.0},
					{Value: 4.0},
					{Value: 4.0},
					{Value: 4.0},
				},
			},
			expectAlert: false,
			compareOp:   "1", // Greater Than
			matchType:   "1", // Once
			target:      4.5,
		},
		// Test cases for Not Equals Always
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 1.0},
					{Value: 0.0},
					{Value: 1.0},
					{Value: 0.0},
				},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 0.0},
				},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
				},
			},
			expectAlert:         true,
			compareOp:           "4", // Not Equals
			matchType:           "2", // Always
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 1.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 1.0},
					{Value: 0.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
				},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "2", // Always
			target:      0.0,
		},
		// Test cases for Not Equals Once
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 1.0},
					{Value: 0.0},
					{Value: 1.0},
					{Value: 0.0},
				},
			},
			expectAlert:         true,
			compareOp:           "4", // Not Equals
			matchType:           "1", // Once
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 1.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
					{Value: 0.0},
				},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "1", // Once
			target:      0.0,
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 0.0},
					{Value: 0.0},
					{Value: 1.0},
					{Value: 0.0},
					{Value: 1.0},
				},
			},
			expectAlert:         true,
			compareOp:           "4", // Not Equals
			matchType:           "1", // Once
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 1.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
					{Value: 1.0},
				},
			},
			expectAlert:         true,
			compareOp:           "4", // Not Equals
			matchType:           "1", // Once
			target:              0.0,
			expectedAlertSample: v3.Point{Value: 1.0},
		},
		// Test cases for Less Than Always
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 1.5},
					{Value: 1.5},
					{Value: 1.5},
					{Value: 1.5},
					{Value: 1.5},
				},
			},
			expectAlert:         true,
			compareOp:           "2", // Less Than
			matchType:           "2", // Always
			target:              4,
			expectedAlertSample: v3.Point{Value: 1.5},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 1.5},
					{Value: 2.5},
					{Value: 1.5},
					{Value: 3.5},
					{Value: 1.5},
				},
			},
			expectAlert:         true,
			compareOp:           "2", // Less Than
			matchType:           "2", // Always
			target:              4,
			expectedAlertSample: v3.Point{Value: 3.5},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 4.5},
					{Value: 4.5},
					{Value: 4.5},
					{Value: 4.5},
					{Value: 4.5},
				},
			},
			expectAlert: false,
			compareOp:   "2", // Less Than
			matchType:   "2", // Always
			target:      4,
		},
		// Test cases for Less Than Once
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 4.5},
					{Value: 4.5},
					{Value: 4.5},
					{Value: 4.5},
					{Value: 2.5},
				},
			},
			expectAlert:         true,
			compareOp:           "2", // Less Than
			matchType:           "1", // Once
			target:              4,
			expectedAlertSample: v3.Point{Value: 2.5},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 4.5},
					{Value: 4.5},
					{Value: 4.5},
					{Value: 4.5},
					{Value: 4.5},
				},
			},
			expectAlert: false,
			compareOp:   "2", // Less Than
			matchType:   "1", // Once
			target:      4,
		},
		// Test cases for OnAverage
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "3", // Equals
			matchType:           "3", // OnAverage
			target:              6.0,
			expectedAlertSample: v3.Point{Value: 6.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "3", // OnAverage
			target:      4.5,
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "4", // Not Equals
			matchType:           "3", // OnAverage
			target:              4.5,
			expectedAlertSample: v3.Point{Value: 6.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "3", // OnAverage
			target:      6.0,
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "1", // Greater Than
			matchType:           "3", // OnAverage
			target:              4.5,
			expectedAlertSample: v3.Point{Value: 6.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 11.0},
					{Value: 4.0},
					{Value: 3.0},
					{Value: 7.0},
					{Value: 12.0},
				},
			},
			expectAlert:         true,
			compareOp:           "1", // Above
			matchType:           "2", // Always
			target:              2.0,
			expectedAlertSample: v3.Point{Value: 3.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 11.0},
					{Value: 4.0},
					{Value: 3.0},
					{Value: 7.0},
					{Value: 12.0},
				},
			},
			expectAlert:         true,
			compareOp:           "2", // Below
			matchType:           "2", // Always
			target:              13.0,
			expectedAlertSample: v3.Point{Value: 12.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "2", // Less Than
			matchType:           "3", // OnAverage
			target:              12.0,
			expectedAlertSample: v3.Point{Value: 6.0},
		},
		// Test cases for InTotal
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert:         true,
			compareOp:           "3", // Equals
			matchType:           "4", // InTotal
			target:              30.0,
			expectedAlertSample: v3.Point{Value: 30.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 4.0},
					{Value: 6.0},
					{Value: 8.0},
					{Value: 2.0},
				},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "4", // InTotal
			target:      20.0,
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
				},
			},
			expectAlert:         true,
			compareOp:           "4", // Not Equals
			matchType:           "4", // InTotal
			target:              9.0,
			expectedAlertSample: v3.Point{Value: 10.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
				},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "4", // InTotal
			target:      10.0,
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert:         true,
			compareOp:           "1", // Greater Than
			matchType:           "4", // InTotal
			target:              10.0,
			expectedAlertSample: v3.Point{Value: 20.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert: false,
			compareOp:   "1", // Greater Than
			matchType:   "4", // InTotal
			target:      20.0,
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert:         true,
			compareOp:           "2", // Less Than
			matchType:           "4", // InTotal
			target:              30.0,
			expectedAlertSample: v3.Point{Value: 20.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert: false,
			compareOp:   "2", // Less Than
			matchType:   "4", // InTotal
			target:      20.0,
		},
		// Test cases for Last
		// greater than last
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert:         true,
			compareOp:           "1", // Greater Than
			matchType:           "5", // Last
			target:              5.0,
			expectedAlertSample: v3.Point{Value: 10.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert: false,
			compareOp:   "1", // Greater Than
			matchType:   "5", // Last
			target:      20.0,
		},
		// less than last
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert:         true,
			compareOp:           "2", // Less Than
			matchType:           "5", // Last
			target:              15.0,
			expectedAlertSample: v3.Point{Value: 10.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert: false,
			compareOp:   "2", // Less Than
			matchType:   "5", // Last
			target:      5.0,
		},
		// equals last
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert:         true,
			compareOp:           "3", // Equals
			matchType:           "5", // Last
			target:              10.0,
			expectedAlertSample: v3.Point{Value: 10.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert: false,
			compareOp:   "3", // Equals
			matchType:   "5", // Last
			target:      5.0,
		},
		// not equals last
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert:         true,
			compareOp:           "4", // Not Equals
			matchType:           "5", // Last
			target:              5.0,
			expectedAlertSample: v3.Point{Value: 10.0},
		},
		{
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0},
					{Value: 10.0},
				},
			},
			expectAlert: false,
			compareOp:   "4", // Not Equals
			matchType:   "5", // Last
			target:      10.0,
		},
	}

	tcThresholdRuleEval = []recoveryTestCase{
		// ============================================================
		// Category 1: No Active Alert - Recovery Zone Match
		// ============================================================
		// Purpose: Verify recovery threshold is IGNORED when there's no active alert
		// Behavior: Even if value is in recovery zone (between target and recovery threshold),
		//           no alert should be returned because recovery only applies to existing alerts
		// Expected: expectAlert=false, expectRecovery=false for all cases
		{
			description: "Cat1: Above operator - value in recovery zone, no active alert → no alert returned",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 90.0},
				},
				Labels: map[string]string{
					"service": "frontend",
				},
			},
			expectAlert:    false,
			expectRecovery: false,
			compareOp:      "1", // Above
			matchType:      "1", // AtleastOnce
			target:         100.0,
			recoveryTarget: func() *float64 { v := 80.0; return &v }(),
			activeAlerts:   map[uint64]struct{}{}, // No active alerts
			thresholdName:  "test_threshold",
		},
		{
			description: "Cat1: Below operator - value in recovery zone, no active alert → no alert returned",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 60.0},
				},
				Labels: map[string]string{
					"service": "backend",
				},
			},
			expectAlert:    false,
			expectRecovery: false,
			compareOp:      "2", // Below
			matchType:      "1", // AtleastOnce
			target:         50.0,
			recoveryTarget: func() *float64 { v := 70.0; return &v }(),
			activeAlerts:   map[uint64]struct{}{}, // No active alerts
			thresholdName:  "test_threshold",
		},
		{
			description: "Cat1: NotEq operator - value in recovery zone, no active alert → no alert returned",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 1.0},
				},
				Labels: map[string]string{
					"service": "api",
				},
			},
			expectAlert:    false,
			expectRecovery: false,
			compareOp:      "4", // NotEq
			matchType:      "1", // AtleastOnce
			target:         1.0,
			recoveryTarget: func() *float64 { v := 0.0; return &v }(),
			activeAlerts:   map[uint64]struct{}{}, // No active alerts
			thresholdName:  "test_threshold",
		},
		// ============================================================
		// Category 2: Active Alert - In Recovery Zone
		// ============================================================
		// Purpose: Verify IsRecovering=true when alert is active and value is in recovery zone
		// Behavior: Value has improved (no longer breaches target) but hasn't fully recovered
		//           (still breaches recovery threshold). This is the "improving" state.
		// Expected: expectAlert=true, expectRecovery=true, IsRecovering=true
		//           Sample uses recovery target value, not main target
		{
			description: "Cat2: Above operator - active alert, value below target but above recovery → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 90.0},
				},
				Labels: map[string]string{
					"service": "frontend",
				},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "1", // Above
			matchType:              "1", // AtleastOnce
			target:                 100.0,
			recoveryTarget:         func() *float64 { v := 80.0; return &v }(),
			activeAlerts:           nil, // Auto-calculate from labels+thresholdName
			expectedAlertSample:    v3.Point{Value: 90.0},
			expectedTarget:         100.0,
			expectedRecoveryTarget: 80.0,
			thresholdName:          "test_threshold_above",
		},
		{
			description: "Cat2: Below operator - active alert, value above target but below recovery → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 60.0},
				},
				Labels: map[string]string{
					"service": "backend",
				},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "2", // Below
			matchType:              "1", // AtleastOnce
			target:                 50.0,
			recoveryTarget:         func() *float64 { v := 70.0; return &v }(),
			activeAlerts:           nil, // Auto-calculate from labels+thresholdName
			expectedAlertSample:    v3.Point{Value: 60.0},
			expectedTarget:         50.0,
			expectedRecoveryTarget: 70.0,
			thresholdName:          "test_threshold_below",
		},
		{
			description: "Cat2: NotEq operator - active alert, value equals target but not recovery → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 1.0},
				},
				Labels: map[string]string{
					"service": "api",
				},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "4", // NotEq
			matchType:              "1", // AtleastOnce
			target:                 1.0,
			recoveryTarget:         func() *float64 { v := 0.0; return &v }(),
			activeAlerts:           nil, // Auto-calculate from labels+thresholdName
			expectedAlertSample:    v3.Point{Value: 1.0},
			expectedTarget:         1.0,
			expectedRecoveryTarget: 0.0,
			thresholdName:          "test_threshold_noteq",
		},
		// ============================================================
		// Category 3: Active Alert - Still Breaching Target
		// ============================================================
		// Purpose: Verify normal alert behavior when target threshold is still breached
		// Behavior: Value still breaches the main target threshold, so alert continues firing
		//           normally. Recovery threshold is not checked when target still breaches.
		// Expected: expectAlert=true, expectRecovery=false (normal firing alert)
		//           Sample uses main target value, not recovery target
		{
			description: "Cat3: Above operator - active alert, value still above target → normal firing alert",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 110.0},
				},
				Labels: map[string]string{
					"service": "frontend",
				},
			},
			expectAlert:            true,
			expectRecovery:         false,
			compareOp:              "1", // Above
			matchType:              "1", // AtleastOnce
			target:                 100.0,
			recoveryTarget:         func() *float64 { v := 80.0; return &v }(),
			activeAlerts:           nil, // Auto-calculate from labels+thresholdName
			expectedAlertSample:    v3.Point{Value: 110.0},
			expectedTarget:         100.0,
			expectedRecoveryTarget: 80.0,
			thresholdName:          "test_threshold_still_alerting_above",
		},
		{
			description: "Cat3: Below operator - active alert, value still below target → normal firing alert",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 40.0},
				},
				Labels: map[string]string{
					"service": "backend",
				},
			},
			expectAlert:            true,
			expectRecovery:         false,
			compareOp:              "2", // Below
			matchType:              "1", // AtleastOnce
			target:                 50.0,
			recoveryTarget:         func() *float64 { v := 70.0; return &v }(),
			activeAlerts:           nil, // Auto-calculate from labels+thresholdName
			expectedAlertSample:    v3.Point{Value: 40.0},
			expectedTarget:         50.0,
			expectedRecoveryTarget: 70.0,
			thresholdName:          "test_threshold_still_alerting_below",
		},
		{
			description: "Cat3: Above operator - active alert, value fully recovered (below recovery) → alert resolved",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 75.0},
				},
				Labels: map[string]string{
					"service": "api",
				},
			},
			expectAlert:    false,
			expectRecovery: false,
			compareOp:      "1", // Above
			matchType:      "1", // AtleastOnce
			target:         100.0,
			recoveryTarget: func() *float64 { v := 80.0; return &v }(),
			activeAlerts:   nil, // Auto-calculate from labels+thresholdName
			thresholdName:  "test_threshold_no_match",
		},
		// ============================================================
		// Category 4: Alert Identity & Fingerprint Matching
		// ============================================================
		// Purpose: Verify recovery only applies to alerts with matching fingerprints
		// Behavior: Alert fingerprint = hash(series labels + threshold name)
		//           Recovery requires exact fingerprint match with active alert
		// Expected: Recovery only triggers when alert fingerprint matches active alert
		{
			description: "Cat4: Wrong alert fingerprint - value in recovery zone but different active alert → no recovery",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 90.0},
				},
				Labels: map[string]string{
					"service": "frontend",
				},
			},
			expectAlert:    false,
			expectRecovery: false,
			compareOp:      "1", // Above
			matchType:      "1", // AtleastOnce
			target:         100.0,
			recoveryTarget: func() *float64 { v := 80.0; return &v }(),
			activeAlerts:   map[uint64]struct{}{12345: {}}, // Wrong hash (not matching this series)
			thresholdName:  "test_threshold_wrong_hash",
		},
		{
			description: "Cat4: Correct alert fingerprint - value in recovery zone and matching active alert → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 90.0},
				},
				Labels: map[string]string{
					"service": "frontend",
				},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "1", // Above
			matchType:              "1", // AtleastOnce
			target:                 100.0,
			recoveryTarget:         func() *float64 { v := 80.0; return &v }(),
			activeAlerts:           nil, // Auto-calculate from labels+thresholdName
			expectedAlertSample:    v3.Point{Value: 90.0},
			expectedTarget:         100.0,
			expectedRecoveryTarget: 80.0,
			thresholdName:          "test_threshold_correct_hash",
		},
		{
			description: "Cat4: Multiple thresholds - each tracks recovery independently based on its own fingerprint",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 90.0},
				},
				Labels: map[string]string{
					"service": "frontend",
				},
			},
			expectAlert:    true,
			expectRecovery: true,
			compareOp:      "1", // Above
			matchType:      "1", // AtleastOnce
			target:         120.0,
			recoveryTarget: func() *float64 { v := 100.0; return &v }(),
			activeAlerts:   nil, // Auto-calculate from labels+thresholdName (only for first threshold)
			additionalThresholds: []struct {
				name           string
				target         float64
				recoveryTarget *float64
				matchType      string
				compareOp      string
			}{
				// this will match the second recovery threshold
				{
					name:           "test_threshold_multiple_second",
					target:         100.0,
					recoveryTarget: func() *float64 { v := 80.0; return &v }(),
					matchType:      "1", // AtleastOnce
					compareOp:      "1", // Above
				},
			},
			expectedAlertSample:    v3.Point{Value: 90.0},
			expectedTarget:         100.0,
			expectedRecoveryTarget: 80.0,
			thresholdName:          "test_threshold_multiple",
		},
		// Test fully recovered (value past recovery threshold)
		{
			description: "Cat4: Above operator - active alert, value fully recovered (below recovery) → alert resolves",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 75.0}, // below recovery threshold
				},
				Labels: map[string]string{"service": "test30"},
			},
			expectAlert:    false,
			expectRecovery: false,
			compareOp:      "1", // Above
			matchType:      "1", // AtleastOnce
			target:         100.0,
			recoveryTarget: func() *float64 { v := 80.0; return &v }(),
			activeAlerts:   nil,
			thresholdName:  "cat4_fully_recovered",
		},
		{
			description: "Cat4: Below operator - active alert, value fully recovered (above recovery) → alert resolves",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 75.0}, // above recovery threshold
				},
				Labels: map[string]string{"service": "test31"},
			},
			expectAlert:    false,
			expectRecovery: false,
			compareOp:      "2", // Below
			matchType:      "1", // AtleastOnce
			target:         50.0,
			recoveryTarget: func() *float64 { v := 70.0; return &v }(),
			activeAlerts:   nil,
			thresholdName:  "cat4_fully_recovered_below",
		},
	}

	tcThresholdRuleEvalMatchPlusCompareOps = []recoveryTestCase{
		// ============================================================
		// Category 1: MatchType - AtleastOnce with All CompareOps
		// ============================================================
		// Purpose: Verify "at least one point matches" works with recovery for all operators
		// Behavior: If ANY point in series matches the condition, alert fires/recovers
		// ============================================================

		{
			description: "Cat1: AtleastOnce + Above - active alert, one value in recovery zone → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 75.0}, // below recovery
					{Value: 85.0}, // in recovery zone (between 80 and 100)
					{Value: 70.0}, // below recovery
				},
				Labels: map[string]string{"service": "test1"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "1", // Above
			matchType:              "1", // AtleastOnce
			target:                 100.0,
			recoveryTarget:         func() *float64 { v := 80.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 85.0}, // first matching value
			expectedTarget:         100.0,
			expectedRecoveryTarget: 80.0,
			thresholdName:          "cat1_atleastonce_above_recovery",
		},
		{
			description: "Cat1: AtleastOnce + Below - active alert, one value in recovery zone → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 80.0}, // above recovery
					{Value: 60.0}, // in recovery zone (between 50 and 70)
					{Value: 75.0}, // above recovery
				},
				Labels: map[string]string{"service": "test2"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "2", // Below
			matchType:              "1", // AtleastOnce
			target:                 50.0,
			recoveryTarget:         func() *float64 { v := 70.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 60.0},
			expectedTarget:         50.0,
			expectedRecoveryTarget: 70.0,
			thresholdName:          "cat1_atleastonce_below_recovery",
		},
		{
			description: "Cat1: AtleastOnce + Equals - active alert, one value equals recovery → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 1.0}, // doesn't equal recovery (5.0)
					{Value: 5.0}, // equals recovery
					{Value: 2.0}, // doesn't equal recovery
				},
				Labels: map[string]string{"service": "test3"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "3", // Equals
			matchType:              "1", // AtleastOnce
			target:                 10.0,
			recoveryTarget:         func() *float64 { v := 5.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 5.0},
			expectedTarget:         10.0,
			expectedRecoveryTarget: 5.0,
			thresholdName:          "cat1_atleastonce_equals_recovery",
		},
		{
			description: "Cat1: AtleastOnce + NotEquals - active alert, values equal target but not recovery → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0}, // equals target (doesn't breach target)
					{Value: 10.0}, // equals target (doesn't breach target)
					{Value: 10.0}, // equals target (doesn't breach target)
				},
				Labels: map[string]string{"service": "test4"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "4", // NotEquals
			matchType:              "1", // AtleastOnce
			target:                 10.0,
			recoveryTarget:         func() *float64 { v := 5.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 10.0}, // All values = 10, which != 5 (recovery condition met)
			expectedTarget:         10.0,
			expectedRecoveryTarget: 5.0,
			thresholdName:          "cat1_atleastonce_noteq_recovery",
		},
		{
			description: "Cat1: AtleastOnce + OutsideBounds - active alert, |value| in recovery zone → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 85.0}, // |85| >= recovery (80)
				},
				Labels: map[string]string{"service": "test26"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "7", // OutsideBounds
			matchType:              "1", // AtleastOnce
			target:                 100.0,
			recoveryTarget:         func() *float64 { v := 80.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 85.0},
			expectedTarget:         100.0,
			expectedRecoveryTarget: 80.0,
			thresholdName:          "cat1_atleastonce_outsidebounds_recovery",
		},
		{
			description: "Cat1: AtleastOnce + OutsideBounds - active alert, negative value in recovery zone → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: -85.0}, // |-85| = 85 >= recovery (80)
				},
				Labels: map[string]string{"service": "test27"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "7", // OutsideBounds
			matchType:              "1", // AtleastOnce
			target:                 100.0,
			recoveryTarget:         func() *float64 { v := 80.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: -85.0},
			expectedTarget:         100.0,
			expectedRecoveryTarget: 80.0,
			thresholdName:          "cat1_atleastonce_outsidebounds_negative_recovery",
		},

		// ============================================================
		// Category 2: MatchType - AllTheTimes with All CompareOps
		// ============================================================
		// Purpose: Verify "all points must match" works with recovery for all operators
		// Behavior: ALL points must match the condition for alert to fire/recover
		// ============================================================

		{
			description: "Cat2: AllTheTimes + Above - active alert, all values in recovery zone → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 85.0}, // in recovery zone
					{Value: 90.0}, // in recovery zone
					{Value: 82.0}, // in recovery zone
				},
				Labels: map[string]string{"service": "test5"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "1", // Above
			matchType:              "2", // AllTheTimes
			target:                 100.0,
			recoveryTarget:         func() *float64 { v := 80.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 82.0}, // min value for Above + AllTheTimes
			expectedTarget:         100.0,
			expectedRecoveryTarget: 80.0,
			thresholdName:          "cat2_allthetimes_above_recovery",
		},
		{
			description: "Cat2: AllTheTimes + Above - active alert, one value below recovery → no recovery",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 85.0}, // in recovery zone
					{Value: 75.0}, // below recovery (breaks AllTheTimes)
					{Value: 90.0}, // in recovery zone
				},
				Labels: map[string]string{"service": "test6"},
			},
			expectAlert:    false,
			expectRecovery: false,
			compareOp:      "1", // Above
			matchType:      "2", // AllTheTimes
			target:         100.0,
			recoveryTarget: func() *float64 { v := 80.0; return &v }(),
			activeAlerts:   nil,
			thresholdName:  "cat2_allthetimes_above_no_recovery",
		},
		{
			description: "Cat2: AllTheTimes + Below - active alert, all values in recovery zone → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 60.0}, // in recovery zone
					{Value: 55.0}, // in recovery zone
					{Value: 65.0}, // in recovery zone
				},
				Labels: map[string]string{"service": "test7"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "2", // Below
			matchType:              "2", // AllTheTimes
			target:                 50.0,
			recoveryTarget:         func() *float64 { v := 70.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 65.0}, // max value for Below + AllTheTimes
			expectedTarget:         50.0,
			expectedRecoveryTarget: 70.0,
			thresholdName:          "cat2_allthetimes_below_recovery",
		},
		{
			description: "Cat2: AllTheTimes + Equals - active alert, all values equal recovery → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 5.0},
					{Value: 5.0},
					{Value: 5.0},
				},
				Labels: map[string]string{"service": "test8"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "3", // Equals
			matchType:              "2", // AllTheTimes
			target:                 10.0,
			recoveryTarget:         func() *float64 { v := 5.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 5.0},
			expectedTarget:         10.0,
			expectedRecoveryTarget: 5.0,
			thresholdName:          "cat2_allthetimes_equals_recovery",
		},
		{
			description: "Cat2: AllTheTimes + NotEquals - active alert, all values equal target but not recovery → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0}, // equals target (doesn't breach)
					{Value: 10.0}, // equals target (doesn't breach)
					{Value: 10.0}, // equals target (doesn't breach)
				},
				Labels: map[string]string{"service": "test9"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "4", // NotEquals
			matchType:              "2", // AllTheTimes
			target:                 10.0,
			recoveryTarget:         func() *float64 { v := 5.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 10.0}, // All equal target, all != recovery
			expectedTarget:         10.0,
			expectedRecoveryTarget: 5.0,
			thresholdName:          "cat2_allthetimes_noteq_recovery",
		},

		// ============================================================
		// Category 3: MatchType - OnAverage with All CompareOps
		// ============================================================
		// Purpose: Verify average-based matching works with recovery for all operators
		// Behavior: Average of all points is compared against threshold
		// ============================================================

		{
			description: "Cat3: OnAverage + Above - active alert, avg in recovery zone → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 85.0},
					{Value: 90.0},
					{Value: 85.0},
				}, // avg = 86.67
				Labels: map[string]string{"service": "test10"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "1", // Above
			matchType:              "3", // OnAverage
			target:                 100.0,
			recoveryTarget:         func() *float64 { v := 80.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 86.66666666666667},
			expectedTarget:         100.0,
			expectedRecoveryTarget: 80.0,
			thresholdName:          "cat3_onaverage_above_recovery",
		},
		{
			description: "Cat3: OnAverage + Below - active alert, avg in recovery zone → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 60.0},
					{Value: 65.0},
					{Value: 55.0},
				}, // avg = 60
				Labels: map[string]string{"service": "test11"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "2", // Below
			matchType:              "3", // OnAverage
			target:                 50.0,
			recoveryTarget:         func() *float64 { v := 70.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 60.0},
			expectedTarget:         50.0,
			expectedRecoveryTarget: 70.0,
			thresholdName:          "cat3_onaverage_below_recovery",
		},
		{
			description: "Cat3: OnAverage + Equals - active alert, avg equals recovery → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 4.0},
					{Value: 5.0},
					{Value: 6.0},
				}, // avg = 5.0
				Labels: map[string]string{"service": "test12"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "3", // Equals
			matchType:              "3", // OnAverage
			target:                 10.0,
			recoveryTarget:         func() *float64 { v := 5.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 5.0},
			expectedTarget:         10.0,
			expectedRecoveryTarget: 5.0,
			thresholdName:          "cat3_onaverage_equals_recovery",
		},
		{
			description: "Cat3: OnAverage + NotEquals - active alert, avg equals target but not recovery → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 8.0},
					{Value: 10.0},
					{Value: 12.0},
				}, // avg = 10.0 (equals target, not equal to recovery 5.0)
				Labels: map[string]string{"service": "test13"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "4", // NotEquals
			matchType:              "3", // OnAverage
			target:                 10.0,
			recoveryTarget:         func() *float64 { v := 5.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 10.0}, // avg = 10.0
			expectedTarget:         10.0,
			expectedRecoveryTarget: 5.0,
			thresholdName:          "cat3_onaverage_noteq_recovery",
		},
		{
			description: "Cat3: OnAverage + OutsideBounds - active alert, avg |value| in recovery zone → IsRecovering=false",
			values: v3.Series{
				Points: []v3.Point{
					{Value: -90.0},
					{Value: 85.0},
					{Value: -80.0},
				}, // avg = -28.33, |avg| = 28.33
				Labels: map[string]string{"service": "test28"},
			},
			expectAlert:    false,
			expectRecovery: false, // This will not match as 28.33 >= 80.0 is not true
			compareOp:      "7",   // OutsideBounds
			matchType:      "3",   // OnAverage
			target:         100.0,
			recoveryTarget: func() *float64 { v := 80.0; return &v }(),
			activeAlerts:   nil,
			thresholdName:  "cat3_onaverage_outsidebounds_no_recovery",
		},

		// ============================================================
		// Category 4: MatchType - InTotal with All CompareOps
		// ============================================================
		// Purpose: Verify sum-based matching works with recovery for all operators
		// Behavior: Sum of all points is compared against threshold
		// ============================================================

		{
			description: "Cat4: InTotal + Above - active alert, sum in recovery zone → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 30.0},
					{Value: 35.0},
					{Value: 25.0},
				}, // sum = 90
				Labels: map[string]string{"service": "test14"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "1", // Above
			matchType:              "4", // InTotal
			target:                 100.0,
			recoveryTarget:         func() *float64 { v := 80.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 90.0},
			expectedTarget:         100.0,
			expectedRecoveryTarget: 80.0,
			thresholdName:          "cat4_intotal_above_recovery",
		},
		{
			description: "Cat4: InTotal + Below - active alert, sum in recovery zone → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 20.0},
					{Value: 25.0},
					{Value: 15.0},
				}, // sum = 60
				Labels: map[string]string{"service": "test15"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "2", // Below
			matchType:              "4", // InTotal
			target:                 50.0,
			recoveryTarget:         func() *float64 { v := 70.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 60.0},
			expectedTarget:         50.0,
			expectedRecoveryTarget: 70.0,
			thresholdName:          "cat4_intotal_below_recovery",
		},
		{
			description: "Cat4: InTotal + Equals - active alert, sum equals recovery → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 1.0},
					{Value: 2.0},
					{Value: 2.0},
				}, // sum = 5.0
				Labels: map[string]string{"service": "test16"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "3", // Equals
			matchType:              "4", // InTotal
			target:                 10.0,
			recoveryTarget:         func() *float64 { v := 5.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 5.0},
			expectedTarget:         10.0,
			expectedRecoveryTarget: 5.0,
			thresholdName:          "cat4_intotal_equals_recovery",
		},
		{
			description: "Cat4: InTotal + NotEquals - active alert, sum equals target but not recovery → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 3.0},
					{Value: 3.0},
					{Value: 4.0},
				}, // sum = 10.0 (equals target, not equal to recovery 5.0)
				Labels: map[string]string{"service": "test17"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "4", // NotEquals
			matchType:              "4", // InTotal
			target:                 10.0,
			recoveryTarget:         func() *float64 { v := 5.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 10.0}, // sum = 10.0
			expectedTarget:         10.0,
			expectedRecoveryTarget: 5.0,
			thresholdName:          "cat4_intotal_noteq_recovery",
		},

		// ============================================================
		// Category 5: MatchType - Last with All CompareOps
		// ============================================================
		// Purpose: Verify last-point matching works with recovery for all operators
		// Behavior: Only the last point is compared against threshold
		// ============================================================

		{
			description: "Cat5: Last + Above - active alert, last value in recovery zone → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 110.0}, // above target (ignored)
					{Value: 75.0},  // below recovery (ignored)
					{Value: 85.0},  // last: in recovery zone
				},
				Labels: map[string]string{"service": "test18"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "1", // Above
			matchType:              "5", // Last
			target:                 100.0,
			recoveryTarget:         func() *float64 { v := 80.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 85.0},
			expectedTarget:         100.0,
			expectedRecoveryTarget: 80.0,
			thresholdName:          "cat5_last_above_recovery",
		},
		{
			description: "Cat5: Last + Below - active alert, last value in recovery zone → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 40.0}, // below target (ignored)
					{Value: 80.0}, // above recovery (ignored)
					{Value: 60.0}, // last: in recovery zone
				},
				Labels: map[string]string{"service": "test19"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "2", // Below
			matchType:              "5", // Last
			target:                 50.0,
			recoveryTarget:         func() *float64 { v := 70.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 60.0},
			expectedTarget:         50.0,
			expectedRecoveryTarget: 70.0,
			thresholdName:          "cat5_last_below_recovery",
		},
		{
			description: "Cat5: Last + Equals - active alert, last value equals recovery → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 10.0}, // equals target (ignored)
					{Value: 1.0},  // not equal (ignored)
					{Value: 5.0},  // last: equals recovery
				},
				Labels: map[string]string{"service": "test20"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "3", // Equals
			matchType:              "5", // Last
			target:                 10.0,
			recoveryTarget:         func() *float64 { v := 5.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 5.0},
			expectedTarget:         10.0,
			expectedRecoveryTarget: 5.0,
			thresholdName:          "cat5_last_equals_recovery",
		},
		{
			description: "Cat5: Last + NotEquals - active alert, last value equals target but not recovery → IsRecovering=true",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 5.0},  // equals recovery (ignored)
					{Value: 3.0},  // not equal to either (ignored)
					{Value: 10.0}, // last: equals target, not equal recovery
				},
				Labels: map[string]string{"service": "test21"},
			},
			expectAlert:            true,
			expectRecovery:         true,
			compareOp:              "4", // NotEquals
			matchType:              "5", // Last
			target:                 10.0,
			recoveryTarget:         func() *float64 { v := 5.0; return &v }(),
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 10.0}, // last = 10.0
			expectedTarget:         10.0,
			expectedRecoveryTarget: 5.0,
			thresholdName:          "cat5_last_noteq_recovery",
		},

		// ============================================================
		// Category 6: Additional Comprehensive Test Cases
		// ============================================================

		// Test no recovery target (backward compatibility)
		{
			description: "Cat6: No recovery target - Below operator, normal alert behavior",
			values: v3.Series{
				Points: []v3.Point{
					{Value: 40.0},
				},
				Labels: map[string]string{"service": "test29"},
			},
			expectAlert:            true,
			expectRecovery:         false,
			compareOp:              "2", // Below
			matchType:              "1", // AtleastOnce
			target:                 50.0,
			recoveryTarget:         nil, // No recovery target
			activeAlerts:           nil,
			expectedAlertSample:    v3.Point{Value: 40.0},
			expectedTarget:         50.0,
			expectedRecoveryTarget: 0,
			thresholdName:          "cat6_no_recovery_target",
		},
	}

	// ============================================================
	// Multi-Threshold Test Cases
	// ============================================================
	// These test cases validate behavior when multiple thresholds are configured
	// Each threshold can be in a different state (firing, recovering, resolved)

	tcThresholdRuleEvalMultiThreshold = []multiThresholdTestCase{
		// ============================================================
		// Test 1: Independent State Tracking - Critical recovering, Warning firing, Info firing
		// ============================================================
		// Value: 85.0
		// Critical (target=100, recovery=80): 85 < 100 (not breaching) AND 85 > 80 (in recovery zone) → IsRecovering=true
		// Warning (target=90, recovery=70): 85 < 90 (not breaching) AND 85 > 70 (in recovery zone) → IsRecovering=true
		// Info (target=80, recovery=60): 85 > 80 (breaching target) → Firing (not recovering)
		{
			recoveryTestCase: recoveryTestCase{
				description: "MultiThreshold: Critical recovering, Warning recovering, Info firing - demonstrates independent state tracking",
				values: v3.Series{
					Points: []v3.Point{{Value: 85.0}},
					Labels: map[string]string{"service": "payment"},
				},
				compareOp:      "1", // Above
				matchType:      "1", // AtleastOnce
				target:         100.0,
				recoveryTarget: func() *float64 { v := 80.0; return &v }(),
				thresholdName:  "critical",
				additionalThresholds: []struct {
					name           string
					target         float64
					recoveryTarget *float64
					matchType      string
					compareOp      string
				}{
					{
						name:           "warning",
						target:         90.0,
						recoveryTarget: func() *float64 { v := 70.0; return &v }(),
						matchType:      "1", // MatchType: AtleastOnce (1)
						compareOp:      "1", // CompareOp: ValueIsAbove (1)
					},
					{
						name:           "info",
						target:         80.0,
						recoveryTarget: func() *float64 { v := 60.0; return &v }(),
						matchType:      "1", // MatchType: AtleastOnce (1)
						compareOp:      "1", // CompareOp: ValueIsAbove (1)
					},
				},
				activeAlerts: nil, // Auto-calculate for all thresholds
			},
			ExpectedResults: map[string]thresholdExpectation{
				"critical": {
					ShouldReturnSample: true,
					IsRecovering:       true, // 85 < 100 (not breaching) AND 85 > 80 (in recovery zone)
					SampleValue:        85.0,
					TargetValue:        100.0,
					RecoveryValue:      func() *float64 { v := 80.0; return &v }(),
				},
				"warning": {
					ShouldReturnSample: true,
					IsRecovering:       true, // 85 < 90 (not breaching) AND 85 > 70 (in recovery zone)
					SampleValue:        85.0,
					TargetValue:        90.0,
					RecoveryValue:      func() *float64 { v := 70.0; return &v }(),
				},
				"info": {
					ShouldReturnSample: true,
					IsRecovering:       false, // 85 > 80 (still breaching target) → Firing
					SampleValue:        85.0,
					TargetValue:        80.0,
					RecoveryValue:      func() *float64 { v := 60.0; return &v }(),
				},
			},
			ExpectedSampleCount: 3,                                       // All three thresholds return samples
			ExpectedSampleOrder: []string{"critical", "warning", "info"}, // Sorted by target (descending for Above: 100, 90, 80)
		},

		// ============================================================
		// Test 2: Threshold Priority & Sorting - Above operator
		// ============================================================
		// Value: 95.0
		// Critical (target=100, recovery=90): 95 < 100 (not breaching) AND 95 > 90 (in recovery zone) → IsRecovering=true
		// Warning (target=80, recovery=70): 95 > 80 (breaching target) → Firing
		{
			recoveryTestCase: recoveryTestCase{
				description: "MultiThreshold: Above - value 95 matches Critical recovery and Warning firing, verify sorting order",
				values: v3.Series{
					Points: []v3.Point{{Value: 95.0}},
					Labels: map[string]string{"service": "api"},
				},
				compareOp:      "1", // Above
				matchType:      "1", // AtleastOnce
				target:         100.0,
				recoveryTarget: func() *float64 { v := 90.0; return &v }(),
				thresholdName:  "critical",
				additionalThresholds: []struct {
					name           string
					target         float64
					recoveryTarget *float64
					matchType      string
					compareOp      string
				}{
					{
						name:           "warning",
						target:         80.0,
						recoveryTarget: func() *float64 { v := 70.0; return &v }(),
						matchType:      "1", // MatchType: AtleastOnce (1)
						compareOp:      "1", // CompareOp: ValueIsAbove (1)
					},
				},
				activeAlerts: nil,
			},
			ExpectedResults: map[string]thresholdExpectation{
				"critical": {
					ShouldReturnSample: true,
					IsRecovering:       true, // 95 < 100 AND 95 > 90
					SampleValue:        95.0,
					TargetValue:        100.0,
					RecoveryValue:      func() *float64 { v := 90.0; return &v }(),
				},
				"warning": {
					ShouldReturnSample: true,
					IsRecovering:       false, // 95 > 80 (still firing)
					SampleValue:        95.0,
					TargetValue:        80.0,
					RecoveryValue:      func() *float64 { v := 70.0; return &v }(),
				},
			},
			ExpectedSampleCount: 2,
			ExpectedSampleOrder: []string{"critical", "warning"}, // Sorted descending: 100, 80
		},

		// ============================================================
		// Test 3: Threshold Priority & Sorting - Below operator
		// ============================================================
		// Value: 15.0
		// Critical (target=10, recovery=20): 15 > 10 (not breaching) AND 15 < 20 (in recovery zone) → IsRecovering=true
		// Warning (target=30, recovery=40): 15 < 30 (breaching target) → Firing (not recovering)
		{
			recoveryTestCase: recoveryTestCase{
				description: "MultiThreshold: Below - value 15 matches both Critical and Warning recovery zones, verify ascending sort",
				values: v3.Series{
					Points: []v3.Point{{Value: 15.0}},
					Labels: map[string]string{"service": "database"},
				},
				compareOp:      "2", // Below
				matchType:      "1", // AtleastOnce
				target:         10.0,
				recoveryTarget: func() *float64 { v := 20.0; return &v }(),
				thresholdName:  "critical",
				additionalThresholds: []struct {
					name           string
					target         float64
					recoveryTarget *float64
					matchType      string
					compareOp      string
				}{
					{
						name:           "warning",
						target:         30.0,
						recoveryTarget: func() *float64 { v := 40.0; return &v }(),
						matchType:      "1", // MatchType: AtleastOnce (1)
						compareOp:      "2", // CompareOp: ValueIsBelow (2)
					},
				},
				activeAlerts: nil,
			},
			ExpectedResults: map[string]thresholdExpectation{
				"critical": {
					ShouldReturnSample: true,
					IsRecovering:       true, // 15 > 10 AND 15 < 20
					SampleValue:        15.0,
					TargetValue:        10.0,
					RecoveryValue:      func() *float64 { v := 20.0; return &v }(),
				},
				"warning": {
					ShouldReturnSample: true,
					IsRecovering:       false, // 15 < 30 (still breaching target) → Firing
					SampleValue:        15.0,
					TargetValue:        30.0,
					RecoveryValue:      func() *float64 { v := 40.0; return &v }(),
				},
			},
			ExpectedSampleCount: 2,
			ExpectedSampleOrder: []string{"critical", "warning"}, // Sorted ascending for Below: 10, 30
		},

		// ============================================================
		// Test 4: Independent Recovery States - One firing, one recovering, one resolved
		// ============================================================
		// Value: 85.0
		// Critical (target=80, recovery=70): 85 > 80 (breaching) → Firing
		// Warning (target=90, recovery=80): 85 < 90 (not breaching) AND 85 > 80 (in recovery zone) → IsRecovering=true
		// Info (target=100, recovery=90): 85 < 90 (below recovery) → Fully resolved
		{
			recoveryTestCase: recoveryTestCase{
				description: "MultiThreshold: Critical firing, Warning recovering, Info resolved - independent state tracking",
				values: v3.Series{
					Points: []v3.Point{{Value: 85.0}},
					Labels: map[string]string{"service": "payment"},
				},
				compareOp:      "1", // CompareOp: ValueIsAbove (1) - alerts when value > target
				matchType:      "1", // MatchType: AtleastOnce (1) - at least one point must match
				target:         80.0,
				recoveryTarget: func() *float64 { v := 70.0; return &v }(),
				thresholdName:  "critical",
				additionalThresholds: []struct {
					name           string
					target         float64
					recoveryTarget *float64
					matchType      string
					compareOp      string
				}{
					{
						name:           "warning",
						target:         90.0,
						recoveryTarget: func() *float64 { v := 80.0; return &v }(),
						matchType:      "1", // AtleastOnce
						compareOp:      "1", // Above
					},
					{
						name:           "info",
						target:         100.0,
						recoveryTarget: func() *float64 { v := 90.0; return &v }(),
						matchType:      "1", // AtleastOnce
						compareOp:      "1", // Above
					},
				},
				activeAlerts: nil,
			},
			ExpectedResults: map[string]thresholdExpectation{
				"critical": {
					ShouldReturnSample: true,
					IsRecovering:       false, // 85 > 80 (firing)
					SampleValue:        85.0,
					TargetValue:        80.0,
					RecoveryValue:      func() *float64 { v := 70.0; return &v }(),
				},
				"warning": {
					ShouldReturnSample: true,
					IsRecovering:       true, // 85 < 90 AND 85 > 80
					SampleValue:        85.0,
					TargetValue:        90.0,
					RecoveryValue:      func() *float64 { v := 80.0; return &v }(),
				},
				"info": {
					ShouldReturnSample: false, // 85 < 90 (fully recovered)
					IsRecovering:       false,
					SampleValue:        0,
					TargetValue:        0,
					RecoveryValue:      nil,
				},
			},
			ExpectedSampleCount: 2,
			ExpectedSampleOrder: []string{"warning", "critical"}, // Sorted descending: 100, 90, 80 (info not in result, so only warning, critical)
		},

		// ============================================================
		// Test 5: Overlapping Recovery Zones - Nested zones
		// ============================================================
		// Value: 85.0
		// Critical (target=100, recovery=80): 85 < 100 AND 85 > 80 → IsRecovering=true
		// Warning (target=90, recovery=70): 85 < 90 AND 85 > 70 → IsRecovering=true
		{
			recoveryTestCase: recoveryTestCase{
				description: "MultiThreshold: Nested recovery zones - value 85 in both Critical and Warning recovery zones",
				values: v3.Series{
					Points: []v3.Point{{Value: 85.0}},
					Labels: map[string]string{"service": "checkout"},
				},
				compareOp:      "1", // CompareOp: ValueIsAbove (1) - alerts when value > target
				matchType:      "1", // MatchType: AtleastOnce (1) - at least one point must match
				target:         100.0,
				recoveryTarget: func() *float64 { v := 80.0; return &v }(),
				thresholdName:  "critical",
				additionalThresholds: []struct {
					name           string
					target         float64
					recoveryTarget *float64
					matchType      string
					compareOp      string
				}{
					{
						name:           "warning",
						target:         90.0,
						recoveryTarget: func() *float64 { v := 70.0; return &v }(),
						matchType:      "1", // MatchType: AtleastOnce (1)
						compareOp:      "1", // CompareOp: ValueIsAbove (1)
					},
				},
				activeAlerts: nil,
			},
			ExpectedResults: map[string]thresholdExpectation{
				"critical": {
					ShouldReturnSample: true,
					IsRecovering:       true,
					SampleValue:        85.0,
					TargetValue:        100.0,
					RecoveryValue:      func() *float64 { v := 80.0; return &v }(),
				},
				"warning": {
					ShouldReturnSample: true,
					IsRecovering:       true,
					SampleValue:        85.0,
					TargetValue:        90.0,
					RecoveryValue:      func() *float64 { v := 70.0; return &v }(),
				},
			},
			ExpectedSampleCount: 2,
			ExpectedSampleOrder: []string{"critical", "warning"}, // Sorted descending: 100, 90
		},

		// ============================================================
		// Test 6: Non-overlapping Recovery Zones
		// ============================================================
		// Value: 75.0
		// Critical (target=100, recovery=80): 75 < 80 (below recovery) → Fully recovered
		// Warning (target=90, recovery=70): 75 < 90 AND 75 > 70 → IsRecovering=true
		{
			recoveryTestCase: recoveryTestCase{
				description: "MultiThreshold: Non-overlapping zones - value 75 only in Warning recovery, Critical fully recovered",
				values: v3.Series{
					Points: []v3.Point{{Value: 75.0}},
					Labels: map[string]string{"service": "inventory"},
				},
				compareOp:      "1", // CompareOp: ValueIsAbove (1) - alerts when value > target
				matchType:      "1", // MatchType: AtleastOnce (1) - at least one point must match
				target:         100.0,
				recoveryTarget: func() *float64 { v := 80.0; return &v }(),
				thresholdName:  "critical",
				additionalThresholds: []struct {
					name           string
					target         float64
					recoveryTarget *float64
					matchType      string
					compareOp      string
				}{
					{
						name:           "warning",
						target:         90.0,
						recoveryTarget: func() *float64 { v := 70.0; return &v }(),
						matchType:      "1", // MatchType: AtleastOnce (1)
						compareOp:      "1", // CompareOp: ValueIsAbove (1)
					},
				},
				activeAlerts: nil,
			},
			ExpectedResults: map[string]thresholdExpectation{
				"critical": {
					ShouldReturnSample: false, // 75 < 80 (fully recovered)
					IsRecovering:       false,
					SampleValue:        0,
					TargetValue:        0,
					RecoveryValue:      nil,
				},
				"warning": {
					ShouldReturnSample: true,
					IsRecovering:       true, // 75 < 90 AND 75 > 70
					SampleValue:        75.0,
					TargetValue:        90.0,
					RecoveryValue:      func() *float64 { v := 70.0; return &v }(),
				},
			},
			ExpectedSampleCount: 1,
			ExpectedSampleOrder: []string{"warning"}, // Only warning in result
		},

		// ============================================================
		// Test 7: Different MatchTypes - Once vs Always
		// ============================================================
		// Values: [85, 95, 88]
		// Critical (Once, target=100, recovery=80):
		//   - shouldAlert: Check if ANY value > 100 → None match → false
		//   - matchesRecovery: Check if ANY value > 80 → 85 > 80 → true (returns first match: 85)
		// Warning (Always, target=90, recovery=70):
		//   - shouldAlert: Check if ALL values > 90 → 85 ≤ 90 (fails) → false
		//   - matchesRecovery: Check if ALL values > 70 → All [85,95,88] > 70 → true (returns min: 85)
		// Result: Both thresholds are recovering
		{
			recoveryTestCase: recoveryTestCase{
				description: "MultiThreshold: Different MatchTypes - Critical(Once) and Warning(Always) both recovering",
				values: v3.Series{
					Points: []v3.Point{
						{Value: 85.0},
						{Value: 95.0},
						{Value: 88.0},
					},
					Labels: map[string]string{"service": "search"},
				},
				compareOp:      "1", // CompareOp: ValueIsAbove (1) - alerts when value > target
				matchType:      "1", // MatchType: AtleastOnce (1) - at least one point must match
				target:         100.0,
				recoveryTarget: func() *float64 { v := 80.0; return &v }(),
				thresholdName:  "critical",
				additionalThresholds: []struct {
					name           string
					target         float64
					recoveryTarget *float64
					matchType      string
					compareOp      string
				}{
					{
						name:           "warning",
						target:         90.0,
						recoveryTarget: func() *float64 { v := 70.0; return &v }(),
						matchType:      "2", // MatchType: AllTheTimes (2) - all points must match
						compareOp:      "1", // CompareOp: ValueIsAbove (1)
					},
				},
				activeAlerts: nil,
			},
			ExpectedResults: map[string]thresholdExpectation{
				"critical": {
					ShouldReturnSample: true,
					IsRecovering:       true, // At least one value > 80 (recovery target)
					SampleValue:        85.0, // First value that matches: 85 > 80
					TargetValue:        100.0,
					RecoveryValue:      func() *float64 { v := 80.0; return &v }(),
				},
				"warning": {
					ShouldReturnSample: true,
					IsRecovering:       true, // All values > 70 (recovery target)
					SampleValue:        85.0, // Min value for AllTheTimes: min(85, 95, 88) = 85
					TargetValue:        90.0,
					RecoveryValue:      func() *float64 { v := 70.0; return &v }(),
				},
			},
			ExpectedSampleCount: 2,
			ExpectedSampleOrder: []string{"critical", "warning"}, // Sorted descending by target: 100, 90
		},

		// ============================================================
		// Test 8: Mixed Recovery Config - One has recovery, one doesn't
		// ============================================================
		// Value: 85.0
		// Critical (target=100, recovery=80): 85 < 100 AND 85 > 80 → IsRecovering=true
		// Warning (target=90, recovery=nil): 85 < 90 → Immediately resolved (no recovery zone)
		{
			recoveryTestCase: recoveryTestCase{
				description: "MultiThreshold: Mixed recovery config - Critical has recovery target, Warning doesn't",
				values: v3.Series{
					Points: []v3.Point{{Value: 85.0}},
					Labels: map[string]string{"service": "notification"},
				},
				compareOp:      "1", // CompareOp: ValueIsAbove (1) - alerts when value > target
				matchType:      "1", // MatchType: AtleastOnce (1) - at least one point must match
				target:         100.0,
				recoveryTarget: func() *float64 { v := 80.0; return &v }(),
				thresholdName:  "critical",
				additionalThresholds: []struct {
					name           string
					target         float64
					recoveryTarget *float64
					matchType      string
					compareOp      string
				}{
					{
						name:           "warning",
						target:         90.0,
						recoveryTarget: nil, // No recovery target
						matchType:      "1", // MatchType: AtleastOnce (1)
						compareOp:      "1", // CompareOp: ValueIsAbove (1)
					},
				},
				activeAlerts: nil,
			},
			ExpectedResults: map[string]thresholdExpectation{
				"critical": {
					ShouldReturnSample: true,
					IsRecovering:       true,
					SampleValue:        85.0,
					TargetValue:        100.0,
					RecoveryValue:      func() *float64 { v := 80.0; return &v }(),
				},
				"warning": {
					ShouldReturnSample: false, // No recovery target, immediately resolved
					IsRecovering:       false,
					SampleValue:        0,
					TargetValue:        0,
					RecoveryValue:      nil,
				},
			},
			ExpectedSampleCount: 1,
			ExpectedSampleOrder: []string{"critical"}, // Only critical
		},

		// ============================================================
		// Test 9: All Thresholds Firing
		// ============================================================
		// Value: 150.0
		// Critical (target=100): 150 > 100 → Firing
		// Warning (target=80): 150 > 80 → Firing
		// Info (target=60): 150 > 60 → Firing
		{
			recoveryTestCase: recoveryTestCase{
				description: "MultiThreshold: All firing - value 150 breaches all three thresholds",
				values: v3.Series{
					Points: []v3.Point{{Value: 150.0}},
					Labels: map[string]string{"service": "cache"},
				},
				compareOp:      "1", // CompareOp: ValueIsAbove (1) - alerts when value > target
				matchType:      "1", // MatchType: AtleastOnce (1) - at least one point must match
				target:         100.0,
				recoveryTarget: func() *float64 { v := 90.0; return &v }(),
				thresholdName:  "critical",
				additionalThresholds: []struct {
					name           string
					target         float64
					recoveryTarget *float64
					matchType      string
					compareOp      string
				}{
					{
						name:           "warning",
						target:         80.0,
						recoveryTarget: func() *float64 { v := 70.0; return &v }(),
						matchType:      "1", // MatchType: AtleastOnce (1)
						compareOp:      "1", // CompareOp: ValueIsAbove (1)
					},
					{
						name:           "info",
						target:         60.0,
						recoveryTarget: func() *float64 { v := 50.0; return &v }(),
						matchType:      "1", // MatchType: AtleastOnce (1)
						compareOp:      "1", // CompareOp: ValueIsAbove (1)
					},
				},
				activeAlerts: nil,
			},
			ExpectedResults: map[string]thresholdExpectation{
				"critical": {
					ShouldReturnSample: true,
					IsRecovering:       false, // 150 > 100 (firing)
					SampleValue:        150.0,
					TargetValue:        100.0,
					RecoveryValue:      func() *float64 { v := 90.0; return &v }(),
				},
				"warning": {
					ShouldReturnSample: true,
					IsRecovering:       false, // 150 > 80 (firing)
					SampleValue:        150.0,
					TargetValue:        80.0,
					RecoveryValue:      func() *float64 { v := 70.0; return &v }(),
				},
				"info": {
					ShouldReturnSample: true,
					IsRecovering:       false, // 150 > 60 (firing)
					SampleValue:        150.0,
					TargetValue:        60.0,
					RecoveryValue:      func() *float64 { v := 50.0; return &v }(),
				},
			},
			ExpectedSampleCount: 3,
			ExpectedSampleOrder: []string{"critical", "warning", "info"}, // Sorted descending: 100, 80, 60
		},

		// ============================================================
		// Test 10: All Thresholds Recovering (with one firing)
		// ============================================================
		// Value: 75.0
		// Critical (target=100, recovery=70): 75 < 100 AND 75 > 70 → IsRecovering=true
		// Warning (target=80, recovery=65): 75 < 80 AND 75 > 65 → IsRecovering=true
		// Info (target=60, recovery=50): 75 > 60 → Firing
		{
			recoveryTestCase: recoveryTestCase{
				description: "MultiThreshold: Two recovering, one firing - value 75 in recovery zones",
				values: v3.Series{
					Points: []v3.Point{{Value: 75.0}},
					Labels: map[string]string{"service": "queue"},
				},
				compareOp:      "1", // CompareOp: ValueIsAbove (1) - alerts when value > target
				matchType:      "1", // MatchType: AtleastOnce (1) - at least one point must match
				target:         100.0,
				recoveryTarget: func() *float64 { v := 70.0; return &v }(),
				thresholdName:  "critical",
				additionalThresholds: []struct {
					name           string
					target         float64
					recoveryTarget *float64
					matchType      string
					compareOp      string
				}{
					{
						name:           "warning",
						target:         80.0,
						recoveryTarget: func() *float64 { v := 65.0; return &v }(),
						matchType:      "1",
						compareOp:      "1",
					},
					{
						name:           "info",
						target:         60.0,
						recoveryTarget: func() *float64 { v := 50.0; return &v }(),
						matchType:      "1", // MatchType: AtleastOnce (1)
						compareOp:      "1", // CompareOp: ValueIsAbove (1)
					},
				},
				activeAlerts: nil,
			},
			ExpectedResults: map[string]thresholdExpectation{
				"critical": {
					ShouldReturnSample: true,
					IsRecovering:       true, // 75 < 100 AND 75 > 70
					SampleValue:        75.0,
					TargetValue:        100.0,
					RecoveryValue:      func() *float64 { v := 70.0; return &v }(),
				},
				"warning": {
					ShouldReturnSample: true,
					IsRecovering:       true, // 75 < 80 AND 75 > 65
					SampleValue:        75.0,
					TargetValue:        80.0,
					RecoveryValue:      func() *float64 { v := 65.0; return &v }(),
				},
				"info": {
					ShouldReturnSample: true,
					IsRecovering:       false, // 75 > 60 (firing)
					SampleValue:        75.0,
					TargetValue:        60.0,
					RecoveryValue:      func() *float64 { v := 50.0; return &v }(),
				},
			},
			ExpectedSampleCount: 3,
			ExpectedSampleOrder: []string{"critical", "warning", "info"}, // Sorted descending: 100, 80, 60
		},

		// ============================================================
		// Test 11: Mixed Operators - Above and Below on same metric
		// ============================================================
		// Value: 85.0
		// High CPU (Above, target=90, recovery=80): 85 < 90 AND 85 > 80 → IsRecovering=true
		// Low CPU (Below, target=10, recovery=20): 85 > 10 AND 85 > 20 → Fully recovered
		{
			recoveryTestCase: recoveryTestCase{
				description: "MultiThreshold: Mixed operators - CPU Above 90 (high) and Below 10 (low) thresholds",
				values: v3.Series{
					Points: []v3.Point{{Value: 85.0}},
					Labels: map[string]string{"service": "worker"},
				},
				compareOp:      "1", // Above
				matchType:      "1", // AtleastOnce
				target:         90.0,
				recoveryTarget: func() *float64 { v := 80.0; return &v }(),
				thresholdName:  "high_cpu",
				additionalThresholds: []struct {
					name           string
					target         float64
					recoveryTarget *float64
					matchType      string
					compareOp      string
				}{
					{
						name:           "low_cpu",
						target:         10.0,
						recoveryTarget: func() *float64 { v := 20.0; return &v }(),
						matchType:      "1", // MatchType: AtleastOnce (1)
						compareOp:      "2", // CompareOp: ValueIsBelow (2)
					},
				},
				activeAlerts: nil,
			},
			ExpectedResults: map[string]thresholdExpectation{
				"high_cpu": {
					ShouldReturnSample: true,
					IsRecovering:       true, // 85 < 90 AND 85 > 80
					SampleValue:        85.0,
					TargetValue:        90.0,
					RecoveryValue:      func() *float64 { v := 80.0; return &v }(),
				},
				"low_cpu": {
					ShouldReturnSample: false, // 85 > 20 (fully recovered)
					IsRecovering:       false,
					SampleValue:        0,
					TargetValue:        0,
					RecoveryValue:      nil,
				},
			},
			ExpectedSampleCount: 1,
			ExpectedSampleOrder: []string{"high_cpu"}, // Only high_cpu in result
		},

		// ============================================================
		// Test 12: OnAverage MatchType with Above operator
		// ============================================================
		// Values: [70, 90, 100]
		// Critical (OnAverage, Above, target=100, recovery=80): avg=86.67 < 100 AND avg > 80 → IsRecovering=true
		// Warning (AtleastOnce, Above, target=95, recovery=85): 100 > 95 → Firing
		{
			recoveryTestCase: recoveryTestCase{
				description: "MultiThreshold: OnAverage vs AtleastOnce - Critical(OnAverage) recovering, Warning(Once) firing",
				values: v3.Series{
					Points: []v3.Point{
						{Value: 70.0},
						{Value: 90.0},
						{Value: 100.0},
					},
					Labels: map[string]string{"service": "analytics"},
				},
				compareOp:      "1", // CompareOp: ValueIsAbove (1)
				matchType:      "3", // MatchType: OnAverage (3) - average of all points
				target:         100.0,
				recoveryTarget: func() *float64 { v := 80.0; return &v }(),
				thresholdName:  "critical",
				additionalThresholds: []struct {
					name           string
					target         float64
					recoveryTarget *float64
					matchType      string
					compareOp      string
				}{
					{
						name:           "warning",
						target:         95.0,
						recoveryTarget: func() *float64 { v := 85.0; return &v }(),
						matchType:      "1", // AtleastOnce
						compareOp:      "1", // Above
					},
				},
				activeAlerts: nil,
			},
			ExpectedResults: map[string]thresholdExpectation{
				"critical": {
					ShouldReturnSample: true,
					IsRecovering:       true,  // avg(70,90,100)=86.67 < 100 AND > 80
					SampleValue:        86.67, // Average value (rounded)
					TargetValue:        100.0,
					RecoveryValue:      func() *float64 { v := 80.0; return &v }(),
				},
				"warning": {
					ShouldReturnSample: true,
					IsRecovering:       false, // 100 > 95 (firing)
					SampleValue:        100.0,
					TargetValue:        95.0,
					RecoveryValue:      func() *float64 { v := 85.0; return &v }(),
				},
			},
			ExpectedSampleCount: 2,
			ExpectedSampleOrder: []string{"critical", "warning"}, // Sorted descending: 100, 95
		},

		// ============================================================
		// Test 13: Last MatchType with Below operator
		// ============================================================
		// Values: [100, 90, 15]
		// Critical (Last, Below, target=10, recovery=20): last=15 > 10 AND 15 < 20 → IsRecovering=true
		// Warning (Last, Below, target=30, recovery=40): last=15 < 30 → Firing
		{
			recoveryTestCase: recoveryTestCase{
				description: "MultiThreshold: Last MatchType - Critical(Last) recovering, Warning(Last) firing",
				values: v3.Series{
					Points: []v3.Point{
						{Value: 100.0},
						{Value: 90.0},
						{Value: 15.0},
					},
					Labels: map[string]string{"service": "memory"},
				},
				compareOp:      "2", // CompareOp: ValueIsBelow (2)
				matchType:      "5", // MatchType: Last (5) - only last point matters
				target:         10.0,
				recoveryTarget: func() *float64 { v := 20.0; return &v }(),
				thresholdName:  "critical",
				additionalThresholds: []struct {
					name           string
					target         float64
					recoveryTarget *float64
					matchType      string
					compareOp      string
				}{
					{
						name:           "warning",
						target:         30.0,
						recoveryTarget: func() *float64 { v := 40.0; return &v }(),
						matchType:      "5", // Last
						compareOp:      "2", // Below
					},
				},
				activeAlerts: nil,
			},
			ExpectedResults: map[string]thresholdExpectation{
				"critical": {
					ShouldReturnSample: true,
					IsRecovering:       true, // 15 > 10 AND 15 < 20
					SampleValue:        15.0, // Last value
					TargetValue:        10.0,
					RecoveryValue:      func() *float64 { v := 20.0; return &v }(),
				},
				"warning": {
					ShouldReturnSample: true,
					IsRecovering:       false, // 15 < 30 (firing)
					SampleValue:        15.0,  // Last value
					TargetValue:        30.0,
					RecoveryValue:      func() *float64 { v := 40.0; return &v }(),
				},
			},
			ExpectedSampleCount: 2,
			ExpectedSampleOrder: []string{"critical", "warning"}, // Sorted ascending for Below: 10, 30
		},

		// ============================================================
		// Test 14: Boundary Value Testing - Above vs Below at same value
		// ============================================================
		// Value: 90.0
		// Critical (Above, target=90, recovery=80): 90 > 90 → false, check recovery: 90 > 80 → IsRecovering=true
		// Warning (Below, target=90, recovery=100): 90 < 90 → false, check recovery: 90 < 100 → IsRecovering=true
		{
			recoveryTestCase: recoveryTestCase{
				description: "MultiThreshold: Boundary value - both recovering at exact target value",
				values: v3.Series{
					Points: []v3.Point{{Value: 90.0}},
					Labels: map[string]string{"service": "boundary"},
				},
				compareOp:      "1", // CompareOp: ValueIsAbove (1)
				matchType:      "1", // AtleastOnce
				target:         90.0,
				recoveryTarget: func() *float64 { v := 80.0; return &v }(),
				thresholdName:  "critical",
				additionalThresholds: []struct {
					name           string
					target         float64
					recoveryTarget *float64
					matchType      string
					compareOp      string
				}{
					{
						name:           "warning",
						target:         90.0,
						recoveryTarget: func() *float64 { v := 100.0; return &v }(),
						matchType:      "1", // AtleastOnce
						compareOp:      "2", // CompareOp: ValueIsBelow (2)
					},
				},
				activeAlerts: nil,
			},
			ExpectedResults: map[string]thresholdExpectation{
				"critical": {
					ShouldReturnSample: true,
					IsRecovering:       true, // 90 not > 90 (not firing), but 90 > 80 (recovering)
					SampleValue:        90.0,
					TargetValue:        90.0,
					RecoveryValue:      func() *float64 { v := 80.0; return &v }(),
				},
				"warning": {
					ShouldReturnSample: true,
					IsRecovering:       true, // 90 not < 90 (not firing), but 90 < 100 (recovering)
					SampleValue:        90.0,
					TargetValue:        90.0,
					RecoveryValue:      func() *float64 { v := 100.0; return &v }(),
				},
			},
			ExpectedSampleCount: 2,
			ExpectedSampleOrder: []string{"critical", "warning"}, // Both have same target
		},

		// ============================================================
		// Test 15: InTotal MatchType with Above operator
		// ============================================================
		// Values: [30, 40, 50]
		// Critical (InTotal, Above, target=150, recovery=100): sum=120 < 150 AND 120 > 100 → IsRecovering=true
		// Warning (InTotal, Above, target=100, recovery=80): sum=120 > 100 → Firing
		{
			recoveryTestCase: recoveryTestCase{
				description: "MultiThreshold: InTotal MatchType - Critical recovering, Warning firing based on sum",
				values: v3.Series{
					Points: []v3.Point{
						{Value: 30.0},
						{Value: 40.0},
						{Value: 50.0},
					},
					Labels: map[string]string{"service": "requests"},
				},
				compareOp:      "1", // CompareOp: ValueIsAbove (1)
				matchType:      "4", // MatchType: InTotal (4) - sum of all points
				target:         150.0,
				recoveryTarget: func() *float64 { v := 100.0; return &v }(),
				thresholdName:  "critical",
				additionalThresholds: []struct {
					name           string
					target         float64
					recoveryTarget *float64
					matchType      string
					compareOp      string
				}{
					{
						name:           "warning",
						target:         100.0,
						recoveryTarget: func() *float64 { v := 80.0; return &v }(),
						matchType:      "4", // InTotal
						compareOp:      "1", // Above
					},
				},
				activeAlerts: nil,
			},
			ExpectedResults: map[string]thresholdExpectation{
				"critical": {
					ShouldReturnSample: true,
					IsRecovering:       true,  // sum=120 < 150 AND 120 > 100
					SampleValue:        120.0, // Sum of all values
					TargetValue:        150.0,
					RecoveryValue:      func() *float64 { v := 100.0; return &v }(),
				},
				"warning": {
					ShouldReturnSample: true,
					IsRecovering:       false, // sum=120 > 100 (firing)
					SampleValue:        120.0, // Sum of all values
					TargetValue:        100.0,
					RecoveryValue:      func() *float64 { v := 80.0; return &v }(),
				},
			},
			ExpectedSampleCount: 2,
			ExpectedSampleOrder: []string{"critical", "warning"}, // Sorted descending: 150, 100
		},

		// ============================================================
		// Test 16: Mixed MatchTypes - OnAverage, Last, and AllTheTimes
		// ============================================================
		// Values: [60, 80, 100]
		// Critical (OnAverage, Above, target=90, recovery=70): avg=80 < 90 AND 80 > 70 → IsRecovering=true
		// Warning (Last, Above, target=95, recovery=85): last=100 > 95 → Firing
		// Info (AllTheTimes, Above, target=50, recovery=40): all > 50 → Firing (min=60)
		{
			recoveryTestCase: recoveryTestCase{
				description: "MultiThreshold: Mixed MatchTypes - OnAverage recovering, Last firing, AllTheTimes firing",
				values: v3.Series{
					Points: []v3.Point{
						{Value: 60.0},
						{Value: 80.0},
						{Value: 100.0},
					},
					Labels: map[string]string{"service": "mixed"},
				},
				compareOp:      "1", // Above
				matchType:      "3", // OnAverage
				target:         90.0,
				recoveryTarget: func() *float64 { v := 70.0; return &v }(),
				thresholdName:  "critical",
				additionalThresholds: []struct {
					name           string
					target         float64
					recoveryTarget *float64
					matchType      string
					compareOp      string
				}{
					{
						name:           "warning",
						target:         95.0,
						recoveryTarget: func() *float64 { v := 85.0; return &v }(),
						matchType:      "5", // Last
						compareOp:      "1", // Above
					},
					{
						name:           "info",
						target:         50.0,
						recoveryTarget: func() *float64 { v := 40.0; return &v }(),
						matchType:      "2", // AllTheTimes
						compareOp:      "1", // Above
					},
				},
				activeAlerts: nil,
			},
			ExpectedResults: map[string]thresholdExpectation{
				"critical": {
					ShouldReturnSample: true,
					IsRecovering:       true, // avg=80 < 90 AND 80 > 70
					SampleValue:        80.0, // Average
					TargetValue:        90.0,
					RecoveryValue:      func() *float64 { v := 70.0; return &v }(),
				},
				"warning": {
					ShouldReturnSample: true,
					IsRecovering:       false, // last=100 > 95 (firing)
					SampleValue:        100.0, // Last value
					TargetValue:        95.0,
					RecoveryValue:      func() *float64 { v := 85.0; return &v }(),
				},
				"info": {
					ShouldReturnSample: true,
					IsRecovering:       false, // all > 50 (firing)
					SampleValue:        60.0,  // Min value for AllTheTimes
					TargetValue:        50.0,
					RecoveryValue:      func() *float64 { v := 40.0; return &v }(),
				},
			},
			ExpectedSampleCount: 3,
			ExpectedSampleOrder: []string{"warning", "critical", "info"}, // Sorted descending: 95, 90, 50
		},

		// ============================================================
		// Test 17: ValueIsEq operator with different MatchTypes
		// ============================================================
		// Values: [90, 90, 85]
		// Critical (AtleastOnce, Eq, target=90, recovery=85): At least one == 90 → Firing
		// Warning (AllTheTimes, Eq, target=90, recovery=85): Not all == 90 → Not firing
		//   - Recovery check: Not all == 85 either → Fully resolved (no sample)
		{
			recoveryTestCase: recoveryTestCase{
				description: "MultiThreshold: ValueIsEq operator - Critical(Once) firing, Warning(Always) resolved",
				values: v3.Series{
					Points: []v3.Point{
						{Value: 90.0},
						{Value: 90.0},
						{Value: 85.0},
					},
					Labels: map[string]string{"service": "equality"},
				},
				compareOp:      "3", // CompareOp: ValueIsEq (3)
				matchType:      "1", // AtleastOnce
				target:         90.0,
				recoveryTarget: func() *float64 { v := 85.0; return &v }(),
				thresholdName:  "critical",
				additionalThresholds: []struct {
					name           string
					target         float64
					recoveryTarget *float64
					matchType      string
					compareOp      string
				}{
					{
						name:           "warning",
						target:         90.0,
						recoveryTarget: func() *float64 { v := 85.0; return &v }(),
						matchType:      "2", // AllTheTimes
						compareOp:      "3", // Eq
					},
				},
				activeAlerts: nil,
			},
			ExpectedResults: map[string]thresholdExpectation{
				"critical": {
					ShouldReturnSample: true,
					IsRecovering:       false, // At least one == 90 (firing)
					SampleValue:        90.0,
					TargetValue:        90.0,
					RecoveryValue:      func() *float64 { v := 85.0; return &v }(),
				},
				"warning": {
					ShouldReturnSample: false, // Not all == 90 (not firing), not all == 85 (not recovering) → Resolved
					IsRecovering:       false,
					SampleValue:        0,
					TargetValue:        0,
					RecoveryValue:      nil,
				},
			},
			ExpectedSampleCount: 1,
			ExpectedSampleOrder: []string{"critical"}, // Only critical firing
		},

		// ============================================================
		// Test 18: ValueIsNotEq operator
		// ============================================================
		// Value: 85.0
		// Critical (NotEq, target=100, recovery=90): 85 != 100 → Firing
		// Warning (NotEq, target=85, recovery=80):
		//   - shouldAlert: 85 != 85? No (85 == 85) → Not firing
		//   - matchesRecovery: 85 != 80? Yes → IsRecovering=true
		{
			recoveryTestCase: recoveryTestCase{
				description: "MultiThreshold: ValueIsNotEq operator - Critical firing, Warning recovering",
				values: v3.Series{
					Points: []v3.Point{{Value: 85.0}},
					Labels: map[string]string{"service": "inequality"},
				},
				compareOp:      "4", // CompareOp: ValueIsNotEq (4)
				matchType:      "1", // AtleastOnce
				target:         100.0,
				recoveryTarget: func() *float64 { v := 90.0; return &v }(),
				thresholdName:  "critical",
				additionalThresholds: []struct {
					name           string
					target         float64
					recoveryTarget *float64
					matchType      string
					compareOp      string
				}{
					{
						name:           "warning",
						target:         85.0,
						recoveryTarget: func() *float64 { v := 80.0; return &v }(),
						matchType:      "1", // AtleastOnce
						compareOp:      "4", // NotEq
					},
				},
				activeAlerts: nil,
			},
			ExpectedResults: map[string]thresholdExpectation{
				"critical": {
					ShouldReturnSample: true,
					IsRecovering:       false, // 85 != 100 (firing)
					SampleValue:        85.0,
					TargetValue:        100.0,
					RecoveryValue:      func() *float64 { v := 90.0; return &v }(),
				},
				"warning": {
					ShouldReturnSample: true,
					IsRecovering:       true, // 85 == 85 (not firing), but 85 != 80 (recovering)
					SampleValue:        85.0,
					TargetValue:        85.0,
					RecoveryValue:      func() *float64 { v := 80.0; return &v }(),
				},
			},
			ExpectedSampleCount: 2,
			ExpectedSampleOrder: []string{"critical", "warning"}, // Sorted descending: 100, 85
		},
	}
)
