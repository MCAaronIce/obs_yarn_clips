const yarnScrapper = require("./yarnScrapper");
const obsEmbedClip = require("./controller");

var waitingForClient = true;
var isNextClipNeeded = false;
var stopRequest = false;
var stopRequestCounter = -1;
var counter = 0;
const clipsOnOnePage = 28;
const maxLoadingTime = 15; //in seconds
const maxClipTime = 5; //in seconds


obsEmbedClip.events.on('randomClips', async value => {
    stopRunningClips();
    let config = processRequest(value);
    let currentCounter = ++counter;
    let clips = await yarnScrapper.scrapClips(value.phrase, Math.floor(value.clAmount / clipsOnOnePage) + 2);
    shuffle(clips);
    clips = clips.slice(0, value.clAmount);
    prefetchClips(clips);
    for (let i = 0; i < config.clAmount; i++) {
        if (stopLoop(counter, currentCounter)) return;
        let clip = clips.pop()
        if(!await playerEventHandler(config, clip, currentCounter)) {
            obsEmbedClip.hidePlayer();
            return false;
        }
    }
    obsEmbedClip.hidePlayer();
});

obsEmbedClip.events.on('randomOne', async value => {
    stopRunningClips();
    let config = processRequest(value);
    let currentCounter = ++counter;
    let clips = await yarnScrapper.scrapClips(config.phrase, 1);
    shuffle(clips);
    let clip = clips.pop()
    await playerEventHandler(config, clip, currentCounter);
    obsEmbedClip.hidePlayer();
});

obsEmbedClip.events.on('topOne', async value => {
    stopRunningClips();
    let config = processRequest(value);
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
    clips = clips.slice(0, value.clAmount);
    prefetchClips(clips);
    while (true) {
        for (let i = config.clAmount-1; i >= 0; i--) {
            if (stopLoop(counter, currentCounter)) return;
            let clip = clips[i];
            if(!await playerEventHandler(config, clip, currentCounter)) {
                obsEmbedClip.hidePlayer();
                return false;
            }
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
    if(!await waitForStatusChange(currentCounter, config)) return false;
    return await waitUntilNextClipIsNeeded(config);

}

function maxWaitingTime(config) {
    let maxTime = new Date();
    let secondsToTimeout;
    if (config.timerType == 'time') {
        secondsToTimeout = config.time + maxLoadingTime;
    } else {
        secondsToTimeout = config.time * maxClipTime + maxLoadingTime;
    }
    maxTime = new Date(maxTime.getTime() + secondsToTimeout * 1000);
    return maxTime;
}

async function waitForStatusChange(currentCounter, config) {
    let maxTime = maxWaitingTime(config);
    let currentTime;
    while (waitingForClient) {
        currentTime = new Date();
        if ((stopRequest && currentCounter == stopRequestCounter) || currentTime > maxTime) {
            waitingForClient = true;
            return false;
        }
        await sleep(200);
    }
    waitingForClient = true;
    return true;
}

async function waitUntilNextClipIsNeeded(config) {
    let maxTime = maxWaitingTime(config);
    let currentTime;
    while (!isNextClipNeeded) {
        currentTime = new Date();
        if(currentTime > maxTime) return false;
        await sleep(100);
    }
    isNextClipNeeded = false;
    return true;
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

function getClipSource(clipId){
    return 'https://y.yarn.co/' + clipId + '.mp4';
}

function prefetchClips(clipsIds){
    let clips=[];
    clipsIds.forEach(function(clip){
        clips.push(getClipSource(clip.replace('/yarn-clip/', '')))
    })
    obsEmbedClip.prefetch(clips);
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
