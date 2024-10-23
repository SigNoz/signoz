import { Button, Slider, SliderSingleProps, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { ArrowLeft, ArrowRight, Loader2, Minus } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface OptimiseSignozDetails {
	logsPerDay: number;
	hostsPerDay: number;
	services: number;
}

interface OptimiseSignozNeedsProps {
	optimiseSignozDetails: OptimiseSignozDetails;
	setOptimiseSignozDetails: (details: OptimiseSignozDetails) => void;
	onNext: () => void;
	onBack: () => void;
	isUpdatingProfile: boolean;
}

const logMarks: SliderSingleProps['marks'] = {
	0: '2 GB',
	25: '25 GB',
	50: '50 GB',
	100: '100 GB',
};

const hostMarks: SliderSingleProps['marks'] = {
	0: '0',
	20: '20',
	40: '40',
	60: '60',
	80: '80',
	100: '100',
};

const serviceMarks: SliderSingleProps['marks'] = {
	0: '0',
	20: '20',
	40: '40',
	60: '60',
	80: '80',
	100: '100',
};

function OptimiseSignozNeeds({
	isUpdatingProfile,
	optimiseSignozDetails,
	setOptimiseSignozDetails,
	onNext,
	onBack,
}: OptimiseSignozNeedsProps): JSX.Element {
	const [logsPerDay, setLogsPerDay] = useState<number>(
		optimiseSignozDetails?.logsPerDay || 25,
	);
	const [hostsPerDay, setHostsPerDay] = useState<number>(
		optimiseSignozDetails?.hostsPerDay || 40,
	);
	const [services, setServices] = useState<number>(
		optimiseSignozDetails?.services || 10,
	);

	useEffect(() => {
		setOptimiseSignozDetails({
			logsPerDay,
			hostsPerDay,
			services,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [services, hostsPerDay, logsPerDay]);

	const handleOnNext = (): void => {
		logEvent('Onboarding: Optimise SigNoz Needs: Next', {
			logsPerDay,
			hostsPerDay,
			services,
		});

		onNext();
	};

	const handleOnBack = (): void => {
		logEvent('Onboarding: Optimise SigNoz Needs: Back', {
			logsPerDay,
			hostsPerDay,
			services,
		});

		onBack();
	};

	const handleWillDoLater = (): void => {
		setOptimiseSignozDetails({
			logsPerDay: 0,
			hostsPerDay: 0,
			services: 0,
		});

		logEvent('Onboarding: Optimise SigNoz Needs: Will do later', {
			logsPerDay: 0,
			hostsPerDay: 0,
			services: 0,
		});
	};

	return (
		<div className="questions-container">
			<Typography.Title level={3} className="title">
				Optimize SigNoz for Your Needs
			</Typography.Title>
			<Typography.Paragraph className="sub-title">
				Give us a quick sense of your scale so SigNoz can keep up!
			</Typography.Paragraph>

			<div className="questions-form-container">
				<div className="questions-form">
					<Typography.Paragraph className="question">
						What does your scale approximately look like?
					</Typography.Paragraph>

					<div className="form-group">
						<label className="question" htmlFor="organisationName">
							Logs / Day
						</label>
						<div className="slider-container">
							<Slider
								marks={logMarks}
								defaultValue={logsPerDay}
								onAfterChange={(value): void => setLogsPerDay(value)}
								styles={{
									track: {
										background: '#4E74F8',
									},
								}}
							/>
						</div>
					</div>

					<div className="form-group">
						<label className="question" htmlFor="organisationName">
							Metrics <Minus size={14} /> Number of Hosts
						</label>
						<div className="slider-container">
							<Slider
								marks={hostMarks}
								defaultValue={hostsPerDay}
								onAfterChange={(value: number): void => setHostsPerDay(value)}
								styles={{
									track: {
										background: '#4E74F8',
									},
								}}
							/>
						</div>
					</div>

					<div className="form-group">
						<label className="question" htmlFor="organisationName">
							Number of services
						</label>
						<div className="slider-container">
							<Slider
								marks={serviceMarks}
								defaultValue={services}
								onAfterChange={(value): void => setServices(value)}
								styles={{
									track: {
										background: '#4E74F8',
									},
								}}
							/>
						</div>
					</div>
				</div>

				<div className="next-prev-container">
					<Button
						type="default"
						className="next-button"
						onClick={handleOnBack}
						disabled={isUpdatingProfile}
					>
						<ArrowLeft size={14} />
						Back
					</Button>

					<Button
						type="primary"
						className="next-button"
						onClick={handleOnNext}
						disabled={isUpdatingProfile}
					>
						Next{' '}
						{isUpdatingProfile ? (
							<Loader2 className="animate-spin" />
						) : (
							<ArrowRight size={14} />
						)}
					</Button>
				</div>

				<div className="do-later-container">
					<Button type="link" onClick={handleWillDoLater}>
						I&apos;ll do this later
					</Button>
				</div>
			</div>
		</div>
	);
}

export default OptimiseSignozNeeds;
