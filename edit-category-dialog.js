(function () {
  'use strict';

  var editingCategoryId = null;

  function rerender() {
    if (typeof window.M === 'function') window.M();
    if (typeof window.G === 'function') window.G();
    if (typeof window.f === 'function') window.f();
    if (typeof window.L === 'function') window.L();
  }

  function getElements() {
    return {
      legend: document.getElementById('legend'),
      dialog: document.getElementById('category-dialog'),
      title: document.getElementById('dialog-title'),
      submit: document.getElementById('dialog-submit'),
      cancel: document.getElementById('dialog-cancel'),
      nameInput: document.getElementById('category-name'),
      colorInput: document.getElementById('category-color')
    };
  }

  function getCategoryById(categoryId) {
    if (!window.Y || !Array.isArray(window.Y.categories) || typeof window.E !== 'function') return null;
    return window.E(window.Y, categoryId) || null;
  }

  function resetEditMode(elements) {
    editingCategoryId = null;
    if (!elements) elements = getElements();
    if (elements.title) elements.title.textContent = 'Add Category';
    if (elements.submit) elements.submit.textContent = 'Add';
  }

  function openEditDialog(categoryId) {
    var elements = getElements();
    var category = getCategoryById(categoryId);
    if (!elements.dialog || !elements.nameInput || !elements.colorInput || !elements.title || !elements.submit || !category) return;

    editingCategoryId = categoryId;
    elements.title.textContent = 'Edit Category';
    elements.submit.textContent = 'Save';
    elements.nameInput.value = category.name || '';
    elements.colorInput.value = category.color || '#9ca3af';
    elements.dialog.showModal();
    elements.nameInput.focus();
    elements.nameInput.select();
  }

  function saveEditedCategory() {
    if (!editingCategoryId || !window.Y || !window.N || typeof window.v !== 'function') return false;

    var elements = getElements();
    var category = getCategoryById(editingCategoryId);
    if (!elements.nameInput || !elements.colorInput || !category) return false;

    var nextName = elements.nameInput.value.trim() || category.name;
    var nextColor = elements.colorInput.value || category.color;

    var nextCategories = window.Y.categories.map(function (item) {
      if (!item || item.id !== editingCategoryId) return item;
      return Object.assign({}, item, {
        name: nextName,
        color: nextColor
      });
    });

    window.N = window.v(window.N, window.Y);
    window.Y = Object.assign({}, window.Y, {
      categories: nextCategories
    });

    rerender();
    if (elements.dialog) elements.dialog.close();
    resetEditMode(elements);
    return true;
  }

  function bindEditOpen() {
    var elements = getElements();
    if (!elements.legend || elements.legend.dataset.editDialogBound === 'true') return;

    elements.legend.dataset.editDialogBound = 'true';
    elements.legend.addEventListener('click', function (event) {
      var button = event.target.closest('.category-edit');
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }

      openEditDialog(button.getAttribute('data-id'));
    }, true);
  }

  function bindEditSave() {
    var elements = getElements();
    if (!elements.dialog || elements.dialog.dataset.editSaveBound === 'true') return;

    elements.dialog.dataset.editSaveBound = 'true';

    elements.submit.addEventListener('click', function (event) {
      if (!editingCategoryId) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
      saveEditedCategory();
    }, true);

    elements.dialog.addEventListener('submit', function (event) {
      if (!editingCategoryId) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
      saveEditedCategory();
    }, true);

    elements.cancel.addEventListener('click', function () {
      if (!editingCategoryId) return;
      resetEditMode(elements);
    }, true);

    elements.dialog.addEventListener('close', function () {
      resetEditMode(elements);
    });
  }

  function init() {
    bindEditOpen();
    bindEditSave();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
