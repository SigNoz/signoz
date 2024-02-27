/* eslint-disable  */
// @ts-ignore
// @ts-nocheck
import { createProxyMiddleware } from 'http-proxy-middleware';

export default function (app) {
	app.use(
		'/tunnel',
		createProxyMiddleware({
			target: process.env.TUNNEL_DOMAIN,
			changeOrigin: true,
		}),
	);
}
