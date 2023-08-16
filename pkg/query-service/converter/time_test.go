package converter

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDurationConvert(t *testing.T) {
	timeConverter := NewDurationConverter()
	// 1000 ms = 1 s
	assert.Equal(t, Value{F: 1, U: "s"}, timeConverter.Convert(Value{F: 1000, U: "ms"}, "s"))
	// 1000000 us = 1 s
	assert.Equal(t, Value{F: 1, U: "s"}, timeConverter.Convert(Value{F: 1000000, U: "us"}, "s"))
	// 100000 ms = 100 s
	assert.Equal(t, Value{F: 100, U: "s"}, timeConverter.Convert(Value{F: 100000, U: "ms"}, "s"))
	// 1 s = 1000 ms
	assert.Equal(t, Value{F: 1000, U: "ms"}, timeConverter.Convert(Value{F: 1, U: "s"}, "ms"))
	// 60 s = 1 m
	assert.Equal(t, Value{F: 1, U: "m"}, timeConverter.Convert(Value{F: 60, U: "s"}, "m"))
	// 604800000000000 ns = 1 w
	assert.Equal(t, Value{F: 1, U: "w"}, timeConverter.Convert(Value{F: 604800000000000, U: "ns"}, "w"))
	// 1 m = 60 s
	assert.Equal(t, Value{F: 60, U: "s"}, timeConverter.Convert(Value{F: 1, U: "m"}, "s"))
	// 60 m = 1 h
	assert.Equal(t, Value{F: 1, U: "h"}, timeConverter.Convert(Value{F: 60, U: "m"}, "h"))
	// 168 h = 1 w
	assert.Equal(t, Value{F: 1, U: "w"}, timeConverter.Convert(Value{F: 168, U: "h"}, "w"))
	// 1 h = 60 m
	assert.Equal(t, Value{F: 60, U: "m"}, timeConverter.Convert(Value{F: 1, U: "h"}, "m"))
	// 24 h = 1 d
	assert.Equal(t, Value{F: 1, U: "d"}, timeConverter.Convert(Value{F: 24, U: "h"}, "d"))
	// 10080 m = 1 w
	assert.Equal(t, Value{F: 1, U: "w"}, timeConverter.Convert(Value{F: 10080, U: "m"}, "w"))
	// 1 d = 24 h
	assert.Equal(t, Value{F: 24, U: "h"}, timeConverter.Convert(Value{F: 1, U: "d"}, "h"))
	// 7 d = 1 w
	assert.Equal(t, Value{F: 1, U: "w"}, timeConverter.Convert(Value{F: 7, U: "d"}, "w"))
	// 1 w = 7 d
	assert.Equal(t, Value{F: 7, U: "d"}, timeConverter.Convert(Value{F: 1, U: "w"}, "d"))
	// 1 w = 168 h
	assert.Equal(t, Value{F: 168, U: "h"}, timeConverter.Convert(Value{F: 1, U: "w"}, "h"))
	// 1 w = 10080 m
	assert.Equal(t, Value{F: 10080, U: "m"}, timeConverter.Convert(Value{F: 1, U: "w"}, "m"))
	// 604800 s = 1 w
	assert.Equal(t, Value{F: 1, U: "w"}, timeConverter.Convert(Value{F: 604800, U: "s"}, "w"))
	// 1 w = 604800 s
	assert.Equal(t, Value{F: 604800, U: "s"}, timeConverter.Convert(Value{F: 1, U: "w"}, "s"))
	// 1 w = 604800000000000 ns
	assert.Equal(t, Value{F: 604800000000000, U: "ns"}, timeConverter.Convert(Value{F: 1, U: "w"}, "ns"))
	// 1000 us = 1 ms
	assert.Equal(t, Value{F: 1, U: "ms"}, timeConverter.Convert(Value{F: 1000, U: "us"}, "ms"))
	// 1000000000 ns = 1 s
	assert.Equal(t, Value{F: 1, U: "s"}, timeConverter.Convert(Value{F: 1000000000, U: "ns"}, "s"))
}
