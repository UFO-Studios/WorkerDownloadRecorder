export default {
  async fetch(request, env, ctx) {
    const url = request.url;
    console.log(url);
    const splitURL = url.split("/reder?url=")[1];
    var recordedUrl = splitURL.replace("https://github.com/thealiendoctor", "");
    var recordedUrl = recordedUrl.replace("releases/download", "");
    console.log(recordedUrl);

    // Record the URL if it is not already recorded in the Worker's storage.
    if (!recordedUrl) {
      await KV.put(recordedUrl, 1);
      console.log(recordedUrl + "added to KV");
    } else {
      let count = await KV.get(recordedUrl);
      await KV.put(recordedUrl, count + 1);
      console.log(recordedUrl + "updated in KV");
    }
    let oldTotal = await KV.get("total");
    await KV.put("total", oldTotal + 1);

    // Redirect the user to the recorded URL.
    return new Response.redirect(recordedUrl, 301);
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
