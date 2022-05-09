import { Button, Divider, notification, Space, Table, Typography } from 'antd';
import Editor from 'components/Editor';
import dayjs from 'dayjs';
import history from 'lib/history';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { PayloadProps as GetByErrorTypeAndServicePayload } from 'types/api/errors/getByErrorTypeAndService';
import { PayloadProps } from 'types/api/errors/getById';

import { DashedContainer, EditorContainer, EventContainer } from './styles';

function ErrorDetails(props: ErrorDetailsProps): JSX.Element {
	const { idPayload } = props;
	const [isLoading, setLoading] = useState<boolean>(false);
	const { t } = useTranslation(['errorDetails', 'common']);

	const { search } = useLocation();
	const params = new URLSearchParams(search);
	const queryErrorId = params.get('errorId');
	const serviceName = params.get('serviceName');
	const errorType = params.get('errorType');

	const errorDetail = idPayload;

	const [stackTraceValue] = useState(errorDetail.exceptionStacktrace);

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
			'exceptionStacktrace',
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

			if (id.length === 0) {
				notification.error({
					message: 'Error Id cannot be empty',
				});
				setLoading(false);
				return;
			}

			setLoading(false);

			history.push(
				`${history.location.pathname}?errorId=${id}&serviceName=${serviceName}&errorType=${errorType}`,
			);
		} catch (error) {
			notification.error({
				message: t('something_went_wrong'),
			});
			setLoading(false);
		}
	};

	const timeStamp = dayjs(errorDetail.timestamp);

	const data: { key: string; value: string }[] = Object.keys(errorDetail)
		.filter((e) => !keyToExclude.includes(e))
		.map((key) => ({
			key,
			value: errorDetail[key as keyof GetByErrorTypeAndServicePayload],
		}));

	const onClickTraceHandler = (): void => {
		history.push(`/trace/${errorDetail.traceID}?spanId=${errorDetail.spanID}`);
	};

	return (
		<>
			<Typography>{errorDetail.exceptionType}</Typography>
			<Typography>{errorDetail.exceptionMessage}</Typography>
			<Divider />

			<EventContainer>
				<div>
					<Typography>Event {errorDetail.errorId}</Typography>
					<Typography>{timeStamp.format('MMM DD YYYY hh:mm:ss A')}</Typography>
				</div>
				<div>
					<Space align="end" direction="horizontal">
						<Button
							loading={isLoading}
							disabled={
								errorDetail.olderErrorId.length === 0 ||
								queryErrorId === errorDetail.olderErrorId
							}
							onClick={(): Promise<void> =>
								onClickErrorIdHandler(errorDetail.olderErrorId)
							}
						>
							{t('older')}
						</Button>
						<Button
							loading={isLoading}
							disabled={
								errorDetail.newerErrorId.length === 0 ||
								queryErrorId === errorDetail.newerErrorId
							}
							onClick={(): Promise<void> =>
								onClickErrorIdHandler(errorDetail.newerErrorId)
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
			<Editor onChange={(): void => {}} value={stackTraceValue} readOnly />

			<EditorContainer>
				<Space direction="vertical">
					<Table tableLayout="fixed" columns={columns} dataSource={data} />
				</Space>
			</EditorContainer>
		</>
	);
}

interface ErrorDetailsProps {
	idPayload: PayloadProps;
}

export default ErrorDetails;
