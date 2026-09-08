/**
 * app.js
 * -----------------------------------------------------------------------
 * Вся логика конструктора работает в браузере:
 *  - хранит данные мода в объекте `state`;
 *  - автосохраняет его в localStorage, чтобы работа не терялась;
 *  - по схемам из schemas.js строит формы добавления/редактирования
 *    и списки уже добавленных строк для каждой таблицы;
 *  - на «Экспорт» собирает mod.json + weapons.json + ... + textures/*
 *    в один .zip через JSZip и запускает скачивание.
 * -----------------------------------------------------------------------
 */

// ============================================================ УТИЛИТЫ

const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else if (v === false || v === null || v === undefined) { /* skip */ }
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function slugify(str) {
  return (str || 'my_mod')
    .toString().trim().toLowerCase()
    .replace(/[^a-z0-9а-яё_\- ]/gi, '')
    .replace(/\s+/g, '_') || 'my_mod';
}

class FieldError extends Error {
  constructor(field, msg) {
    super(`«${field.label}»: ${msg}`);
    this.field = field;
  }
}

// ============================================================ СОСТОЯНИЕ

const STORAGE_KEY = 'alemModBuilder.state.v1';

const TABLE_KEYS = [
  'weapons', 'materials', 'apparel', 'resources', 'recipes', 'buildings',
  'techs', 'traits', 'traitPairs', 'childhoods', 'adulthoods', 'rareFullfirst', 'loc',
];

function defaultState() {
  const tables = {};
  TABLE_KEYS.forEach(k => { tables[k] = []; });
  const names = {};
  NAME_LISTS.forEach(n => { names[n.key] = []; });
  return {
    info: { id: '', name: '', author: '', version: '1.0', desc: '' },
    tables,
    names,
    textures: [], // { id, fileName, path, dataUrl, size }
  };
}

let state = defaultState();
let storageAvailable = true;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const fresh = defaultState();
    state = {
      info: { ...fresh.info, ...(parsed.info || {}) },
      tables: { ...fresh.tables, ...(parsed.tables || {}) },
      names: { ...fresh.names, ...(parsed.names || {}) },
      textures: Array.isArray(parsed.textures) ? parsed.textures : [],
    };
  } catch (e) {
    console.warn('Не удалось прочитать сохранённый проект:', e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageAvailable = true;
  } catch (e) {
    storageAvailable = false;
    console.warn('Не удалось сохранить проект в localStorage (возможно, превышен лимит из-за текстур):', e);
  }
  refreshCounts();
}

function refreshCounts() {
  TABLE_KEYS.forEach(k => {
    qsa(`[data-count-for="${k}"]`).forEach(b => { b.textContent = state.tables[k].length; });
  });
  qsa('[data-count-for="textures"]').forEach(b => { b.textContent = state.textures.length; });
}

// ============================================================ ВКЛАДКИ

function initTabs() {
  qsa('.rail-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.rail-tab').forEach(b => b.classList.remove('is-active'));
      qsa('.panel').forEach(p => p.classList.remove('is-active'));
      btn.classList.add('is-active');
      qs(`#tab-${btn.dataset.tab}`).classList.add('is-active');
      if (btn.dataset.tab === 'export') renderExportTab();
    });
  });
}

// ============================================================ ПОЛЯ ФОРМ

function buildFieldControl(field, formId) {
  const controlId = `f-${formId}-${field.name}`;
  const wrap = el('div', { class: 'field' + (field.wide ? ' field-wide' : '') });

  if (field.type === 'checkbox') {
    const input = el('input', { type: 'checkbox', id: controlId, name: field.name });
    const label = el('label', { class: 'checkbox-field', for: controlId }, [input, ` ${field.label}`]);
    wrap.appendChild(label);
    if (field.hint) wrap.appendChild(el('p', { class: 'field-hint' }, field.hint));
    return wrap;
  }

  wrap.appendChild(el('label', { for: controlId }, field.label + (field.required ? ' *' : '')));

  let input;
  if (field.type === 'select') {
    input = el('select', { id: controlId, name: field.name });
    field.options.forEach(opt => {
      input.appendChild(el('option', { value: opt.value }, opt.label));
    });
  } else if (field.type === 'textarea') {
    input = el('textarea', { id: controlId, name: field.name, rows: 3, placeholder: field.placeholder || '' });
  } else if (field.type === 'json') {
    input = el('textarea', {
      id: controlId, name: field.name, rows: 3, class: 'mono',
      placeholder: field.placeholder || '',
    });
  } else if (field.type === 'color') {
    const text = el('input', {
      type: 'text', id: controlId, name: field.name, placeholder: '#7A5A38', class: 'color-text',
    });
    const swatch = el('input', { type: 'color', class: 'color-swatch', value: '#888888' });
    swatch.addEventListener('input', () => { text.value = swatch.value; });
    const row = el('div', { class: 'color-row' }, [text, swatch]);
    wrap.appendChild(row);
    if (field.hint) wrap.appendChild(el('p', { class: 'field-hint' }, field.hint));
    return wrap;
  } else if (field.type === 'number') {
    input = el('input', {
      type: 'number', id: controlId, name: field.name,
      step: field.step || 'any', min: field.min, max: field.max,
      placeholder: field.placeholder || '',
    });
  } else {
    input = el('input', { type: 'text', id: controlId, name: field.name, placeholder: field.placeholder || '' });
  }

  wrap.appendChild(input);
  if (field.hint) wrap.appendChild(el('p', { class: 'field-hint' }, field.hint));
  return wrap;
}

function readFieldFromForm(field, formEl) {
  const input = formEl.elements[field.name];
  if (field.type === 'checkbox') return input.checked ? true : undefined;

  const raw = (input.value || '').trim();

  switch (field.type) {
    case 'number': {
      if (raw === '') return undefined;
      const n = Number(raw);
      if (Number.isNaN(n)) throw new FieldError(field, 'должно быть числом');
      return n;
    }
    case 'select': {
      if (raw === '') return undefined;
      return field.numeric ? Number(raw) : raw;
    }
    case 'json': {
      if (raw === '') return undefined;
      try { return JSON.parse(raw); }
      catch (e) { throw new FieldError(field, 'некорректный JSON — ' + e.message); }
    }
    case 'list': {
      const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
      return parts.length ? parts : undefined;
    }
    default:
      return raw === '' ? undefined : raw;
  }
}

function writeFieldToForm(field, formEl, value) {
  const input = formEl.elements[field.name];
  if (field.type === 'checkbox') { input.checked = !!value; return; }
  if (value === undefined || value === null) { input.value = ''; return; }
  if (field.type === 'json') { input.value = JSON.stringify(value, null, 1); return; }
  if (field.type === 'list') { input.value = Array.isArray(value) ? value.join(', ') : String(value); return; }
  input.value = value;
}

// ================================================== УНИВЕРСАЛЬНАЯ СЕКЦИЯ

const sectionEditState = {}; // schemaKey -> editing index or null

/** Блок «Открыть в технологиях» — общий для оружия/одежды/рецептов. */
function buildTechLinkBox() {
  const box = el('div', { class: 'tech-link-box' });
  box.appendChild(el('h3', {}, '⚙ Открыть в технологиях'));
  box.appendChild(el('p', { class: 'field-hint' }, 'Без этого запись останется в таблице, но её нигде нельзя будет сделать в игре — ключ доступа впишется автоматически.'));

  const select = el('select', {});
  const newFields = el('div', { class: 'tech-link-new field-grid', hidden: true });
  const nameInput = el('input', { type: 'text', placeholder: 'Название технологии' });
  const branchInput = el('input', { type: 'text', placeholder: 'Ремёсла', value: 'Ремёсла' });
  const eraInput = el('input', { type: 'number', value: '1', min: 1, max: 5, step: 1 });
  const costInput = el('input', { type: 'number', value: '100', step: 1 });
  [
    ['Название', nameInput], ['Ветка', branchInput], ['Эпоха (1–5)', eraInput], ['Стоимость', costInput],
  ].forEach(([label, input]) => {
    newFields.appendChild(el('div', { class: 'field' }, [el('label', {}, label), input]));
  });

  function refreshOptions() {
    const current = select.value;
    select.innerHTML = '';
    select.appendChild(el('option', { value: '__none' }, 'Не привязывать — открою вручную'));
    select.appendChild(el('option', { value: '__new' }, '+ Создать новую технологию'));
    state.tables.techs.forEach(t => {
      select.appendChild(el('option', { value: t.id }, `${t.name || t.id} (${t.id})`));
    });
    if (Array.from(select.options).some(o => o.value === current)) select.value = current;
  }
  select.addEventListener('focus', refreshOptions);
  select.addEventListener('change', () => { newFields.hidden = select.value !== '__new'; });
  refreshOptions();

  box.appendChild(select);
  box.appendChild(newFields);

  return {
    box,
    refreshOptions,
    reset() {
      select.value = '__none';
      newFields.hidden = true;
      nameInput.value = ''; branchInput.value = 'Ремёсла'; eraInput.value = '1'; costInput.value = '100';
    },
    getChoice() {
      if (select.value === '__none') return { mode: 'none' };
      if (select.value === '__new') {
        return {
          mode: 'new',
          name: nameInput.value.trim(), branch: branchInput.value.trim(),
          era: eraInput.value, cost: costInput.value,
        };
      }
      return { mode: 'existing', techId: select.value };
    },
  };
}

/** Дописывает ключ(и) доступа новой записи в выбранную/новую технологию. */
function applyTechLink(schemaKey, item, choice) {
  const schema = SCHEMAS[schemaKey];
  if (!schema.techLink || !choice || choice.mode === 'none') return;
  const keys = schema.techLink(item, state.tables.materials);
  if (!keys.length) return;

  if (choice.mode === 'existing') {
    const tech = state.tables.techs.find(t => t.id === choice.techId);
    if (!tech) return;
    tech.unlocks = Array.from(new Set([...(tech.unlocks || []), ...keys]));
    return;
  }

  const existingIds = new Set(state.tables.techs.map(t => t.id));
  let id = slugify(item.id || item.name) + '_tech';
  let n = 1;
  while (existingIds.has(id)) id = slugify(item.id || item.name) + '_tech' + (++n);
  state.tables.techs.push({
    id,
    name: choice.name || `Технология: ${item.name || item.id}`,
    branch: choice.branch || 'Ремёсла',
    era: choice.era ? Number(choice.era) : 1,
    cost: choice.cost ? Number(choice.cost) : 100,
    unlocks: keys,
  });
}

function initSchemaSection(schemaKey) {
  const schema = SCHEMAS[schemaKey];
  const formMount = qs(`.form-mount[data-schema="${schemaKey}"]`);
  const tableMount = qs(`.table-mount[data-schema="${schemaKey}"]`);
  if (!formMount || !tableMount) return;

  sectionEditState[schemaKey] = null;

  const form = el('form', { class: 'entry-form' });
  const grid = el('div', { class: 'field-grid' });
  schema.fields.forEach(f => grid.appendChild(buildFieldControl(f, schemaKey)));
  form.appendChild(grid);

  // --- Шаблон характеристик (только для оружия) ------------------------
  if (schemaKey === 'weapons') {
    const tplField = el('div', { class: 'field field-wide' });
    tplField.appendChild(el('label', {}, 'Шаблон (заполнит характеристики — можно поправить или очистить)'));
    const tplSelect = el('select', {});
    WEAPON_TEMPLATE_OPTIONS.forEach(o => tplSelect.appendChild(el('option', { value: o.value }, o.label)));
    tplSelect.addEventListener('change', () => {
      const tpl = WEAPON_TEMPLATES[tplSelect.value];
      if (!tpl) return;
      schema.fields.forEach(f => {
        if (tpl[f.name] === undefined) return;
        if (f.type === 'checkbox') { form.elements[f.name].checked = tpl[f.name]; return; }
        if ((form.elements[f.name].value || '').trim() !== '') return; // не затираем то, что уже вписали
        writeFieldToForm(f, form, tpl[f.name]);
      });
    });
    tplField.appendChild(tplSelect);
    tplField.appendChild(el('p', { class: 'field-hint' }, 'Черновые значения для старта, не игровой баланс — смело меняйте.'));
    grid.insertBefore(tplField, grid.firstChild);
  }

  // --- Автономер «look» по занятому слоту (только для одежды) ----------
  if (schemaKey === 'apparel') {
    const slotEl = form.elements['slot'];
    const lookEl = form.elements['look'];
    if (slotEl && lookEl) {
      slotEl.addEventListener('change', () => {
        if ((lookEl.value || '').trim() !== '') return;
        const slot = slotEl.value || 'Torso';
        const start = LOOK_RESERVED_START[slot] ?? 0;
        const used = new Set(state.tables.apparel
          .filter(a => a.slot === slot && a.look !== undefined)
          .map(a => Number(a.look)));
        let n = start;
        while (used.has(n)) n++;
        lookEl.value = n;
      });
    }
  }

  // --- Автопривязка к технологиям (оружие / одежда / рецепты) ----------
  const techUI = schema.techLink ? buildTechLinkBox() : null;
  if (techUI) form.appendChild(techUI.box);

  const errorBox = el('p', { class: 'form-error', hidden: true });
  form.appendChild(errorBox);

  const actions = el('div', { class: 'form-actions' });
  const submitBtn = el('button', { type: 'submit', class: 'btn btn-primary' }, `Добавить ${schema.title}`);
  const cancelBtn = el('button', { type: 'button', class: 'btn btn-ghost', hidden: true }, 'Отменить редактирование');
  actions.appendChild(submitBtn);
  actions.appendChild(cancelBtn);
  form.appendChild(actions);

  cancelBtn.addEventListener('click', () => {
    form.reset();
    if (techUI) techUI.reset();
    sectionEditState[schemaKey] = null;
    submitBtn.textContent = `Добавить ${schema.title}`;
    cancelBtn.hidden = true;
    errorBox.hidden = true;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errorBox.hidden = true;
    const item = {};
    try {
      schema.fields.forEach(f => {
        const v = readFieldFromForm(f, form);
        if (v !== undefined) item[f.name] = v;
      });
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.hidden = false;
      return;
    }
    const missing = schema.fields.find(f => f.required && (item[f.name] === undefined || item[f.name] === ''));
    if (missing) {
      errorBox.textContent = `Поле «${missing.label}» обязательно.`;
      errorBox.hidden = false;
      return;
    }

    const techChoice = techUI ? techUI.getChoice() : null;

    const list = state.tables[schemaKey];
    const editIdx = sectionEditState[schemaKey];
    if (editIdx === null) {
      list.push(item);
    } else {
      list[editIdx] = item;
      sectionEditState[schemaKey] = null;
      submitBtn.textContent = `Добавить ${schema.title}`;
      cancelBtn.hidden = true;
    }
    applyTechLink(schemaKey, item, techChoice);
    form.reset();
    if (techUI) techUI.reset();
    saveState();
    renderList();
    if (techUI) techUI.refreshOptions();
  });

  formMount.appendChild(form);

  function renderList() {
    tableMount.innerHTML = '';
    const list = state.tables[schemaKey];
    if (!list.length) {
      tableMount.appendChild(el('p', { class: 'empty-hint' }, 'Пока пусто — заполните форму выше и нажмите «Добавить».'));
      return;
    }
    const wrap = el('div', { class: 'card-list' });
    list.forEach((item, idx) => {
      const details = el('pre', { class: 'card-json mono', hidden: true }, JSON.stringify(item, null, 2));
      const toggle = el('button', { type: 'button', class: 'btn-link' }, 'детали');
      toggle.addEventListener('click', () => { details.hidden = !details.hidden; });

      const editBtn = el('button', { type: 'button', class: 'btn btn-ghost btn-sm' }, 'Изменить');
      editBtn.addEventListener('click', () => {
        schema.fields.forEach(f => writeFieldToForm(f, form, item[f.name]));
        sectionEditState[schemaKey] = idx;
        submitBtn.textContent = `Сохранить изменения`;
        cancelBtn.hidden = false;
        formMount.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      const delBtn = el('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-danger-text' }, 'Удалить');
      delBtn.addEventListener('click', () => {
        if (!confirm(`Удалить «${schema.itemLabel(item)}»?`)) return;
        list.splice(idx, 1);
        saveState();
        renderList();
      });

      const card = el('div', { class: 'card' }, [
        el('div', { class: 'card-row' }, [
          el('span', { class: 'card-title' }, schema.itemLabel(item)),
          el('div', { class: 'card-actions' }, [toggle, editBtn, delBtn]),
        ]),
        details,
      ]);
      wrap.appendChild(card);
    });
    tableMount.appendChild(wrap);
  }

  renderList();
  refreshCounts();
}

// ============================================================ ФОРМА МОДА

const INFO_FIELDS = [
  { name: 'id', label: 'id мода (ключ, уникальный)', type: 'text', required: true, placeholder: 'steppe_pack' },
  { name: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Степной набор' },
  { name: 'author', label: 'Автор', type: 'text', placeholder: 'ваше имя' },
  { name: 'version', label: 'Версия', type: 'text', placeholder: '1.0' },
  { name: 'desc', label: 'Описание', type: 'textarea', wide: true, placeholder: 'Кылыш, степной кафтан и мифрил.' },
];

function initInfoForm() {
  const mount = qs('#infoForm');
  const form = el('form', { class: 'entry-form field-grid' });
  INFO_FIELDS.forEach(f => form.appendChild(buildFieldControl(f, 'info')));
  mount.appendChild(form);

  INFO_FIELDS.forEach(f => {
    const input = form.elements[f.name];
    input.value = state.info[f.name] || '';
    input.addEventListener('input', () => {
      state.info[f.name] = input.value; // храним и пустые — это черновик, не финальный экспорт
      saveState();
    });
  });
}

// ============================================================ СПИСКИ ИМЁН

function initNameLists() {
  const mount = qs('#nameListsForm');
  NAME_LISTS.forEach(({ key, label }) => {
    const box = el('div', { class: 'namelist-box' });
    box.appendChild(el('h3', {}, label));

    const chipRow = el('div', { class: 'chip-row' });
    box.appendChild(chipRow);

    const addRow = el('div', { class: 'chip-add-row' });
    const input = el('input', { type: 'text', placeholder: 'Добавить и нажать Enter' });
    const addBtn = el('button', { type: 'button', class: 'btn btn-ghost btn-sm' }, 'Добавить');
    addRow.appendChild(input);
    addRow.appendChild(addBtn);
    box.appendChild(addRow);

    function renderChips() {
      chipRow.innerHTML = '';
      state.names[key].forEach((val, idx) => {
        const chip = el('span', { class: 'chip' }, [
          val,
          el('button', { type: 'button', class: 'chip-x', 'aria-label': 'Удалить' }, '×'),
        ]);
        chip.querySelector('.chip-x').addEventListener('click', () => {
          state.names[key].splice(idx, 1);
          saveState();
          renderChips();
        });
        chipRow.appendChild(chip);
      });
      if (!state.names[key].length) {
        chipRow.appendChild(el('span', { class: 'empty-hint-inline' }, 'пока пусто'));
      }
    }

    function addValue() {
      const v = input.value.trim();
      if (!v) return;
      state.names[key].push(v);
      input.value = '';
      saveState();
      renderChips();
    }
    addBtn.addEventListener('click', addValue);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addValue(); }
    });

    renderChips();
    mount.appendChild(box);
  });
}

// ============================================================== ТЕКСТУРЫ

function initTextures() {
  const input = qs('#textureInput');
  const tableMount = qs('.table-mount[data-schema="textures"]');

  input.addEventListener('change', () => {
    Array.from(input.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        state.textures.push({
          id: uid(),
          fileName: file.name,
          path: guessPath(file.name),
          dataUrl: reader.result,
          size: file.size,
        });
        saveState();
        renderTextures();
      };
      reader.readAsDataURL(file);
    });
    input.value = '';
  });

  function guessPath(fileName) {
    return fileName.replace(/\.png$/i, '') + '.png';
  }

  function renderTextures() {
    tableMount.innerHTML = '';
    if (!state.textures.length) {
      tableMount.appendChild(el('p', { class: 'empty-hint' }, 'Пока не загружено ни одной текстуры.'));
      return;
    }
    const wrap = el('div', { class: 'texture-grid' });
    state.textures.forEach((tex, idx) => {
      const img = el('img', { src: tex.dataUrl, class: 'texture-thumb', alt: tex.fileName });
      const pathInput = el('input', { type: 'text', value: tex.path, class: 'texture-path' });
      pathInput.addEventListener('input', () => {
        tex.path = pathInput.value.trim();
        saveState();
      });
      const delBtn = el('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-danger-text' }, 'Удалить');
      delBtn.addEventListener('click', () => {
        state.textures.splice(idx, 1);
        saveState();
        renderTextures();
      });
      const meta = el('div', { class: 'texture-meta' }, [
        el('div', { class: 'texture-filename' }, tex.fileName),
        el('label', { class: 'texture-path-label' }, [
          'Путь: textures/',
          pathInput,
        ]),
        delBtn,
      ]);
      wrap.appendChild(el('div', { class: 'texture-card' }, [img, meta]));
    });
    tableMount.appendChild(wrap);
  }

  renderTextures();
}

// ================================================================ ЭКСПОРТ

/** Собирает содержимое всех JSON-файлов мода. Возвращает { fileName: object }. */
function buildFilesPayload() {
  const files = {};

  // mod.json
  const info = {};
  INFO_FIELDS.forEach(f => { if (state.info[f.name]) info[f.name] = state.info[f.name]; });
  files['mod.json'] = info;

  // weapons.json (weapons + materials)
  const weaponsPayload = {};
  if (state.tables.weapons.length) weaponsPayload.weapons = state.tables.weapons;
  if (state.tables.materials.length) weaponsPayload.materials = state.tables.materials;
  if (Object.keys(weaponsPayload).length) files['weapons.json'] = weaponsPayload;

  if (state.tables.apparel.length) files['apparel.json'] = { apparel: state.tables.apparel };
  if (state.tables.resources.length) files['resources.json'] = { resources: state.tables.resources };
  if (state.tables.recipes.length) files['recipes.json'] = { recipes: state.tables.recipes };
  if (state.tables.buildings.length) files['buildings.json'] = { buildings: state.tables.buildings };
  if (state.tables.techs.length) files['techs.json'] = { techs: state.tables.techs };

  // pawns.json
  const pawns = {};
  if (state.tables.traits.length) pawns.traits = state.tables.traits;
  if (state.tables.traitPairs.length) pawns.traitPairs = state.tables.traitPairs;
  if (state.tables.childhoods.length) pawns.childhoods = state.tables.childhoods;
  if (state.tables.adulthoods.length) pawns.adulthoods = state.tables.adulthoods;
  if (state.tables.rareFullfirst.length) pawns.rareFullfirst = state.tables.rareFullfirst;
  NAME_LISTS.forEach(({ key }) => { if (state.names[key].length) pawns[key] = state.names[key]; });
  if (Object.keys(pawns).length) files['pawns.json'] = pawns;

  // loc.json
  if (state.tables.loc.length) {
    const en = {};
    state.tables.loc.forEach(row => { if (row.ru && row.en) en[row.ru] = row.en; });
    files['loc.json'] = { en };
  }

  return files;
}

function validateProject() {
  const problems = [];
  const warnings = [];

  if (!state.info.id) problems.push('Не задан id мода (вкладка «Мод»).');
  if (!state.info.name) problems.push('Не задано название мода (вкладка «Мод»).');

  TABLE_KEYS.forEach(k => {
    const schema = SCHEMAS[k];
    if (!schema || !schema.keyField) return;
    const seen = new Set();
    state.tables[k].forEach(item => {
      const key = String(item[schema.keyField] ?? '');
      if (!key) return;
      if (seen.has(key)) warnings.push(`Повтор ключа «${key}» в таблице «${schema.title}» — вторая запись перезапишет первую.`);
      seen.add(key);
    });
  });

  const usedPaths = new Set();
  state.textures.forEach(t => {
    if (!t.path) { warnings.push(`У файла «${t.fileName}» не задан путь — он не попадёт в архив.`); return; }
    if (usedPaths.has(t.path)) warnings.push(`Два файла указывают один и тот же путь textures/${t.path}.`);
    usedPaths.add(t.path);
  });

  const filesPayload = buildFilesPayload();
  if (Object.keys(filesPayload).length <= 1 && !state.textures.length) {
    warnings.push('Пока не заполнено ни одной таблицы — мод будет пустым (кроме mod.json).');
  }

  return { problems, warnings };
}

function renderExportTab() {
  const summary = qs('#exportSummary');
  summary.innerHTML = '';
  const counts = TABLE_KEYS.map(k => `${SCHEMAS[k].title}: ${state.tables[k].length}`).join(' · ');
  summary.appendChild(el('p', {}, `${counts} · текстур: ${state.textures.length}`));
  if (!storageAvailable) {
    summary.appendChild(el('p', { class: 'warn-line' },
      'Внимание: браузер не смог сохранить проект локально (обычно из-за размера текстур). Пока вкладка открыта — данные целы; сохраните проект кнопкой «Сохранить проект» слева, чтобы не потерять работу.'));
  }
  renderPreview();
}

function renderPreview() {
  const tabsMount = qs('#previewTabs');
  const codeMount = qs('#previewCode');
  tabsMount.innerHTML = '';
  const files = buildFilesPayload();
  const names = Object.keys(files);
  if (!names.length) {
    codeMount.textContent = 'Пока нечего показывать — заполните хотя бы одну таблицу.';
    return;
  }
  names.forEach((name, i) => {
    const btn = el('button', { type: 'button', class: 'preview-tab' + (i === 0 ? ' is-active' : '') }, name);
    btn.addEventListener('click', () => {
      qsa('.preview-tab', tabsMount).forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      codeMount.textContent = JSON.stringify(files[name], null, 2);
    });
    tabsMount.appendChild(btn);
  });
  codeMount.textContent = JSON.stringify(files[names[0]], null, 2);
}

function showExportLog(lines, kind) {
  const box = qs('#exportLog');
  box.hidden = false;
  box.className = 'export-log' + (kind ? ` export-log-${kind}` : '');
  box.innerHTML = '';
  lines.forEach(l => box.appendChild(el('p', {}, l)));
}

async function exportZip() {
  const { problems, warnings } = validateProject();
  if (problems.length) {
    showExportLog(['Нельзя собрать архив:', ...problems.map(p => '· ' + p)], 'error');
    return;
  }

  const folderName = slugify(state.info.id);
  const zip = new JSZip();
  const root = zip.folder(folderName);

  const files = buildFilesPayload();
  Object.entries(files).forEach(([name, payload]) => {
    root.file(name, JSON.stringify(payload, null, 2));
  });

  let texCount = 0;
  state.textures.forEach(tex => {
    if (!tex.path) return;
    const base64 = tex.dataUrl.split(',')[1];
    root.file(`textures/${tex.path}`, base64, { base64: true });
    texCount++;
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${folderName}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  const lines = [`Готово: ${folderName}.zip`, `Файлов JSON: ${Object.keys(files).length} · текстур: ${texCount}`];
  if (warnings.length) lines.push('Предупреждения:', ...warnings.map(w => '· ' + w));
  showExportLog(lines, warnings.length ? 'warn' : 'ok');
}

function initExportTab() {
  qs('#btnExport').addEventListener('click', exportZip);
  qs('#btnValidate').addEventListener('click', () => {
    const { problems, warnings } = validateProject();
    if (!problems.length && !warnings.length) {
      showExportLog(['Ошибок и предупреждений не найдено.'], 'ok');
      return;
    }
    const lines = [];
    if (problems.length) lines.push('Ошибки:', ...problems.map(p => '· ' + p));
    if (warnings.length) lines.push('Предупреждения:', ...warnings.map(w => '· ' + w));
    showExportLog(lines, problems.length ? 'error' : 'warn');
  });
}

// ========================================================== ПРОЕКТ-ФАЙЛ

function initProjectControls() {
  qs('#btnSaveProject').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugify(state.info.id || state.info.name)}.project.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  qs('#loadProjectInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const fresh = defaultState();
        state = {
          info: { ...fresh.info, ...(parsed.info || {}) },
          tables: { ...fresh.tables, ...(parsed.tables || {}) },
          names: { ...fresh.names, ...(parsed.names || {}) },
          textures: Array.isArray(parsed.textures) ? parsed.textures : [],
        };
        saveState();
        location.reload();
      } catch (err) {
        alert('Не удалось прочитать файл проекта: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  qs('#btnResetProject').addEventListener('click', () => {
    if (!confirm('Удалить все введённые данные и начать заново? Это нельзя отменить.')) return;
    state = defaultState();
    saveState();
    location.reload();
  });
}

// =================================================================== INIT

function init() {
  loadState();
  initTabs();
  initInfoForm();
  TABLE_KEYS.forEach(k => { if (SCHEMAS[k]) initSchemaSection(k); });
  initNameLists();
  initTextures();
  initExportTab();
  initProjectControls();
  refreshCounts();
}

document.addEventListener('DOMContentLoaded', init);
