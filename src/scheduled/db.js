export default async function archiveData(env, repos, counts) {
	const DB = env.DB;
	// SQL DB, repo: string, count: string
	let date = new Date();
	for (var i = 0; i < repos.length; i++) {
		console.log(`Inserting ${repos[i]}: ${counts[i]} into the database`);
		await DB.exec(
			`INSERT INTO download (date, repo, count) VALUES ('${date}', '${repos[i]}', '${counts[i]}')`
		);
	}
}
