/**
 * The scheduled function for sending data weekly.
 * @param {env} env The ENV object, used for KV 
 * @param {*} sendMsg Whether or not to send the message to Discord. If false, it will send the message. If true, it will return the message.
 * @returns Either a message or a response
 */

async function cron(env, sendMsg) {
  console.log("Cron func is running...");
  const KV1 = env.WDR;
  const KV2 = env.WVR;
  const webhookURL = env.url;
  var repos = [];
  var pages = [];

  //DOWNLOADS ########################################################################

  const Dlist = await KV1.list();
  console.log("Key list aquired for downloads");
  var Dtotal = 0;
  var i = 0;
  var len = Dlist.keys.length;
  for (const { name, expiration } of Dlist.keys) {
    console.log(`Getting value for ${name} (${i}/${len})`);
    const value = await KV1.get(name);
    if (name == "total" | name == undefined | name == "undefined") {
      console.log("Invalid Repo, skipping");
    } else {
      repos.push({ name: name, count: parseInt(value) });
      Dtotal += parseInt(value);
    }
  }
  repos.sort((a, b) => b.count - a.count); // Sort repos by count in descending order
  //PAGE VISITS ########################################################################

  const Plist = await KV2.list();
  console.log("Key list aquired for pages");
  var Ptotal = 0;
  var i = 0;
  var len = Plist.keys.length;
  for (const { name, expiration } of Plist.keys) {
    i++;
    console.log(`Getting value for ${name} (${i}/${len})`);
    const value = await KV2.get(name);
    if (name == "total" | name == undefined | name == "undefined") {
      console.log("Invalid page, skipping");
    } else {
      pages.push({ name: name, count: parseInt(value) });
      Ptotal += parseInt(value);
    }
  }
  pages.sort((a, b) => b.count - a.count); // Sort repos by count in descending order
  let currentDate = new Date();

  //MESSAGE ########################################################################
  var message = "# Downloads as of " + currentDate.toUTCString() + "\n\n" + repos.map(repo => `Repo: ${repo.name}, Count: ${repo.count}\n`).join("");
  var message = message + "\n\nTotal downloads: " + Dtotal;
  var message = message + "\n\n# Page visits as of " + currentDate.toUTCString() + "\n\n" + pages.map(page => `Page: ${page.name}, Count: ${page.count}\n`).join("");
  var message = message + "\n\nTotal page visits: " + Ptotal;
  console.log("Message generated. Sending to Discord...");
  console.log(message);

  if (sendMsg == false) {
    await fetch(webhookURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: message,
      }),
    })
      .then((response) => console.log(response))
      .catch((error) => console.error(error));
    console.log("Message sent to Discord");
    return "Complete! Message sent.";
  } else {
    console.log("Returning mesage");
    return message;
  }
}

/**
 * Function for recording a download.
 * @param {URL} url The requested url. From request.url 
 * @param {env} env The ENV object, used for KV 
 * @returns Error or redirect
 */
async function recordDownload(url, env) {
  console.log("Recording download");
  const KV = env.WDR;
  console.log("Handling request for " + url);
  const packNameRaw = url.toString().split("/reder?url=")[1]; //pack name will include username & file part of url, e.g niceygylive/example
  const fileName = url.toString().split("?file=")[1]; //e.g V1.1.2/download.zip
  var packName = packNameRaw.split("?file=")[0]; //removes file part of url, leaving "niceygylive/example"
  if (packName == undefined | fileName == undefined) {
    console.log("Invalid request, redirecting to 404")
    return Response.redirect("https://thealiendoctor.com/404", 301);
  }

  console.log("Parsed! Pack name is " + packName + " and file name is " + fileName);

  var oldNum = await KV.get(packName);
  if (oldNum / oldNum != 1) {
    console.log("Repo not found in KV");
    await KV.put(packName, 1);
    console.log(packName + " added to KV");
  } else {
    console.log("Found in KV");
    var newCount = oldNum * 1 + 1;
    await KV.put(packName, newCount);
    console.log(packName + " now has " + newCount + " downloads");
  }

  let oldTotal = await KV.get("total");
  await KV.put("total", oldTotal * 1 + 1);//for *1 is to make sure it is treated as a number

  // Redirect the user to the requested URL.
  console.log("Redirecting the user to https://github.com/" + packName + "/releases/download/" + fileName)
  return Response.redirect(
    "https://github.com/" + packName + "/releases/download/" + fileName,
    301,
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

/**
 * The function for recording a visit to a page.
 * @param {string} url The url from request.url
 * @param {object} env The ENV object, used for KV
 * @returns Error or redirect
 */
async function recordVisit(url, env) {
  let page = url.split("?page=")[1];
    if (page == void 0) {
      return new Response("No page specified", { status: 400 });
    }
    let count = await env.WVR.get(page);
    if (count == null) {
      count = 0;
    }
    count++;
    await env.WVR.put(page, count);
    return new Response("OK", { status: 200 });
}

export default {
  async fetch(request, env, ctx) {
    console.log("Worker is running...");
    console.log("Processing request for " + request.url);
    const url = request.url;
    if (url.includes("test/cron")) { return new Response(await cron(env, true, false)) }
    if (url.includes("test/db")) { return new Response(await cron(env, true, true)) }
    if (url.includes("favicon.ico")) { return new Response(null, { status: 404 }) }
    if (url.length < 1 | url == void 0) {
      console.log("Invalid request, redirecting to 404");
      return Response.redirect("https://thealiendoctor.com/404", 301);
    }
    if (url.includes("/reder?url=")) {
      console.log("Request is for a download.");
      return await recordDownload(request.url, env);
    } else if (url.includes("?page=")) {
      console.log("Request is for a page.");
      return await recordVisit(url, env);
    } else {
      console.log("Invalid request, redirecting to 404");
      return Response.redirect("https://thealiendoctor.com/404", 301);
    }

  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(cron(env, false));
  }
};
