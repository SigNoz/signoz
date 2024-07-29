import './ConnectionStatus.styles.scss';

import {
	CheckCircleTwoTone,
	CloseCircleTwoTone,
	LoadingOutlined,
} from '@ant-design/icons';
import logEvent from 'api/common/logEvent';
import Header from 'container/OnboardingContainer/common/Header/Header';
import { useOnboardingContext } from 'container/OnboardingContainer/context/OnboardingContext';
import { useQueryService } from 'hooks/useQueryService';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { UPDATE_TIME_INTERVAL } from 'types/actions/globalTime';
import { PayloadProps as QueryServicePayloadProps } from 'types/api/metrics/getService';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Tags } from 'types/reducer/trace';

const pollingInterval = 10000;

export default function ConnectionStatus(): JSX.Element {
	const { minTime, maxTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const {
		serviceName,
		selectedDataSource,
		selectedEnvironment,
		activeStep,
		selectedMethod,
		selectedFramework,
	} = useOnboardingContext();
	const { queries } = useResourceAttribute();
	const selectedTags = useMemo(
		() => (convertRawQueriesToTraceSelectedTags(queries) as Tags[]) || [],
		[queries],
	);

	const [retryCount, setRetryCount] = useState(20); // Retry for 3 mins 20s
	const [loading, setLoading] = useState(true);
	const [isReceivingData, setIsReceivingData] = useState(false);
	const dispatch = useDispatch();

	const {
		data,
		error,
		isFetching: isServiceLoading,
		isError,
		refetch,
	} = useQueryService({
		minTime,
		maxTime,
		selectedTime,
		selectedTags,
	});

	const renderDocsReference = (): JSX.Element => {
		switch (selectedDataSource?.name) {
			case 'java':
				return (
					<Header
						entity="java"
						heading="Java OpenTelemetry Instrumentation"
						imgURL="/Logos/java.png"
						docsURL="https://signoz.io/docs/instrumentation/java/"
						imgClassName="supported-language-img"
					/>
				);

			case 'python':
				return (
					<Header
						entity="python"
						heading="Python OpenTelemetry Instrumentation"
						imgURL="/Logos/python.png"
						docsURL="https://signoz.io/docs/instrumentation/python/"
						imgClassName="supported-language-img"
					/>
				);

			case 'javascript':
				return (
					<Header
						entity="javascript"
						heading="Javascript OpenTelemetry Instrumentation"
						imgURL="/Logos/javascript.png"
						docsURL="https://signoz.io/docs/instrumentation/javascript/"
						imgClassName="supported-language-img"
					/>
				);
			case 'go':
				return (
					<Header
						entity="go"
						heading="Go OpenTelemetry Instrumentation"
						imgURL="/Logos/go.png"
						docsURL="https://signoz.io/docs/instrumentation/golang/"
						imgClassName="supported-language-img"
					/>
				);
			case 'rails':
				return (
					<Header
						entity="rails"
						heading="Ruby on Rails OpenTelemetry Instrumentation"
						imgURL="/Logos/rails.png"
						docsURL="https://signoz.io/docs/instrumentation/ruby-on-rails/"
						imgClassName="supported-language-img"
					/>
				);
			case 'rust':
				return (
					<Header
						entity="rust"
						heading="Rust OpenTelemetry Instrumentation"
						imgURL="/Logos/rust.png"
						docsURL="https://signoz.io/docs/instrumentation/rust/"
						imgClassName="supported-language-img"
					/>
				);
			case 'elixir':
				return (
					<Header
						entity="rust"
						heading="Elixir OpenTelemetry Instrumentation"
						imgURL="/Logos/elixir.png"
						docsURL="https://signoz.io/docs/instrumentation/elixir/"
						imgClassName="supported-language-img"
					/>
				);
			case 'swift':
				return (
					<Header
						entity="swift"
						heading="Swift OpenTelemetry Instrumentation"
						imgURL="/Logos/swift.png"
						docsURL="https://signoz.io/docs/instrumentation/swift/"
						imgClassName="supported-language-img"
					/>
				);

			default:
				return <> </>;
		}
	};

	const verifyApplicationData = (response?: QueryServicePayloadProps): void => {
		if (data || isError) {
			setRetryCount(retryCount - 1);
			if (retryCount < 0) {
				logEvent('Onboarding V2: Connection Status', {
					dataSource: selectedDataSource?.id,
					framework: selectedFramework,
					environment: selectedEnvironment,
					selectedMethod,
					module: activeStep?.module?.id,
					serviceName,
					status: 'Failed',
				});
				setLoading(false);
			}
		}

		if (response && Array.isArray(response)) {
			for (let i = 0; i < response.length; i += 1) {
				if (response[i]?.serviceName === serviceName) {
					setLoading(false);
					setIsReceivingData(true);

					logEvent('Onboarding V2: Connection Status', {
						dataSource: selectedDataSource?.id,
						framework: selectedFramework,
						environment: selectedEnvironment,
						selectedMethod,
						module: activeStep?.module?.id,
						serviceName,
						status: 'Successful',
					});

					break;
				}
			}
		}
	};

	// Use useEffect to update query parameters when the polling interval lapses
	useEffect(() => {
		let pollingTimer: string | number | NodeJS.Timer | undefined;

		if (loading) {
			pollingTimer = setInterval(() => {
				// Trigger a refetch with the updated parameters
				const updatedMinTime = (Date.now() - 15 * 60 * 1000) * 1000000;
				const updatedMaxTime = Date.now() * 1000000;

				const payload = {
					maxTime: updatedMaxTime,
					minTime: updatedMinTime,
					selectedTime,
				};

				dispatch({
					type: UPDATE_TIME_INTERVAL,
					payload,
				});
			}, pollingInterval); // Same interval as pollingInterval
		} else if (!loading && pollingTimer) {
			clearInterval(pollingTimer);
		}

		// Clean up the interval when the component unmounts
		return (): void => {
			clearInterval(pollingTimer);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [refetch, selectedTags, selectedTime, loading]);

	useEffect(() => {
		verifyApplicationData(data);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isServiceLoading, data, error, isError]);

	useEffect(() => {
		refetch();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

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
						{selectedDataSource?.name} - {selectedFramework}
					</div>
				</div>

				<div className="status-info">
					<div className="label"> Status </div>

					<div className="status">
						{(loading || isServiceLoading) && <LoadingOutlined />}
						{!(loading || isServiceLoading) && isReceivingData && (
							<>
								<CheckCircleTwoTone twoToneColor="#52c41a" />
								<span> Success </span>
							</>
						)}
						{!(loading || isServiceLoading) && !isReceivingData && (
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
						{(loading || isServiceLoading) && <div> Waiting for Update </div>}
						{!(loading || isServiceLoading) && isReceivingData && (
							<div> Received data from the application successfully. </div>
						)}
						{!(loading || isServiceLoading) && !isReceivingData && (
							<div> Could not detect the install </div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
