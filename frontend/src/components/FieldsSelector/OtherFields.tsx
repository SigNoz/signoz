import { useMemo } from 'react';
import { Button } from '@signozhq/ui/button';
import { Skeleton } from 'antd';
import cx from 'classnames';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
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
		const addedNames = new Set(addedFields.map((f) => f.name));
		return suggestions
			.filter((attr) => !addedNames.has(attr.name))
			.map((attr) => ({
				...attr,
				signal: attr.signal as SignalType,
				fieldContext: attr.fieldContext as FieldContext,
				fieldDataType: attr.fieldDataType as FieldDataType,
			}));
	}, [data, addedFields]);

	if (isFetching) {
		return (
			<div className={cx(styles.section, styles.sectionOther)}>
				<div className={styles.sectionHeader}>OTHER FIELDS</div>
				<div className={styles.otherList}>
					{Array.from({ length: 5 }).map((_, i) => (
						// eslint-disable-next-line react/no-array-index-key
						<Skeleton.Input active size="small" key={i} />
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
									key={attr.name}
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
