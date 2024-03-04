// Copyright The OpenTelemetry Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package timeutils

import "time"

// TTicker interface allows easier testing of Ticker related functionality
type TTicker interface {
	// start sets the frequency of the Ticker and starts the periodic calls to OnTick.
	Start(d time.Duration)
	// OnTick is called when the Ticker fires.
	OnTick()
	// Stop firing the Ticker.
	Stop()
}

// Implements TTicker and abstracts underlying time ticker's functionality to make usage
// simpler.
type PolicyTicker struct {
	Ticker     *time.Ticker
	OnTickFunc func()
	StopCh     chan struct{}
}

// Ensure PolicyTicker implements TTicker interface
var _ TTicker = (*PolicyTicker)(nil)

func (pt *PolicyTicker) Start(d time.Duration) {
	pt.Ticker = time.NewTicker(d)
	pt.StopCh = make(chan struct{})
	go func() {
		for {
			select {
			case <-pt.Ticker.C:
				pt.OnTick()
			case <-pt.StopCh:
				return
			}
		}
	}()
}

func (pt *PolicyTicker) OnTick() {
	pt.OnTickFunc()
}

func (pt *PolicyTicker) Stop() {
	if pt.StopCh == nil {
		return
	}
	close(pt.StopCh)
	pt.Ticker.Stop()
}
