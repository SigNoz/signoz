import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from '@signozhq/ui/select';
import cx from 'classnames';
import {
	resolveDashboardImage,
	SYSTEM_ICON_PATHS,
} from 'container/DashboardContainer/dashboardIcons';

import styles from './DashboardImagePicker.module.scss';

interface Props {
	// The selected image — a system icon path (`/assets/Icons/<name>`) or, for
	// dashboards imported with a custom icon, a legacy base64 data URI.
	image: string;
	onChange: (value: string) => void;
	// Consumers set the trigger's border-radius (e.g. rounded-left when joined to
	// a name input); this component owns size / background / icon-only styling.
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
	const isCustom = !!image && !SYSTEM_ICON_PATHS.includes(image);
	const options = isCustom ? [image, ...SYSTEM_ICON_PATHS] : SYSTEM_ICON_PATHS;

	return (
		<Select value={image} onChange={(value): void => onChange(value as string)}>
			<SelectTrigger className={cx(styles.trigger, triggerClassName)} />
			<SelectContent className={styles.options} withPortal={false}>
				{options.map((icon) => (
					<SelectItem key={icon} value={icon} className={styles.item}>
						<img
							src={resolveDashboardImage(icon)}
							alt="dashboard-icon"
							className={styles.image}
						/>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

export default DashboardImagePicker;
