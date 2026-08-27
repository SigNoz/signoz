import { useMemo } from 'react';
import { Button } from '@signozhq/ui/button';
import { Skeleton } from 'antd';
import cx from 'classnames';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { buildCompositeKey } from 'container/OptionsMenu/utils';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

import styles from './FieldsSelector.module.scss';
import { StaticFieldsSource } from 'hooks/querySuggestions/staticFields';
import { useSelectableFields } from 'hooks/querySuggestions/useSelectableFields';

interface OtherFieldsProps {
	signal: DataSource;
	debouncedInputValue: string;
	addedFields: TelemetryFieldKey[];
	onAdd: (field: TelemetryFieldKey) => void;
	isAtLimit: boolean;
	allowCustomFields?: boolean;
	addStaticFields?: StaticFieldsSource;
}

function OtherFields({
	signal,
	debouncedInputValue,
	addedFields,
	onAdd,
	isAtLimit,
	allowCustomFields,
	addStaticFields,
}: OtherFieldsProps): JSX.Element {
	const { fields, isLoading } = useSelectableFields({
		signal,
		searchText: debouncedInputValue,
		source: addStaticFields,
	});

	const otherFields = useMemo<TelemetryFieldKey[]>(() => {
		// A named source returns the whole pool, so the search narrows it here.
		const search = debouncedInputValue.trim().toLowerCase();
		const rawSuggestions = addStaticFields
			? fields.filter((field) => field.name.toLowerCase().includes(search))
			: fields;
		// Normalize: synthesize `key` once so downstream reads can trust it.
		const suggestions: TelemetryFieldKey[] = rawSuggestions.map((attr) => ({
			...attr,
			key: buildCompositeKey(attr.name, attr.fieldContext, attr.fieldDataType),
		}));
		const addedIds = new Set(
			addedFields.map((f) =>
				buildCompositeKey(f.name, f.fieldContext, f.fieldDataType),
			),
		);
		const available = suggestions.filter(
			(attr) => !addedIds.has(attr.key as string),
		);

		// Prepend the custom field when its name is not in suggestions and
		// not already added.
		const typed = debouncedInputValue.trim();
		const nameMatches = (list: TelemetryFieldKey[]): boolean =>
			list.some((f) => f.name.toLowerCase() === typed.toLowerCase());
		const showCustom =
			!!allowCustomFields &&
			typed.length > 0 &&
			!nameMatches(suggestions) &&
			!nameMatches(addedFields);

		if (!showCustom) {
			return available;
		}
		const customField: TelemetryFieldKey = {
			name: typed,
			fieldContext: '',
			fieldDataType: '',
			key: buildCompositeKey(typed, ''),
		};
		return [customField, ...available];
	}, [
		fields,
		addedFields,
		allowCustomFields,
		debouncedInputValue,
		addStaticFields,
	]);

	if (isLoading) {
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
