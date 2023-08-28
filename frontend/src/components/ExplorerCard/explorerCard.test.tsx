import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import ExplorerCard from './index';

const hrefLink =
	'https://signoz.io/docs/userguide/query-builder/?utm_source=product&utm_medium=new-query-builder';

const toolTipText = 'More details on how to use query builder';

type RenderExplorerCard = () => ReturnType<typeof render>;

const renderExplorerCard: RenderExplorerCard = () =>
	render(
		<ExplorerCard>
			<div>Test Children</div>
		</ExplorerCard>,
	);

describe('Test ExplorerCard', () => {
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
			expect(linkEl).toHaveAttribute('href', hrefLink);
			expect(linkEl).toHaveAttribute('target', '_blank');
		});
	});
});
