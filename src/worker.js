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

    // Redirect the user to the recorded URL.
    return new Response.redirect(recordedUrl, 301);
  },
};
