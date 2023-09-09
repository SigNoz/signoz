import {
	CheckCircleTwoTone,
	CheckSquareOutlined,
	CloseCircleOutlined,
	CloseCircleTwoTone,
	LoadingOutlined,
} from '@ant-design/icons';
import { Steps } from 'antd';
import { useQueryService } from 'hooks/useQueryService';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Tags } from 'types/reducer/trace';

import './ConnectionStatus.styles.scss';

export default function ConnectionStatus({ language, activeStep }) {
	const { maxTime, minTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const { queries } = useResourceAttribute();
	const selectedTags = useMemo(
		() => (convertRawQueriesToTraceSelectedTags(queries) as Tags[]) || [],
		[queries],
	);

	const { data, error, isLoading, isError } = useQueryService({
		minTime,
		maxTime,
		selectedTime,
		selectedTags,
	});

	const renderDocsReference = () => {
		switch (language) {
			case 'java':
				return (
					<div className="header">
						<img
							className={'supported-language-img'}
							src={`/Logos/java.png`}
							alt=""
						/>
						<div className="title">
							<h1>Java OpenTelemetry Instrumentation</h1>
							<div className="detailed-docs-link">
								View detailed docs
								<a target="_blank" href="https://signoz.io/docs/instrumentation/java/">
									here
								</a>
							</div>
						</div>
					</div>
				);

			case 'python':
				return (
					<div className="header">
						<img
							className={'supported-language-img'}
							src={`/Logos/python.png`}
							alt=""
						/>

						<div className="title">
							<h1>Python OpenTelemetry Instrumentation</h1>
							<div className="detailed-docs-link">
								View detailed docs
								<a
									target="_blank"
									href="https://signoz.io/docs/instrumentation/python/"
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
							className={'supported-language-img'}
							src={`/Logos/javascript.png`}
							alt=""
						/>
						<div className="title">
							<h1>Javascript OpenTelemetry Instrumentation</h1>
							<div className="detailed-docs-link">
								View detailed docs
								<a
									target="_blank"
									href="https://signoz.io/docs/instrumentation/javascript/"
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
						<img className={'supported-language-img'} src={`/Logos/go.png`} alt="" />
						<div className="title">
							<h1>Go OpenTelemetry Instrumentation</h1>

							<div className="detailed-docs-link">
								View detailed docs
								<a
									target="_blank"
									href="https://signoz.io/docs/instrumentation/golang/"
								>
									here
								</a>
							</div>
						</div>
					</div>
				);

			default:
				break;
		}
	};

	console.log('isLoading', isLoading);

	return (
		<div className="connection-status-container">
			<div className="full-docs-link">{renderDocsReference()}</div>
			<div className="status-container">
				<div className="title">
					<div className="label">Receiving data from the Application?</div>
					<div className="language"> {language} </div>
				</div>
				<div className="status-info">
					<div className="label"> Status </div>

					<div className="status">
						{isLoading && <LoadingOutlined />}
						{!isLoading && data && data?.length > 0 && (
							<>
								<CheckCircleTwoTone twoToneColor="#52c41a" />
								<span> Success </span>
							</>
						)}
						{!isLoading && data && data?.length === 0 && (
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
						{isLoading && <div> Waiting for Update </div>}
						{!isLoading && data && data?.length > 0 && (
							<div> Received data from the application successfully. </div>
						)}
						{!isLoading && data && data?.length === 0 && (
							<div> Couldn't detect the install </div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
