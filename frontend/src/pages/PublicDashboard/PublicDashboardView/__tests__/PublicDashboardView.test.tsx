import {
	DashboardtypesSourceDTO,
	DashboardtypesVariableEnvelopeGithubComSigNozSignozPkgTypesDashboardtypesTextVariableSpecDTOKind as TextVariableKind,
	type DashboardtypesGettablePublicDashboardDataV2DTO,
} from 'api/generated/services/sigNoz.schemas';
import { getCurrentLocation } from 'lib/router/navigation';
import { render, screen } from 'tests/test-utils';

import PublicDashboardView from '../PublicDashboardView';

const mockContainer = jest.fn();

jest.mock('pages/DashboardPage/DashboardContainer', () => ({
	__esModule: true,
	default: (props: unknown): JSX.Element => {
		mockContainer(props);
		return <div data-testid="dashboard-container" />;
	},
}));

function buildData(
	timeRangeEnabled: boolean,
): DashboardtypesGettablePublicDashboardDataV2DTO {
	return {
		dashboard: {
			id: 'internal-id',
			name: 'my-v2-dashboard',
			orgId: 'org',
			locked: false,
			source: DashboardtypesSourceDTO.user,
			tags: [],
			schemaVersion: 'v6',
			spec: {
				display: { name: 'My V2 Dashboard' },
				layouts: [],
				panels: {},
				variables: [
					{
						kind: TextVariableKind.TextVariable,
						spec: { name: 'env', display: { name: 'env' }, value: 'prod' },
					},
				],
			},
		},
		publicDashboard: { timeRangeEnabled, defaultTimeRange: '6h' },
	};
}

interface ContainerProps {
	dashboard: { id: string; spec: { variables: unknown[] } };
	readOnly: boolean;
	controls: { toolbar?: unknown; panelActions?: { zoom?: boolean } };
	queryRunner: { key: string };
}

function lastContainerProps(): ContainerProps {
	return mockContainer.mock.calls.at(-1)?.[0] as ContainerProps;
}

describe('PublicDashboardView', () => {
	beforeEach(() => mockContainer.mockReset());

	it('mounts the shared dashboard read-only on the public endpoint, without variables', () => {
		render(
			<PublicDashboardView publicDashboardId="pub-1" data={buildData(true)} />,
			undefined,
			{ initialRoute: '/public/dashboard/pub-1' },
		);

		expect(screen.getByText('My V2 Dashboard')).toBeInTheDocument();
		const props = lastContainerProps();
		expect(props.readOnly).toBe(true);
		expect(props.queryRunner.key).toBe('public:pub-1');
		expect(props.dashboard.id).toBe('public:pub-1');
		expect(props.dashboard.spec.variables).toStrictEqual([]);
		expect(props.controls.toolbar).toStrictEqual({ variables: false });
		expect(props.controls.panelActions?.zoom).toBeUndefined();
	});

	it('starts on the shared default range', () => {
		render(
			<PublicDashboardView publicDashboardId="pub-1" data={buildData(true)} />,
			undefined,
			{ initialRoute: '/public/dashboard/pub-1' },
		);

		expect(getCurrentLocation().search).toContain('relativeTime=6h');
	});

	it("keeps the viewer's range when the link lets them change it", () => {
		render(
			<PublicDashboardView publicDashboardId="pub-1" data={buildData(true)} />,
			undefined,
			{ initialRoute: '/public/dashboard/pub-1?relativeTime=1h' },
		);

		expect(getCurrentLocation().search).toContain('relativeTime=1h');
	});

	it('pins the shared range and hides the toolbar when the link fixes the time', () => {
		render(
			<PublicDashboardView publicDashboardId="pub-1" data={buildData(false)} />,
			undefined,
			{ initialRoute: '/public/dashboard/pub-1?relativeTime=1h' },
		);

		expect(getCurrentLocation().search).toContain('relativeTime=6h');
		expect(lastContainerProps().controls.toolbar).toBe(false);
		expect(lastContainerProps().controls.panelActions?.zoom).toBe(false);
	});
});
