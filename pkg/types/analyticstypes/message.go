package analyticstypes

import (
	"strings"

	segment "github.com/segmentio/analytics-go/v3"
)

const (
	KeyGroupID string = "groupId"
)

type Message = segment.Message
type Group = segment.Group
type Identify = segment.Identify
type Track = segment.Track
type Traits = segment.Traits
type Properties = segment.Properties
type Context = segment.Context

func NewTraits() Traits {
	return segment.NewTraits()
}

func NewProperties() Properties {
	return segment.NewProperties()
}

func NewPropertiesFromMap(m map[string]any) Properties {
	properties := NewProperties()
	for k, v := range m {
		properties.Set(strings.ReplaceAll(k, ".", "_"), v)
	}

	return properties
}

func NewTraitsFromMap(m map[string]any) Traits {
	traits := NewTraits()
	for k, v := range m {
		traits.Set(strings.ReplaceAll(k, ".", "_"), v)
	}

	return traits
}
