module.exports = {
    getChosenClip : (config) => {
        for (let i = 0; i < 10; i++) {
            if (config['submit_clip_'+(i+1)+'.x'] !== undefined) return i;
        }
        return 0;
    },
    sleep : (ms) => {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    },
    getClipSource : (clipId) => {
        return 'https://y.yarn.co/' + clipId + '.mp4';
    },
    prepareClip : (request, clip) => {
        clip = clip.replace('/yarn-clip/', '');
        return {
            timerType: request.timerType,
            time: request.time,
            type: request.type,
            src: 'https://y.yarn.co/' + clip + '.mp4',
            poster: 'https://y.yarn.co/' + clip + '_screenshot.jpg'
        }
    },
    processRequest : (request) => {
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
    },
    shuffle : (array) => { //https://github.com/Daplie/knuth-shuffle
        var currentIndex = array.length, temporaryValue, randomIndex;

        while (0 !== currentIndex) {

            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    },
    maxWaitingTime : (config) => {
    const maxLoadingTime = 10; //in seconds
    const maxClipTime = 5; //in seconds
    let maxTime = new Date();
    let secondsToTimeout;
    if (config.timerType === 'time') {
        secondsToTimeout = config.time + maxLoadingTime;
    } else {
        secondsToTimeout = config.time * maxClipTime + maxLoadingTime;
    }
    maxTime = new Date(maxTime.getTime() + secondsToTimeout * 1000);
    return maxTime;
}
}