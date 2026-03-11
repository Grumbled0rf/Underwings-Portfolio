(function() {
  var form = document.getElementById('lead-magnet-form');
  if (!form) return;
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var email = document.getElementById('lead-magnet-email').value;
    var btn = document.getElementById('lead-magnet-submit');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    var data = {
      fields: [
        { name: 'email', value: email }
      ],
      context: {
        pageUri: window.location.href,
        pageName: 'Homepage - Lead Magnet'
      }
    };

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(function(res) {
      if (res.ok || res.status === 200) {
        form.style.display = 'none';
        document.querySelector('.lead-magnet-note').style.display = 'none';
        document.getElementById('lead-magnet-success').style.display = 'block';
      } else {
        throw new Error('Submit failed');
      }
    })
    .catch(function() {
      document.getElementById('lead-magnet-error').style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Download Free';
    });
  });
})();
