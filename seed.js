"use strict";

class SeedApplication {
    constructor(width, height, canvasInsertionParent) {
        // Three.js canvas
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.01, 50);
        this.camera.position.set(0, 1, -3);
        this.camera.lookAt(0, 0.9, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        // Recommended gamma values from https://threejs.org/docs/#examples/loaders/GLTFLoader
        this.renderer.gammaOutput = true;  // If set, then it expects that all textures and colors need to be outputted in premultiplied gamma.
        this.renderer.gammaFactor = 2.2;
        this.renderer.setSize(width, height);
        canvasInsertionParent.appendChild(this.renderer.domElement);
        window.onresize = _event => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.renderer.setSize(w, h);
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
        };

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);

        this.renderer.setClearColor(new THREE.Color("#f5f5f5"));
        this.scene.add(new THREE.DirectionalLight(0xffffff, 1.0));
        this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.3));

        const axesHelper = new THREE.AxesHelper(1);
        this.scene.add(axesHelper);

        
        
        const NUM = 100;
        const boxes = [];

        for (let i = 0; i < NUM; i++) {
            const geom = new THREE.BoxGeometry(2, 2, 2);
            const mat = new THREE.MeshLambertMaterial();
            const box = new THREE.Mesh(geom, mat);

            this.scene.add(box);
            boxes.push(box);
        }

        // Worker
        const physicsWorker = new Worker('./worker.js');

        physicsWorker.onmessage = function (event) {
            if (event.data === "DONE") {
                physicsWorker.postMessage(NUM);
                return;
            } 

            const data = event.data;
            if (data.objects.length != NUM) return;
            for (var i = 0; i < NUM; i++) {
                const physBox = data.objects[i];

                const box = boxes[i];
                box.position.set(physBox[0], physBox[1], physBox[2]);
                box.quaternion.set(physBox[3], physBox[4], physBox[5], physBox[6]);
                box.matrixWorldNeedsUpdate = true;
            }
        };
    }

    animate() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(() => this.animate());
    }
}



const app = new SeedApplication(window.innerWidth, window.innerHeight, document.getElementById('main'));
app.animate();


