import { PipelineSimulationRequest } from 'api/pipeline/preview';
import { pipelineMockData } from 'container/PipelinePage/mocks/pipeline';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import { queryRangeV5Handler } from '../../__tests__/fixtures';
import PipelineProcessingPreview from '../index';

describe('PipelineProcessingPreview', () => {
	it('sends object bodies to the simulation as JSON strings', async () => {
		const simulations: PipelineSimulationRequest[] = [];
		server.use(
			queryRangeV5Handler({
				rows: [
					{
						timestamp: '2026-11-16T10:00:02Z',
						data: {
							id: 'log-2',
							body: { order: { id: 'o-1' }, message: 'order placed' },
						},
					},
					{
						timestamp: '2026-11-16T10:00:01Z',
						data: { id: 'log-1', body: 'payment charged' },
					},
				],
				count: 2,
			}),
			rest.post('*/api/v1/logs/pipelines/preview', async (req, res, ctx) => {
				const body: PipelineSimulationRequest = await req.json();
				simulations.push(body);
				return res(
					ctx.status(200),
					ctx.json({ status: 'success', data: { logs: body.logs } }),
				);
			}),
		);
		const user = userEvent.setup();

		render(<PipelineProcessingPreview pipeline={pipelineMockData[0]} />);

		await expect(
			screen.findAllByTestId('pipeline-preview-log'),
		).resolves.toHaveLength(2);
		await user.click(screen.getByTestId('pipeline-simulate-processing'));

		await waitFor(() => expect(simulations).toHaveLength(1));
		expect(simulations[0].logs.map((log) => log.body)).toStrictEqual([
			'{"order":{"id":"o-1"},"message":"order placed"}',
			'payment charged',
		]);
	});
});
