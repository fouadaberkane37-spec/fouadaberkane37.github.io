/* ============================================================
   Groupe WMB — main.js
   Vanilla JS — no jQuery, no API keys exposed
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ── Mobile navbar toggle ─────────────────────────────────── */
  const toggle = document.getElementById('navToggle');
  const mobileNav = document.getElementById('mobileNav');

  if (toggle && mobileNav) {
    toggle.addEventListener('click', function () {
      const open = mobileNav.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open);
    });
  }

  /* ── Mobile sub-menu toggles ──────────────────────────────── */
  document.querySelectorAll('.mobile-dropdown-trigger').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const submenu = btn.nextElementSibling;
      if (submenu) submenu.classList.toggle('open');
    });
  });

  /* ── Desktop dropdown keyboard accessibility ──────────────── */
  document.querySelectorAll('.dropdown').forEach(function (dd) {
    const trigger = dd.querySelector('.nav-link');
    if (trigger) {
      trigger.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          dd.classList.toggle('open');
        }
        if (e.key === 'Escape') dd.classList.remove('open');
      });
    }
  });

  /* Close dropdown when clicking outside */
  document.addEventListener('click', function (e) {
    document.querySelectorAll('.dropdown.open').forEach(function (dd) {
      if (!dd.contains(e.target)) dd.classList.remove('open');
    });
  });

  /* ── FAQ accordion ────────────────────────────────────────── */
  document.querySelectorAll('.faq-question').forEach(function (q) {
    q.addEventListener('click', function () {
      const item = q.closest('.faq-item');
      const isOpen = item.classList.contains('open');

      /* Close all */
      document.querySelectorAll('.faq-item.open').forEach(function (open) {
        open.classList.remove('open');
      });

      /* Toggle clicked item */
      if (!isOpen) item.classList.add('open');
    });
  });

  /* ── Contact form (static / no API key) ──────────────────── */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      /* TODO: configurer l'intégration backend ici — ne pas exposer de clé API.
         Options recommandées :
           - Netlify Forms : ajouter netlify à l'attribut <form netlify>
           - Formspree : changer action="https://formspree.io/f/VOTRE_ID"
           - EmailJS (clé dans .env côté serveur, jamais ici)
         En attendant, le formulaire utilise l'action mailto: comme fallback.
      */

      /* Validation simple */
      const phone = contactForm.querySelector('[name="phone"]');
      if (phone && phone.value.replace(/\D/g, '').length < 10) {
        e.preventDefault();
        phone.setCustomValidity('Veuillez entrer un numéro de téléphone valide (10 chiffres).');
        phone.reportValidity();
        return;
      }

      const success = document.getElementById('formSuccess');
      if (success) {
        /* Only show if not using real backend */
        if (!contactForm.action || contactForm.action.includes('mailto')) {
          e.preventDefault();
          success.style.display = 'block';
          contactForm.reset();
          success.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });

    /* Reset custom validity on input */
    contactForm.querySelectorAll('input, select, textarea').forEach(function (el) {
      el.addEventListener('input', function () {
        el.setCustomValidity('');
      });
    });
  }

  /* ── Smooth scroll for anchor links ─────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 80; /* sticky header height */
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

  /* ── Active nav link ────────────────────────────────────── */
  (function () {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    document.querySelectorAll('.navbar-nav a').forEach(function (link) {
      const href = link.getAttribute('href').replace(/\/$/, '') || '/';
      if (href === path || (href !== '' && path.startsWith(href) && href !== '/')) {
        link.classList.add('active');
      }
    });
  })();

  /* ── Tel link formatting helper ─────────────────────────── */
  document.querySelectorAll('.tel-link').forEach(function (el) {
    el.setAttribute('href', 'tel:5145597007');
  });

});
