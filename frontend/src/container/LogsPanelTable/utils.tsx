import { ColumnsType } from 'antd/es/table';
import { Typography } from 'antd/lib';
import { TelemetryFieldKey } from 'api/v5/v5';
import {
	getColumnTitleWithTooltip,
	getFieldVariantsByName,
	getUniqueColumnKey,
	hasMultipleVariants,
} from 'container/OptionsMenu/utils';
import { TimestampInput } from 'hooks/useTimezoneFormatter/useTimezoneFormatter';
// import Typography from 'antd/es/typography/Typography';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { ReactNode } from 'react';
import { Widgets } from 'types/api/dashboard/getAll';
import { IField } from 'types/api/logs/fields';

export const getLogPanelColumnsList = (
	selectedLogFields: Widgets['selectedLogFields'],
	formatTimezoneAdjustedTimestamp: (
		input: TimestampInput,
		format?: string,
	) => string,
	allAvailableKeys?: TelemetryFieldKey[],
): ColumnsType<RowData> => {
	const initialColumns: ColumnsType<RowData> = [];

	// Group fields by name to analyze variants
	const fieldVariantsByName = getFieldVariantsByName(selectedLogFields || []);

	const columns: ColumnsType<RowData> =
		selectedLogFields?.map((field: IField) => {
			const { name } = field;
			const hasVariants = hasMultipleVariants(
				name,
				selectedLogFields || [],
				allAvailableKeys,
			);
			const variants = fieldVariantsByName[name] || [];
			const { title, hasUnselectedConflict } = getColumnTitleWithTooltip(
				field,
				hasVariants,
				variants,
				selectedLogFields || [],
				allAvailableKeys,
			);

			return {
				title,
				dataIndex: name,
				key: getUniqueColumnKey(field),
				...(hasUnselectedConflict && { _hasUnselectedConflict: true }),
				width: name === 'body' ? 350 : 100,
				render: (value: ReactNode): JSX.Element => {
					if (name === 'timestamp') {
						return (
							<Typography.Text>
								{formatTimezoneAdjustedTimestamp(value as string)}
							</Typography.Text>
						);
					}

					if (name === 'body') {
						return (
							<Typography.Paragraph ellipsis={{ rows: 1 }} data-testid={name}>
								{value}
							</Typography.Paragraph>
						);
					}

					return <Typography.Text data-testid={name}>{value}</Typography.Text>;
				},
				responsive: ['md'],
			};
		}) || [];

	return [...initialColumns, ...columns];
};
