import { PlusOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import TextToolTip from 'components/TextToolTip';
import React from 'react';

import { DropRuleHeader } from '../DropRuleHeader';
import DropRulesTable from './DropRulesTable';
import { ButtonContainer } from './ListDropRulesStyles';

interface Props {
	rules: DropRuleHeader[];
}

function ListDropRules({ rules }: Props): JSX.Element {
	return (
		<>
			<ButtonContainer>
				<Space>
					<TextToolTip
						{...{
							text: `More details on how to create drop rules`,
							url: 'https://signoz.io/docs/userguide/manage-drop-rules/',
						}}
					/>

					<Button icon={<PlusOutlined />}>New Drop Rule</Button>
				</Space>
			</ButtonContainer>
			<DropRulesTable rules={rules} />
		</>
	);
}

export default ListDropRules;
