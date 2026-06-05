import { Input } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import type { PanelDisplayDraft } from '../types';

import styles from './ConfigPane.module.scss';

interface ConfigPaneProps {
	display: PanelDisplayDraft;
	onChangeDisplay: (next: Partial<PanelDisplayDraft>) => void;
}

/**
 * Right-hand configuration pane. Milestone 1 exposes only the panel title and
 * description; later milestones render the data-driven section framework
 * (Formatting, Axes, Legend, …) below these general fields, keyed off the
 * panel kind's `SectionConfig[]`.
 */
function ConfigPane({
	display,
	onChangeDisplay,
}: ConfigPaneProps): JSX.Element {
	return (
		<div className={styles.config}>
			<div className={styles.section}>
				<Typography.Text>Panel settings</Typography.Text>

				<div className={styles.field}>
					<Typography.Text>Title</Typography.Text>
					<Input
						data-testid="panel-editor-v2-title"
						value={display.name}
						placeholder="Panel title"
						onChange={(e): void => onChangeDisplay({ name: e.target.value })}
					/>
				</div>

				<div className={styles.field}>
					<Typography.Text>Description</Typography.Text>
					<Input.TextArea
						data-testid="panel-editor-v2-description"
						value={display.description}
						placeholder="Add a description"
						rows={3}
						onChange={(e): void => onChangeDisplay({ description: e.target.value })}
					/>
				</div>
			</div>
		</div>
	);
}

export default ConfigPane;
