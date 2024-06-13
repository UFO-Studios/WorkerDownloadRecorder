// src/worker.js

import { cron } from "./scheduled/weeklyMessage";

async function recordDownload(url, env) {
	const KV = env.WDR;
	//Get the Repo and file name from the URL
	var urltmp = url.toString().replace('%2F', '/');
	var urltmp = urltmp.replace('%3F', '?');
	const packNameRaw = urltmp.toString().split('/reder?url=')[1];
	const fileName = urltmp.toString().split('?file=')[1];
	var packName = packNameRaw.split('?file=')[0];
	//packname example: TheAlienDoctor/Worker-Download-Recorder, filename example: Worker-Download-Redirect-v1.0.0.zip
	if (!packName || !fileName) {
		console.log('Invalid request, redirecting to 404');
		return Response.redirect('https://thealiendoctor.com/404', 301);
	}
	console.log('Parsed! Pack name is ' + packName + ' and file name is ' + fileName);
	//Add one to that repo's count
	var oldNum = await KV.get(packName);
	if (oldNum / oldNum != 1) {
		console.log('Repo not found in KV');
		await KV.put(packName, 1);
		console.log(packName + ' added to KV');
	} else {
		console.log('Found in KV');
		var newCount = oldNum++;
		await KV.put(packName, newCount);
		console.log(packName + ' now has ' + newCount + ' downloads');
	}

	//Redirect the user to the download link
	console.log('Redirecting the user to https://github.com/' + packName + '/releases/download/' + fileName);
	return Response.redirect(
		'https://github.com/' + packName + '/releases/download/' + fileName,
		301,
		// @ts-ignore
		{
			headers: {
				'Cache-Control': 'no-store', //attempt to prevent caching. Browser dependent
			},
		}
	);
}
async function recordVisit(url, env) {
	let page = url.split('?page=')[1];
}
async function recordVisit(url, env) {
	let page = url.split('?page=')[1];
	if (page == void 0) {
		return new Response('No page specified', { status: 400 });
		return new Response('No page specified', { status: 400 });
	}
	let count = await env.WVR.get(page);
	if (count == null) {
		count = 0;
		count = 0;
	}
	count++;
	await env.WVR.put(page, count);
	return new Response('OK', { status: 200 });
}
var worker_default = {
	return new Response('OK', { status: 200 });
}
var worker_default = {
	/**
	 * Incoming requests will trigger this method.
	 * Decides what to do with the request (download, page view or invalid request)
	 */
	async fetch(request, env, ctx) {
		console.log('Worker is running...');
		var url = new URL(request.url).toString();
		url = decodeURI(url); //Decode the URL (if it's encoded)

		console.log('Processing request for ' + url);

		//What to do with the request?
		switch (true) {
			case url.includes('favicon.ico'):
				return new Response(null, { status: 404 });
			case url.includes('/test/ping'):
				console.log('Ping request, ignoring');
				return new Response('OK');
			case url.includes('robots.txt'):
				return new Response('User-agent: *\nDisallow: /', { headers: { 'content-type': 'text/plain' } }); //Disallow all bots
			case url.includes('/reder?url='):
				console.log('Request is for a download.');
				return await recordDownload(request.url, env);
			case url.includes('?page='):
				console.log('Request is for a page.');
				return await recordVisit(url, env);
			default: // Don't know? 404!
				console.log('Invalid request, redirecting to 404');
				return Response.redirect('https://thealiendoctor.com/404', 301);
		}
	},
	async scheduled(event, env, ctx) {
		console.log('Scheduled event is running...');
		ctx.waitUntil(await cron(env, false));
		console.log('Scheduled event completed');
	},
};
export { worker_default as default };
//# sourceMappingURL=worker.js.map
		console.log('Scheduled event is running...');
		ctx.waitUntil(await cron(env, false));
		console.log('Scheduled event completed');
	},
};
export { worker_default as default };
//# sourceMappingURL=worker.js.map
