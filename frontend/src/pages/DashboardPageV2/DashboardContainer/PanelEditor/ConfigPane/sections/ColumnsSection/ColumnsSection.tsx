import { useMemo, useState } from 'react';
import { Select } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import type {
	TelemetrytypesSignalDTO,
	TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useGetFieldsKeys } from 'api/generated/services/fields';
import useDebounce from 'hooks/useDebounce';
import type { SectionEditorProps } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

import styles from './ColumnsSection.module.scss';

type ColumnsSectionProps = SectionEditorProps<'columns'> & {
	/** Panel's telemetry signal — scopes the field-key suggestions. */
	signal?: TelemetrytypesSignalDTO;
};

/**
 * Edits the List panel's columns (`spec.plugin.spec.selectFields`): a searchable
 * tag input over the data source's telemetry field keys. Suggestions come from
 * `useGetFieldsKeys` scoped to the panel's signal; tags mode still allows free
 * entry for fields not yet indexed. Each entry is a field name shown as a column,
 * in the order selected. When empty the renderer derives columns from the rows.
 */
function ColumnsSection({
	value,
	onChange,
	signal,
}: ColumnsSectionProps): JSX.Element {
	const fields = useMemo(() => value ?? [], [value]);
	const selected = useMemo(
		() => fields.map((field) => field.name).filter(Boolean),
		[fields],
	);

	const [searchText, setSearchText] = useState('');
	const debouncedSearch = useDebounce(searchText, 300);

	const { data, isFetching } = useGetFieldsKeys(
		{ signal, searchText: debouncedSearch },
		{ query: { enabled: !!signal } },
	);

	// `keys` groups suggestions by field name; flatten to a single list, then index
	// by name to enrich newly-picked tags with their context/data-type metadata.
	const suggestions = useMemo(
		() => Object.values(data?.data.keys ?? {}).flat(),
		[data],
	);
	const suggestionByName = useMemo(
		() => new Map(suggestions.map((field) => [field.name, field])),
		[suggestions],
	);

	const options = useMemo(
		() => suggestions.map((field) => ({ label: field.name, value: field.name })),
		[suggestions],
	);

	const handleChange = (names: string[]): void => {
		// Preserve metadata for fields already selected; enrich new picks from the
		// suggestion list; fall back to a bare name for free-typed entries.
		const existingByName = new Map(fields.map((field) => [field.name, field]));
		const next: TelemetrytypesTelemetryFieldKeyDTO[] = names.map(
			(name) => existingByName.get(name) ?? suggestionByName.get(name) ?? { name },
		);
		onChange(next);
	};

	return (
		<div className={styles.section}>
			<Select
				className={styles.select}
				mode="tags"
				value={selected}
				onChange={handleChange}
				onSearch={setSearchText}
				// Server-side search: keep every suggestion the API returns.
				filterOption={false}
				options={options}
				loading={isFetching}
				placeholder="Add a column (type to search fields)"
				data-testid="list-columns-select"
				notFoundContent={isFetching ? 'Loading…' : null}
				tokenSeparators={[',']}
			/>
			<Typography.Text className={styles.hint}>
				Leave empty to show all fields returned by the query.
			</Typography.Text>
		</div>
	);
}

export default ColumnsSection;
