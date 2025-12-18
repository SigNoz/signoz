import { screen } from '@testing-library/react';
import { render } from 'tests/test-utils';

import ValueGraph from '../index';
import { getBackgroundColorAndThresholdCheck } from '../utils';

// Mock the utils module
jest.mock('../utils', () => ({
	getBackgroundColorAndThresholdCheck: jest.fn(() => ({
		threshold: {} as any,
		isConflictingThresholds: false,
	})),
}));

const mockGetBackgroundColorAndThresholdCheck = getBackgroundColorAndThresholdCheck as jest.MockedFunction<
	typeof getBackgroundColorAndThresholdCheck
>;

const TEST_ID_VALUE_GRAPH_TEXT = 'value-graph-text';
const TEST_ID_VALUE_GRAPH_PREFIX_UNIT = 'value-graph-prefix-unit';
const TEST_ID_VALUE_GRAPH_SUFFIX_UNIT = 'value-graph-suffix-unit';

describe('ValueGraph', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders the numeric value correctly', () => {
		const { getByTestId } = render(
			<ValueGraph value="42" rawValue={42} thresholds={[]} />,
		);

		expect(getByTestId(TEST_ID_VALUE_GRAPH_TEXT)).toHaveTextContent('42');
	});

	it('renders value with suffix unit', () => {
		const { getByTestId } = render(
			<ValueGraph value="42ms" rawValue={42} thresholds={[]} />,
		);

		expect(getByTestId(TEST_ID_VALUE_GRAPH_TEXT)).toHaveTextContent('42');
		expect(getByTestId(TEST_ID_VALUE_GRAPH_SUFFIX_UNIT)).toHaveTextContent('ms');
	});

	it('renders value with prefix unit', () => {
		const { getByTestId } = render(
			<ValueGraph value="$100" rawValue={100} thresholds={[]} />,
		);

		expect(getByTestId(TEST_ID_VALUE_GRAPH_TEXT)).toHaveTextContent('100');
		expect(getByTestId(TEST_ID_VALUE_GRAPH_PREFIX_UNIT)).toHaveTextContent('$');
	});

	it('renders value with both prefix and suffix units', () => {
		const { getByTestId } = render(
			<ValueGraph value="$100USD" rawValue={100} thresholds={[]} />,
		);

		expect(getByTestId(TEST_ID_VALUE_GRAPH_TEXT)).toHaveTextContent('100');
		expect(getByTestId(TEST_ID_VALUE_GRAPH_PREFIX_UNIT)).toHaveTextContent('$');
		expect(getByTestId(TEST_ID_VALUE_GRAPH_SUFFIX_UNIT)).toHaveTextContent('USD');
	});

	it('renders value with K suffix', () => {
		const { getByTestId } = render(
			<ValueGraph value="1.5K" rawValue={1500} thresholds={[]} />,
		);

		expect(getByTestId(TEST_ID_VALUE_GRAPH_TEXT)).toHaveTextContent('1.5K');
	});

	it('applies text color when threshold format is Text', () => {
		mockGetBackgroundColorAndThresholdCheck.mockReturnValue({
			threshold: {
				thresholdFormat: 'Text',
				thresholdColor: 'red',
			} as any,
			isConflictingThresholds: false,
		});

		const { getByTestId } = render(
			<ValueGraph value="42" rawValue={42} thresholds={[]} />,
		);

		expect(getByTestId(TEST_ID_VALUE_GRAPH_TEXT)).toHaveStyle({ color: 'red' });
	});

	it('applies background color when threshold format is Background', () => {
		mockGetBackgroundColorAndThresholdCheck.mockReturnValue({
			threshold: {
				thresholdFormat: 'Background',
				thresholdColor: 'blue',
			} as any,
			isConflictingThresholds: false,
		});

		const { container } = render(
			<ValueGraph value="42" rawValue={42} thresholds={[]} />,
		);

		const containerElement = container.querySelector('.value-graph-container');
		expect(containerElement).toHaveStyle({ backgroundColor: 'blue' });
	});

	it('displays conflicting thresholds indicator when multiple thresholds match', () => {
		mockGetBackgroundColorAndThresholdCheck.mockReturnValue({
			threshold: {
				thresholdFormat: 'Text',
				thresholdColor: 'red',
			} as any,
			isConflictingThresholds: true,
		});

		const { getByTestId } = render(
			<ValueGraph value="42" rawValue={42} thresholds={[]} />,
		);

		expect(getByTestId('conflicting-thresholds')).toBeInTheDocument();
	});

	it('does not display conflicting thresholds indicator when no conflict', () => {
		mockGetBackgroundColorAndThresholdCheck.mockReturnValue({
			threshold: {} as any,
			isConflictingThresholds: false,
		});

		render(<ValueGraph value="42" rawValue={42} thresholds={[]} />);

		expect(
			screen.queryByTestId('conflicting-thresholds'),
		).not.toBeInTheDocument();
	});

	it('applies text color to units when threshold format is Text', () => {
		mockGetBackgroundColorAndThresholdCheck.mockReturnValue({
			threshold: {
				thresholdFormat: 'Text',
				thresholdColor: 'green',
			} as any,
			isConflictingThresholds: false,
		});

		render(<ValueGraph value="42ms" rawValue={42} thresholds={[]} />);

		const unitElement = screen.getByText('ms');
		expect(unitElement).toHaveStyle({ color: 'green' });
	});

	it('renders decimal values correctly', () => {
		const { getByTestId } = render(
			<ValueGraph value="42.5" rawValue={42.5} thresholds={[]} />,
		);

		expect(getByTestId(TEST_ID_VALUE_GRAPH_TEXT)).toHaveTextContent('42.5');
	});

	it('handles values with M suffix', () => {
		const { getByTestId } = render(
			<ValueGraph value="1.2M" rawValue={1200000} thresholds={[]} />,
		);

		expect(getByTestId(TEST_ID_VALUE_GRAPH_TEXT)).toHaveTextContent('1.2M');
	});

	it('handles values with B suffix', () => {
		const { getByTestId } = render(
			<ValueGraph value="2.3B" rawValue={2300000000} thresholds={[]} />,
		);

		expect(getByTestId(TEST_ID_VALUE_GRAPH_TEXT)).toHaveTextContent('2.3B');
	});

	it('handles scientific notation values', () => {
		const { getByTestId } = render(
			<ValueGraph value="1e-9" rawValue={1e-9} thresholds={[]} />,
		);

		expect(getByTestId(TEST_ID_VALUE_GRAPH_TEXT)).toHaveTextContent('1e-9');
	});

	it('handles scientific notation with suffix unit', () => {
		const { getByTestId } = render(
			<ValueGraph value="1e-9%" rawValue={1e-9} thresholds={[]} />,
		);

		expect(getByTestId(TEST_ID_VALUE_GRAPH_TEXT)).toHaveTextContent('1e-9');
		expect(getByTestId(TEST_ID_VALUE_GRAPH_SUFFIX_UNIT)).toHaveTextContent('%');
	});

	it('handles scientific notation with uppercase E', () => {
		const { getByTestId } = render(
			<ValueGraph value="1E-9" rawValue={1e-9} thresholds={[]} />,
		);

		expect(getByTestId(TEST_ID_VALUE_GRAPH_TEXT)).toHaveTextContent('1E-9');
	});

	it('handles scientific notation with positive exponent', () => {
		const { getByTestId } = render(
			<ValueGraph value="1e+9" rawValue={1e9} thresholds={[]} />,
		);

		expect(getByTestId(TEST_ID_VALUE_GRAPH_TEXT)).toHaveTextContent('1e+9');
	});
});
