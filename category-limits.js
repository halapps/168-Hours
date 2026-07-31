(function () {
  'use strict';

  var LIMITS_KEY = '168hours-category-limits-v1';
  var GOALS_KEY = '168hours-category-goals-v1';
  var wrapped = false;
  var limitGuardBound = false;

  function safeParse(json, fallback) {
    try {
      return JSON.parse(json);
    } catch (_) {
      return fallback;
    }
  }

  function loadLimits() {
    var raw = localStorage.getItem(LIMITS_KEY);
    var parsed = raw ? safeParse(raw, {}) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.keys(parsed).reduce(function (acc, key) {
      var value = Number(parsed[key]);
      if (Number.isFinite(value) && value >= 0) {
        acc[key] = Math.round(value * 4) / 4;
      }
      return acc;
    }, {});
  }

  function saveLimits(limits) {
    try {
      localStorage.setItem(LIMITS_KEY, JSON.stringify(limits));
    } catch (_) {
      /* ignore storage failures */
    }
  }

  function loadGoals() {
    var raw = localStorage.getItem(GOALS_KEY);
    var parsed = raw ? safeParse(raw, {}) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.keys(parsed).reduce(function (acc, key) {
      var value = Number(parsed[key]);
      if (Number.isFinite(value) && value >= 0) {
        acc[key] = Math.round(value * 4) / 4;
      }
      return acc;
    }, {});
  }

  function saveGoals(goals) {
    try {
      localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    } catch (_) {
      /* ignore storage failures */
    }
  }

  function getActiveLimits() {
    var limits = loadLimits();
    var validIds = new Set(((window.Y && window.Y.categories) || []).map(function (category) {
      return category && category.id;
    }).filter(Boolean));

    var changed = false;
    Object.keys(limits).forEach(function (id) {
      if (!validIds.has(id)) {
        delete limits[id];
        changed = true;
      }
    });
    if (changed) saveLimits(limits);
    return limits;
  }

  function getActiveGoals() {
    var goals = loadGoals();
    var validIds = new Set(((window.Y && window.Y.categories) || []).map(function (category) {
      return category && category.id;
    }).filter(Boolean));

    var changed = false;
    Object.keys(goals).forEach(function (id) {
      if (!validIds.has(id)) {
        delete goals[id];
        changed = true;
      }
    });
    if (changed) saveGoals(goals);
    return goals;
  }

  function formatLimitHours(hours) {
    if (!Number.isFinite(hours)) return 'Limit';
    var normalized = Math.round(hours * 4) / 4;
    return normalized % 1 === 0 ? normalized + 'h' : normalized.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + 'h';
  }

  function getPercent(current, limit) {
    if (!Number.isFinite(limit) || limit <= 0) return 0;
    return Math.max(0, Math.min(1, current / limit));
  }

  function getProgressColor(progress) {
    if (progress >= 1) return '#dc2626';
    if (progress >= 0.6) return '#eab308';
    return '#16a34a';
  }

  function getGoalProgressColor(progress) {
    if (progress >= 1) return '#7c3aed';
    if (progress >= 0.71) return '#16a34a';
    if (progress >= 0.51) return '#eab308';
    if (progress >= 0.31) return '#f97316';
    return '#dc2626';
  }

  function getCellChunks(state, index) {
    var chunkCount = (state && state.cellChunks && state.cellChunks[index]) || 1;
    var baseValue = (state && state.grid && state.grid[index]) || 'unassigned';
    var chunks = chunkCount === 1
      ? [baseValue]
      : ((state && state.gridChunks && Array.isArray(state.gridChunks[index])) ? state.gridChunks[index].slice(0, chunkCount) : [baseValue]);

    while (chunks.length < chunkCount) chunks.push(baseValue);
    return {
      chunkCount: chunkCount,
      chunks: chunks
    };
  }

  function getScheduledHours(state, categoryId) {
    if (!state || !Array.isArray(state.grid) || !categoryId || categoryId === 'unassigned') return 0;

    var total = 0;
    for (var index = 0; index < state.grid.length; index += 1) {
      var cell = getCellChunks(state, index);
      var perChunk = 1 / cell.chunkCount;
      for (var chunkIndex = 0; chunkIndex < cell.chunkCount; chunkIndex += 1) {
        if ((cell.chunks[chunkIndex] || 'unassigned') === categoryId) {
          total += perChunk;
        }
      }
    }
    return Math.round(total * 1000) / 1000;
  }

  function getProjectedIncrease(state, categoryId, target) {
    if (!state || !target || !categoryId || categoryId === 'unassigned') return 0;

    var index = Number(target.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= 168) return 0;

    var cell = getCellChunks(state, index);
    var perChunk = 1 / cell.chunkCount;
    var chunkIndex = target.dataset.chunkIndex !== undefined ? Number(target.dataset.chunkIndex) : null;

    if (Number.isInteger(chunkIndex) && chunkIndex >= 0 && chunkIndex < cell.chunkCount) {
      return (cell.chunks[chunkIndex] || 'unassigned') === categoryId ? 0 : perChunk;
    }

    var increase = 0;
    for (var i = 0; i < cell.chunkCount; i += 1) {
      if ((cell.chunks[i] || 'unassigned') !== categoryId) {
        increase += perChunk;
      }
    }
    return Math.round(increase * 1000) / 1000;
  }

  function shouldBlockPlacement(target) {
    if (!window.Y || !target) return false;
    if (window.Y.eraserMode) return false;

    var categoryId = window.Y.activeCategoryId || 'unassigned';
    if (!categoryId || categoryId === 'unassigned') return false;

    var limit = getActiveLimits()[categoryId];
    if (!Number.isFinite(limit)) return false;

    var increase = getProjectedIncrease(window.Y, categoryId, target);
    if (increase <= 0) return false;

    var currentHours = getScheduledHours(window.Y, categoryId);
    return currentHours + increase > limit + 1e-9;
  }

  function blockEventIfLimited(event) {
    var target = event.target && event.target.closest ? event.target.closest('.cell,.cell-chunk') : null;
    if (!target) return;
    if (!shouldBlockPlacement(target)) return;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
  }

  function refreshLimitButtons() {
    var limits = getActiveLimits();
    var goals = getActiveGoals();
    Array.from(document.querySelectorAll('.category-limit')).forEach(function (button) {
      var categoryId = button.getAttribute('data-id');
      var limit = limits[categoryId];
      var goal = goals[categoryId];
      var row = button.closest('.category-item');
      var existingIndicator = row ? row.querySelector('.category-limit-progress') : null;
      var existingGoalIndicator = row ? row.querySelector('.category-goal-progress') : null;
      var goalButton = row ? row.querySelector('.category-goal') : null;

      if (Number.isFinite(limit)) {
        var currentHours = getScheduledHours(window.Y, categoryId);
        var progress = getPercent(currentHours, limit);

        button.style.display = '';
        button.textContent = formatLimitHours(limit);
        button.title = 'Weekly limit: ' + formatLimitHours(limit) + ' (click to edit)';
        button.classList.add('active');

        if (row && !existingIndicator) {
          existingIndicator = document.createElement('span');
          existingIndicator.className = 'category-limit-progress';
          existingIndicator.setAttribute('aria-hidden', 'true');
          row.appendChild(existingIndicator);
        }

        if (existingIndicator) {
          row.appendChild(existingIndicator);
          existingIndicator.style.setProperty('--limit-progress', String(progress));
          existingIndicator.style.setProperty('--limit-progress-color', getProgressColor(progress));
          existingIndicator.title = (
            Math.round(currentHours * 100) / 100
          ) + 'h of ' + formatLimitHours(limit);
        }
        if (existingGoalIndicator) existingGoalIndicator.remove();
        if (goalButton) goalButton.remove();
      } else {
        button.textContent = 'Limit';
        button.title = 'Set weekly limit';
        button.classList.remove('active');
        if (existingIndicator) existingIndicator.remove();

        if (row && !goalButton) {
          goalButton = document.createElement('button');
          goalButton.type = 'button';
          goalButton.className = 'category-goal';
          goalButton.setAttribute('data-id', categoryId);
          button.insertAdjacentElement('afterend', goalButton);
        }

        if (goalButton) {
          goalButton.setAttribute('data-id', categoryId);
          if (Number.isFinite(goal)) {
            var currentGoalHours = getScheduledHours(window.Y, categoryId);
            var goalProgress = getPercent(currentGoalHours, goal);

            button.style.display = 'none';
            goalButton.textContent = formatLimitHours(goal);
            goalButton.title = 'Weekly goal: ' + formatLimitHours(goal) + ' (click to edit)';
            goalButton.classList.add('active');

            if (row && !existingGoalIndicator) {
              existingGoalIndicator = document.createElement('span');
              existingGoalIndicator.className = 'category-goal-progress';
              existingGoalIndicator.setAttribute('aria-hidden', 'true');
              row.appendChild(existingGoalIndicator);
            }

            if (existingGoalIndicator) {
              row.appendChild(existingGoalIndicator);
              existingGoalIndicator.style.setProperty('--goal-progress', String(goalProgress));
              existingGoalIndicator.style.setProperty('--goal-progress-color', getGoalProgressColor(goalProgress));
              existingGoalIndicator.title = (
                Math.round(currentGoalHours * 100) / 100
              ) + 'h of ' + formatLimitHours(goal);
            }
          } else {
            button.style.display = '';
            goalButton.textContent = 'Goal';
            goalButton.title = 'Set weekly goal';
            goalButton.classList.remove('active');
            if (existingGoalIndicator) existingGoalIndicator.remove();
          }
        } else {
          button.style.display = '';
        }
      }
    });
  }

  function promptForLimit(categoryId) {
    if (!window.Y || !Array.isArray(window.Y.categories)) return;

    var category = window.Y.categories.find(function (item) {
      return item && item.id === categoryId;
    });
    if (!category) return;

    var limits = getActiveLimits();
    var currentLimit = limits[categoryId];
    var input = window.prompt(
      'Set weekly hour limit for "' + category.name + '". Leave blank to remove the limit.',
      Number.isFinite(currentLimit) ? String(currentLimit) : ''
    );

    if (input == null) return;

    var trimmed = input.trim();
    if (trimmed === '') {
      delete limits[categoryId];
      saveLimits(limits);
      refreshLimitButtons();
      return;
    }

    var parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 168) {
      window.alert('Enter a weekly hour limit between 0 and 168.');
      return;
    }

    limits[categoryId] = Math.round(parsed * 4) / 4;
    saveLimits(limits);
    refreshLimitButtons();
  }

  function promptForGoal(categoryId) {
    if (!window.Y || !Array.isArray(window.Y.categories)) return;

    var category = window.Y.categories.find(function (item) {
      return item && item.id === categoryId;
    });
    if (!category) return;

    var goals = getActiveGoals();
    var currentGoal = goals[categoryId];
    var input = window.prompt(
      'Set weekly hour goal for "' + category.name + '". Leave blank to remove the goal.',
      Number.isFinite(currentGoal) ? String(currentGoal) : ''
    );

    if (input == null) return;

    var trimmed = input.trim();
    if (trimmed === '') {
      delete goals[categoryId];
      saveGoals(goals);
      refreshLimitButtons();
      return;
    }

    var parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 168) {
      window.alert('Enter a weekly hour goal between 0 and 168.');
      return;
    }

    goals[categoryId] = Math.round(parsed * 4) / 4;
    saveGoals(goals);
    refreshLimitButtons();
  }

  function bindLegendClick() {
    var legend = document.getElementById('legend');
    if (!legend || legend.dataset.limitBound === 'true') return;

    legend.dataset.limitBound = 'true';
    legend.addEventListener('click', function (event) {
      var button = event.target.closest('.category-limit');
      if (button) {
        event.preventDefault();
        event.stopPropagation();
        promptForLimit(button.getAttribute('data-id'));
        return;
      }

      button = event.target.closest('.category-goal');
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      promptForGoal(button.getAttribute('data-id'));
    }, true);
  }

  function bindGridGuard() {
    var grid = document.getElementById('grid');
    if (!grid || limitGuardBound) return;

    limitGuardBound = true;
    grid.addEventListener('mousedown', blockEventIfLimited, true);
    grid.addEventListener('mousemove', blockEventIfLimited, true);
    grid.addEventListener('touchstart', blockEventIfLimited, { capture: true, passive: false });
  }

  function wrapRenderers() {
    if (wrapped || typeof window.G !== 'function') return;

    wrapped = true;
    var originalG = window.G;

    window.G = function () {
      var result = originalG.apply(this, arguments);
      bindLegendClick();
      bindGridGuard();
      refreshLimitButtons();
      return result;
    };
  }

  function init() {
    wrapRenderers();
    bindLegendClick();
    bindGridGuard();
    refreshLimitButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
