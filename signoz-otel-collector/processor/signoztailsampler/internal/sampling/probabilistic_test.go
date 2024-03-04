// Copyright The OpenTelemetry Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package sampling

import (
	"encoding/binary"
	"math/rand"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.uber.org/zap"
)

func TestProbabilisticSampling(t *testing.T) {
	tests := []struct {
		name                       string
		samplingPercentage         float64
		hashSalt                   string
		expectedSamplingPercentage float64
	}{
		{
			"100%",
			100,
			"",
			100,
		},
		{
			"0%",
			0,
			"",
			0,
		},
		{
			"25%",
			25,
			"",
			25,
		},
		{
			"33%",
			33,
			"",
			33,
		},
		{
			"33% - custom salt",
			33,
			"test-salt",
			33,
		},
		{
			"-%50",
			-50,
			"",
			0,
		},
		{
			"150%",
			150,
			"",
			100,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			traceCount := 100_000

			probabilisticSampler := NewProbabilisticSampler(zap.NewNop(), tt.hashSalt, tt.samplingPercentage)

			sampled := 0
			for _, traceID := range genRandomTraceIDs(traceCount) {
				trace := newTraceStringAttrs(nil, "example", "value")

				decision, err := probabilisticSampler.Evaluate(traceID, trace)
				assert.NoError(t, err)

				if decision == Sampled {
					sampled++
				}
			}

			effectiveSamplingPercentage := float32(sampled) / float32(traceCount) * 100
			assert.InDelta(t, tt.expectedSamplingPercentage, effectiveSamplingPercentage, 0.2,
				"Effective sampling percentage is %f, expected %f", effectiveSamplingPercentage, tt.expectedSamplingPercentage,
			)
		})
	}
}

func genRandomTraceIDs(num int) (ids []pcommon.TraceID) {
	r := rand.New(rand.NewSource(1))
	ids = make([]pcommon.TraceID, 0, num)
	for i := 0; i < num; i++ {
		traceID := [16]byte{}
		binary.BigEndian.PutUint64(traceID[:8], r.Uint64())
		binary.BigEndian.PutUint64(traceID[8:], r.Uint64())
		ids = append(ids, pcommon.TraceID(traceID))
	}
	return ids
}
