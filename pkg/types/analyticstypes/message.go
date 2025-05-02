package analyticstypes

import (
	segment "github.com/segmentio/analytics-go/v3"
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
