package main

import (
	"bytes"
	"errors"
	"flag"
	"fmt"
	"go/format"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"gopkg.in/yaml.v3"
)

const (
	kindAttribute = "attribute"
	kindMetric    = "metric"
)

type stringListFlag []string

func (f *stringListFlag) String() string { return strings.Join(*f, ",") }
func (f *stringListFlag) Set(value string) error {
	*f = append(*f, value)
	return nil
}

type schemaFile struct {
	FileFormat string                   `yaml:"file_format"`
	SchemaURL  string                   `yaml:"schema_url"`
	Versions   map[string]schemaVersion `yaml:"versions"`
}

type schemaVersion struct {
	All       changeSection `yaml:"all"`
	Resources changeSection `yaml:"resources"`
	Spans     changeSection `yaml:"spans"`
	Logs      changeSection `yaml:"logs"`
	Metrics   changeSection `yaml:"metrics"`
}

type changeSection struct {
	Changes []schemaChange `yaml:"changes"`
}

type schemaChange struct {
	RenameAttributes *attributeRename  `yaml:"rename_attributes"`
	RenameMetrics    map[string]string `yaml:"rename_metrics"`
}

type attributeRename struct {
	AttributeMap   map[string]string `yaml:"attribute_map"`
	ApplyToMetrics []string          `yaml:"apply_to_metrics"`
}

type overlayFile struct {
	DefaultEnabled bool `yaml:"default_enabled"`
	// Families is keyed only by current name. One name cannot carry separate
	// policies for attribute and metric families; set kind explicitly whenever
	// a metric-name family is configured.
	Families map[string]overlayFamily `yaml:"families"`
}

// Contexts and Signals set the family-level gate: the axes a family may
// resolve on at all. The Add* fields widen the schema-derived member scopes,
// for renames SigNoz applies beyond where the schema published them.
type overlayFamily struct {
	Enabled           *bool             `yaml:"enabled"`
	Kind              string            `yaml:"kind"`
	Old               []string          `yaml:"old"`
	AddOld            []string          `yaml:"add_old"`
	ExcludeOld        []string          `yaml:"exclude_old"`
	Contexts          []string          `yaml:"contexts"`
	Signals           []string          `yaml:"signals"`
	AddContexts       []string          `yaml:"add_contexts"`
	AddSignals        []string          `yaml:"add_signals"`
	ApplyToMetrics    []string          `yaml:"apply_to_metrics"`
	AddApplyToMetrics []string          `yaml:"add_apply_to_metrics"`
	ValueMap          map[string]string `yaml:"value_map"`
}

// scope is the constraint a rename edge carries. A nil axis places no
// constraint on that axis.
type scope struct {
	contexts       []string
	signals        []string
	applyToMetrics []string
}

type edge struct {
	old     string
	current string
	kind    string
	scope   scope
}

type graphKey struct{ kind, name string }

type generatedMember struct {
	Name           string
	Contexts       []string
	Signals        []string
	ApplyToMetrics []string
}

type generatedFamily struct {
	Current  string
	Kind     string
	Members  []generatedMember
	Contexts []string
	Signals  []string
	ValueMap map[string]string
}

func main() {
	root, err := findRepoRoot()
	if err != nil {
		fatal(err)
	}

	var schemaPaths stringListFlag
	flag.Var(&schemaPaths, "schema", "schema source (repeatable)")
	overlayPath := flag.String("overlay", filepath.Join(root, "scripts/semconv/overlay.yaml"), "SigNoz overlay")
	goOutput := flag.String("go-out", filepath.Join(root, "pkg/semconv/families_gen.go"), "generated Go output")
	tsOutput := flag.String("ts-out", filepath.Join(root, "frontend/src/constants/generated/semconvFamilies.gen.ts"), "generated TypeScript output")
	check := flag.Bool("check", false, "fail if generated files are stale")
	flag.Parse()

	if len(schemaPaths) == 0 {
		schemaPaths = append(schemaPaths, filepath.Join(root, "scripts/semconv/schema-1.42.0.yaml"))
	}

	families, err := generate(schemaPaths, *overlayPath)
	if err != nil {
		fatal(err)
	}
	goBytes, err := renderGo(families)
	if err != nil {
		fatal(err)
	}
	tsBytes := renderTypeScript(families)

	if *check {
		if err := checkFile(*goOutput, goBytes); err != nil {
			fatal(err)
		}
		if err := checkFile(*tsOutput, tsBytes); err != nil {
			fatal(err)
		}
		return
	}

	if err := os.WriteFile(*goOutput, goBytes, 0o644); err != nil {
		fatal(err)
	}
	if err := os.WriteFile(*tsOutput, tsBytes, 0o644); err != nil {
		fatal(err)
	}
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}

func findRepoRoot() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", errors.New("could not find repository root")
		}
		dir = parent
	}
}

func generate(schemaPaths []string, overlayPath string) ([]generatedFamily, error) {
	var schemas []schemaFile
	for _, path := range schemaPaths {
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("read schema %s: %w", path, err)
		}
		var schema schemaFile
		if err := decodeKnownFields(data, &schema); err != nil {
			return nil, fmt.Errorf("parse schema %s: %w", path, err)
		}
		schemas = append(schemas, schema)
	}

	overlayData, err := os.ReadFile(overlayPath)
	if err != nil {
		return nil, fmt.Errorf("read overlay: %w", err)
	}
	var overlay overlayFile
	if err := decodeKnownFields(overlayData, &overlay); err != nil {
		return nil, fmt.Errorf("parse overlay: %w", err)
	}

	return buildFamilies(schemas, overlay)
}

func decodeKnownFields(data []byte, target any) error {
	decoder := yaml.NewDecoder(bytes.NewReader(data))
	decoder.KnownFields(true)
	return decoder.Decode(target)
}

func collectEdges(schemas []schemaFile) ([]edge, error) {
	var edges []edge
	for _, schema := range schemas {
		versions := make([]string, 0, len(schema.Versions))
		versionParts := make(map[string][3]int, len(schema.Versions))
		for version := range schema.Versions {
			parts, err := parseSchemaVersion(version)
			if err != nil {
				return nil, err
			}
			versions = append(versions, version)
			versionParts[version] = parts
		}
		sort.Slice(versions, func(i, j int) bool {
			return compareVersionParts(versionParts[versions[i]], versionParts[versions[j]]) < 0
		})
		for _, versionName := range versions {
			version := schema.Versions[versionName]
			var versionEdges []edge
			sections := []struct {
				name    string
				section changeSection
			}{
				{name: "all", section: version.All},
				{name: "resources", section: version.Resources},
				{name: "spans", section: version.Spans},
				{name: "logs", section: version.Logs},
				{name: "metrics", section: version.Metrics},
			}
			for _, scoped := range sections {
				sectionScope, err := scopeForSection(scoped.name)
				if err != nil {
					return nil, err
				}
				for _, change := range scoped.section.Changes {
					if change.RenameAttributes != nil {
						if change.RenameAttributes.ApplyToMetrics != nil && len(change.RenameAttributes.ApplyToMetrics) == 0 {
							return nil, fmt.Errorf(
								"schema version %q has an explicitly empty apply_to_metrics; an empty list would be emitted as unconstrained",
								versionName,
							)
						}
						edgeScope := sectionScope
						edgeScope.applyToMetrics = change.RenameAttributes.ApplyToMetrics
						for _, old := range sortedMapKeys(change.RenameAttributes.AttributeMap) {
							versionEdges = append(versionEdges, edge{
								old: old, current: change.RenameAttributes.AttributeMap[old], kind: kindAttribute,
								scope: edgeScope,
							})
						}
					}
					for _, old := range sortedMapKeys(change.RenameMetrics) {
						versionEdges = append(versionEdges, edge{
							old: old, current: change.RenameMetrics[old], kind: kindMetric,
							scope: scope{contexts: []string{"metric"}, signals: []string{"metrics"}},
						})
					}
				}
			}
			if err := rejectSameVersionChains(versionName, versionEdges); err != nil {
				return nil, err
			}
			edges = append(edges, versionEdges...)
		}
	}
	return edges, nil
}

func rejectSameVersionChains(version string, edges []edge) error {
	oldNames := make(map[graphKey]struct{}, len(edges))
	for _, item := range edges {
		oldNames[graphKey{kind: item.kind, name: item.old}] = struct{}{}
	}
	for _, item := range edges {
		if _, ok := oldNames[graphKey{kind: item.kind, name: item.current}]; ok {
			return fmt.Errorf(
				"schema version %q contains a same-version %s rename chain through %q",
				version,
				item.kind,
				item.current,
			)
		}
	}
	return nil
}

func parseSchemaVersion(version string) ([3]int, error) {
	parts := strings.Split(version, ".")
	if len(parts) != 3 {
		return [3]int{}, fmt.Errorf("schema version %q must contain major, minor, and patch numbers", version)
	}

	var parsed [3]int
	for i, part := range parts {
		value, err := strconv.Atoi(part)
		if err != nil || value < 0 {
			return [3]int{}, fmt.Errorf("schema version %q contains invalid numeric component %q", version, part)
		}
		parsed[i] = value
	}
	return parsed, nil
}

func compareVersionParts(left, right [3]int) int {
	for i := range left {
		if left[i] < right[i] {
			return -1
		}
		if left[i] > right[i] {
			return 1
		}
	}
	return 0
}

func scopeForSection(section string) (scope, error) {
	switch section {
	case "all":
		return scope{}, nil
	case "resources":
		return scope{contexts: []string{"resource"}}, nil
	case "spans":
		return scope{contexts: []string{"attribute"}, signals: []string{"traces"}}, nil
	case "logs":
		return scope{contexts: []string{"attribute"}, signals: []string{"logs"}}, nil
	case "metrics":
		return scope{contexts: []string{"attribute"}, signals: []string{"metrics"}}, nil
	default:
		return scope{}, fmt.Errorf("unsupported schema section %q", section)
	}
}

// unionScope widens per axis: no constraint on either side widens to no
// constraint. The metric-name axis only takes evidence from edges that can
// apply to metrics — a rename filed under a non-metrics section says nothing
// about metric scoping and must not erase a scoped list into a wildcard.
func unionScope(left, right scope) scope {
	return scope{
		contexts:       unionAxis(left.contexts, right.contexts),
		signals:        unionAxis(left.signals, right.signals),
		applyToMetrics: applyToMetricsUnion(left, right),
	}
}

func applyToMetricsUnion(left, right scope) []string {
	leftApplies := coversMetrics(left.signals)
	rightApplies := coversMetrics(right.signals)
	switch {
	case leftApplies && rightApplies:
		return unionAxis(left.applyToMetrics, right.applyToMetrics)
	case leftApplies:
		return sortedCopy(left.applyToMetrics)
	case rightApplies:
		return sortedCopy(right.applyToMetrics)
	}
	return nil
}

func coversMetrics(signals []string) bool {
	if signals == nil {
		return true
	}
	for _, signal := range signals {
		if signal == "metrics" {
			return true
		}
	}
	return false
}

func unionAxis(left, right []string) []string {
	if left == nil || right == nil {
		return nil
	}
	merged := appendUnique(append([]string(nil), left...), right...)
	sort.Strings(merged)
	return merged
}

// pathResult is one resolution path from a name to a family root: the root
// name and the hop count. Hops carry only reachability — a member's scope
// comes from its own rename edges, because the section a later rename is
// filed under says nothing about where the older spelling existed (the
// vendored schema files chained renames under different sections).
type pathResult struct {
	root     string
	distance int
}

func rootsFor(next map[graphKey][]edge, kind, name string, distance int, seen map[string]bool) ([]pathResult, error) {
	if seen[name] {
		return nil, fmt.Errorf("rename cycle for %s %q", kind, name)
	}
	outgoing := next[graphKey{kind: kind, name: name}]
	if len(outgoing) == 0 {
		return []pathResult{{root: name, distance: distance}}, nil
	}
	seen[name] = true
	defer delete(seen, name)

	var results []pathResult
	for _, hop := range outgoing {
		hopResults, err := rootsFor(next, kind, hop.current, distance+1, seen)
		if err != nil {
			return nil, err
		}
		results = append(results, hopResults...)
	}
	return results, nil
}

func buildFamilies(schemas []schemaFile, overlay overlayFile) ([]generatedFamily, error) {
	edges, err := collectEdges(schemas)
	if err != nil {
		return nil, err
	}
	// One old name can fan out into several families when its rename edges are
	// scoped differently, so the graph keeps every successor.
	next := make(map[graphKey][]edge)
	for _, item := range edges {
		key := graphKey{kind: item.kind, name: item.old}
		merged := false
		for i, existing := range next[key] {
			if existing.current == item.current {
				// Repeated entries are common in chained schema histories. Merge
				// the scopes instead of appending so a repeat cannot sever a
				// later edge in the same chain (A -> B, B -> C, then a repeated
				// A -> B).
				next[key][i].scope = unionScope(existing.scope, item.scope)
				merged = true
				break
			}
		}
		if merged {
			continue
		}
		// Schema history occasionally repeats an old name with a newer direct
		// destination or rolls a rename back. Edges are collected
		// oldest-to-newest, so the latest published current name must be a
		// root. The delete removes every outgoing edge of the re-published
		// name: a family only reachable through it becomes orphaned. The
		// vendored history contains only true rollbacks, where the orphan is
		// the correct result.
		delete(next, graphKey{kind: item.kind, name: item.current})
		next[key] = append(next[key], item)
	}

	type memberState struct {
		sc       scope
		distance int
	}
	type familyState struct {
		family  generatedFamily
		members map[string]*memberState
	}
	states := map[graphKey]*familyState{}
	for key, outgoing := range next {
		for _, item := range outgoing {
			results, err := rootsFor(next, key.kind, item.current, 1, map[string]bool{key.name: true})
			if err != nil {
				return nil, err
			}
			for _, result := range results {
				rootKey := graphKey{kind: key.kind, name: result.root}
				state := states[rootKey]
				if state == nil {
					state = &familyState{
						family:  generatedFamily{Current: result.root, Kind: key.kind},
						members: map[string]*memberState{},
					}
					states[rootKey] = state
				}
				member := state.members[key.name]
				if member == nil {
					state.members[key.name] = &memberState{sc: item.scope, distance: result.distance}
					continue
				}
				member.sc = unionScope(member.sc, item.scope)
				if result.distance < member.distance {
					member.distance = result.distance
				}
			}
		}
	}

	for _, state := range states {
		names := make([]string, 0, len(state.members))
		for name := range state.members {
			names = append(names, name)
		}
		sort.Slice(names, func(i, j int) bool {
			left, right := state.members[names[i]], state.members[names[j]]
			if left.distance != right.distance {
				return left.distance < right.distance
			}
			return names[i] < names[j]
		})
		for _, name := range names {
			member := state.members[name]
			state.family.Members = append(state.family.Members, generatedMember{
				Name:           name,
				Contexts:       sortedCopy(member.sc.contexts),
				Signals:        sortedCopy(member.sc.signals),
				ApplyToMetrics: sortedCopy(member.sc.applyToMetrics),
			})
		}
	}

	for _, current := range sortedMapKeys(overlay.Families) {
		policy := overlay.Families[current]
		kind, err := normalizedOverlayKind(current, policy)
		if err != nil {
			return nil, err
		}
		policy.Kind = kind
		overlay.Families[current] = policy
		if policy.ApplyToMetrics != nil && len(policy.ApplyToMetrics) == 0 {
			return nil, fmt.Errorf(
				"overlay family %q has an explicitly empty apply_to_metrics; an empty list would be emitted as unconstrained",
				current,
			)
		}
		key := graphKey{kind: kind, name: current}
		state := states[key]
		if state == nil {
			if len(policy.Old) == 0 {
				return nil, fmt.Errorf(
					"overlay family %q with kind %q is absent from schemas and has no old members",
					current,
					kind,
				)
			}
			state = &familyState{family: generatedFamily{Current: current, Kind: kind}}
			states[key] = state
		}
		applyOverlay(&state.family, policy)
	}

	var result []generatedFamily
	for key, state := range states {
		policy, hasPolicy := overlay.Families[key.name]
		enabled := overlay.DefaultEnabled
		if hasPolicy && policy.Kind != key.kind {
			hasPolicy = false
		}
		if hasPolicy && policy.Enabled != nil {
			enabled = *policy.Enabled
		}
		if !enabled {
			continue
		}
		if len(state.family.Members) == 0 {
			return nil, fmt.Errorf(
				"enabled family %q with kind %q has no old members",
				state.family.Current,
				state.family.Kind,
			)
		}
		sort.Strings(state.family.Contexts)
		sort.Strings(state.family.Signals)
		result = append(result, state.family)
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].Current != result[j].Current {
			return result[i].Current < result[j].Current
		}
		return result[i].Kind < result[j].Kind
	})
	return result, nil
}

func sortedCopy(values []string) []string {
	if values == nil {
		return nil
	}
	out := append([]string(nil), values...)
	sort.Strings(out)
	return out
}

func normalizedOverlayKind(current string, policy overlayFamily) (string, error) {
	kind := policy.Kind
	if kind == "" {
		kind = kindAttribute
	}
	if kind != kindAttribute && kind != kindMetric {
		return "", fmt.Errorf("overlay family %q has unsupported kind %q", current, kind)
	}
	return kind, nil
}

func applyOverlay(family *generatedFamily, policy overlayFamily) {
	if policy.Kind != "" {
		family.Kind = policy.Kind
	}
	if policy.Old != nil {
		family.Members = nil
		for _, old := range policy.Old {
			family.Members = append(family.Members, generatedMember{Name: old})
		}
	}
	for _, old := range policy.AddOld {
		if familyHasMember(family, old) {
			continue
		}
		family.Members = append(family.Members, generatedMember{Name: old})
	}
	if len(policy.ExcludeOld) > 0 {
		excluded := make(map[string]bool, len(policy.ExcludeOld))
		for _, old := range policy.ExcludeOld {
			excluded[old] = true
		}
		kept := family.Members[:0]
		for _, member := range family.Members {
			if !excluded[member.Name] {
				kept = append(kept, member)
			}
		}
		family.Members = kept
	}
	if policy.Contexts != nil {
		family.Contexts = append([]string(nil), policy.Contexts...)
	}
	if policy.Signals != nil {
		family.Signals = append([]string(nil), policy.Signals...)
	}
	// Add* fields only widen: a nil gate already admits everything, so they
	// extend a gate only when the overlay set one.
	if family.Contexts != nil {
		family.Contexts = appendUnique(family.Contexts, policy.AddContexts...)
	}
	if family.Signals != nil {
		family.Signals = appendUnique(family.Signals, policy.AddSignals...)
	}
	for i := range family.Members {
		if len(policy.AddContexts) > 0 {
			family.Members[i].Contexts = unionAxis(family.Members[i].Contexts, sortedCopy(policy.AddContexts))
		}
		if len(policy.AddSignals) > 0 {
			family.Members[i].Signals = unionAxis(family.Members[i].Signals, sortedCopy(policy.AddSignals))
		}
		if policy.ApplyToMetrics != nil {
			family.Members[i].ApplyToMetrics = sortedCopy(policy.ApplyToMetrics)
		}
		if len(policy.AddApplyToMetrics) > 0 && family.Members[i].ApplyToMetrics != nil {
			family.Members[i].ApplyToMetrics = unionAxis(family.Members[i].ApplyToMetrics, sortedCopy(policy.AddApplyToMetrics))
		}
	}
	if policy.ValueMap != nil {
		family.ValueMap = make(map[string]string, len(policy.ValueMap))
		for old, current := range policy.ValueMap {
			family.ValueMap[old] = current
		}
	}
}

func familyHasMember(family *generatedFamily, name string) bool {
	for _, member := range family.Members {
		if member.Name == name {
			return true
		}
	}
	return false
}

func appendUnique(values []string, additions ...string) []string {
	seen := make(map[string]bool, len(values)+len(additions))
	for _, value := range values {
		seen[value] = true
	}
	for _, value := range additions {
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		values = append(values, value)
	}
	return values
}

func renderGo(families []generatedFamily) ([]byte, error) {
	var out bytes.Buffer
	out.WriteString("// Code generated by scripts/semconv. DO NOT EDIT.\n\n")
	out.WriteString("package semconv\n\n")
	needsTelemetryTypes := false
	for _, family := range families {
		if len(family.Contexts) > 0 || len(family.Signals) > 0 {
			needsTelemetryTypes = true
		}
		for _, member := range family.Members {
			if len(member.Contexts) > 0 || len(member.Signals) > 0 {
				needsTelemetryTypes = true
			}
		}
	}
	if needsTelemetryTypes {
		out.WriteString("import \"github.com/SigNoz/signoz/pkg/types/telemetrytypes\"\n\n")
	}
	out.WriteString("var families = []Family{\n")
	for _, family := range families {
		out.WriteString("\t{\n")
		fmt.Fprintf(&out, "\t\tcurrent: %s,\n", strconv.Quote(family.Current))
		if family.Kind == kindMetric {
			out.WriteString("\t\tkind: KindMetric,\n")
		} else {
			out.WriteString("\t\tkind: KindAttribute,\n")
		}
		out.WriteString("\t\tmembers: []Member{\n")
		for _, member := range family.Members {
			if err := writeGoMember(&out, family.Current, member); err != nil {
				return nil, err
			}
		}
		out.WriteString("\t\t},\n")
		if len(family.Contexts) > 0 {
			contexts, err := goFieldContextSlice(family.Contexts)
			if err != nil {
				return nil, fmt.Errorf("render family %q: %w", family.Current, err)
			}
			fmt.Fprintf(&out, "\t\tcontexts: %s,\n", contexts)
		}
		if len(family.Signals) > 0 {
			signals, err := goSignalSlice(family.Signals)
			if err != nil {
				return nil, fmt.Errorf("render family %q: %w", family.Current, err)
			}
			fmt.Fprintf(&out, "\t\tsignals: %s,\n", signals)
		}
		if len(family.ValueMap) > 0 {
			return nil, fmt.Errorf("family %q carries a value map, and the Go registry has no value-map reader yet", family.Current)
		}
		out.WriteString("\t},\n")
	}
	out.WriteString("}\n")
	return format.Source(out.Bytes())
}

func writeGoMember(out *bytes.Buffer, current string, member generatedMember) error {
	parts := []string{fmt.Sprintf("name: %s", strconv.Quote(member.Name))}
	if len(member.Contexts) > 0 {
		contexts, err := goFieldContextSlice(member.Contexts)
		if err != nil {
			return fmt.Errorf("render family %q member %q: %w", current, member.Name, err)
		}
		parts = append(parts, "contexts: "+contexts)
	}
	if len(member.Signals) > 0 {
		signals, err := goSignalSlice(member.Signals)
		if err != nil {
			return fmt.Errorf("render family %q member %q: %w", current, member.Name, err)
		}
		parts = append(parts, "signals: "+signals)
	}
	if len(member.ApplyToMetrics) > 0 {
		parts = append(parts, "applyToMetrics: "+goStringSlice(member.ApplyToMetrics))
	}
	fmt.Fprintf(out, "\t\t\t{%s},\n", strings.Join(parts, ", "))
	return nil
}

func goStringSlice(values []string) string {
	if len(values) == 0 {
		return "nil"
	}
	quoted := make([]string, len(values))
	for i, value := range values {
		quoted[i] = strconv.Quote(value)
	}
	return "[]string{" + strings.Join(quoted, ", ") + "}"
}

func goFieldContextSlice(values []string) (string, error) {
	if len(values) == 0 {
		return "nil", nil
	}
	constants := make([]string, len(values))
	for i, value := range values {
		switch value {
		case "metric":
			constants[i] = "telemetrytypes.FieldContextMetric"
		case "resource":
			constants[i] = "telemetrytypes.FieldContextResource"
		case "attribute":
			constants[i] = "telemetrytypes.FieldContextAttribute"
		default:
			return "", fmt.Errorf("unsupported field context %q", value)
		}
	}
	return "[]telemetrytypes.FieldContext{" + strings.Join(constants, ", ") + "}", nil
}

func goSignalSlice(values []string) (string, error) {
	if len(values) == 0 {
		return "nil", nil
	}
	constants := make([]string, len(values))
	for i, value := range values {
		switch value {
		case "traces":
			constants[i] = "telemetrytypes.SignalTraces"
		case "logs":
			constants[i] = "telemetrytypes.SignalLogs"
		case "metrics":
			constants[i] = "telemetrytypes.SignalMetrics"
		default:
			return "", fmt.Errorf("unsupported signal %q", value)
		}
	}
	return "[]telemetrytypes.Signal{" + strings.Join(constants, ", ") + "}", nil
}

func renderTypeScript(families []generatedFamily) []byte {
	var out bytes.Buffer
	out.WriteString("// Code generated by scripts/semconv. DO NOT EDIT.\n\n")
	out.WriteString("// An empty contexts/signals/applyToMetrics array places no constraint on\n")
	out.WriteString("// that axis.\n")
	out.WriteString("export type SemconvMember = {\n")
	out.WriteString("\treadonly name: string;\n")
	out.WriteString("\treadonly contexts: readonly string[];\n")
	out.WriteString("\treadonly signals: readonly string[];\n")
	out.WriteString("\treadonly applyToMetrics: readonly string[];\n};\n\n")
	out.WriteString("export type SemconvFamily = {\n")
	out.WriteString("\treadonly current: string;\n")
	out.WriteString("\treadonly kind: 'attribute' | 'metric';\n")
	out.WriteString("\treadonly members: readonly SemconvMember[];\n")
	out.WriteString("\treadonly contexts: readonly string[];\n\treadonly signals: readonly string[];\n")
	out.WriteString("\treadonly valueMap: Readonly<Record<string, string>>;\n};\n\n")
	out.WriteString("export const SEMCONV_FAMILIES: readonly SemconvFamily[] = [\n")
	for _, family := range families {
		out.WriteString("\t{\n")
		fmt.Fprintf(&out, "\t\tcurrent: %s,\n", tsString(family.Current))
		fmt.Fprintf(&out, "\t\tkind: %s,\n", tsString(family.Kind))
		out.WriteString("\t\tmembers: [\n")
		for _, member := range family.Members {
			out.WriteString("\t\t\t{\n")
			fmt.Fprintf(&out, "\t\t\t\tname: %s,\n", tsString(member.Name))
			fmt.Fprintf(&out, "\t\t\t\tcontexts: %s,\n", tsStringSlice(member.Contexts))
			fmt.Fprintf(&out, "\t\t\t\tsignals: %s,\n", tsStringSlice(member.Signals))
			fmt.Fprintf(&out, "\t\t\t\tapplyToMetrics: %s,\n", tsStringSlice(member.ApplyToMetrics))
			out.WriteString("\t\t\t},\n")
		}
		out.WriteString("\t\t],\n")
		fmt.Fprintf(&out, "\t\tcontexts: %s,\n", tsStringSlice(family.Contexts))
		fmt.Fprintf(&out, "\t\tsignals: %s,\n", tsStringSlice(family.Signals))
		out.WriteString("\t\tvalueMap: {")
		keys := sortedMapKeys(family.ValueMap)
		for i, key := range keys {
			if i > 0 {
				out.WriteString(", ")
			}
			fmt.Fprintf(&out, "%s: %s", tsString(key), tsString(family.ValueMap[key]))
		}
		out.WriteString("},\n\t},\n")
	}
	out.WriteString("] as const;\n")
	return out.Bytes()
}

func tsString(value string) string {
	quoted := strconv.Quote(value)
	return "'" + strings.ReplaceAll(quoted[1:len(quoted)-1], "'", `\'`) + "'"
}
func tsStringSlice(values []string) string {
	quoted := make([]string, len(values))
	for i, value := range values {
		quoted[i] = tsString(value)
	}
	return "[" + strings.Join(quoted, ", ") + "]"
}

func sortedMapKeys[T any](values map[string]T) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func checkFile(path string, expected []byte) error {
	actual, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("generated file %s is missing: run go run ./scripts/semconv", path)
	}
	if !bytes.Equal(actual, expected) {
		return fmt.Errorf("generated file %s is stale: run go run ./scripts/semconv", path)
	}
	return nil
}
