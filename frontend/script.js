const DEFAULT_TAG_DEFS = [
  { id: "work", label: "Work", bg: "#dbeafe", color: "#1e40af" },
  { id: "personal", label: "Personal", bg: "#fce7f3", color: "#9d174d" },
  { id: "idea", label: "Idea", bg: "#d1fae5", color: "#065f46" },
  { id: "urgent", label: "Urgent", bg: "#fee2e2", color: "#991b1b" },
  { id: "learning", label: "Learning", bg: "#ede9fe", color: "#5b21b6" },
  { id: "health", label: "Health", bg: "#fef3c7", color: "#92400e" },
  { id: "finance", label: "Finance", bg: "#ecfdf5", color: "#064e3b" },
  { id: "creative", label: "Creative", bg: "#fff7ed", color: "#9a3412" },
];
let TAG_DEFS = ls("kb_tags", DEFAULT_TAG_DEFS);
const PRI_COLORS = { low: "#27ae60", med: "#e67e22", high: "#c0392b" };
const COL_COLORS = [
  "#378ADD",
  "#7F77DD",
  "#27ae60",
  "#e67e22",
  "#c0392b",
  "#1abc9c",
  "#8e44ad",
];
const DEFAULT_COLS = [
  { id: "c1", title: "To do", color: "#378ADD" },
  { id: "c2", title: "In progress", color: "#e67e22" },
  { id: "c3", title: "Done", color: "#27ae60" },
];

function ls(k, fb) {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fb;
  } catch {
    return fb;
  }
}
function persist() {
  localStorage.setItem("kb_cols", JSON.stringify(cols));
  localStorage.setItem("kb_cards", JSON.stringify(cards));
  localStorage.setItem("kb_nid", String(nextId));
  localStorage.setItem("kb_tags", JSON.stringify(TAG_DEFS));
}

let cols = ls("kb_cols", DEFAULT_COLS);
let cards = ls("kb_cards", []);
let nextId = parseInt(ls("kb_nid", "100"));
let colIdx = cols.length;

let dragId = null;
let dragColId = null;
let editId = null;
let editCol = null;
let selTag = null;
let selPri = "med";

// ── render ───────────────────────────────────────────
function render() {
  persist();
  const board = document.getElementById("board");
  board.innerHTML = "";

  cols.forEach((col) => {
    const cc = cards.filter((c) => c.col === col.id);
    const wrap = document.createElement("div");
    wrap.className = "col";
    wrap.dataset.col = col.id;

    const isDoneCol = col.title.toLowerCase() === "done";

    wrap.innerHTML = `
      <div class="col-head">
        <div class="col-label">
          <span class="col-dot" style="background:${col.color}"></span>
          <span class="col-name" data-col="${col.id}" title="Double-click to rename">${esc(col.title)}</span>
        </div>
        <div class="col-meta">
          <span class="col-count">${cc.length}</span>
          <button class="col-del" onclick="deleteCol('${col.id}')" title="Delete column">×</button>
        </div>
      </div>
      ${
        cc.length === 0
          ? `<div class="empty">Empty.<br/>Hit + to add a card.</div>`
          : cc.map((c) => mkCard(c, isDoneCol)).join("")
      }
      <button class="add-card-btn" onclick="openModal(null,'${col.id}')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add card
      </button>`;

    board.appendChild(wrap);

    // Get the col-head element and make only it draggable
    const headEl = wrap.querySelector(".col-head");
    headEl.draggable = true;

    // column drag and drop for reordering - ONLY from header
    headEl.addEventListener("dragstart", (e) => {
      dragColId = col.id;
      setTimeout(() => wrap.classList.add("col-dragging"), 0);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/html", wrap.innerHTML);
    });
    headEl.addEventListener("dragend", () => {
      wrap.classList.remove("col-dragging");
      dragColId = null;
      document
        .querySelectorAll(".col")
        .forEach((c) => c.classList.remove("col-drag-over"));
    });
    wrap.addEventListener("dragover", (e) => {
      if (!dragColId) return; // only reorder columns, not cards
      e.preventDefault();
      const allCols = document.querySelectorAll(".col");
      allCols.forEach((c) => c.classList.remove("col-drag-over"));
      wrap.classList.add("col-drag-over");
    });
    wrap.addEventListener("dragleave", (e) => {
      if (!wrap.contains(e.relatedTarget))
        wrap.classList.remove("col-drag-over");
    });
    wrap.addEventListener("drop", (e) => {
      e.preventDefault();
      wrap.classList.remove("col-drag-over");
      if (dragColId && dragColId !== col.id) {
        const dragColIndex = cols.findIndex((c) => c.id === dragColId);
        const dropColIndex = cols.findIndex((c) => c.id === col.id);
        if (dragColIndex !== -1 && dropColIndex !== -1) {
          // swap columns
          [cols[dragColIndex], cols[dropColIndex]] = [
            cols[dropColIndex],
            cols[dragColIndex],
          ];
          render();
        }
      }
    });

    // card drag and drop
    wrap.querySelectorAll(".card[draggable]").forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        dragId = parseInt(card.dataset.id);
        setTimeout(() => card.classList.add("dragging"), 0);
        e.dataTransfer.effectAllowed = "move";
      });
      card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
        dragId = null;
        document
          .querySelectorAll(".col")
          .forEach((c) => c.classList.remove("drag-over"));
      });
    });

    // card drop zone
    wrap.addEventListener("dragover", (e) => {
      if (dragColId) return; // only accept card drops, not column drags
      e.preventDefault();
      document
        .querySelectorAll(".col")
        .forEach((c) => c.classList.remove("drag-over"));
      wrap.classList.add("drag-over");
    });
    wrap.addEventListener("dragleave", (e) => {
      if (!wrap.contains(e.relatedTarget)) wrap.classList.remove("drag-over");
    });
    wrap.addEventListener("drop", (e) => {
      if (dragColId) return; // only accept card drops
      e.preventDefault();
      wrap.classList.remove("drag-over");
      if (dragId != null) {
        const c = cards.find((x) => x.id === dragId);
        if (c) c.col = col.id;
        render();
      }
    });

    // col rename on double-click
    const nameEl = wrap.querySelector(".col-name");
    nameEl.addEventListener("dblclick", () => {
      const inp = document.createElement("input");
      inp.className = "col-name-input";
      inp.value = col.title;
      nameEl.replaceWith(inp);
      inp.focus();
      inp.select();
      const commit = () => {
        const t = inp.value.trim();
        if (t) col.title = t;
        render();
      };
      inp.addEventListener("blur", commit);
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") render();
      });
    });
  });

  updateStats();
}

function mkCard(c, isDoneCol) {
  const tag = TAG_DEFS.find((t) => t.id === c.tag);
  const priColor = PRI_COLORS[c.priority] || "transparent";
  const due = dueBadge(c.due);
  return `
    <div class="card" draggable="true" data-id="${c.id}">
      <div class="card-priority-bar" style="background:${priColor}"></div>
      <div class="card-actions">
        <button class="card-btn" onclick="openModal(${c.id},'${c.col}')">✎</button>
        <button class="card-btn del" onclick="deleteCard(${c.id})">×</button>
      </div>
      <div class="card-title${isDoneCol ? " done-text" : ""}">${esc(c.title)}</div>
      <div class="card-footer">
        ${tag ? `<span class="tag" style="background:${tag.bg};color:${tag.color}">${tag.label}</span>` : ""}
        ${c.notes ? `<span style="font-size:10px;color:var(--muted)" title="${esc(c.notes)}">📝</span>` : ""}
        ${due}
      </div>
    </div>`;
}

function dueBadge(due) {
  if (!due) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due + "T00:00:00");
  const diff = Math.round((d - today) / 86400000);
  let cls = "",
    txt;
  if (diff < 0) {
    cls = "overdue";
    txt = `${-diff}d overdue`;
  } else if (diff === 0) {
    cls = "soon";
    txt = "Today";
  } else if (diff <= 3) {
    cls = "soon";
    txt = `in ${diff}d`;
  } else {
    txt = d.toLocaleDateString("en", { month: "short", day: "numeric" });
  }
  return `<span class="due ${cls}">🗓 ${txt}</span>`;
}

function updateStats() {
  const total = cards.length;
  const doneId = cols.find((c) => c.title.toLowerCase() === "done")?.id;
  const done = doneId ? cards.filter((c) => c.col === doneId).length : 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = cards.filter(
    (c) => c.due && new Date(c.due + "T00:00:00") < today,
  ).length;
  document.getElementById("stats").innerHTML =
    `<span><span class="stat-val">${total}</span> cards</span>` +
    `<span><span class="stat-val">${done}</span> done</span>` +
    (overdue
      ? `<span style="color:#c0392b"><span class="stat-val">${overdue}</span> overdue</span>`
      : "");
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── calendar picker ───────────────────────────────────
let calYear = 0,
  calMonth = 0,
  calSelected = ""; // 'YYYY-MM-DD' or ''

function calInit(val) {
  const now = new Date();
  calSelected = val || "";
  if (val) {
    const d = new Date(val + "T00:00:00");
    calYear = d.getFullYear();
    calMonth = d.getMonth();
  } else {
    calYear = now.getFullYear();
    calMonth = now.getMonth();
  }
  renderCal();
  updateCalTrigger();
}

function renderCal() {
  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  document.getElementById("cal-month-label").textContent =
    MONTHS[calMonth] + " " + calYear;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  let html = DAYS.map((d) => `<div class="cal-dow">${d}</div>`).join("");
  for (let i = 0; i < firstDay; i++)
    html += `<div class="cal-day cal-empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr =
      calYear +
      "-" +
      String(calMonth + 1).padStart(2, "0") +
      "-" +
      String(d).padStart(2, "0");
    const thisDate = new Date(calYear, calMonth, d);
    const isPast = thisDate < today;
    const isToday = thisDate.getTime() === today.getTime();
    const isSel = dateStr === calSelected;
    const cls = [
      "cal-day",
      isPast ? "cal-past" : "",
      isToday ? "cal-today" : "",
      isSel ? "cal-selected" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const click = isPast ? "" : `onclick="calPick('${dateStr}')"`;
    html += `<div class="${cls}" ${click}>${d}</div>`;
  }
  document.getElementById("cal-grid").innerHTML = html;
}

function updateCalTrigger() {
  const disp = document.getElementById("cal-display");
  if (calSelected) {
    const d = new Date(calSelected + "T00:00:00");
    disp.textContent = d.toLocaleDateString("en", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    disp.style.color = "var(--text)";
  } else {
    disp.textContent = "No due date";
    disp.style.color = "var(--muted)";
  }
}

function toggleCal() {
  const dd = document.getElementById("cal-dropdown");
  const tr = document.getElementById("cal-trigger");
  const isOpen = dd.classList.contains("open");
  dd.classList.toggle("open", !isOpen);
  tr.classList.toggle("open", !isOpen);
}

function closeCal() {
  document.getElementById("cal-dropdown").classList.remove("open");
  document.getElementById("cal-trigger").classList.remove("open");
}

function calShift(dir) {
  calMonth += dir;
  if (calMonth > 11) {
    calMonth = 0;
    calYear++;
  }
  if (calMonth < 0) {
    calMonth = 11;
    calYear--;
  }
  renderCal();
}

function calPick(dateStr) {
  calSelected = dateStr;
  renderCal();
  updateCalTrigger();
  closeCal();
}

function calPickToday() {
  const t = new Date();
  calPick(
    t.getFullYear() +
      "-" +
      String(t.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(t.getDate()).padStart(2, "0"),
  );
}

function calClear() {
  calSelected = "";
  updateCalTrigger();
  closeCal();
}

// close cal when clicking outside
document.addEventListener(
  "click",
  (e) => {
    const wrap = document.querySelector(".cal-wrap");
    if (wrap && !wrap.contains(e.target)) closeCal();
  },
  true,
);

// ── modal ─────────────────────────────────────────────
function openModal(cardId, colId) {
  editId = cardId;
  editCol = colId;
  const c = cardId ? cards.find((x) => x.id === cardId) : null;
  document.getElementById("modal-title").textContent = c
    ? "Edit card"
    : "New card";
  document.getElementById("modal-save-btn").textContent = c
    ? "Save"
    : "Add card";
  document.getElementById("f-title").value = c ? c.title : "";
  document.getElementById("f-notes").value = c ? c.notes || "" : "";
  calInit(c ? c.due || "" : "");
  selTag = c ? c.tag || null : null;
  selPri = c ? c.priority || "med" : "med";
  buildTagPicker();
  buildPriPicker();
  document.getElementById("modal-bg").classList.add("open");
  setTimeout(() => document.getElementById("f-title").focus(), 80);
}

function closeModal() {
  document.getElementById("modal-bg").classList.remove("open");
  closeCal();
  editId = null;
  editCol = null;
}

function buildTagPicker() {
  document.getElementById("tag-picker").innerHTML =
    TAG_DEFS.map(
      (t) => `
      <div class="tag-wrapper">
        <div class="tag-opt${selTag === t.id ? " selected" : ""}"
             style="background:${t.bg};color:${t.color}"
             onclick="selTag='${t.id}';buildTagPicker()">${t.label}</div>
        <button class="tag-edit-btn" onclick="openTagModal('${t.id}')" title="Edit tag">⚙</button>
      </div>
    `,
    ).join("") +
    `<div class="tag-wrapper">
      <div class="tag-opt${selTag === null ? " selected" : ""}"
            style="background:var(--surface2);color:var(--muted)"
            onclick="selTag=null;buildTagPicker()">None</div>
    </div>
    <button class="tag-manage-btn" onclick="openTagModal()" title="Add new tag">+</button>`;
}

function buildPriPicker() {
  document.querySelectorAll("#pri-picker .pri-opt").forEach((el) => {
    const p = el.dataset.p;
    el.className = "pri-opt" + (selPri === p ? ` sel-${p}` : "");
    el.onclick = () => {
      selPri = p;
      buildPriPicker();
    };
  });
}

function saveCard() {
  const title = document.getElementById("f-title").value.trim();
  if (!title) {
    document.getElementById("f-title").style.borderColor = "#c0392b";
    document.getElementById("f-title").focus();
    return;
  }
  document.getElementById("f-title").style.borderColor = "";
  const notes = document.getElementById("f-notes").value.trim();
  const due = calSelected;
  if (editId) {
    const c = cards.find((x) => x.id === editId);
    if (c)
      Object.assign(c, {
        title,
        notes,
        due,
        tag: selTag,
        priority: selPri,
      });
  } else {
    cards.push({
      id: nextId++,
      col: editCol,
      title,
      notes,
      due,
      tag: selTag,
      priority: selPri,
    });
  }
  closeModal();
  render();
}

function deleteCard(id) {
  if (!confirm("Delete this card?")) return;
  cards = cards.filter((c) => c.id !== id);
  render();
}

function deleteCol(id) {
  const n = cards.filter((c) => c.col === id).length;
  if (n > 0 && !confirm(`Delete column and its ${n} card${n > 1 ? "s" : ""}?`))
    return;
  cols = cols.filter((c) => c.id !== id);
  cards = cards.filter((c) => c.col !== id);
  render();
}

// ── new column modal ─────────────────────────────────
const SWATCH_COLORS = [
  "#378ADD",
  "#7F77DD",
  "#27ae60",
  "#e67e22",
  "#c0392b",
  "#1abc9c",
  "#8e44ad",
  "#e91e8c",
  "#f39c12",
  "#16a085",
  "#2c3e50",
  "#d35400",
  "#6c757d",
  "#0097a7",
  "#558b2f",
];
let pickedColor = SWATCH_COLORS[0];

function openColModal() {
  pickedColor = SWATCH_COLORS[colIdx % SWATCH_COLORS.length];
  document.getElementById("col-name-inp").value = "";
  buildColorGrid();
  document.getElementById("col-modal-bg").classList.add("open");
  setTimeout(() => document.getElementById("col-name-inp").focus(), 80);
}
function closeColModal() {
  document.getElementById("col-modal-bg").classList.remove("open");
}
function buildColorGrid() {
  document.getElementById("color-grid").innerHTML = SWATCH_COLORS.map(
    (c) =>
      `<div class="color-swatch${c === pickedColor ? " picked" : ""}" style="background:${c}" onclick="pickedColor='${c}';buildColorGrid()"></div>`,
  ).join("");
}
function saveColumn() {
  const name = document.getElementById("col-name-inp").value.trim();
  if (!name) {
    document.getElementById("col-name-inp").style.borderColor = "#c0392b";
    document.getElementById("col-name-inp").focus();
    return;
  }
  document.getElementById("col-name-inp").style.borderColor = "";
  cols.push({
    id: "c" + ++colIdx + "_" + Date.now(),
    title: name,
    color: pickedColor,
  });
  closeColModal();
  render();
}

function addColumn() {
  openColModal();
}

// ── theme ─────────────────────────────────────────────
let dark = localStorage.getItem("kb_theme") === "dark";
function applyTheme() {
  document.documentElement.classList.toggle("dark", dark);
  const btn = document.getElementById("theme-btn");
  if (btn) btn.textContent = dark ? "☀️" : "🌙";
  localStorage.setItem("kb_theme", dark ? "dark" : "light");
}
function toggleTheme() {
  dark = !dark;
  applyTheme();
}
applyTheme();

// ── tag management ─────────────────────────────────────
let editingTagId = null;
let editingTagLabel = "";
let editingTagBg = "#dbeafe";
let editingTagColor = "#1e40af";

function openTagModal(tagId = null) {
  editingTagId = tagId;
  if (tagId) {
    const tag = TAG_DEFS.find((t) => t.id === tagId);
    if (tag) {
      editingTagLabel = tag.label;
      editingTagBg = tag.bg;
      editingTagColor = tag.color;
      document.getElementById("tag-modal-title").textContent = "Edit tag";
      document.getElementById("tag-save-btn").textContent = "Save";
      document.getElementById("tag-del-btn").style.display = "block";
    }
  } else {
    editingTagLabel = "";
    editingTagBg = "#dbeafe";
    editingTagColor = "#1e40af";
    document.getElementById("tag-modal-title").textContent = "New tag";
    document.getElementById("tag-save-btn").textContent = "Add";
    document.getElementById("tag-del-btn").style.display = "none";
  }
  document.getElementById("tag-label-inp").value = editingTagLabel;
  document.getElementById("tag-bg-inp").value = editingTagBg;
  document.getElementById("tag-color-inp").value = editingTagColor;
  document.getElementById("tag-modal-bg").classList.add("open");
  setTimeout(() => document.getElementById("tag-label-inp").focus(), 80);
}

function closeTagModal() {
  document.getElementById("tag-modal-bg").classList.remove("open");
  editingTagId = null;
}

function saveTag() {
  const label = document.getElementById("tag-label-inp").value.trim();
  const bg = document.getElementById("tag-bg-inp").value;
  const color = document.getElementById("tag-color-inp").value;
  if (!label) {
    document.getElementById("tag-label-inp").style.borderColor = "#c0392b";
    return;
  }
  document.getElementById("tag-label-inp").style.borderColor = "";
  if (editingTagId) {
    const tag = TAG_DEFS.find((t) => t.id === editingTagId);
    if (tag) {
      tag.label = label;
      tag.bg = bg;
      tag.color = color;
    }
  } else {
    TAG_DEFS.push({
      id: "tag_" + Date.now(),
      label,
      bg,
      color,
    });
  }
  persist();
  closeTagModal();
  buildTagPicker();
}

function deleteTag() {
  if (!editingTagId) return;
  if (!confirm("Delete this tag?")) return;
  TAG_DEFS = TAG_DEFS.filter((t) => t.id !== editingTagId);
  persist();
  closeTagModal();
  buildTagPicker();
}

// keyboard
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    closeColModal();
    closeTagModal();
  }
  if (
    e.key === "Enter" &&
    document.getElementById("modal-bg").classList.contains("open")
  ) {
    if (document.activeElement.tagName !== "TEXTAREA") {
      e.preventDefault();
      saveCard();
    }
  }
  if (
    e.key === "Enter" &&
    document.getElementById("col-modal-bg").classList.contains("open")
  ) {
    e.preventDefault();
    saveColumn();
  }
  if (
    e.key === "Enter" &&
    document.getElementById("tag-modal-bg").classList.contains("open")
  ) {
    e.preventDefault();
    saveTag();
  }
});
document.getElementById("modal-bg").addEventListener("click", (e) => {
  if (e.target === document.getElementById("modal-bg")) closeModal();
});
document.getElementById("col-modal-bg").addEventListener("click", (e) => {
  if (e.target === document.getElementById("col-modal-bg")) closeColModal();
});
document.getElementById("tag-modal-bg").addEventListener("click", (e) => {
  if (e.target === document.getElementById("tag-modal-bg")) closeTagModal();
});

render();
