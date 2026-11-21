/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesDisplayDTO } from './dashboardtypesDisplayDTO';
import type { DashboardtypesListVariableSpecSortDTO } from './dashboardtypesListVariableSpecSortDTO';
import type { DashboardtypesVariableDefaultValueDTO } from './dashboardtypesVariableDefaultValueDTO';
import type { DashboardtypesVariablePluginDTO } from './dashboardtypesVariablePluginDTO';

export interface DashboardtypesListVariableSpecDTO {
	/**
	 * @type boolean
	 * @description Whether an all option is offered. Requires allowMultiple.
	 */
	allowAllValue?: boolean;
	/**
	 * @type boolean
	 * @description Whether several values can be selected at once.
	 */
	allowMultiple?: boolean;
	/**
	 * @type string
	 * @description A regular expression meant to keep only matching values, reduced to the capture group when one is present. Stored, but not applied by the UI.
	 */
	capturingRegexp?: string;
	/**
	 * @type string
	 * @description The value meant to replace every value when all is selected. Requires allowAllValue. Stored, but currently ignored by the UI.
	 */
	customAllValue?: string;
	/**
	 * @description The initially selected value: a string, or a list of strings when allowMultiple is true.
	 */
	defaultValue?: DashboardtypesVariableDefaultValueDTO;
	/**
	 * @description The label shown for the variable control.
	 */
	display: DashboardtypesDisplayDTO;
	/**
	 * @type string
	 * @minLength 1
	 * @description The handle queries reference as $name. Up to 75 characters from letters, digits, dot, underscore and hyphen, not all digits, unique within the dashboard.
	 */
	name: string;
	/**
	 * @description Where the values come from: kind is signoz/DynamicVariable (observed attribute values), signoz/QueryVariable (a ClickHouse query) or signoz/CustomVariable (a fixed list), and spec holds that kind's settings.
	 */
	plugin?: DashboardtypesVariablePluginDTO;
	/**
	 * @description How the values are ordered: none (default), alphabetical-asc, alphabetical-desc, numerical-asc, numerical-desc, alphabetical-ci-asc or alphabetical-ci-desc.
	 */
	sort?: DashboardtypesListVariableSpecSortDTO;
}
