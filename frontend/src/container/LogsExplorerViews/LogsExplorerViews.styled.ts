import { Tabs } from 'antd';
import { themeColors } from 'constants/theme';
import styled from 'styled-components';

export const TabsStyled = styled(Tabs)`
	& .ant-tabs-nav {
		background-color: ${themeColors.lightBlack};
	}
`;
