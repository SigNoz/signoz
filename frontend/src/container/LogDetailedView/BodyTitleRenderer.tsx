import { SettingOutlined } from '@ant-design/icons';
import { Dropdown, Menu } from 'antd';
import { useActiveLog } from 'hooks/logs/useActiveLog';

import { TitleWrapper } from './BodyTitleRenderer.styles';
import { BodyTitleRendererProps } from './LogDetailedView.types';
import { generateFieldKeyForArray, getDataTypes } from './utils';

function BodyTitleRenderer({
	title,
	parentIsArray = false,
	nodeKey,
	value,
}: BodyTitleRendererProps): JSX.Element {
	const { onAddToQuery } = useActiveLog();

	const filterForHandler = (): void => {
		if (parentIsArray) {
			onAddToQuery(
				generateFieldKeyForArray(nodeKey),
				`${value}`,
				'has',
				true,
				getDataTypes(value),
			);
		} else {
			onAddToQuery(nodeKey, `${value}`, '=', true, getDataTypes(value));
		}
	};

	const filterOutHandler = (): void => {
		if (parentIsArray) {
			onAddToQuery(
				generateFieldKeyForArray(nodeKey),
				`${value}`,
				'nhas',
				true,
				getDataTypes(value),
			);
		} else {
			onAddToQuery(nodeKey, `${value}`, 'not_contains', true, getDataTypes(value));
		}
	};

	const menu = (
		<Menu>
			<Menu.Item key="0" onClick={filterForHandler}>
				Filter for {nodeKey}
			</Menu.Item>
			<Menu.Item key="1" onClick={filterOutHandler}>
				Filter out {nodeKey}
			</Menu.Item>
		</Menu>
	);

	return (
		<TitleWrapper>
			{title}
			<Dropdown overlay={menu} trigger={['click']}>
				<SettingOutlined style={{ marginLeft: 8 }} className="hover-reveal" />
			</Dropdown>
		</TitleWrapper>
	);
}

export default BodyTitleRenderer;
