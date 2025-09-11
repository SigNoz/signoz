/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { INITIAL_ADVANCED_OPTIONS_STATE } from 'container/CreateAlertV2/context/constants';

import * as context from '../../context';
import EvaluationCadence, {
	EvaluationCadenceDetails,
} from '../EvaluationCadence';

jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};
	const uplotMock = jest.fn(() => ({
		paths,
	}));
	return {
		paths,
		default: uplotMock,
	};
});

const mockSetAdvancedOptions = jest.fn();
jest.spyOn(context, 'useCreateAlertState').mockReturnValue({
	advancedOptions: INITIAL_ADVANCED_OPTIONS_STATE,
	setAdvancedOptions: mockSetAdvancedOptions,
} as any);

const EDIT_CUSTOM_SCHEDULE_TEXT = 'Edit custom schedule';
const PREVIEW_TEXT = 'Preview';
const EVALUATION_CADENCE_TEXT = 'Evaluation cadence';
const EVALUATION_CADENCE_DESCRIPTION_TEXT =
	'Customize when this Alert Rule will run. By default, it runs every 60 seconds (1 minute).';
const ADD_CUSTOM_SCHEDULE_TEXT = 'Add custom schedule';
const SAVE_CUSTOM_SCHEDULE_TEXT = 'Save Custom Schedule';
const DISCARD_TEXT = 'Discard';

describe('EvaluationCadence', () => {
	it('should render evaluation cadence component in default mode', () => {
		render(<EvaluationCadence />);

		expect(screen.getByText(EVALUATION_CADENCE_TEXT)).toBeInTheDocument();
		expect(
			screen.getByText(EVALUATION_CADENCE_DESCRIPTION_TEXT),
		).toBeInTheDocument();
		expect(screen.getByText(ADD_CUSTOM_SCHEDULE_TEXT)).toBeInTheDocument();
	});

	it('should render evaluation cadence component in custom mode', () => {
		jest.spyOn(context, 'useCreateAlertState').mockReturnValue({
			advancedOptions: {
				...INITIAL_ADVANCED_OPTIONS_STATE,
				evaluationCadence: {
					...INITIAL_ADVANCED_OPTIONS_STATE.evaluationCadence,
					mode: 'custom',
				},
			},
		} as any);
		render(<EvaluationCadence />);

		expect(screen.getByText(EVALUATION_CADENCE_TEXT)).toBeInTheDocument();
		expect(
			screen.getByText(EVALUATION_CADENCE_DESCRIPTION_TEXT),
		).toBeInTheDocument();
		expect(screen.getByText(EDIT_CUSTOM_SCHEDULE_TEXT)).toBeInTheDocument();
		expect(screen.getByText(PREVIEW_TEXT)).toBeInTheDocument();
	});

	it('should render evaluation cadence component in rrule mode', () => {
		jest.spyOn(context, 'useCreateAlertState').mockReturnValue({
			advancedOptions: {
				...INITIAL_ADVANCED_OPTIONS_STATE,
				evaluationCadence: {
					...INITIAL_ADVANCED_OPTIONS_STATE.evaluationCadence,
					mode: 'rrule',
				},
			},
		} as any);
		render(<EvaluationCadence />);

		expect(screen.getByText(EVALUATION_CADENCE_TEXT)).toBeInTheDocument();
		expect(
			screen.getByText(EVALUATION_CADENCE_DESCRIPTION_TEXT),
		).toBeInTheDocument();
		expect(screen.getByText(EDIT_CUSTOM_SCHEDULE_TEXT)).toBeInTheDocument();
		expect(screen.getByText(PREVIEW_TEXT)).toBeInTheDocument();
	});

	it('clicking on discard button should reset the evaluation cadence mode to default', async () => {
		const user = userEvent.setup();

		jest.spyOn(context, 'useCreateAlertState').mockReturnValue({
			advancedOptions: {
				...INITIAL_ADVANCED_OPTIONS_STATE,
				evaluationCadence: {
					...INITIAL_ADVANCED_OPTIONS_STATE.evaluationCadence,
					mode: 'custom',
				},
			},
			setAdvancedOptions: mockSetAdvancedOptions,
		} as any);

		render(<EvaluationCadence />);

		expect(screen.getByText(EVALUATION_CADENCE_TEXT)).toBeInTheDocument();
		expect(
			screen.getByText(EVALUATION_CADENCE_DESCRIPTION_TEXT),
		).toBeInTheDocument();
		expect(screen.getByText(EDIT_CUSTOM_SCHEDULE_TEXT)).toBeInTheDocument();
		expect(screen.getByText(PREVIEW_TEXT)).toBeInTheDocument();

		const discardButton = screen.getByTestId('discard-button');
		await user.click(discardButton);

		expect(mockSetAdvancedOptions).toHaveBeenCalledWith({
			type: 'SET_EVALUATION_CADENCE_MODE',
			payload: 'default',
		});
	});

	it('clicking on preview button should open the preview modal', async () => {
		const user = userEvent.setup();

		jest.spyOn(context, 'useCreateAlertState').mockReturnValue({
			advancedOptions: {
				...INITIAL_ADVANCED_OPTIONS_STATE,
				evaluationCadence: {
					...INITIAL_ADVANCED_OPTIONS_STATE.evaluationCadence,
					mode: 'custom',
				},
			},
			setAdvancedOptions: mockSetAdvancedOptions,
		} as any);

		render(<EvaluationCadence />);

		expect(screen.queryByText(SAVE_CUSTOM_SCHEDULE_TEXT)).not.toBeInTheDocument();
		expect(screen.queryByText(DISCARD_TEXT)).not.toBeInTheDocument();

		const previewButton = screen.getByText(PREVIEW_TEXT);
		await user.click(previewButton);

		expect(screen.getByText(SAVE_CUSTOM_SCHEDULE_TEXT)).toBeInTheDocument();
		expect(screen.getByText(DISCARD_TEXT)).toBeInTheDocument();
	});
});

it('clicking on edit custom schedule button should open the edit custom schedule modal', async () => {
	const user = userEvent.setup();

	jest.spyOn(context, 'useCreateAlertState').mockReturnValue({
		advancedOptions: {
			...INITIAL_ADVANCED_OPTIONS_STATE,
			evaluationCadence: {
				...INITIAL_ADVANCED_OPTIONS_STATE.evaluationCadence,
				mode: 'custom',
			},
		},
		setAdvancedOptions: mockSetAdvancedOptions,
	} as any);

	render(<EvaluationCadence />);

	expect(screen.queryByText(SAVE_CUSTOM_SCHEDULE_TEXT)).not.toBeInTheDocument();
	expect(screen.queryByText(DISCARD_TEXT)).not.toBeInTheDocument();

	const editCustomScheduleButton = screen.getByText(EDIT_CUSTOM_SCHEDULE_TEXT);
	await user.click(editCustomScheduleButton);

	expect(screen.getByText(SAVE_CUSTOM_SCHEDULE_TEXT)).toBeInTheDocument();
	expect(screen.getByText(DISCARD_TEXT)).toBeInTheDocument();
});

const mockSetIsOpen = jest.fn();

const RULE_VIEW_TEXT = 'RRule';
const EDITOR_VIEW_TEST_ID = 'editor-view';
const RULE_VIEW_TEST_ID = 'rrule-view';

describe('EvaluationCadenceDetails', () => {
	it('should render evaluation cadence details component', () => {
		render(<EvaluationCadenceDetails isOpen setIsOpen={mockSetIsOpen} />);

		expect(screen.getByText('Add Custom Schedule')).toBeInTheDocument();
		expect(screen.getByText(SAVE_CUSTOM_SCHEDULE_TEXT)).toBeInTheDocument();
		expect(screen.getByText(DISCARD_TEXT)).toBeInTheDocument();
	});

	it('should open the editor tab by default', () => {
		render(<EvaluationCadenceDetails isOpen setIsOpen={mockSetIsOpen} />);

		expect(screen.getByTestId(EDITOR_VIEW_TEST_ID)).toBeInTheDocument();
		expect(screen.queryByTestId(RULE_VIEW_TEST_ID)).not.toBeInTheDocument();
	});

	it('should open the rrule tab when rrule tab is clicked', async () => {
		const user = userEvent.setup();
		render(<EvaluationCadenceDetails isOpen setIsOpen={mockSetIsOpen} />);

		expect(screen.getByTestId(EDITOR_VIEW_TEST_ID)).toBeInTheDocument();
		expect(screen.queryByTestId(RULE_VIEW_TEST_ID)).not.toBeInTheDocument();

		const rruleTab = screen.getByText(RULE_VIEW_TEXT);
		await user.click(rruleTab);
		expect(screen.queryByTestId(EDITOR_VIEW_TEST_ID)).not.toBeInTheDocument();
		expect(screen.getByTestId(RULE_VIEW_TEST_ID)).toBeInTheDocument();
	});
});
