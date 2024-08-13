import './tabs2.styles.scss';

import { Button } from 'antd';
import { Undo } from 'lucide-react';
import { useState } from 'react';

interface Tab {
	value: string;
	label: string | JSX.Element;
	disabled?: boolean;
	icon?: string | JSX.Element;
}

interface TimelineTabsProps {
	tabs: Tab[];
	onSelectTab?: (selectedTab: string) => void;
	initialSelectedTab?: string;
	hasResetButton?: boolean;
}

function Tabs2({
	tabs,
	onSelectTab,
	initialSelectedTab,
	hasResetButton,
}: TimelineTabsProps): JSX.Element {
	const [selectedTab, setSelectedTab] = useState<string>(
		initialSelectedTab || tabs[0].value,
	);

	const handleTabClick = (tabValue: string): void => {
		setSelectedTab(tabValue);
		if (onSelectTab) {
			onSelectTab(tabValue);
		}
	};

	return (
		<div className="tabs-wrapper">
			{hasResetButton && initialSelectedTab && (
				<Button
					value="Reset"
					className="tab"
					onClick={(): void => handleTabClick(initialSelectedTab)}
					icon={<Undo size={14} color="var(--text-vanilla-400)" />}
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

						// {...(tab.icon !== null ? { icon: tab.icon } : {})}
					>
						{tab.label}
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
};

export default Tabs2;
