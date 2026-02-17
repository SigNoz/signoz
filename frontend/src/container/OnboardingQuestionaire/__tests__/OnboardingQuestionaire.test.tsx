/* eslint-disable sonarjs/no-duplicate-string */
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import OnboardingQuestionaire from '../index';

// Mock dependencies
jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('lib/history', () => ({
	__esModule: true,
	default: {
		push: jest.fn(),
		location: {
			pathname: '/onboarding',
			search: '',
			hash: '',
			state: null,
		},
	},
}));

// API Endpoints
const ORG_PREFERENCES_ENDPOINT = '*/api/v1/org/preferences/list';
const UPDATE_ORG_PREFERENCE_ENDPOINT = '*/api/v1/org/preferences/name/update';
const UPDATE_PROFILE_ENDPOINT = '*/api/gateway/v2/profiles/me';
const EDIT_ORG_ENDPOINT = '*/api/v2/orgs/me';
const INVITE_USERS_ENDPOINT = '*/api/v1/invite/bulk/create';

const mockOrgPreferences = {
	data: {
		org_onboarding: false,
	},
	status: 'success',
};

describe('OnboardingQuestionaire Component', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		server.use(
			rest.get(ORG_PREFERENCES_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json(mockOrgPreferences)),
			),
			rest.put(EDIT_ORG_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(204), ctx.json({ status: 'success' })),
			),
			rest.put(UPDATE_PROFILE_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'success', data: {} })),
			),
			rest.post(UPDATE_ORG_PREFERENCE_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'success' })),
			),
			rest.post(INVITE_USERS_ENDPOINT, (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ status: 'success' })),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	describe('Step 1: Organization Details', () => {
		it('renders organization questions on initial load', () => {
			render(<OnboardingQuestionaire />);

			expect(screen.getByText(/welcome to signoz cloud/i)).toBeInTheDocument();

			expect(
				screen.getByText(/which observability tool do you currently use/i),
			).toBeInTheDocument();
		});

		it('disables next button when required fields are empty', () => {
			render(<OnboardingQuestionaire />);

			const nextButton = screen.getByRole('button', { name: /next/i });
			expect(nextButton).toBeDisabled();
		});

		it('enables next button when all required fields are filled', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			const datadogCheckbox = screen.getByLabelText(/datadog/i);
			await user.click(datadogCheckbox);

			const otelYes = screen.getByRole('radio', { name: /yes/i });
			await user.click(otelYes);
			await user.click(screen.getByLabelText(/just exploring/i));

			const nextButton = await screen.findByRole('button', { name: /next/i });
			expect(nextButton).not.toBeDisabled();
		});

		it('shows other tool input when Others is selected', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			const othersCheckbox = screen.getByLabelText(/^others$/i);
			await user.click(othersCheckbox);

			expect(
				await screen.findByPlaceholderText(/what tool do you currently use/i),
			).toBeInTheDocument();
		});

		it('shows migration timeline options only when specific observability tools are selected', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			// Initially not visible
			expect(
				screen.queryByText(/What is your timeline for migrating to SigNoz/i),
			).not.toBeInTheDocument();

			const datadogCheckbox = screen.getByLabelText(/datadog/i);
			await user.click(datadogCheckbox);

			expect(
				await screen.findByText(/What is your timeline for migrating to SigNoz/i),
			).toBeInTheDocument();

			// Not visible when None is selected
			const noneCheckbox = screen.getByLabelText(/none\/starting fresh/i);
			await user.click(noneCheckbox);

			expect(
				screen.queryByText(/What is your timeline for migrating to SigNoz/i),
			).not.toBeInTheDocument();
		});

		it('proceeds to step 2 when next is clicked', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			await user.click(screen.getByLabelText(/datadog/i));
			await user.click(screen.getByRole('radio', { name: /yes/i }));
			await user.click(screen.getByLabelText(/just exploring/i));

			const nextButton = screen.getByRole('button', { name: /next/i });
			await user.click(nextButton);

			expect(
				await screen.findByText(/how did you first come across signoz/i, {}),
			).toBeInTheDocument();
		});
	});

	describe('Step 2: About SigNoz', () => {
		it('renders about signoz questions after step 1 completion', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			// Navigate to step 2

			await user.click(screen.getByLabelText(/datadog/i));
			await user.click(screen.getByRole('radio', { name: /yes/i }));
			await user.click(screen.getByLabelText(/just exploring/i));
			await user.click(screen.getByRole('button', { name: /next/i }));

			expect(
				await screen.findByText(/set up your workspace/i, {}),
			).toBeInTheDocument();
			expect(
				await screen.findByText(/how did you first come across signoz/i, {}),
			).toBeInTheDocument();
		});

		it('disables next button when fields are empty', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			// Navigate to step 2

			await user.click(screen.getByLabelText(/datadog/i));
			await user.click(screen.getByRole('radio', { name: /yes/i }));
			await user.click(screen.getByLabelText(/just exploring/i));
			await user.click(screen.getByRole('button', { name: /next/i }));

			await waitFor(() => {
				const nextButton = screen.getByRole('button', { name: /next/i });
				expect(nextButton).toBeDisabled();
			});
		});

		it('enables next button when all fields are filled', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			// Navigate to step 2

			await user.click(screen.getByLabelText(/datadog/i));
			await user.click(screen.getByRole('radio', { name: /yes/i }));
			await user.click(screen.getByLabelText(/just exploring/i));
			await user.click(screen.getByRole('button', { name: /next/i }));

			expect(
				await screen.findByPlaceholderText(/e\.g\., googling/i, {}),
			).toBeInTheDocument();

			const discoverInput = screen.getByPlaceholderText(/e\.g\., googling/i);
			await user.type(discoverInput, 'Found via Google search');

			const interestCheckbox = screen.getByLabelText(
				/lowering observability costs/i,
			);
			await user.click(interestCheckbox);

			const nextButton = await screen.findByRole('button', { name: /next/i });
			expect(nextButton).not.toBeDisabled();
		});

		it('shows other interest input when Others checkbox is selected', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			// Navigate to step 2

			await user.click(screen.getByLabelText(/datadog/i));
			await user.click(screen.getByRole('radio', { name: /yes/i }));
			await user.click(screen.getByLabelText(/just exploring/i));
			await user.click(screen.getByRole('button', { name: /next/i }));

			expect(
				await screen.findByText(/what got you interested in signoz/i, {}),
			).toBeInTheDocument();

			const othersCheckbox = screen.getByLabelText(/^others$/i);
			await user.click(othersCheckbox);

			expect(
				await screen.findByPlaceholderText(
					/what got you interested in signoz/i,
					{},
				),
			).toBeInTheDocument();
		});
	});

	describe('Step 3: Optimize SigNoz Needs', () => {
		it('renders scale questions after step 2 completion', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			// Navigate through steps 1 and 2

			await user.click(screen.getByLabelText(/datadog/i));
			await user.click(screen.getByRole('radio', { name: /yes/i }));
			await user.click(screen.getByLabelText(/just exploring/i));
			await user.click(screen.getByRole('button', { name: /next/i }));

			expect(
				await screen.findByPlaceholderText(/e\.g\., googling/i, {}),
			).toBeInTheDocument();

			await user.type(
				screen.getByPlaceholderText(/e\.g\., googling/i),
				'Found via Google',
			);
			await user.click(screen.getByLabelText(/lowering observability costs/i));
			await user.click(screen.getByRole('button', { name: /next/i }));

			expect(
				await screen.findByText(
					/what does your scale approximately look like/i,
					{},
				),
			).toBeInTheDocument();
			expect(await screen.findByText(/logs \/ day/i, {})).toBeInTheDocument();
			expect(
				await screen.findByText(/number of services/i, {}),
			).toBeInTheDocument();
		});

		it('shows do later button', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			render(<OnboardingQuestionaire />);

			// Navigate to step 3

			await user.click(screen.getByLabelText(/datadog/i));
			await user.click(screen.getByRole('radio', { name: /yes/i }));
			await user.click(screen.getByLabelText(/just exploring/i));
			await user.click(screen.getByRole('button', { name: /next/i }));

			expect(
				await screen.findByPlaceholderText(/e\.g\., googling/i, {}),
			).toBeInTheDocument();

			await user.type(
				screen.getByPlaceholderText(/e\.g\., googling/i),
				'Found via Google',
			);
			await user.click(screen.getByLabelText(/lowering observability costs/i));
			await user.click(screen.getByRole('button', { name: /next/i }));

			expect(
				await screen.findByRole('button', { name: /i'll do this later/i }),
			).toBeInTheDocument();
		});
	});
});
