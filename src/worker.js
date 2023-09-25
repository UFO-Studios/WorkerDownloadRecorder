export default {
  async fetch(request, env, ctx) {
    console.log("Worker is running...")
    const url = request.url;
    if (url.includes("favicon.ico")) {
      return new Response(null, { status: 404 });
    }
    const KV = env.KV;
    console.log(url);
    const splitURL = url.split("/reder?url=")[1];
    var recordedUrl = "";
    if (splitURL) {
      recordedUrl = splitURL.replace("https://github.com/thealiendoctor", "");
      recordedUrl = recordedUrl.replace("releases/download", "");
    }
    console.log(recordedUrl);

    var oldNum = await KV.get(recordedUrl);
    // Record the URL if it is not already recorded in the Worker's storage.
    if (oldNum / oldNum != 1) {
      console.log("Not found in KV")
      await KV.put(recordedUrl, 1);
      console.log(recordedUrl + " added to KV");
    } else {
      console.log("Found in KV")
      var newCount = oldNum*1+1;
      //var newCount = oldNum + 1;
      console.log(recordedUrl + " has " + newCount + " downloads");
      await KV.put(recordedUrl, newCount);
      console.log(recordedUrl + " updated in KV");
    }

    let oldTotal = await KV.get("total");
    await KV.put("total", oldTotal*1+1);

    // Redirect the user to the recorded URL.
    return new /*Response("Hello world " + recordedUrl)*/  Response.redirect("https://"+recordedUrl, 301);
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
