package telemetrytypes

import "strings"

// LogicalField is one queryable field. Its Name is the spelling that the
// request used. Its Members are the physical keys that store the field.
// LogicalField is the output type of name resolution: resolution changes a
// referenced name into logical fields, and compilers make SQL from them.
//
// A []*LogicalField shows ambiguity. Ambiguity means that possibly different
// fields have the same name. Each logical field in the slice gets its own
// condition. The operator tells the compiler how to connect the conditions.
//
// One LogicalField with more than one member shows a semantic-convention
// family. A family is one field that has more than one spelling. The members
// are in current-first order. The compiler merges the members into one
// expression, and the current name wins.
//
// Members always has one entry or more. A field that is not a family has
// exactly one member. The members point to the metadata map entries. Do not
// change the members.
type LogicalField struct {
	// Name is the spelling that the request used. Aliases, series labels,
	// and warnings use this spelling. Because of this, the response shows
	// the same spelling as the request.
	Name string

	// Signal, FieldContext, and FieldDataType are the identity that all
	// members share. Members with a different signal, field context, or
	// data type are parts of different logical fields.
	Signal        Signal
	FieldContext  FieldContext
	FieldDataType FieldDataType

	// Members are the physical keys that store this field, in current-first
	// order. Each member has its own physical data (Materialized,
	// Evolutions, JSONPlan, ...). A per-member accessor does not need data
	// from the other members. The members are shared metadata keys and are
	// never changed here.
	Members []*TelemetryFieldKey

	// ValueMaps is index-aligned with Members: the map that brings a
	// member's stored values into the current member's vocabulary, nil
	// when the vocabularies are the same. Resolution sets it on this
	// wrapper; the reads apply it.
	ValueMaps []*ValueMap
}

// ValueMap translates the values one family member stores into the current
// member's vocabulary. Stored and Current are index-aligned, and several
// stored values can map to one current value. A map never holds a sentinel
// (an empty string, 0, false) on either side: a translated sentinel would
// turn absent rows into values, so the generator rejects it. Three readers
// apply it: the family folds in querybuilder, a storage's own Compile, and
// the metadata values suggestions, which read members outside Compile and
// carry the same obligation.
type ValueMap struct {
	Stored  []string
	Current []string
}

// StoredValues returns the values a member stores for one current value:
// the value itself when no map covers it.
func (m *ValueMap) StoredValues(current string) []string {
	if m == nil {
		return []string{current}
	}
	var stored []string
	for i, c := range m.Current {
		if c == current {
			stored = append(stored, m.Stored[i])
		}
	}
	if len(stored) == 0 {
		return []string{current}
	}
	return stored
}

// SingleLogicalField makes a logical field that has one physical key.
func SingleLogicalField(name string, key *TelemetryFieldKey) *LogicalField {
	return &LogicalField{
		Name:          name,
		Signal:        key.Signal,
		FieldContext:  key.FieldContext,
		FieldDataType: key.FieldDataType,
		Members:       []*TelemetryFieldKey{key},
	}
}

// Single returns the only member of a single-member field. A decision that
// uses only the shared identity can also use Single on a family. This is
// safe because all members have the same signal, context, and data type.
func (l *LogicalField) Single() *TelemetryFieldKey {
	return l.Members[0]
}

// IsFamily returns true when the field has more than one physical member.
func (l *LogicalField) IsFamily() bool {
	return len(l.Members) > 1
}

// String implements fmt.Stringer. A single-member field prints as its
// member. Because of this, a message made from the field and a message made
// from the key are the same. A family prints its shared identity and its
// member spellings.
func (l *LogicalField) String() string {
	if len(l.Members) == 1 {
		return l.Members[0].String()
	}
	names := make([]string, 0, len(l.Members))
	for _, member := range l.Members {
		names = append(names, member.Name)
	}
	return l.Name + "(" + l.FieldContext.StringValue() + ", " + l.FieldDataType.StringValue() + ", members: " + strings.Join(names, ", ") + ")"
}
