import { blue, grey, orange } from '@ant-design/colors';
import {
	CopyFilled,
	ExpandAltOutlined,
	LinkOutlined,
	MonitorOutlined,
} from '@ant-design/icons';
import Convert from 'ansi-to-html';
import { Button, Divider, Row, Typography } from 'antd';
import dayjs from 'dayjs';
import dompurify from 'dompurify';
import useCopyLogLink from 'hooks/useCopyLogLink';
import { useNotifications } from 'hooks/useNotifications';
// utils
import { FlatLogData } from 'lib/logs/flatLogData';
import { useCallback, useMemo } from 'react';
import { useCopyToClipboard } from 'react-use';
// interfaces
import { IField } from 'types/api/logs/fields';
import { ILog } from 'types/api/logs/log';

// components
import AddToQueryHOC, { AddToQueryHOCProps } from '../AddToQueryHOC';
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

type LogSelectedFieldProps = LogFieldProps &
	Pick<AddToQueryHOCProps, 'onAddToQuery'>;

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
	onAddToQuery,
}: LogSelectedFieldProps): JSX.Element {
	return (
		<SelectedLog>
			<AddToQueryHOC
				fieldKey={fieldKey}
				fieldValue={fieldValue}
				onAddToQuery={onAddToQuery}
			>
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

type ListLogViewProps = {
	logData: ILog;
	onOpenDetailedView: (log: ILog) => void;
	onOpenLogsContext?: (log: ILog) => void;
	selectedFields: IField[];
} & Pick<AddToQueryHOCProps, 'onAddToQuery'>;

function ListLogView({
	logData,
	selectedFields,
	onOpenDetailedView,
	onOpenLogsContext,
	onAddToQuery,
}: ListLogViewProps): JSX.Element {
	const flattenLogData = useMemo(() => FlatLogData(logData), [logData]);

	const [, setCopy] = useCopyToClipboard();
	const { notifications } = useNotifications();
	const { isLogsExplorerPage, onLogCopy } = useCopyLogLink(logData.id);

	const handleDetailedView = useCallback(() => {
		onOpenDetailedView(logData);
	}, [logData, onOpenDetailedView]);

	const handleShowContext = useCallback(() => {
		if (!onOpenLogsContext) return;

		onOpenLogsContext(logData);
	}, [logData, onOpenLogsContext]);

	const handleCopyJSON = (): void => {
		setCopy(JSON.stringify(logData, null, 2));
		notifications.success({
			message: 'Copied to clipboard',
		});
	};

	const updatedSelecedFields = useMemo(
		() => selectedFields.filter((e) => e.name !== 'id'),
		[selectedFields],
	);

	const timestampValue = useMemo(
		() =>
			typeof flattenLogData.timestamp === 'string'
				? dayjs(flattenLogData.timestamp).format()
				: dayjs(flattenLogData.timestamp / 1e6).format(),
		[flattenLogData.timestamp],
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
						<LogGeneralField fieldKey="timestamp" fieldValue={timestampValue} />
					</>
				</LogContainer>
				<div>
					{updatedSelecedFields.map((field) =>
						isValidLogField(flattenLogData[field.name] as never) ? (
							<LogSelectedField
								key={field.name}
								fieldKey={field.name}
								fieldValue={flattenLogData[field.name] as never}
								onAddToQuery={onAddToQuery}
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

				{isLogsExplorerPage && (
					<>
						<Button
							size="small"
							type="text"
							onClick={handleShowContext}
							style={{ color: grey[1] }}
							icon={<MonitorOutlined />}
						>
							Show in Context
						</Button>
						<Button
							size="small"
							type="text"
							onClick={onLogCopy}
							style={{ color: grey[1] }}
							icon={<LinkOutlined />}
						>
							Copy Link
						</Button>
					</>
				)}
			</Row>
		</Container>
	);
}

ListLogView.defaultProps = {
	onOpenLogsContext: undefined,
};

export default ListLogView;
