import * as kt from 'kotlinApp';
const Arc = kt.ru.glitchless.game.collision.data.Arc;

import PhysicsObject from './primitive/PhysicsObject.js';
import * as PIXI from 'pixi.js';
import Point from './primitive/Point.js';
import Constants from '../../../utils/Constants';
import EventBus from '../../GameEventBus';

import energy_block_png from '../../../ui/images/energy_block.png';

const basicHealthBlockTexture = PIXI.Texture.fromImage(energy_block_png);

export default class HealthBlock extends PhysicsObject {
    constructor(context, coords = new Point(0, 0), alignmentCircle, id) {
        const basicHealthBlockSprite = new PIXI.Sprite(basicHealthBlockTexture);
        super(basicHealthBlockSprite, context, coords);
        this.circle = alignmentCircle;
        this.playerNumber = id;
    }

    refreshCollisionArc() {
        this.collisionArc = Arc.Companion.fromPoints(...this.getEdgePoints());
    }

    onCollision(laser) {
        EventBus.emitEvent('hpblock_hit', [this, laser]);
    }

    getEdgePoints() {
        const coord = this.getCoords();
        const rotation = this.sprite.rotation;
        const angle = 0.15;
        const lengthHypotenuse = Constants.GAME_HEALTHBLOCK_SIZE[0] / 2;
        const deltaXLeft = lengthHypotenuse * Math.cos(rotation + angle);
        const deltaYLeft = lengthHypotenuse * Math.sin(rotation + angle);
        const deltaXRight = lengthHypotenuse * Math.cos(rotation - angle);
        const deltaYRight = lengthHypotenuse * Math.sin(rotation - angle);

        const pointLeft = new Point(coord.x - deltaXLeft,
            coord.y - deltaYLeft);
        const pointRight = new Point(coord.x + deltaXRight,
            coord.y + deltaYRight);

        return [pointLeft, pointRight, coord];
    }

    setRotation(rotation, context) {
        super.setRotation(rotation, context);
        const radius = this.circle.radius - Constants.GAME_PLATFORM_SIZE[0] / 4;
        const rotationRadian = rotation / Constants.GAME_ROTATION_COEFFICIENT;
        const deltaX = radius * Math.sin(rotationRadian);
        const deltaY = radius * Math.cos(rotationRadian);

        const tmp = this.circle.center;
        const newPoint = new Point(tmp.x - deltaX, tmp.y + deltaY);
        if (Constants.DEBUG_INPUT_CHECK) {
            if (isNaN(deltaX) || isNaN(deltaY)) {
                throw new TypeError(deltaX, deltaY);
            }
        }
        this.setCoords(newPoint, context);
        this.refreshCollisionArc();
    }

}
