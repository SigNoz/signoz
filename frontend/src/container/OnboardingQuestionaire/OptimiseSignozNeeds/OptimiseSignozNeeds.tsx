import { useEffect, useState } from 'react';
import { Button } from '@signozhq/button';
import { Slider, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { ArrowRight, Loader2, Minus } from 'lucide-react';

import { OnboardingQuestionHeader } from '../OnboardingQuestionHeader';

export interface OptimiseSignozDetails {
	logsPerDay: number;
	hostsPerDay: number;
	services: number;
}

// Define exponential range
const logsMin = 1; // Set to your minimum value in the exponential range
const logsMax = 10000; // Set to your maximum value in the exponential range

const hostsMin = 1;
const hostsMax = 10000;

const servicesMin = 1;
const servicesMax = 5000;

// Function to convert linear slider value to exponential scale
const linearToExponential = (
	value: number,
	min: number,
	max: number,
): number => {
	const expMin = Math.log10(min);
	const expMax = Math.log10(max);
	const expValue = 10 ** (expMin + ((expMax - expMin) * value) / 100);
	return Math.round(expValue);
};

const exponentialToLinear = (
	expValue: number,
	min: number,
	max: number,
): number => {
	const expMin = Math.log10(min);
	const expMax = Math.log10(max);
	const linearValue =
		((Math.log10(expValue) - expMin) / (expMax - expMin)) * 100;
	return Math.round(linearValue); // Round to get a whole number within the 0-100 range
};

interface OptimiseSignozNeedsProps {
	optimiseSignozDetails: OptimiseSignozDetails;
	setOptimiseSignozDetails: (details: OptimiseSignozDetails) => void;
	onNext: () => void;
	onWillDoLater: () => void;
	isUpdatingProfile: boolean;
	isNextDisabled: boolean;
}

const marks = {
	0: `${linearToExponential(0, logsMin, logsMax).toLocaleString()} GB`,
	25: `${linearToExponential(25, logsMin, logsMax).toLocaleString()} GB`,
	50: `${linearToExponential(50, logsMin, logsMax).toLocaleString()} GB`,
	75: `${linearToExponential(75, logsMin, logsMax).toLocaleString()} GB`,
	100: `${linearToExponential(100, logsMin, logsMax).toLocaleString()} GB`,
};

const hostMarks = {
	0: `${linearToExponential(0, hostsMin, hostsMax).toLocaleString()}`,
	25: `${linearToExponential(25, hostsMin, hostsMax).toLocaleString()}`,
	50: `${linearToExponential(50, hostsMin, hostsMax).toLocaleString()}`,
	75: `${linearToExponential(75, hostsMin, hostsMax).toLocaleString()}`,
	100: `${linearToExponential(100, hostsMin, hostsMax).toLocaleString()}`,
};

const serviceMarks = {
	0: `${linearToExponential(0, servicesMin, servicesMax).toLocaleString()}`,
	25: `${linearToExponential(25, servicesMin, servicesMax).toLocaleString()}`,
	50: `${linearToExponential(50, servicesMin, servicesMax).toLocaleString()}`,
	75: `${linearToExponential(75, servicesMin, servicesMax).toLocaleString()}`,
	100: `${linearToExponential(100, servicesMin, servicesMax).toLocaleString()}`,
};

function OptimiseSignozNeeds({
	isUpdatingProfile,
	optimiseSignozDetails,
	setOptimiseSignozDetails,
	onNext,
	onWillDoLater,
	isNextDisabled,
}: OptimiseSignozNeedsProps): JSX.Element {
	const [logsPerDay, setLogsPerDay] = useState<number>(
		optimiseSignozDetails?.logsPerDay || 0,
	);
	const [hostsPerDay, setHostsPerDay] = useState<number>(
		optimiseSignozDetails?.hostsPerDay || 0,
	);
	const [services, setServices] = useState<number>(
		optimiseSignozDetails?.services || 0,
	);

	// Internal state for the linear slider
	const [sliderValues, setSliderValues] = useState({
		logsPerDay: 0,
		hostsPerDay: 0,
		services: 0,
	});

	useEffect(() => {
		setSliderValues({
			logsPerDay: exponentialToLinear(logsPerDay, logsMin, logsMax),
			hostsPerDay: exponentialToLinear(hostsPerDay, hostsMin, hostsMax),
			services: exponentialToLinear(services, servicesMin, servicesMax),
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		setOptimiseSignozDetails({
			logsPerDay,
			hostsPerDay,
			services,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [services, hostsPerDay, logsPerDay]);

	const handleOnNext = (): void => {
		logEvent('Org Onboarding: Answered', {
			logsPerDay,
			hostsPerDay,
			services,
		});

		onNext();
	};

	const handleWillDoLater = (): void => {
		setOptimiseSignozDetails({
			logsPerDay: 0,
			hostsPerDay: 0,
			services: 0,
		});

		onWillDoLater();

		logEvent('Org Onboarding: Clicked Do Later', {
			currentPageID: 3,
		});
	};

	const handleSliderChange = (key: string, value: number): void => {
		setSliderValues({
			...sliderValues,
			[key]: value,
		});

		switch (key) {
			case 'logsPerDay':
				setLogsPerDay(linearToExponential(value, logsMin, logsMax));
				break;
			case 'hostsPerDay':
				setHostsPerDay(linearToExponential(value, hostsMin, hostsMax));
				break;
			case 'services':
				setServices(linearToExponential(value, servicesMin, servicesMax));
				break;
			default:
				break;
		}
	};

	// Calculate the exponential value based on the current slider position
	const logsPerDayValue = linearToExponential(
		sliderValues.logsPerDay,
		logsMin,
		logsMax,
	);
	const hostsPerDayValue = linearToExponential(
		sliderValues.hostsPerDay,
		hostsMin,
		hostsMax,
	);
	const servicesValue = linearToExponential(
		sliderValues.services,
		servicesMin,
		servicesMax,
	);

	return (
		<div className="questions-container">
			<OnboardingQuestionHeader
				title="Set up your workspace"
				subtitle="Tailor SigNoz to suit your observability needs."
			/>

			<div className="questions-form-container">
				<div className="questions-form">
					<div className="form-group">
						<Typography.Paragraph className="question">
							What does your scale approximately look like?
						</Typography.Paragraph>
					</div>

					<div className="form-group">
						<label className="question-slider" htmlFor="organisationName">
							Logs / Day
						</label>
						<div className="slider-container logs-slider-container">
							<div>
								<Slider
									min={0}
									max={100}
									value={sliderValues.logsPerDay}
									marks={marks}
									onChange={(value: number): void =>
										handleSliderChange('logsPerDay', value)
									}
									styles={{
										track: {
											background: '#4E74F8',
										},
									}}
									tooltip={{
										formatter: (): string => `${logsPerDayValue.toLocaleString()} GB`, // Show whole number
									}}
								/>
							</div>
						</div>
					</div>

					<div className="form-group">
						<label className="question-slider" htmlFor="organisationName">
							Metrics <Minus size={14} /> Number of Hosts
						</label>
						<div className="slider-container">
							<div>
								<Slider
									min={0}
									max={100}
									value={sliderValues.hostsPerDay}
									marks={hostMarks}
									onChange={(value: number): void =>
										handleSliderChange('hostsPerDay', value)
									}
									styles={{
										track: {
											background: '#4E74F8',
										},
									}}
									tooltip={{
										formatter: (): string => `${hostsPerDayValue.toLocaleString()}`, // Show whole number
									}}
								/>
							</div>
						</div>
					</div>

					<div className="form-group">
						<label className="question-slider" htmlFor="organisationName">
							Number of services
						</label>
						<div className="slider-container">
							<div>
								<Slider
									min={0}
									max={100}
									value={sliderValues.services}
									marks={serviceMarks}
									onChange={(value: number): void =>
										handleSliderChange('services', value)
									}
									styles={{
										track: {
											background: '#4E74F8',
										},
									}}
									tooltip={{
										formatter: (): string => `${servicesValue.toLocaleString()}`, // Show whole number
									}}
								/>
							</div>
						</div>
					</div>
				</div>

				<div className="onboarding-buttons-container">
					<Button
						variant="solid"
						color="primary"
						className={`onboarding-next-button ${
							isUpdatingProfile || isNextDisabled ? 'disabled' : ''
						}`}
						onClick={handleOnNext}
						disabled={isUpdatingProfile || isNextDisabled}
						suffixIcon={
							isUpdatingProfile ? (
								<Loader2 className="animate-spin" size={12} />
							) : (
								<ArrowRight size={12} />
							)
						}
					>
						Next
					</Button>
					<Button
						variant="ghost"
						color="secondary"
						className="onboarding-do-later-button"
						onClick={handleWillDoLater}
						disabled={isUpdatingProfile}
					>
						I&apos;ll do this later
					</Button>
				</div>
			</div>
		</div>
	);
}

export default OptimiseSignozNeeds;
