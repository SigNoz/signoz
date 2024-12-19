/* eslint-disable  */
// @ts-ignore
// @ts-nocheck
import { legacyCreateProxyMiddleware } from 'http-proxy-middleware';

export default function (app) {
	app.use(
		'/tunnel',
		legacyCreateProxyMiddleware({
			target: `${process.env.TUNNEL_DOMAIN}/tunnel`,
			changeOrigin: true,
		}),
	);
}
