// Copyright The OpenTelemetry Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// copied from https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/operator/parser/regex/cache_test.go

package grok

import (
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"go.uber.org/atomic"
)

func TestNewMemoryCache(t *testing.T) {
	cases := []struct {
		name       string
		maxSize    uint16
		expect     *memoryCache
		expectSize int
	}{
		{
			"size-50",
			50,
			&memoryCache{
				cache: make(map[string]interface{}),
				keys:  make(chan string, 50),
			},
			50,
		},
	}

	for _, tc := range cases {
		output := newMemoryCache(tc.maxSize, 0)
		require.Equal(t, tc.expect.cache, output.cache)
		require.Len(t, output.cache, 0, "new memory should always be empty")
		require.Len(t, output.keys, 0, "new memory should always be empty")
		require.Equal(t, tc.expectSize, cap(output.keys), "keys channel should have cap of expected size")
	}
}

func TestMemory(t *testing.T) {
	cases := []struct {
		name   string
		cache  *memoryCache
		input  map[string]interface{}
		expect *memoryCache
	}{
		{
			"basic",
			func() *memoryCache {
				return newMemoryCache(3, 0)
			}(),
			map[string]interface{}{
				"key": "value",
				"map-value": map[string]string{
					"x":   "y",
					"dev": "stanza",
				},
			},
			&memoryCache{
				cache: map[string]interface{}{
					"key": "value",
					"map-value": map[string]string{
						"x":   "y",
						"dev": "stanza",
					},
				},
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			for key, value := range tc.input {
				tc.cache.add(key, value)
				out := tc.cache.get(key)
				require.NotNil(t, out, "expected to get value from cache immediately after adding it")
				require.Equal(t, value, out, "expected value to equal the value that was added to the cache")
			}

			require.Equal(t, len(tc.expect.cache), len(tc.cache.cache))

			for expectKey, expectItem := range tc.expect.cache {
				actual := tc.cache.get(expectKey)
				require.NotNil(t, actual)
				require.Equal(t, expectItem, actual)
			}
		})
	}
}

// A full cache should replace the oldest element with the new element
func TestCleanupLast(t *testing.T) {
	maxSize := 10

	m := newMemoryCache(uint16(maxSize), 0)

	// Add to cache until it is full
	for i := 0; i <= cap(m.keys); i++ {
		str := strconv.Itoa(i)
		m.add(str, i)
	}

	// make sure the cache looks the way we expect
	expectCache := map[string]interface{}{
		"1":  1, // oldest key, will be removed when 11 is added
		"2":  2,
		"3":  3,
		"4":  4,
		"5":  5,
		"6":  6,
		"7":  7,
		"8":  8,
		"9":  9,
		"10": 10, // youngest key, will be removed when 20 is added
	}
	require.Equal(t, expectCache, m.cache)
	require.Len(t, m.cache, maxSize)
	require.Len(t, m.keys, maxSize)

	// for every additional key, the oldest should be removed
	// 1, 2, 3 and so on.
	for i := 11; i <= 20; i++ {
		str := strconv.Itoa(i)
		m.add(str, i)

		removedKey := strconv.Itoa(i - 10)
		x := m.get(removedKey)
		require.Nil(t, x, "expected key %s to have been removed", removedKey)
		require.Len(t, m.cache, maxSize)
	}

	// All entries should have been replaced by now
	expectCache = map[string]interface{}{
		"11": 11,
		"12": 12,
		"13": 13,
		"14": 14,
		"15": 15,
		"16": 16,
		"17": 17,
		"18": 18,
		"19": 19,
		"20": 20,
	}
	require.Equal(t, expectCache, m.cache)
	require.Len(t, m.cache, maxSize)
}

func TestNewStartedAtomicLimiter(t *testing.T) {
	cases := []struct {
		name     string
		max      uint64
		interval uint64
	}{
		{
			"default",
			0,
			0,
		},
		{
			"max",
			30,
			0,
		},
		{
			"interval",
			0,
			3,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			l := newStartedAtomicLimiter(tc.max, tc.interval)
			require.Equal(t, tc.max, l.max)
			if tc.interval == 0 {
				// default
				tc.interval = 5
			}
			require.Equal(t, float64(tc.interval), l.interval.Seconds())
			require.Equal(t, uint64(0), l.currentCount())
		})
	}
}

// Start a limiter with a max of 3 and ensure throttling begins
func TestLimiter(t *testing.T) {
	max := uint64(3)

	l := newStartedAtomicLimiter(max, 120)
	require.NotNil(t, l)
	require.Equal(t, max, l.max)

	require.False(t, l.throttled(), "new limiter should not be throttling")
	require.Equal(t, uint64(0), l.currentCount())

	var i uint64
	for i = 1; i < max; i++ {
		l.increment()
		require.Equal(t, i, l.currentCount())
		require.False(t, l.throttled())
	}

	l.increment()
	require.True(t, l.throttled())
}

func TestThrottledLimiter(t *testing.T) {
	max := uint64(3)

	// Limiter with a count higher than the max, which will force
	// it to be throttled by default. Also note that the init method
	// has not been called yet, so the reset go routine is not running
	l := atomicLimiter{
		max:      max,
		count:    atomic.NewUint64(max + 1),
		interval: 1,
	}

	require.True(t, l.throttled())

	// Test	the reset go routine by calling init() and waiting
	// for it to reset the counter. The limiter will no longer
	// be in a throttled state and the count will be reset.
	l.init()
	wait := 2 * l.interval
	time.Sleep(time.Second * wait)
	require.False(t, l.throttled())
	require.Equal(t, uint64(0), l.currentCount())
}

func TestThrottledCache(t *testing.T) {
	c := newMemoryCache(3, 120)
	require.False(t, c.limiter.throttled())
	require.Equal(t, 4, int(c.limiter.limit()), "expected limit be cache size + 1")
	require.Equal(t, float64(120), c.limiter.resetInterval().Seconds(), "expected reset interval to be 120 seconds")

	// fill the cache and cause 100% evictions
	for i := 1; i <= 6; i++ {
		key := strconv.Itoa(i)
		value := i
		c.add(key, value)
		require.False(t, c.limiter.throttled())
	}

	// limiter is incremented after cache is full. a cache of size 3
	// with 6 additions will cause the limiter to be set to 3.
	require.Equal(t, 3, int(c.limiter.currentCount()), "expected limit count to be 3 after 6 additions to the cache")

	// 7th addition will be throttled because the cache
	// has already reached 100% eviction rate
	c.add("7", "should be limited")
	require.True(t, c.limiter.throttled())

	// 8th addition will skip adding to the cache
	// because the 7th addition enabled the limiter
	result := c.add("8", "add miss")
	require.True(t, c.limiter.throttled())
	require.False(t, result, "expected add to return false when cache writes are throttled")
}
