package telemetrytypes

// LogicalField is resolution output: one queryable field, addressed by the
// spelling the request used, backed by the physical member keys that store it.
//
// The resolver expresses ambiguity ("possibly different fields sharing a
// name") as a []*LogicalField — never inside one LogicalField. Within one
// LogicalField, members are alternate physical spellings of the same field
// (a semantic-convention family), ordered current-first; compilers merge
// them into one expression with current-wins precedence. Across the slice,
// compilers build one condition per LogicalField and combine per the
// operator, exactly as they previously combined ambiguous keys.
//
// Members always has at least one entry. A non-family field has exactly
// one. Members alias the metadata map entries and must not be mutated.
type LogicalField struct {
	// Name is the requested spelling. It is the response identity: aliases,
	// series labels, and warnings use it, so responses echo the request.
	Name string

	// The physical identity every member shares. Members with a different
	// signal, field context, or data type belong to different logical
	// fields by definition.
	Signal        Signal
	FieldContext  FieldContext
	FieldDataType FieldDataType

	// Members are the physical keys that store this field, ordered
	// current-first. Each member carries its own physical facts
	// (Materialized, Evolutions, JSONPlan, ...), so per-member accessors
	// need no sibling information.
	Members []*TelemetryFieldKey
}

// SingleLogicalField wraps one physical key as its own logical field.
func SingleLogicalField(name string, key *TelemetryFieldKey) *LogicalField {
	return &LogicalField{
		Name:          name,
		Signal:        key.Signal,
		FieldContext:  key.FieldContext,
		FieldDataType: key.FieldDataType,
		Members:       []*TelemetryFieldKey{key},
	}
}

// Single returns the only member. It is the accessor for signals whose
// logical fields are always single-member (everything except traces today).
func (l *LogicalField) Single() *TelemetryFieldKey {
	return l.Members[0]
}

// IsFamily reports whether the field has more than one physical member.
func (l *LogicalField) IsFamily() bool {
	return len(l.Members) > 1
}

// String implements fmt.Stringer for warning messages.
func (l *LogicalField) String() string {
	if len(l.Members) == 1 {
		return l.Members[0].String()
	}
	names := make([]string, 0, len(l.Members))
	for _, member := range l.Members {
		names = append(names, member.Name)
	}
	return l.Name + "(" + l.FieldContext.StringValue() + ", " + l.FieldDataType.StringValue() + ", members: " + joinNames(names) + ")"
}

func joinNames(names []string) string {
	out := ""
	for i, name := range names {
		if i > 0 {
			out += ", "
		}
		out += name
	}
	return out
}
