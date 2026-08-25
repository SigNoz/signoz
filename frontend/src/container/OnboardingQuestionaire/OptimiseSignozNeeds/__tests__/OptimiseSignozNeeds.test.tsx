import { useState } from 'react';
import { fireEvent, render, screen, within } from 'tests/test-utils';

import OptimiseSignozNeeds, {
	OptimiseSignozDetails,
} from '../OptimiseSignozNeeds';
import {
	exponentialToLinear,
	linearToExponential,
} from '../OptimiseSignozNeeds.utils';

const INITIAL_DETAILS: OptimiseSignozDetails = {
	logsPerDay: 0,
	hostsPerDay: 0,
	services: 0,
};

const mockOnNext = jest.fn();
const mockOnWillDoLater = jest.fn();
const setPointerCaptureDescriptor = Object.getOwnPropertyDescriptor(
	HTMLElement.prototype,
	'setPointerCapture',
);

function OptimiseSignozNeedsHarness(): JSX.Element {
	const [optimiseSignozDetails, setOptimiseSignozDetails] =
		useState<OptimiseSignozDetails>(INITIAL_DETAILS);
	const [hasScaleAnswer, setHasScaleAnswer] = useState(false);

	return (
		<OptimiseSignozNeeds
			isNextDisabled={!hasScaleAnswer}
			isUpdatingProfile={false}
			optimiseSignozDetails={optimiseSignozDetails}
			setOptimiseSignozDetails={setOptimiseSignozDetails}
			onNext={mockOnNext}
			onScaleInteraction={(): void => setHasScaleAnswer(true)}
			onWillDoLater={mockOnWillDoLater}
		/>
	);
}

describe('OptimiseSignozNeeds', () => {
	beforeAll(() => {
		Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
			configurable: true,
			value: (): void => {},
		});
	});

	afterAll(() => {
		if (setPointerCaptureDescriptor) {
			Object.defineProperty(
				HTMLElement.prototype,
				'setPointerCapture',
				setPointerCaptureDescriptor,
			);
			return;
		}

		Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture');
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('keeps zero values on a finite slider coordinate', () => {
		expect(linearToExponential(0, 1, 10000)).toBe(0);
		expect(exponentialToLinear(0, 1, 10000)).toBe(0);
		expect(Number.isFinite(exponentialToLinear(0, 1, 10000))).toBe(true);
	});

	it('accepts an explicit zero answer from the minimum slider position', () => {
		render(<OptimiseSignozNeedsHarness />);

		const hostsSlider = screen.getByTestId('onboarding-hosts-slider');
		const hostsSliderThumb = within(hostsSlider).getByRole('slider');
		const nextButton = screen.getByTestId('onboarding-scale-next-button');

		expect(hostsSliderThumb).toHaveAttribute('aria-valuenow', '0');
		expect(nextButton).toBeDisabled();
		expect(
			screen.getByText('Adjust at least one slider to continue.'),
		).toBeInTheDocument();

		fireEvent.pointerDown(hostsSliderThumb, { pointerId: 1, clientX: 0 });

		expect(nextButton).toBeEnabled();
		expect(
			screen.queryByText('Adjust at least one slider to continue.'),
		).not.toBeInTheDocument();

		fireEvent.click(nextButton);

		expect(mockOnNext).toHaveBeenCalledTimes(1);
	});
});
