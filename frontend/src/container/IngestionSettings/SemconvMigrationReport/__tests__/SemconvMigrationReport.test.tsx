import {
	type GetSemconvMigrationReport200,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen } from 'tests/test-utils';

import SemconvMigrationReport from '../SemconvMigrationReport';

const REPORT_URL = '*/api/v1/fields/semconv-migration';

const report: GetSemconvMigrationReport200 = {
	status: 'success',
	data: {
		startUnixMilli: 1764115200000,
		endUnixMilli: 1764201600000,
		entries: [
			{
				current: 'deployment.environment.name',
				old: 'deployment.environment',
				signal: TelemetrytypesSignalDTO.traces,
				services: ['cart', 'checkout'],
				resourceSets: 3,
				lastSeenUnixMilli: 1764180000000,
			},
		],
	},
};

describe('SemconvMigrationReport', () => {
	it('lists the services that send only the old name', async () => {
		server.use(
			rest.get(REPORT_URL, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(report)),
			),
		);

		render(<SemconvMigrationReport />);

		await expect(
			screen.findByTestId(
				'semconv-migration-services-traces-deployment.environment',
			),
		).resolves.toHaveTextContent('cart, checkout');
	});

	it('says that no service is behind when the report is empty', async () => {
		const empty: GetSemconvMigrationReport200 = {
			...report,
			data: { ...report.data, entries: [] },
		};
		server.use(
			rest.get(REPORT_URL, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(empty)),
			),
		);

		render(<SemconvMigrationReport />);

		await expect(
			screen.findByTestId('semconv-migration-report-empty'),
		).resolves.toHaveTextContent(
			'No old-only services found in the last 24 hours',
		);
	});

	it('shows an error when the report does not load', async () => {
		server.use(
			rest.get(REPORT_URL, (_req, res, ctx) =>
				res(
					ctx.status(500),
					ctx.json({
						status: 'error',
						error: { code: 'internal', message: 'boom' },
					}),
				),
			),
		);

		render(<SemconvMigrationReport />);

		await expect(
			screen.findByTestId('semconv-migration-report-error'),
		).resolves.toHaveTextContent(
			'Could not load the semantic convention migration report',
		);
	});
});
