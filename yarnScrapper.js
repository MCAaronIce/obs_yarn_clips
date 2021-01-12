const cheerio = require('cheerio');
const axios = require('axios')

class YarnScrapper {

    constructor() {
    }
    async scrapClips(phrase, type, numberOfPages){
        let $;
        let clips= [];
        for (let page = 0; page < numberOfPages; page++) {
            await axios.get(getUrl(phrase, type, page)).then((response) => {
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

function getUrl(phrase, type, page){
    let urlBase = 'https://getyarn.io/yarn-find?'
    let phraseEncoded = 'text=' + encodeURI(phrase)
    let typeEncoded;
    if(type!=null || type!=='all') {
        typeEncoded = '&type=' + type;
    } else {
        typeEncoded = '';
    }
    let pageEncoded = '&p=' + page;
    return urlBase + phraseEncoded + typeEncoded + pageEncoded;
}