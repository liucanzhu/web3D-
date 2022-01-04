import * as THREE from "../build/three.module.js";

export class Cylinder {
    constructor(args) {
        this.TopRadius = args.TopRadius ?? 3;
        this.BottomRadius = args.BottomRadius ?? 3;
        this.translate = args.translate ?? new THREE.Vector3(0,0,0);
        this.width = args.width ?? 5;
        this.height = args.height ?? 5;
        this.fs = "" +
            "precision mediump float;\n" +
            "uniform vec3 color;\n" +
            "uniform float iTime;\n" +
            "uniform float u_width;\n" +
            "uniform float u_height;\n" +
            "varying float v_Alpha;\n" +
            "void main(){\n" +
            "   vec2 uv = vec2(gl_FragCoord.x/u_width,gl_FragCoord.y/u_height);\n" +
            "   vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));\n" +
            "   vec4 fragColor = vec4(col,v_Alpha);\n" +
            "   gl_FragColor = fragColor;\n" +//
            "}\n";
        this.vs = "" +
            "attribute float a_Alpha;\n" +//
            "varying float v_Alpha;\n" +//
            "void main(){\n" +
            "   v_Alpha =a_Alpha;\n" +
            "   vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );\n" +//
            "   gl_Position = projectionMatrix * mvPosition;\n" +//
            "}\n";
    }

    CreateCylinder(time,position=new THREE.Vector3(),name="") {
        const that = this;
        that.geometry = new THREE.CylinderBufferGeometry(that.TopRadius, that.BottomRadius, that.height, 30, 30, true);
        that.geometry.translate(0, that.height, 0);
        that.geometry.translate(that.translate.x,that.translate.y,that.translate.z);
        that.alphaArr = [];
        that.vertices = this.geometry.attributes.position;
        that.len = this.vertices.count;
        for (let i = 0; i < this.len; i++) {
            this.alphaArr.push(1 - (this.vertices.getY(i)) / (that.height));
        }
        that.geometry.setAttribute('a_Alpha', new THREE.BufferAttribute(new Float32Array(this.alphaArr), 1));
        that.material = new THREE.ShaderMaterial({
            uniforms: {
                color: {
                    value: new THREE.Color("#00ffff")
                },
                iTime: time,
                u_width: {
                    type: 'f',
                    value: window.innerWidth
                },
                u_height: {
                    type: 'f',
                    value: window.innerHeight
                }
            },
            vertexShader: that.vs,
            fragmentShader: that.fs,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
        })
        that.LightCircle = new THREE.Mesh(that.geometry, that.material);
        that.LightCircle.position.copy(position);
        that.LightCircle.name = name;
        return that.LightCircle;
    }
}


