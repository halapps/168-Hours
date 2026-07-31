(function () {
  'use strict';

  function rerender() {
    if (typeof window.M === 'function') window.M();
    if (typeof window.G === 'function') window.G();
    if (typeof window.f === 'function') window.f();
    if (typeof window.L === 'function') window.L();
  }

  function normalizeState() {
    if (!window.Y || !Array.isArray(window.Y.grid) || window.Y.grid.length !== 168) {
      return false;
    }

    if (!Array.isArray(window.Y.gridChunks) || window.Y.gridChunks.length !== 168) {
      window.Y.gridChunks = window.Y.grid.map(function (categoryId) {
        return [categoryId || 'unassigned'];
      });
    }

    if (!Array.isArray(window.Y.cellChunks) || window.Y.cellChunks.length !== 168) {
      window.Y.cellChunks = Array(168).fill(1);
    }

    return true;
  }

  function getExistingChunks(index, chunkCount) {
    var baseValue = (window.Y.grid && window.Y.grid[index]) || 'unassigned';
    var chunks;

    if (chunkCount === 1) {
      chunks = [baseValue];
    } else {
      chunks = Array.isArray(window.Y.gridChunks[index])
        ? window.Y.gridChunks[index].slice(0, chunkCount)
        : [baseValue];
    }

    while (chunks.length < chunkCount) {
      chunks.push(baseValue);
    }

    return chunks;
  }

  function getUniformChunkValue(chunks) {
    if (!Array.isArray(chunks) || !chunks.length) return null;
    var first = chunks[0] || 'unassigned';
    for (var i = 1; i < chunks.length; i += 1) {
      if ((chunks[i] || 'unassigned') !== first) return null;
    }
    return first;
  }

  function cycleCellChunksFixed(cell) {
    if (!normalizeState()) return;

    var index = Number(cell.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= 168) return;

    var currentChunkCount = window.Y.cellChunks[index] || 1;
    var nextChunkCount = currentChunkCount === 1 ? 2 : currentChunkCount === 2 ? 3 : currentChunkCount === 3 ? 4 : 1;

    var nextCellChunks = window.Y.cellChunks.slice();
    var nextGridChunks = window.Y.gridChunks.map(function (chunk, gridIndex) {
      return Array.isArray(chunk) ? chunk.slice() : [(window.Y.grid[gridIndex] || 'unassigned')];
    });
    var nextGrid = window.Y.grid.slice();

    var existingChunks = getExistingChunks(index, currentChunkCount);
    var nextChunks;

    if (nextChunkCount > currentChunkCount) {
      var uniformValue = getUniformChunkValue(existingChunks);
      if (uniformValue && uniformValue !== 'unassigned') {
        nextChunks = Array(nextChunkCount).fill(uniformValue);
      } else {
        nextChunks = existingChunks.slice(0, currentChunkCount);
        var fillValue = currentChunkCount === 1
          ? (existingChunks[0] || nextGrid[index] || 'unassigned')
          : 'unassigned';

        while (nextChunks.length < nextChunkCount) {
          nextChunks.push(fillValue);
        }
      }
    } else {
      nextChunks = [existingChunks[0] || nextGrid[index] || 'unassigned'];
    }

    nextCellChunks[index] = nextChunkCount;
    nextGridChunks[index] = nextChunks;
    nextGrid[index] = nextChunks[0] || 'unassigned';

    if (typeof window.v === 'function' && window.N) {
      window.N = window.v(window.N, window.Y);
    }

    window.Y = Object.assign({}, window.Y, {
      grid: nextGrid,
      cellChunks: nextCellChunks,
      gridChunks: nextGridChunks
    });

    rerender();
  }

  function bindSplitFix() {
    var grid = document.getElementById('grid');
    if (!grid || grid.dataset.splitTileFixBound === 'true') return;

    grid.dataset.splitTileFixBound = 'true';
    grid.addEventListener('contextmenu', function (event) {
      var target = event.target.closest('.cell,.cell-chunk');
      if (!target) return;

      var cell = target.closest('.cell');
      if (!cell) return;

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }

      cycleCellChunksFixed(cell);
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindSplitFix);
  } else {
    bindSplitFix();
  }
})();
