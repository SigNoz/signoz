import { useCallback, useMemo } from 'react';
import { ComboboxSimple, ComboboxSimpleItem } from '@signozhq/ui/combobox';
import { Alerts } from 'types/api/alerts/getTriggered';

import { Container } from './styles';

function Filter({
	onSelectedFilterChange,
	onSelectedGroupChange,
	allAlerts,
	selectedGroup,
	selectedFilter,
}: FilterProps): JSX.Element {
	const onChangeSelectGroupHandler = useCallback(
		(value: unknown) => {
			if (typeof value === 'object' && Array.isArray(value)) {
				onSelectedGroupChange(
					value.map((e) => ({
						value: e,
					})),
				);
			}
		},
		[onSelectedGroupChange],
	);

	const onChangeSelectedFilterHandler = useCallback(
		(value: unknown) => {
			if (typeof value === 'object' && Array.isArray(value)) {
				onSelectedFilterChange(
					value.map((e) => ({
						value: e,
					})),
				);
			}
		},
		[onSelectedFilterChange],
	);

	const uniqueLabels: Array<string> = useMemo(() => {
		const allLabelsSet = new Set<string>();
		allAlerts.forEach((e) => {
			if (!e.labels) {
				return;
			}
			Object.keys(e.labels).forEach((e) => {
				allLabelsSet.add(e);
			});
		});
		return [...allLabelsSet];
	}, [allAlerts]);

	const items: ComboboxSimpleItem[] = useMemo(
		() =>
			uniqueLabels.map((e) => ({
				value: e,
				label: e,
			})),
		[uniqueLabels],
	);

	return (
		<Container>
			<ComboboxSimple
				multiple
				allowCreate
				onChange={(v): void => onChangeSelectedFilterHandler(v)}
				value={selectedFilter.map((e) => e.value)}
				placeholder="Filter by Tags - e.g. severity:warning, alertname:Sample Alert"
				items={[]}
				style={{ minWidth: 350 }}
			/>
			<ComboboxSimple
				multiple
				allowCreate
				onChange={(v): void => onChangeSelectGroupHandler(v)}
				value={selectedGroup.map((e) => e.value)}
				placeholder="Group by any tag"
				items={items}
				style={{ minWidth: 350 }}
			/>
		</Container>
	);
}

interface FilterProps {
	onSelectedFilterChange: (value: Array<Value>) => void;
	onSelectedGroupChange: (value: Array<Value>) => void;
	allAlerts: Alerts[];
	selectedGroup: Array<Value>;
	selectedFilter: Array<Value>;
}

export interface Value {
	value: string;
}

export default Filter;
