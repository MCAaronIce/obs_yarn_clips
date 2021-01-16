const yarnScrapper = require("./yarnScrapper");
const obsEmbedClip = require("./controller");

var waitingForClient = true;
var isNextClipNeeded = false;
var stopRequest = false;
var stopRequestCounter = -1;
var counter = 0;
var isWaitingForRun = true;
var runBody;
const clipsOnOnePage = 28;
const maxLoadingTime = 10; //in seconds
const maxClipTime = 5; //in seconds


obsEmbedClip.events.on('randomClips', async value => {
    stopRunningClips();
    let config = processRequest(value);
    let currentCounter = ++counter;
    let clips = await yarnScrapper.scrapClips(config, Math.floor(config.clAmount / clipsOnOnePage) + 2);
    shuffle(clips);
    clips = clips.slice(0, config.clAmount);
    if (config.prefetching !== undefined) {
        prefetchClips(clips);
        isWaitingForRun = true;
        if(!await waitForRunning(currentCounter)) return;
    }
    for (let i = 0; i < config.clAmount; i++) {
        if (stopLoop(counter, currentCounter)) return;
        let clip = clips[i];
        if (!await playerEventHandler(config, clip, currentCounter)) {
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
    let clips = await yarnScrapper.scrapClips(config, 1);
    shuffle(clips);
    clips = clips.slice(0, 4);
    await runOneClip(config, clips, currentCounter);
});

obsEmbedClip.events.on('topOne', async value => {
    stopRunningClips();
    let config = processRequest(value);
    let currentCounter = ++counter;
    let clips = await yarnScrapper.scrapClips(config, 1);
    clips = clips.slice(0, 4);
    await runOneClip(config, clips, currentCounter);
});

obsEmbedClip.events.on('loop', async value => {
    stopRunningClips();
    let config = processRequest(value);
    let currentCounter = ++counter;
    let clips = await yarnScrapper.scrapClips(config, Math.floor(config.clAmount / clipsOnOnePage) + 1);
    clips = clips.slice(0, value.clAmount);
    let clipsToPrefetch = [];
    for (let i = config.clAmount - 1; i >= 0; i--) {
        clipsToPrefetch.push(clips[i]);
    }
    if (config.prefetching !== undefined) {
        isWaitingForRun = true;
        prefetchClips(clipsToPrefetch);
        if(!await waitForRunning(currentCounter)) return;
    }
    while (true) {
        for (let i = config.clAmount - 1; i >= 0; i--) {
            if (stopLoop(counter, currentCounter)) return;
            if (clips.length < i) {
                stopRunningClips();
                return;
            }
            let clip = clips[i];
            if (!await playerEventHandler(config, clip, currentCounter)) {
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

obsEmbedClip.events.on('run', value => {
    runBody = value;
    isWaitingForRun = false;
})

async function playerEventHandler(config, clip, currentCounter) {
    if (clip === undefined) {
        stopRunningClips()
    } else {
        obsEmbedClip.changeClip(prepareClip(config, clip));
    }
    if (!await waitForStatusChange(currentCounter, config)) return false;
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
        await sleep(50);
    }
    waitingForClient = true;
    return true;
}

async function waitForRunning(currentCounter) {
    while (isWaitingForRun) {
        if ((stopRequest && currentCounter == stopRequestCounter)) {
            return false;
        }
        await sleep(50);
    }
    return true;
}

async function waitUntilNextClipIsNeeded(config) {
    let maxTime = maxWaitingTime(config);
    let currentTime;
    while (!isNextClipNeeded) {
        currentTime = new Date();
        if (currentTime > maxTime) return false;
        await sleep(50);
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
    if (config.type == null) {
        config.type = "all"
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
        type: request.type,
        src: 'https://y.yarn.co/' + clip + '.mp4',
        poster: 'https://y.yarn.co/' + clip + '_screenshot.jpg'
    }
}

function getClipSource(clipId) {
    return 'https://y.yarn.co/' + clipId + '.mp4';
}

function prefetchClips(clipsIds) {
    let clips = [];
    clipsIds.forEach(function (clip) {
        clips.push(getClipSource(clip.replace('/yarn-clip/', '')))
    })
    obsEmbedClip.prefetch(clips);
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function getChosenClip(config) {
    if (config['submit_clip_1.x'] !== undefined) return 0;
    if (config['submit_clip_2.x'] !== undefined) return 1;
    if (config['submit_clip_3.x'] !== undefined) return 2;
    if (config['submit_clip_4.x'] !== undefined) return 3;
    if (config['submit_clip_5.x'] !== undefined) return 4;
    if (config['submit_clip_6.x'] !== undefined) return 5;
    if (config['submit_clip_7.x'] !== undefined) return 6;
    if (config['submit_clip_8.x'] !== undefined) return 7;
    if (config['submit_clip_9.x'] !== undefined) return 8;
    if (config['submit_clip_10.x'] !== undefined) return 9;
    return 0;
}

async function runOneClip(config, clips, currentCounter) {
    let clip;
    isWaitingForRun = true;
    if (config.prefetching !== undefined) {
        prefetchClips(clips);
        if(!await waitForRunning(currentCounter)) return;
        clip = clips[getChosenClip(runBody)];
    } else {
        clip = clips[0];
    }
    await playerEventHandler(config, clip, currentCounter);
    obsEmbedClip.hidePlayer();
}