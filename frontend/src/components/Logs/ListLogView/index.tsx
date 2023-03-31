import { blue, grey, orange } from '@ant-design/colors';
import { CopyFilled, ExpandAltOutlined } from '@ant-design/icons';
import Convert from 'ansi-to-html';
import { Button, Divider, Row, Typography } from 'antd';
import { map } from 'd3';
import dayjs from 'dayjs';
import dompurify from 'dompurify';
import { useNotifications } from 'hooks/useNotifications';
// utils
import { FlatLogData } from 'lib/logs/flatLogData';
import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCopyToClipboard } from 'react-use';
// interfaces
import { AppState } from 'store/reducers';
import { SET_DETAILED_LOG_DATA } from 'types/actions/logs';
import { ILog } from 'types/api/logs/log';
import { ILogsReducer } from 'types/reducer/logs';

// components
import AddToQueryHOC from '../AddToQueryHOC';
import CopyClipboardHOC from '../CopyClipboardHOC';
// styles
import {
	Container,
	LogContainer,
	LogText,
	SelectedLog,
	Text,
	TextContainer,
} from './styles';
import { isValidLogField } from './util';

const convert = new Convert();

interface LogFieldProps {
	fieldKey: string;
	fieldValue: string;
}
function LogGeneralField({ fieldKey, fieldValue }: LogFieldProps): JSX.Element {
	const html = useMemo(
		() => ({
			__html: convert.toHtml(dompurify.sanitize(fieldValue)),
		}),
		[fieldValue],
	);

	return (
		<TextContainer>
			<Text ellipsis type="secondary">
				{`${fieldKey}: `}
			</Text>
			<CopyClipboardHOC textToCopy={fieldValue}>
				<LogText dangerouslySetInnerHTML={html} />
			</CopyClipboardHOC>
		</TextContainer>
	);
}

function LogSelectedField({
	fieldKey = '',
	fieldValue = '',
}: LogFieldProps): JSX.Element {
	return (
		<SelectedLog>
			<AddToQueryHOC fieldKey={fieldKey} fieldValue={fieldValue}>
				<Typography.Text>
					<span style={{ color: blue[4] }}>{fieldKey}</span>
				</Typography.Text>
			</AddToQueryHOC>
			<CopyClipboardHOC textToCopy={fieldValue}>
				<Typography.Text ellipsis>
					<span>{': '}</span>
					<span style={{ color: orange[6] }}>{fieldValue || "''"}</span>
				</Typography.Text>
			</CopyClipboardHOC>
		</SelectedLog>
	);
}

interface ListLogViewProps {
	logData: ILog;
}
function ListLogView({ logData }: ListLogViewProps): JSX.Element {
	const {
		fields: { selected },
	} = useSelector<AppState, ILogsReducer>((state) => state.logs);

	const dispatch = useDispatch();
	const flattenLogData = useMemo(() => FlatLogData(logData), [logData]);

	const [, setCopy] = useCopyToClipboard();
	const { notifications } = useNotifications();

	const handleDetailedView = useCallback(() => {
		dispatch({
			type: SET_DETAILED_LOG_DATA,
			payload: logData,
		});
	}, [dispatch, logData]);

	const handleCopyJSON = (): void => {
		setCopy(JSON.stringify(logData, null, 2));
		notifications.success({
			message: 'Copied to clipboard',
		});
	};

	const updatedSelecedFields = useMemo(
		() => selected.filter((e) => e.name !== 'id'),
		[selected],
	);

	return (
		<Container>
			<div>
				<LogContainer>
					<>
						<LogGeneralField fieldKey="log" fieldValue={flattenLogData.body} />
						{flattenLogData.stream && (
							<LogGeneralField fieldKey="stream" fieldValue={flattenLogData.stream} />
						)}
						<LogGeneralField
							fieldKey="timestamp"
							fieldValue={dayjs((flattenLogData.timestamp as never) / 1e6).format()}
						/>
					</>
				</LogContainer>
				<div>
					{map(updatedSelecedFields, (field) =>
						isValidLogField(flattenLogData[field.name] as never) ? (
							<LogSelectedField
								key={field.name}
								fieldKey={field.name}
								fieldValue={flattenLogData[field.name] as never}
							/>
						) : null,
					)}
				</div>
			</div>
			<Divider style={{ padding: 0, margin: '0.4rem 0', opacity: 0.5 }} />
			<Row>
				<Button
					size="small"
					type="text"
					onClick={handleDetailedView}
					style={{ color: blue[5] }}
					icon={<ExpandAltOutlined />}
				>
					View Details
				</Button>
				<Button
					size="small"
					type="text"
					onClick={handleCopyJSON}
					style={{ color: grey[1] }}
					icon={<CopyFilled />}
				>
					Copy JSON
				</Button>
			</Row>
		</Container>
	);
}

export default ListLogView;
