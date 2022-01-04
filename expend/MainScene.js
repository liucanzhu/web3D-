import * as THREE from "../build/three.module.js";
import {GLTFLoader} from "../jsm/loaders/GLTFLoader.js"
import {DRACOLoader} from "../jsm/loaders/DRACOLoader.js";
import {TWEEN} from "../jsm/libs/tween.module.min.js";
import {XR} from "./XR.js";
import {Cylinder} from "./Cylinder.js"
import {BASMesh} from "./BASMesh.js"
import {Collider} from "./Collider.js";
import {initMainScene} from "./init.js";
import {
    renderer,
    state,
    CurrentCamera,
    CurrentScene,
    TranCamera,
    TranScene,
    Listens,
    gui,
    User,
    UserCamera,
    IsVR,
    keyStates,
    IsPointer,
    VR,
} from "./main.js";

//加载视频贴图 加载3D地图数据
export class MainSceneClass {
    constructor(OriginCameraPosition) {
        initMainScene();//初始化场景
        this.OriginCameraPosition = OriginCameraPosition;//初始化相机生成位置
        this.Draco = new DRACOLoader().setDecoderPath('./素材/Models/draco/gltf/');//创建Draco解码器
        this.Loader = new GLTFLoader().setPath('./素材/Models/');//创建GLTF加载器
        this.LoaderByDraco = new GLTFLoader().setPath('./素材/Models/').setDRACOLoader(this.Draco);//创建Draco加载器
        this.collider = new Collider(this.OriginCameraPosition);//创建碰撞机
        this.WenWus = {}//创建文物数据储存对象
        this.IsComplete = false;//记录装配完成状态
        this.CurrentModel = null;//记录当前文物
        this.WenWuModelGroup = new THREE.Group();//储存文物
        this.iTime = {//创建一个时间对象
            type: 'f',
            value: 0.0
        };
        this.VideoIndex = 0;//当前视频的编号
        this.VideoTs = [new THREE.TextureLoader().load("./素材/Img/黄鹤楼字幕.png"), new THREE.TextureLoader().load("./素材/Img/木兰山字幕.png")];//字幕数组
        this.StartCard = false;//记录卡片状态
        this.IsInfoMapScene = false;//记录进入MapScene状态
        this.VideoPaused = false;//记录时评播放状态
        this.init();//初始化
        this.MapDataHeightData = {
            "2016Data": 0,
            "2017Data": 0,
            "2018Data": 0,
            "2019Data": 0,
            "2020Data": 0,
        }
        this.MapData = {
            "黄鹤楼": {
                "2016Data": 320,
                "2017Data": 340,
                "2018Data": 320,//黄鹤楼
                "2019Data": 446,
                "2020Data": 216,
            },
            "木兰景区": {
                "2016Data": 263,
                "2017Data": 293,
                "2018Data": 351,//木兰景区
                "2019Data": 379,
                "2020Data": 354,
            }
        };
        this.DataModel =null;
        this.DataMap =    [new THREE.TextureLoader().load("./素材/Img/黄鹤楼-数据背景图.jpg"), new THREE.TextureLoader().load("./素材/Img/木兰-数据背景图.jpg")];
    }

    correctScene(model) {
        const that = this;
        /**
         * @修正馆顶
         */
        let TopFloorModel = model.getObjectByName('TopFloor');
        let FloorTexture = new THREE.TextureLoader().load('./素材/Img/TopFloor.jpg');
        TopFloorModel.material.map = FloorTexture;
        /**
         * @修正地板
         * Map.wrapS = THREE.RepeatWrapping;
         * Map.wrapT = THREE.RepeatWrapping;
         * Map.repeat.set(20, 20);
         * 六张图片分别是朝前的（posz）、朝后的（negz）、朝上的（posy）、朝下的（negy）、朝右的（posx）和朝左的（negx）。
         */
        let FloorModel = model.getObjectByName('Floor');
        let texLoader = new THREE.TextureLoader();
        let Map = texLoader.load("./素材/Img/灰色大理石.jpg");
        let cubeTextureLoader = new THREE.CubeTextureLoader().setPath('./素材/Img/');
        let cubeTexture = cubeTextureLoader.load([
            'TopFloor_cube_0.png', 'TopFloor_cube_2.png',
            'TopFloor_cube_4.png', 'TopFloor_cube_5.png',
            'TopFloor_cube_1.png', 'TopFloor_cube_3.png'
        ]);
        FloorModel.material = new THREE.MeshPhysicalMaterial({
            map: Map,
            metalnessMap: Map,
            reflectivity: 0.3,
            // 环境贴图
            envMap: cubeTexture,
            clearcoat: 0.9,
            metalness: 0.8,
            roughness: 1.0,
            envMapIntensity: 0.9,
        })
        /**
         * @修正墙壁贴图
         */
        let WallModel = model.getObjectByName("mesh_0_1");
        WallModel.material.map.wrapS = THREE.RepeatWrapping;
        WallModel.material.map.wrapT = THREE.RepeatWrapping;
        WallModel.material.map.repeat.set(10, 10);
        WallModel.material.map.needsUpdate = true;
        /**
         *@修正视频字幕
         */
        let VideoT = model.getObjectByName("VideoT");
        VideoT.material.map = this.VideoTs[this.VideoIndex];
        /**
         * @修正历史回溯点击按钮
         */
        this.initHistoryClick();
        /**
         * @加载光环
         */
        this.CreateCylinder(model);
        /**
         * @加载视频贴图
         **/
        setTimeout(() => {
            that.CreateVideo(model);
        }, 3000)
        /**
         * @加载用户指示光圈
         */
        this.initCylinder();
    }

    init() {
        const that = this;
        /**
         * @加载展览馆
         */
        this.Loader.load('N.gltf', gltf => {
            const model = gltf.scene;
            CurrentScene[0].add(model);
            that.initDisplayModel(model);//初始化文物
            this.collider.worldOctree.fromGraphNode(model);//碰撞检测
            this.correctScene(model);
            /**
             * @加载射线
             **/
            const RayCaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();

            async function onMouseClick(event) {
                mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
                if (IsVR) {
                    RayCaster.setFromCamera(mouse, UserCamera);
                } else {
                    if (IsPointer) {
                        mouse.x = 0;
                        mouse.y = 0;
                    }
                    RayCaster.setFromCamera(mouse, CurrentCamera[0]);
                }
                const intersects = RayCaster.intersectObjects([CurrentScene[0]], true).filter(arr => {
                    return arr.object.name !== "Walk" && arr.object.name !== "Floor" && arr.object.type !== "Line" && arr.object.visible;
                });
                while (intersects[0] && that.GetParent(intersects[0].object, "WenWuGroup")[1] && intersects[0].object.parent.visible === false) {
                    intersects.shift();
                }

                if (intersects.length !== 0) {
                    console.log(intersects[0].object.name);
                    if (intersects[0].object.name === 'InfomapSceneCard' && !that.IsInfoMapScene) {
                        if (intersects[0].distance < 5) {
                            CurrentCamera[0] = TranCamera;
                            CurrentScene[0] = TranScene;
                            that.IsInfoMapScene = true;//这里限制了只能进入一次MapScene场景
                            for (let key in keyStates) {
                                delete keyStates[key];
                            }
                            if(IsVR)
                            VR.CScene ="Tra"
                        }
                    }
                    if (that.CurrentModel) {
                        let WenWuJudge = that.GetParent(intersects[0].object, that.CurrentModel.name);
                        if (WenWuJudge[1]) {
                            let object = WenWuJudge[0];
                            if (that.WenWus.hasOwnProperty(object.parent.name)) {
                                let obj = that.WenWus[object.parent.name];
                                if (obj) {//如果存在该模型
                                    that.WenWuClickTween(object, obj.part[object.name][1]);//虚拟装配动画
                                    if (!obj.part[object.name][2]) {//判断是否已被装配
                                        obj.part[object.name][2] = true;
                                        obj.CurrentCount++;//装配数加一
                                        if (obj.CurrentCount === obj.ModelCount) {//如果所有部件全部装配
                                            if (that.WenWus[that.CurrentModel.name].IsFirstStart)
                                                that.initCreateBasTweenMesh(obj, obj.textImg[obj.textIndex], obj.textImg[++obj.textIndex])
                                            that.DescribeClickGroup.visible = true;
                                            that.WenWus[that.CurrentModel.name].IsFirstStart = false;
                                            that.IsComplete = true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (that.GetParent(intersects[0].object, "WenWuGroup")[1]) {
                        if (intersects[0].object.name === "LeftWenWu" && that.IsComplete) {//向左转
                            that.WenWuRotateTween(that.CurrentModel, 0, Math.PI / 2, 0, false);
                        }
                        if (intersects[0].object.name === "RightWenWu" && that.IsComplete) {//向右转
                            that.WenWuRotateTween(that.CurrentModel, 0, Math.PI / 2, 0, true);
                        }
                        if (intersects[0].object.name === "DisaWenWu" && that.IsComplete) {
                            that.WenWus[that.CurrentModel.name].init();
                        }
                        if (intersects[0].object.name === "ReturnMain" && that.IsComplete) {
                            that.StartCardGroup.visible = true;
                            that.DeleteCardGroup.visible = true;
                            that.WenWuModelGroup.remove(that.CurrentModel);
                            that.initDescribe();
                            that.IsComplete = false;
                        }
                        if (intersects[0].object.name === "DeleteCard" && that.StartCard && !that.IsComplete) {
                            that.DeleteCard();
                        }
                        if (intersects[0].object.name === "StartCard" && !that.StartCard && !that.IsComplete) {
                            that.initCard();
                        }
                        if (intersects[0].object.name === "NextText" && that.IsComplete) {
                            let obj = that.WenWus[that.CurrentModel.name];
                            let CurrentImg = obj.textImg[obj.textIndex];
                            obj.textIndex = obj.textIndex >= obj.textUrls.length - 1 ? 0 : ++obj.textIndex;
                            let NextImg = obj.textImg[obj.textIndex];
                            that.ChangePageTween(that.WenWuText1, NextImg);
                            that.ChangePageTween(that.WenWuText2, CurrentImg);
                        }
                        if (intersects[0].object.name === "LastText" && that.IsComplete) {
                            let obj = that.WenWus[that.CurrentModel.name];
                            let CurrentImg = obj.textImg[obj.textIndex];
                            obj.textIndex = obj.textIndex <= 0 ? obj.textUrls.length - 1 : --obj.textIndex;
                            let NextImg = obj.textImg[obj.textIndex];
                            that.ChangePageTween(that.WenWuText1, NextImg);
                            that.ChangePageTween(that.WenWuText2, CurrentImg);
                        }
                    }
                    if (that.GetParent(intersects[0].object, "LeiShenVideoGroup")[1]) {
                        if (intersects[0].object.name === "VideoClick3" || intersects[0].object.name === "VideoClick1") {
                            // VideoClick1木兰山 VideoClick3黄鹤楼
                            let currentIndex = that.VideoIndex;
                            let currentName;
                            // that.VideoIndex = that.VideoIndex >= that.videos.length - 1 ? 0 : ++that.VideoIndex;
                            if (intersects[0].object.name === "VideoClick3") {
                                that.VideoIndex = 0;
                                currentName = "黄鹤楼"
                            }
                            if (intersects[0].object.name === "VideoClick1") {
                                that.VideoIndex = 1;
                                currentName = "木兰景区"
                            }
                            if (currentIndex !== that.VideoIndex) {
                                let CurrentMap = that.videos[currentIndex];
                                that.videoControls[currentIndex].pause();
                                let NextMap = that.videos[that.VideoIndex];
                                const VideoT = model.getObjectByName("VideoT");
                                VideoT.material.map = that.VideoTs[that.VideoIndex];
                                that.videoControls[that.VideoIndex].play();
                                that.videoControls[that.VideoIndex].currentTime = 0;
                                that.VideoPaused = false;
                                that.ChangeVideoTween(model.getObjectByName("VideoPlane"), CurrentMap, NextMap);
                                that.DataCreatTween(that.DataModel.children[0],currentName);
                                let VideoBackground = CurrentScene[0].getObjectByName("DataBackground");
                                VideoBackground.material.map = that.DataMap[that.VideoIndex];
                            } else {
                                that.VideoPaused = !that.VideoPaused;
                                if (that.VideoPaused) {

                                    that.videoControls[currentIndex].pause();
                                } else {
                                    that.videoControls[currentIndex].play();
                                }
                            }
                        }
                    }

                    if (that.GetParent(intersects[0].object, "Card")[1]) {
                        that.StartCardGroup.visible = false;
                        that.DeleteCardGroup.visible = false;
                        let obj = intersects[0].object;
                        if (obj.name === "Card5") {
                            that.piture3 = new BASMesh(obj, "Picture");
                            await that.piture3.createMesh({
                                width: 1.75,
                                height: 2,
                                img: null,
                                PathImgMethod: "out",
                                extendX: 0.05,
                                extendY: 0.02,
                                extendZ: 0.6,
                                fragmentX: 50,
                                fragmentY: 50,
                            })
                            that.piture3.Picture.material.uniforms.map.value = new THREE.TextureLoader().load("./素材/Img/Cards/武汉-黄鹤楼.png", () => {
                                that.piture3.Picture.parent.tween.kill();
                                that.piture3.Picture.material.uniforms.map.value.needsUpdate = true;
                                that.piture3.Picture.material.transparent = true,
                                    that.piture3.createTween(del);
                            });

                            function del() {
                                that.initHuangHeLou();
                                that.DeleteCard();
                            }

                        }
                    }
                    if (that.GetParent(intersects[0].object, "DescribeClickGroup")[1]) {
                        intersects[0].object.visible = false;
                        let obj = model.getObjectByName(`${intersects[0].object.name}Text`);
                        obj.visible = true;
                    }
                    if (that.GetParent(intersects[0].object, "HistoryClickGroup")[1]) {
                        let clickType = intersects[0].object.name;
                        let PlaneMaterial = new THREE.MeshStandardMaterial({
                            map: new THREE.TextureLoader().load('./素材/Img/History/' + clickType + '.png'),
                            transparent: true
                        })
                        let PlaneGeometry = new THREE.PlaneGeometry(0.1, 0.1, 1, 1);
                        const HistoryPlane = new THREE.Mesh(PlaneGeometry, PlaneMaterial);
                        HistoryPlane.position.copy(intersects[0].object.position)
                        HistoryPlane.name = "HistoryCard"
                        HistoryPlane.OPosition = intersects[0].object.position.clone();
                        CurrentScene[0].add(HistoryPlane);
                        that.CreateHistoryCard(HistoryPlane, CurrentCamera[0].position);
                    }
                    if (intersects[0].object.name === "HistoryCard") {
                        that.DeleteHistory(intersects[0].object);
                    }
                }
            }

            window.addEventListener("click", onMouseClick, false);
            let event6 = {
                name: 'click',
                key: onMouseClick,
                type: "windowByMain"
            }
            Listens.push(event6)
        })
        /**
         * @加载展览台
         */
        this.LoaderByDraco.load("DisplayTable_p.glb", glb => {
            CurrentScene[0].add(glb.scene);
        })
        /**
         * @加载装饰灯
         */
        this.LoaderByDraco.load("LightModel_p.glb", glb => {
            CurrentScene[0].add(glb.scene);
        })
        /**
         * @加载数据图表
         */
        this.Loader.load("DataDisplay.gltf", gltf => {
            const model = gltf.scene;
            that.DataModel = model;
            model.position.x+=0.5;//修正
            CurrentScene[0].add(model);
            that.DataCreatTween(that.DataModel.children[0],"黄鹤楼");
        })
    }

    /**
     *@获取父对象
     */
    GetParent(obj, ParentName) {
        const that = this;
        if (obj.parent.name === "MainScene") {
            return [null, false];
        }
        if (obj.parent.name === ParentName) {
            return [obj, true];
        }
        return that.GetParent(obj.parent, ParentName)
    }

    /**
     * @Function1-视频展示
     */
    //初始化视频贴图
    CreateVideo(model) {
        const that = this;
        that.videos = [];
        that.videoControls = [];
        that.videoCount = 2;
        that.VideoPlane = model.getObjectByName("VideoPlane");
        // video对象作为VideoTexture参数创建纹理对象
        for (let i = 0; i < that.videoCount; i++) {
            let video = document.querySelector(`#video${that.videos.length + 1}`);
            video.style.visibility = "none";
            let texture = new THREE.VideoTexture(video);
            texture.wrapS = video.wrapT = THREE.ClampToEdgeWrapping;
            texture.minFilter = THREE.LinearFilter;
            that.videos.push(texture);
            that.videoControls.push(video);
        }
        that.VideoPlane.material = new THREE.MeshStandardMaterial({map: that.videos[that.VideoIndex]});
    }

    //视频介绍翻页时的翻页动画
    ChangeVideoTween(obj, currentImg, nextImg) {
        const that = this;
        const uniforms = {
            texture1: {
                type: 'f',
                value: currentImg
            },
            texture2: {
                type: 'f',
                value: nextImg
            },
            percent: {
                type: 'f',
                value: 0.0
            }
        }
        that.imgvs = "" +
            "varying vec2 vUv;\n" +//
            "void main(){\n" +
            "   gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n" +//
            "   vUv =uv;\n" +//
            "}\n";
        that.imgfs = "" +
            "precision mediump float;\n" +
            "     varying vec2 vUv;\n" +
            "     uniform sampler2D texture1;\n" +
            "     uniform sampler2D texture2;\n" +
            "     uniform float percent;\n" +
            "void main(){\n" +
            "    float pre = smoothstep(0.0, 1.0, percent*2.0 + vUv.y -1.0);\n" +
            "    vec4 color1 = texture2D(texture1, vUv*(1.-pre));\n" +
            "    vec4 color2 = texture2D(texture2, vUv*pre);\n" +
            "    gl_FragColor = mix(color1, color2, pre);\n" +
            "}\n";
        const shaderMaterial = new THREE.ShaderMaterial({
            uniforms: uniforms,
            side: THREE.DoubleSide,
            vertexShader: that.imgvs,
            fragmentShader: that.imgfs
        })
        if (obj.material.type !== "ShaderMaterial") {
            obj.material = shaderMaterial;
        }
        const tween = new TimelineMax();
        tween.to(obj.material.uniforms.percent, 2, {
            value: 1.0,
            ease: Power2["easeOut"],
            onStart: () => {
                obj.material.uniforms.texture1.value = currentImg;
                obj.material.uniforms.texture2.value = nextImg;
            },
            onComplete: () => {
                obj.material.uniforms.texture1.value = nextImg;
                obj.material.uniforms.percent.value = 0.0;
            }
        })
    }

    DataCreatTween(obj, name) {
        const that =this;
        obj.children.forEach(function (e) { //210-30
            e.renderOrder =10;
            let height;
            let color;
            let CurrentMapData = that.MapData[name];
            if (CurrentMapData[e.name] < 280) {
                height = 0.05 - that.MapDataHeightData[e.name];
                that.MapDataHeightData[e.name] = that.MapDataHeightData[e.name] + height;
                let color1 = new THREE.Color("#ac7403");
                let color2 = new THREE.Color("rgba(90,180,10,0.86)");
                color = color1.lerp(color2, CurrentMapData[e.name] / 280);
            } else if (CurrentMapData[e.name] >= 280 && CurrentMapData[e.name] < 340) {
                height = 0.3 - that.MapDataHeightData[e.name];
                that.MapDataHeightData[e.name] = that.MapDataHeightData[e.name] + height;
                let color1 = new THREE.Color("#85b6c7");
                let color2 = new THREE.Color("#4e6f66");
                color = color1.lerp(color2, CurrentMapData[e.name] / 340);
            } else if (CurrentMapData[e.name] >= 340 && CurrentMapData[e.name] < 400) {
                height = 0.4 - that.MapDataHeightData[e.name];
                that.MapDataHeightData[e.name] = that.MapDataHeightData[e.name] + height;
                let color1 = new THREE.Color("#f7c255");
                let color2 = new THREE.Color("#018dd2");
                color = color1.lerp(color2, CurrentMapData[e.name] / 400);
            } else {
                height = 0.5 - that.MapDataHeightData[e.name];
                that.MapDataHeightData[e.name] = that.MapDataHeightData[e.name] + height;
                let color1 = new THREE.Color("rgba(90,129,252,0.64)");
                let color2 = new THREE.Color("rgb(55,68,14)");
                color = color1.lerp(color2, CurrentMapData[e.name] / 460);
            }
            that.CylinderCreatTween(e, height, that.MapDataHeightData[e.name], color);
        })
    }


    CylinderCreatTween(obj, height, tra_y, color) {
        let newColors = color.toArray();
        let oldColors = obj.material.color.toArray();
        let Y = obj.position.clone();
        let t = {
            r: oldColors[0],
            g: oldColors[1],
            b: oldColors[2],
        }
        const tween = new TWEEN.Tween(obj.scale).to({y: tra_y + 1}, 2000);
        const tween2 = new TWEEN.Tween(t).to({
            r: newColors[0],
            g: newColors[1],
            b: newColors[2]
        }, 2000).onUpdate(function () {
            obj.material.color = new THREE.Color(t.r, t.g, t.b);
        });
        const tween3 = new TWEEN.Tween(obj.position).to({y: tra_y + 2.9}, 2000)
        tween3.start();
        tween2.start();
        tween.start();
    }

    /**
     *@----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     */

    /**
     * @Function2-文物零距离------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     */
    //展示的文物模型点击装配动画
    WenWuClickTween(obj, Position) {
        const tween = new TWEEN.Tween(obj.position).to({
            x: Position.x,
            y: Position.y,
            z: Position.z
        }, 2000).easing(TWEEN.Easing.Quadratic.InOut)
        tween.start();
    }

    //展示的文物模型转动动画
    WenWuRotateTween(obj, angleX, angleY, angleZ, flag) {
        const X = obj.rotation.x;
        const Y = obj.rotation.y;
        const Z = obj.rotation.z;
        if (flag) {
            const tween = new TWEEN.Tween(obj.rotation).to({
                x: X + angleX,
                y: Y + angleY,
                z: Z + angleZ
            }, 1000).easing(TWEEN.Easing.Quadratic.InOut)
            tween.start();
        } else {
            const tween = new TWEEN.Tween(obj.rotation).to({
                x: X - angleX,
                y: Y - angleY,
                z: Z - angleZ
            }, 1000).easing(TWEEN.Easing.Quadratic.InOut)
            tween.start();
        }

    }

    //初始化文物系统
    initDisplayModel(model) {
        const that = this;
        that.WenWuModelGroup.name = "WenWuModelGroup";
        CurrentScene[0].add(this.WenWuModelGroup);
        that.WenWuText1 = model.getObjectByName("DisplayWenWu");
        that.WenWuText2 = model.getObjectByName("DisplayWenWu2");
        that.NextText = model.getObjectByName("NextText");
        that.LastText = model.getObjectByName("LastText");
        that.controlsGroup = model.getObjectByName("ControlGroup");//文物控制面板 初始坐标x=-20
        that.StartCardGroup = model.getObjectByName("StartCard");
        that.DeleteCardGroup = model.getObjectByName("DeleteCard");
        that.DescribeClickGroup = model.getObjectByName("DescribeClickGroup");
        that.DescribeClickGroup.visible = false;
        that.Describe1Text = model.getObjectByName("Describe1Text");
        that.Describe1Text.visible = false;
        that.Describe2Text = model.getObjectByName("Describe2Text");
        that.Describe2Text.visible = false;
        that.Describe3Text = model.getObjectByName("Describe3Text");
        that.Describe3Text.visible = false;
        that.Describe4Text = model.getObjectByName("Describe4Text");
        that.Describe4Text.visible = false;
        that.Describe5Text = model.getObjectByName("Describe5Text");
        that.Describe5Text.visible = false;
        that.Describe1 = model.getObjectByName("Describe1");
        that.Describe2 = model.getObjectByName("Describe2");
        that.Describe3 = model.getObjectByName("Describe3");
        that.Describe4 = model.getObjectByName("Describe4");
        that.Describe5 = model.getObjectByName("Describe5");
    }

    initDescribe() {
        const that = this;
        that.DescribeClickGroup.visible = false;
        that.Describe1Text.visible = false;
        that.Describe2Text.visible = false;
        that.Describe3Text.visible = false;
        that.Describe4Text.visible = false;
        that.Describe5Text.visible = false;
        that.Describe1.visible = true;
        that.Describe2.visible = true;
        that.Describe3.visible = true;
        that.Describe4.visible = true;
        that.Describe5.visible = true;

    }

    //加载卡片
    initCard() {
        const that = this;
        that.StartCard = true;
        this.LoaderByDraco.load("Card_p.glb", glb => {
            let model = glb.scene;
            model.name = "Card";
            model.children[0].position.set(6, 4, -26)
            CurrentScene[0].add(model);
            CreateTween(model.children[0])
            const angle = Math.PI * 2;
            const count = 10;
            const num = 10;
            const percent = angle / count;
            const radius = 3;
            let pos = {
                x: 0,
                z: 0
            };
            for (let i = 0; i < num; i++) {
                pos.x = Math.cos(percent * (i)) * radius;
                pos.z = Math.sin(percent * (i)) * radius;
                model.children[0].children[i].position.set(pos.x, 0, pos.z);
                model.children[0].children[i].lookAt(new THREE.Vector3(6, 4, -26))
            }
        })
        var CreateTween = (obj) => {
            obj.tween = new TimelineMax();
            obj.tween.to(obj.rotation, 40, {
                y: Math.PI * 2,// Math.PI*8/9
                repeat: -1,
                ease: Power0.easeNone,
                onUpdate: function () {
                    obj.updateMatrix();
                    obj.children.forEach(child => {
                        if (child.matrixWorld.elements[14] < -25) {//这里选取的是世界x坐标，3~9,z坐标-24 ~-29
                            child.visible = true;
                        } else {
                            child.visible = false;
                        }
                        child.lookAt(new THREE.Vector3(6, 4, -26))
                    })
                }
            })
        }
    }

    //销毁卡片
    DeleteCard() {
        const that = this;
        that.StartCard = false;
        let cards = CurrentScene[0].getObjectByName("Card");
        CurrentScene[0].remove(cards);
        cards.children[0].children.forEach(child => {
            child.geometry.dispose();
            child.material.dispose();
        })
    }

    //文物介绍翻页动画
    ChangePageTween(obj, Img) {
        const that = this;
        if (obj.name === that.piture.PictureName) {
            that.piture.Picture.material.uniforms.map.value = Img;
            that.piture.Picture.material.uniforms.map.value.needsUpdate = true;
            that.piture.createTween();
        } else if (obj.name === that.piture2.PictureName) {
            that.piture2.Picture.material.uniforms.map.value = Img;
            that.piture2.Picture.material.uniforms.map.value.needsUpdate = true;
            that.piture2.createTween();
        }
    }

    //生成两个由BAS处理的平面
    initCreateBasTweenMesh(obj, currentImg, nextImg) {
        const that = this;
        that.piture = new BASMesh(that.WenWuText1, "Picture");
        that.piture.createMesh({
            width: 19,
            height: 7,
            img: nextImg,
            PathImgMethod: "in",
            extendX: 6,
            extendY: 3,
            extendZ: 4,
            fragmentX: 200,
            fragmentY: 200,
        })
        that.piture2 = new BASMesh(that.WenWuText2, "Picture");
        that.piture2.createMesh({
            width: 19,
            height: 7,
            img: currentImg,
            PathImgMethod: "out",
            extendX: 6,
            extendY: 3,
            extendZ: 4,
            fragmentX: 200,
            fragmentY: 200,
        })
        that.WenWuText1.material.uniforms.map.value = currentImg;
        that.WenWuText1.material.uniforms.map.value.needsUpdate = true;
        that.WenWuText2.material.uniforms.map.value = nextImg;
        that.WenWuText2.material.uniforms.map.value.needsUpdate = true;
    }

    //生成一个光圈用于指示用户所处位置
    initCylinder() {
        const that = this;
        const userCylinder = new Cylinder({height: 0.1, TopRadius: 2, BottomRadius: 2});
        const model = userCylinder.CreateCylinder(that.iTime, new THREE.Vector3(5.6, 0, -23), "userCylinder");
        CurrentScene[0].add(model);
    }

    /**
     * @初始化黄鹤楼模型
     */
    initHuangHeLou() {
        const that = this;
        that.LoaderByDraco.load('HuangHeLou_p.glb', function (gltf) {
            const object = gltf.scene;
            that.WenWuModelGroup.add(object.children[0]);

            that.CurrentModel = that.WenWuModelGroup.getObjectByName("HuangHeLou");
            that.CurrentModel.position.set(5.85, 1, -27);
            let HuangHeLou = {
                name: "HuangHeLou",
                part: {
                    "Toplayer": [that.CurrentModel.getObjectByName("Toplayer"), new THREE.Vector3(0, 0, 0), false],
                    "MiddleTopLayer": [that.CurrentModel.getObjectByName("MiddleTopLayer"), new THREE.Vector3(0, 0, 0), false],
                    "MiddleLayer": [that.CurrentModel.getObjectByName("MiddleLayer"), new THREE.Vector3(0, 0, 0), false],
                    "MiddleLowerLayer": [that.CurrentModel.getObjectByName("MiddleLowerLayer"), new THREE.Vector3(0, 0, 0), false],
                    "LowerLayer": [that.CurrentModel.getObjectByName("LowerLayer"), new THREE.Vector3(0, 0, 0), false],
                },//修改为对象
                IsFirstStart: true,
                CurrentCount: 0,
                rotation: that.CurrentModel.rotation.clone(),
                init() {
                    that.IsComplete = false;
                    this.CurrentCount = 0;
                    this.part["Toplayer"][0].position.copy(new THREE.Vector3(-63.677, 29.705, -51.636));
                    this.part["MiddleTopLayer"][0].position.copy(new THREE.Vector3(-31.694, 38.176, -50.800));
                    this.part["MiddleLayer"][0].position.copy(new THREE.Vector3(0, 46.731, -51.498));
                    this.part["MiddleLowerLayer"][0].position.copy(new THREE.Vector3(28.529, 55.842, -50.585));
                    this.part["LowerLayer"][0].position.copy(new THREE.Vector3(-19.195, 37.641, -44.691));
                    this.part["Toplayer"][2] = false;
                    this.part["MiddleTopLayer"][2] = false;
                    this.part["MiddleLayer"][2] = false;
                    this.part["MiddleLowerLayer"][2] = false;
                    this.part["LowerLayer"][2] = false;
                    that.CurrentModel.rotation.copy(this.rotation);
                    that.initDescribe();

                },
                remove() {
                    that.WenWuModelGroup.remove(CurrentScene[0].getObjectByName("HuangHeLou"));
                },
                ModelCount: 5,

                textUrls: ["./素材/Img/文物展示/NN1.png", "./素材/Img/文物展示/NN2.png"],
                textIndex: 0,
                textImg: []
            }
            HuangHeLou.init();
            let promises = [];
            HuangHeLou.textUrls.forEach(img => {
                let promise = new Promise(res => {
                    HuangHeLou.textImg.push(new THREE.TextureLoader().load(img, res));
                })
                promises.push(promise);
            })
            Promise.all(promises).then(() => {
                that.WenWus.HuangHeLou = HuangHeLou;

            })
        })

    }

    /**
     * @----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     */

    /**
     * @Function3-星空漫游
     */
    //加载进入MapScene中的光环
    CreateCylinder(model) {
        const that = this;
        that.InfoMapSceneMesh = new Cylinder({TopRadius: 4, BottomRadius: 4, height: 3});
        CurrentScene[0].add(that.InfoMapSceneMesh.CreateCylinder(that.iTime, new THREE.Vector3(30, -2.0, -6.4), "InfoMapScene"));
    }

    /**
     *@----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     */
    /**
     * @Function4-历史回溯
     */
    //初始化点击按钮
    initHistoryClick() {
        const historyClick = CurrentScene[0].getObjectByName("HistoryClickGroup");
        historyClick.children.forEach(obj => {
            obj.frustumCulled = false;
            obj.renderOrder = 9999;
        })
    }

    //点击之后逐渐扩大的卡片动画
    CreateHistoryCard(model, position) {
        const scale = {
            x: 24,
            y: 12,
            z: 1
        }
        const Tween = new TimelineMax();
        Tween.to(model.position, 1, {
            y: position.y,
            x: position.x,
            z: position.z - 1.5,
            ease: Power0.easeNone
        })
        const Tween2 = new TimelineMax();
        Tween2.to(model.scale, 1, {
            y: scale.y,
            x: scale.x,
            z: scale.z,
            ease: Power0.easeNone
        })
    }

    //销毁动画
    DeleteHistory(model) {
        const scale = {
            x: 1,
            y: 1,
            z: 1
        }
        const Tween = new TimelineMax();
        Tween.to(model.position, 2.1, {
            y: model.OPosition.y,
            x: model.OPosition.x,
            z: model.OPosition.z,
            ease: Power0.easeNone,
            onComplete: function () {
                CurrentScene[0].remove(model);
            }
        })
        const Tween2 = new TimelineMax();
        Tween2.to(model.scale, 2, {
            y: scale.y,
            x: scale.x,
            z: scale.z,
            ease: Power0.easeNone
        })
    }

    /**
     *@----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
     */

    animate() {
        if(IsVR){
            VR.update();
        }
        else {
            state.update()
        }
        TWEEN.update()
        this.iTime.value += 0.005;
        if (this.VideoPlane)
            this.VideoPlane.material.needsUpdate = true;
        if (!this.IsComplete && this.controlsGroup?.visible) {//给出一个附加判断即可
            this.WenWuText1.visible = false;//文物详细介绍板1
            this.WenWuText2.visible = false;//文物详细介绍板2
            this.controlsGroup.visible = false;//面板管理
            this.LastText.visible = false;//下一个文物详细介绍板
            this.NextText.visible = false;//下一个文物详细介绍板
        }
        if (this.IsComplete && !this.controlsGroup?.visible) {
            this.WenWuText1.visible = true;
            this.WenWuText2.visible = true;
            this.controlsGroup.visible = true;
            this.LastText.visible = true;
            this.NextText.visible = true;
        }
        this.collider.update(CurrentCamera[0], keyStates);
        if (IsVR) {
            User.position.copy(CurrentCamera[0].position);
            User.rotation.copy(CurrentCamera[0].rotation);
            renderer.render(CurrentScene[0], UserCamera);
        } else {
            renderer.render(CurrentScene[0], CurrentCamera[0]);
        }
        // CubeCamera.update(renderer, CurrentScene[0]);

    }
}
