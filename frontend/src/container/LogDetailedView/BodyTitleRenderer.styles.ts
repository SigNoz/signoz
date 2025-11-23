import { CopyOutlined, SettingOutlined } from '@ant-design/icons';
import styled from 'styled-components';

export const TitleWrapper = styled.span`
	user-select: text !important;
	cursor: text;

	.hover-reveal {
		visibility: hidden;
	}

	&:hover .hover-reveal {
		visibility: visible;
	}
`;

const IconStyles = `
	margin-right: 8px;
	cursor: pointer;
`;

export const StyledCopyOutlined = styled(CopyOutlined)`
	${IconStyles}
`;

export const StyledSettingOutlined = styled(SettingOutlined)`
	${IconStyles}
`;
