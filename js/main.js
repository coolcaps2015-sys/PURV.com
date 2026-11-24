(function () {
  const $ = (s, c = document) => c.querySelector(s);

  // Build product and company cards from data.js
  const card = (title, text, url) => {
    const el = document.createElement(url ? 'a' : 'article');
    el.className = 'glass card tilt reveal';
    if (url) { el.href = url; el.target = '_blank'; el.rel = 'noopener'; }
    el.innerHTML = `<h4>${title}</h4><p>${text}</p>` + (url ? '<span class="more">Visit website</span>' : '<a class="more" href="#contact">Ask for a quote</a>');
    return el;
  };
  PRODUCTS.forEach(p => $('#productGrid').append(card(p.name, p.text)));
  COMPANIES.forEach(c => $('#companyGrid').append(card(c.name, c.text, c.url)));
  $('#productSelect').innerHTML = '<option value="">Select a product</option>' + PRODUCTS.map(p => `<option>${p.name}</option>`).join('') + '<option>Other</option>';
  $('#year').textContent = new Date().getFullYear();

  // Page-load sequence
  addEventListener('load', () => setTimeout(() => document.body.classList.add('ready'), 150));

  // Scroll reveal
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((el, i) => { el.style.transitionDelay = (i % 4) * 80 + 'ms'; io.observe(el); });

  // Nav, progress bar, mobile menu
  const nav = $('#nav'), bar = $('#progress'), menu = $('#menu'), burger = $('#burger');
  addEventListener('scroll', () => {
    nav.classList.toggle('solid', scrollY > 40);
    bar.style.transform = `scaleX(${scrollY / (document.documentElement.scrollHeight - innerHeight || 1)})`;
  }, { passive: true });
  burger.onclick = () => { const o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o); };
  menu.addEventListener('click', e => { if (e.target.tagName === 'A') { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); } });

  // 3D tilt on cards (pointer devices only)
  if (matchMedia('(hover:hover)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.addEventListener('pointermove', e => {
      const c = e.target.closest && e.target.closest('.tilt');
      document.querySelectorAll('.tilt.on').forEach(x => { if (x !== c) { x.classList.remove('on'); x.style.transform = ''; } });
      if (!c) return;
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      c.classList.add('on'); c.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg) translateZ(10px)`;
    });
  }

  // Lead form. Currently opens the visitor's email app addressed to info@purv.in.
  // For production, replace with a POST to your backend, Formspree or Google Apps Script.
  const form = $('#leadForm'), note = $('#formNote');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    form.querySelectorAll('[required]').forEach(i => i.classList.toggle('bad', !i.value.trim()));
    if (!d.name.trim() || !/^\S+@\S+\.\S+$/.test(d.email)) { note.textContent = 'Please enter your name and a valid email address.'; return; }
    const body = `Name: ${d.name}\nCompany: ${d.company}\nEmail: ${d.email}\nPhone: ${d.phone}\nCountry: ${d.country}\nProduct: ${d.product}\n\n${d.message}`;
    location.href = `mailto:info@purv.in?subject=${encodeURIComponent('Website enquiry: ' + (d.product || 'General'))}&body=${encodeURIComponent(body)}`;
    note.textContent = 'Opening your email app with the enquiry filled in.';
  });
})();
