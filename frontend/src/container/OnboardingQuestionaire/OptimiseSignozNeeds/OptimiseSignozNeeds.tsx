import { useEffect, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Slider } from '@signozhq/ui/slider';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import { ArrowRight, LoaderCircle, Minus } from '@signozhq/icons';

import { OnboardingQuestionHeader } from '../OnboardingQuestionHeader';
import {
	exponentialToLinear,
	linearToExponential,
	SLIDER_MAX_POSITION,
	SLIDER_MIN_POSITION,
} from './OptimiseSignozNeeds.utils';

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

interface OptimiseSignozNeedsProps {
	optimiseSignozDetails: OptimiseSignozDetails;
	setOptimiseSignozDetails: (details: OptimiseSignozDetails) => void;
	onNext: (details: OptimiseSignozDetails) => void;
	onScaleInteraction: () => void;
	onWillDoLater: () => void;
	isUpdatingProfile: boolean;
	isNextDisabled: boolean;
}

const SCALE_ANSWER_HINT_ID = 'onboarding-scale-answer-hint';

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
	onScaleInteraction,
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
		const scaleDetails = {
			logsPerDay,
			hostsPerDay,
			services,
		};

		void logEvent('Org Onboarding: Answered', scaleDetails);

		onNext(scaleDetails);
	};

	const handleWillDoLater = (): void => {
		setOptimiseSignozDetails({
			logsPerDay: 0,
			hostsPerDay: 0,
			services: 0,
		});

		onWillDoLater();

		void logEvent('Org Onboarding: Clicked Do Later', {
			currentPageID: 3,
		});
	};

	const handleSliderChange = (key: string, value: number): void => {
		onScaleInteraction();
		setSliderValues((currentSliderValues) => ({
			...currentSliderValues,
			[key]: value,
		}));

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
						<Typography.Text className="question">
							What does your scale approximately look like?
						</Typography.Text>
					</div>

					<div className="form-group">
						<label className="question-slider" htmlFor="organisationName">
							Logs / Day
						</label>
						<div className="slider-container">
							<div>
								<Slider
									min={SLIDER_MIN_POSITION}
									max={SLIDER_MAX_POSITION}
									value={sliderValues.logsPerDay}
									marks={marks}
									onChange={(value): void =>
										handleSliderChange('logsPerDay', value as number)
									}
									onKeyDown={onScaleInteraction}
									onPointerDown={onScaleInteraction}
									styles={{
										range: {
											backgroundColor: '#4E74F8',
										},
									}}
									tooltip={{
										formatter: (): string => `${logsPerDayValue.toLocaleString()} GB`,
									}}
									testId="onboarding-logs-slider"
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
									min={SLIDER_MIN_POSITION}
									max={SLIDER_MAX_POSITION}
									value={sliderValues.hostsPerDay}
									marks={hostMarks}
									onChange={(value): void =>
										handleSliderChange('hostsPerDay', value as number)
									}
									onKeyDown={onScaleInteraction}
									onPointerDown={onScaleInteraction}
									styles={{
										range: {
											backgroundColor: '#4E74F8',
										},
									}}
									tooltip={{
										formatter: (): string => `${hostsPerDayValue.toLocaleString()}`,
									}}
									testId="onboarding-hosts-slider"
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
									min={SLIDER_MIN_POSITION}
									max={SLIDER_MAX_POSITION}
									value={sliderValues.services}
									marks={serviceMarks}
									onChange={(value): void =>
										handleSliderChange('services', value as number)
									}
									onKeyDown={onScaleInteraction}
									onPointerDown={onScaleInteraction}
									styles={{
										range: {
											backgroundColor: '#4E74F8',
										},
									}}
									tooltip={{
										formatter: (): string => `${servicesValue.toLocaleString()}`,
									}}
									testId="onboarding-services-slider"
								/>
							</div>
						</div>
					</div>
				</div>

				<div className="onboarding-buttons-container">
					{isNextDisabled && (
						<Typography.Text
							align="center"
							color="muted"
							display="block"
							id={SCALE_ANSWER_HINT_ID}
							size="sm"
						>
							Interact with at least one slider to continue.
						</Typography.Text>
					)}
					<Button
						variant="solid"
						color="primary"
						aria-describedby={isNextDisabled ? SCALE_ANSWER_HINT_ID : undefined}
						className={`onboarding-next-button ${
							isUpdatingProfile || isNextDisabled ? 'disabled' : ''
						}`}
						onClick={handleOnNext}
						disabled={isUpdatingProfile || isNextDisabled}
						testId="onboarding-scale-next-button"
						suffix={
							isUpdatingProfile ? (
								<LoaderCircle className="animate-spin" size={12} />
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
						testId="onboarding-scale-do-later-button"
					>
						I&apos;ll do this later
					</Button>
				</div>
			</div>
		</div>
	);
}

export default OptimiseSignozNeeds;
