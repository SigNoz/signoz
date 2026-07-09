import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from '@signozhq/ui/select';
import cx from 'classnames';

import { Base64Icons } from '../utils';

import styles from './DashboardImagePicker.module.scss';

interface Props {
	// The selected image — one of the base64 icon data-URIs.
	image: string;
	onChange: (value: string) => void;
	// Consumers set the trigger's border-radius (e.g. rounded-left when joined to
	// a name input); this component owns size / background / icon-only styling.
	triggerClassName?: string;
}

// Icon picker shared by the dashboard-details settings and the create-dashboard
// modal so both choose from the same `Base64Icons` set.
function DashboardImagePicker({
	image,
	onChange,
	triggerClassName,
}: Props): JSX.Element {
	return (
		<Select value={image} onChange={(value): void => onChange(value as string)}>
			<SelectTrigger className={cx(styles.trigger, triggerClassName)} />
			<SelectContent className={styles.options} withPortal={false}>
				{Base64Icons.map((icon) => (
					<SelectItem key={icon} value={icon} className={styles.item}>
						<img src={icon} alt="dashboard-icon" className={styles.image} />
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

export default DashboardImagePicker;
