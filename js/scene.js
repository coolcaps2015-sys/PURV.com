// Fullscreen 3D space background: realistic solar system fly-through.
// Scrolling moves the camera past the Sun and each planet, one by one.
(function () {
  const canvas = document.getElementById('bg');
  if (!window.THREE || !canvas) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04050e, 0.008);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
  camera.position.z = 6;
  scene.add(camera);

  const loader = new THREE.TextureLoader();
  // Loads a texture and hands it over; if the file is missing the planet keeps its base colour.
  const load = (file, srgb, cb) => loader.load('img/' + file, t => { if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = aniso; cb(t); }, undefined, () => {});

  function radial(stops) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(s => g.addColorStop(s[0], s[1]));
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  }
  const dot = radial([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.8)'], [1, 'rgba(255,255,255,0)']]);

  // Round, soft stars in three layers
  function stars(count, size, color, spread) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { pos[i * 3] = (Math.random() - 0.5) * spread; pos[i * 3 + 1] = (Math.random() - 0.5) * spread; pos[i * 3 + 2] = 40 - Math.random() * 320; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size, color, map: dot, transparent: true, depthWrite: false, alphaTest: 0.01 }));
    scene.add(p); return p;
  }
  const layers = [stars(4000, 0.5, 0xffffff, 150), stars(1200, 0.8, 0x9fd8ff, 120), stars(500, 1.0, 0xffd9a0, 110)];

  // Faint nebula clouds along the flight path add depth
  [[0x5b3df5, -30, 14, -40], [0x1fa8d8, 34, -16, -80], [0xb03ad0, -36, -10, -120], [0x2d6bff, 30, 18, -160], [0xe0602a, -28, 12, -200]].forEach(n => {
    const c = new THREE.Color(n[0]), css = `${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0}`;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial([[0, `rgba(${css},.35)`], [0.5, `rgba(${css},.1)`], [1, `rgba(${css},0)`]]), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    s.position.set(n[1], n[2], n[3]); s.scale.setScalar(110); scene.add(s);
  });

  // Sunlight comes from one side so each planet has a real day side and night side
  scene.add(new THREE.AmbientLight(0x2a3355, 0.5));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.4); sun.position.set(-8, 5, 7);
  const fill = new THREE.DirectionalLight(0x4a7bff, 0.25); fill.position.set(8, -3, 2);
  camera.add(sun, fill);

  // Soft glowing edge for atmospheres
  function atmosphere(r, color, power, scale) {
    return new THREE.Mesh(new THREE.SphereGeometry(r * scale, 48, 48), new THREE.ShaderMaterial({
      uniforms: { c: { value: new THREE.Color(color) }, p: { value: power } },
      vertexShader: 'varying vec3 n;void main(){n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'uniform vec3 c;uniform float p;varying vec3 n;void main(){float i=pow(max(0.0,0.72-dot(n,vec3(0.0,0.0,1.0))),p);gl_FragColor=vec4(c*i*2.0,i);}',
      side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
    }));
  }

  // name, radius, texture file, base colour, axial tilt, atmosphere colour
  const DEF = [
    ['Sun', 5, 'sunmap.jpg', 0xffaa33, 0.1, null],
    ['Mercury', 0.9, 'mercurymap.jpg', 0x8c8279, 0.0, null],
    ['Venus', 1.5, 'venusmap.jpg', 0xd9b36c, 0.05, 0xffc98a],
    ['Earth', 1.7, 'earthmap1k.jpg', 0x2255aa, 0.41, 0x4aa8ff],
    ['Mars', 1.2, 'marsmap1k.jpg', 0xb5532f, 0.44, 0xff8a5c],
    ['Jupiter', 3.4, 'jupitermap.jpg', 0xc9a27a, 0.05, 0xffddbb],
    ['Saturn', 2.8, 'saturnmap.jpg', 0xd9c38a, 0.47, 0xffeebb],
    ['Uranus', 2, 'uranusmap.jpg', 0x8fdde0, 1.4, 0x8fefff],
    ['Neptune', 2, 'neptunemap.jpg', 0x2f55d6, 0.5, 0x4d6bff]
  ];
  // Your own PNG/WebP planet photos. file, share of the image width that the planet disc fills.
  const PHOTO = { Sun: ['sun.webp', 0.82], Venus: ['venus.webp', 1], Earth: ['earth.webp', 1], Jupiter: ['jupiter.webp', 1], Neptune: ['neptune.webp', 1], Uranus: ['uranus.webp', 1] };
  const GAP = 22, START = -8, planets = [];
  let moon = null;

  DEF.forEach((d, i) => {
    const name = d[0], r = d[1], g = new THREE.Group();
    const photo = PHOTO[name];
    if (photo) {
      const sm = new THREE.SpriteMaterial({ transparent: true, depthWrite: false });
      const sprite = new THREE.Sprite(sm); sprite.renderOrder = 2;
      const size = (r * 2) / photo[1];
      sprite.scale.set(size, size, 1);
      load(photo[0], true, t => { sm.map = t; sm.needsUpdate = true; sprite.scale.set(size, size * t.image.height / t.image.width, 1); });
      if (name === 'Sun') {
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial([[0, 'rgba(255,200,110,.55)'], [0.4, 'rgba(255,120,30,.2)'], [1, 'rgba(255,80,0,0)']]), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
        glow.scale.setScalar(r * 6); glow.renderOrder = 1; g.add(glow);
      } else {
        const a = atmosphere(r, d[5], name === 'Earth' ? 3.2 : 4.5, 1.16); a.renderOrder = 1; g.add(a);
      }
      g.add(sprite);
      if (name === 'Earth') {
        const mm = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 1 });
        load('mercurymap.jpg', true, t => { mm.map = t; mm.color.set(0xbbbbbb); mm.needsUpdate = true; });
        moon = new THREE.Mesh(new THREE.SphereGeometry(0.45, 48, 48), mm); g.add(moon);
      }
      g.position.z = START - i * GAP;
      g.userData = { mesh: new THREE.Object3D(), sprite, base: size, side: i % 2 ? -1 : 1, name, z: g.position.z, r, spin: 0 };
      g.scale.setScalar(reduce ? 1 : 0.001); scene.add(g); planets.push(g);
      return;
    }
    const geo = new THREE.SphereGeometry(r, 96, 96);
    let mat;
    if (name === 'Sun') mat = new THREE.MeshBasicMaterial({ color: d[3] });
    else if (name === 'Earth') mat = new THREE.MeshPhongMaterial({ color: d[3], specular: 0x333333, shininess: 14 });
    else mat = new THREE.MeshStandardMaterial({ color: d[3], roughness: 0.95, metalness: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    load(d[2], true, t => { mat.map = t; mat.color.set(name === 'Sun' ? 0xffd9a0 : 0xffffff); mat.needsUpdate = true; });

    if (name === 'Sun') {
      g.add(atmosphere(r, 0xff8a1f, 2.2, 1.35), atmosphere(r, 0xffc060, 3.5, 1.12));
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial([[0, 'rgba(255,230,170,.9)'], [0.3, 'rgba(255,150,40,.35)'], [1, 'rgba(255,90,0,0)']]), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      glow.scale.setScalar(r * 6); g.add(glow);
    } else {
      g.add(atmosphere(r, d[5], name === 'Earth' ? 3.2 : 4.5, 1.16));
    }
    if (name === 'Earth') {
      load('earthbump1k.jpg', false, t => { mat.bumpMap = t; mat.bumpScale = 0.04; mat.needsUpdate = true; });
      load('earthspec1k.jpg', false, t => { mat.specularMap = t; mat.needsUpdate = true; });
      const cm = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
      load('earthcloudmap.jpg', false, t => { cm.alphaMap = t; cm.needsUpdate = true; });
      const clouds = new THREE.Mesh(new THREE.SphereGeometry(r * 1.012, 64, 64), cm); mesh.add(clouds); mesh.userData.clouds = clouds;
      // The Moon
      const mm = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 1 });
      load('mercurymap.jpg', true, t => { mm.map = t; mm.color.set(0xbbbbbb); mm.needsUpdate = true; });
      moon = new THREE.Mesh(new THREE.SphereGeometry(0.45, 48, 48), mm); g.add(moon);
    }
    if (name === 'Saturn') {
      const inner = r * 1.3, outer = r * 2.3, rg = new THREE.RingGeometry(inner, outer, 160, 1);
      const pos = rg.attributes.position, uv = rg.attributes.uv, v = new THREE.Vector3();
      for (let k = 0; k < pos.count; k++) { v.fromBufferAttribute(pos, k); uv.setXY(k, (v.length() - inner) / (outer - inner), 1); }
      const rm = new THREE.MeshBasicMaterial({ color: 0xdddddd, side: THREE.DoubleSide, transparent: true, depthWrite: false });
      load('saturnringcolor.jpg', true, t => { rm.map = t; rm.needsUpdate = true; });
      load('saturnringpattern.gif', false, t => { rm.alphaMap = t; rm.needsUpdate = true; });
      const ring = new THREE.Mesh(rg, rm); ring.rotation.x = Math.PI / 2; mesh.add(ring);
    }
    mesh.rotation.z = d[4]; g.add(mesh);
    g.position.z = START - i * GAP;
    g.userData = { mesh, side: i % 2 ? -1 : 1, name, z: g.position.z, r, spin: name === 'Jupiter' || name === 'Saturn' ? 0.16 : 0.07 };
    g.scale.setScalar(reduce ? 1 : 0.001); scene.add(g); planets.push(g);
  });

  const END = planets[planets.length - 1].position.z + 12;
  const tag = document.getElementById('planetTag');
  let mx = 0, my = 0, cur = 0, shown = '', xo = 4;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    xo = Math.min(5.2, 2.6 * Math.max(camera.aspect, 0.5)); // keep planets in view on narrow screens
  }
  addEventListener('resize', resize); resize();
  const clock = new THREE.Clock();

  (function loop() {
    const t = clock.getElapsedTime();
    const max = document.documentElement.scrollHeight - innerHeight;
    cur += ((max > 0 ? scrollY / max : 0) - cur) * 0.06;
    camera.position.z = 6 + (END - 6) * cur;
    camera.position.x += (mx * 1.6 - camera.position.x) * 0.04;
    camera.position.y += (-my * 1.2 - camera.position.y) * 0.04;
    camera.rotation.z = Math.sin(cur * 6) * 0.04;
    layers.forEach((l, i) => { l.rotation.z = t * 0.004 * (i + 1); });

    let near = null, best = 1e9;
    planets.forEach(p => {
      const u = p.userData;
      p.position.x = u.side * (xo + u.r * 0.6);
      p.position.y = Math.sin(t * 0.5 + u.z) * 0.25;
      if (!reduce) { u.mesh.rotation.y = t * u.spin; if (u.mesh.userData.clouds) u.mesh.userData.clouds.rotation.y = t * 0.03; }
      if (u.sprite && !reduce) { u.sprite.material.rotation = Math.sin(t * 0.15 + u.z) * 0.06; if (u.name === 'Sun') u.sprite.scale.multiplyScalar(1 + Math.sin(t * 0.8) * 0.0006); }
      const s = p.scale.x; if (s < 1) p.scale.setScalar(Math.min(1, s + 0.015));
      const d = Math.abs(camera.position.z - u.z); if (d < best) { best = d; near = u.name; }
    });
    if (moon && !reduce) moon.position.set(Math.cos(t * 0.4) * 3.2, Math.sin(t * 0.4) * 0.5, Math.sin(t * 0.4) * 3.2);
    else if (moon) moon.position.set(3.2, 0.3, 0);
    if (tag && near !== shown) { shown = near; tag.classList.remove('on'); setTimeout(() => { tag.textContent = near; tag.classList.add('on'); }, 150); }
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();
})();
