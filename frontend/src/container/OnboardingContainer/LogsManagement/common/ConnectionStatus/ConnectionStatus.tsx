/* eslint-disable no-plusplus */
import './ConnectionStatus.styles.scss';

import {
	CheckCircleTwoTone,
	CloseCircleTwoTone,
	LoadingOutlined,
} from '@ant-design/icons';
import { useQueryService } from 'hooks/useQueryService';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Tags } from 'types/reducer/trace';

interface ConnectionStatusProps {
	serviceName: string;
	language: string;
	framework: string;
	activeStep: number;
}

export default function ConnectionStatus({
	serviceName,
	language,
	framework,
	activeStep,
}: ConnectionStatusProps): JSX.Element {
	const { maxTime, minTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const { queries } = useResourceAttribute();
	const selectedTags = useMemo(
		() => (convertRawQueriesToTraceSelectedTags(queries) as Tags[]) || [],
		[queries],
	);

	const [loading, setLoading] = useState(true);
	const [isReceivingData, setIsReceivingData] = useState(false);

	const { data, error, isLoading, isError, refetch } = useQueryService({
		minTime,
		maxTime,
		selectedTime,
		selectedTags,
	});

	useEffect(() => {
		refetch();
	}, []);

	const renderDocsReference = (): JSX.Element => {
		switch (language) {
			case 'java':
				return (
					<div className="header">
						<img className="supported-language-img" src="/Logos/java.png" alt="" />
						<div className="title">
							<h1>Java OpenTelemetry Instrumentation</h1>
							<div className="detailed-docs-link">
								View detailed docs
								<a
									target="_blank"
									href="https://signoz.io/docs/instrumentation/java/"
									rel="noreferrer"
								>
									here
								</a>
							</div>
						</div>
					</div>
				);

			case 'python':
				return (
					<div className="header">
						<img className="supported-language-img" src="/Logos/python.png" alt="" />

						<div className="title">
							<h1>Python OpenTelemetry Instrumentation</h1>
							<div className="detailed-docs-link">
								View detailed docs
								<a
									target="_blank"
									href="https://signoz.io/docs/instrumentation/python/"
									rel="noreferrer"
								>
									here
								</a>
							</div>
						</div>
					</div>
				);

			case 'javascript':
				return (
					<div className="header">
						<img
							className="supported-language-img"
							src="/Logos/javascript.png"
							alt=""
						/>
						<div className="title">
							<h1>Javascript OpenTelemetry Instrumentation</h1>
							<div className="detailed-docs-link">
								View detailed docs
								<a
									target="_blank"
									href="https://signoz.io/docs/instrumentation/javascript/"
									rel="noreferrer"
								>
									here
								</a>
							</div>
						</div>
					</div>
				);

			case 'go':
				return (
					<div className="header">
						<img className="supported-language-img" src="/Logos/go.png" alt="" />
						<div className="title">
							<h1>Go OpenTelemetry Instrumentation</h1>

							<div className="detailed-docs-link">
								View detailed docs
								<a
									target="_blank"
									href="https://signoz.io/docs/instrumentation/golang/"
									rel="noreferrer"
								>
									here
								</a>
							</div>
						</div>
					</div>
				);

			default:
				return <> </>;
		}
	};

	const verifyApplicationData = (response): void => {
		if (data || isError) {
			setLoading(false);
		}

		if (response && Array.isArray(response)) {
			for (let i = 0; i < response.length; i++) {
				if (response[i]?.serviceName === serviceName) {
					setIsReceivingData(true);

					break;
				}
			}
		}
	};

	useEffect(() => {
		verifyApplicationData(data);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoading, data, error, isError]);

	return (
		<div className="connection-status-container">
			<div className="full-docs-link">{renderDocsReference()}</div>
			<div className="status-container">
				<div className="service-info">
					<div className="label"> Service Name </div>
					<div className="language">{serviceName}</div>
				</div>

				<div className="language-info">
					<div className="label"> Language - Framework </div>
					<div className="language">
						{language} - {framework}
					</div>
				</div>

				<div className="status-info">
					<div className="label"> Status </div>

					<div className="status">
						{(loading || isLoading) && <LoadingOutlined />}
						{!(loading || isLoading) && isReceivingData && (
							<>
								<CheckCircleTwoTone twoToneColor="#52c41a" />
								<span> Success </span>
							</>
						)}
						{!(loading || isLoading) && !isReceivingData && (
							<>
								<CloseCircleTwoTone twoToneColor="#e84749" />
								<span> Failed </span>
							</>
						)}
					</div>
				</div>
				<div className="details-info">
					<div className="label"> Details </div>

					<div className="details">
						{(loading || isLoading) && <div> Waiting for Update </div>}
						{!(loading || isLoading) && isReceivingData && (
							<div> Received data from the application successfully. </div>
						)}
						{!(loading || isLoading) && !isReceivingData && (
							<div> Couldn't detect the install </div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
