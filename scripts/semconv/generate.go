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

type edge struct {
	old            string
	current        string
	kind           string
	contexts       []string
	signals        []string
	allContexts    bool
	allSignals     bool
	applyToMetrics []string
}

type graphKey struct{ kind, name string }

type generatedFamily struct {
	Current        string
	Old            []string
	Kind           string
	Contexts       []string
	Signals        []string
	ApplyToMetrics []string
	ValueMap       map[string]string
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
	lint := flag.Bool("lint", false, "fail on old-name literals in backend or frontend product code")
	lintExceptions := flag.String("lint-exceptions", filepath.Join(root, "scripts/semconv/lint-exceptions.yaml"), "old-name literal lint exceptions")
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
	}
	if *lint {
		if err := lintRepository(root, families, *lintExceptions); err != nil {
			fatal(err)
		}
	}
	if *check || *lint {
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
				contexts, signals, allContexts, allSignals, err := scopeForSection(scoped.name)
				if err != nil {
					return nil, err
				}
				for _, change := range scoped.section.Changes {
					if change.RenameAttributes != nil {
						for _, old := range sortedMapKeys(change.RenameAttributes.AttributeMap) {
							versionEdges = append(versionEdges, edge{
								old: old, current: change.RenameAttributes.AttributeMap[old], kind: kindAttribute,
								contexts: contexts, signals: signals,
								allContexts: allContexts, allSignals: allSignals,
								applyToMetrics: change.RenameAttributes.ApplyToMetrics,
							})
						}
					}
					for _, old := range sortedMapKeys(change.RenameMetrics) {
						versionEdges = append(versionEdges, edge{
							old: old, current: change.RenameMetrics[old], kind: kindMetric,
							contexts: []string{"metric"}, signals: []string{"metrics"},
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

func scopeForSection(section string) (contexts, signals []string, allContexts, allSignals bool, err error) {
	switch section {
	case "all":
		return nil, nil, true, true, nil
	case "resources":
		return []string{"resource"}, nil, false, true, nil
	case "spans":
		return []string{"attribute"}, []string{"traces"}, false, false, nil
	case "logs":
		return []string{"attribute"}, []string{"logs"}, false, false, nil
	case "metrics":
		return []string{"attribute"}, []string{"metrics"}, false, false, nil
	default:
		return nil, nil, false, false, fmt.Errorf("unsupported schema section %q", section)
	}
}

func buildFamilies(schemas []schemaFile, overlay overlayFile) ([]generatedFamily, error) {
	edges, err := collectEdges(schemas)
	if err != nil {
		return nil, err
	}
	next := make(map[graphKey]string)
	for _, item := range edges {
		key := graphKey{kind: item.kind, name: item.old}
		if existing, ok := next[key]; ok && existing == item.current {
			// Repeated entries are common in chained schema histories. Treat an
			// identical edge as a no-op so it cannot sever a later edge in the
			// same chain (A -> B, B -> C, then a repeated A -> B).
			continue
		}
		// Schema history occasionally repeats an old name with a newer direct
		// destination or rolls a rename back. Edges are collected
		// oldest-to-newest, so the latest published current name must be a root.
		delete(next, graphKey{kind: item.kind, name: item.current})
		next[key] = item.current
	}

	type familyState struct {
		family      generatedFamily
		distance    map[string]int
		allContexts bool
		allSignals  bool
	}
	states := map[graphKey]*familyState{}
	for _, item := range edges {
		root, distance, err := rootFor(next, item.kind, item.old)
		if err != nil {
			return nil, err
		}
		key := graphKey{kind: item.kind, name: root}
		state := states[key]
		if state == nil {
			state = &familyState{
				family:   generatedFamily{Current: root, Kind: item.kind},
				distance: map[string]int{},
			}
			states[key] = state
		}
		if prior, ok := state.distance[item.old]; !ok || distance < prior {
			state.distance[item.old] = distance
		}
		state.allContexts = state.allContexts || item.allContexts
		state.allSignals = state.allSignals || item.allSignals
		state.family.Contexts = appendUnique(state.family.Contexts, item.contexts...)
		state.family.Signals = appendUnique(state.family.Signals, item.signals...)
		state.family.ApplyToMetrics = appendUnique(state.family.ApplyToMetrics, item.applyToMetrics...)
	}

	for _, state := range states {
		for old := range state.distance {
			if old != state.family.Current {
				state.family.Old = append(state.family.Old, old)
			}
		}
		sort.Slice(state.family.Old, func(i, j int) bool {
			left, right := state.family.Old[i], state.family.Old[j]
			if state.distance[left] != state.distance[right] {
				return state.distance[left] < state.distance[right]
			}
			return left < right
		})
		if state.allContexts {
			state.family.Contexts = nil
		} else {
			sort.Strings(state.family.Contexts)
		}
		if state.allSignals {
			state.family.Signals = nil
		} else {
			sort.Strings(state.family.Signals)
		}
		sort.Strings(state.family.ApplyToMetrics)
	}

	for _, current := range sortedMapKeys(overlay.Families) {
		policy := overlay.Families[current]
		kind, err := normalizedOverlayKind(current, policy)
		if err != nil {
			return nil, err
		}
		policy.Kind = kind
		overlay.Families[current] = policy
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
			state = &familyState{
				family:   generatedFamily{Current: current, Kind: kind, Old: append([]string(nil), policy.Old...)},
				distance: map[string]int{},
			}
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
		if len(state.family.Old) == 0 {
			return nil, fmt.Errorf(
				"enabled family %q with kind %q has no old members",
				state.family.Current,
				state.family.Kind,
			)
		}
		sort.Strings(state.family.Contexts)
		sort.Strings(state.family.Signals)
		sort.Strings(state.family.ApplyToMetrics)
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

func rootFor(next map[graphKey]string, kind, name string) (string, int, error) {
	seen := map[string]bool{}
	distance := 0
	for {
		if seen[name] {
			return "", 0, fmt.Errorf("rename cycle for %s %q", kind, name)
		}
		seen[name] = true
		current, ok := next[graphKey{kind: kind, name: name}]
		if !ok {
			return name, distance, nil
		}
		name = current
		distance++
	}
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
		family.Old = append([]string(nil), policy.Old...)
	}
	family.Old = appendUnique(family.Old, policy.AddOld...)
	if len(policy.ExcludeOld) > 0 {
		excluded := make(map[string]bool, len(policy.ExcludeOld))
		for _, old := range policy.ExcludeOld {
			excluded[old] = true
		}
		family.Old = deleteMatching(family.Old, excluded)
	}
	if policy.Contexts != nil {
		family.Contexts = append([]string(nil), policy.Contexts...)
	}
	if policy.Signals != nil {
		family.Signals = append([]string(nil), policy.Signals...)
	}
	family.Contexts = appendUnique(family.Contexts, policy.AddContexts...)
	family.Signals = appendUnique(family.Signals, policy.AddSignals...)
	if policy.ApplyToMetrics != nil {
		family.ApplyToMetrics = append([]string(nil), policy.ApplyToMetrics...)
	}
	family.ApplyToMetrics = appendUnique(family.ApplyToMetrics, policy.AddApplyToMetrics...)
	if policy.ValueMap != nil {
		family.ValueMap = make(map[string]string, len(policy.ValueMap))
		for old, current := range policy.ValueMap {
			family.ValueMap[old] = current
		}
	}
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

func deleteMatching(values []string, excluded map[string]bool) []string {
	result := values[:0]
	for _, value := range values {
		if !excluded[value] {
			result = append(result, value)
		}
	}
	return result
}

func renderGo(families []generatedFamily) ([]byte, error) {
	var out bytes.Buffer
	out.WriteString("// Code generated by scripts/semconv. DO NOT EDIT.\n\n")
	out.WriteString("package semconv\n\n")
	needsTelemetryTypes := false
	for _, family := range families {
		if len(family.Contexts) > 0 || len(family.Signals) > 0 {
			needsTelemetryTypes = true
			break
		}
	}
	if needsTelemetryTypes {
		out.WriteString("import \"github.com/SigNoz/signoz/pkg/types/telemetrytypes\"\n\n")
	}
	out.WriteString("var families = []Family{\n")
	for _, family := range families {
		contexts, err := goFieldContextSlice(family.Contexts)
		if err != nil {
			return nil, fmt.Errorf("render family %q: %w", family.Current, err)
		}
		signals, err := goSignalSlice(family.Signals)
		if err != nil {
			return nil, fmt.Errorf("render family %q: %w", family.Current, err)
		}
		out.WriteString("\t{\n")
		fmt.Fprintf(&out, "\t\tCurrent: %s,\n", strconv.Quote(family.Current))
		fmt.Fprintf(&out, "\t\tOld: %s,\n", goStringSlice(family.Old))
		if family.Kind == kindMetric {
			out.WriteString("\t\tKind: KindMetric,\n")
		} else {
			out.WriteString("\t\tKind: KindAttribute,\n")
		}
		fmt.Fprintf(&out, "\t\tContexts: %s,\n", contexts)
		fmt.Fprintf(&out, "\t\tSignals: %s,\n", signals)
		fmt.Fprintf(&out, "\t\tApplyToMetrics: %s,\n", goStringSlice(family.ApplyToMetrics))
		if len(family.ValueMap) > 0 {
			out.WriteString("\t\tValueMap: map[string]string{\n")
			keys := sortedMapKeys(family.ValueMap)
			for _, key := range keys {
				fmt.Fprintf(&out, "\t\t\t%s: %s,\n", strconv.Quote(key), strconv.Quote(family.ValueMap[key]))
			}
			out.WriteString("\t\t},\n")
		}
		out.WriteString("\t},\n")
	}
	out.WriteString("}\n")
	return format.Source(out.Bytes())
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
	out.WriteString("export type SemconvFamily = {\n")
	out.WriteString("\treadonly current: string;\n\treadonly old: readonly string[];\n")
	out.WriteString("\treadonly kind: 'attribute' | 'metric';\n")
	out.WriteString("\treadonly contexts: readonly string[];\n\treadonly signals: readonly string[];\n")
	out.WriteString("\treadonly applyToMetrics: readonly string[];\n")
	out.WriteString("\treadonly valueMap: Readonly<Record<string, string>>;\n};\n\n")
	out.WriteString("export const SEMCONV_FAMILIES: readonly SemconvFamily[] = [\n")
	for _, family := range families {
		out.WriteString("\t{\n")
		fmt.Fprintf(&out, "\t\tcurrent: %s,\n", tsString(family.Current))
		writeTypeScriptSlice(&out, "old", family.Old)
		fmt.Fprintf(&out, "\t\tkind: %s,\n", tsString(family.Kind))
		writeTypeScriptSlice(&out, "contexts", family.Contexts)
		writeTypeScriptSlice(&out, "signals", family.Signals)
		writeTypeScriptSlice(&out, "applyToMetrics", family.ApplyToMetrics)
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

func writeTypeScriptSlice(out *bytes.Buffer, name string, values []string) {
	const indent = "\t\t"
	inline := fmt.Sprintf("%s%s: %s,", indent, name, tsStringSlice(values))
	if len(inline) <= 80 {
		out.WriteString(inline + "\n")
		return
	}

	fmt.Fprintf(out, "%s%s: [\n", indent, name)
	for _, value := range values {
		fmt.Fprintf(out, "%s\t%s,\n", indent, tsString(value))
	}
	fmt.Fprintf(out, "%s],\n", indent)
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
