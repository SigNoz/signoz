import { useMemo } from 'react';
import { Button } from '@signozhq/ui/button';
import { Skeleton } from 'antd';
import cx from 'classnames';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

import styles from './FieldsSettings.module.scss';

interface OtherFieldsProps {
	dataSource: DataSource;
	debouncedInputValue: string;
	addedFields: BaseAutocompleteData[];
	onAdd: (field: BaseAutocompleteData) => void;
	isAtLimit: boolean;
}

function OtherFields({
	dataSource,
	debouncedInputValue,
	addedFields,
	onAdd,
	isAtLimit,
}: OtherFieldsProps): JSX.Element {
	// API call to get available attribute keys
	const { data, isFetching } = useGetAggregateKeys(
		{
			searchText: debouncedInputValue,
			dataSource,
			aggregateOperator: 'noop',
			aggregateAttribute: '',
			tagType: '',
		},
		{
			queryKey: [
				REACT_QUERY_KEY.GET_OTHER_FILTERS,
				'preview-fields',
				debouncedInputValue,
			],
			enabled: true,
		},
	);

	// Filter out already-added fields, match on .key from API response objects
	const otherFields = useMemo(() => {
		const attributes = data?.payload?.attributeKeys || [];
		const addedKeys = new Set(addedFields.map((f) => f.key));
		return attributes.filter((attr) => !addedKeys.has(attr.key));
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
									key={attr.key}
									className={cx(styles.fieldItem, styles.otherFieldItem)}
								>
									<span className={styles.fieldKey}>{attr.key}</span>
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
						{isAtLimit && <div className={styles.limitHint}>Maximum 10 fields</div>}
					</>
				</OverlayScrollbar>
			</div>
		</div>
	);
}

export default OtherFields;
