package querybuilder

import (
	"strings"
	"testing"
)

func TestContradictionDetection(t *testing.T) {
	tests := []struct {
		name             string
		query            string
		hasContradiction bool
		expectedErrors   []string
	}{
		{
			name:             "Simple equality contradiction",
			query:            `service.name = 'redis' service.name='route' http.status_code=200`,
			hasContradiction: true,
			expectedErrors:   []string{"service.name"},
		},
		{
			name:             "Equal and not equal same value",
			query:            `service.name = 'redis' AND service.name != 'redis'`,
			hasContradiction: true,
			expectedErrors:   []string{"service.name"},
		},
		{
			name:             "Range contradiction",
			query:            `http.status_code > 500 AND http.status_code < 400`,
			hasContradiction: true,
			expectedErrors:   []string{"http.status_code"},
		},
		{
			name:             "IN and NOT IN overlap",
			query:            `service.name IN ('redis', 'mysql') AND service.name NOT IN ('redis', 'postgres')`,
			hasContradiction: true,
			expectedErrors:   []string{"service.name"},
		},
		{
			name:             "EXISTS and NOT EXISTS",
			query:            `custom.tag EXISTS AND custom.tag NOT EXISTS`,
			hasContradiction: true,
			expectedErrors:   []string{"custom.tag"},
		},
		{
			name:             "Equal and NOT IN containing value",
			query:            `service.name = 'redis' AND service.name NOT IN ('redis', 'mysql')`,
			hasContradiction: true,
			expectedErrors:   []string{"service.name"},
		},
		{
			name:             "Non-overlapping BETWEEN ranges",
			query:            `http.status_code BETWEEN 200 AND 299 AND http.status_code BETWEEN 400 AND 499`,
			hasContradiction: true,
			expectedErrors:   []string{"http.status_code"},
		},
		{
			name:             "Valid query with no contradictions",
			query:            `service.name = 'redis' AND http.status_code >= 200 AND http.status_code < 300`,
			hasContradiction: false,
			expectedErrors:   []string{},
		},
		{
			name:             "OR expression - no contradiction",
			query:            `service.name = 'redis' OR service.name = 'mysql'`,
			hasContradiction: false,
			expectedErrors:   []string{},
		},
		{
			name:             "Complex valid query",
			query:            `(service.name = 'redis' OR service.name = 'mysql') AND http.status_code = 200`,
			hasContradiction: false,
			expectedErrors:   []string{},
		},
		{
			name:             "Negated contradiction",
			query:            `NOT (service.name = 'redis') AND service.name = 'redis'`,
			hasContradiction: true,
			expectedErrors:   []string{"service.name"},
		},
		{
			name:             "Multiple field contradictions",
			query:            `service.name = 'redis' AND service.name = 'mysql' AND http.status_code = 200 AND http.status_code = 404`,
			hasContradiction: true,
			expectedErrors:   []string{"service.name", "http.status_code"},
		},
		{
			name:             "Implicit AND with contradiction",
			query:            `service.name='redis' service.name='mysql'`,
			hasContradiction: true,
			expectedErrors:   []string{"service.name"},
		},
		{
			name:             "Equal with incompatible range",
			query:            `http.status_code = 200 AND http.status_code > 300`,
			hasContradiction: true,
			expectedErrors:   []string{"http.status_code"},
		},
		{
			name:             "Complex nested contradiction",
			query:            `(service.name = 'redis' AND http.status_code = 200) AND (service.name = 'mysql' AND http.status_code = 200)`,
			hasContradiction: true,
			expectedErrors:   []string{"service.name"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			contradictions, err := DetectContradictions(tt.query)

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			hasContradiction := len(contradictions) > 0

			if hasContradiction != tt.hasContradiction {
				t.Errorf("expected hasContradiction=%v, got %v. Contradictions: %v",
					tt.hasContradiction, hasContradiction, contradictions)
			}

			if tt.hasContradiction {
				// Check that we found contradictions for expected fields
				for _, expectedField := range tt.expectedErrors {
					found := false
					for _, contradiction := range contradictions {
						if strings.Contains(contradiction, expectedField) {
							found = true
							break
						}
					}
					if !found {
						t.Errorf("expected contradiction for field %s, but not found. Got: %v",
							expectedField, contradictions)
					}
				}
			}
		})
	}
}

func TestComplexNestedContradictions(t *testing.T) {
	tests := []struct {
		name             string
		query            string
		hasContradiction bool
		expectedFields   []string
		description      string
	}{
		// Complex nested AND/OR combinations
		{
			name:             "Nested AND with contradiction in inner expression",
			query:            `(service.name = 'redis' AND http.status_code = 200) AND (service.name = 'mysql' AND http.status_code = 200)`,
			hasContradiction: true,
			expectedFields:   []string{"service.name"},
			description:      "Inner ANDs both valid, but combined they contradict on service.name",
		},
		{
			name:             "OR with contradictory AND branches - no contradiction",
			query:            `(service.name = 'redis' AND service.name = 'mysql') OR (http.status_code = 200)`,
			hasContradiction: true,
			expectedFields:   []string{"service.name"},
			description:      "First branch impossible",
		},
		{
			name:             "Deeply nested contradiction",
			query:            `((service.name = 'redis' AND (http.status_code > 200 AND http.status_code < 200)) AND region = 'us-east')`,
			hasContradiction: true,
			expectedFields:   []string{"http.status_code"},
			description:      "Nested impossible range condition",
		},
		{
			name:             "Multiple field contradictions in nested structure",
			query:            `(service.name = 'redis' AND service.name != 'redis') AND (http.status_code = 200 AND http.status_code = 404)`,
			hasContradiction: true,
			expectedFields:   []string{"service.name", "http.status_code"},
			description:      "Both nested expressions have contradictions",
		},

		// Complex BETWEEN contradictions
		{
			name:             "BETWEEN with overlapping ranges - valid",
			query:            `http.status_code BETWEEN 200 AND 299 AND http.status_code BETWEEN 250 AND 350`,
			hasContradiction: false,
			expectedFields:   []string{},
			description:      "Ranges overlap at 250-299, so valid",
		},
		{
			name:             "BETWEEN with exact value outside range",
			query:            `http.status_code = 500 AND http.status_code BETWEEN 200 AND 299`,
			hasContradiction: true,
			expectedFields:   []string{"http.status_code"},
			description:      "Exact value outside BETWEEN range",
		},
		{
			name:             "Multiple BETWEEN with no overlap",
			query:            `(latency BETWEEN 100 AND 200) AND (latency BETWEEN 300 AND 400) AND (latency BETWEEN 500 AND 600)`,
			hasContradiction: true,
			expectedFields:   []string{"latency"},
			description:      "Three non-overlapping ranges",
		},

		// Complex IN/NOT IN combinations
		{
			name:             "IN with nested NOT IN contradiction",
			query:            `service.name IN ('redis', 'mysql', 'postgres') AND (service.name NOT IN ('mysql', 'postgres') AND service.name NOT IN ('redis'))`,
			hasContradiction: true,
			expectedFields:   []string{"service.name"},
			description:      "Combined NOT IN excludes all values from IN",
		},
		{
			name:             "Complex valid IN/NOT IN",
			query:            `service.name IN ('redis', 'mysql', 'postgres') AND service.name NOT IN ('mongodb', 'cassandra')`,
			hasContradiction: false,
			expectedFields:   []string{},
			description:      "Non-overlapping IN and NOT IN lists",
		},

		// Implicit AND with complex expressions
		{
			name:             "Implicit AND with nested contradiction",
			query:            `service.name='redis' (http.status_code > 500 http.status_code < 400)`,
			hasContradiction: true,
			expectedFields:   []string{"http.status_code"},
			description:      "Implicit AND creates impossible range",
		},
		{
			name:             "Mixed implicit and explicit AND",
			query:            `service.name='redis' service.name='mysql' AND http.status_code=200`,
			hasContradiction: true,
			expectedFields:   []string{"service.name"},
			description:      "Implicit AND between service names creates contradiction",
		},

		// NOT operator complexities
		{
			name:             "Double negation with contradiction",
			query:            `NOT (NOT (service.name = 'redis')) AND service.name = 'mysql'`,
			hasContradiction: true,
			expectedFields:   []string{"service.name"},
			description:      "Double NOT cancels out, creating contradiction",
		},

		// Range conditions with multiple operators
		{
			name:             "Chained range conditions creating impossible range",
			query:            `value > 100 AND value < 200 AND value > 300 AND value < 400`,
			hasContradiction: true,
			expectedFields:   []string{"value"},
			description:      "Multiple ranges that cannot be satisfied simultaneously",
		},
		{
			name:             "Valid narrowing range",
			query:            `value > 100 AND value < 400 AND value > 200 AND value < 300`,
			hasContradiction: false,
			expectedFields:   []string{},
			description:      "Ranges narrow down to valid 200-300 range",
		},

		// Mixed operator types
		{
			name:             "LIKE pattern with exact value contradiction",
			query:            `service.name = 'redis-cache-01' AND service.name LIKE 'mysql%'`,
			hasContradiction: true,
			expectedFields:   []string{"service.name"},
			description:      "Exact value doesn't match LIKE pattern",
		},
		{
			name:             "EXISTS with value contradiction",
			query:            `custom.tag EXISTS AND custom.tag = 'value' AND custom.tag NOT EXISTS`,
			hasContradiction: true,
			expectedFields:   []string{"custom.tag"},
			description:      "Field both exists with value and doesn't exist",
		},

		// Edge cases
		{
			name:             "Same field different types",
			query:            `http.status_code = '200' AND http.status_code = 200`,
			hasContradiction: false, // Depends on type coercion
			expectedFields:   []string{},
			description:      "Same value different types - implementation dependent",
		},
		{
			name:             "Complex parentheses with valid expression",
			query:            `((((service.name = 'redis')))) AND ((((http.status_code = 200))))`,
			hasContradiction: false,
			expectedFields:   []string{},
			description:      "Multiple parentheses levels but valid expression",
		},

		// Real-world complex scenarios
		{
			name: "Monitoring query with impossible conditions",
			query: `service.name = 'api-gateway' AND 
					http.status_code >= 500 AND 
					http.status_code < 500 AND 
					region IN ('us-east-1', 'us-west-2') AND 
					region NOT IN ('us-east-1', 'us-west-2', 'eu-west-1')`,
			hasContradiction: true,
			expectedFields:   []string{"http.status_code", "region"},
			description:      "Multiple contradictions in monitoring query",
		},
		{
			name: "Valid complex monitoring query",
			query: `(service.name = 'api-gateway' OR service.name = 'web-server') AND 
					http.status_code >= 400 AND 
					http.status_code < 500 AND 
					region IN ('us-east-1', 'us-west-2') AND 
					latency > 1000`,
			hasContradiction: false,
			expectedFields:   []string{},
			description:      "Complex but valid monitoring conditions",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			contradictions, err := DetectContradictions(tt.query)

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			hasContradiction := len(contradictions) > 0

			if hasContradiction != tt.hasContradiction {
				t.Errorf("Test: %s\nDescription: %s\nExpected hasContradiction=%v, got %v\nContradictions: %v",
					tt.name, tt.description, tt.hasContradiction, hasContradiction, contradictions)
			}

			if tt.hasContradiction {
				// Check that we found contradictions for expected fields
				for _, expectedField := range tt.expectedFields {
					found := false
					for _, contradiction := range contradictions {
						if strings.Contains(contradiction, expectedField) {
							found = true
							break
						}
					}
					if !found {
						t.Errorf("Test: %s\nExpected contradiction for field %s, but not found.\nGot: %v",
							tt.name, expectedField, contradictions)
					}
				}
			}
		})
	}
}

func TestExpressionLevelHandling(t *testing.T) {
	tests := []struct {
		name             string
		query            string
		hasContradiction bool
		description      string
	}{
		{
			name:             "OR at top level - no contradiction",
			query:            `service.name = 'redis' OR service.name = 'mysql'`,
			hasContradiction: false,
			description:      "Top level OR should not check for contradictions",
		},
		{
			name:             "AND within OR - contradiction only in AND branch",
			query:            `(service.name = 'redis' AND service.name = 'mysql') OR http.status_code = 200`,
			hasContradiction: true,
			description:      "Contradiction in one OR branch doesn't make whole expression contradictory",
		},
		{
			name:             "Nested OR within AND - valid",
			query:            `http.status_code = 200 AND (service.name = 'redis' OR service.name = 'mysql')`,
			hasContradiction: false,
			description:      "OR within AND is valid",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			contradictions, err := DetectContradictions(tt.query)

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			hasContradiction := len(contradictions) > 0

			if hasContradiction != tt.hasContradiction {
				t.Errorf("Test: %s\nDescription: %s\nExpected hasContradiction=%v, got %v\nContradictions: %v",
					tt.name, tt.description, tt.hasContradiction, hasContradiction, contradictions)
			}
		})
	}
}
