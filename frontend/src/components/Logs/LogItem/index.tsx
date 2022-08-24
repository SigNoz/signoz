import { blue, grey, orange } from '@ant-design/colors';
import { CopyFilled, ExpandAltOutlined } from '@ant-design/icons';
import { Button, Divider, Row, Typography } from 'antd';
import { map } from 'd3';
import dayjs from 'dayjs';
import { FlatLogData } from 'lib/logs/flatLogData';
import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCopyToClipboard } from 'react-use';
import { AppState } from 'store/reducers';
import { SET_DETAILED_LOG_DATA } from 'types/actions/logs';
import { ILog } from 'types/api/logs/log';
import { ILogsReducer } from 'types/reducer/logs';

import AddToQueryHOC from '../AddToQueryHOC';
import CopyClipboardHOC from '../CopyClipboardHOC';
import { Container } from './styles';
import { isValidLogField } from './util';

interface LogFieldProps {
	fieldKey: string;
	fieldValue: string;
}
function LogGeneralField({ fieldKey, fieldValue }: LogFieldProps): JSX.Element {
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
function LogSelectedField({
	fieldKey = '',
	fieldValue = '',
}: LogFieldProps): JSX.Element {
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

interface LogItemProps {
	logData: ILog;
}
function LogItem({ logData }: LogItemProps): JSX.Element {
	const {
		fields: { selected },
	} = useSelector<AppState, ILogsReducer>((state) => state.logs);
	const dispatch = useDispatch();
	const flattenLogData = useMemo(() => FlatLogData(logData), [logData]);
	const [, setCopy] = useCopyToClipboard();

	const handleDetailedView = useCallback(() => {
		dispatch({
			type: SET_DETAILED_LOG_DATA,
			payload: logData,
		});
	}, [dispatch, logData]);

	const handleCopyJSON = (): void => {
		setCopy(JSON.stringify(logData, null, 2));
	};
	return (
		<Container>
			<div style={{ maxWidth: '100%' }}>
				<div>
					{'{'}
					<div style={{ marginLeft: '0.5rem' }}>
						<LogGeneralField
							fieldKey="log"
							fieldValue={flattenLogData.body as never}
						/>
						{flattenLogData.stream && (
							<LogGeneralField
								fieldKey="stream"
								fieldValue={flattenLogData.stream as never}
							/>
						)}
						<LogGeneralField
							fieldKey="timestamp"
							fieldValue={dayjs((flattenLogData.timestamp as never) / 1e6).format()}
						/>
					</div>
					{'}'}
				</div>
				<div>
					{map(selected, (field) => {
						return isValidLogField(flattenLogData[field.name] as never) ? (
							<LogSelectedField
								key={field.name}
								fieldKey={field.name}
								fieldValue={flattenLogData[field.name] as never}
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
