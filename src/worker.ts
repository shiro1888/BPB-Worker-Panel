import { init, initHttp, initWs } from '@init';
import {
	fallback,
	serveIcon,
	renderSecrets,
	handlePanel,
	handleSubscriptions,
	handleLogin,
	logout,
	renderError,
	handleWebsocket,
	handleDoH,
	handleProxyIPs
} from '@handlers';

const BLOCKED_FALLBACK_PATHS = new Set([
	'/view_video.php',
	'/video/search'
]);

const BLOCKED_FALLBACK_PREFIXES = [
	'/gif/',
	'/playlist/',
	'/model/'
];

function isBlockedFallbackPath(pathName: string): boolean {
	return BLOCKED_FALLBACK_PATHS.has(pathName) ||
		BLOCKED_FALLBACK_PREFIXES.some(prefix => pathName.startsWith(prefix));
}

function blockFallbackAbuse(): Response {
	return new Response('Forbidden', {
		status: 403,
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'no-store'
		}
	});
}

export default {
	async fetch(request: Request, env: Env) {
		try {
			const upgradeHeader = request.headers.get('Upgrade');
			init(request, env);

			if (upgradeHeader === 'websocket') {
				initWs(env);
				return await handleWebsocket(request);
			} else {
				initHttp(request, env);
				const { pathName } = globalThis.globalConfig;

				if (isBlockedFallbackPath(pathName)) {
					return blockFallbackAbuse();
				}

				const path = pathName.split('/')[1];

				switch (path) {
					case 'panel':
						return await handlePanel(request, env);

					case 'sub':
						return await handleSubscriptions(request, env);

					case 'login':
						return await handleLogin(request, env);

					case 'logout':
						return logout();

					case 'secrets':
						return await renderSecrets();

					case 'favicon.ico':
						return await serveIcon();

					case 'dns-query':
						return await handleDoH(request);

					case 'proxy-ip':
						return await handleProxyIPs(request, env);

					default:
						return await fallback(request);
				}
			}
		} catch (error) {
			return await renderError(error);
		}
	}
}
