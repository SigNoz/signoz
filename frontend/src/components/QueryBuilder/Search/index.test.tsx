import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryBuilderContainer } from 'container/QueryBuilder';
import React from 'react';

import QueryBuilderSearch from './index';

const locationGeneral = {
	search: '',
	pathname: '/logs',
};

type LocationT = typeof locationGeneral;

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): LocationT => locationGeneral,
}));

const component = (
	<QueryBuilderContainer>
		<QueryBuilderSearch />
	</QueryBuilderContainer>
);

describe('Query search', () => {
	it('on change input', async () => {
		render(component);
		const select = await screen.getByRole('combobox');
		fireEvent.change(select, { target: { value: 'name' } });
		expect(select).toHaveValue('name');
	});

	it('get options', async () => {
		render(component);
		const select = await screen.getByRole('combobox');
		fireEvent.change(select, { target: { value: 'service' } });
		await waitFor(() => {
			const options = document.querySelectorAll('[role="option"]');
			expect(options.length).toBe(2);
			const values = Array.from(options).map((el) => el.innerHTML);
			expect(values).toEqual(['service_name', 'service_namespace']);
		});
	});
});
