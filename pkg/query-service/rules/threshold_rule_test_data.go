package rules

import (
	"time"

	v3 "github.com/SigNoz/signoz/pkg/query-service/model/v3"
)

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

	tcThresholdRuleShouldAlert = []struct {
		values              v3.Series
		expectAlert         bool
		compareOp           string
		matchType           string
		target              float64
		expectedAlertSample v3.Point
	}{
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
)
