// Siddu's Wishlist App - script.js
// ---------------------------------
// Modern, beautiful, blue-accented wishlist app with phases > sections > items, custom modal forms, and compelling UI.
// All logic, UI, and localStorage in one file. Extensively commented for clarity.

// --- Data Model ---
// Structure in localStorage: { phases: [ { id, title, sections: [ { id, title, items: [ { id, name, link, note, ordered } ] } ] } ], theme: 'light'|'dark' }
const STORAGE_KEY = 'siddu_wishlist';
const THEME_KEY = 'siddu_wishlist_theme';

let state = {
  phases: [], // Each phase contains sections, each section contains items
  theme: 'light',
};

// --- Modal System ---
// Renders a custom modal dialog in the #modal-root
function showModal({ title, fields, onSubmit, submitText = 'Save', initial = {}, cancelText = 'Cancel' }) {
  const modalRoot = document.getElementById('modal-root');
  modalRoot.innerHTML = '';

  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.onclick = closeModal;

  // Modal
  const modal = document.createElement('form');
  modal.className = 'modal';
  modal.onsubmit = e => {
    e.preventDefault();
    const data = {};
    fields.forEach(f => {
      data[f.name] = modal.elements[f.name].value;
    });
    onSubmit(data);
    closeModal();
  };

  // Title
  const h2 = document.createElement('h2');
  h2.textContent = title;
  modal.appendChild(h2);

  // Fields
  fields.forEach(f => {
    const label = document.createElement('label');
    label.textContent = f.label;
    label.setAttribute('for', f.name);
    modal.appendChild(label);
    let input;
    if (f.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = 3;
    } else {
      input = document.createElement('input');
      input.type = f.type || 'text';
    }
    input.name = f.name;
    input.id = f.name;
    input.value = initial[f.name] || '';
    input.required = !!f.required;
    input.placeholder = f.placeholder || '';
    modal.appendChild(input);
  });

  // Actions
  const actions = document.createElement('div');
  actions.className = 'modal-actions';
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = cancelText;
  cancelBtn.className = 'modal-cancel';
  cancelBtn.onclick = closeModal;
  actions.appendChild(cancelBtn);
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = submitText;
  actions.appendChild(submitBtn);
  modal.appendChild(actions);

  // Prevent overlay click from closing if inside modal
  modal.onclick = e => e.stopPropagation();

  modalRoot.appendChild(overlay);
  modalRoot.appendChild(modal);
  modalRoot.style.display = 'block';
  setTimeout(() => {
    modal.elements[fields[0].name].focus();
  }, 100);
}

function closeModal() {
  const modalRoot = document.getElementById('modal-root');
  modalRoot.innerHTML = '';
  modalRoot.style.display = 'none';
}

// --- Utility Functions ---
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ phases: state.phases }));
  localStorage.setItem(THEME_KEY, state.theme);
}

function loadState() {
  const data = localStorage.getItem(STORAGE_KEY);
  const theme = localStorage.getItem(THEME_KEY);
  if (data) {
    try {
      state.phases = JSON.parse(data).phases || [];
    } catch {
      state.phases = [];
    }
  }
  if (theme) state.theme = theme;
}

function generateId() {
  return '_' + Math.random().toString(36).slice(2, 10);
}

// --- Theme ---
function applyTheme() {
  if (state.theme === 'dark') {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  saveState();
  applyTheme();
}

// --- Rendering ---
function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  // --- Top Right Toolbar (Dark mode, Export JSON, Export PDF) ---
  let toolbar = document.querySelector('.top-toolbar');
  if (!toolbar) {
    toolbar = document.createElement('div');
    toolbar.className = 'top-toolbar';
    toolbar.innerHTML = `
      <button id="theme-toggle-btn" class="toolbar-btn" title="Toggle Dark/Light Mode">🌙</button>
      <button id="export-btn" class="toolbar-btn" title="Export as JSON">⬇️</button>
      <button id="pdf-btn" class="toolbar-btn" title="Export as PDF">🗎</button>
    `;
    document.body.appendChild(toolbar);
  }
  const themeBtn = toolbar.querySelector('#theme-toggle-btn');
  themeBtn.innerHTML = state.theme === 'light' ? '🌙' : '☀️';
  themeBtn.onclick = toggleTheme;
  toolbar.querySelector('#export-btn').onclick = exportJSON;
  toolbar.querySelector('#pdf-btn').onclick = exportPDF;

  // --- Hero/Landing Area ---
  const hero = document.createElement('div');
  hero.className = 'hero';
  hero.innerHTML = `
    <h1>Siddu's Wishlist</h1>
    <p>A modern, beautiful, and organized way to track everything you want to buy—across phases, sections, and items. Sleek, responsive, and always at your fingertips.</p>
  `;
  app.appendChild(hero);

  // --- Add Phase Button (below hero, left-aligned) ---
  const addPhaseBtnWrapper = document.createElement('div');
  addPhaseBtnWrapper.style.width = '100%';
  addPhaseBtnWrapper.style.display = 'flex';
  addPhaseBtnWrapper.style.justifyContent = 'flex-start';
  addPhaseBtnWrapper.style.margin = '1.2rem 0 2.2rem 0';
  const addPhaseBtn = document.createElement('button');
  addPhaseBtn.textContent = '+ Add Phase';
  addPhaseBtn.className = 'add-section-btn';
  addPhaseBtn.onclick = () => {
    showModal({
      title: 'Add New Phase',
      fields: [
        { name: 'title', label: 'Phase Name', required: true, placeholder: 'e.g. Research, Shopping...' }
      ],
      submitText: 'Add Phase',
      onSubmit: ({ title }) => {
        state.phases.push({ id: generateId(), title: title.trim(), sections: [] });
        saveState();
        render();
      }
    });
  };
  addPhaseBtnWrapper.appendChild(addPhaseBtn);
  app.appendChild(addPhaseBtnWrapper);

  // --- Phases List (sortable) ---
  const phaseList = document.createElement('div');
  phaseList.id = 'phase-list';
  state.phases.forEach((phase, phaseIdx) => {
    phaseList.appendChild(renderPhase(phase, phaseIdx));
  });
  app.appendChild(phaseList);

  // Enable drag-and-drop for phases
  enablePhaseDragDrop(phaseList);
}

// --- Render a Phase (with sections and controls) ---
function renderPhase(phase, phaseIdx) {
  // Modern, glassy card for each phase
  const phaseDiv = document.createElement('div');
  phaseDiv.className = 'phase-card';
  phaseDiv.setAttribute('draggable', 'true');
  phaseDiv.dataset.phaseId = phase.id;

  // --- Phase Header ---
  const header = document.createElement('div');
  header.className = 'phase-header';

  // Collapsible button
  const collapseBtn = document.createElement('button');
  collapseBtn.textContent = phase.collapsed ? '▶' : '▼';
  collapseBtn.title = 'Collapse/Expand';
  collapseBtn.style.background = 'none';
  collapseBtn.style.border = 'none';
  collapseBtn.style.fontSize = '1.1rem';
  collapseBtn.style.cursor = 'pointer';
  collapseBtn.onclick = () => {
    phase.collapsed = !phase.collapsed;
    saveState();
    render();
  };
  header.appendChild(collapseBtn);

  // Title (editable, visually distinct)
  const title = document.createElement('span');
  title.className = 'phase-title';
  title.textContent = phase.title;
  title.ondblclick = () => {
    showModal({
      title: 'Rename Phase',
      fields: [
        { name: 'title', label: 'Phase Name', required: true, initial: phase.title }
      ],
      submitText: 'Rename',
      initial: { title: phase.title },
      onSubmit: ({ title: newTitle }) => {
        phase.title = newTitle.trim();
        saveState();
        render();
      }
    });
  };
  header.appendChild(title);

  // Actions (rename, delete, drag)
  const actions = document.createElement('div');
  actions.className = 'phase-actions';

  // Rename button
  const renameBtn = document.createElement('button');
  renameBtn.title = 'Rename phase';
  renameBtn.textContent = '✏️';
  renameBtn.onclick = () => {
    showModal({
      title: 'Rename Phase',
      fields: [
        { name: 'title', label: 'Phase Name', required: true, initial: phase.title }
      ],
      submitText: 'Rename',
      initial: { title: phase.title },
      onSubmit: ({ title: newTitle }) => {
        phase.title = newTitle.trim();
        saveState();
        render();
      }
    });
  };
  actions.appendChild(renameBtn);

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.title = 'Delete phase';
  deleteBtn.textContent = '🗑️';
  deleteBtn.onclick = () => {
    showModal({
      title: 'Delete Phase',
      fields: [],
      submitText: 'Delete',
      cancelText: 'Cancel',
      onSubmit: () => {
        state.phases = state.phases.filter(p => p.id !== phase.id);
        saveState();
        render();
      }
    });
  };
  actions.appendChild(deleteBtn);

  // Drag handle
  const dragHandle = document.createElement('span');
  dragHandle.textContent = '⠿';
  dragHandle.title = 'Drag to reorder phase';
  dragHandle.style.cursor = 'grab';
  dragHandle.style.marginLeft = '0.5rem';
  actions.appendChild(dragHandle);

  header.appendChild(actions);
  phaseDiv.appendChild(header);

  // --- Add Section Button ---
  if (!phase.collapsed) {
    const addSectionBtn = document.createElement('button');
    addSectionBtn.textContent = '+ Add Section';
    addSectionBtn.className = 'add-section-btn';
    addSectionBtn.onclick = () => {
      showModal({
        title: 'Add New Section',
        fields: [
          { name: 'title', label: 'Section Name', required: true, placeholder: 'e.g. Tech, Fitness...' }
        ],
        submitText: 'Add Section',
        onSubmit: ({ title }) => {
          phase.sections.push({ id: generateId(), title: title.trim(), items: [] });
          saveState();
          render();
        }
      });
    };
    phaseDiv.appendChild(addSectionBtn);
  }

  // --- Sections List ---
  if (!phase.collapsed) {
    const sectionList = document.createElement('div');
    sectionList.className = 'section-list';
    phase.sections.forEach((section, secIdx) => {
      sectionList.appendChild(renderSection(section, secIdx, phase));
    });
    phaseDiv.appendChild(sectionList);
    enableSectionDragDrop(sectionList, phase);
  }

  return phaseDiv;
}

// --- Render a Section (with items and controls) ---
function renderSection(section, secIdx, phase) {
  const sectionDiv = document.createElement('div');
  sectionDiv.className = 'section';
  sectionDiv.setAttribute('draggable', 'true');
  sectionDiv.dataset.sectionId = section.id;

  // --- Section Header ---
  const header = document.createElement('div');
  header.className = 'section-header';

  // Collapsible button
  const collapseBtn = document.createElement('button');
  collapseBtn.textContent = section.collapsed ? '▶' : '▼';
  collapseBtn.title = 'Collapse/Expand';
  collapseBtn.style.background = 'none';
  collapseBtn.style.border = 'none';
  collapseBtn.style.fontSize = '1.1rem';
  collapseBtn.style.cursor = 'pointer';
  collapseBtn.onclick = () => {
    section.collapsed = !section.collapsed;
    saveState();
    render();
  };
  header.appendChild(collapseBtn);

  // Title (editable)
  const title = document.createElement('span');
  title.className = 'section-title';
  title.textContent = section.title;
  title.style.marginLeft = '0.5rem';
  title.ondblclick = () => {
    showModal({
      title: 'Rename Section',
      fields: [
        { name: 'title', label: 'Section Name', required: true, initial: section.title }
      ],
      submitText: 'Rename',
      initial: { title: section.title },
      onSubmit: ({ title: newTitle }) => {
        section.title = newTitle.trim();
        saveState();
        render();
      }
    });
  };
  header.appendChild(title);

  // Actions (rename, delete, drag)
  const actions = document.createElement('div');
  actions.className = 'section-actions';

  // Rename button
  const renameBtn = document.createElement('button');
  renameBtn.title = 'Rename section';
  renameBtn.textContent = '✏️';
  renameBtn.onclick = () => {
    showModal({
      title: 'Rename Section',
      fields: [
        { name: 'title', label: 'Section Name', required: true, initial: section.title }
      ],
      submitText: 'Rename',
      initial: { title: section.title },
      onSubmit: ({ title: newTitle }) => {
        section.title = newTitle.trim();
        saveState();
        render();
      }
    });
  };
  actions.appendChild(renameBtn);

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.title = 'Delete section';
  deleteBtn.textContent = '🗑️';
  deleteBtn.onclick = () => {
    showModal({
      title: 'Delete Section',
      fields: [],
      submitText: 'Delete',
      cancelText: 'Cancel',
      onSubmit: () => {
        phase.sections = phase.sections.filter(s => s.id !== section.id);
        saveState();
        render();
      }
    });
  };
  actions.appendChild(deleteBtn);

  // Drag handle
  const dragHandle = document.createElement('span');
  dragHandle.textContent = '⠿';
  dragHandle.title = 'Drag to reorder section';
  dragHandle.style.cursor = 'grab';
  dragHandle.style.marginLeft = '0.5rem';
  actions.appendChild(dragHandle);

  header.appendChild(actions);
  sectionDiv.appendChild(header);

  // --- Add Item Button ---
  if (!section.collapsed) {
    const addItemBtn = document.createElement('button');
    addItemBtn.textContent = '+ Add Item';
    addItemBtn.className = 'add-item-btn';
    addItemBtn.onclick = () => addItem(section);
    sectionDiv.appendChild(addItemBtn);
  }

  // --- Items List ---
  if (!section.collapsed) {
    const itemsList = document.createElement('div');
    itemsList.className = 'items-list';
    itemsList.dataset.sectionId = section.id;
    section.items.forEach((item, itemIdx) => {
      itemsList.appendChild(renderItem(section, item, itemIdx));
    });
    sectionDiv.appendChild(itemsList);
    enableItemDragDrop(itemsList, section);
  }

  return sectionDiv;
}

// --- Render an Item Card ---
function renderItem(section, item, itemIdx) {
  const card = document.createElement('div');
  card.className = 'item-card';
  card.setAttribute('draggable', 'true');
  card.dataset.itemId = item.id;

  // Title (link)
  const title = document.createElement('a');
  title.className = 'item-title' + (item.ordered ? ' ordered' : '');
  title.textContent = item.name;
  title.href = item.link || '#';
  title.target = '_blank';
  card.appendChild(title);

  // Note
  const note = document.createElement('div');
  note.className = 'item-note' + (item.ordered ? ' ordered' : '');
  note.textContent = item.note;
  card.appendChild(note);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'item-actions';

  // Ordered toggle
  const orderedBox = document.createElement('input');
  orderedBox.type = 'checkbox';
  orderedBox.checked = !!item.ordered;
  orderedBox.title = 'Mark as ordered';
  orderedBox.onchange = () => {
    item.ordered = orderedBox.checked;
    saveState();
    render();
  };
  actions.appendChild(orderedBox);

  // Edit button
  const editBtn = document.createElement('button');
  editBtn.title = 'Edit item';
  editBtn.textContent = '✏️';
  editBtn.onclick = () => editItem(section, item);
  actions.appendChild(editBtn);

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.title = 'Delete item';
  deleteBtn.textContent = '🗑️';
  deleteBtn.onclick = () => {
    showModal({
      title: 'Delete Item',
      fields: [],
      submitText: 'Delete',
      cancelText: 'Cancel',
      onSubmit: () => {
        section.items = section.items.filter(i => i.id !== item.id);
        saveState();
        render();
      }
    });
  };
  actions.appendChild(deleteBtn);

  // Drag handle
  const dragHandle = document.createElement('span');
  dragHandle.textContent = '⠿';
  dragHandle.title = 'Drag to reorder item';
  dragHandle.style.cursor = 'grab';
  actions.appendChild(dragHandle);

  card.appendChild(actions);
  return card;
}

// --- Add/Edit Item (with modal form) ---
function addItem(section) {
  showModal({
    title: 'Add New Item',
    fields: [
      { name: 'name', label: 'Item Name', required: true, placeholder: 'e.g. MacBook Pro' },
      { name: 'link', label: 'Item Link (URL)', type: 'url', placeholder: 'https://...' },
      { name: 'note', label: 'Note (e.g., price, size)', type: 'textarea', placeholder: 'Optional note...' }
    ],
    submitText: 'Add Item',
    onSubmit: ({ name, link, note }) => {
      section.items.push({
        id: generateId(),
        name: name.trim(),
        link: link ? link.trim() : '',
        note: note ? note.trim() : '',
        ordered: false,
      });
      saveState();
      render();
    }
  });
}

function editItem(section, item) {
  showModal({
    title: 'Edit Item',
    fields: [
      { name: 'name', label: 'Item Name', required: true, placeholder: 'e.g. MacBook Pro' },
      { name: 'link', label: 'Item Link (URL)', type: 'url', placeholder: 'https://...' },
      { name: 'note', label: 'Note (e.g., price, size)', type: 'textarea', placeholder: 'Optional note...' }
    ],
    submitText: 'Save Changes',
    initial: { name: item.name, link: item.link, note: item.note },
    onSubmit: ({ name, link, note }) => {
      item.name = name.trim();
      item.link = link ? link.trim() : '';
      item.note = note ? note.trim() : '';
      saveState();
      render();
    }
  });
}

// --- Export JSON ---
function exportJSON() {
  const data = JSON.stringify(state.phases, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wishlist.json';
  a.click();
  URL.revokeObjectURL(url);
}

// --- Export as PDF ---
function exportPDF() {
  // Hide toolbar and modals for clean export
  const toolbar = document.querySelector('.top-toolbar');
  const modal = document.getElementById('modal-root');
  toolbar.style.visibility = 'hidden';
  if (modal) modal.style.visibility = 'hidden';

  // Use html2canvas to capture the #app content
  const app = document.getElementById('app');
  html2canvas(app, {
    backgroundColor: state.theme === 'dark' ? '#232a3a' : '#f0f9ff',
    scale: 2,
    useCORS: true
  }).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const pdf = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    // Calculate width/height for A4
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 40;
    const imgHeight = canvas.height * imgWidth / canvas.width;
    pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight, '', 'FAST');
    pdf.save('wishlist.pdf');
    toolbar.style.visibility = '';
    if (modal) modal.style.visibility = '';
  });
}

// --- Drag-and-Drop (Sections) ---
function enableSectionDragDrop(container) {
  let dragSrc = null;
  container.querySelectorAll('.section').forEach((el, idx) => {
    el.ondragstart = e => {
      dragSrc = idx;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', idx);
      el.style.opacity = '0.5';
    };
    el.ondragend = () => {
      el.style.opacity = '';
    };
    el.ondragover = e => {
      e.preventDefault();
      el.style.boxShadow = '0 0 0 2px #2563eb';
    };
    el.ondragleave = () => {
      el.style.boxShadow = '';
    };
    el.ondrop = e => {
      e.preventDefault();
      el.style.boxShadow = '';
      const from = dragSrc;
      const to = idx;
      if (from !== to) {
        const moved = state.sections.splice(from, 1)[0];
        state.sections.splice(to, 0, moved);
        saveState();
        render();
      }
    };
  });
}

// --- Drag-and-Drop (Items) ---
function enableItemDragDrop(container, section) {
  let dragSrc = null;
  container.querySelectorAll('.item-card').forEach((el, idx) => {
    el.ondragstart = e => {
      dragSrc = idx;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', idx);
      el.style.opacity = '0.5';
    };
    el.ondragend = () => {
      el.style.opacity = '';
    };
    el.ondragover = e => {
      e.preventDefault();
      el.style.boxShadow = '0 0 0 2px #2563eb';
    };
    el.ondragleave = () => {
      el.style.boxShadow = '';
    };
    el.ondrop = e => {
      e.preventDefault();
      el.style.boxShadow = '';
      const from = dragSrc;
      const to = idx;
      if (from !== to) {
        const moved = section.items.splice(from, 1)[0];
        section.items.splice(to, 0, moved);
        saveState();
        render();
      }
    };
  });
}

// --- Drag-and-Drop (Phases) ---
function enablePhaseDragDrop(container) {
  let dragSrc = null;
  container.querySelectorAll('.section').forEach((el, idx) => {
    el.ondragstart = e => {
      dragSrc = idx;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', idx);
      el.style.opacity = '0.5';
    };
    el.ondragend = () => {
      el.style.opacity = '';
    };
    el.ondragover = e => {
      e.preventDefault();
      el.style.boxShadow = '0 0 0 2px #174a8c';
    };
    el.ondragleave = () => {
      el.style.boxShadow = '';
    };
    el.ondrop = e => {
      e.preventDefault();
      el.style.boxShadow = '';
      const from = dragSrc;
      const to = idx;
      if (from !== to) {
        const moved = state.phases.splice(from, 1)[0];
        state.phases.splice(to, 0, moved);
        saveState();
        render();
      }
    };
  });
}

// --- Dark Theme CSS (injected) ---
function injectDarkTheme() {
  if (document.getElementById('dark-theme-style')) return;
  const style = document.createElement('style');
  style.id = 'dark-theme-style';
  style.textContent = `
    body.dark {
      background: #181c1f;
      color: #eaeaea;
    }
    body.dark .section {
      background: #23272a;
      box-shadow: 0 2px 8px rgba(0,0,0,0.18);
    }
    body.dark .item-card {
      background: #23272a;
      box-shadow: 0 1px 4px rgba(0,0,0,0.18);
    }
    body.dark .add-section-btn, body.dark .add-item-btn {
      background: #3b5998;
      color: #fff;
    }
    body.dark .add-section-btn:hover, body.dark .add-item-btn:hover {
      background: #223366;
    }
    body.dark .section-title, body.dark .item-title {
      color: #7abaff;
    }
    body.dark .item-note {
      color: #b0b0b0;
    }
  `;
  document.head.appendChild(style);
}

// --- Initialization ---
loadState();
injectDarkTheme();
applyTheme();
render();

// --- Offline Support (optional, basic) ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('wishlist-sw.js').catch(() => {});
  });
} 