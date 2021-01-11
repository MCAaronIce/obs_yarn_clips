const http = require('http');
const EventEmitter = require('events');
const express = require('express');
const socketio = require('socket.io');

class Controller {
    _port
    _app
    _server
    _io
    _events
    _socket

    constructor() {
        this.port = process.env.PORT || 8000;
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketio(this.server);
        this.app.use(express.urlencoded({
            extended: true
        }))
        this.loaded = this.loaded.bind(this);
        this.nextClip = this.nextClip.bind(this);
        this.app.use(express.static('overlay'));
        this.app.use('/panel', express.static('panel'));
        this.app.use('/randomOne', (req, res) => this.randomOne(req, res))
        this.app.use('/topResult', (req, res) => this.topOne(req, res))
        this.app.use('/randomClips', (req, res) => this.randomClips(req, res))
        this.app.use('/loop', (req, res) => this.loop(req, res))
        this.app.use('/stop', (req, res) => this.stop(req, res))
        this.app.use('/stretch', (req, res) => this.stretch(req, res))
        this.events = new EventEmitter();
        this.setWebsocketEvents(this.loaded, this.nextClip);
        this.server.listen(this.port, () => console.log(`Listening on port ${this.port}`));
    }


    setWebsocketEvents(loadedHandler, nextClipHandler) {
        this.io.on('connect', socket => {
            this.events.on('changeClip', clip => {
                socket.emit('changeClip', clip)
            });
            this.events.on('prefetch', clips => {
                socket.emit('prefetch', clips)
            });
            this.events.on('hide', function () {
                socket.emit('hide')
            });
            this.events.on('show', function () {
                socket.emit('show')
            });
            this.events.on('stop', function () {
                socket.emit('stop')
            });
            this.events.on('stretch', function () {
                socket.emit('stretch')
            });
            socket.on('loaded', function () {
                loadedHandler();
            });
            socket.on('nextClip', function () {
                nextClipHandler();
            });
        });
    }

    changeClip(clip) {
        this._events.emit('changeClip', clip);
    }

    prefetch(clips) {
        this._events.emit('prefetch', clips);
    }

    loaded() {
        this._events.emit('clientLoaded');
    }

    nextClip() {
        this._events.emit('nextClip');
    }

    showPlayer() {
        this._events.emit('show');
    }

    hidePlayer() {
        this._events.emit('hide');
    }

    randomOne(req, res) {
        this._events.emit('randomOne', req.body);
        res.status(204).send();
    }

    topOne(req, res) {
        this._events.emit('topOne', req.body);
        res.status(204).send();
    }

    randomClips(req, res) {
        this._events.emit('randomClips', req.body);
        res.status(204).send();
    }

    loop(req, res) {
        this._events.emit('loop', req.body);
        res.status(204).send();
    }

    stop(req, res) {
        this._events.emit('stop', req.body);
        res.status(204).send();
    }

    stretch(req, res) {
        this._events.emit('stretch');
        res.status(204).send();
    }

    get port() {
        return this._port;
    }

    set port(value) {
        this._port = value;
    }

    get app() {
        return this._app;
    }

    set app(value) {
        this._app = value;
    }

    get server() {
        return this._server;
    }

    set server(value) {
        this._server = value;
    }

    get io() {
        return this._io;
    }

    set io(value) {
        this._io = value;
    }

    get events() {
        return this._events;
    }

    set events(value) {
        this._events = value;
    }


    get socket() {
        return this._socket;
    }

    set socket(value) {
        this._socket = value;
    }

}

module.exports = new Controller();