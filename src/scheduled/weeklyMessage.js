import { chart } from "./scheduled/chart";

/**
 * Sends the weekly totals to a discord channel.
 * @param {object} env
 * @returns
 */

export async function cron(env) {
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
	for (const { name, expiration } of Dlist.keys) {
		i++;
		console.log(`Getting value for ${name} (${i}/${len})`);
		const value = await KV1.get(name);
		if (!name || name == 'total' || name.toString().includes('%2F') || name.toString().includes('%3F') || name.toString().includes('%3D') || name.toString().includes('?file=')) {
			if (!name) {
				console.log('Invalid Repo, skipping');
			} else {
				if (name.toString().includes('%2F') || name.toString().includes('%3F') || name.toString().includes('%3D')) {
					var newName = name.toString().replace('%2F', '/');
					var newName = newName.replace('%3F', '?');
					var newName = newName.replace('%3D', '=');
					var newName = newName.split('?')[0];
					var lcount = await KV1.get(newName);
					await KV1.put(newName, lcount * 1 + value * 1);
					await KV1.delete(name);
					console.log('Deleted invalid repo ' + name + ' and replaced with ' + newName);
				}
				await KV1.delete(name);
				console.log('Invalid Repo, deleting');
			}
		} else {
			repos.push({ name, count: parseInt(value) });
			Dtotal += parseInt(value);
		}
	}
	repos.sort((a, b) => b.count - a.count);
	const Plist = await KV2.list();
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
	pages.sort((a, b) => b.count - a.count);
	let currentDate = /* @__PURE__ */ new Date();

	var downloadMessageRaw = repos.map((repo) => `Repo: ${repo.name}, Count: ${repo.count}`).join('');
	var downloadMessage = '# Downloads as of ' + currentDate.toUTCString() + '\n\n' + downloadMessageRaw + '\n\nTotal downloads: ' + Dtotal;
	var pageViewMessage = '# Page visits as of ' + currentDate.toUTCString() + '\n\n' + pages.map((page) => `Page: ${page.name}, Count: ${page.count}`).join('');
	let pageViewMessage_1 = pageViewMessage.substring(0, 1999);
	let pageViewMessage_2 = pageViewMessage.substring(2e3);
	console.log('Message generated. Sending to Discord...');
		console.log('Sending data to ' + env.url);
		await sendMessageToDiscord(downloadMessage, env);
		await sendMessageToDiscord(pageViewMessage_1, env);
		await chart(downloadMessageRaw);
		if (pageViewMessage_2.length > 0) {
			await sendMessageToDiscord(pageViewMessage_2, env);
		}
		console.log('Message sent to Discord');
		return 'Complete! Message sent.';
}

/**
 * Sends a text message to a Discord channel.
 * @param {string} message The message to be sent.
 * @param {object} env The ENV object.
 * @returns
 */
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
