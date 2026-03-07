document.addEventListener('DOMContentLoaded', async function() {
  var grid = document.getElementById('updGrid');
  var loading = document.getElementById('updLoading');
  var stats = document.getElementById('updStats');
  var timestamp = document.getElementById('updTimestamp');
  var filtersContainer = document.getElementById('updFilters');

  var allItems = [];
  var activeFilter = 'all';

  try {
    var res = await fetch('/api/updates');
    if (!res.ok) throw new Error('Failed to fetch');
    allItems = await res.json();
  } catch (e) {
    loading.innerHTML = '<p style="color: rgba(255,255,255,0.4);">Unable to load updates. Please try again later.</p>';
    return;
  }

  loading.style.display = 'none';
  grid.style.display = 'grid';
  stats.style.display = 'flex';
  timestamp.style.display = 'block';

  var criticalCount = allItems.filter(function(i) { return i.severity === 'critical'; }).length;
  var sources = new Set(allItems.map(function(i) { return i.sourceIcon; }));
  document.getElementById('statTotal').textContent = allItems.length;
  document.getElementById('statCritical').textContent = criticalCount;
  document.getElementById('statSources').textContent = sources.size;

  timestamp.textContent = 'Last updated: ' + new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  });

  function renderCards(items) {
    grid.innerHTML = '';

    if (items.length === 0) {
      grid.innerHTML = '<div class="upd-empty"><p>No updates found for this source.</p></div>';
      return;
    }

    items.forEach(function(item, idx) {
      var card = document.createElement('a');
      card.href = item.link;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.className = 'upd-card';
      card.setAttribute('data-source', item.sourceIcon);

      var dateStr = '';
      if (item.pubDate) {
        var d = new Date(item.pubDate);
        if (!isNaN(d.getTime())) {
          dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
      }

      var severityHtml = '';
      if (item.severity) {
        severityHtml = '<span class="upd-severity upd-severity-' + item.severity + '">' + item.severity + '</span>';
      }

      card.innerHTML =
        '<div class="upd-card-header">' +
          '<span class="upd-source-tag upd-source-' + item.sourceIcon + '">' + item.source + '</span>' +
          severityHtml +
        '</div>' +
        '<div class="upd-card-title">' + escapeHtml(item.title) + '</div>' +
        '<div class="upd-card-desc">' + escapeHtml(item.description) + '</div>' +
        '<div class="upd-card-footer">' +
          '<span class="upd-date">' + dateStr + '</span>' +
          '<span class="upd-read-more">Read <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 5h7M5.5 2L8.5 5 5.5 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
        '</div>';

      grid.appendChild(card);

      setTimeout(function() {
        card.classList.add('is-visible');
      }, idx * 60);
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  filtersContainer.addEventListener('click', function(e) {
    var btn = e.target.closest('.upd-filter-btn');
    if (!btn) return;

    filtersContainer.querySelectorAll('.upd-filter-btn').forEach(function(b) {
      b.classList.remove('is-active');
    });
    btn.classList.add('is-active');

    activeFilter = btn.getAttribute('data-filter');
    var filtered = activeFilter === 'all'
      ? allItems
      : allItems.filter(function(item) { return item.sourceIcon === activeFilter; });

    renderCards(filtered);
  });

  renderCards(allItems);
});
