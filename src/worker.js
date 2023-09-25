export default {
  async fetch(request, env, ctx) {
    console.log("Worker is running...")
    const url = request.url;
    if (url.includes("favicon.ico")) {
      return new Response(null, { status: 404 });
    }
    const KV = env.KV;
    console.log(url);
    const packName = url.split("/reder?url=")[1]; //pack name will include username, e.g niceygylive/example
    //var packName = "";
    
    console.log(packName);

    var oldNum = await KV.get(packName);
    // Record the URL if it is not already recorded in the Worker's storage.
    if (oldNum / oldNum != 1) {
      console.log("Not found in KV")
      await KV.put(packName, 1);
      console.log(packName + " added to KV");
    } else {
      console.log("Found in KV")
      var newCount = oldNum*1+1;
      //var newCount = oldNum + 1;
      console.log(packName + " has " + newCount + " downloads");
      await KV.put(packName, newCount);
      console.log(packName + " updated in KV");
    }

    let oldTotal = await KV.get("total");
    await KV.put("total", oldTotal*1+1);

    // Redirect the user to the recorded URL.
    return await Response.redirect("https://github.com/"+packName+"/releases", 301, {
      headers: {
        //"Cache-Control": "no-cache",
        "Cache-Control": "no-store"
      }
    });
  },
  async scheduled(event, env, ctx) {
    async function cron() {
      const webhookURL = env.url;
      const message =
        "Total Downloads for this week: " + (await KV.get("total"));
      fetch(webhookURL, {
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
      await KV.put("total", 0);
    }
    ctx.waitUntil(cron());
  },
};
