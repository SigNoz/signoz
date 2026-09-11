import { Querybuildertypesv5BucketOptionsLogDTOKind } from 'api/generated/services/sigNoz.schemas';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import type {
	IBuilderFormula,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { handleQueryChange } from '../panelQuery';

const bucketOptions = {
	kind: Querybuildertypesv5BucketOptionsLogDTOKind.log,
	spec: { scale: 0 },
};

function queryWithFormulaAxis(): Query {
	const base = initialQueriesMap[DataSource.METRICS];
	const formula: IBuilderFormula = {
		queryName: 'F1',
		expression: 'A',
		legend: '',
		disabled: false,
		bucketOptions,
	};

	return {
		...base,
		builder: {
			...base.builder,
			queryData: [{ ...base.builder.queryData[0], bucketOptions }],
			queryFormulas: [formula],
		},
	};
}

describe('handleQueryChange bucket options', () => {
	it('keeps both axes when the panel stays a heatmap', () => {
		const result = handleQueryChange(
			PANEL_TYPES.HEATMAP,
			queryWithFormulaAxis(),
			PANEL_TYPES.HEATMAP,
		);

		expect(result.builder.queryData[0].bucketOptions).toStrictEqual(
			bucketOptions,
		);
		expect(result.builder.queryFormulas[0].bucketOptions).toStrictEqual(
			bucketOptions,
		);
	});

	// The request rejects an axis on any type but heatmap, so a switch has to shed it
	// from the query (via the field allowlist) and from the formula (by hand).
	it('drops both axes when switching to another panel type', () => {
		const result = handleQueryChange(
			PANEL_TYPES.TIME_SERIES,
			queryWithFormulaAxis(),
			PANEL_TYPES.HEATMAP,
		);

		expect(result.builder.queryData[0].bucketOptions).toBeUndefined();
		expect(result.builder.queryFormulas[0].bucketOptions).toBeUndefined();
	});

	it('leaves the rest of the formula intact', () => {
		const result = handleQueryChange(
			PANEL_TYPES.TIME_SERIES,
			queryWithFormulaAxis(),
			PANEL_TYPES.HEATMAP,
		);

		expect(result.builder.queryFormulas[0]).toMatchObject({
			queryName: 'F1',
			expression: 'A',
			disabled: false,
		});
	});
});
