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

// Code in this file is adopted from the following files:
// * vendor/github.com/prometheus/common/model/fnv.go
// * vendor/github.com/prometheus/common/model/signature.go
// Original license below:

// Copyright 2015 The Prometheus Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package timeseries

import (
	"github.com/prometheus/prometheus/prompb"
)

const (
	offset64      uint64 = 14695981039346656037
	prime64       uint64 = 1099511628211
	separatorByte byte   = 255
)

// hashAdd adds a string to a fnv64a hash value, returning the updated hash.
func hashAdd(h uint64, s string) uint64 {
	for i := 0; i < len(s); i++ {
		h ^= uint64(s[i])
		h *= prime64
	}
	return h
}

// hashAddByte adds a byte to a fnv64a hash value, returning the updated hash.
func hashAddByte(h uint64, b byte) uint64 {
	h ^= uint64(b)
	h *= prime64
	return h
}

// Fingerprint calculates a fingerprint of SORTED BY NAME labels.
// It is adopted from labelSetToFingerprint, but avoids type conversions and memory allocations.
func Fingerprint(labels []*prompb.Label) uint64 {
	if len(labels) == 0 {
		return offset64
	}

	sum := offset64
	for _, l := range labels {
		sum = hashAdd(sum, l.Name)
		sum = hashAddByte(sum, separatorByte)
		sum = hashAdd(sum, l.Value)
		sum = hashAddByte(sum, separatorByte)
	}
	return sum
}
