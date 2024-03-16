/**
 * Sends a message to a Discord channel with the download and page view stats
 * @param {env} env  - The environment variables
 * @param {boolean} sendMsg  - Whether to send the message to Discord or return it
 * @returns {null}
 */

async function cron(env, sendMsg) {
	console.log('Cron func is running...');
	const KV1 = env.WDR; //WDR: WorkerDownloadRecorder
	const KV2 = env.WVR; //WVR: WorkerVisitRecorder
	var repos = [];
	var pages = [];
	const Dlist = await KV1.list(); //Dlist = Download list
	console.log('Key list aquired for downloads');
	var Dtotal = 0;
	var i = 0;
	var len = Dlist.keys.length;
	for (const { name, expiration } of Dlist.keys) {
		i++;
		console.log(`Getting value for ${name} (${i}/${len})`);
		const value = await KV1.get(name);
		if (!name || name == 'total' || name.toString().includes('%2F') || name.toString().includes('%3F') || name.toString().includes('%3D')) {
			if (!name) {
			} else {
				await KV1.delete(name);
			}
			console.log('Invalid Repo, skipping');
		} else {
			repos.push({ name, count: parseInt(value) });
			Dtotal += parseInt(value); //calc total downloads
		}
	}
	repos.sort((a, b) => b.count - a.count); //sort by count (high > low)
	const Plist = await KV2.list(); //Plist = Page list
	console.log('Key list aquired for pages');
	var Ptotal = 0;
	var i = 0;
	var len = Plist.keys.length;
	for (const { name, expiration } of Plist.keys) {
		i++;
		console.log(`Getting value for ${name} (${i}/${len})`);
		const value = await KV2.get(name);
		if (!name) {
			console.log('Invalid page, skipping');
		} else {
			pages.push({ name, count: parseInt(value) });
			Ptotal += parseInt(value);
		}
	}
	pages.sort((a, b) => b.count - a.count); //sort by count (high > low)
	let currentDate = /* @__PURE__ */ new Date();
	var message1 =
		'# Downloads as of ' +
		currentDate.toUTCString() +
		'\n\n' +
		repos
			.map(
				(repo) => `Repo: ${repo.name}, Count: ${repo.count}
`
			)
			.join('');
	var message1 = message1 + '\n\nTotal downloads: ' + Dtotal;
	var message2 =
		'# Page visits as of ' +
		currentDate.toUTCString() +
		'\n\n' +
		pages
			.map(
				(page) => `Page: ${page.name}, Count: ${page.count}
`
			)
			.join('');
	var message = message2 + '\n\nTotal page visits: ' + Ptotal;
	console.log('Message generated. Sending to Discord...');
	console.log(message);
	if (sendMsg == false) {
		console.log('Sending data to ' + env.url);
		//split messages to avoid limit
		await fetch(env.url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				content: message1,
			}),
		})
			.then((response) => {
				console.log('Status:', response.status);
			})
			.then((body) => console.log('Body:', body))
			.catch((error) => console.error(error));
		await fetch(env.url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				content: message2,
			}),
		})
			.then((response) => {
				console.log('Status:', response.status);
				// return response.text();
			})
			.then((body) => console.log('Body:', body))
			.catch((error) => console.error(error));
		console.log('Message sent to Discord');
		return 'Complete! Message sent.';
	} else {
		console.log('Returning mesage');
		return message1 + '\n\n' + message2;
	}
}
async function recordDownload(url, env) {
	console.log('Recording download');
	const KV = env.WDR;
	console.log('Handling request for ' + url);
	var urltmp = url.toString().replace('%2F', '/');
	var urltmp = urltmp.replace('%3F', '?');
	const packNameRaw = urltmp.toString().split('/reder?url=')[1];
	const fileName = urltmp.toString().split('?file=')[1];
	var packName = packNameRaw.split('?file=')[0];
	if (!packName || !fileName) {
		console.log('Invalid request, redirecting to 404');
		return Response.redirect('https://thealiendoctor.com/404', 301);
	}
	console.log('Parsed! Pack name is ' + packName + ' and file name is ' + fileName);
	var oldNum = await KV.get(packName);
	if (oldNum / oldNum != 1) {
		console.log('Repo not found in KV');
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
	console.log('Redirecting the user to https://github.com/' + packName + '/releases/download/' + fileName);
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
		console.log('Worker is running...');
		var url = new URL(request.url).toString();
		// Replace encoded characters
		url = url.replace('%2F', '/');
		url = url.replace('%3F', '?');
		url = url.replace('%3D', '=');
		console.log('Processing request for ' + url);

		// Check if the request is for a download, page view or invalid
		if (url.includes('test/cron')) {
			//Run cron tests manually, used for debug
			return new Response(await cron(env, true, false));
		} else if (url.includes('favicon.ico')) {
			//Ignore favicon requests
			return new Response(null, { status: 404 });
		} else if (url.includes('robots.txt')) {
			//Ignore robots.txt requests
			return new Response('User-agent: *\nDisallow: /', {
				headers: {
					'content-type': 'text/plain',
				},
			});
		}
		if (!url) {
			//Ignore empty requests
			console.log('Invalid request, redirecting to 404');
			return Response.redirect('https://thealiendoctor.com/404', 301);
		}
		if (url.includes('/reder?url=')) {
			//Download req
			console.log('Request is for a download.');
			return await recordDownload(request.url, env);
		} else if (url.includes('?page=')) {
			//Page view req
			console.log('Request is for a page.');
			return await recordVisit(url, env);
		} else {
			//Invalid req
			console.log('Invalid request, redirecting to 404');
			return Response.redirect('https://thealiendoctor.com/404', 301);
		}
	},
	async scheduled(event, env, ctx) {
		console.log('Scheduled event is running...');
		ctx.waitUntil(await cron(env, false));
	},
};
export { worker_default as default };
//# sourceMappingURL=worker.js.map
