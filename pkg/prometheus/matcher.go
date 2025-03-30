package prometheus

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/prometheus/prometheus/prompb"
)

var (
	_ fmt.Stringer = MatchType(0)
	_ fmt.Stringer = Matcher{}
	_ fmt.Stringer = Matchers{}
)

type MatchType int

const (
	MatchEqual MatchType = iota
	MatchNotEqual
	MatchRegexp
	MatchNotRegexp
)

func (m MatchType) String() string {
	switch m {
	case MatchEqual:
		return "="
	case MatchNotEqual:
		return "!="
	case MatchRegexp:
		return "=~"
	case MatchNotRegexp:
		return "!~"
	default:
		panic("unknown match type")
	}
}

type Matcher struct {
	Name  string
	Type  MatchType
	Value string
	re    *regexp.Regexp
}

func (m Matcher) String() string {
	return fmt.Sprintf("%s%s%q", m.Name, m.Type, m.Value)
}

type Matchers []Matcher

var emptyLabel = &prompb.Label{}

func (ms Matchers) String() string {
	res := make([]string, len(ms))
	for i, m := range ms {
		res[i] = m.String()
	}
	return "{" + strings.Join(res, ",") + "}"
}

func (ms Matchers) MatchLabels(labels []*prompb.Label) bool {
	for _, m := range ms {
		if (m.re == nil) && (m.Type == MatchRegexp || m.Type == MatchNotRegexp) {
			m.re = regexp.MustCompile("^(?:" + m.Value + ")$")
		}

		label := emptyLabel
		for _, l := range labels {
			if m.Name == l.Name {
				label = l
				break
			}
		}

		// return false if not matches, continue to the next matcher otherwise
		switch m.Type {
		case MatchEqual:
			if m.Value != label.Value {
				return false
			}
		case MatchNotEqual:
			if m.Value == label.Value {
				return false
			}
		case MatchRegexp:
			if !m.re.MatchString(label.Value) {
				return false
			}
		case MatchNotRegexp:
			if m.re.MatchString(label.Value) {
				return false
			}
		default:
			panic("unknown match type")
		}
	}

	return true
}
