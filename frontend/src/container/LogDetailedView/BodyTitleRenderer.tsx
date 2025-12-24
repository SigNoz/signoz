import { orange } from '@ant-design/colors';
import { SettingOutlined } from '@ant-design/icons';
import { Dropdown, MenuProps } from 'antd';
import {
	negateOperator,
	OPERATORS,
	QUERY_BUILDER_FUNCTIONS,
} from 'constants/antlrQueryConstants';
import { useActiveLog } from 'hooks/logs/useActiveLog';
import { useNotifications } from 'hooks/useNotifications';
import { useCallback } from 'react';
import { useCopyToClipboard } from 'react-use';

import { TitleWrapper } from './BodyTitleRenderer.styles';
import { DROPDOWN_KEY } from './constant';
import { BodyTitleRendererProps } from './LogDetailedView.types';
import {
	generateFieldKeyForArray,
	getDataTypes,
	removeObjectFromString,
} from './utils';

function BodyTitleRenderer({
	title,
	parentIsArray = false,
	nodeKey,
	value,
}: BodyTitleRendererProps): JSX.Element {
	const { onAddToQuery } = useActiveLog();
	const [, setCopy] = useCopyToClipboard();
	const { notifications } = useNotifications();

	const filterHandler = (isFilterIn: boolean) => (): void => {
		if (parentIsArray) {
			onAddToQuery(
				generateFieldKeyForArray(
					removeObjectFromString(nodeKey),
					getDataTypes(value),
				),
				`${value}`,
				isFilterIn
					? QUERY_BUILDER_FUNCTIONS.HAS
					: negateOperator(QUERY_BUILDER_FUNCTIONS.HAS),
				parentIsArray ? getDataTypes([value]) : getDataTypes(value),
			);
		} else {
			onAddToQuery(
				`body.${removeObjectFromString(nodeKey)}`,
				`${value}`,
				isFilterIn ? OPERATORS['='] : OPERATORS['!='],
				getDataTypes(value),
			);
		}
	};

	const onClickHandler: MenuProps['onClick'] = (props): void => {
		const mapper = {
			[DROPDOWN_KEY.FILTER_IN]: filterHandler(true),
			[DROPDOWN_KEY.FILTER_OUT]: filterHandler(false),
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
				label: `Filter for ${value}`,
			},
			{
				key: DROPDOWN_KEY.FILTER_OUT,
				label: `Filter out ${value}`,
			},
		],
		onClick: onClickHandler,
	};

	const handleNodeClick = useCallback(
		(e: React.MouseEvent): void => {
			// Prevent tree node expansion/collapse
			e.stopPropagation();
			const cleanedKey = removeObjectFromString(nodeKey);
			let copyText: string;

			// Check if value is an object or array
			const isObject = typeof value === 'object' && value !== null;

			if (isObject) {
				// For objects/arrays, stringify the entire structure
				copyText = JSON.stringify(value, null, 2);
			} else if (parentIsArray) {
				// array elements
				copyText = `${value}`;
			} else {
				// primitive values
				const valueStr = typeof value === 'string' ? value : String(value);
				copyText = valueStr;
			}

			setCopy(copyText);

			if (copyText) {
				const notificationMessage = isObject
					? `${cleanedKey} object copied to clipboard`
					: `${cleanedKey} copied to clipboard`;

				notifications.success({
					message: notificationMessage,
					key: notificationMessage,
				});
			}
		},
		[nodeKey, parentIsArray, setCopy, value, notifications],
	);

	return (
		<TitleWrapper onClick={handleNodeClick}>
			{typeof value !== 'object' && (
				<Dropdown menu={menu} trigger={['click']}>
					<SettingOutlined style={{ marginRight: 8 }} className="hover-reveal" />
				</Dropdown>
			)}
			{title.toString()}{' '}
			{!parentIsArray && typeof value !== 'object' && (
				<span>
					: <span style={{ color: orange[6] }}>{`${value}`}</span>
				</span>
			)}
		</TitleWrapper>
	);
}

export default BodyTitleRenderer;
