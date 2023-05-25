import { render, screen } from '@testing-library/react';

import Spinner from '.';

describe('Spinner', () => {
	test('should render the spinner', () => {
		render(<Spinner />);
		const svgElement = screen.getByRole('img');
		expect(svgElement).toBeInTheDocument();
	});

	test('should render with tip text', () => {
		render(<Spinner tip="Loading..." />);
		const svgElement = screen.getByText(/Loading.../i);
		expect(svgElement).toBeInTheDocument();
	});
});
