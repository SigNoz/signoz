import { Button as ButtonComponent, Collapse } from 'antd';
import styled from 'styled-components';

export const Button = styled(ButtonComponent)`
	&&& {
		margin-right: 1rem;
	}
`;

export const JiraCustomFieldsCollapse = styled(Collapse)`
	&&& {
		.ant-collapse-item {
			border-bottom: 1px solid var(--l1-border);

			&:last-child {
				border-bottom: none;
			}
		}

		.ant-collapse-header {
			padding: 10px 0;
		}

		.ant-collapse-content-box {
			padding: 0 0 12px;
		}
	}
`;
