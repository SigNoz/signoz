import './Shortcuts.styles.scss';

import { Table, Typography } from 'antd';

import { ALL_SHORTCUTS, generateTableData, shortcutColumns } from './utils';

function Shortcuts(): JSX.Element {
	function getShortcutTable(shortcutSection: string): JSX.Element {
		const tableData = generateTableData(shortcutSection);

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
					bordered
				/>
			</section>
		);
	}

	return (
		<div className="keyboard-shortcuts">
			{Object.keys(ALL_SHORTCUTS).map((shortcutSection) =>
				getShortcutTable(shortcutSection),
			)}
		</div>
	);
}

export default Shortcuts;
