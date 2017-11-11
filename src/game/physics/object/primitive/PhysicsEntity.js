const PhysicsObject = require('./PhysicsObject');
const Constants = require('../../../../utils/Constants.js');
const Point = require('./Point.js');

class PhysicsEntity extends PhysicsObject {
    constructor(sprite, context, coords = new Point(0, 0)) {
        super(sprite, context, coords);
        this.isStatic = false;
        this.rotationSpeed = 0;
        this.speed = new Point(0, 0);
    }

    getSpeed() {
        return this.speed;
    }

    setSpeed(speed) {
        if (Constants.DEBUG_INPUT_CHECK) {
            if (isNaN(speed.x) || isNaN(speed.y)) {
                throw new TypeError;
            }
        }
        this.speed = speed;
    }

    getRotationSpeed() {
        return this.rotationSpeed;
    }

    setRotationSpeed(rotationSpeed) {
        this.rotationSpeed = rotationSpeed;
    }
}

module.exports = PhysicsEntity;