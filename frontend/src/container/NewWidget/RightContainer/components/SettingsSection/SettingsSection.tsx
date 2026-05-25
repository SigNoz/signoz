import { ReactNode, useState } from 'react';
import { ChevronDown } from '@signozhq/icons';

import './SettingsSection.styles.scss';

export interface SettingsSectionProps {
	title: string;
	defaultOpen?: boolean;
	children: ReactNode;
	icon?: ReactNode;
}

function SettingsSection({
	title,
	defaultOpen = false,
	children,
	icon,
}: SettingsSectionProps): JSX.Element {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	const toggleOpen = (): void => {
		setIsOpen((prev) => !prev);
	};

	return (
		<section className="settings-section">
			<button
				type="button"
				className="settings-section-header"
				onClick={toggleOpen}
			>
				<span className="settings-section-title">
					{icon ? icon : null} {title}
				</span>
				<ChevronDown
					size={16}
					className={isOpen ? 'chevron-icon open' : 'chevron-icon'}
				/>
			</button>
			<div
				className={
					isOpen ? 'settings-section-content open' : 'settings-section-content'
				}
			>
				{children}
			</div>
		</section>
	);
}

export default SettingsSection;
