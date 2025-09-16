/* eslint-disable react/jsx-props-no-spreading */
import { fireEvent, render, screen } from '@testing-library/react';

import { CreateAlertProvider } from '../../context';
import CreateAlertHeader from '../CreateAlertHeader';

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

const renderCreateAlertHeader = (): ReturnType<typeof render> =>
	render(
		<CreateAlertProvider>
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
		const nameInput = screen.getByPlaceholderText('Enter alert rule name');
		expect(nameInput).toBeInTheDocument();
	});

	it('renders description input with placeholder', () => {
		renderCreateAlertHeader();
		const descriptionInput = screen.getByPlaceholderText(
			'Click to add description...',
		);
		expect(descriptionInput).toBeInTheDocument();
	});

	it('renders LabelsInput component', () => {
		renderCreateAlertHeader();
		expect(screen.getByText('+ Add labels')).toBeInTheDocument();
	});

	it('updates name when typing in name input', () => {
		renderCreateAlertHeader();
		const nameInput = screen.getByPlaceholderText('Enter alert rule name');

		fireEvent.change(nameInput, { target: { value: 'Test Alert' } });

		expect(nameInput).toHaveValue('Test Alert');
	});

	it('updates description when typing in description input', () => {
		renderCreateAlertHeader();
		const descriptionInput = screen.getByPlaceholderText(
			'Click to add description...',
		);
		fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
		expect(descriptionInput).toHaveValue('Test Description');
	});
});
