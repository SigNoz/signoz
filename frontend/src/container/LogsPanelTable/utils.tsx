import { ColumnsType } from 'antd/es/table';
import { Typography } from 'antd/lib';
import { OPERATORS } from 'constants/queryBuilder';
import { TimestampInput } from 'hooks/useTimezoneFormatter/useTimezoneFormatter';
// import Typography from 'antd/es/typography/Typography';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { ReactNode } from 'react';
import { Widgets } from 'types/api/dashboard/getAll';
import { IField } from 'types/api/logs/fields';
import { ILog } from 'types/api/logs/log';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

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

export const getNextOrPreviousItems = (
	items: TagFilterItem[],
	direction: 'NEXT' | 'PREV',
	log?: ILog,
): TagFilterItem[] => {
	const nextItem = {
		id: uuid(),
		key: {
			key: 'id',
			type: '',
			dataType: DataTypes.String,
			isColumn: true,
		},
		op: OPERATORS['<'],
		value: log?.id || '',
	};
	const prevItem = {
		id: uuid(),
		key: {
			key: 'id',
			type: '',
			dataType: DataTypes.String,
			isColumn: true,
		},
		op: OPERATORS['>'],
		value: log?.id || '',
	};
	let index = items.findIndex((item) => item.op === OPERATORS['<']);
	if (index === -1) {
		index = items.findIndex((item) => item.op === OPERATORS['>']);
	}
	if (index === -1) {
		if (direction === 'NEXT') {
			return [...items, nextItem];
		}
		return [...items, prevItem];
	}
	const newItems = [...items];
	if (direction === 'NEXT') {
		newItems[index] = nextItem;
	} else {
		newItems[index] = prevItem;
	}
	return newItems;
};
