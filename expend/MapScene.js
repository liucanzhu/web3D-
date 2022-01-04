import * as THREE from "../build/three.module.js";
import {TWEEN} from "../jsm/libs/tween.module.min.js";
import {GLTFLoader} from "../jsm/loaders/GLTFLoader.js";
import {
    CurrentCamera,
    CurrentScene,
    MainCamera,
    MainScene,
    renderer,
    state,
    Listens,
    gui,
    IsVR,
    User,
    UserCamera,
    VR
} from "./main.js";
import {initMapScene} from "./init.js";
import {DRACOLoader} from "../jsm/loaders/DRACOLoader.js";
import {DeepMapGLSL} from './MapScene_DeepMapGLSL.js'
export class MapSceneClass {
    constructor() {
        this.Draco = new DRACOLoader().setDecoderPath('./素材/Models/draco/gltf/');
        this.LoaderByDraco = new GLTFLoader().setPath('./素材/Models/').setDRACOLoader(this.Draco);
        this.Spheres = new THREE.Group();
        this.Lights = new THREE.Group();
        this.time = {
            type: 'f',
            value: 0.0
        }
        initMapScene();
        this.initSphereAndLight();
        this.initModel();
    }
    initSphereAndLight() {
        const that = this;
        const PointLight1 = new THREE.PointLight("#fff", 1, 700, 1);
        PointLight1.position.set(300, 100, 300);
        const PointLight2 = new THREE.PointLight("#fff", 1, 700, 1);
        PointLight2.position.set(-300, 100, -300);
        const PointLight3 = new THREE.PointLight("#fff", 1, 700, 1);
        PointLight3.position.set(-300, 100, 300);
        const PointLight4 = new THREE.PointLight("#fff", 1, 700, 1);
        PointLight4.position.set(300, 100, -300);
        that.Lights.add(PointLight1, PointLight2, PointLight3, PointLight4);
        CurrentScene[0].add(that.Lights);

        const SphereGeometry = new THREE.SphereGeometry(100);
        let i = 1;
        that.Lights.children.forEach((light) => {

            let SphereMaterial = new THREE.MeshPhongMaterial({
                transparent: true,
                opacity: 0.9,
                map: new THREE.TextureLoader().load('./素材/Img/MapSceneImg/星球/球' + i + '.jpg')
            });
            let Sphere = new THREE.Mesh(SphereGeometry, SphereMaterial)
            Sphere.position.copy(light.position);
            Sphere.position.y -= 100;
            that.Spheres.add(Sphere);
            i++;
        })
        CurrentScene[0].add(that.Spheres);
        //环境光
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        CurrentScene[0].add(ambient);
    }

    initModel() {
        const that = this;
        if(!IsVR){
            that.initCameraTween(CurrentCamera[0]);
        }
        const RayCaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let ViewSprites = new THREE.Group();
        CurrentScene[0].add(ViewSprites);
        const onMouseClick = (event) => {
            mouse.x = event.clientX * 2 / window.innerWidth - 1;
            mouse.y = -event.clientY * 2 / window.innerHeight + 1;
            RayCaster.setFromCamera(mouse, CurrentCamera[0]);
            const intersects = RayCaster.intersectObjects([CurrentScene[0]], true);
            if (intersects.length !== 0) {
                console.log(intersects[0].object.name)
                if (intersects[0].object.name === 'ReturnScene') {
                    CurrentCamera[0] = MainCamera;
                    CurrentScene[0] = MainScene;
                    if(IsVR){
                        VR.CScene="Main"
                    }
                }
                if (intersects[0].object.name === "黄鹤楼Info") {
                    window.open("./全景/全景.html");
                }
                if (intersects[0].object.parent.name === "地标") {
                    /**
                     * @创建进入图片精灵
                     */
                    const TipSpriteMaterial = new THREE.SpriteMaterial({
                        map: new THREE.TextureLoader().load("./素材/Img/MapSceneImg/LandMarks/图-" + intersects[0].object.name + ".png"),
                        depthWrite: false
                    })
                    let TipSprite = new THREE.Sprite(TipSpriteMaterial);
                    TipSprite.position.copy(intersects[0].object.position);
                    TipSprite.position.y+=0.5;
                    intersects[0].object.parent.remove(intersects[0].object);
                    intersects[0].object.geometry.dispose();
                    intersects[0].object.material.dispose();
                    TipSprite.name = intersects[0].object.name+"Info"
                    TipSprite.scale.set(1.5, 1, 1.5);
                    TipSprite.renderOrder =601;
                    CurrentScene[0].add(TipSprite);

                }
            }
        }

        window.addEventListener("click", onMouseClick, false);
        const event5 = {
            name: 'click',
            key: onMouseClick,
            type: "windowByMap"
        }
        Listens.push(event5)
        that.LoaderByDraco.load("SignMap_p.glb", function (obj) {
            const DeepMapObject = obj.scene.getObjectByName("DeepMap");
            const Material = new THREE.ShaderMaterial({
                vertexShader: DeepMapGLSL.vs,
                fragmentShader: DeepMapGLSL.fs,
                uniforms: {
                    iTime: that.time,
                    texture2: {
                        type: 'f',
                        value: new THREE.TextureLoader().load("./素材/Img/DeepMap.jpg"),
                    }
                },
                transparent: true,
            })
            DeepMapObject.material = Material;
            CurrentScene[0].add(obj.scene);
            obj.scene.scale.set(10, 10, 10);
            const Points = [
                obj.scene.position.clone().add(new THREE.Vector3(-1.1, 0, 0.5)),//东湖
                obj.scene.position.clone().add(new THREE.Vector3(-3.2, 0, 0.25)),//赤壁
                obj.scene.position.clone().add(new THREE.Vector3(-1.1, 0, -0.94)),//长江大桥
                obj.scene.position.clone().add(new THREE.Vector3(-2.17, 0, -1.55)),//黄鹤楼
                obj.scene.position.clone().add(new THREE.Vector3(4.3, 0, 5.78)),//道观河
                obj.scene.position.clone().add(new THREE.Vector3(8.34, 0, 0.57)),//木兰天池
                obj.scene.position.clone().add(new THREE.Vector3(-4.47, 0, -4.48)),//双峰山
                obj.scene.position.clone().add(new THREE.Vector3(-7.45, 0, 1.3)),//梁子湖
            ];
            const Maps = [
                "东湖",
                "赤壁",
                "长江大桥",
                "黄鹤楼",
                "道观河",
                "木兰天池",
                "双峰山",
                "梁子湖",
            ];
            const LandmarkSprite = new THREE.Group();
            for (let i = 0; i < Points.length; i++) {
                let labelGeometry = new THREE.SpriteMaterial({
                    map: new THREE.TextureLoader().load("./素材/Img/MapSceneImg/LandMarks/标-" + Maps[i] + ".png"),
                    depthWrite: false
                })
                let labelSprite = new THREE.Sprite(labelGeometry);
                labelSprite.renderOrder = 100;
                labelSprite.position.copy(Points[i]);
                labelSprite.name = Maps[i]
                labelSprite.scale.set(1.5, 1, 1.5);
                LandmarkSprite.add(labelSprite);
            }
            LandmarkSprite.position.y += 0.5
            LandmarkSprite.name = "地标"
            CurrentScene[0].add(LandmarkSprite);
        });
    }
    initCameraTween(obj) {
        const that = this;
        let ViewPosition ={
            x:(!IsVR?0:0),
            y:(!IsVR?10:30),
            z:(!IsVR?10:40)
        }
        const tween = new TWEEN.Tween(obj.position).to({
            x: ViewPosition.x,
            y: ViewPosition.y,
            z: ViewPosition.z
        }, 3000).easing(TWEEN.Easing.Quadratic.InOut).onComplete(function () {
            const ReturnMainSceneMaterial = new THREE.MeshBasicMaterial({
                map: new THREE.TextureLoader().load('./素材/Img/MapSceneImg/返回展览馆.png'),
                transparent: true
            })
            const ReturnMainSceneGeometry = new THREE.BoxGeometry(6, 2, 1);
            that.ReturnMainScene = new THREE.Mesh(ReturnMainSceneGeometry, ReturnMainSceneMaterial);
            that.ReturnMainScene.position.set(0, 9, 0);
            that.ReturnMainScene.name = "ReturnScene";
            CurrentScene[0].add(that.ReturnMainScene);
        })
        tween.start();
    }
    animate() {
        const that = this;
        if(IsVR){
            VR.update();
        }
        else {
            state.update()
        }
        that.time.value += 0.005;
        TWEEN.update();

        if (IsVR) {
            User.position.copy(CurrentCamera[0].position);
            User.rotation.copy(CurrentCamera[0].rotation);
            renderer.render(CurrentScene[0], UserCamera);
        } else {
            renderer.render(CurrentScene[0], CurrentCamera[0]);
        }
        that.Spheres.rotation.y += 0.005
        that.Spheres.children.forEach((obj) => {
            obj.rotation.y += 0.005
        })
    }
}

