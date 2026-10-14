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

// GetSemconvMigrationReport lists the services whose metadata carries an old
// family spelling and no current one. It reads attributes_metadata, a
// deduplicated set of resource and attribute fingerprints, not the raw
// telemetry tables.
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
		if err := rows.Scan(&row.current, &row.old, &row.signal, &row.service, &row.resourceSets, &row.lastSeenUnixMilli); err != nil {
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
	for family := range semconv.All() {
		if family.Kind() != semconv.KindAttribute {
			continue
		}
		for _, old := range family.Old() {
			signals := semconvFamilySignals(family.Current(), old)
			if len(signals) == 0 {
				continue
			}
			sb := sqlbuilder.NewSelectBuilder()
			sb.Select(
				fmt.Sprintf("%s AS current_name", sb.Var(family.Current())),
				fmt.Sprintf("%s AS old_name", sb.Var(old)),
				"data_source",
				"if(empty(resource_attributes['service.name']), '<unknown>', resource_attributes['service.name']) AS service_name",
				"uniqExact(tuple(resource_fingerprint, attrs_fingerprint)) AS resource_sets",
				"toInt64(max(unix_milli)) AS last_seen_unix_milli",
			)
			sb.From(t.relatedMetadataDBName + "." + t.relatedMetadataTblName)
			sb.Where(sb.GE("unix_milli", startUnixMilli))
			sb.Where(sb.LE("unix_milli", endUnixMilli))
			sb.Where(sb.In("data_source", signals...))
			sb.Where(sb.Or(semconvMetadataPresenceConditions(sb, old)...))
			sb.Where(fmt.Sprintf("NOT (%s)", sb.Or(semconvMetadataPresenceConditions(sb, family.Current())...)))
			sb.GroupBy("data_source", "service_name")
			builders = append(builders, sb)
		}
	}

	if len(builders) == 0 {
		return "", nil
	}
	return sqlbuilder.UnionAll(builders...).BuildWithFlavor(sqlbuilder.ClickHouse)
}

// semconvFamilySignals lists the signals under which old resolves to
// current. The metadata table holds traces and logs rows.
func semconvFamilySignals(current, old string) []any {
	signals := make([]any, 0, 2)
	for _, signal := range []telemetrytypes.Signal{telemetrytypes.SignalTraces, telemetrytypes.SignalLogs} {
		members := semconv.Members(semconv.KindAttribute, telemetrytypes.FieldKeySelector{Name: old, Signal: signal})
		if slices.Contains(members, current) {
			signals = append(signals, signal.StringValue())
		}
	}
	return signals
}

func semconvMetadataPresenceConditions(sb *sqlbuilder.SelectBuilder, name string) []string {
	return []string{
		fmt.Sprintf("mapContains(resource_attributes, %s)", sb.Var(name)),
		fmt.Sprintf("mapContains(attributes, %s)", sb.Var(name)),
	}
}
