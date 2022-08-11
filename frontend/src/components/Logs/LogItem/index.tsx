import { blue, grey, orange } from '@ant-design/colors';
import { CopyFilled, CopyrightCircleFilled, ExpandAltOutlined } from '@ant-design/icons';
import { Button, Card, Divider, Row, Typography } from 'antd';
import { map } from 'd3';
import { FlatLogData } from 'lib/logs/flatLogData';
import { flatMap, flatMapDeep } from 'lodash-es';
import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCopyToClipboard } from 'react-use';
import { AppState } from 'store/reducers';
import { SET_DETAILED_LOG_DATA } from 'types/actions/logs';
import ILogsReducer from 'types/reducer/logs';

import AddToQueryHOC from '../AddToQueryHOC';
import CopyClipboardHOC from '../CopyClipboardHOC';
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
			<AddToQueryHOC fieldKey={fieldKey} fieldValue={fieldValue}>
				<Typography.Text>
					{`"`}
					<span style={{ color: blue[4] }}>{fieldKey}</span>
					{`"`}
				</Typography.Text>
			</AddToQueryHOC>
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
	const dispatch = useDispatch();
	const flattenLogData = useMemo(() => FlatLogData(logData), [logData]);
	const [_state, setCopy] = useCopyToClipboard();

	const handleDetailedView = useCallback(() => {
		dispatch({
			type: SET_DETAILED_LOG_DATA,
			payload: logData,
		});
	}, [dispatch, logData]);

	const handleCopyJSON = () => {
		setCopy(JSON.stringify(logData, null, 2))
	}
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
			<Divider style={{ padding: 0, margin: '0.4rem 0', opacity: 0.5 }} />
			<Row>
				<Button
					size="small"
					type="text"
					onClick={handleDetailedView}
					style={{ color: blue[5], padding: 0, margin: 0 }}
				>
					{' '}
					<ExpandAltOutlined /> View Details
				</Button>
				<Button
					size="small"
					type="text"
					onClick={handleCopyJSON}
					style={{ padding: 0, margin: 0, color: grey[1] }}
				>
					{' '}
					<CopyFilled /> Copy JSON
				</Button>
			</Row>
		</Container>
	);
}

export default LogItem;
