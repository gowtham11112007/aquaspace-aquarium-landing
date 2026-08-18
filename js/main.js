/**
 * RAINBOW AQUARIUM & PETS — MAIN JAVASCRIPT
 * Handles navigation, mobile drawer, scroll reveals, smooth interactions,
 * and Web Audio procedural aquatic feedback.
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initScrollAnimations();
  initAudioAmbience();
  initContactPlaceholders();
});

/* --------------------------------------------------
   1. NAVIGATION & MOBILE DRAWER
   -------------------------------------------------- */
function initNavigation() {
  const header = document.querySelector('.site-header');
  const mobileToggle = document.querySelector('.mobile-toggle');
  const mobileDrawer = document.querySelector('.mobile-menu-drawer');
  const mobileClose = document.querySelector('.mobile-menu-close');
  const navLinks = document.querySelectorAll('.nav-link');

  // Sticky header on scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
  }, { passive: true });

  // Mobile menu open / close
  const openMenu = () => {
    mobileDrawer?.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeMenu = () => {
    mobileDrawer?.classList.remove('open');
    document.body.style.overflow = '';
  };

  mobileToggle?.addEventListener('click', openMenu);
  mobileClose?.addEventListener('click', closeMenu);

  // Close drawer when clicking any link
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
      playBubbleSound();
    });
  });
}

/* --------------------------------------------------
   2. SCROLL REVEAL (Intersection Observer)
   -------------------------------------------------- */
function initScrollAnimations() {
  const revealElements = document.querySelectorAll('.reveal-fade-up');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(el => observer.observe(el));
}

/* --------------------------------------------------
   3. WEB AUDIO API SYNTHESIZER (Aquatic feedback)
   -------------------------------------------------- */
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playBubbleSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const startFreq = 300 + Math.random() * 200;
    const endFreq = startFreq + 400 + Math.random() * 200;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // Gracefully handle browser autoplay policies
  }
}

function initAudioAmbience() {
  // Attach bubble sound to button presses
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', () => playBubbleSound());
  });

  // Sound toggle button in header if present
  const soundToggle = document.getElementById('soundToggle');
  if (soundToggle) {
    soundToggle.addEventListener('click', () => {
      playBubbleSound();
    });
  }
}

/* --------------------------------------------------
   4. CONTACT BUTTON CLICKS & PLACEHOLDER HANDLERS
   -------------------------------------------------- */
function initContactPlaceholders() {
  const phoneNumbers = document.querySelectorAll('[data-action="call"]');
  const whatsappButtons = document.querySelectorAll('[data-action="whatsapp"]');
  const directionsButtons = document.querySelectorAll('[data-action="directions"]');

  phoneNumbers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Default tel link is in href, bubble sound plays on click
      playBubbleSound();
    });
  });

  whatsappButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      playBubbleSound();
    });
  });

  directionsButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      playBubbleSound();
    });
  });
}
