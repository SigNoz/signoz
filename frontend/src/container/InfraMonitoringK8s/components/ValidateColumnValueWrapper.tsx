import { Tooltip } from 'antd';
import TanStackTable from 'components/TanStackTableView';

import {
	getInvalidValueTooltipText,
	InfraMonitoringEntity,
} from '../constants';

export function ValidateColumnValueWrapper({
	children,
	value,
	entity,
	attribute,
}: {
	children: React.ReactNode;
	value: number;
	entity?: InfraMonitoringEntity;
	attribute?: string;
}): JSX.Element {
	if (value === -1) {
		let element = <TanStackTable.Text>-</TanStackTable.Text>;
		if (entity && attribute) {
			element = (
				<Tooltip title={getInvalidValueTooltipText(entity, attribute)}>
					{element}
				</Tooltip>
			);
		}

		return element;
	}

	return <>{children}</>;
}
