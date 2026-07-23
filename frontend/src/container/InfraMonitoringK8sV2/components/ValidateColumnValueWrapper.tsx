import { TooltipSimple } from '@signozhq/ui/tooltip';

import {
	getInvalidValueTooltipText,
	InfraMonitoringEntity,
} from '../constants';
import { TextNoData } from './TextNoData';

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
	if (value === -1 || Number.isNaN(value)) {
		let element = <TextNoData type="tanstack" />;
		if (entity && attribute) {
			element = (
				<TooltipSimple title={getInvalidValueTooltipText(entity, attribute)}>
					{element}
				</TooltipSimple>
			);
		}

		return element;
	}

	return <>{children}</>;
}
