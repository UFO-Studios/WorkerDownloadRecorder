import sendMessageToDiscord from "./weeklyMessage.js";

/**
 * Creates a chart of the hightest 5 repos and sends it to the discord channel.
 * @param {string} input The raw repo data
 * @param {object} env The ENV object
 */
export async function chart(input, env) {
	var arr = input.toString().split('\n');
	var repos = [];
	var counts = [];
	for (var i = 0; i < arr.length; i++) {
		if (arr[i].includes(',')) {
			var temp = arr[i].split(',');
			repos.push(temp[0].toString().split('Repo: ')[1].replace('TheAlienDoctor/', ''));
			counts.push(temp[1].toString().split('Count: ')[1]);
		}
	}
	console.log(repos);
	console.log(counts);
	var chartJSON = {
		type: 'bar', // Show a bar chart
		data: {
			labels: repos, // Set X-axis labels
			datasets: [
				{
					label: 'Counts', // Create the 'Users' dataset
					data: counts, // Add data to the chart
				},
			],
		},
	};
	var chartUrl = 'https://quickchart.io/chart?c=' + /*Turn the JSON to string, then encode it to a URI*/ encodeURIComponent(JSON.stringify(chartJSON));
	await sendMessageToDiscord(chartUrl, env);
}
