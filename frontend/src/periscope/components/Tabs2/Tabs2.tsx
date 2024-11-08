import './Tabs2.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Tag } from 'antd';
import { TimelineFilter } from 'container/AlertHistory/types';
import { Undo } from 'lucide-react';
import { useState } from 'react';

interface Tab {
	value: string;
	label: string | JSX.Element;
	disabled?: boolean;
	icon?: string | JSX.Element;
	isBeta?: boolean;
}

interface TimelineTabsProps {
	tabs: Tab[];
	onSelectTab?: (selectedTab: TimelineFilter) => void;
	initialSelectedTab?: string;
	hasResetButton?: boolean;
	buttonMinWidth?: string;
}

function Tabs2({
	tabs,
	onSelectTab,
	initialSelectedTab,
	hasResetButton,
	buttonMinWidth = '114px',
}: TimelineTabsProps): JSX.Element {
	const [selectedTab, setSelectedTab] = useState<string>(
		initialSelectedTab || tabs[0].value,
	);

	const handleTabClick = (tabValue: string): void => {
		setSelectedTab(tabValue);
		if (onSelectTab) {
			onSelectTab(tabValue as TimelineFilter);
		}
	};

	return (
		<div className="tabs-wrapper">
			{hasResetButton && selectedTab !== tabs[0].value && (
				<Button
					value="Reset"
					className="tab reset-button"
					onClick={(): void => handleTabClick(tabs[0].value)}
					icon={<Undo size={14} color={Color.TEXT_VANILLA_400} />}
				>
					Reset
				</Button>
			)}
			<Button.Group>
				{tabs.map((tab) => (
					<Button
						key={tab.value}
						value={tab.value}
						className={`tab ${selectedTab === tab.value ? 'selected' : ''}`}
						onClick={(): void => handleTabClick(tab.value)}
						disabled={tab.disabled}
						icon={tab.icon}
						style={{ minWidth: buttonMinWidth }}
					>
						{tab.label}

						{tab.isBeta && (
							<Tag bordered={false} color="geekblue">
								Beta
							</Tag>
						)}
					</Button>
				))}
			</Button.Group>
		</div>
	);
}

Tabs2.defaultProps = {
	initialSelectedTab: '',
	onSelectTab: (): void => {},
	hasResetButton: false,
	buttonMinWidth: '114px',
};

export default Tabs2;
