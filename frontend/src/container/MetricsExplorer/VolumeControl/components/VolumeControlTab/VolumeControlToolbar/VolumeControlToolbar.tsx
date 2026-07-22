import { Input } from 'antd';

import styles from './VolumeControlToolbar.module.scss';

interface VolumeControlToolbarProps {
	value: string;
	onChange: (value: string) => void;
}

function VolumeControlToolbar({
	value,
	onChange,
}: VolumeControlToolbarProps): JSX.Element {
	return (
		<div className={styles.toolbar}>
			<Input
				className={styles.search}
				placeholder="Search metrics"
				allowClear
				value={value}
				onChange={(e): void => onChange(e.target.value)}
				data-testid="volume-control-search"
			/>
		</div>
	);
}

export default VolumeControlToolbar;
