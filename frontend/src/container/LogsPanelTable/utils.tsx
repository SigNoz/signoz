import { ColumnsType } from 'antd/es/table';
import { Typography } from 'antd/lib';
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

	const columns: ColumnsType<RowData> =
		selectedLogFields?.map((field: IField) => {
			const { name, key, displayName } = field;

			return {
				title: displayName,
				dataIndex: key,
				key,
				width: key === 'log.body:string' ? 350 : 100,
				render: (value: ReactNode): JSX.Element => {
					if (key === 'log.timestamp:string') {
						return (
							<Typography.Text>
								{formatTimezoneAdjustedTimestamp(value as string)}
							</Typography.Text>
						);
					}

					if (key === 'log.body:string') {
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
