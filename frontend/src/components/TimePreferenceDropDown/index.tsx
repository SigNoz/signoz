import { Dispatch, SetStateAction, useCallback, useMemo } from 'react';
import { ChevronDown, Globe } from '@signozhq/icons';
import { DropdownMenuSimple } from '@signozhq/ui/dropdown-menu';
import { Button } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import TimeItems, {
	timePreferance,
	timePreferenceType,
} from 'container/NewWidget/RightContainer/timeItems';

import { menuItems } from './config';

import './TimePreference.styles.scss';

function TimePreference({
	setSelectedTime,
	selectedTime,
}: TimePreferenceDropDownProps): JSX.Element {
	const timeMenuItemOnChangeHandler = useCallback(
		(event: TimeMenuItemOnChangeHandlerEvent) => {
			const selectedTime = TimeItems.find((e) => e.enum === event.key);
			if (selectedTime !== undefined) {
				setSelectedTime(selectedTime);
			}
		},
		[setSelectedTime],
	);

	const menu = useMemo(
		() => ({
			items: menuItems.map((item) => ({
				...item,
				onClick: timeMenuItemOnChangeHandler,
			})),
		}),
		[timeMenuItemOnChangeHandler],
	);

	return (
		<DropdownMenuSimple menu={menu} className="time-selection-menu">
			<Button className="time-selection-target">
				<div className="button-selected-text">
					<Globe size={14} />
					<Typography.Text className="selected-value">
						{selectedTime.name}
					</Typography.Text>
				</div>
				<ChevronDown size="md" />
			</Button>
		</DropdownMenuSimple>
	);
}

interface TimeMenuItemOnChangeHandlerEvent {
	key: timePreferenceType | string;
}

interface TimePreferenceDropDownProps {
	setSelectedTime: Dispatch<SetStateAction<timePreferance>>;
	selectedTime: timePreferance;
}

export default TimePreference;
