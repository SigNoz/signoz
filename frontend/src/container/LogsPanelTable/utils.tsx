import { ReactNode } from 'react';
import { TableColumnsType as ColumnsType } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { TimestampInput } from 'hooks/useTimezoneFormatter/useTimezoneFormatter';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { Widgets } from 'types/api/widgets/widget';
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
			const { name } = field;

			return {
				title: name,
				dataIndex: name,
				key: name,
				width: name === 'body' ? 350 : 100,
				render: (value: ReactNode): JSX.Element => {
					if (name === 'timestamp') {
						return (
							<Typography
								variant="paragraph"
								size="base"
								weight="regular"
								color="inherit"
								as="span"
								textOverflow="wrap"
							>
								{formatTimezoneAdjustedTimestamp(value as string)}
							</Typography>
						);
					}

					if (name === 'body') {
						return (
							<Typography
								variant="paragraph"
								size="base"
								weight="regular"
								color="inherit"
								as="p"
								textOverflow="ellipsis"
								data-testid={name}
							>
								{value}
							</Typography>
						);
					}

					return (
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
							data-testid={name}
						>
							{value}
						</Typography>
					);
				},
				responsive: ['md'],
			};
		}) || [];

	return [...initialColumns, ...columns];
};
