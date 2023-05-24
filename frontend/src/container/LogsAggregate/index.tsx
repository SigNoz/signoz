import { blue } from '@ant-design/colors';
import Graph from 'components/Graph';
import Spinner from 'components/Spinner';
import dayjs from 'dayjs';
import useInterval from 'hooks/useInterval';
import getStep from 'lib/getStep';
import { useMemo } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { getLogsAggregate } from 'store/actions/logs/getLogsAggregate';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { ILogsReducer } from 'types/reducer/logs';

import { Container } from './styles';

function LogsAggregate({ getLogsAggregate }: DispatchProps): JSX.Element {
	const {
		searchFilter: { queryString },
		idEnd,
		idStart,
		isLoadingAggregate,
		logsAggregate,
		liveTail,
		liveTailStartRange,
	} = useSelector<AppState, ILogsReducer>((state) => state.logs);

	useInterval(
		() => {
			const startTime =
				dayjs().subtract(liveTailStartRange, 'minute').valueOf() * 1e6;

			const endTime = dayjs().valueOf() * 1e6;

			getLogsAggregate({
				timestampStart: startTime,
				timestampEnd: endTime,
				step: getStep({
					start: startTime,
					end: endTime,
					inputFormat: 'ns',
				}),
				q: queryString,
				...(idStart ? { idGt: idStart } : {}),
				...(idEnd ? { idLt: idEnd } : {}),
			});
		},
		60000,
		liveTail === 'PLAYING',
	);

	const graphData = useMemo(
		() => ({
			labels: logsAggregate.map((s) => new Date(s.timestamp / 1000000)),
			datasets: [
				{
					data: logsAggregate.map((s) => s.value),
					backgroundColor: blue[4],
				},
			],
		}),
		[logsAggregate],
	);

	return (
		<Container>
			{isLoadingAggregate ? (
				<Spinner size="default" height="100%" />
			) : (
				<Graph
					name="usage"
					data={graphData}
					type="bar"
					containerHeight="100%"
					animate
				/>
			)}
		</Container>
	);
}

interface DispatchProps {
	getLogsAggregate: typeof getLogsAggregate;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getLogsAggregate: bindActionCreators(getLogsAggregate, dispatch),
});

export default connect(null, mapDispatchToProps)(LogsAggregate);
