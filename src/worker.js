export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const splitURL = url.split("?url=")[1];
	var recordedUrl = splitURL.replace("https://github.com/thealiendoctor", "")
	var recordedUrl = recordedUrl.replace("releases/download", "")

    // Record the URL if it is not already recorded in the Worker's storage.
   if (!recordedUrl) {
	 await KV.put(recordedUrl, 1)
   } else {
	let count = await KV.get(recordedUrl)
	await KV.put(recordedUrl, count + 1)
   }

    // Redirect the user to the recorded URL.
    return new Response.redirect(recordedUrl, 301);
  },
};
