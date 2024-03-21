// Copyright 2017, 2018 Percona LLC
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

package timeseries

import (
	"sort"

	"github.com/prometheus/prometheus/prompb"
)

const nameLabel string = "__name__"

// SortLabels sorts prompb labels by name.
func SortLabels(labels []*prompb.Label) {
	sort.Slice(labels, func(i, j int) bool { return labels[i].Name < labels[j].Name })
}

// SortTimeSeriesSlow sorts time series by metric name and fingerprint.
// It is slow, and should be used only in tests.
func SortTimeSeriesSlow(timeSeries []*prompb.TimeSeries) {
	sort.Slice(timeSeries, func(i, j int) bool {
		labelsi := make([]*prompb.Label, len(timeSeries[i].Labels))
		for x, label := range labelsi {
			labelsi[x] = label
		}
		labelsj := make([]*prompb.Label, len(timeSeries[j].Labels))
		for x, label := range labelsj {
			labelsj[x] = label
		}

		SortLabels(labelsi)
		SortLabels(labelsj)

		var nameI, nameJ string
		for _, l := range timeSeries[i].Labels {
			if l.Name == nameLabel {
				nameI = l.Value
				break
			}
		}
		for _, l := range timeSeries[j].Labels {
			if l.Name == nameLabel {
				nameJ = l.Value
				break
			}
		}
		if nameI != nameJ {
			return nameI < nameJ
		}

		return Fingerprint(labelsi) < Fingerprint(labelsj)
	})
}
