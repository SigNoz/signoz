import * as Sentry from '@sentry/react';
import { Button, Typography } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { useParams, useHistory } from 'react-router-dom';
import { useQuery } from 'react-query';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { getAttributesValues } from 'api/queryBuilder/getAttributesValues';
import { DataSource } from 'types/common/queryBuilder';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { SessionRecording } from '../types';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { PANEL_TYPES, initialQueriesMap } from 'constants/queryBuilder';
import RRWebPlayer from '../RRWebPlayer';
import React from 'react';

import './styles.scss';
import ROUTES from 'constants/routes';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

const { Title, Text, Paragraph } = Typography;

export default function SessionDetail(): JSX.Element {
	const { stagedQuery } = useQueryBuilder();
	const { sessionId } = useParams<{ sessionId: string }>();
	const history = useHistory();

	// Fetch session-related logs data using useGetQueryRange
	const {
		data: sessionLogsData,
		isLoading: isSessionLogsLoading,
	} = useGetQueryRange(
		{
			query: stagedQuery || initialQueriesMap.logs,
			graphType: PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			globalSelectedInterval: '3d',
			params: {
				dataSource: DataSource.LOGS,
			},
			formatForWeb: false,
		},
		ENTITY_VERSION_V5,
		{
			queryKey: ['sessionLogs', sessionId],
			enabled: !!sessionId && !!stagedQuery,
		},
	);

	console.log({ sessionLogsData });

	// Extract body fields from session logs data
	const sessionEvents = React.useMemo(() => {
		if (!sessionLogsData?.payload?.data?.newResult?.data?.result?.[0]?.list) {
			return [];
		}

		return sessionLogsData.payload.data.newResult.data.result[0].list
			.map((row: any) => {
				// Try to extract body field from different possible locations
				const body =
					row.data?.body || row.data?.message || row.data?.log || row.data;

				// If body is a string, try to parse it as JSON
				if (typeof body === 'string') {
					try {
						return JSON.parse(body);
					} catch {
						// If parsing fails, return the string as is
						return body;
					}
				}

				return body;
			})
			.filter(Boolean); // Remove any undefined/null values
	}, [sessionLogsData]);

	const handleBack = (): void => {
		history.push(ROUTES.SESSION_RECORDINGS);
	};

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className="session-detail-page">
				<div className="page-header">
					<div className="header-content">
						<Button
							type="text"
							icon={<ArrowLeft size={16} />}
							onClick={handleBack}
							className="back-button"
						>
							Back to Sessions
						</Button>
						<Title level={2} className="page-title">
							Session Recording: {sessionId}
						</Title>
						<Text type="secondary" className="page-description">
							Detailed view of session recording and metadata
						</Text>
					</div>
				</div>

				<div className="page-content">
					{/* Display RRWebPlayer with session events */}
					{isSessionLogsLoading ? (
						<div>Loading session logs...</div>
					) : sessionEvents.length > 0 ? (
						<div>
							<h3>Session Recording Player</h3>
							<div style={{ marginBottom: '16px' }}>
								<strong>Total Events: {sessionEvents.length}</strong>
							</div>
							<RRWebPlayer
								events={sessionEvents}
								options={{
									autoPlay: false,
								}}
							/>
						</div>
					) : (
						<div>No session events available</div>
					)}
				</div>
			</div>
		</Sentry.ErrorBoundary>
	);
}
