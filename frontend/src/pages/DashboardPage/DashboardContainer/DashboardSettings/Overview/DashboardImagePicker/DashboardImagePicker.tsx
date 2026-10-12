import { useRef } from 'react';
import { Select } from '@signozhq/ui/select';
import cx from 'classnames';
import {
	resolveDashboardImage,
	SYSTEM_ICON_PATHS,
} from 'pages/DashboardPage/DashboardContainer/dashboardIcons';

import styles from './DashboardImagePicker.module.scss';

interface Props {
	// The selected image — a system icon path (`/assets/Icons/<name>`) or, for
	// dashboards imported with a custom icon, a legacy base64 data URI.
	image: string;
	onChange: (value: string) => void;
	// Consumers set the trigger's border-radius (e.g. rounded-left when joined to
	// a name input) through `--select-trigger-border-radius` in this class, which
	// lands on the picker's wrapper; this component owns size / background /
	// icon-only styling.
	triggerClassName?: string;
}

// Icon picker shared by the dashboard-details settings and the create-dashboard
// modal so both choose from the same system icon set. A custom/legacy value is
// kept as the first option so it stays selected and round-trips.
function DashboardImagePicker({
	image,
	onChange,
	triggerClassName,
}: Props): JSX.Element {
	// The popup is portalled into the wrapper (`container`) so the icon menu keeps
	// its narrow width via the `.picker` descendant rules.
	const pickerRef = useRef<HTMLDivElement>(null);
	const isCustom = !!image && !SYSTEM_ICON_PATHS.includes(image);
	const options = isCustom ? [image, ...SYSTEM_ICON_PATHS] : SYSTEM_ICON_PATHS;

	return (
		<div ref={pickerRef} className={cx(styles.picker, triggerClassName)}>
			<Select
				aria-label="Dashboard icon"
				placeholder="Select an icon"
				items={options.map((icon) => ({
					type: 'item' as const,
					value: icon,
					label: (
						<img
							src={resolveDashboardImage(icon)}
							alt="dashboard-icon"
							className={styles.image}
						/>
					),
				}))}
				value={image}
				onChange={onChange}
				container={pickerRef}
			/>
		</div>
	);
}

export default DashboardImagePicker;
