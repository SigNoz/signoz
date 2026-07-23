import { useEffect, useMemo, useState } from 'react';
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
	// A custom image (pasted URL / base64 data-URI, not in the preset set) is kept as
	// a selectable option for the picker's lifetime — without a matching option the
	// trigger renders the raw value string and the image can't be re-selected.
	const [customImages, setCustomImages] = useState<string[]>(() =>
		image && !Base64Icons.includes(image) ? [image] : [],
	);
	useEffect(() => {
		if (image && !Base64Icons.includes(image)) {
			setCustomImages((prev) => (prev.includes(image) ? prev : [...prev, image]));
		}
	}, [image]);

	const options = useMemo(
		() => [...customImages, ...Base64Icons],
		[customImages],
	);

	return (
		<Select value={image} onChange={(value): void => onChange(value as string)}>
			<SelectTrigger className={cx(styles.trigger, triggerClassName)} />
			<SelectContent className={styles.options} withPortal={false}>
				{options.map((icon) => (
					<SelectItem key={icon} value={icon} className={styles.item}>
						<img src={icon} alt="dashboard-icon" className={styles.image} />
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

export default DashboardImagePicker;
