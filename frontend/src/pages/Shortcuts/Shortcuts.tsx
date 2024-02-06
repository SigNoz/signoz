import './Shortcuts.styles.scss';

import { Table, Typography } from 'antd';

import { ALL_SHORTCUTS, generateTableData, shortcutColumns } from './utils';

function Shortcuts(): JSX.Element {
	function getShortcutTable(
		shortcuts: Record<string, string>,
		shortcutSection: string,
	): JSX.Element {
		console.log(shortcuts);

		const tableData = generateTableData(shortcuts);

		return (
			<section className="shortcut-section">
				<Typography.Text className="shortcut-section-heading">
					{shortcutSection}
				</Typography.Text>
				<Table
					columns={shortcutColumns}
					dataSource={tableData}
					pagination={false}
					className="shortcut-section-table"
				/>
			</section>
		);
	}

	return (
		<div className="keyboard-shortcuts">
			{Object.keys(ALL_SHORTCUTS).map((shortcutSection) =>
				getShortcutTable(ALL_SHORTCUTS[shortcutSection], shortcutSection),
			)}
		</div>
	);
}

export default Shortcuts;
