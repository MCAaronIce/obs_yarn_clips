const cheerio = require('cheerio');
const axios = require('axios')

class YarnScrapper {

    constructor() {
    }
    async scrapClips(config, numberOfPages){
        let $;
        let clips= [];
        for (let page = 0; page < numberOfPages; page++) {
            await axios.get(getUrl(config.phrase, config.type, config.searchType, page)).then((response) => {
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

function getUrl(phrase, type, searchType, page){
    let urlBase = 'https://getyarn.io/yarn-find?'
    let phraseEncoded = 'text=' + encodeURI(phrase)
    if(searchType == 'title'){
        phraseEncoded = 'text=' + encodeURI(':"'+phrase+'"')
    } else {
        phraseEncoded = 'text=' + encodeURI(phrase)
    }
    let typeEncoded;
    if(type!=null && type!='all') {
        typeEncoded = '&type=' + type;
    } else {
        typeEncoded = '';
    }
    let pageEncoded = '&p=' + page;
    return urlBase + phraseEncoded + typeEncoded + pageEncoded;
}