package telemetrymetadata

import (
	"context"
	"fmt"
	"slices"
	"strings"

	"github.com/huandu/go-sqlbuilder"

	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/semconv"
	"github.com/SigNoz/signoz/pkg/types/telemetrytypes"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type semconvMigrationRow struct {
	current           string
	old               string
	signal            string
	service           string
	resourceSets      uint64
	lastSeenUnixMilli int64
}

// GetSemconvMigrationReport derives an old-only service report from the
// generated family registry and attributes_metadata. The latter is already a
// deduplicated set of resource/attribute fingerprints, so this audit avoids a
// scan of the raw telemetry tables.
func (t *telemetryMetaStore) GetSemconvMigrationReport(
	ctx context.Context,
	_ valuer.UUID,
	startUnixMilli, endUnixMilli int64,
) (*telemetrytypes.GettableSemconvMigrationReport, error) {
	query, args := t.semconvMigrationReportQuery(startUnixMilli, endUnixMilli)
	report := &telemetrytypes.GettableSemconvMigrationReport{
		StartUnixMilli: startUnixMilli,
		EndUnixMilli:   endUnixMilli,
		Entries:        []*telemetrytypes.SemconvMigrationReportEntry{},
	}
	if query == "" {
		return report, nil
	}

	rows, err := t.telemetrystore.ClickhouseDB().Query(ctx, query, args...)
	if err != nil {
		return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, "failed to build semantic-convention migration report")
	}
	defer rows.Close()

	grouped := make(map[string]*telemetrytypes.SemconvMigrationReportEntry)
	serviceSets := make(map[string]map[string]struct{})
	for rows.Next() {
		var row semconvMigrationRow
		if err := rows.Scan(
			&row.current,
			&row.old,
			&row.signal,
			&row.service,
			&row.resourceSets,
			&row.lastSeenUnixMilli,
		); err != nil {
			return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, "failed to scan semantic-convention migration report")
		}

		identity := row.current + "\x00" + row.old + "\x00" + row.signal
		entry, ok := grouped[identity]
		if !ok {
			entry = &telemetrytypes.SemconvMigrationReportEntry{
				Current:  row.current,
				Old:      row.old,
				Signal:   row.signal,
				Services: []string{},
			}
			grouped[identity] = entry
			serviceSets[identity] = make(map[string]struct{})
			report.Entries = append(report.Entries, entry)
		}
		serviceSets[identity][row.service] = struct{}{}
		entry.ResourceSets += row.resourceSets
		entry.LastSeenUnixMilli = max(entry.LastSeenUnixMilli, row.lastSeenUnixMilli)
	}
	if err := rows.Err(); err != nil {
		return nil, errors.Wrap(err, errors.TypeInternal, errors.CodeInternal, "failed to read semantic-convention migration report")
	}

	for identity, entry := range grouped {
		for service := range serviceSets[identity] {
			entry.Services = append(entry.Services, service)
		}
		slices.Sort(entry.Services)
	}
	slices.SortFunc(report.Entries, func(a, b *telemetrytypes.SemconvMigrationReportEntry) int {
		return strings.Compare(a.Current+"\x00"+a.Old+"\x00"+a.Signal, b.Current+"\x00"+b.Old+"\x00"+b.Signal)
	})

	return report, nil
}

func (t *telemetryMetaStore) semconvMigrationReportQuery(startUnixMilli, endUnixMilli int64) (string, []any) {
	builders := make([]sqlbuilder.Builder, 0)
	for _, family := range semconv.All() {
		if family.Kind != semconv.KindAttribute {
			continue
		}
		for _, old := range family.Old {
			sb := sqlbuilder.NewSelectBuilder()
			sb.Select(
				fmt.Sprintf("%s AS current_name", sb.Var(family.Current)),
				fmt.Sprintf("%s AS old_name", sb.Var(old)),
				"data_source",
				"if(empty(resource_attributes['service.name']), '<unknown>', resource_attributes['service.name']) AS service_name",
				"uniqExact(tuple(resource_fingerprint, attrs_fingerprint)) AS resource_sets",
				"toInt64(max(unix_milli)) AS last_seen_unix_milli",
			)
			sb.From(t.relatedMetadataDBName + "." + t.relatedMetadataTblName)
			sb.Where(sb.GE("unix_milli", startUnixMilli))
			sb.Where(sb.LE("unix_milli", endUnixMilli))

			if len(family.Signals) > 0 {
				signals := make([]any, 0, len(family.Signals))
				for _, signal := range family.Signals {
					signals = append(signals, signal.StringValue())
				}
				sb.Where(sb.In("data_source", signals...))
			}

			oldPresence := semconvMetadataPresenceConditions(sb, old)
			currentPresence := semconvMetadataPresenceConditions(sb, family.Current)
			sb.Where(sb.Or(oldPresence...))
			sb.Where(fmt.Sprintf("NOT (%s)", sb.Or(currentPresence...)))
			sb.GroupBy("data_source", "service_name")
			builders = append(builders, sb)
		}
	}

	if len(builders) == 0 {
		return "", nil
	}
	union := sqlbuilder.UnionAll(builders...)
	return union.BuildWithFlavor(sqlbuilder.ClickHouse)
}

func semconvMetadataPresenceConditions(sb *sqlbuilder.SelectBuilder, name string) []string {
	spellings := []string{name, strings.ReplaceAll(name, ".", "_")}
	spellings = append(spellings, "resource_"+name, "resource_"+strings.ReplaceAll(name, ".", "_"))
	spellings = slices.Compact(spellings)
	conditions := make([]string, 0, len(spellings)*2)
	for _, spelling := range spellings {
		conditions = append(conditions,
			fmt.Sprintf("mapContains(resource_attributes, %s)", sb.Var(spelling)),
			fmt.Sprintf("mapContains(attributes, %s)", sb.Var(spelling)),
		)
	}
	return conditions
}
