import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { useHistory} from 'react-router-dom';
import { Space, Table } from 'antd';
import ROUTES from 'Src/constants/routes';

import { traceResponseNew, fetchTraces, pushDStree } from '../../store/actions';
import { StoreState } from '../../store/reducers';
import { isOnboardingSkipped } from '../../utils/app';
import moment from 'moment';
import styled from 'styled-components';

const StyledTable = styled(Table)`
	cursor: pointer;
`;

const TraceHeader = styled.div`
	margin: 16px 0;
`;

interface TraceListProps {
	traces: traceResponseNew;
	fetchTraces: Function;
}

interface TableDataSourceItem {
	key: string;
	spanid: string;
	traceid: string;
	operationName: string;
	startTime: number;
	duration: number;
	service: string;
}

const _TraceList = (props: TraceListProps) => {
	// PNOTE (TO DO) - Currently this use of useEffect gives warning. May need to memoise fetchtraces - https://stackoverflow.com/questions/55840294/how-to-fix-missing-dependency-warning-when-using-useeffect-react-hook
	const history = useHistory();

	useEffect(() => {
		props.fetchTraces();
	}, []);

	const columns: any = [
		{
			title: 'Start Time',
			dataIndex: 'startTime',
			key: 'startTime',
			sorter: (a: any, b: any) => a.startTime - b.startTime,
			sortDirections: ['descend', 'ascend'],
			render: (value: number) => moment(value).format('YYYY-MM-DD hh:mm:ss'),

			// new Date() assumes input in milliseconds. Start Time stamp returned by druid api for span list is in ms
		},
		{
			title: 'Service',
			dataIndex: 'service',
			key: 'service',
		},
		{
			title: 'Operation',
			dataIndex: 'operationName',
			key: 'operationName',
		},
		{
			title: 'Duration (in ms)',
			dataIndex: 'duration',
			key: 'duration',
			sorter: (a: any, b: any) => a.duration - b.duration,
			sortDirections: ['descend', 'ascend'],
			render: (value: number) => (value / 1000000).toFixed(2),
		},
	];

	const dataSource: TableDataSourceItem[] = [];

	const renderTraces = () => {
		if (
			typeof props.traces[0] !== 'undefined' &&
			props.traces[0].events.length > 0
		) {
			props.traces[0].events.map(
				(item: (number | string | string[] | pushDStree[])[], index) => {
					if (
						typeof item[0] === 'number' &&
						typeof item[4] === 'string' &&
						typeof item[6] === 'string' &&
						typeof item[1] === 'string' &&
						typeof item[2] === 'string' &&
						typeof item[3] === 'string'
					)
						dataSource.push({
							startTime: item[0],
							operationName: item[4],
							duration: parseInt(item[6]),
							spanid: item[1],
							traceid: item[2],
							key: index.toString(),
							service: item[3],
						});
				},
			);

			//antd table in typescript - https://codesandbox.io/s/react-typescript-669cv

			return <StyledTable
				dataSource={dataSource}
				columns={columns}
				size="middle"
				rowClassName=""
				onRow={(record) => ({
					onClick: () => {
						history.push({
							pathname: ROUTES.TRACES + '/' + record.traceid,
							state: {
								spanId: record.spanid,
							},
						});
					}
				})}
			/>
			;
		} else {
			if (isOnboardingSkipped()) {
				return (
					<Space
						style={{ width: '100%', margin: '40px 0', justifyContent: 'center' }}
					>
						No spans found. Please add instrumentation (follow this
						<a
							href={'https://signoz.io/docs/instrumentation/overview'}
							target={'_blank'}
							style={{ marginLeft: 3 }} rel="noreferrer"
						>
							guide
						</a>
						)
					</Space>
				);
			}
			return <div> No spans found for given filter!</div>;
		}
	}; // end of renderTraces

	return (
		<div>
			<TraceHeader>List of filtered spans</TraceHeader>
			<div>{renderTraces()}</div>
		</div>
	);
};

const mapStateToProps = (state: StoreState): { traces: traceResponseNew } => {
	return { traces: state.traces };
};

export const TraceList = connect(mapStateToProps, {
	fetchTraces: fetchTraces,
})(_TraceList);
