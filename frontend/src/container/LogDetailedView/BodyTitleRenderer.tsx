import { SettingOutlined } from '@ant-design/icons';
import { Dropdown, MenuProps } from 'antd';
import { OPERATORS } from 'constants/queryBuilder';
import { useActiveLog } from 'hooks/logs/useActiveLog';

import { TitleWrapper } from './BodyTitleRenderer.styles';
import { DROPDOWN_KEY } from './constant';
import { BodyTitleRendererProps } from './LogDetailedView.types';
import { generateFieldKeyForArray, getDataTypes } from './utils';

function BodyTitleRenderer({
	title,
	parentIsArray = false,
	nodeKey,
	value,
}: BodyTitleRendererProps): JSX.Element {
	const { onAddToQuery } = useActiveLog();

	const filterOutHandler = (isFilterIn: boolean) => (): void => {
		if (parentIsArray) {
			onAddToQuery(
				generateFieldKeyForArray(nodeKey),
				`${value}`,
				isFilterIn ? OPERATORS.HAS : OPERATORS.NHAS,
				true,
				getDataTypes(value),
			);
		} else {
			onAddToQuery(
				nodeKey,
				`${value}`,
				isFilterIn ? OPERATORS.CONTAINS : OPERATORS.NOT_CONTAINS,
				true,
				getDataTypes(value),
			);
		}
	};

	const onClickHandler: MenuProps['onClick'] = (props): void => {
		const mapper = {
			[DROPDOWN_KEY.FILTER_IN]: filterOutHandler(true),
			[DROPDOWN_KEY.FILTER_OUT]: filterOutHandler(false),
		};

		const handler = mapper[props.key];

		if (handler) {
			handler();
		}
	};

	const menu: MenuProps = {
		items: [
			{
				key: DROPDOWN_KEY.FILTER_IN,
				label: `Filter for ${nodeKey}`,
			},
			{
				key: DROPDOWN_KEY.FILTER_OUT,
				label: `Filter out ${nodeKey}`,
			},
		],
		onClick: onClickHandler,
	};

	return (
		<TitleWrapper>
			{title}
			<Dropdown menu={menu} trigger={['click']}>
				<SettingOutlined style={{ marginLeft: 8 }} className="hover-reveal" />
			</Dropdown>
		</TitleWrapper>
	);
}

export default BodyTitleRenderer;
