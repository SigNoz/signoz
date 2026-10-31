package querier

import "testing"

func TestFormatValueForPromFloatPrecision(t *testing.T) {
	tests := []struct {
		name  string
		value any
		want  string
	}{
		{name: "float64 precision", value: 0.123456789, want: "0.123456789"},
		{name: "float32 precision", value: float32(0.12345678), want: "0.12345678"},
		{name: "small float64", value: 0.0000001, want: "0.0000001"},
		{name: "small float32", value: float32(0.0000001), want: "0.0000001"},
		{name: "negative float64", value: -0.123456789, want: "-0.123456789"},
		{name: "negative float32", value: float32(-0.12345678), want: "-0.12345678"},
		{name: "zero", value: float64(0), want: "0"},
		{name: "whole float", value: float64(42), want: "42"},
		{name: "integer", value: 42, want: "42"},
		{name: "string", value: "production", want: "production"},
		{name: "boolean", value: true, want: "true"},
		{name: "list", value: []any{0.123456789, 0.987654321}, want: "0.123456789|0.987654321"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := formatValueForProm(tt.value); got != tt.want {
				t.Errorf("formatValueForProm(%v) = %q, want %q", tt.value, got, tt.want)
			}
		})
	}
}
