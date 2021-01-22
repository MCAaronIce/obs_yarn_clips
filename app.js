const yarnScrapper = require("./yarnScrapper");
const obsEmbedClip = require("./controller");
const utils = require("./utils");

let waitingForClient = true;
let isNextClipNeeded = false;
let stopRequest = false;
let stopRequestCounter = -1;
let counter = 0;
let isWaitingForRun = true;
let runBody;
const clipsOnOnePage = 28;

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

obsEmbedClip.events.on('randomClips', async requestBody => {
    stopRunningClips();
    if(isNaN(requestBody.clAmount)) requestBody.clAmount = 0;
    let numberOfClipPages = Math.floor(requestBody.clAmount / clipsOnOnePage) + 2;
    let {config, currentCounter, clips} = await setupClips(requestBody, numberOfClipPages);
    utils.shuffle(clips);
    clips = clips.slice(0, config.clAmount);
    if (config.prefetching !== undefined) {
        prefetchClips(clips, config.phrase);
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

obsEmbedClip.events.on('randomOne', async requestBody => {
    stopRunningClips();
    let {config, currentCounter, clips} = await setupClips(requestBody, 1);
    utils.shuffle(clips);
    clips = clips.slice(0, 4);
    await runOneClip(config, clips, currentCounter);
});

obsEmbedClip.events.on('topOne', async requestBody => {
    stopRunningClips();
    let {config, currentCounter, clips} = await setupClips(requestBody, 1);
    clips = clips.slice(0, 4);
    await runOneClip(config, clips, currentCounter);
});

obsEmbedClip.events.on('loop', async requestBody => {
    stopRunningClips();
    if(isNaN(requestBody.clAmount)) requestBody.clAmount = 0;
    let numberOfClipPages = Math.floor(requestBody.clAmount / clipsOnOnePage) + 1;
    let {config, currentCounter, clips} = await setupClips(requestBody, numberOfClipPages);
    clips = clips.slice(0, config.clAmount);
    let clipsToPrefetch = [];
    for (let i = config.clAmount - 1; i >= 0; i--) {
        clipsToPrefetch.push(clips[i]);
    }
    if (config.prefetching !== undefined) {
        isWaitingForRun = true;
        prefetchClips(clipsToPrefetch, config.phrase);
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

async function runOneClip(config, clips, currentCounter) {
    let clip;
    isWaitingForRun = true;
    if (config.prefetching !== undefined) {
        prefetchClips(clips, config.phrase);
        if(!await waitForRunning(currentCounter)) return;
        clip = clips[utils.getChosenClip(runBody)];
    } else {
        clip = clips[0];
    }
    await playerEventHandler(config, clip, currentCounter);
    obsEmbedClip.hidePlayer();
}

async function setupClips(requestBody, numberOfPages) {
    let config = utils.processRequest(requestBody);
    let currentCounter = ++counter;
    let clips = await yarnScrapper.scrapClips(config, numberOfPages);
    return {config, currentCounter, clips};
}

function prefetchClips(clipsIds, phrase) {
    let clips = [];
    clipsIds.forEach(function (clip) {
        clips.push(utils.getClipSource(clip.replace('/yarn-clip/', '')))
    })
    obsEmbedClip.prefetch(clips, phrase);
}

async function playerEventHandler(config, clip, currentCounter) {
    if (clip === undefined) {
        stopRunningClips()
    } else {
        obsEmbedClip.changeClip(utils.prepareClip(config, clip));
    }
    if (!await waitForStatusChange(currentCounter, config)) return false;
    return await waitUntilNextClipIsNeeded(config);

}

async function waitForStatusChange(currentCounter, config) {
    let maxTime = utils.maxWaitingTime(config);
    let currentTime;
    while (waitingForClient) {
        currentTime = new Date();
        if ((stopRequest && currentCounter === stopRequestCounter) || currentTime > maxTime) {
            waitingForClient = true;
            return false;
        }
        await utils.sleep(50);
    }
    waitingForClient = true;
    return true;
}

async function waitForRunning(currentCounter) {
    while (isWaitingForRun) {
        if ((stopRequest && currentCounter === stopRequestCounter)) {
            return false;
        }
        await utils.sleep(50);
    }
    return true;
}

async function waitUntilNextClipIsNeeded(config) {
    let maxTime = utils.maxWaitingTime(config);
    let currentTime;
    while (!isNextClipNeeded) {
        currentTime = new Date();
        if (currentTime > maxTime) return false;
        await utils.sleep(50);
    }
    isNextClipNeeded = false;
    return true;
}

function stopRunningClips() {
    stopRequest = true;
    stopRequestCounter = counter;
}

function stopLoop(counter, currentCounter) {
    if (stopRequest && stopRequestCounter === currentCounter) {
        if (counter === currentCounter) {
            obsEmbedClip.hidePlayer();
        }
        return true;
    }
}