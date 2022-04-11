import { Button, Divider, notification, Space, Table, Typography } from 'antd';
import getById from 'api/errors/getById';
import Editor from 'components/Editor';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';
import history from 'lib/history';
import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { generatePath, useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { PayloadProps as GetByErrorTypeAndServicePayload } from 'types/api/errors/getByErrorTypeAndService';
import { PayloadProps } from 'types/api/errors/getById';
import { GlobalReducer } from 'types/reducer/globalTime';

import { DashedContainer, EditorContainer, EventContainer } from './styles';

function ErrorDetails(props: ErrorDetailsProps): JSX.Element {
	const { errorDetails, idPayload } = props;
	const stackTraceValue = useRef(errorDetails.excepionStacktrace);
	const [isLoading, setLoading] = useState<boolean>(false);
	const { t } = useTranslation(['errorDetails', 'common']);
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { search } = useLocation();
	const params = new URLSearchParams(search);

	const columns = useMemo(
		() => [
			{
				title: 'Key',
				dataIndex: 'key',
				key: 'key',
			},
			{
				title: 'Value',
				dataIndex: 'value',
				key: 'value',
			},
		],
		[],
	);

	const keyToExclude = useMemo(
		() => [
			'excepionStacktrace',
			'exceptionType',
			'errorId',
			'timestamp',
			'exceptionMessage',
			'newerErrorId',
			'olderErrorId',
		],
		[],
	);

	const onClickErrorIdHandler = async (id: string): Promise<void> => {
		try {
			setLoading(true);

			const response = await getById({
				end: maxTime,
				start: minTime,
				errorId: id,
			});

			if (response.statusCode === 200) {
				const { payload } = response;
				const path = generatePath(ROUTES.ERROR_DETAIL, {
					serviceName: payload.serviceName,
					errorType: payload.exceptionType,
				});

				history.push(`${path}?errorId=${payload.errorId}`);
			} else {
				notification.error({
					message: t('something_went_wrong'),
				});
			}

			setLoading(false);
		} catch (error) {
			notification.error({
				message: t('something_went_wrong'),
			});
			setLoading(false);
		}
	};

	const timeStamp = dayjs(errorDetails.timestamp);

	const data: { key: string; value: string }[] = Object.keys(errorDetails)
		.filter((e) => !keyToExclude.includes(e))
		.map((key) => ({
			key,
			value: errorDetails[key as keyof GetByErrorTypeAndServicePayload],
		}));

	const onClickTraceHandler = (): void => {
		history.push(`/trace/${errorDetails.traceID}?spanId=${errorDetails.spanID}`);
	};

	return (
		<>
			<Typography>{errorDetails.exceptionType}</Typography>
			<Typography>{errorDetails.exceptionMessage}</Typography>
			<Divider />

			<EventContainer>
				<div>
					<Typography>Event {errorDetails.errorId}</Typography>
					<Typography>{timeStamp.format('MMM DD YYYY hh:mm:ss A')}</Typography>
				</div>
				<div>
					<Space align="end" direction="horizontal">
						{/* <Button icon={<LeftOutlined />} /> */}
						<Button
							loading={isLoading}
							disabled={
								idPayload.olderErrorId.length === 0 ||
								params.get('errorId') === idPayload.olderErrorId
							}
							onClick={(): Promise<void> =>
								onClickErrorIdHandler(idPayload.olderErrorId)
							}
						>
							{t('older')}
						</Button>
						<Button
							loading={isLoading}
							disabled={
								idPayload.newerErrorId.length === 0 ||
								params.get('errorId') === idPayload.newerErrorId
							}
							onClick={(): Promise<void> =>
								onClickErrorIdHandler(idPayload.newerErrorId)
							}
						>
							{t('newer')}
						</Button>
						{/* <Button icon={<RightOutlined />} /> */}
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
			<Editor value={stackTraceValue} readOnly />

			<EditorContainer>
				<Space direction="vertical">
					<Table tableLayout="fixed" columns={columns} dataSource={data} />
				</Space>
			</EditorContainer>
		</>
	);
}

interface ErrorDetailsProps {
	errorDetails: GetByErrorTypeAndServicePayload;
	idPayload: PayloadProps;
}

export default ErrorDetails;
