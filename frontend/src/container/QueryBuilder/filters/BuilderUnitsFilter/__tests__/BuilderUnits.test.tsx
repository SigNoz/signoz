import { render, screen } from 'tests/test-utils';

import { BuilderUnitsFilter } from '../BuilderUnits';

describe('BuilderUnitsFilter', () => {
	it('adds the passed classes to the row and the label', () => {
		render(
			<BuilderUnitsFilter className="row-class" labelClassName="label-class" />,
		);

		expect(screen.getByTestId('builder-units-filter')).toHaveClass(
			'builder-units-filter',
			'row-class',
		);
		expect(screen.getByTestId('builder-units-filter-label')).toHaveClass(
			'builder-units-filter-label',
			'label-class',
		);
	});
});
