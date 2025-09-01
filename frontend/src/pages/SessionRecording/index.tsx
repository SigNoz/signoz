import * as Sentry from '@sentry/react';
import { Button, Card, Typography } from 'antd';
import { PlayCircle } from 'lucide-react';
import { useQuery } from 'react-query';
import { useHistory } from 'react-router-dom';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { ResizeTable } from 'components/ResizeTable';
import { getAttributesValues } from 'api/queryBuilder/getAttributesValues';
import { DataSource } from 'types/common/queryBuilder';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { SessionRecording } from './types';
import { useMemo } from 'react';

import './styles.scss';

const { Title, Text } = Typography;

export default function SessionRecordings(): JSX.Element {
	const history = useHistory();

	// Use React Query to fetch session attributes
	const { data: sessionAttributes, isLoading, error } = useQuery({
		queryKey: ['sessionAttributes', 'rum.sessionId'],
		queryFn: () =>
			getAttributesValues({
				aggregateOperator: 'noop',
				dataSource: DataSource.LOGS,
				aggregateAttribute: '',
				attributeKey: 'rum.sessionId',
				searchText: '',
				filterAttributeKeyDataType: DataTypes.String,
				tagType: 'resource',
			}),
		staleTime: 5 * 60 * 1000, // 5 minutes
		cacheTime: 10 * 60 * 1000, // 10 minutes
	});

	const getQueryParams = (sessionId: string) => {
		const compositeQuery = `compositeQuery=%257B%2522queryType%2522%253A%2522builder%2522%252C%2522builder%2522%253A%257B%2522queryData%2522%253A%255B%257B%2522dataSource%2522%253A%2522logs%2522%252C%2522queryName%2522%253A%2522A%2522%252C%2522aggregateOperator%2522%253A%2522count%2522%252C%2522aggregateAttribute%2522%253A%257B%2522id%2522%253A%2522----%2522%252C%2522dataType%2522%253A%2522%2522%252C%2522key%2522%253A%2522%2522%252C%2522type%2522%253A%2522%2522%257D%252C%2522timeAggregation%2522%253A%2522rate%2522%252C%2522spaceAggregation%2522%253A%2522sum%2522%252C%2522filter%2522%253A%257B%2522expression%2522%253A%2522rum.sessionId%2520%253D%2520%27${sessionId}%27%2520%2522%257D%252C%2522aggregations%2522%253A%255B%257B%2522expression%2522%253A%2522count%28%29%2520%2522%257D%255D%252C%2522functions%2522%253A%255B%255D%252C%2522filters%2522%253A%257B%2522items%2522%253A%255B%255D%252C%2522op%2522%253A%2522AND%2522%257D%252C%2522expression%2522%253A%2522A%2522%252C%2522disabled%2522%253Afalse%252C%2522stepInterval%2522%253Anull%252C%2522having%2522%253A%257B%2522expression%2522%253A%2522%2522%257D%252C%2522limit%2522%253Anull%252C%2522orderBy%2522%253A%255B%255D%252C%2522groupBy%2522%253A%255B%255D%252C%2522legend%2522%253A%2522%2522%252C%2522reduceTo%2522%253A%2522avg%2522%252C%2522source%2522%253A%2522%2522%257D%255D%252C%2522queryFormulas%2522%253A%255B%255D%257D%252C%2522promql%2522%253A%255B%257B%2522name%2522%253A%2522A%2522%252C%2522query%2522%253A%2522%2522%252C%2522legend%2522%253A%2522%2522%252C%2522disabled%2522%253Afalse%257D%255D%252C%2522clickhouse_sql%2522%253A%255B%257B%2522name%2522%253A%2522A%2522%252C%2522legend%2522%253A%2522%2522%252C%2522disabled%2522%253Afalse%252C%2522query%2522%253A%2522%2522%257D%255D%252C%2522id%2522%253A%25226a102b3b-cb6b-4409-9e57-317f9ecb941b%2522%257D&options=%7B%22selectColumns%22%3A%5B%7B%22name%22%3A%22timestamp%22%2C%22signal%22%3A%22logs%22%2C%22fieldContext%22%3A%22log%22%2C%22fieldDataType%22%3A%22%22%2C%22isIndexed%22%3Afalse%7D%2C%7B%22name%22%3A%22body%22%2C%22signal%22%3A%22logs%22%2C%22fieldContext%22%3A%22log%22%2C%22fieldDataType%22%3A%22%22%2C%22isIndexed%22%3Afalse%7D%5D%2C%22maxLines%22%3A2%2C%22format%22%3A%22raw%22%2C%22fontSize%22%3A%22small%22%7D`;
		return compositeQuery;
	};

	// Transform API response to table data
	const sessionRecordings: SessionRecording[] = useMemo(() => {
		if (
			sessionAttributes?.statusCode === 200 &&
			sessionAttributes.payload?.stringAttributeValues
		) {
			return sessionAttributes.payload.stringAttributeValues.map(
				(sessionId: string, index: number) => ({
					id: String(index + 1),
					sessionId,
					userName: 'anonymous',
					userAgent: 'Mozilla/5.0 (Unknown)',
					startTime: new Date().toISOString(), // You can extract timestamp from sessionId if available
					duration: 0,
					pageViews: 0,
					country: 'Unknown',
					city: 'Unknown',
					device: 'Unknown',
					browser: 'Unknown',
					os: 'Unknown',
					status: 'completed' as const,
					hasErrors: false,
					recordingUrl: `/session/${sessionId}?${getQueryParams(sessionId)}`,
				}),
			);
		}
		return [];
	}, [sessionAttributes]);

	// Log the response for debugging
	if (sessionAttributes && sessionAttributes.statusCode === 200) {
		console.log('Session attributes fetched:', sessionAttributes.payload);
	}

	if (error) {
		console.error('Error fetching session attributes:', error);
	}

	const handleSessionClick = (record: SessionRecording): void => {
		history.push(
			`/session-recordings/${record.sessionId}?${getQueryParams(
				record.sessionId,
			)}`,
		);
	};

	const handlePlayClick = (
		e: React.MouseEvent,
		record: SessionRecording,
	): void => {
		e.stopPropagation();
		history.push(
			`/session-recordings/${record.sessionId}?${getQueryParams(
				record.sessionId,
			)}`,
		);
	};

	const columns = [
		{
			title: 'Session Name',
			dataIndex: 'sessionId',
			key: 'sessionId',
			width: 200,
			render: (sessionId: string) => <Text strong>{sessionId}</Text>,
		},
		{
			title: 'Actions',
			key: 'actions',
			width: 100,
			render: (_: any, record: SessionRecording) => (
				<Button
					type="primary"
					size="small"
					icon={<PlayCircle size={14} />}
					onClick={(e) => handlePlayClick(e, record)}
					className="play-button"
				>
					Play
				</Button>
			),
		},
	];

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className="session-recordings-page">
				<div className="page-header">
					<div className="header-content">
						<Title level={2} className="page-title">
							Session Recordings
						</Title>
						<Text type="secondary" className="page-description">
							Click play to view session recordings
						</Text>
					</div>
				</div>

				<div className="page-content">
					<Card className="table-card">
						<ResizeTable
							columns={columns}
							dataSource={sessionRecordings}
							rowKey="id"
							loading={isLoading}
							pagination={{
								pageSize: 10,
								showSizeChanger: true,
								showQuickJumper: true,
								showTotal: (total, range) =>
									`${range[0]}-${range[1]} of ${total} recordings`,
							}}
							className="session-recordings-table"
							onRow={(record) => ({
								onClick: () => handleSessionClick(record),
								className: 'clickable-row',
							})}
						/>
					</Card>
				</div>
			</div>
		</Sentry.ErrorBoundary>
	);
}
