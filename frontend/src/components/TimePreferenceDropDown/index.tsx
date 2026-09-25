import { Dispatch, SetStateAction, useCallback, useMemo } from 'react';
import { ChevronDown, Globe } from '@signozhq/icons';
import { Dropdown, type DropdownItemType } from '@signozhq/ui/dropdown';
import { Button } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import TimeItems, {
	timePreferance,
	timePreferenceType,
} from 'constants/timePreference';

import { menuItems } from './config';

import './TimePreference.styles.scss';

function TimePreference({
	setSelectedTime,
	selectedTime,
}: TimePreferenceDropDownProps): JSX.Element {
	const timeMenuItemOnChangeHandler = useCallback(
		(key: timePreferenceType) => {
			const selectedTime = TimeItems.find((e) => e.enum === key);
			if (selectedTime !== undefined) {
				setSelectedTime(selectedTime);
			}
		},
		[setSelectedTime],
	);

	const items = useMemo<DropdownItemType[]>(
		() =>
			menuItems.map((item) => ({
				...item,
				type: 'item',
				onClick: (): void => timeMenuItemOnChangeHandler(item.value),
			})),
		[timeMenuItemOnChangeHandler],
	);

	return (
		<Dropdown items={items} nativeButton align="end" side="bottom">
			<Button className="time-selection-target">
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

interface TimePreferenceDropDownProps {
	setSelectedTime: Dispatch<SetStateAction<timePreferance>>;
	selectedTime: timePreferance;
}

export default TimePreference;
