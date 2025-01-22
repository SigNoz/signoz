import './DetailsDrawer.styles.scss';

import { Drawer, Tabs, TabsProps } from 'antd';
import cx from 'classnames';
import { Dispatch, SetStateAction } from 'react';

interface IDetailsDrawerProps {
	open: boolean;
	setOpen: Dispatch<SetStateAction<boolean>>;
	title: string;
	descriptiveContent: JSX.Element;
	defaultActiveKey: string;
	items: TabsProps['items'];
	detailsDrawerClassName?: string;
	tabBarExtraContent?: JSX.Element;
}

function DetailsDrawer(props: IDetailsDrawerProps): JSX.Element {
	const {
		open,
		setOpen,
		title,
		descriptiveContent,
		defaultActiveKey,
		detailsDrawerClassName,
		items,
		tabBarExtraContent,
	} = props;
	return (
		<Drawer
			width="60%"
			open={open}
			afterOpenChange={setOpen}
			mask={false}
			title={title}
			onClose={(): void => setOpen(false)}
			className="details-drawer"
		>
			<div>{descriptiveContent}</div>
			<Tabs
				items={items}
				addIcon
				defaultActiveKey={defaultActiveKey}
				animated
				className={cx('details-drawer-tabs', detailsDrawerClassName)}
				tabBarExtraContent={tabBarExtraContent}
			/>
		</Drawer>
	);
}

DetailsDrawer.defaultProps = {
	detailsDrawerClassName: '',
	tabBarExtraContent: null,
};

export default DetailsDrawer;
