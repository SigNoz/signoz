package converter

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestData(t *testing.T) {
	dataConverter := NewDataConverter()
	// 8 bits = 1 byte
	assert.Equal(t, Value{F: 1, U: "bytes"}, dataConverter.Convert(Value{F: 8, U: "bits"}, "bytes"))
	// 1024 bytes = 1 kbytes
	assert.Equal(t, Value{F: 1, U: "kbytes"}, dataConverter.Convert(Value{F: 1024, U: "bytes"}, "kbytes"))
	// 1 byte = 8 bits
	assert.Equal(t, Value{F: 8, U: "bits"}, dataConverter.Convert(Value{F: 1, U: "bytes"}, "bits"))
	// 1 mbytes = 1024 kbytes
	assert.Equal(t, Value{F: 1024, U: "kbytes"}, dataConverter.Convert(Value{F: 1, U: "mbytes"}, "kbytes"))
	// 1 kbytes = 1024 bytes
	assert.Equal(t, Value{F: 1024, U: "bytes"}, dataConverter.Convert(Value{F: 1, U: "kbytes"}, "bytes"))
	// 1024 kbytes = 1 mbytes
	assert.Equal(t, Value{F: 1, U: "mbytes"}, dataConverter.Convert(Value{F: 1024, U: "kbytes"}, "mbytes"))
	// 1 mbytes = 1024 * 1024 bytes
	assert.Equal(t, Value{F: 1024 * 1024, U: "bytes"}, dataConverter.Convert(Value{F: 1, U: "mbytes"}, "bytes"))
	// 1024 mbytes = 1 gbytes
	assert.Equal(t, Value{F: 1, U: "gbytes"}, dataConverter.Convert(Value{F: 1024, U: "mbytes"}, "gbytes"))
	// 1 gbytes = 1024 mbytes
	assert.Equal(t, Value{F: 1024, U: "mbytes"}, dataConverter.Convert(Value{F: 1, U: "gbytes"}, "mbytes"))
	// 1 gbytes = 1024 * 1024 kbytes
	assert.Equal(t, Value{F: 1024 * 1024, U: "kbytes"}, dataConverter.Convert(Value{F: 1, U: "gbytes"}, "kbytes"))
	// 1 gbytes = 1024 * 1024 * 1024 bytes
	assert.Equal(t, Value{F: 1024 * 1024 * 1024, U: "bytes"}, dataConverter.Convert(Value{F: 1, U: "gbytes"}, "bytes"))
	// 1024 gbytes = 1 tbytes
	assert.Equal(t, Value{F: 1, U: "tbytes"}, dataConverter.Convert(Value{F: 1024, U: "gbytes"}, "tbytes"))
	// 1 tbytes = 1024 gbytes
	assert.Equal(t, Value{F: 1024, U: "gbytes"}, dataConverter.Convert(Value{F: 1, U: "tbytes"}, "gbytes"))
	// 1 tbytes = 1024 * 1024 mbytes
	assert.Equal(t, Value{F: 1024 * 1024, U: "mbytes"}, dataConverter.Convert(Value{F: 1, U: "tbytes"}, "mbytes"))
	// 1 tbytes = 1024 * 1024 * 1024 kbytes
	assert.Equal(t, Value{F: 1024 * 1024 * 1024, U: "kbytes"}, dataConverter.Convert(Value{F: 1, U: "tbytes"}, "kbytes"))
	// 1 tbytes = 1024 * 1024 * 1024 * 1024 bytes
	assert.Equal(t, Value{F: 1024 * 1024 * 1024 * 1024, U: "bytes"}, dataConverter.Convert(Value{F: 1, U: "tbytes"}, "bytes"))
	// 1024 tbytes = 1 pbytes
	assert.Equal(t, Value{F: 1, U: "pbytes"}, dataConverter.Convert(Value{F: 1024, U: "tbytes"}, "pbytes"))
	// 1 pbytes = 1024 tbytes
	assert.Equal(t, Value{F: 1024, U: "tbytes"}, dataConverter.Convert(Value{F: 1, U: "pbytes"}, "tbytes"))
}
