import * as kt from 'kotlinApp';
import Constants from '../../utils/Constants';
import EventBus from '../GameEventBus';
import GameScene from '../GameScene';
import GameStrategy from './GameStrategy';

import ForceField from '../physics/object/ForceField';
import Platform from '../physics/object/Platform';
import Point from '../physics/object/primitive/Point';

import Laser from '../physics/object/Laser';
import Player from '../Player';

import * as shield_gui_background_png from '../../ui/images/shield_gui_background.png';
import * as shield_gui_status_png from '../../ui/images/shield_gui_status.png';
import {Direction} from '../physics/object/Direction';

const checkCollision = kt.ru.glitchless.game.collision.checkCollision;

const forceFieldBarTexture = PIXI.Texture.fromImage(shield_gui_status_png);
const forceFieldBarBackgroundTexture = PIXI.Texture.fromImage(shield_gui_background_png);

export default class SinglePlayerStrategy extends GameStrategy {
    public players: Player[];
    public forceFieldBarPos: Point[];
    public forceFieldBars: PIXI.Sprite[];
    public botPlatform: Platform;
    private laserDamage: number;
    private scene: GameScene;
    private anglePoints = [new Point(0.1, -0.05), new Point(0, -0.1), new Point(0.05, -0.1), new Point(0.1, -0.1),
        new Point(0.1, -0.05), new Point(0.1, 0), new Point(0.1, 0.05), new Point(0.1, 0.1)];
    private angleCounter = 0;
    private counter = 0;

    constructor(scene) {
        super();
        this.players = [new Player(0), new Player(1)];
        const marginX = 100;
        const marginY = Constants.INITIAL_RES[1] / 2 + Constants.GAME_FORCEFIELD_BAR_SIZE[1] / 2;

        const forceFieldBarPos1 = new Point(marginX, marginY);
        const forceFieldBarPos2 = new Point(Constants.INITIAL_RES[0] - marginX + Constants.GAME_FORCEFIELD_BAR_SIZE[0],
            marginY);

        this.forceFieldBarPos = [forceFieldBarPos1, forceFieldBarPos2];
        this.forceFieldBars = [];
        this.laserDamage = 20;
        this.scene = scene;
    }

    public initUI(physicContext) {
        this._drawForceFieldBars(this.scene);

        physicContext.spriteStorage.needUpdatePlatorm.push(physicContext.spriteStorage.userPlatform);
        physicContext.spriteStorage.needUpdatePlatorm.push(physicContext.spriteStorage.enemyPlatform);

        this.scene.initScores();
    }

    public gameplayTick(physicContext, elapsedMS: number) {
        this.processBotLogic(physicContext);
        this.replenishShields(physicContext, elapsedMS);
        this.processLaserCreate(physicContext, elapsedMS);
        this.processControls(physicContext, physicContext.spriteStorage.userPlatform);
    }

    public onForceFieldDepletion(forcefield: ForceField) {
        const playerNum = forcefield.playerNumber;
        const player = this.players[playerNum];
        const oldShieldValue = player.shield;

        let newShieldValue = player.shield - this.laserDamage;

        if (newShieldValue <= 0) {
            newShieldValue = 0;
            forcefield.onChargeEnd();
        }
        player.shield = newShieldValue;

        this.updateBar(playerNum, (newShieldValue / player.maxShield) * 100);
    }

    /*
    * @param {[HealthBlock, Laser]} blockAndLaser hpblock and laser that hit it,
    *    mashed into one array because of EventBus argument providing scheme
    */
    public onHpLoss(blockAndLaser) {
        const hpblock = blockAndLaser[0];
        const laser = blockAndLaser[1];
        const playerNum = hpblock.playerNumber;

        hpblock.destroy();

        if (Constants.GAME_DEBUG) {
            console.log(playerNum);
        }

        const player = this.players[playerNum];
        player.health -= 1;

        if (laser.reflected && laser.lastReflectedBy !== playerNum) {
            this.givePoints(laser.lastReflectedBy, Constants.POINTS_HP_HIT);
        }

        if (Constants.GAME_DEBUG) {
            console.log(player);
        }

        if (player.health === 0) {
            this.onGameEnd(playerNum);
        }
    }

    public updateBar(num: number, percent: number) {
        this.forceFieldBars[num].height = this.scene.scaleLength(Constants.GAME_FORCEFIELD_BAR_SIZE[1]) * percent / 100;
    }

    public onGameEnd(loser: number) {
        const winner = (loser + 1) % 2;
        console.log(winner);
        EventBus.emitEvent('player_won', winner);
    }

    private givePoints(playerNum, points: number) {
        this.players[playerNum].score += points;
        this.scene.setScore(playerNum, this.players[playerNum].score);
    }

    private _drawForceFieldBars(scene) {
        this.forceFieldBarPos.forEach(function (position) {
            const forceFieldBar = new PIXI.Sprite(forceFieldBarTexture);
            const forceFieldBarBackground = new PIXI.Sprite(forceFieldBarBackgroundTexture);
            forceFieldBar.anchor.set(1);
            forceFieldBarBackground.anchor.set(1);

            scene.addObject(forceFieldBarBackground);
            scene.setSize(forceFieldBarBackground, Constants.GAME_FORCEFIELD_BAR_SIZE);
            scene.setCoords(forceFieldBarBackground, position);

            scene.setSize(forceFieldBar, Constants.GAME_FORCEFIELD_BAR_SIZE);
            scene.setCoords(forceFieldBar, position);
            scene.addObject(forceFieldBar);
            this.forceFieldBars.push(forceFieldBar);
        }.bind(this));
    }

    private processControls(context, platform) {
        platform.setMoveDirection(this.getPlatformDirection());
    }

    private processBotLogic(physicContext) {
        const enemyPlatform = physicContext.spriteStorage.enemyPlatform;
        const lasers = physicContext.physicObjects.laser;
        const forcefield = physicContext.physicObjects.forcefield[1];
        const platformCoords = enemyPlatform.getCoords().copy();
        const mapCenter = physicContext._getCenterPoint();
        const platformRotation = enemyPlatform.getRotation();
        if (platformRotation < 90 || platformRotation > 358) {
            enemyPlatform.setMoveDirection(Direction.RIGHT);
            return;
        }
        if (platformRotation < 181) {
            enemyPlatform.setMoveDirection(Direction.LEFT);
            return;
        }

        let minDistance = Infinity;
        let closestLaser;
        let dangerPoint;
        lasers.forEach((laser) => {
            const collision = checkCollision(
                laser.getCoords(), laser.getSpeed(), forcefield.collisionArc,
                0, false, true);
            if (!collision) {
                return; // Laser is not going to hit our half of the field, no need to worry
            }
            const laserCoords = collision[0];
            const distance = laserCoords.copy()
                .apply(-platformCoords.x, -platformCoords.y)
                .getLength();

            if (distance >= minDistance) {
                return; // We have more sudden threats to worry about
            }

            minDistance = distance;
            closestLaser = laser;
            dangerPoint = collision[0];
        });

        if (!closestLaser) {
            enemyPlatform.setMoveDirection(Direction.NONE);
            return; // No lasers are going for our half of the field, who are we to complain? Just chillax.
        }

        if (Math.abs(dangerPoint.y - platformCoords.y) < Constants.GAME_PLATFORM_SIZE[0] / 4) {
            enemyPlatform.setMoveDirection(Direction.NONE);
            return;
        }

        if (Math.random() < Constants.BOT_ERROR_RATE) {
            return;
        }

        if (dangerPoint.y > platformCoords.y) {
            enemyPlatform.setMoveDirection(Direction.LEFT);
        } else {
            enemyPlatform.setMoveDirection(Direction.RIGHT);
        }
    }

    private replenishShields(physicContext, elapsedMS: number) {
        this.players.forEach(function (player, playerNum) {
            const newShieldVal = player.shield + Constants.SHIELD_REGEN_RATIO * elapsedMS / 1000;
            player.shield = newShieldVal < player.maxShield ? newShieldVal : player.maxShield;
            this.updateBar(playerNum, (player.shield / player.maxShield) * 100);
            if (player.shield / player.maxShield > Constants.SHIELD_ACTIVATION_PERCENT / 100) {
                physicContext.physicObjects.forcefield[playerNum].onEnable();
            }
        }, this);
    }

    private processLaserCreate(physicContext, elapsedMS: number) {
        const hardness = this.players.map((p) => 5 - p.health).reduce((a, b) => a + b);
        this.counter += elapsedMS;
        if (this.counter > 800 - hardness * 40) {
            this.counter = 0;
            const laserSpeed = this.anglePoints[this.angleCounter % this.anglePoints.length].mult(-1).copy().mult(-4);
            const laser = new Laser(physicContext);
            laser.setCoords(physicContext._getCenterPoint(), physicContext);
            laser.setSpriteSize(Constants.GAME_LASER_SIZE, physicContext.gameManager);
            laser.setSpeed(laserSpeed);
            physicContext.gameManager.addObject('laser', laser);
            this.angleCounter += Math.floor(Math.random() * 3 + 1);
        }
    }
}
