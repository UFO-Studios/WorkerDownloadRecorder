# WorkerDownloadRecorder
## A simple cloudflare worker, that records download numbers & page views.
### Install:
-  Clone repo 
- Install dependencies
- Run `wrangler deploy`
- Attach a two KVs to this worker, `WDR` & `WVR` for download records & page views respectively.
 
 ### Usage(Downloads):
 - Change your download links to `https://Your.Worker.workers.dev/reder?url=`GH_Username/Repo?file=RELEASE-NUM/FILENAME.zip<br>
 E.G: download.niceygy.worker.dev/reder?url=niceygylive/niceygylive.xyz?file=1.2.1/setup.exe
 - It will record the download, then redirect the user to github.com/GH_Username/Repo/releases

### Usage(Page Views):
- Add `<link href="https://Your.Worker.workers.dev?page=/path/to/page" rel="prerender" />` to any of your pages.

### Usage (Discord webhook):
- Add a env variable `url` with your discord webhook url.
- Add a cron trigger to the worker, to send the stats to the webhook.