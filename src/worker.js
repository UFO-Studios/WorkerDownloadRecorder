// // src/worker.js

import { cron } from './scheduled/weeklyMessage';

async function recordDownload(url, env) {
    const KV = env.WDR;
    // Get the Repo and file name from the URL
    let urltmp = url.toString().replace('%2F', '/').replace('%3F', '?');
    const [packNameRaw, fileName] = urltmp.split('/reder?url=')[1]?.split('?file=') || [];
    const packName = packNameRaw?.split('?file=')[0];

    // packname example: TheAlienDoctor/Worker-Download-Recorder, filename example: Worker-Download-Redirect-v1.0.0.zip
    if (!packName || !fileName) {
        console.log('Invalid request, redirecting to 404');
        return Response.redirect('https://thealiendoctor.com/404', 301);
    }
    console.log(`Parsed! Pack name is ${packName} and file name is ${fileName}`);

    // Add one to that repo's count
    let oldNum = await KV.get(packName);
    if (oldNum == null) {
        console.log('Repo not found in KV');
        await KV.put(packName, 1);
        console.log(`${packName} added to KV`);
    } else {
        console.log('Found in KV');
        let newCount = parseInt(oldNum) + 1;
        await KV.put(packName, newCount);
        console.log(`${packName} now has ${newCount} downloads (had ${oldNum})`);
    }

    // Redirect the user to the download link
    console.log(`Redirecting the user to https://github.com/${packName}/releases/download/${fileName}`);
    return Response.redirect(
        `https://github.com/${packName}/releases/download/${fileName}`,
        307, // 307 means temporary, so hopefull it will mean it is cached less!
        {
            headers: {
                'Cache-Control': 'no-store', // attempt to prevent caching. Browser dependent
            },
        }
    );
}

async function recordVisit(url, env) {
    let page = url.split('?page=')[1];
    if (!page) {
        return new Response('No page specified', { status: 400 });
    }
    let count = await env.WVR.get(page);
    count = count ? parseInt(count) + 1 : 1;
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
        let url = decodeURI(new URL(request.url).toString());

        console.log(`Processing request for ${url}`);

        // What to do with the request?
        switch (true) {
            case url.includes('favicon.ico'):
                return new Response(null, { status: 404 });
            case url.includes('/test/ping'):
                console.log('Ping request, ignoring');
                return new Response('OK');
            case url.includes('robots.txt'):
                return new Response('User-agent: *\nDisallow: /', { headers: { 'content-type': 'text/plain' } }); // Disallow all bots
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

// export default {
//   async fetch(request, env, ctx) {
//     return new Response('Hello World!');
//   },
// 	async scheduled(event, env, ctx) {
// 				console.log('Scheduled event is running...');
// 				ctx.waitUntil(await cron(env, false));
// 				console.log('Scheduled event completed');
// 			},
// };
