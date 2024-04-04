import { fireEvent, render, screen } from '@testing-library/react';

import CustomDateTimeModal from './index';

describe('CustomDateTimeModal', () => {
	const handleCreate = jest.fn();
	const handleCancel = jest.fn();

	beforeEach(() => {
		render(
			<CustomDateTimeModal
				visible
				onCreate={handleCreate}
				onCancel={handleCancel}
				setCustomDTPickerVisible={jest.fn()}
			/>,
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('renders the modal with title and buttons', () => {
		expect(screen.getByText('Chose date and time range')).toBeInTheDocument();
		expect(screen.getByText('Apply')).toBeInTheDocument();
		expect(screen.getByText('Cancel')).toBeInTheDocument();
	});

	it('donot calls onCreate when the Apply button is clicked without selecting dates', () => {
		fireEvent.click(screen.getByText('Apply'));

		expect(handleCreate).toHaveBeenCalledTimes(0);
		expect(handleCreate).not.toHaveBeenCalledWith(undefined);
	});

	it('calls onCancel when Cancel button is clicked', () => {
		fireEvent.click(screen.getByText('Cancel'));

		expect(handleCancel).toHaveBeenCalledTimes(1);
	});
});
