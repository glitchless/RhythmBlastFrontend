const PIXI = require('pixi.js');
const GameScene = require('./GameScene.js');

const EventBusClass = require('../utils/EventBus.js');
const EventBus = new EventBusClass;

const PhysicLoop = require('./physics/PhysicLoop.js');

let instance;

class GameManager {
    constructor() {
        if (!instance) {
            this._init();
            instance = this;
        }
        return instance;
    }

    _init() {
        this.physicsObject = {};
        this.scene = new GameScene();
        EventBus.subscribeOn('Win', this.scene.displayWinMessage.bind(this.scene));
    }

    /**
     * @param {Element} field The field in which the game will be rendered.
     */
    setGameField(field) {
        this.scene.field = field;
    }

    /**
     * @param {Number[]} resolution Resolution in which the game will be rendered.
     */
    setResolution(resolution) {
        this.scene.width = resolution[0];
        this.scene.height = resolution[1];
    }

    initiateGame() {
        this.app = new PIXI.Application(this.scene.width, this.scene.height, {backgroundColor: 0xFFFFFF});
        this.scene.field.appendChild(this.app.view);
        this.scene.stage = this.app.stage;

        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.LINEAR;
        this.scene.initBackground(this.app);

        //setTimeout(EventBus.emitEvent.bind(EventBus, 'Win'), 500);
        this.loopObj = new PhysicLoop(this);
        this.loopObj.initTick(this);


    }

    addObject(tag, physicObject) {
        if (!Array.isArray(this.physicsObject[tag])) {
            this.physicsObject[tag] = [];
        }

        this.physicsObject[tag].push(physicObject);

        this.app.stage.addChild(physicObject.sprite);
    }

}

module.exports = GameManager;