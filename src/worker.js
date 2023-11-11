async function cron(env) {
  console.log("Cron func is running...");
  const KV = env.KV;
  const webhookURL = env.url;
  var repos = [];
  const list = await KV.list();
  console.log("Key list aquired");
  for (const { name, expiration } of list.keys) {
    console.log("Getting value for " + name);
    const value = await KV.get(name);
    if (name == "total" | name == undefined | name == "undefined") {
      console.log("Invalid Repo, skipping");
    } else {
      repos.push({ name: name, count: parseInt(value) });
    }
  }
  repos.sort((a, b) => b.count - a.count); // Sort repos by count in descending order
  var message = repos.map(repo => `Repo: ${repo.name}, Count: ${repo.count}\n`).join("");
  console.log("Message generated. Sending to Discord...");
  console.log(message);
  
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
  return "complete";
}



export default {
  async fetch(request, env, ctx) {
    console.log("Worker is running...");
    const url = request.url;
    if (url.includes("testCron")) { console.log("testing cron func"); return new Response(await cron(env));}
    if (url.includes("favicon.ico")) {
      return new Response(null, { status: 404 });
    }
    const KV = env.KV;
    console.log("Handling request for " + url);
    const packNameRaw = url.split("/reder?url=")[1]; //pack name will include username, e.g niceygylive/example
    const fileName = url.split("?file=")[1]; //e.g V1.1.2/download.zip
    var packName = packNameRaw.split("?file=")[0]; //e.g niceygylive/example
    if (packName == undefined | fileName == undefined) {
      console.log("Invalid request, redirecting to 404")
      await response.redirect(
      "https://thealiendoctor.com/404", 301
      );

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
    await KV.put("total", oldTotal * 1 + 1);

    // Redirect the user to the recorded URL.
    console.log("Redirecting the user to https://github.com/" + packName + "/releases/download/" + fileName)
    return await Response.redirect(
      "https://github.com/" + packName + "/releases/download/" + fileName,
      301,
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(cron(env));
  },
};
