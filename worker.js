"use strict";

var Module = { TOTAL_MEMORY: 512 * 1024 * 1024 };

importScripts('./ammo.js');

const glb = this;

let onMessageHandler = null;

onmessage = function(e) {
    if (onMessageHandler !== null) {
        onMessageHandler(e);
    }
};

Ammo().then(function (Ammo) {
    try {
        console.log("Starting physics");
        var NUM = 0, NUMRANGE = [];

        // Bullet-interfacing code

        var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
        var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
        var overlappingPairCache = new Ammo.btDbvtBroadphase();
        var solver = new Ammo.btSequentialImpulseConstraintSolver();
        var dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
        dynamicsWorld.setGravity(new Ammo.btVector3(0, -10, 0));

        var groundShape = new Ammo.btBoxShape(new Ammo.btVector3(1, 0.2, 1));

        var bodies = [];

        var groundTransform = new Ammo.btTransform();
        groundTransform.setIdentity();
        groundTransform.setOrigin(new Ammo.btVector3(0, -0.2, 0));

        (function () {
            var mass = 0;
            var localInertia = new Ammo.btVector3(0, 0, 0);
            var myMotionState = new Ammo.btDefaultMotionState(groundTransform);
            var rbInfo = new Ammo.btRigidBodyConstructionInfo(0, myMotionState, groundShape, localInertia);
            var body = new Ammo.btRigidBody(rbInfo);

            dynamicsWorld.addRigidBody(body);
            bodies.push(body);
        })();

        var boxShape = new Ammo.btBoxShape(new Ammo.btVector3(0.01, 0.01, 0.01));

        function resetPositions() {
            var side = Math.ceil(Math.pow(NUM, 1 / 3));
            var i = 1;
            for (var x = 0; x < side; x++) {
                for (var y = 0; y < side; y++) {
                    for (var z = 0; z < side; z++) {
                        if (i == bodies.length) break;
                        var body = bodies[i++];
                        var origin = body.getWorldTransform().getOrigin();
                        origin.setX((x - side / 2) * 0.01 * (2.2 + Math.random()));
                        origin.setY(y * (3 + Math.random()) * 0.01 + 0.05);
                        origin.setZ((z - side / 2) * 0.01 * (2.2 + Math.random()));
                        body.activate();
                        var rotation = body.getWorldTransform().getRotation();
                        rotation.setX(1);
                        rotation.setY(0);
                        rotation.setZ(0);
                        rotation.setW(1);
                    }
                }
            }
        }

        // Ammo.btFixed

        function startUp() {
            NUMRANGE.forEach(function (i) {
                var startTransform = new Ammo.btTransform();
                startTransform.setIdentity();
                var mass = 1e-3;
                var localInertia = new Ammo.btVector3(0, 0, 0);
                boxShape.calculateLocalInertia(mass, localInertia);

                var myMotionState = new Ammo.btDefaultMotionState(startTransform);
                var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, boxShape, localInertia);
                var body = new Ammo.btRigidBody(rbInfo);

                dynamicsWorld.addRigidBody(body);
                bodies.push(body);
            });

            resetPositions();
        }

        var transform = new Ammo.btTransform(); // taking this out of readBulletObject reduces the leaking

        function readBulletObject(i, object) {
            var body = bodies[i];
            body.getMotionState().getWorldTransform(transform);
            var origin = transform.getOrigin();
            object[0] = origin.x();
            object[1] = origin.y();
            object[2] = origin.z();
            var rotation = transform.getRotation();
            object[3] = rotation.x();
            object[4] = rotation.y();
            object[5] = rotation.z();
            object[6] = rotation.w();
        }

        var nextTimeToRestart = 0;
        function timeToRestart() { // restart if at least one is inactive - the scene is starting to get boring
            if (nextTimeToRestart) {
                if (Date.now() >= nextTimeToRestart) {
                    nextTimeToRestart = 0;
                    return true;
                }
                return false;
            }
            for (var i = 1; i <= NUM; i++) {
                var body = bodies[i];
                if (!body.isActive()) {
                    nextTimeToRestart = Date.now() + 1000; // add another second after first is inactive
                    break;
                }
            }
            return false;
        }

        function simulate(dt) {
            const simStep = 0.004; // 250Hz
            for (let i = 0; i < 4; i++) {
                dynamicsWorld.stepSimulation(simStep, 0);
            }
            
            var data = { objects: []};

            // Read bullet data into JS objects
            for (var i = 0; i < NUM; i++) {
                var object = [];
                readBulletObject(i + 1, object);
                data.objects[i] = object;
            }

            postMessage(data);

            if (timeToRestart()) resetPositions();
        }

        var interval = null;

        onMessageHandler = (event) => {
            console.log("onmessage");
            NUM = event.data;
            NUMRANGE.length = 0;
            while (NUMRANGE.length < NUM) NUMRANGE.push(NUMRANGE.length + 1);

            startUp();
            function mainLoop() {
                simulate();
            }

            if (interval) clearInterval(interval);
            interval = setInterval(mainLoop, 1000 / 60);
        }
        console.log("worker setup done", glb);
        postMessage("DONE");
    } catch (e) {
        console.log("worker error", e);
    }
});