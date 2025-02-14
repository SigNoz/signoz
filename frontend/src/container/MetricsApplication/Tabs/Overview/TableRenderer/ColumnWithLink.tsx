import { Tooltip, Typography } from 'antd';
import { navigateToTrace } from 'container/MetricsApplication/utils';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { v4 as uuid } from 'uuid';

import { useGetAPMToTracesQueries } from '../../util';

function ColumnWithLink({
	servicename,
	minTime,
	maxTime,
	selectedTraceTags,
	record,
}: LinkColumnProps): JSX.Element {
	const text = record.toString();
	const { safeNavigate } = useSafeNavigate();

	const apmToTraceQuery = useGetAPMToTracesQueries({
		servicename,
		filters: [
			{
				id: uuid().slice(0, 8),
				key: {
					key: 'name',
					dataType: DataTypes.String,
					type: 'tag',
					isColumn: true,
					isJSON: false,
					id: 'name--string--tag--true',
				},
				op: 'in',
				value: [text],
			},
		],
	});

	const handleOnClick = (operation: string) => (): void => {
		navigateToTrace({
			servicename,
			operation,
			minTime,
			maxTime,
			selectedTraceTags,
			apmToTraceQuery,
			safeNavigate,
		});
	};

	return (
		<Tooltip placement="topLeft" title={text}>
			<Typography.Link onClick={handleOnClick(text)}>{text}</Typography.Link>
		</Tooltip>
	);
}

interface LinkColumnProps {
	servicename: string;
	minTime: number;
	maxTime: number;
	selectedTraceTags: string;
	record: RowData;
}

export default ColumnWithLink;
