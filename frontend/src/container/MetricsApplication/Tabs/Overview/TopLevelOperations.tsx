import { Typography } from 'antd';
import axios from 'axios';
import Spinner from 'components/Spinner';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import Graph from 'container/GridGraphLayout/Graph/';
import { Card, GraphContainer } from 'container/MetricsApplication/styles';
import { Widgets } from 'types/api/dashboard/getAll';

import { ClickHandlerType } from '../Overview';

function TopLevelOperation({
	name,
	opName,
	topLevelOperationsIsError,
	topLevelOperationsError,
	topLevelOperationsLoading,
	onDragSelect,
	handleGraphClick,
	widget,
	yAxisUnit,
}: TopLevelOperationProps): JSX.Element {
	return (
		<Card>
			{topLevelOperationsIsError ? (
				<Typography>
					{axios.isAxiosError(topLevelOperationsError)
						? topLevelOperationsError.response?.data
						: SOMETHING_WENT_WRONG}
				</Typography>
			) : (
				<GraphContainer>
					{topLevelOperationsLoading && (
						<Spinner size="large" tip="Loading..." height="40vh" />
					)}
					{!topLevelOperationsLoading && (
						<Graph
							name={name}
							widget={widget}
							onClickHandler={handleGraphClick(opName)}
							yAxisUnit={yAxisUnit}
							onDragSelect={onDragSelect}
							allowClone={false}
							allowDelete={false}
							allowEdit={false}
						/>
					)}
				</GraphContainer>
			)}
		</Card>
	);
}

interface TopLevelOperationProps {
	name: string;
	opName: string;
	topLevelOperationsIsError: boolean;
	topLevelOperationsError: unknown;
	topLevelOperationsLoading: boolean;
	onDragSelect: (start: number, end: number) => void;
	handleGraphClick: (type: string) => ClickHandlerType;
	widget: Widgets;
	yAxisUnit: string;
}

export default TopLevelOperation;
