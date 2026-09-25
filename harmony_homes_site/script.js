
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
if (menuToggle && nav) {
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });
}

const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  const button = contactForm.querySelector('button[type="submit"]');
  const status = contactForm.querySelector('.form-status');
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (button.disabled || !contactForm.reportValidity()) return;
    button.disabled = true;
    button.textContent = 'SENDING…';
    contactForm.setAttribute('aria-busy', 'true');
    status.dataset.state = 'pending';
    status.textContent = 'Sending your message. Please keep this page open.';
    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(contactForm))),
        signal: AbortSignal.timeout(90000)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to send your message. Please try again later.');
      status.dataset.state = 'success';
      status.textContent = result.message;
      contactForm.reset();
    } catch (error) {
      status.dataset.state = 'error';
      status.textContent = error.name === 'Error' ? error.message :
        'We could not confirm your submission. Please try later or call 844-227-3701. Your answers are still here.';
    } finally {
      button.disabled = false;
      button.textContent = 'SEND MESSAGE';
      contactForm.removeAttribute('aria-busy');
    }
  });
}
