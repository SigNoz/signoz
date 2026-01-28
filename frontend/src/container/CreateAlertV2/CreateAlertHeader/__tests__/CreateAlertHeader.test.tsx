/* eslint-disable react/jsx-props-no-spreading */
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { defaultPostableAlertRuleV2 } from 'container/CreateAlertV2/constants';
import { getCreateAlertLocalStateFromAlertDef } from 'container/CreateAlertV2/utils';
import * as useSafeNavigateHook from 'hooks/useSafeNavigate';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import * as useCreateAlertRuleHook from '../../../../hooks/alerts/useCreateAlertRule';
import * as useTestAlertRuleHook from '../../../../hooks/alerts/useTestAlertRule';
import * as useUpdateAlertRuleHook from '../../../../hooks/alerts/useUpdateAlertRule';
import { CreateAlertProvider } from '../../context';
import CreateAlertHeader from '../CreateAlertHeader';

const mockSafeNavigate = jest.fn();
jest.spyOn(useSafeNavigateHook, 'useSafeNavigate').mockReturnValue({
	safeNavigate: mockSafeNavigate,
});

jest.spyOn(useCreateAlertRuleHook, 'useCreateAlertRule').mockReturnValue({
	mutate: jest.fn(),
	isLoading: false,
} as any);
jest.spyOn(useTestAlertRuleHook, 'useTestAlertRule').mockReturnValue({
	mutate: jest.fn(),
	isLoading: false,
} as any);
jest.spyOn(useUpdateAlertRuleHook, 'useUpdateAlertRule').mockReturnValue({
	mutate: jest.fn(),
	isLoading: false,
} as any);

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

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { search: string } => ({
		search: '',
	}),
}));

const ENTER_ALERT_RULE_NAME_PLACEHOLDER = 'Enter alert rule name';

const renderCreateAlertHeader = (): ReturnType<typeof render> =>
	render(
		<CreateAlertProvider initialAlertType={AlertTypes.METRICS_BASED_ALERT}>
			<CreateAlertHeader />
		</CreateAlertProvider>,
	);

describe('CreateAlertHeader', () => {
	it('renders the header with title', () => {
		renderCreateAlertHeader();
		expect(screen.getByText('New Alert Rule')).toBeInTheDocument();
	});

	it('renders name input with placeholder', () => {
		renderCreateAlertHeader();
		const nameInput = screen.getByPlaceholderText(
			ENTER_ALERT_RULE_NAME_PLACEHOLDER,
		);
		expect(nameInput).toBeInTheDocument();
	});

	it('renders LabelsInput component', () => {
		renderCreateAlertHeader();
		expect(screen.getByText('+ Add labels')).toBeInTheDocument();
	});

	it('updates name when typing in name input', () => {
		renderCreateAlertHeader();
		const nameInput = screen.getByPlaceholderText(
			ENTER_ALERT_RULE_NAME_PLACEHOLDER,
		);

		fireEvent.change(nameInput, { target: { value: 'Test Alert' } });

		expect(nameInput).toHaveValue('Test Alert');
	});

	it('renders the header with title when isEditMode is true', () => {
		render(
			<CreateAlertProvider
				isEditMode
				initialAlertType={AlertTypes.METRICS_BASED_ALERT}
				initialAlertState={getCreateAlertLocalStateFromAlertDef(
					defaultPostableAlertRuleV2,
				)}
			>
				<CreateAlertHeader />
			</CreateAlertProvider>,
		);
		expect(screen.queryByText('New Alert Rule')).not.toBeInTheDocument();
		expect(
			screen.getByPlaceholderText(ENTER_ALERT_RULE_NAME_PLACEHOLDER),
		).toHaveValue('TEST_ALERT');
	});

	it('should navigate to classic experience when button is clicked', () => {
		renderCreateAlertHeader();
		const switchToClassicExperienceButton = screen.getByText(
			'Switch to Classic Experience',
		);
		expect(switchToClassicExperienceButton).toBeInTheDocument();
		fireEvent.click(switchToClassicExperienceButton);

		const params = new URLSearchParams();
		params.set(QueryParams.showClassicCreateAlertsPage, 'true');
		expect(mockSafeNavigate).toHaveBeenCalledWith(
			`${ROUTES.ALERTS_NEW}?${params.toString()}`,
			{ replace: true },
		);
	});

	it('should not render "switch to classic experience" button when isEditMode is true', () => {
		render(
			<CreateAlertProvider
				isEditMode
				initialAlertType={AlertTypes.METRICS_BASED_ALERT}
				initialAlertState={getCreateAlertLocalStateFromAlertDef(
					defaultPostableAlertRuleV2,
				)}
			>
				<CreateAlertHeader />
			</CreateAlertProvider>,
		);
		expect(
			screen.queryByText('Switch to Classic Experience'),
		).not.toBeInTheDocument();
	});
});
