import { ColumnsType } from 'antd/es/table';
import { Typography } from 'antd/lib';
import {
	getColumnTitle,
	getFieldVariantsByName,
	getUniqueColumnKey,
	getVariantCounts,
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
): ColumnsType<RowData> => {
	const initialColumns: ColumnsType<RowData> = [];
	const variantCounts = getVariantCounts(selectedLogFields || []);

	// Group fields by name to analyze variants
	const fieldVariantsByName = getFieldVariantsByName(selectedLogFields || []);

	const columns: ColumnsType<RowData> =
		selectedLogFields?.map((field: IField) => {
			const { name } = field;
			const hasVariants = variantCounts[name] > 1;
			const variants = fieldVariantsByName[name] || [];
			const title = getColumnTitle(field, hasVariants, variants);

			return {
				title,
				dataIndex: name,
				key: getUniqueColumnKey(field),
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
