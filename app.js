const yarnScrapper = require("./yarnScrapper");
const obsEmbedClip = require("./controller");

var waitingForClient = true;
var isNextClipNeeded = false;
var stopRequest = false;
var stopRequestCounter = -1;
var counter = 0;
const clipsOnOnePage = 28;


obsEmbedClip.events.on('randomClips', async value => {
    stopRunningClips();
    let currentCounter = ++counter;
    let clips = await yarnScrapper.scrapClips(value.phrase, Math.floor(value.clAmount / clipsOnOnePage) + 2);
    shuffle(clips);
    for (let i = 0; i < value.clAmount; i++) {
        if (stopLoop(counter, currentCounter)) return;
        let clip = clips.pop()
        await playerEventHandler(value, clip, currentCounter);
    }
    obsEmbedClip.hidePlayer();
});

obsEmbedClip.events.on('randomOne', async value => {
    let config = processRequest(value);
    stopRunningClips();
    let currentCounter = ++counter;
    let clips = await yarnScrapper.scrapClips(config.phrase, 1);
    shuffle(clips);
    let clip = clips.pop()
    await playerEventHandler(config, clip, currentCounter);
    obsEmbedClip.hidePlayer();
});

obsEmbedClip.events.on('topOne', async value => {
    let config = processRequest(value);
    stopRunningClips();
    let currentCounter = ++counter;
    let clips = await yarnScrapper.scrapClips(config.phrase, 1);
    let clip = clips[0];
    await playerEventHandler(config, clip, currentCounter);
    obsEmbedClip.hidePlayer();
});

obsEmbedClip.events.on('loop', async value => {
    stopRunningClips();
    let config = processRequest(value);
    let currentCounter = ++counter;
    let clips = await yarnScrapper.scrapClips(value.phrase, Math.floor(config.clAmount / clipsOnOnePage) + 1);
    while (true) {
        for (let i = 0; i < config.clAmount; i++) {
            if (stopLoop(counter, currentCounter)) return;
            let clip = clips[i];
            await playerEventHandler(config, clip, currentCounter);
        }
    }
});


obsEmbedClip.events.on('clientLoaded', function () {
    waitingForClient = false;
})

obsEmbedClip.events.on('nextClip', function () {
    isNextClipNeeded = true;
})

obsEmbedClip.events.on('stop', function () {
    stopRunningClips();
})

async function playerEventHandler(config, clip, currentCounter) {
    obsEmbedClip.changeClip(prepareClip(config, clip));
    await waitForStatusChange(currentCounter);
    await waitUntilNextClipIsNeeded();
}

async function waitForStatusChange(currentCounter) {
    while (waitingForClient) {
        if (stopRequest && currentCounter == stopRequestCounter) {
            waitingForClient = true;
            return false;
        }
        await sleep(100);
    }
    waitingForClient = true;
    return true;
}

async function waitUntilNextClipIsNeeded() {
    while (!isNextClipNeeded) {
        await sleep(100);
    }
    isNextClipNeeded = false;
}

function stopRunningClips() {
    stopRequest = true;
    stopRequestCounter = counter;
}

function stopLoop(counter, currentCounter) {
    if (stopRequest && stopRequestCounter == currentCounter) {
        if (counter == currentCounter) {
            obsEmbedClip.hidePlayer();
        }
        return true;
    }
}

// shuffle source: https://github.com/Daplie/knuth-shuffle
function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    while (0 !== currentIndex) {

        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

function processRequest(request) {
    let config = request;
    if (config.phrase == null) {
        config.phrase = ""
    }
    if (config.clAmount == null) {
        config.clAmount = "1"
    }
    if (config.time == null) {
        config.time = "3"
    }
    return config;
}

function prepareClip(request, clip) {
    clip = clip.replace('/yarn-clip/', '');
    return {
        timerType: request.timerType,
        time: request.time,
        src: 'https://y.yarn.co/' + clip + '.mp4',
        poster: 'https://y.yarn.co/' + clip + '_screenshot.jpg'
    }
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
