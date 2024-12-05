import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import InputComponent from './index';

describe('InputComponent', () => {
	test('renders input component with label and placeholder', () => {
		const label = 'Username';
		const placeholder = 'Enter your username';
		render(<InputComponent value="" label={label} placeholder={placeholder} />);

		const inputElement = screen.getByLabelText(label);

		expect(inputElement).toBeInTheDocument();
		expect(inputElement).toHaveAttribute('placeholder', placeholder);
	});

	test('calls onChangeHandler when input value changes', () => {
		const onChangeHandler = jest.fn();
		render(
			<InputComponent value={undefined} onChangeHandler={onChangeHandler} />,
		);

		const inputElement = screen.getByRole('textbox');
		const testValue = 'Test value';

		fireEvent.change(inputElement, { target: { value: testValue } });

		expect(onChangeHandler).toHaveBeenCalledTimes(1);
		expect(onChangeHandler).toHaveBeenCalledWith(
			expect.objectContaining({
				target: expect.objectContaining({ value: testValue }),
			}),
		);
	});

	test('calls onBlurHandler when input loses focus', () => {
		const onBlurHandler = jest.fn();
		render(<InputComponent value="" onBlurHandler={onBlurHandler} />);

		const inputElement = screen.getByRole('textbox');

		fireEvent.blur(inputElement);

		expect(onBlurHandler).toHaveBeenCalledTimes(1);
		expect(onBlurHandler).toHaveBeenCalledWith(expect.any(Object));
	});

	test('calls onPressEnterHandler when Enter key is pressed in input', () => {
		const onPressEnterHandler = jest.fn();
		render(<InputComponent value="" onPressEnterHandler={onPressEnterHandler} />);

		const inputElement = screen.getByRole('textbox');

		fireEvent.keyDown(inputElement, { key: 'Enter', code: 'Enter' });

		expect(onPressEnterHandler).toHaveBeenCalledTimes(1);
		expect(onPressEnterHandler).toHaveBeenCalledWith(expect.any(Object));
	});

	test('renders input component with addonBefore', () => {
		const addonContent = 'http://';
		render(<InputComponent value="" addonBefore={addonContent} />);

		const addonElement = screen.getByText(addonContent);

		expect(addonElement).toBeInTheDocument();
	});
});
