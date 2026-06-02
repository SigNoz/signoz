import { render, screen, userEvent } from 'tests/test-utils';
import { IClickHouseQuery } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { QueryBuilderContextType } from 'types/common/queryBuilder';

import ClickHouseQueryBuilder from '../query';

jest.mock('@monaco-editor/react', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="monaco-editor-mock" />,
}));

const queryData: IClickHouseQuery = {
	name: 'A',
	legend: '',
	query: 'SELECT 1',
	disabled: false,
};

const buildOverrides = (
	overrides: Partial<QueryBuilderContextType> = {},
): Partial<QueryBuilderContextType> => ({
	handleSetQueryItemData: jest.fn(),
	removeQueryTypeItemByIndex: jest.fn(),
	...overrides,
});

describe('ClickHouseQueryBuilder', () => {
	it('passes runAfterUpdate when toggling disable so the query stages-and-runs', async () => {
		const user = userEvent.setup();
		const handleSetQueryItemData = jest.fn();

		render(
			<ClickHouseQueryBuilder
				queryData={queryData}
				queryIndex={0}
				deletable={false}
			/>,
			undefined,
			{ queryBuilderOverrides: buildOverrides({ handleSetQueryItemData }) },
		);

		await user.click(screen.getByRole('button', { name: /A/i }));

		expect(handleSetQueryItemData).toHaveBeenCalledTimes(1);
		expect(handleSetQueryItemData).toHaveBeenCalledWith(
			0,
			EQueryType.CLICKHOUSE,
			expect.objectContaining({ ...queryData, disabled: true }),
			{ runAfterUpdate: true },
		);
	});

	it('does not pass runAfterUpdate for non-disable updates (delete)', async () => {
		const user = userEvent.setup();
		const handleSetQueryItemData = jest.fn();
		const removeQueryTypeItemByIndex = jest.fn();

		render(
			<ClickHouseQueryBuilder queryData={queryData} queryIndex={2} deletable />,
			undefined,
			{
				queryBuilderOverrides: buildOverrides({
					handleSetQueryItemData,
					removeQueryTypeItemByIndex,
				}),
			},
		);

		// QueryHeader renders the trash button only when `deletable` is true.
		// It's the last button in the header (no accessible name).
		const buttons = screen.getAllByRole('button');
		await user.click(buttons[buttons.length - 1]);

		expect(removeQueryTypeItemByIndex).toHaveBeenCalledWith(
			EQueryType.CLICKHOUSE,
			2,
		);
		expect(handleSetQueryItemData).not.toHaveBeenCalled();
	});
});
