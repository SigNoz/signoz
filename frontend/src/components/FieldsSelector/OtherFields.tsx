import { useMemo } from 'react';
import { Button } from '@signozhq/ui/button';
import { Skeleton } from 'antd';
import cx from 'classnames';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { buildCompositeKey } from 'container/OptionsMenu/utils';
import { useGetQueryKeySuggestions } from 'hooks/querySuggestions/useGetQueryKeySuggestions';
import {
	FieldContext,
	FieldDataType,
	SignalType,
	TelemetryFieldKey,
} from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

import styles from './FieldsSelector.module.scss';

interface OtherFieldsProps {
	signal: DataSource;
	debouncedInputValue: string;
	addedFields: TelemetryFieldKey[];
	onAdd: (field: TelemetryFieldKey) => void;
	isAtLimit: boolean;
}

function OtherFields({
	signal,
	debouncedInputValue,
	addedFields,
	onAdd,
	isAtLimit,
}: OtherFieldsProps): JSX.Element {
	const { data, isFetching } = useGetQueryKeySuggestions(
		{
			signal,
			searchText: debouncedInputValue,
		},
		{
			queryKey: [
				REACT_QUERY_KEY.GET_FIELDS_SELECTOR_SUGGESTIONS,
				signal,
				debouncedInputValue,
			],
			enabled: true,
		},
	);

	const otherFields: TelemetryFieldKey[] = useMemo(() => {
		const suggestions = Object.values(data?.data.data.keys || {}).flat();
		// Normalize: synthesize `key` once so downstream reads can trust it.
		const normalizedSuggestions: TelemetryFieldKey[] = suggestions.map(
			(attr) => ({
				...attr,
				key: buildCompositeKey(attr.name, attr.fieldContext as string),
				signal: attr.signal as SignalType,
				fieldContext: attr.fieldContext as FieldContext,
				fieldDataType: attr.fieldDataType as FieldDataType,
			}),
		);
		const addedIds = new Set(
			addedFields.map((f) => f.key ?? buildCompositeKey(f.name, f.fieldContext)),
		);
		return normalizedSuggestions.filter(
			(attr) => !addedIds.has(attr.key as string),
		);
	}, [data, addedFields]);

	if (isFetching) {
		return (
			<div className={cx(styles.section, styles.sectionOther)}>
				<div className={styles.sectionHeader}>OTHER FIELDS</div>
				<div className={styles.otherList}>
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							// eslint-disable-next-line react/no-array-index-key
							key={i}
							className={cx(styles.fieldItem, styles.otherFieldItem)}
						>
							<Skeleton.Input active size="small" block />
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className={cx(styles.section, styles.sectionOther)}>
			<div className={styles.sectionHeader}>OTHER FIELDS</div>
			<div className={styles.otherList}>
				<OverlayScrollbar>
					<>
						{otherFields.length === 0 ? (
							<div className={styles.noValues}>No values found</div>
						) : (
							otherFields.map((attr) => (
								<div
									key={attr.key}
									className={cx(styles.fieldItem, styles.otherFieldItem)}
								>
									<span className={styles.fieldKey}>{attr.name}</span>
									{!isAtLimit && (
										<Button
											className={cx(styles.addBtn, 'periscope-btn')}
											variant="outlined"
											color="secondary"
											size="sm"
											onClick={(): void => onAdd(attr)}
										>
											Add
										</Button>
									)}
								</div>
							))
						)}
					</>
				</OverlayScrollbar>
			</div>
		</div>
	);
}

export default OtherFields;
