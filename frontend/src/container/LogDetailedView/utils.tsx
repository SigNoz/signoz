import { SettingOutlined } from '@ant-design/icons';
import { Dropdown, Menu } from 'antd';
import { DataNode } from 'antd/es/tree';
import styled from 'styled-components';

export const recursiveParseJSON = (obj: string): Record<string, unknown> => {
	try {
		const value = JSON.parse(obj);
		if (typeof value === 'string') {
			return recursiveParseJSON(value);
		}
		return value;
	} catch (e) {
		return {};
	}
};

const TitleWrapper = styled.span`
	.hover-reveal {
		visibility: hidden;
	}

	&:hover .hover-reveal {
		visibility: visible;
	}
`;

export function jsonToDataNodes(
	json: Record<string, unknown>,
	parentKey = '',
): DataNode[] {
	return Object.entries(json).map(([key, value]) => {
		const nodeKey = parentKey ? `${parentKey}.${key}` : key;

		const menu = (
			<Menu>
				<Menu.Item key="0">Option 1</Menu.Item>
				<Menu.Item key="1">Option 2</Menu.Item>
			</Menu>
		);

		const title = (
			<TitleWrapper>
				{key}
				<Dropdown overlay={menu} trigger={['click']}>
					<SettingOutlined style={{ marginLeft: 8 }} className="hover-reveal" />
				</Dropdown>
			</TitleWrapper>
		);

		if (typeof value === 'object' && value !== null) {
			return {
				key: nodeKey,
				title: key,
				children: jsonToDataNodes(value as Record<string, unknown>, nodeKey),
			};
		}
		return {
			key: nodeKey,
			title,
		};
	});
}

type AnyObject = { [key: string]: any };

export function flattenObject(obj: AnyObject, prefix = ''): AnyObject {
	return Object.keys(obj).reduce((acc: AnyObject, k: string): AnyObject => {
		const pre = prefix.length ? `${prefix}.` : '';
		if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
			Object.assign(acc, flattenObject(obj[k], pre + k));
		} else {
			acc[pre + k] = obj[k];
		}
		return acc;
	}, {});
}
