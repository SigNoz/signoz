import './Integrations.styles.scss';

import { Button, List, Typography } from 'antd';

function IntegrationsList(): JSX.Element {
	// TODO get the data from the list API call here
	const data = [
		{
			title: 'Redis',
			id: 'redis',
			description:
				'Redis is an open source (BSD licensed), in-memory data structure store, used as a database, cache, and message broker.',
			// eslint-disable-next-line sonarjs/no-duplicate-string
			icon: '/Icons/redis-logo.svg',
		},
		{
			title: 'Nginx',
			id: 'nginx',
			description:
				'Nginx is a web server which can also be used as a reverse proxy, load balancer, mail proxy and HTTP cache. The software was created by Igor Sysoev and first publicly released in 2004. A company of the same name was founded in 2011 to provide support and Nginx plus paid software.',
			icon: '/Icons/redis-logo.svg',
		},
		{
			title: 'Postgres',
			id: 'postgres',
			description:
				'PostgreSQL, also known as Postgres, is a free and open-source relational database management system emphasizing extensibility and SQL compliance.',
			icon: '/Icons/redis-logo.svg',
		},
	];
	return (
		<div className="integrations-list">
			<List
				dataSource={data}
				itemLayout="horizontal"
				renderItem={(item, index): JSX.Element => {
					console.log(item, index);
					return (
						<List.Item key={item.id} className="integrations-list-item">
							<div className="list-item-image-container">
								<img src={item.icon} alt={item.title} className="list-item-image" />
							</div>
							<div className="list-item-details">
								<Typography.Text className="heading">{item.title}</Typography.Text>
								<Typography.Text className="description">
									{item.description}
								</Typography.Text>
							</div>
							<Button className="configure-btn">Configure</Button>
						</List.Item>
					);
				}}
			/>
		</div>
	);
}

export default IntegrationsList;
