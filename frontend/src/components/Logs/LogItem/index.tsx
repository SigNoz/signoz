import { blue, orange } from '@ant-design/colors';
import { Card, Typography } from 'antd';
import { map } from 'd3';
import { FlatLogData } from 'lib/logs/flatLogData';
import { flatMap, flatMapDeep } from 'lodash-es';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import ILogsReducer from 'types/reducer/logs';

import { Container } from './styles';

function LogGeneralField({ fieldKey, fieldValue }) {
	return (
		<div
			style={{
				display: 'flex',
				overflow: 'hidden',
				width: '100%',
			}}
		>
			<Typography.Text type="secondary">{fieldKey}</Typography.Text>
			<Typography.Text ellipsis>
				{': '}
				{fieldValue}
			</Typography.Text>
		</div>
	);
}

function LogSelectedField({ fieldKey = '', fieldValue = '' }) {
	return (
		<div
			style={{
				display: 'flex',
				overflow: 'hidden',
				width: '100%',
			}}
		>
			<Typography.Text style={{ color: blue[4] }}>{fieldKey}</Typography.Text>
			<Typography.Text ellipsis>
				<span>{': '}</span>
				<span style={{ color: orange[6] }}>{fieldValue}</span>
			</Typography.Text>
		</div>
	);
}

function LogItem({ logData }) {
	const {
		fields: { selected },
	} = useSelector<AppState, ILogsReducer>((state) => state.logs);

	const flattenLogData = FlatLogData(logData);
	console.log(flattenLogData);


	return (
		<Container>
			<div style={{ maxWidth: '100%' }}>
				<div>
					{'{'}
					<div style={{ marginLeft: '0.5rem' }}>
						<LogGeneralField fieldKey="log" fieldValue={flattenLogData.body} />
						{flattenLogData.stream && (
							<LogGeneralField fieldKey="stream" fieldValue={flattenLogData.stream} />
						)}
						<LogGeneralField
							fieldKey="timestamp"
							fieldValue={flattenLogData.timestamp}
						/>
					</div>
					{'}'}
				</div>
				<div>
					{map(selected, (field) => {
						return flattenLogData[field.name] ? (
							<LogSelectedField
								key={field.name}
								fieldKey={field.name}
								fieldValue={flattenLogData[field.name]}
							/>
						) : null;
					})}
				</div>
			</div>
		</Container>
	);
}

export default LogItem;
