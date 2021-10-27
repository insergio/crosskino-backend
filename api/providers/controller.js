const axios = require('axios');
const puppeteer = require('puppeteer');
const {
	API_KEY,
	TMDB_API,
	LETTERBOXD_SITE
} = process.env
async function index(req, res) {

	let {
		query: {
			user,
			list,
			country,
			providers = [] 
		}
	} = req;

	if (!user || !list || !country || providers == []) {
		return res.status(500).send(
			"Must pass users, list and country parameters"
		)
	}

	const providerData = [
		{
			id: 1,
			label: 'Netflix',
			provider_id: 8
		},
		{
			id: 2,
			label: 'Amazon Prime Video',
			provider_id: 119
		},
		{
			id: 3,
			label: 'Disney+',
			provider_id: 337
		},
		{
			id: 4,
			label: 'Claro Video',
			provider_id: 167
		},
		{
			id: 5,
			label: 'HBO Go',
			provider_id: 31
		},
		{
			id: 6,
			label: 'Movistar Play',
			provider_id: 339
		}
	]

	try {

		const scrapLetterboxd = async () => {
			let filmTitles = []
			const browser = await puppeteer.launch();
			const page = await browser.newPage();

			let url = LETTERBOXD_SITE+user+'/watchlist/'

			console.log(url)

			async function retry(promiseFactory, retryCount) {
				try {
				  return await promiseFactory();
				} catch (error) {
				  if (retryCount <= 0) {
					throw error;
				  }
				  return await retry(promiseFactory, retryCount - 1);
				}
			}

			await retry(
				() => page.goto(url, {
					waitUntil: 'networkidle0',
				}),
				5 // retry this 5 times
			);

			const pageTitles =  async (pageNumber) => {

				try{
					await retry(
						() => page.goto(url+'page/'+pageNumber, {
							waitUntil: 'networkidle0',
						}),
						5 // retry this 5 times
					);
	
					let titleSelectors = await page.$$('.frame-title')
					
					let titles = []
					
					for (let i = 0; i < titleSelectors.length; i++) {
						const element = titleSelectors[i];
						let value = await page.evaluate(el => el.textContent, element)
						titles.push(value)	
					}
					return titles
				}catch(e){
					console.log(e)
					return []
				}

			};


			try {
				await page.waitForSelector('.paginate-page', {timeout: 1000 }); // 5s timeout
				let pageSelectors = await page.$$('.paginate-page')
				let maxPage = await page.evaluate(el => el.textContent, pageSelectors[pageSelectors.length-1])
				console.log(maxPage)


				let titles = []
				for (let i = 1; i <= maxPage; i++) {
					console.log("entra")
					let chunk = await pageTitles(i)
					titles.push(...chunk)
				}

				filmTitles = titles
				browser.close()

			} catch (e) {
			   filmTitles = await pageTitles(1)
			   browser.close()
			}
			
			return filmTitles
			
		}


		const getFilmData = async (name) => {

			let year = name.match(/\([^()]+\)(?=[^()]*$)/)[0].replace(/[{()}]/g, '')  //get text between last set of parenthesis and then remove the parenthesis
			let title = name.replace(/\([^()]+\)(?=[^()]*$)/, "") // get text without the text between parenthesis

			const resp = await axios.get(TMDB_API+'search/movie', {
				params: {
					language: 'en-US',
					api_key: API_KEY,
					query: title,
					year: year //remove parenthesis from year string
				}
			});
			//console.log(resp.data)
			let response = resp.data
			if(response.results && response.results[0]){
				return response.results[0]
			}else{
				return null
			}
		}

		const getFilmProviders = async (filmId) =>{
			const resp = await axios.get(TMDB_API+'/movie/'+filmId+'/watch/providers', {
				params: {
					api_key: API_KEY,
				}
			})
			//console.log(resp)
			let response = resp.data
			if(response.results && response.results[country]){
				console.log(response.results[country].flatrate)
				return response.results[country].flatrate
			}else{
				return null
			}

		}

		const films = await scrapLetterboxd()
		console.log(films)

		let providersObj = JSON.parse(providers)
		let crossedFilms = []

		providersObj.forEach(element => {
			crossedFilms.push({ id: element, films: [] })	
		});

		for (let i = 0; i < films.length; i++) {
			const element = films[i];
			console.log(element)
			const filmData = await getFilmData(element)
			if(filmData){
				const filmProviders = await getFilmProviders(filmData.id)
				console.log(filmData)
	
				console.log(filmProviders)
				if(filmProviders){
					filmProviders.forEach(provider => {
						let found = crossedFilms.find(el => el.id == provider.provider_id)
						found && found.films.push(filmData);
					})
				}
				console.log(crossedFilms)
			}
		}

		//getFilmData("fantastic mr fox (2009)")

		//getFilmProviders(10315)

		return res.status(200).send(
			crossedFilms
		);
	} catch (error) {
		console.error(error);
		return res.status(500).send({ message: error.message });
	}
}

module.exports = {
	index
};
