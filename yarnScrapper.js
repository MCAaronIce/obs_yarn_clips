const cheerio = require('cheerio');
const axios = require('axios')

class YarnScrapper {

    constructor() {
    }
    async scrapClips(phrase, numberOfPages){
        let $;
        let clips= [];
        for (let page = 1; page <= numberOfPages; page++) {
            await axios.get(getUrl(phrase, page)).then((response) => {
                let html = response.data;
                $ = cheerio.load(html);
                $('.pointer').each(
                    function () {
                        let currClip = $(this).attr('href');
                        if(currClip!=undefined && !clips.includes(currClip) && currClip!='/'){
                            clips.push(currClip);
                        }
                    }
                )
            })
        }
        return clips;
    }
}

module.exports = new YarnScrapper();

function getUrl(phrase, page){
    let urlBase = 'https://getyarn.io/yarn-find?'
    let phraseEncoded = 'text=' + encodeURI(phrase)
    let pageEncoded = '&p=' + page;
    return urlBase + phraseEncoded + pageEncoded;
}