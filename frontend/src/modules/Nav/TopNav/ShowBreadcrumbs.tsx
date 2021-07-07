import React from 'react';
import { Breadcrumb } from 'antd';
import { Link, withRouter } from 'react-router-dom';
import styled from 'styled-components';
import ROUTES from 'Src/constants/routes';

const BreadCrumbWrapper = styled.div`
	padding-top: 20px;
	padding-left: 20px;
`;

const breadcrumbNameMap: any = {
	// PNOTE - TO DO - Remove any and do typechecking - like https://stackoverflow.com/questions/56568423/typescript-no-index-signature-with-a-parameter-of-type-string-was-found-on-ty
	[ROUTES.APPLICATION]: 'Application',
	[ROUTES.TRACES]: 'Traces',
	[ROUTES.SERVICE_MAP]: 'Service Map',
	[ROUTES.USAGE_EXPLORER]: 'Usage Explorer',
	[ROUTES.INSTRUMENTATION]: 'Add instrumentation',
	[ROUTES.SETTINGS]: 'Settings',
};

const ShowBreadcrumbs = withRouter((props) => {
	const { location } = props;
	const pathSnippets = location.pathname.split('/').filter((i) => i);
	const extraBreadcrumbItems = pathSnippets.map((_, index) => {
		const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
		if (breadcrumbNameMap[url] === undefined) {
			return (
				<Breadcrumb.Item key={url}>
					<Link to={url}>{url.split('/').slice(-1)[0]}</Link>
				</Breadcrumb.Item>
			);
		} else {
			return (
				<Breadcrumb.Item key={url}>
					<Link to={url}>{breadcrumbNameMap[url]}</Link>
				</Breadcrumb.Item>
			);
		}
	});
	const breadcrumbItems = [
		<Breadcrumb.Item key="home">
			<Link to="/">Home</Link>
		</Breadcrumb.Item>,
	].concat(extraBreadcrumbItems);
	return (
		<BreadCrumbWrapper>
			<Breadcrumb>{breadcrumbItems}</Breadcrumb>
		</BreadCrumbWrapper>
	);
});

export default ShowBreadcrumbs;
