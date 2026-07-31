(function () {
  'use strict';

  var shiftEraseActive = false;
  var visitedIndexes = new Set();

  function rerender() {
    if (typeof window.M === 'function') window.M();
    if (typeof window.G === 'function') window.G();
    if (typeof window.f === 'function') window.f();
    if (typeof window.L === 'function') window.L();
  }

  function eraseTarget(target) {
    if (!window.Y || !window.N || typeof window.v !== 'function') return;

    var cell = target && target.closest ? target.closest('.cell,.cell-chunk') : null;
    if (!cell) return;

    var index = Number(cell.dataset.index);
    var chunkIndex = cell.dataset.chunkIndex !== undefined ? Number(cell.dataset.chunkIndex) : null;
    if (!Number.isInteger(index) || index < 0 || index >= 168) return;

    var nextGrid = Array.isArray(window.Y.grid) ? window.Y.grid.slice() : Array(168).fill('unassigned');
    var nextCellChunks = Array.isArray(window.Y.cellChunks) ? window.Y.cellChunks.slice() : Array(168).fill(1);
    var nextGridChunks = Array.isArray(window.Y.gridChunks)
      ? window.Y.gridChunks.map(function (chunk, gridIndex) {
          return Array.isArray(chunk) ? chunk.slice() : [nextGrid[gridIndex] || 'unassigned'];
        })
      : nextGrid.map(function (categoryId) {
          return [categoryId || 'unassigned'];
        });

    var chunkCount = nextCellChunks[index] || 1;
    var changed = false;

    if (chunkIndex !== null) {
      if (chunkCount > 1) {
        nextGridChunks[index] = ['unassigned'];
        nextGrid[index] = 'unassigned';
        nextCellChunks[index] = 1;
        changed = true;
      } else if ((nextGrid[index] || 'unassigned') !== 'unassigned') {
        nextGridChunks[index] = ['unassigned'];
        nextGrid[index] = 'unassigned';
        changed = true;
      }
    } else {
      if (visitedIndexes.has(index)) return;
      visitedIndexes.add(index);

      if (chunkCount > 1) {
        nextGridChunks[index] = ['unassigned'];
        nextGrid[index] = 'unassigned';
        nextCellChunks[index] = 1;
        changed = true;
      } else if ((nextGrid[index] || 'unassigned') !== 'unassigned') {
        nextGridChunks[index] = ['unassigned'];
        nextGrid[index] = 'unassigned';
        changed = true;
      }
    }

    if (!changed) return;

    window.N = window.v(window.N, window.Y);
    window.Y = Object.assign({}, window.Y, {
      grid: nextGrid,
      cellChunks: nextCellChunks,
      gridChunks: nextGridChunks
    });
    rerender();
  }

  function bindShiftErase() {
    var grid = document.getElementById('grid');
    if (!grid) return;

    grid.addEventListener('mousedown', function (evt) {
      if (evt.button !== 0 || !evt.shiftKey) return;
      var target = evt.target.closest('.cell,.cell-chunk');
      if (!target) return;

      evt.preventDefault();
      evt.stopPropagation();
      shiftEraseActive = true;
      visitedIndexes.clear();
      eraseTarget(target);
    }, true);

    grid.addEventListener('mousemove', function (evt) {
      if (!shiftEraseActive || !evt.shiftKey) return;
      var target = evt.target.closest('.cell,.cell-chunk');
      if (!target) return;

      evt.preventDefault();
      evt.stopPropagation();
      eraseTarget(target);
    }, true);

    document.addEventListener('mouseup', function () {
      shiftEraseActive = false;
      visitedIndexes.clear();
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindShiftErase);
  } else {
    bindShiftErase();
  }
})();
