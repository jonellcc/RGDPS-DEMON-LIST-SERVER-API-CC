const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const port = 3000;

async function scrapeData(url) {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const results = [];

        $('.level-card').each((_, element) => {
            const rank = $(element).find('.rank').text().trim();
            const levelName = $(element).find('.level-name').text().trim();
            const levelCreator = $(element).find('.level-creator').text().replace('by ', '').trim();
            const difficulty = $(element).find('.level-stats .stat').first().text().trim();
            const youtubeLink = $(element).find('.video-btn').attr('href') || 'No link available';

            results.push({
                Rank: rank,
                'Level Name': levelName,
                'Level Creator': levelCreator,
                Difficulty: difficulty,
                YouTube: youtubeLink,
            });
        });

        return results;
    } catch (error) {
        console.error('Error fetching or parsing data:', error.message);
        return { error: 'Unable to fetch data' };
    }
}

async function getAIReport(prompt) {
    try {
        const { data } = await axios.get(`https://ccprojectapis.ddns.net/api/gptconvo?ask=${encodeURIComponent(prompt)}&id=400`);
        return data;
    } catch (error) {
        console.error('Error fetching AI report:', error.message);
        return 'Unable to generate AI report';
    }
}

async function createReportPrompt(endpoint, scrapedData) {
    const numberOfLevels = scrapedData.length;
    const promptLevels = scrapedData.map(level => `Level ${level['Level Name']} at Rank ${level.Rank} (${level.Difficulty})`).join(', ');

    let description = '';
    if (endpoint === '/api/demon') {
        description = `Demon List of RGDPS: Featuring the hardest and most challenging levels.`;
    } else if (endpoint === '/api/demonf') {
        description = `Future Demon List of RGDPS: Highlighting upcoming and unverified levels.`;
    } else if (endpoint === '/api/challenge') {
        description = `Challenge Demon List of RGDPS: Not-yet-verified, high-difficulty community challenges.`;
    }

    const prompt = `Analyze shortest response your response analyze don't more words and the following data as an AI Demon List Analyzer. ${description} Here is the data: ${promptLevels}. Provide insights into ranks and changes.`;

    const aiReport = await getAIReport(prompt);

    return {
        description: description,
        report: aiReport
    };
}

app.get('/api/demon', async (req, res) => {
    const url = 'https://rgdpslists.xyz/lists/demon';
    const scrapedData = await scrapeData(url);
    const report = await createReportPrompt('/api/demon', scrapedData);
    res.json({ data: scrapedData, report: report.report, description: report.description });
});

app.get('/api/demonf', async (req, res) => {
    const url = 'https://rgdpslists.xyz/lists/future-demons';
    const scrapedData = await scrapeData(url);
    const report = await createReportPrompt('/api/demonf', scrapedData);
    res.json({ data: scrapedData, report: report.report, description: report.description });
});

app.get('/api/challenge', async (req, res) => {
    const url = 'https://rgdpslists.xyz/lists/challenge/';
    const scrapedData = await scrapeData(url);
    const report = await createReportPrompt('/api/challenge', scrapedData);
    res.json({ data: scrapedData, report: report.report, description: report.description });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
