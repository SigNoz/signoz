import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { QUERY_BUILDER_URL } from '../../constants/app';
import ExplorerCard from './index';

const toolTipText = 'More details on how to use query builder';

type RenderExplorerCard = () => ReturnType<typeof render>;

const renderExplorerCard: RenderExplorerCard = () =>
	render(
		<ExplorerCard>
			<div>Test Children</div>
		</ExplorerCard>,
	);

describe('Test components/ExplorerCard', () => {
	it('Should render the component properly', async () => {
		renderExplorerCard();

		const typographyEl = screen.getByText('Query Builder');
		const childrenEl = screen.getByText('Test Children');
		const imgEl = screen.getByRole('img');

		expect(typographyEl).toBeInTheDocument();
		expect(childrenEl).toBeInTheDocument();
		expect(imgEl).toBeInTheDocument();
	});

	it('Should render the tooltip inside of card properly', async () => {
		renderExplorerCard();
		const imgEl = screen.getByRole('img');

		expect(imgEl).toBeInTheDocument();

		fireEvent.mouseOver(imgEl);

		await waitFor(() => {
			const tooltip = screen.getByText(toolTipText);
			const linkEl = screen.getByText('here');

			expect(tooltip).toBeInTheDocument();
			expect(linkEl).toHaveAttribute('href', QUERY_BUILDER_URL);
			expect(linkEl).toHaveAttribute('target', '_blank');
		});
	});
});
