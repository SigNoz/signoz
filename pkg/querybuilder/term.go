package querybuilder

import (
	"context"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/huandu/go-sqlbuilder"
)

// TermSchema is the per-signal surface of the generic term compiler. The
// methods answer what exists and how one resolved field compiles; the flow —
// evidence, synthesis, the resource-filter policy, the per-field loop — is
// CompileTerm and is written once. A signal implements exactly three
// methods; term-level intercepts (search(), function rejects) stay in the
// signal's ConditionFor delegate, in front of the flow.
type TermSchema interface {
	// AmendEvidence folds intrinsic storage into non-empty resolved evidence
	// (traces prepends the span column for a bare name). Most signals return
	// the fields unchanged.
	AmendEvidence(ctx context.Context, scope CompileScope, key *telemetrytypes.TelemetryFieldKey, fields []*telemetrytypes.LogicalField) []*telemetrytypes.LogicalField

	// Synthesize returns the logical fields for a name resolution found no
	// evidence for, with any warnings (not-found advisories). The error is
	// terminal (unknown key). A (nil, nil, nil) return skips the term: the
	// signal contributes no condition for the name (resource filter).
	Synthesize(ctx context.Context, scope CompileScope, key *telemetrytypes.TelemetryFieldKey, operator qbtypes.FilterOperator, value any, fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey) ([]*telemetrytypes.LogicalField, []string, error)

	// CompileField compiles one resolved field into a condition. This is the
	// signal's storage residue — body JSON, index hints, its own operator
	// forms — and the exists-guard policy, which differs per storage.
	// CompileFieldWithSharedOperators is the canonical implementation for
	// map-backed fields.
	CompileField(ctx context.Context, scope CompileScope, logical *telemetrytypes.LogicalField, operator qbtypes.FilterOperator, value any, sb *sqlbuilder.SelectBuilder) (string, []string, error)
}

// SkipResourcePolicy states how ConditionBuilderOptions.SkipResourceFilter
// applies to a signal's resolved fields.
type SkipResourcePolicy int

const (
	// SkipResourceNone: the option does not apply (metrics, rule state history).
	SkipResourceNone SkipResourcePolicy = iota
	// SkipResourceDrop: a resource sub-query covers resource fields, so drop
	// them from the evidence; when none remain the term is already covered.
	// Synthesized fields are exempt: the sub-query skips unknown keys.
	SkipResourceDrop
	// SkipResourceOnly: the signal stores resource attributes only, so keep
	// resource fields and omit everything else (the resource fingerprint
	// filter).
	SkipResourceOnly
)

// CompileTerm is the generic flow of one filter term: resolve the evidence,
// amend it, synthesize when it is empty, apply the resource-filter policy,
// and compile every field through the signal's CompileField. Warnings keep
// their order: ambiguity first, synthesis advisories second, per-field
// advisories last.
func CompileTerm(
	ctx context.Context,
	scope CompileScope,
	schema TermSchema,
	policy SkipResourcePolicy,
	key *telemetrytypes.TelemetryFieldKey,
	evidence []*telemetrytypes.LogicalField,
	fieldKeys map[string][]*telemetrytypes.TelemetryFieldKey,
	options qbtypes.ConditionBuilderOptions,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
) ([]string, []string, error) {
	fields, warning := ResolveLogicalFields(key, evidence)
	var warnings []string
	if warning != "" {
		warnings = append(warnings, warning)
	}
	fields = schema.AmendEvidence(ctx, scope, key, fields)

	synthesized := false
	if len(fields) == 0 {
		synthesizedFields, synthWarnings, err := schema.Synthesize(ctx, scope, key, operator, value, fieldKeys)
		if err != nil {
			return nil, warnings, err
		}
		warnings = append(warnings, synthWarnings...)
		if len(synthesizedFields) == 0 {
			return nil, warnings, nil
		}
		fields = synthesizedFields
		synthesized = true
	}

	switch policy {
	case SkipResourceDrop:
		if options.SkipResourceFilter && !synthesized {
			filtered := make([]*telemetrytypes.LogicalField, 0, len(fields))
			for _, logical := range fields {
				if logical.FieldContext != telemetrytypes.FieldContextResource {
					filtered = append(filtered, logical)
				}
			}
			if len(filtered) == 0 {
				return nil, warnings, nil
			}
			fields = filtered
		}
	case SkipResourceOnly:
		filtered := make([]*telemetrytypes.LogicalField, 0, len(fields))
		for _, logical := range fields {
			if logical.FieldContext == telemetrytypes.FieldContextResource {
				filtered = append(filtered, logical)
			}
		}
		fields = filtered
	}

	conds := make([]string, 0, len(fields))
	for _, logical := range fields {
		cond, fieldWarnings, err := schema.CompileField(ctx, scope, logical, operator, value, sb)
		if err != nil {
			return nil, nil, err
		}
		conds = append(conds, cond)
		warnings = append(warnings, fieldWarnings...)
	}
	return conds, warnings, nil
}

// CompileFieldWithSharedOperators is the canonical CompileField for
// map-backed fields: the shared operator switch over the merged (family) or
// single value expression, with the default exists guard AND-ed for positive
// operators when guard is true. The keyless-row contract lives here: the
// guard keeps an empty-string equality from matching rows without the key,
// and its absence on negative operators keeps them set-complement over all
// rows.
func CompileFieldWithSharedOperators(
	ctx context.Context,
	scope CompileScope,
	fm qbtypes.FieldMapper,
	logical *telemetrytypes.LogicalField,
	operator qbtypes.FilterOperator,
	value any,
	sb *sqlbuilder.SelectBuilder,
	guard bool,
) (string, error) {
	condition, err := LogicalFamilyCondition(ctx, scope.OrgID, scope.StartNs, scope.EndNs, fm, logical, operator, value, sb)
	if err != nil {
		return "", err
	}
	if guard && operator.AddDefaultExistsFilter() {
		existsCondition, err := LogicalFamilyCondition(ctx, scope.OrgID, scope.StartNs, scope.EndNs, fm, logical, qbtypes.FilterOperatorExists, nil, sb)
		if err != nil {
			return "", err
		}
		return sb.And(condition, existsCondition), nil
	}
	return condition, nil
}
