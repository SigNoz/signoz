import './styles.scss';

import { Button, Divider, Space, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import getNextPrevId from 'api/errors/getNextPrevId';
import Editor from 'components/Editor';
import { ResizeTable } from 'components/ResizeTable';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { getNanoSeconds } from 'container/AllError/utils';
import { useNotifications } from 'hooks/useNotifications';
import createQueryParams from 'lib/createQueryParams';
import history from 'lib/history';
import { isUndefined } from 'lodash-es';
import { urlKey } from 'pages/ErrorDetails/utils';
import { useTimezone } from 'providers/Timezone';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { useLocation } from 'react-router-dom';
import { PayloadProps as GetByErrorTypeAndServicePayload } from 'types/api/errors/getByErrorTypeAndService';

import { keyToExclude } from './config';
import { DashedContainer, EditorContainer, EventContainer } from './styles';

function ErrorDetails(props: ErrorDetailsProps): JSX.Element {
	const { idPayload } = props;
	const { t } = useTranslation(['errorDetails', 'common']);
	const { search, pathname } = useLocation();

	const params = useMemo(() => new URLSearchParams(search), [search]);

	const errorId = params.get(urlKey.errorId);
	const serviceName = params.get(urlKey.serviceName);
	const errorType = params.get(urlKey.exceptionType);
	const timestamp = params.get(urlKey.timestamp);

	const { data: nextPrevData, status: nextPrevStatus } = useQuery(
		[
			idPayload.errorId,
			idPayload.groupID,
			idPayload.timestamp,
			errorId,
			serviceName,
			errorType,
			timestamp,
		],
		{
			queryFn: () =>
				getNextPrevId({
					errorID: errorId || idPayload.errorId,
					groupID: idPayload.groupID,
					timestamp: timestamp || getNanoSeconds(idPayload.timestamp),
				}),
		},
	);

	const errorDetail = idPayload;

	const [stackTraceValue] = useState(errorDetail.exceptionStacktrace);

	const columns = useMemo(
		() => [
			{
				title: 'Key',
				width: 100,
				dataIndex: 'key',
				key: 'key',
			},
			{
				title: 'Value',
				dataIndex: 'value',
				width: 100,
				key: 'value',
			},
		],
		[],
	);

	const { notifications } = useNotifications();

	const onClickErrorIdHandler = async (
		id: string,
		timestamp: string,
	): Promise<void> => {
		try {
			if (id.length === 0) {
				notifications.error({
					message: 'Error Id cannot be empty',
				});
				return;
			}

			const queryParams = {
				groupId: idPayload.groupID,
				timestamp: getNanoSeconds(timestamp),
				errorId: id,
			};

			history.replace(`${pathname}?${createQueryParams(queryParams)}`);
		} catch (error) {
			notifications.error({
				message: t('something_went_wrong'),
			});
		}
	};

	const data: { key: string; value: string }[] = Object.keys(errorDetail)
		.filter((e) => !keyToExclude.includes(e))
		.map((key) => ({
			key,
			value: errorDetail[key as keyof GetByErrorTypeAndServicePayload],
		}));

	const onClickTraceHandler = (): void => {
		logEvent('Exception: Navigate to trace detail page', {
			groupId: errorDetail?.groupID,
			spanId: errorDetail.spanID,
			traceId: errorDetail.traceID,
			exceptionId: errorDetail?.errorId,
		});
		history.push(`/trace/${errorDetail.traceID}?spanId=${errorDetail.spanID}`);
	};

	const logEventCalledRef = useRef(false);
	useEffect(() => {
		if (!logEventCalledRef.current && !isUndefined(data)) {
			logEvent('Exception: Detail page visited', {
				groupId: errorDetail?.groupID,
				spanId: errorDetail.spanID,
				traceId: errorDetail.traceID,
				exceptionId: errorDetail?.errorId,
			});
			logEventCalledRef.current = true;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data]);

	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	return (
		<>
			<Typography>{errorDetail.exceptionType}</Typography>
			<Typography>{errorDetail.exceptionMessage}</Typography>
			<Divider />

			<EventContainer>
				<div>
					<Typography>Event {errorDetail.errorId}</Typography>
					<Typography>
						{formatTimezoneAdjustedTimestamp(
							errorDetail.timestamp,
							DATE_TIME_FORMATS.UTC_FULL,
						)}
					</Typography>
				</div>
				<div>
					<Space align="end" direction="horizontal">
						<Button
							loading={nextPrevStatus === 'loading'}
							disabled={nextPrevData?.payload?.prevErrorID.length === 0}
							onClick={(): Promise<void> =>
								onClickErrorIdHandler(
									nextPrevData?.payload?.prevErrorID || '',
									nextPrevData?.payload?.prevTimestamp || '',
								)
							}
						>
							{t('older')}
						</Button>
						<Button
							loading={nextPrevStatus === 'loading'}
							disabled={nextPrevData?.payload?.nextErrorID.length === 0}
							onClick={(): Promise<void> =>
								onClickErrorIdHandler(
									nextPrevData?.payload?.nextErrorID || '',
									nextPrevData?.payload?.nextTimestamp || '',
								)
							}
						>
							{t('newer')}
						</Button>
					</Space>
				</div>
			</EventContainer>

			<DashedContainer>
				<Typography>{t('see_trace_graph')}</Typography>
				<Button onClick={onClickTraceHandler} type="primary">
					{t('see_error_in_trace_graph')}
				</Button>
			</DashedContainer>

			<Typography.Title level={4}>{t('stack_trace')}</Typography.Title>
			<div className="error-container">
				<Editor value={stackTraceValue} readOnly />
			</div>

			<EditorContainer>
				<Space direction="vertical">
					<ResizeTable columns={columns} tableLayout="fixed" dataSource={data} />
				</Space>
			</EditorContainer>
		</>
	);
}

interface ErrorDetailsProps {
	idPayload: GetByErrorTypeAndServicePayload;
}

export default ErrorDetails;
