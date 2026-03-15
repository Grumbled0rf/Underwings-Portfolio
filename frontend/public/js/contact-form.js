(function() {
  var CONTACT_API = '/api/contact';
  var form = document.getElementById('contact-form');
  if (!form) return;

  // Pitstack pre-select service
  document.querySelectorAll('[data-preselect-service]').forEach(function(link) {
    link.addEventListener('click', function() {
      var serviceVal = link.getAttribute('data-preselect-service');
      var serviceDropdown = document.getElementById('service');
      if (serviceDropdown) serviceDropdown.value = serviceVal;
    });
  });

  // Staggered entrance animation
  var animTargets = form.querySelectorAll('.form-field-box, .form-fields-grid, .button');
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var delay = Array.prototype.indexOf.call(animTargets, entry.target) * 80;
          setTimeout(function() {
            entry.target.classList.add('is-visible');
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    animTargets.forEach(function(el) { observer.observe(el); });
  } else {
    animTargets.forEach(function(el) { el.classList.add('is-visible'); });
  }

  // Form submission
  var btn = document.getElementById('contact-submit-btn');

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    // Honeypot check
    if (form.querySelector('[name="website"]').value) return;

    var submitInput = form.querySelector('input[type="submit"]');
    submitInput.disabled = true;

    if (btn) btn.classList.add('is-loading');

    var data = {
      fields: [
        { name: 'firstname', value: form.querySelector('#full-name').value },
        { name: '0-2/name', value: form.querySelector('#full-name').value },
        { name: 'company', value: form.querySelector('#company').value },
        { name: 'email', value: form.querySelector('#email').value },
        { name: 'phone', value: form.querySelector('#phone').value },
        { name: 'what_can_we_help_with_', value: form.querySelector('#service').value },
        { name: 'message', value: form.querySelector('#message').value }
      ],
      context: {
        pageUri: window.location.href,
        pageName: document.title
      }
    };

    fetch(CONTACT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(function(res) {
      return res.json().then(function(body) {
        if (res.ok || res.status === 200) {
          if (btn) {
            btn.classList.remove('is-loading');
            btn.classList.add('is-success');
          }
          setTimeout(function() {
            form.style.display = 'none';
            form.parentElement.querySelector('.w-form-done').style.display = 'flex';
          }, 800);
        } else {
          throw new Error(JSON.stringify(body));
        }
      });
    })
    .catch(function(err) {
      console.error('HubSpot submit error:', err);
      if (btn) btn.classList.remove('is-loading');
      form.parentElement.querySelector('.w-form-fail').style.display = 'flex';
    })
    .finally(function() {
      submitInput.disabled = false;
    });
  });
})();
