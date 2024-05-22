// src/worker.js
async function cron(env, sendMsg) {
	console.log('Cron func is running...');
	const KV1 = env.WDR;
	const KV2 = env.WVR;
	var repos = [];
	var pages = [];
	const Dlist = await KV1.list();
	console.log('Key list aquired for downloads');
	var Dtotal = 0;
	var i = 0;
	var len = Dlist.keys.length;
	const invalidNames = new Set(['total', '%2F', '%3F', '%3D', '?file=']);
	for (const { name, expiration } of Dlist.keys) {
			i++;
			console.log(`Getting value for ${name} (${i}/${len})`);
			const value = await KV1.get(name);
			if (!name || invalidNames.has(name)) {
					console.log('Invalid Repo, skipping');
					if (name && name.includes('%')) {
							var newName = name.replace(/%2F|%3F|%3D/g, (match) => {
									switch (match) {
											case '%2F': return '/';
											case '%3F': return '?';
											case '%3D': return '=';
									}
							}).split('?')[0];
							var lcount = await KV1.get(newName);
							await KV1.put(newName, lcount * 1 + value * 1);
							await KV1.delete(name);
							// console.log('Deleted invalid repo ' + name + ' and replaced with ' + newName);
					}
					await KV1.delete(name);
					// console.log('Invalid Repo, deleting');
			} else {
					repos.push({ name, count: parseInt(value) });
					Dtotal += parseInt(value);
			}
	}
	repos.sort((a, b) => b.count - a.count);
	const Plist = await KV2.list();
	// console.log('Key list aquired for pages');
	var Ptotal = 0;
	var i = 0;
	var len = Plist.keys.length;
	for (const { name, expiration } of Plist.keys) {
		i++;
		console.log(`Getting value for ${name} (${i}/${len})`);
		const value = await KV2.get(name);
		if (!name) {
			// console.log('Invalid page, skipping');
		} else {
			pages.push({ name, count: parseInt(value) });
			Ptotal += parseInt(value);
		}
	}
	pages.sort((a, b) => b.count - a.count);
	let currentDate = /* @__PURE__ */ new Date();
	var downloadMessage =
		'# Downloads as of ' +
		currentDate.toUTCString() +
		'\n\n' +
		repos
			.map(
				(repo) => `Repo: ${repo.name}, Count: ${repo.count}
  `
			)
			.join('');
	var downloadMessage = downloadMessage + '\n\nTotal downloads: ' + Dtotal;
	var pageViewMessage =
		'# Page visits as of ' +
		currentDate.toUTCString() +
		'\n\n' +
		pages
			.map(
				(page) => `Page: ${page.name}, Count: ${page.count}
  `
			)
			.join('');
	let pageViewMessage_1 = pageViewMessage.substring(0, 1999);
	let pageViewMessage_2 = pageViewMessage.substring(2e3);
	// console.log('Message generated. Sending to Discord...');
	if (sendMsg == false) {
		console.log('Sending data to ' + env.url);
		await sendMessageToDiscord(downloadMessage, env);
		await sendMessageToDiscord(pageViewMessage_1, env);
		if (pageViewMessage_2.length > 0) {
			await sendMessageToDiscord(pageViewMessage_2, env);
		}
		// console.log('Message sent to Discord');
		return 'Complete! Message sent.';
	} else {
		console.log('Returning mesage');
		return downloadMessage + '\n\n' + pageViewMessage;
	}
}
async function sendMessageToDiscord(message, env) {
	await fetch(env.url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			content: message,
		}),
	})
		.then((response) => {
			console.log('Status:', response.status);
		})
		.then((body) => console.log('Body:', body))
		.catch((error) => console.error(error));
	return;
}
async function recordDownload(url, env) {
	// console.log('Recording download');
	const KV = env.WDR;
	// console.log('Handling request for ' + url);
	var urltmp = url.toString().replace('%2F', '/');
	var urltmp = urltmp.replace('%3F', '?');
	const packNameRaw = urltmp.toString().split('/reder?url=')[1];
	const fileName = urltmp.toString().split('?file=')[1];
	var packName = packNameRaw.split('?file=')[0];
	if (!packName || !fileName) {
		// console.log('Invalid request, redirecting to 404');
		return Response.redirect('https://thealiendoctor.com/404', 301);
	}
	// console.log('Parsed! Pack name is ' + packName + ' and file name is ' + fileName);
	var oldNum = await KV.get(packName);
	if (oldNum / oldNum != 1) {
		// console.log('Repo not found in KV');
		await KV.put(packName, 1);
		console.log(packName + ' added to KV');
	} else {
		console.log('Found in KV');
		var newCount = oldNum * 1 + 1;
		await KV.put(packName, newCount);
		console.log(packName + ' now has ' + newCount + ' downloads');
	}
	let oldTotal = await KV.get('total');
	await KV.put('total', oldTotal * 1 + 1);
	// console.log('Redirecting the user to https://github.com/' + packName + '/releases/download/' + fileName);
	return Response.redirect(
		'https://github.com/' + packName + '/releases/download/' + fileName,
		301,
		// @ts-ignore
		{
			headers: {
				'Cache-Control': 'no-store',
			},
		}
	);
}
async function recordVisit(url, env) {
	let page = url.split('?page=')[1];
	if (page == void 0) {
		return new Response('No page specified', { status: 400 });
	}
	let count = await env.WVR.get(page);
	if (count == null) {
		count = 0;
	}
	count++;
	await env.WVR.put(page, count);
	return new Response('OK', { status: 200 });
}
var worker_default = {
	/**
	 * Incoming requests will trigger this method.
	 * Decides what to do with the request (download, page view or invalid request)
	 */
	async fetch(request, env, ctx) {
		// console.log('Worker is running...');
		var url = new URL(request.url).toString();
		url = url.replace('%2F', '/');
		url = url.replace('%3F', '?');
		url = url.replace('%3D', '=');
		// console.log('Processing request for ' + url);
		switch (true) {
			case url.includes('favicon.ico'):
				return new Response(null, { status: 404 });
			case url.includes('/test/ping'):
				console.log('Ping request, ignoring');
				return new Response('OK');
			case url.includes('robots.txt'):
				return new Response('User-agent: *\nDisallow: /', { headers: { 'content-type': 'text/plain' } });
			case url.includes('/reder?url='):
				console.log('Request is for a download.');
				return await recordDownload(request.url, env);
			case url.includes('?page='):
				console.log('Request is for a page.');
				return await recordVisit(url, env);
			case url.includes('stats.thealiendoctor.com'):
				console.log('Request is for stats');
				let headers = request.headers;
				if (headers.get('X-AW2C-AUTH') == env.auth) {
					console.log('Authorized');
					return new Response(await cron(env, true));
				} else {
					console.log('Unauthorized (tried ' + headers.get('X-AW2C-AUTH') + ' but expected ' + env.auth + ')');
					return new Response('Unauthorized', { status: 401 });
				}
			default:
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
