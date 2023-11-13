/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './LogsManagement.styles.scss';

import cx from 'classnames';
import { useEffect, useState } from 'react';
import { trackEvent } from 'utils/segmentAnalytics';

import ApplicationLogs from './ApplicationLogs/ApplicationLogs';
import Docker from './Docker/Docker';
import ExistingCollectors from './ExistingCollectors/ExistingCollectors';
import Kubernetes from './Kubernetes/Kubernetes';
import Nodejs from './Nodejs/Nodejs';
import SysLogs from './SysLogs/SysLogs';

const supportedLogTypes = [
	{
		name: 'Kubernetes Pod Logs',
		id: 'kubernetes',
		imgURL: `Logos/kubernetes.svg`,
	},
	{
		name: 'Docker Container Logs',
		id: 'docker',
		imgURL: `Logos/docker.svg`,
	},
	{
		name: 'SysLogs',
		id: 'syslogs',
		imgURL: `Logos/syslogs.svg`,
	},
	{
		name: 'Application Logs',
		id: 'application_logs_log_file',
		imgURL: `Logos/software-window.svg`,
	},
	{
		name: 'Logs from existing collectors',
		id: 'existing_collectors',
		imgURL: `Logos/cmd-terminal.svg`,
	},
];

export default function LogsManagement({
	activeStep,
	handleLogTypeSelect,
}: {
	activeStep: number;
	handleLogTypeSelect: (id: string) => any;
}): JSX.Element {
	const [selectedLogsType, setSelectedLogsType] = useState('kubernetes');

	useEffect(() => {
		// on language select
		trackEvent('Onboarding: Logs Management', {
			selectedLogsType,
			activeStep,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedLogsType]);

	const renderSelectedLanguageSetupInstructions = ():
		| JSX.Element
		| undefined => {
		switch (selectedLogsType) {
			case 'kubernetes':
				return <Kubernetes activeStep={activeStep} />;
			case 'docker':
				return <Docker activeStep={activeStep} />;
			case 'application_logs_log_file':
				return <ApplicationLogs type="from-log-file" activeStep={activeStep} />;
			case 'application_logs_otel_sdk':
				return <ApplicationLogs type="using-otel-sdk" activeStep={activeStep} />;
			case 'syslogs':
				return <SysLogs activeStep={activeStep} />;
			case 'nodejs':
				return <Nodejs activeStep={activeStep} />;
			case 'existing_collectors':
				return <ExistingCollectors />;
			default:
				return <> </>;
		}
	};

	return (
		<div className="logs-management-module-container">
			{activeStep === 2 && (
				<>
					<div className="header">
						<h1>Select a Logs type</h1>
						<h4> Choose the logs that you want to receive on SigNoz </h4>
					</div>

					<div className="supported-logs-type-container">
						{supportedLogTypes.map((logType) => (
							<div
								className={cx(
									'supported-logs-type',
									selectedLogsType === logType.id ? 'selected' : '',
								)}
								key={logType.name}
								onClick={() => {
									handleLogTypeSelect(logType.id);
									setSelectedLogsType(logType.id);
								}}
							>
								<img
									className={cx('supported-logs-type-img')}
									src={`${logType.imgURL}`}
									alt=""
								/>

								<div> {logType.name} </div>
							</div>
						))}
					</div>
				</>
			)}

			{selectedLogsType && (
				<div
					className={cx('selected-logs-type-setup-instructions', selectedLogsType)}
				>
					{renderSelectedLanguageSetupInstructions()}
				</div>
			)}
		</div>
	);
}
