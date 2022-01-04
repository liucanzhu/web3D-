import * as THREE from "../build/three.module.js";
import {TWEEN} from "../jsm/libs/tween.module.min.js";
//没问题
export class Map {
    constructor(scene,Points=[],RisingHeight=1,ImgUrl="./光柱.png",LightColumnGroups,LightColumnWidth =1,LightColumnHeight=2,LightColumnColor="#44ffaa",LightColumnTime =2000,LightCircleRadius = 1,LightCircleHeight =2,LightCircleColor="#44ffaa",LightCircleTime=3230) {
        this.ImgTexture = new THREE.TextureLoader().load(ImgUrl);
        this.height = LightCircleHeight;
        this.scene = scene;
        this.Points =Points;
        this.LightCircleTime = LightCircleTime;
        this.LightColumnTime =LightColumnTime
        this.LightColumnHeight=LightColumnHeight;
        this.LightColumnWidth =LightColumnWidth;
        this.LightCircleRadius =LightCircleRadius;
        this.LightColumnGroups=LightColumnGroups;
        this.RisingHeight=RisingHeight;
        this.MapGeometry = new THREE.PlaneGeometry(this.LightColumnWidth, this.LightColumnHeight);
        this.MapMaterial = new THREE.MeshBasicMaterial({
            map: this.ImgTexture,
            color: LightColumnColor,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            depthWrite: false,
        })
        this.vs =  "" +
            "attribute float a_Alpha;\n" +//
            "varying float v_Alpha;\n" +//
            "void main(){\n" +
            "   v_Alpha =a_Alpha;\n" +
            "   vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );\n" +//
            "   gl_Position = projectionMatrix * mvPosition;\n" +//
            "}\n";
        this.fs = "" +
            "precision mediump float;\n" +//
            "uniform vec3 color;\n" +//
            "varying float v_Alpha;\n" +//
            "void main(){\n" +
            "   gl_FragColor = vec4(color,v_Alpha);\n" +//
            "}\n";
        this.oCylinderGeometry = new THREE.CylinderBufferGeometry(LightCircleRadius, LightCircleRadius, this.height, 30, 30, true);
        this.oCylinderGeometry.translate(0, this.height, 0);
        this.alphaArr = [];
        this.vertices = this.oCylinderGeometry.attributes.position;
        this.len = this.vertices.count;
        for (let i = 0; i < this.len; i++) {
            this.alphaArr.push(1 - (this.vertices.getY(i)) / (this.height * 0.7));
        }
        this.oCylinderGeometry.setAttribute('a_Alpha', new THREE.BufferAttribute(new Float32Array(this.alphaArr), 1));
        this.oCylinderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: {
                    value: new THREE.Color(LightCircleColor)
                }
            },
            vertexShader: this.vs,
            fragmentShader: this.fs,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            // depthTest:false
        })
        this.LightCircle = new THREE.Mesh(this.oCylinderGeometry, this.oCylinderMaterial);
        this.LightCircle.renderOrder =10;
        this.LightColumn = new THREE.Mesh(this.MapGeometry, this.MapMaterial);
        this.LightColumn.renderOrder =100;
        // this.LightColumn.scale.set(0.6,0.6,0.6);
        this.group = new THREE.Group();
        for (let i = 0; i < this.Points.length; i++) {
            let Group = new THREE.Group();
            let LightColumn = this.LightColumn.clone();
            Group.position.copy(this.Points[i]);
            Group.position.y-=LightColumnHeight/2
            Group.add(LightColumn, LightColumn.clone().rotateY(Math.PI / 3),LightColumn.clone().rotateY(-Math.PI / 3));
            this.group.add(Group);
        }
        this.LightColumnGroups.add(this.group);
        this.scene.add(this.LightColumnGroups);
        this.initTween(this.group);
    }

    initTween (group){//创建光柱
        let TweenArray = [];
        let that =this;
        for (let i = 0; i < group.children.length; i++) {
            TweenArray.push(new TWEEN.Tween(group.children[i].position).to({y: that.LightColumnHeight/2 + that.RisingHeight}, this.LightColumnTime).onComplete(function () {
                for (let j = 0; j < 3; j++) {
                    let CyC =that.LightCircle.clone();
                    CyC.position.copy(group.children[i].position)
                    CyC.position.y -= that.LightColumnHeight;
                    CyC.scale.set(0, 0, 0)
                    that.scene.add(CyC)
                    setTimeout(() => {
                        that.initTween2(CyC);
                    }, Math.floor(that.LightCircleTime/3) * j);
                }
            }))
        }
        for (let i = 0; i < TweenArray.length - 1; i++) {
            TweenArray[i].chain(TweenArray[i + 1])
        }
        TweenArray[0].start();

    }
    initTween2(obj) {//光环动画
        let point = {
            y: 0
        };
        let tween_expend_light_ring = new TWEEN.Tween(point).to({y: 1}, this.LightCircleTime).onUpdate(function () {
            obj.scale.set(point.y, 1, point.y);
        })
        tween_expend_light_ring.repeat(Number.MAX_VALUE);//Number.MAX_VALUE表示无限循环
        tween_expend_light_ring.start();
    }
}

