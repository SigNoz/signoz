import { Tooltip, Typography } from 'antd';
import { navigateToTrace } from 'container/MetricsApplication/utils';
import { RowData } from 'lib/query/createTableColumnsFromQuery';

function ColumnWithLink({
	servicename,
	minTime,
	maxTime,
	selectedTraceTags,
	record,
}: LinkColumnProps): JSX.Element {
	const text = record.toString();

	const handleOnClick = (operation: string) => (): void => {
		navigateToTrace({
			servicename,
			operation,
			minTime,
			maxTime,
			selectedTraceTags,
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
