// Copyright The OpenTelemetry Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//	http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
package sampling // import "github.com/SigNoz/signoz-otel-collector/processor/internal/sampling"

import (
	"time"
)

// TimeProvider allows to get current Unix second
type TimeProvider interface {
	getCurSecond() int64
}

// MonotonicClock provides monotonic real clock-based current Unix second.
// Use it when creating a NewComposite which should measure sample rates
// against a realtime clock (this is almost always what you want to do,
// the exception is usually only automated testing where you may want
// to have fake clocks).
type MonotonicClock struct{}

func (c MonotonicClock) getCurSecond() int64 {
	return time.Now().Unix()
}
