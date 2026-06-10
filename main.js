// ===========================
//  NGHỀ TRADING – main.js
// ===========================

// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// Mobile menu toggle
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

// Close mobile menu when a link is clicked
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// Scroll fade-in for sections
const fadeEls = document.querySelectorAll('.pillar, .article-card, .journal-table-wrap, .signup-box, .sidebar-quote, .sidebar-stats');
fadeEls.forEach(el => el.classList.add('fade-in'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

fadeEls.forEach(el => observer.observe(el));

// Email signup
const signupBtn = document.querySelector('.btn-dark');
const emailInput = document.querySelector('.signup-box input');
if (signupBtn && emailInput) {
  signupBtn.addEventListener('click', () => {
    const email = emailInput.value.trim();
    if (!email || !email.includes('@')) {
      emailInput.style.borderColor = '#d93025';
      emailInput.focus();
      return;
    }
    emailInput.style.borderColor = '#22a047';
    signupBtn.textContent = '✓ ĐÃ ĐĂNG KÝ';
    signupBtn.disabled = true;
    signupBtn.style.background = '#22a047';
  });
  emailInput.addEventListener('input', () => {
    emailInput.style.borderColor = '';
  });
}
