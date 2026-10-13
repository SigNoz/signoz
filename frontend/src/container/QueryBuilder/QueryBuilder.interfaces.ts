import { ReactNode } from 'react';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryBuilderFieldsConfig } from 'components/QueryBuilderV2/queryBuilderFields.types';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { DataSource } from 'types/common/queryBuilder';

export type QueryBuilderConfig =
	| {
			queryVariant: 'static';
			initialDataSource: DataSource;
			signalSource?: string;
	  }
	| { queryVariant: 'dropdown'; signalSource?: string };

export type QueryBuilderProps = {
	config?: QueryBuilderConfig;
	panelType: PANEL_TYPES;
	actions?: ReactNode;
	fieldsConfig?: QueryBuilderFieldsConfig;
	/**
	 * The builder edits raw rows rather than an aggregation: a single query unless trace
	 * matching is on, no formulas, data-source switches reset to the raw-query template,
	 * and order by resolves keys without an aggregate attribute. Supplies the defaults for
	 * `fieldsConfig` and `allowedDataSources`, which override it per field.
	 */
	isRawQuery?: boolean;
	/** Defaults to every signal. */
	allowedDataSources?: TelemetrytypesSignalDTO[];
	showFunctions?: boolean;
	showOnlyWhereClause?: boolean;
	showOnlyTraceOperator?: boolean;
	showTraceViewSelector?: boolean;
	showTraceOperator?: boolean;
	version: string;
	onChangeTraceView?: (view: TraceView) => void;
	onSignalSourceChange?: (value: string) => void;
	signalSourceChangeEnabled?: boolean;
	savePreviousQuery?: boolean;
};

export enum TraceView {
	SPANS = 'spans',
	TRACES = 'traces',
}
