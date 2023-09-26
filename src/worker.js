async function cron(env) {
  console.log("Cron func is running...");
  const KV = env.KV;
  const webhookURL = env.url;
  var message = ""
  message += "\n\n";
  const list = await KV.list();
  console.log("Key list aquired");
  for (const { name, expiration } of list.keys) {
    console.log("Getting value for " + name);
    const value = await KV.get(name);
    if (name == "total" | name == undefined | name == "undefined") {
      console.log("Invalid Repo, skipping");
    } else {
    message += (`Repo: ${name}, Count: ${value}\n`);
    }
  }
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
  return "complete\n";
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
    console.log(url);
    const packName = url.split("/reder?url=")[1]; //pack name will include username, e.g niceygylive/example
    const fileName = url.split("?file=")[1]; //e.g V1.1.2/download.zip

    console.log(packName);

    var oldNum = await KV.get(packName);
    // Record the URL if it is not already recorded in the Worker's storage.
    if (oldNum / oldNum != 1) {
      console.log("Not found in KV");
      await KV.put(packName, 1);
      console.log(packName + " added to KV");
    } else {
      console.log("Found in KV");
      var newCount = oldNum * 1 + 1;
      //var newCount = oldNum + 1;
      console.log(packName + " has " + newCount + " downloads");
      await KV.put(packName, newCount);
      console.log(packName + " updated in KV");
    }

    let oldTotal = await KV.get("total");
    await KV.put("total", oldTotal * 1 + 1);

    // Redirect the user to the recorded URL.
    return await Response.redirect(
      "https://github.com/" + packName + "/releases/download" + fileName,
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
