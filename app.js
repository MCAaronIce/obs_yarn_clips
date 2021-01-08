const yarnScrapper = require("./yarnScrapper");
const obsEmbedClip = require("./controller");

var semaphore = true;
var stopRequest = false;
var stopRequestCounter = -1;
var counter = 0;
const clipsOnOnePage = 28;

obsEmbedClip.events.on('randomClips', async value => {
    stopRunningClips();
    let currentCounter = ++counter;
    let clips = await yarnScrapper.scrapClips(value.phrase, Math.floor(value.clAmount / clipsOnOnePage) + 1);
    shuffleClips(clips);
    for (let i = 0; i < value.clAmount; i++) {
        if (stopLoop(counter, currentCounter)) return;
        let clip = clips.pop()
        obsEmbedClip.changeClip(serveEmbed(clip));
        await waitForLoad(currentCounter);
        await sleep(value.time * 1000);
    }
    obsEmbedClip.hidePlayer();
});

obsEmbedClip.events.on('randomOne', async value => {
    stopRunningClips();
    let currentCounter = ++counter;
    let clips = await yarnScrapper.scrapClips(value.phrase, 1);
    shuffleClips(clips);
    let clip = clips.pop()
    obsEmbedClip.changeClip(serveEmbed(clip));
    if (await waitForLoad(currentCounter)) {
        await sleep(value.time * 1000);
    }
    obsEmbedClip.hidePlayer();
});

obsEmbedClip.events.on('topOne', async value => {
    stopRunningClips();
    let currentCounter = ++counter;
    let clips = await yarnScrapper.scrapClips(value.phrase, 1);
    let clip = clips[0];
    obsEmbedClip.changeClip(serveEmbed(clip));
    if (await waitForLoad(currentCounter)) {
        await sleep(value.time * 1000);
    }
    obsEmbedClip.hidePlayer();
});

obsEmbedClip.events.on('loop', async value => {
    stopRunningClips();
    let currentCounter = ++counter;
    let clips = await yarnScrapper.scrapClips(value.phrase, Math.floor(value.clAmount / clipsOnOnePage) + 1);
    while (true) {
        for (let i = 0; i < value.clAmount; i++) {
            if (stopLoop(counter, currentCounter)) return;
            let clip = clips[i];
            obsEmbedClip.changeClip(serveEmbed(clip));
            if (await waitForLoad(currentCounter)) {
                await sleep(value.time * 1000);
            }
        }
    }
});

async function waitForLoad(currentCounter) {
    while (semaphore) {
        if (stopRequest && currentCounter == stopRequestCounter) {
            semaphore = true;
            return false;
        }
        await sleep(100);
    }
    semaphore = true;
    return true;
}

obsEmbedClip.events.on('clientLoaded', function () {
    semaphore = false;
})

obsEmbedClip.events.on('stop', function () {
    stopRunningClips();
})

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

function shuffleClips(clips) {
    for (let i = 0; i < 5; i++) {
        clips.sort(() => Math.random() - 0.5)
    }
}

function serveEmbed(clip) {
    clip = clip.replace('/yarn-clip/', '');
    return 'https://y.yarn.co/' + clip + '.mp4';
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}