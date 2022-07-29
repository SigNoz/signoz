import { blue, orange } from '@ant-design/colors';
import { Card, Typography } from 'antd';
import { map } from 'd3';
import { FlatLogData } from 'lib/logs/flatLogData';
import { flatMap, flatMapDeep } from 'lodash-es';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import ILogsReducer from 'types/reducer/logs';

import AddToQueryHOC from './AddToQueryHOC';
import CopyClipboardHOC from './CopyClipboardHOC';
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
			<CopyClipboardHOC textToCopy={fieldValue}>
				<Typography.Text ellipsis>
					{': '}
					{fieldValue}
				</Typography.Text>
			</CopyClipboardHOC>
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
			{/* <AddToQueryHOC fieldKey={fieldKey} fieldValue={fieldValue}> */}
			<Typography.Text>
				{`"`}
				<span style={{ color: blue[4] }}>{fieldKey}</span>
				{`"`}
			</Typography.Text>
			{/* </AddToQueryHOC> */}
			<CopyClipboardHOC textToCopy={fieldValue}>
				<Typography.Text ellipsis>
					<span>
						{': '}
						{typeof fieldValue === 'string' && `"`}
					</span>
					<span style={{ color: orange[6] }}>{fieldValue}</span>
					{typeof fieldValue === 'string' && `"`}
				</Typography.Text>
			</CopyClipboardHOC>
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
