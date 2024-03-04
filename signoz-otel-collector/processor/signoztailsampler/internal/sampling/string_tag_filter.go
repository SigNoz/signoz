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

package sampling // import "github.com/SigNoz/signoz-otel-collector/processor/internal/sampling"

import (
	"regexp"

	"github.com/golang/groupcache/lru"
	"go.opentelemetry.io/collector/pdata/pcommon"
	"go.opentelemetry.io/collector/pdata/ptrace"
	"go.uber.org/zap"
)

const defaultCacheSize = 128

type stringAttributeFilter struct {
	key    string
	logger *zap.Logger
	// matcher defines the func to match the attribute values in strict string
	// or in regular expression
	matcher     func(string) bool
	invertMatch bool
}

type regexStrSetting struct {
	matchedAttrs *lru.Cache
	filterList   []*regexp.Regexp
}

var _ PolicyEvaluator = (*stringAttributeFilter)(nil)

// NewStringAttributeFilter creates a policy evaluator that samples all traces with
// the given attribute in the given numeric range.
func NewStringAttributeFilter(logger *zap.Logger, key string, values []string, regexMatchEnabled bool, evictSize int, invertMatch bool) PolicyEvaluator {
	// initialize regex filter rules and LRU cache for matched results
	if regexMatchEnabled {
		if evictSize <= 0 {
			evictSize = defaultCacheSize
		}
		filterList := addFilters(values)
		regexStrSetting := &regexStrSetting{
			matchedAttrs: lru.New(evictSize),
			filterList:   filterList,
		}

		return &stringAttributeFilter{
			key:    key,
			logger: logger,
			// matcher returns true if the given string matches the regex rules defined in string attribute filters
			matcher: func(toMatch string) bool {
				if v, ok := regexStrSetting.matchedAttrs.Get(toMatch); ok {
					return v.(bool)
				}

				for _, r := range regexStrSetting.filterList {
					if r.MatchString(toMatch) {
						regexStrSetting.matchedAttrs.Add(toMatch, true)
						return true
					}
				}

				regexStrSetting.matchedAttrs.Add(toMatch, false)
				return false
			},
			invertMatch: invertMatch,
		}
	}

	// initialize the exact value map
	valuesMap := make(map[string]struct{})
	for _, value := range values {
		if value != "" {
			valuesMap[value] = struct{}{}
		}
	}
	return &stringAttributeFilter{
		key:    key,
		logger: logger,
		// matcher returns true if the given string matches any of the string attribute filters
		matcher: func(toMatch string) bool {
			_, matched := valuesMap[toMatch]
			return matched
		},
		invertMatch: invertMatch,
	}
}

// Evaluate looks at the trace data and returns a corresponding SamplingDecision.
// The SamplingDecision is made by comparing the attribute values with the matching values,
// which might be static strings or regular expressions.
func (saf *stringAttributeFilter) Evaluate(_ pcommon.TraceID, trace *TraceData) (Decision, error) {
	saf.logger.Debug("Evaluting spans in string-tag filter")
	trace.Lock()
	batches := trace.ReceivedBatches
	trace.Unlock()

	if saf.invertMatch {
		// Invert Match returns true by default, except when key and value are matched
		return invertHasResourceOrSpanWithCondition(
			batches,
			func(resource pcommon.Resource) bool {
				if v, ok := resource.Attributes().Get(saf.key); ok {
					if ok := saf.matcher(v.Str()); ok {
						return false
					}
				}
				return true
			},
			func(span ptrace.Span) bool {
				if v, ok := span.Attributes().Get(saf.key); ok {
					truncableStr := v.Str()
					if len(truncableStr) > 0 {
						if ok := saf.matcher(v.Str()); ok {
							return false
						}
					}
				}
				return true
			},
		), nil
	}

	return hasResourceOrSpanWithCondition(
		batches,
		func(resource pcommon.Resource) bool {
			if v, ok := resource.Attributes().Get(saf.key); ok {
				if ok := saf.matcher(v.Str()); ok {
					return true
				}
			}
			return false
		},
		func(span ptrace.Span) bool {
			if v, ok := span.Attributes().Get(saf.key); ok {
				truncableStr := v.Str()
				if len(truncableStr) > 0 {
					if ok := saf.matcher(v.Str()); ok {
						return true
					}
				}
			}
			return false
		},
	), nil
}

// addFilters compiles all the given filters and stores them as regexes.
// All regexes are automatically anchored to enforce full string matches.
func addFilters(exprs []string) []*regexp.Regexp {
	list := make([]*regexp.Regexp, 0, len(exprs))
	for _, entry := range exprs {
		rule := regexp.MustCompile(entry)
		list = append(list, rule)
	}
	return list
}
