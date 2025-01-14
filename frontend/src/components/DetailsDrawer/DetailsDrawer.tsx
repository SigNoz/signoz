import './DetailsDrawer.styles.scss';

import { Drawer, Tabs, TabsProps } from 'antd';
import cx from 'classnames';
import { Dispatch, SetStateAction } from 'react';

interface IDetailsDrawerProps {
	open: boolean;
	setOpen: Dispatch<SetStateAction<boolean>>;
	title: string;
	descriptiveContent: JSX.Element;
	items: TabsProps['items'];
	detailsDrawerClassName?: string;
}

function DetailsDrawer(props: IDetailsDrawerProps): JSX.Element {
	const {
		open,
		setOpen,
		title,
		descriptiveContent,
		detailsDrawerClassName,
		items,
	} = props;
	return (
		<Drawer
			width="60%"
			open={open}
			afterOpenChange={setOpen}
			title={title}
			onClose={(): void => setOpen(false)}
			className="details-drawer"
		>
			<div>{descriptiveContent}</div>
			<Tabs
				items={items}
				animated
				className={cx('details-drawer-tabs', detailsDrawerClassName)}
			/>
		</Drawer>
	);
}

DetailsDrawer.defaultProps = {
	detailsDrawerClassName: '',
};

export default DetailsDrawer;
