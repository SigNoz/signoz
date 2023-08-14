import { ArrowUpOutlined } from '@ant-design/icons';
import { FloatButton } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
// hooks
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useScrollToTop from 'hooks/useScrollToTop';

function GoToTop(): JSX.Element | null {
	const { isVisible, scrollToTop } = useScrollToTop();

	const { panelType } = useQueryBuilder();

	if (!isVisible) return null;

	if (panelType === PANEL_TYPES.LIST) {
		return (
			<FloatButton
				onClick={scrollToTop}
				shape="circle"
				type="primary"
				icon={<ArrowUpOutlined />}
			/>
		);
	}

	return null;
}

export default GoToTop;
