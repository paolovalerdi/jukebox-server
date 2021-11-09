const express = require('express');
const app = express();
const port = 3000;
const cheerio = require('cheerio');
const axios = require('axios');
const apiKey = "f8b2828b565ec17217b06f000b1f131d";
const baseUrl = `https://ws.audioscrobbler.com/2.0/?format=json&autocorrect=1&lang=es&api_key=${apiKey}&method=artist.getinfo&artist=`;
const baseUrl2 = `https://ws.audioscrobbler.com/2.0/?format=json&autocorrect=1&lang=es&api_key=${apiKey}&method=artist.getTopAlbums&artist=`;

app.use(express.json());

app.post('/artist', async (req, res) => {
    try {
        const url = `https://www.last.fm/music/${req.body.name}` 
        const request = await axios.get(url);
        const $ = cheerio.load(request.data);
        const tracks = $(".chartlist-row").map((_, element) => {
            try {
                const selector = cheerio.load(element);
                const track = {
                    url: selector("a.chartlist-play-button").attr("href"),
                    title: selector("td.chartlist-name > a").text().trim(),
                    img: selector("a.cover-art > img").attr("src").replace("64s", "500x500"),
                    listeners: parseInt(selector("span.chartlist-count-bar-value").text().replace("listeners", "").replace(",", "").trim())
                };
                return track;
            } catch (e) {
                return null;
            }
        }).filter((e) => e !== null).get();

        const info = await axios.get(`${baseUrl}${req.body.name}`);
        const albums = await axios.get(`${baseUrl2}${req.body.name}`);
        
        const similar = await axios.get(`https://www.last.fm/es/music/${req.body.name}/+similar`);
        const selector2 = cheerio.load(similar.data);
        const similarArtists = selector2(".similar-artists-item").map((_, element) => {
            const iwannadie = cheerio.load(element);
            return {
                name: iwannadie(".similar-artists-item-name").text().trim(),
                img: iwannadie("img").attr("src")
            }
        }).get();
        
        const artist = {
            name: $('h1[itemprop="name"]').text(),
            img: $('meta[name="twitter:image"]').attr("content"),
            tracks: tracks,
            bio: info.data.artist.bio.content,
            tags: info.data.artist.tags.tag,
            similar: similarArtists,
            albums: albums.data.topalbums.album.map((element) => {
                return {
                    title: element.name,
                    playcount: element.playcount,
                    url: element.url,
                    img: element.image[0]["#text"].replace("34s", "300x300")
                }
            }).slice(0, 10)
        };
        res.status(200).json(artist);
    } catch (e) {
        console.log(e);
        res.status(500).json({ error: e });
    }
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
});

