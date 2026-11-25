import { RuletypesAlertTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { DataSource } from 'types/common/queryBuilder';

import { dataSourceForAlertType } from '../alerts';

describe('dataSourceForAlertType', () => {
	it.each([
		[RuletypesAlertTypeDTO.METRIC_BASED_ALERT, DataSource.METRICS],
		[RuletypesAlertTypeDTO.LOGS_BASED_ALERT, DataSource.LOGS],
		[RuletypesAlertTypeDTO.TRACES_BASED_ALERT, DataSource.TRACES],
		[RuletypesAlertTypeDTO.EXCEPTIONS_BASED_ALERT, DataSource.TRACES],
		[RuletypesAlertTypeDTO.AI_TRACES_BASED_ALERT, DataSource.TRACES],
		[undefined, DataSource.METRICS],
	])('maps %s to %s', (alertType, dataSource) => {
		expect(dataSourceForAlertType(alertType)).toBe(dataSource);
	});
});
