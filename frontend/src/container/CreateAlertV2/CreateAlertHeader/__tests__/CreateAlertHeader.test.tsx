import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { defaultPostableAlertRuleV2 } from 'container/CreateAlertV2/constants';
import { getCreateAlertLocalStateFromAlertDef } from 'container/CreateAlertV2/utils';
import * as useQueryBuilderHook from 'hooks/queryBuilder/useQueryBuilder';
import * as useSafeNavigateHook from 'hooks/useSafeNavigate';
import { fireEvent, render, screen, userEvent } from 'tests/test-utils';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { EQueryType } from 'types/common/dashboard';

import * as rulesHook from '../../../../api/generated/services/rules';
import * as createAlertContext from '../../context';
import { CreateAlertProvider } from '../../context';
import type { ICreateAlertContextProps } from '../../context/types';
import { createMockAlertContextState } from '../../EvaluationSettings/__tests__/testUtils';
import CreateAlertHeader from '../CreateAlertHeader';

const mockSafeNavigate = jest.fn();
jest.spyOn(useSafeNavigateHook, 'useSafeNavigate').mockReturnValue({
	safeNavigate: mockSafeNavigate,
});

jest.spyOn(rulesHook, 'useCreateRule').mockReturnValue({
	mutate: jest.fn(),
	isLoading: false,
} as any);
jest.spyOn(rulesHook, 'useTestRule').mockReturnValue({
	mutate: jest.fn(),
	isLoading: false,
} as any);
jest.spyOn(rulesHook, 'useUpdateRuleByID').mockReturnValue({
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

let mockSearch = '';
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { search: string } => ({
		search: mockSearch,
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

	it('should not render "switch to classic experience" button for an AI traces alert', () => {
		mockSearch = `?${QueryParams.alertType}=${AlertTypes.AI_TRACES_BASED_ALERT}`;
		renderCreateAlertHeader();
		mockSearch = '';

		expect(screen.getByText('New Alert Rule')).toBeInTheDocument();
		expect(
			screen.queryByText('Switch to Classic Experience'),
		).not.toBeInTheDocument();
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
	it('should reject a label key used as a group by in an AI query', async () => {
		const user = userEvent.setup();
		const mockSetAlertState = jest.fn() as jest.MockedFunction<
			ICreateAlertContextProps['setAlertState']
		>;
		const alertStateSpy = jest
			.spyOn(createAlertContext, 'useCreateAlertState')
			.mockReturnValue(
				createMockAlertContextState({
					alertType: AlertTypes.AI_TRACES_BASED_ALERT,
					setAlertState: mockSetAlertState,
				}),
			);
		const queryBuilderSpy = jest
			.spyOn(useQueryBuilderHook, 'useQueryBuilder')
			.mockReturnValue({
				currentQuery: {
					queryType: EQueryType.AI_QUERY_BUILDER,
					builder: { queryData: [] },
					builder_ai_query: {
						queryData: [{ queryName: 'A', groupBy: [{ key: 'service.name' }] }],
					},
				},
			} as unknown as ReturnType<typeof useQueryBuilderHook.useQueryBuilder>);

		render(<CreateAlertHeader />);
		await user.click(screen.getByText('+ Add labels'));
		await user.type(
			screen.getByPlaceholderText('Enter key'),
			'service.name:foo{Enter}',
		);

		expect(mockSetAlertState).not.toHaveBeenCalledWith(
			expect.objectContaining({ type: 'SET_ALERT_LABELS' }),
		);

		alertStateSpy.mockRestore();
		queryBuilderSpy.mockRestore();
	});
});
