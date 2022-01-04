export const DeepMapGLSL = {
    vs: `
        varying vec2 newuv;
        void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            newuv =uv;
        }
        `,
    fs: `
        precision mediump float;
        varying vec2 newuv;
        uniform sampler2D texture2;
        uniform float iTime;
        float random(in vec2 _st) {
        return fract(sin(dot(_st.xy, vec2(12.9898, 78.233))) *
        43758.5453123);
    }
        float noise(in vec2 _st) {
        vec2 i = floor(_st);
        vec2 f = fract(_st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
    
        vec2 u = f * f * (3.0 - 2.0 * f);
    
        return mix(a, b, u.x) +
        (c - a) * u.y * (1.0 - u.x) +
        (d - b) * u.x * u.y;
    }
        vec2 random2(in vec2 _st) {
        _st = vec2(dot(_st, vec2(127.326, 321.324)), dot(_st, vec2(15.31, 45.332)));
        return 2.0 * fract(sin(_st) * 432.23) + 1.0; //1.0 ~ 3.0
    }
        float snoise(vec2 st) { //Gradient Noise
        vec2 i = fract(st);//取小数
        vec2 k = floor(st);//向负无穷取整
        vec2 u = i * i * (3.0 - 2.0 * i);//插值函数
        return mix(mix(dot(random2(k + vec2(0.0, 0.0)), i - vec2(0.0, 0.0)), dot(random2(k + vec2(0.0, 1.0)), i - vec2(0.0, 1.0)), u.y), mix(dot(random2(k + vec2(1.0, 0.0)), i - vec2(1.0, 0.0)), dot(random2(k + vec2(1.0, 1.0)), i - vec2(1.0, 1.0)), u.y), u.x);//二维noise
    }
        #define FBM_COUNT 5
    
        float fbm(vec2 st) {
    
        float result = 0.0;//输出值
        float A = 0.5;//振幅
        mat2 rotate = mat2(cos(0.5), sin(0.5),//旋转矩阵
        -sin(0.5), cos(0.5));
        for(int i = 0; i < FBM_COUNT; i++) {//分型布朗运动核心
        result += A * noise(st);
        st *= 2.;//频率2倍
        st *= rotate;
        A *= 0.5;//振幅1/2倍
    }
        return result;
    }
        void main() {
        vec2 nuv = 3. * newuv;
        vec2 st = vec2(0.0);
        st.x = fbm(nuv + iTime * 0.112);
        st.y = fbm(nuv);
        vec2 st2 = vec2(0.0);
        st2.x = fbm(st + nuv + iTime * 0.15);
        st2.y = fbm(st + nuv + iTime * 0.26);
        float f = fbm(st + st2);
        vec3 color = vec3(clamp(f * f, 0.0, 1.0), clamp(mix(0.6784, 0.6345, f * f * (f - 2.0)), 0.0, 1.0), clamp(f * f * 4.0, 0.0, 1.0));
        color = mix(color, vec3(0.1543, 0.4345, 0.7533), f * f * 0.76);
        color = mix(color, vec3(0.68777, 0.0, 0.7), clamp(length(st2.x), 0.0, 1.0));
        color = mix(color, vec3(0.1543, 1., 1.), clamp(length(st), 0.0, 1.0));
        gl_FragColor =  vec4( 0.5 + (f * f * f + .6 * f * f + .5 * f) * color, 1.0)*texture(texture2,(st2 + nuv)/3.0) ;
    }
            `,
    uniforms: {}
}
