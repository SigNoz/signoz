import React from 'react';

import Graph from 'components/Graph';
import { Chart } from 'chart.js';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceReducer } from 'types/reducer/trace';
import Spinner from 'components/Spinner';
import { Container } from './styles';
import { Typography } from 'antd';

const TraceGraph = () => {
	const { spansGraph } = useSelector<AppState, TraceReducer>(
		(state) => state.traces,
	);

	const { loading, error, errorMessage } = spansGraph;

	const data: Chart['data'] = { datasets: [], labels: [] };

	if (loading) {
		return (
			<Container>
				<Spinner height={'20vh'} size="small" tip="Loading..." />
			</Container>
		);
	}

	if (error) {
		return (
			<Container center>
				<Typography>{errorMessage || 'Something went wrong'}</Typography>
			</Container>
		);
	}

	return (
		<Container>
			{
				<Graph
					{...{
						data: data,
						name: 'asd',
						type: 'line',
					}}
				/>
			}
		</Container>
	);
};

export default TraceGraph;
