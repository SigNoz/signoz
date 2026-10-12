import { useMemo } from 'react';
import { CustomMultiSelect } from 'components/NewSelect';
import OverflowValuesTooltip from 'components/OverflowValuesTooltip/OverflowValuesTooltip';
import { OptionData } from 'components/NewSelect/types';
import { findOptionLabel } from 'components/NewSelect/utils';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';
import { useInfraMonitoringPageListing } from 'container/InfraMonitoringK8sV2/hooks';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

import { logInfraFilterCustomizedEvent } from '../../events';

import styles from './EntityStatusFilter.module.scss';

interface StatusMultiSelectProps<T extends string> {
	label: string;
	entity: InfraMonitoringEntity;
	/** Key reported to analytics for this control, e.g. `pod_status`. */
	filterKey: string;
	options: OptionData[];
	allValues: T[];
	selected: T[];
	onChange: (next: T[]) => void;
	testId: string;
}

function StatusMultiSelect<T extends string>({
	label,
	entity,
	filterKey,
	options,
	allValues,
	selected,
	onChange,
	testId,
}: StatusMultiSelectProps<T>): JSX.Element {
	const { currentQuery } = useQueryBuilder();

	// No selection means no filter, which is every status — so show ALL as checked
	// rather than an empty control that reads as "nothing matches".
	const value = useMemo(
		() => (selected.length > 0 ? selected : allValues),
		[selected, allValues],
	);

	const handleChange = (next: string[] | string | undefined): void => {
		const values = (Array.isArray(next) ? next : [next])
			.filter((item): item is string => Boolean(item))
			.filter((item): item is T => allValues.includes(item as T));

		// Selecting everything is the same request as selecting nothing; store the
		// empty form so the param drops out of the URL.
		const isAll = values.length === allValues.length;
		onChange(isAll ? [] : values);

		logInfraFilterCustomizedEvent(
			entity,
			'status_filter',
			currentQuery.builder.queryData[0]?.filter?.expression || '',
			isAll ? [] : [filterKey],
		);
	};

	const [, setCurrentPage] = useInfraMonitoringPageListing();

	return (
		<div className={styles.statusFilter}>
			<span className={styles.statusFilterLabel}>{label}</span>
			<CustomMultiSelect
				className={styles.statusFilterControl}
				data-testid={testId}
				options={options}
				value={value}
				showSearch
				showLabels
				preserveOptionOrder
				maxTagCount={1}
				maxTagTextLength={12}
				maxTagPlaceholder={(omitted): JSX.Element => (
					<OverflowValuesTooltip
						values={omitted.map((item) => {
							// The omitted items carry the raw value as their label, since
							// sections put the real one a level down.
							const value = String(item.value ?? '');
							return findOptionLabel(options, value) ?? value;
						})}
					/>
				)}
				placeholder={label}
				onChange={(next): void => {
					handleChange(next);
					void setCurrentPage(1);
				}}
				onClear={(): void => {
					onChange([]);
					void setCurrentPage(1);
				}}
			/>
		</div>
	);
}

export default StatusMultiSelect;
