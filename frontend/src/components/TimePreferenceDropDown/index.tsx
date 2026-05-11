import { Dispatch, SetStateAction, useCallback, useMemo } from 'react';
import { ChevronDown, Globe } from '@signozhq/icons';
import { Button, Dropdown } from 'antd';
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
			items: menuItems,
			onClick: timeMenuItemOnChangeHandler,
		}),
		[timeMenuItemOnChangeHandler],
	);

	return (
		<Dropdown
			menu={menu}
			rootClassName="time-selection-menu"
			className="time-selection-target"
			trigger={['click']}
		>
			<Button>
				<div className="button-selected-text">
					<Globe size={14} />
					<Typography.Text className="selected-value">
						{selectedTime.name}
					</Typography.Text>
				</div>
				<ChevronDown size="md" />
			</Button>
		</Dropdown>
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
