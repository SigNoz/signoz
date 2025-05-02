export const infoData = [
	{
		id: 'infoBlock-1',
		title: 'Built for scale',
		description:
			'Our powerful ingestion engine has a proven track record of handling 10TB+ data ingestion per day.',
	},
	{
		id: 'infoBlock-2',
		title: 'Trusted across the globe',
		description:
			'Used by teams in all 5 continents ⎯ across the mountains, rivers, and the high seas.',
	},
	{
		id: 'infoBlock-3',
		title: 'Powering observability for teams of all sizes',
		description:
			'Hundreds of companies ⎯from early-stage start-ups to public enterprises use SigNoz to build more reliable products.',
	},
];

export const enterpriseGradeValuesData = [
	{
		title: 'SSO and SAML support',
	},
	{
		title: 'Query API keys',
	},
	{
		title: 'Advanced security with SOC 2 Type I certification',
	},
	{
		title: 'AWS Private Link',
	},
	{
		title: 'VPC peering',
	},
	{
		title: 'Custom integrations',
	},
];

export const customerStoriesData = [
	{
		key: 'story-subomi-oluwalana',
		avatar: 'https://signoz.io/img/users/subomi-oluwalana.webp',
		personName: 'Subomi Oluwalana',
		role: 'Founder & CEO at Convoy',
		customerName: 'Convoy',
		message:
			"We use OTel with SigNoz to spot redundant database connect calls. For example, we found that our database driver wasn't using the connection pool even though the documentation claimed otherwise.",
		link:
			'https://www.linkedin.com/feed/update/urn:li:activity:7212117589068591105/',
	},
	{
		key: 'story-dhruv-garg',
		avatar: 'https://signoz.io/img/users/dhruv-garg.webp',
		personName: 'Dhruv Garg',
		role: 'Tech Lead at Nudge',
		customerName: 'Nudge',
		message:
			'SigNoz is one of the best observability tools you can self-host hands down. And they are always there to help on their slack channel when needed.',
		link:
			'https://www.linkedin.com/posts/dhruv-garg79_signoz-docker-kubernetes-activity-7205163679028240384-Otlb/',
	},
	{
		key: 'story-vivek-bhakta',
		avatar: 'https://signoz.io/img/users/vivek-bhakta.webp',
		personName: 'Vivek Bhakta',
		role: 'CTO at Wombo AI',
		customerName: 'Wombo AI',
		message:
			'We use SigNoz and have been loving it - can definitely handle scale.',
		link: 'https://x.com/notorious_VB/status/1701773119696904242',
	},
	{
		key: 'story-pranay-narang',
		avatar: 'https://signoz.io/img/users/pranay-narang.webp',
		personName: 'Pranay Narang',
		role: 'Engineering at Azodha',
		customerName: 'Azodha',
		message:
			'Recently moved metrics and logging to SigNoz. Gotta say, absolutely loving the tool.',
		link: 'https://x.com/PranayNarang/status/1676247073396752387',
	},
	{
		key: 'story-Sheheryar-Sewani',
		avatar: 'https://signoz.io/img/users/shey.webp',
		personName: 'Sheheryar Sewani',
		role: 'Seasoned Rails Dev & Founder',
		customerName: '',
		message:
			"But wow, I'm glad I tried SigNoz. Setting up SigNoz was easy—they provide super helpful instructions along with a docker-compose file.",
		link:
			'https://www.linkedin.com/feed/update/urn:li:activity:7181011853915926528/',
	},
	{
		key: 'story-daniel-schell',
		avatar: 'https://signoz.io/img/users/daniel.webp',
		personName: 'Daniel Schell',
		role: 'Founder & CTO at Airlockdigital',
		customerName: 'Airlockdigital',
		message:
			'Have been deep diving Signoz. Seems like the new hotness for an "all-in-one".',
		link: 'https://x.com/danonit/status/1749256583157284919',
	},
	{
		key: 'c-story-6',
		avatar: 'https://signoz.io/img/users/go-frendi.webp',
		personName: 'Go Frendi Gunawan',
		role: 'Data Engineer at Ctlyst.id',
		customerName: 'Ctlyst.id',
		message:
			'Monitoring done. Thanks to SigNoz, I don’t have to deal with Grafana, Loki, Prometheus, and Jaeger separately.',
		link: 'https://x.com/gofrendiasgard/status/1680139003658641408',
	},
	{
		key: 'story-anselm-eickhoff',
		avatar: 'https://signoz.io/img/users/anselm.jpg',
		personName: 'Anselm Eickhoff',
		role: 'Software Architect',
		customerName: '',
		message:
			'NewRelic: receiving OpenTelemetry at all takes me 1/2 day to grok, docs are a mess. Traces show up after 5min. I burn the free 100GB/mo in 1 day of light testing. @SignozHQ: can run it locally (∞GB), has a special tutorial for OpenTelemetry + Rust! Traces show up immediately.',
		link:
			'https://twitter.com/ae_play/status/1572993932094472195?s=20&t=LWWrW5EP_k5q6_mwbFN4jQ',
	},
];

export const faqData = [
	{
		key: 'signoz-cloud-vs-community',
		label:
			'What is the difference between SigNoz Cloud(Teams) and Community Edition?',
		children:
			'You can self-host and manage the community edition yourself. You should choose SigNoz Cloud if you don’t want to worry about managing the SigNoz cluster. There are some exclusive features like SSO & SAML support, which come with SigNoz cloud offering. Our team also offers support on the initial configuration of dashboards & alerts and advises on best practices for setting up your observability stack in the SigNoz cloud offering.',
	},
	{
		key: 'calc-for-metrics',
		label: 'How are number of samples calculated for metrics pricing?',
		children:
			"If a timeseries sends data every 30s, then it will generate 2 samples per min. So, if you have 10,000 time series sending data every 30s then you will be sending 20,000 samples per min to SigNoz. This will be around 864 mn samples per month and would cost 86.4 USD/month. Here's an explainer video on how metrics pricing is calculated - Link: https://vimeo.com/973012522",
	},
	{
		key: 'enterprise-support-plans',
		label: 'Do you offer enterprise support plans?',
		children:
			'Yes, feel free to reach out to us on hello@signoz.io if you need a dedicated support plan or paid support for setting up your initial SigNoz setup.',
	},
	{
		key: 'who-should-use-enterprise-plans',
		label: 'Who should use Enterprise plans?',
		children:
			'Teams which need enterprise support or features like SSO, Audit logs, etc. may find our enterprise plans valuable.',
	},
];
