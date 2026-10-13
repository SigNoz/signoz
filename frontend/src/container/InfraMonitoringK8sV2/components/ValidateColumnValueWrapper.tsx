import {
	getInvalidValueTooltipText,
	InfraMonitoringEntity,
} from '../constants';
import { TextNoData } from './TextNoData';
import TanStackTable from 'components/TanStackTableView';

export function ValidateColumnValueWrapper({
	children,
	value,
	entity,
	attribute,
	rowId,
}: {
	children: React.ReactNode;
	value: number;
	entity?: InfraMonitoringEntity;
	attribute?: string;
	rowId: string;
}): JSX.Element {
	if (value === -1 || Number.isNaN(value)) {
		let element = <TextNoData type="tanstack" />;
		if (entity && attribute) {
			element = (
				<TanStackTable.HoverTooltip
					rowId={rowId}
					title={getInvalidValueTooltipText(entity, attribute)}
				>
					{element}
				</TanStackTable.HoverTooltip>
			);
		}

		return element;
	}

	return <>{children}</>;
}
