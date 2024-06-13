# WorkerDownloadRecorder
## A simple cloudflare worker, that records download numbers & page views.
### Install:
-  Download the worker.js
- Create a [new worker.](https://developers.cloudflare.com/workers/get-started/guide/#get-started-in-the-dashboard)
- Select "Edit in browser" or "edit".
- Paste the code from worker.js into the edit box, and deploy
- Attach a two KVs to this worker, `WDR` & `WVR` for download records & page views respectively. (These can be found under the variables tab)
- Add a variable named `url` with a discord webhook.
 
 ### Usage (Downloads):
 - Change your download links to `https://Your.Worker.workers.dev/reder?url=GH_Username/Repo?file=Release_Number/File_Name.ext`	<br>
- Change GH_Username, Repo, Release_Number & File_Name.ext <br>
 (E.G: `download.niceygy.worker.dev/reder?url=niceygylive/niceygylive.xyz?file=1.2.1/setup.exe`)
 - It will record the download, then redirect the user to `github.com/GH_Username/Repo/releases/Release_Number/File_Name.ext`

### Usage (Page Views):
- Add `<link href="https://Your.Worker.workers.dev?page=/path/to/page" rel="prerender" />` to any of your pages. This will send a single request to the worker on page load, which then records it.
E.G: `https://Your.Worker.workers.dev?page=/downloads/download-recorder`


### Usage (Discord webhook):
- Add a env variable `url` with your discord webhook url.
- Add a cron trigger to the worker, to send the stats to the webhook.
