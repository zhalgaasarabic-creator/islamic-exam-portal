(function () {
  const C = window.TULGA_CONTENT;
  const API = "/api/tulga";
  const MENTOR_PASSCODES = ["2002", "admin"];

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

  const TABS = [
    { id: "day1", label: "1-күн · Диагностика" },
    { id: "day2", label: "2-күн" },
    { id: "day3", label: "3-күн" },
    { id: "day4", label: "4-күн" },
    { id: "day5", label: "5-күн" },
    { id: "day6", label: "6-күн" },
    { id: "day7", label: "7-күн · Қорытынды" }
  ];

  let participant = null; // {id, name, group}
  let answers = {}; // { day1: {...}, day2: {...}, ... }
  let activeTab = "day1";
  let saveTimer = null;

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.add("hidden"), 2200);
  }

  function draftKey() { return "tulga_draft_" + participant.id; }
  function saveDraftLocal() { try { localStorage.setItem(draftKey(), JSON.stringify(answers)); } catch (e) {} }
  function loadDraftLocal() { try { return JSON.parse(localStorage.getItem(draftKey()) || "{}"); } catch (e) { return {}; } }

  function scheduleAutosave() {
    saveDraftLocal();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => submitDay(activeTab, true), 1500);
  }

  // ---------- API ----------
  async function apiPost(path, body) {
    const r = await fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error("request failed");
    return r.json();
  }
  async function apiGet(path) {
    const r = await fetch(API + path);
    if (!r.ok) throw new Error("request failed");
    return r.json();
  }

  async function registerParticipant(name, group) {
    return apiPost("/participants", { name, group });
  }
  async function fetchSubmissions(participantId) {
    return apiGet("/submissions/" + participantId);
  }
  async function submitDay(day, silent) {
    if (!participant) return;
    try {
      await apiPost("/submissions", { participantId: participant.id, day, data: answers[day] || {} });
      if (!silent) toast("Сақталды ✓");
    } catch (e) {
      if (!silent) toast("Сақтау кезінде қате шықты");
    }
  }

  // ---------- generic field widgets ----------
  function fieldWrap(label) {
    const wrap = el("div", "field");
    if (label) wrap.appendChild(el("label", null, label));
    return wrap;
  }

  function renderText(container, label, value, onChange, opts) {
    opts = opts || {};
    const wrap = fieldWrap(label);
    const input = el(opts.type === "number" ? "input" : "input");
    input.className = "input";
    input.type = opts.type === "number" ? "number" : "text";
    input.placeholder = opts.placeholder || "";
    input.value = value || "";
    input.addEventListener("input", () => onChange(opts.type === "number" ? input.value : input.value));
    wrap.appendChild(input);
    if (opts.suffix) wrap.appendChild(el("div", null, "")).textContent = "";
    container.appendChild(wrap);
  }

  function renderTextarea(container, label, value, onChange, big) {
    const wrap = fieldWrap(label);
    const ta = el("textarea", "input" + (big ? " big" : ""));
    ta.value = value || "";
    ta.addEventListener("input", () => onChange(ta.value));
    wrap.appendChild(ta);
    container.appendChild(wrap);
  }

  function renderCheckbox(container, label, value, onChange) {
    const wrap = el("div", "field checkbox-row");
    const cb = el("input");
    cb.type = "checkbox";
    cb.checked = !!value;
    cb.addEventListener("change", () => onChange(cb.checked));
    wrap.appendChild(cb);
    wrap.appendChild(el("label", null, label));
    container.appendChild(wrap);
  }

  function renderListExact(container, label, count, values, onChange) {
    const wrap = fieldWrap(label);
    const box = el("div", "list-input");
    const arr = (values && values.length === count) ? values.slice() : new Array(count).fill("");
    for (let i = 0; i < count; i++) {
      const input = el("input");
      input.placeholder = (i + 1) + ")";
      input.value = arr[i] || "";
      input.addEventListener("input", () => { arr[i] = input.value; onChange(arr.slice()); });
      box.appendChild(input);
    }
    wrap.appendChild(box);
    container.appendChild(wrap);
  }

  function renderListMin(container, label, min, values, onChange) {
    const wrap = fieldWrap(label + " (кемінде " + min + ")");
    const box = el("div", "list-input");
    let arr = (values && values.length) ? values.slice() : new Array(min).fill("");
    function draw() {
      box.innerHTML = "";
      arr.forEach((v, i) => {
        const input = el("input");
        input.placeholder = (i + 1) + ")";
        input.value = v || "";
        input.addEventListener("input", () => { arr[i] = input.value; onChange(arr.slice()); });
        box.appendChild(input);
      });
    }
    draw();
    const addBtn = el("button", "btn btn-outline btn-sm list-add-btn", '<i class="fa-solid fa-plus"></i> Қосу');
    addBtn.type = "button";
    addBtn.addEventListener("click", () => { arr.push(""); draw(); onChange(arr.slice()); });
    wrap.appendChild(box);
    wrap.appendChild(addBtn);
    container.appendChild(wrap);
  }

  function renderScale1to5(container, items, values, onChange) {
    const arr = (values && values.length === items.length) ? values.slice() : new Array(items.length).fill(0);
    items.forEach((text, i) => {
      const row = el("div", "scale-item");
      row.appendChild(el("div", "stext", text));
      const opts = el("div", "scale-opts");
      for (let n = 1; n <= 5; n++) {
        const b = el("button", n === arr[i] ? "active" : "", n);
        b.type = "button";
        b.addEventListener("click", () => {
          arr[i] = n;
          $$("button", opts).forEach((x, xi) => x.classList.toggle("active", xi + 1 === n));
          onChange(arr.slice());
          updateSumBar();
        });
        opts.appendChild(b);
      }
      row.appendChild(opts);
      container.appendChild(row);
    });
    const bar = el("div", "sum-bar");
    bar.dataset.role = "sumbar";
    container.appendChild(bar);
    function updateSumBar() {
      const sum = arr.reduce((a, b) => a + (b || 0), 0);
      bar.textContent = "Қосынды: " + sum + " / " + (items.length * 5);
    }
    updateSumBar();
  }

  function renderFactOpinion(container, items, values, onChange) {
    const arr = (values && values.length === items.length) ? values.slice() : items.map(() => ({ type: "", reason: "" }));
    items.forEach((text, i) => {
      const row = el("div", "fo-item");
      row.appendChild(el("div", "fo-text", text));
      const choices = el("div", "fo-choices");
      ["Ф", "П"].forEach((letter) => {
        const b = el("button", arr[i].type === letter ? "active" : "", letter === "Ф" ? "Ф — Факт" : "П — Пікір");
        b.type = "button";
        b.addEventListener("click", () => {
          arr[i].type = letter;
          $$("button", choices).forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
          onChange(arr.slice());
        });
        choices.appendChild(b);
      });
      row.appendChild(choices);
      const reason = el("input");
      reason.className = "input";
      reason.placeholder = "Неге?";
      reason.value = arr[i].reason || "";
      reason.addEventListener("input", () => { arr[i].reason = reason.value; onChange(arr.slice()); });
      row.appendChild(reason);
      container.appendChild(row);
    });
  }

  function renderRating(container, label, min, max, value, onChange) {
    const wrap = fieldWrap(label);
    const row = el("div", "rating-row");
    for (let n = min; n <= max; n++) {
      const b = el("button", n === value ? "active" : "", n);
      b.type = "button";
      b.addEventListener("click", () => {
        $$("button", row).forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        onChange(n);
      });
      row.appendChild(b);
    }
    wrap.appendChild(row);
    container.appendChild(wrap);
  }

  function renderPillChoices(container, label, options, value, onChange) {
    const wrap = fieldWrap(label);
    const row = el("div", "pill-choices");
    options.forEach((opt) => {
      const optVal = typeof opt === "string" ? opt : opt.value;
      const optLabel = typeof opt === "string" ? opt : opt.label;
      const b = el("button", optVal === value ? "active" : "", optLabel);
      b.type = "button";
      b.addEventListener("click", () => {
        $$("button", row).forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        onChange(optVal);
      });
      row.appendChild(b);
    });
    wrap.appendChild(row);
    container.appendChild(wrap);
  }

  function renderMatrixTable(container, columns, rows, values, onChange) {
    const data = values || {};
    const wrap = el("div", "matrix-wrap");
    const table = el("table", "matrix-table");
    const thead = el("tr");
    thead.appendChild(el("th", null, ""));
    columns.forEach((c) => thead.appendChild(el("th", null, c)));
    table.appendChild(thead);
    rows.forEach((r) => {
      const tr = el("tr");
      tr.appendChild(el("td", null, "<b>" + r + "</b>"));
      columns.forEach((c) => {
        const td = el("td");
        const input = el("input");
        const key = c + "|" + r;
        input.value = (data[key] || "");
        input.addEventListener("input", () => { data[key] = input.value; onChange(Object.assign({}, data)); });
        td.appendChild(input);
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
    wrap.appendChild(table);
    container.appendChild(wrap);
  }

  function renderGenericField(container, spec, value, onChange) {
    if (spec.type === "textarea") renderTextarea(container, spec.label, value, onChange, spec.big);
    else if (spec.type === "listExact") renderListExact(container, spec.label, spec.count, value, onChange);
    else if (spec.type === "listmin") renderListMin(container, spec.label, spec.min, value, onChange);
    else if (spec.type === "checkbox") renderCheckbox(container, spec.label, value, onChange);
    else if (spec.type === "number") renderText(container, spec.label + (spec.suffix ? " (" + spec.suffix + ")" : ""), value, onChange, { type: "number", placeholder: spec.placeholder });
    else renderText(container, spec.label, value, onChange, { placeholder: spec.placeholder });
  }

  function section(title, maxBadge) {
    const s = el("div", "section");
    const h = el("h2", null, title);
    if (maxBadge) { const b = el("span", "max-badge", maxBadge + " балл"); h.appendChild(b); }
    s.appendChild(h);
    return s;
  }

  function ensureDay(day) { if (!answers[day]) answers[day] = {}; return answers[day]; }

  // ---------- DAY 1 ----------
  function renderDay1(root) {
    const d = ensureDay("day1");

    const s0 = section(C.selfAssessment.title, C.selfAssessment.max);
    s0.appendChild(el("p", null, C.selfAssessment.note));
    d.selfAssessment = d.selfAssessment || [];
    renderScale1to5(s0, C.selfAssessment.items, d.selfAssessment, (v) => { d.selfAssessment = v; scheduleAutosave(); });
    root.appendChild(s0);

    d.objective = d.objective || {};
    const obj = C.objective;

    const s1 = section(obj.mainIdea.title, obj.mainIdea.max);
    s1.appendChild(el("p", null, obj.mainIdea.text));
    d.objective.mainIdea = d.objective.mainIdea || { qa: [] };
    obj.mainIdea.questions.forEach((q, i) => {
      renderTextarea(s1, q, d.objective.mainIdea.qa[i], (v) => { d.objective.mainIdea.qa[i] = v; scheduleAutosave(); });
    });
    root.appendChild(s1);

    const s2 = section(obj.factOpinion.title, obj.factOpinion.max);
    s2.appendChild(el("p", null, obj.factOpinion.note));
    d.objective.factOpinion = d.objective.factOpinion || { items: [] };
    renderFactOpinion(s2, obj.factOpinion.items, d.objective.factOpinion.items, (v) => { d.objective.factOpinion.items = v; scheduleAutosave(); });
    root.appendChild(s2);

    const s3 = section(obj.causeEffect.title, obj.causeEffect.max);
    s3.appendChild(el("p", null, obj.causeEffect.statement));
    d.objective.causeEffect = d.objective.causeEffect || { list: [] };
    renderListMin(s3, obj.causeEffect.question, obj.causeEffect.minItems, d.objective.causeEffect.list, (v) => { d.objective.causeEffect.list = v; scheduleAutosave(); });
    root.appendChild(s3);

    const s4 = section(obj.criticalThinking.title, obj.criticalThinking.max);
    s4.appendChild(el("p", null, obj.criticalThinking.scenario));
    s4.appendChild(el("p", null, "<i>" + obj.criticalThinking.hint + "</i>"));
    d.objective.criticalThinking = d.objective.criticalThinking || { list: [] };
    renderListMin(s4, obj.criticalThinking.question, obj.criticalThinking.minItems, d.objective.criticalThinking.list, (v) => { d.objective.criticalThinking.list = v; scheduleAutosave(); });
    root.appendChild(s4);

    const s5 = section(obj.problemSolving.title, obj.problemSolving.max);
    s5.appendChild(el("p", null, obj.problemSolving.scenario));
    d.objective.problemSolving = d.objective.problemSolving || {};
    obj.problemSolving.fields.forEach((f) => {
      renderGenericField(s5, f, d.objective.problemSolving[f.key], (v) => { d.objective.problemSolving[f.key] = v; scheduleAutosave(); });
    });
    root.appendChild(s5);

    const s6 = section(obj.responsibility.title, obj.responsibility.max);
    d.objective.responsibility = d.objective.responsibility || {};
    obj.responsibility.fields.forEach((f) => {
      renderGenericField(s6, f, d.objective.responsibility[f.key], (v) => { d.objective.responsibility[f.key] = v; scheduleAutosave(); });
    });
    root.appendChild(s6);

    const sb = section(C.book.title);
    sb.appendChild(el("p", null, C.book.text));
    root.appendChild(sb);

    appendDiary(root, "day1");
  }

  // ---------- DAY 2/3/6 generic-field days ----------
  function renderSimpleDay(root, dayContent) {
    const d = ensureDay(dayContent.id);
    const s = section(dayContent.title);
    s.appendChild(el("p", null, dayContent.intro));
    dayContent.fields.forEach((f) => {
      renderGenericField(s, f, d[f.key], (v) => { d[f.key] = v; scheduleAutosave(); });
    });
    root.appendChild(s);
    appendDiary(root, dayContent.id);
  }

  // ---------- DAY 4 ----------
  function renderDay4(root) {
    const dc = C.days.find((x) => x.id === "day4");
    const d = ensureDay("day4");
    const s = section(dc.title);
    s.appendChild(el("p", null, dc.intro));
    dc.fields.forEach((f) => renderGenericField(s, f, d[f.key], (v) => { d[f.key] = v; scheduleAutosave(); }));
    root.appendChild(s);

    const sm = section(dc.map.title);
    d.map = d.map && d.map.length === dc.map.steps.length ? d.map : new Array(dc.map.steps.length).fill("");
    dc.map.steps.forEach((label, i) => {
      renderText(sm, (i + 1) + ". " + label, d.map[i], (v) => { d.map[i] = v; scheduleAutosave(); });
    });
    root.appendChild(sm);
    appendDiary(root, "day4");
  }

  // ---------- DAY 5 ----------
  function renderDay5(root) {
    const dc = C.days.find((x) => x.id === "day5");
    const d = ensureDay("day5");
    const s = section(dc.title);
    s.appendChild(el("p", null, dc.intro));
    renderText(s, "Қандай ақпарат/тақырып таңдадыңыз?", d.topic, (v) => { d.topic = v; scheduleAutosave(); });
    d.filters = d.filters && d.filters.length === dc.filters.length ? d.filters : new Array(dc.filters.length).fill("");
    dc.filters.forEach((q, i) => {
      renderTextarea(s, q, d.filters[i], (v) => { d.filters[i] = v; scheduleAutosave(); });
    });
    renderPillChoices(s, "Қорытынды", dc.verdictOptions, d.verdict, (v) => { d.verdict = v; scheduleAutosave(); });
    renderTextarea(s, "Түсініктеме", d.verdictNote, (v) => { d.verdictNote = v; scheduleAutosave(); });
    root.appendChild(s);
    appendDiary(root, "day5");
  }

  // ---------- DAY 6 ----------
  function renderDay6(root) {
    const dc = C.days.find((x) => x.id === "day6");
    const d = ensureDay("day6");
    const s = section(dc.title);
    s.appendChild(el("p", null, dc.intro));
    dc.fields.forEach((f) => renderGenericField(s, f, d[f.key], (v) => { d[f.key] = v; scheduleAutosave(); }));
    renderPillChoices(s, "Осы тапсырмадан кейін менің пікірім...", dc.resultOptions, d.result, (v) => { d.result = v; scheduleAutosave(); });
    root.appendChild(s);
    appendDiary(root, "day6");
  }

  // ---------- DAY 7 ----------
  function renderDay7(root) {
    const dc = C.day7;
    const d = ensureDay("day7");
    const s0 = section(dc.title);
    s0.appendChild(el("p", null, dc.intro));
    root.appendChild(s0);

    const sMatrix = section(dc.matrix.title);
    d.matrix = d.matrix || {};
    renderMatrixTable(sMatrix, dc.matrix.columns, dc.matrix.rows, d.matrix, (v) => { d.matrix = v; scheduleAutosave(); });
    root.appendChild(sMatrix);

    const sFinal = section(dc.finalStatement.title);
    d.final = d.final || {};
    dc.finalStatement.fields.forEach((f) => renderGenericField(sFinal, f, d.final[f.key], (v) => { d.final[f.key] = v; scheduleAutosave(); }));
    root.appendChild(sFinal);

    const sCase = section(C.caseExam.title, C.caseExam.rubricTotal);
    sCase.appendChild(el("p", null, C.caseExam.intro));
    sCase.appendChild(el("p", null, "<b>Кейс:</b> " + C.caseExam.case));
    d.caseExam = d.caseExam || {};
    C.caseExam.questions.forEach((q) => renderGenericField(sCase, q, d.caseExam[q.key], (v) => { d.caseExam[q.key] = v; scheduleAutosave(); }));
    root.appendChild(sCase);

    const sReport = section(C.weeklyReport.title);
    d.weeklyReport = d.weeklyReport || {};
    C.weeklyReport.fields.forEach((f) => renderGenericField(sReport, f, d.weeklyReport[f.key], (v) => { d.weeklyReport[f.key] = v; scheduleAutosave(); }));
    root.appendChild(sReport);
  }

  function appendDiary(root, dayId) {
    const d = ensureDay(dayId);
    d.diary = d.diary || {};
    const s = section(C.diary.title);
    C.diary.fields.forEach((f) => renderGenericField(s, f, d.diary[f.key], (v) => { d.diary[f.key] = v; scheduleAutosave(); }));
    renderRating(s, C.diary.rating.label, C.diary.rating.min, C.diary.rating.max, d.diary[C.diary.rating.key], (v) => { d.diary[C.diary.rating.key] = v; scheduleAutosave(); });
    root.appendChild(s);
  }

  const DAY_RENDERERS = {
    day1: renderDay1,
    day2: (root) => renderSimpleDay(root, C.days.find((x) => x.id === "day2")),
    day3: (root) => renderSimpleDay(root, C.days.find((x) => x.id === "day3")),
    day4: renderDay4,
    day5: renderDay5,
    day6: renderDay6,
    day7: renderDay7
  };

  function renderTabs() {
    const tabsEl = $("#tabs");
    tabsEl.innerHTML = "";
    TABS.forEach((t) => {
      const b = el("button", "tab-btn" + (t.id === activeTab ? " active" : "") + (isDayFilled(t.id) ? " done" : ""), t.label);
      b.addEventListener("click", () => switchTab(t.id));
      tabsEl.appendChild(b);
    });
  }

  function isDayFilled(dayId) {
    const d = answers[dayId];
    if (!d) return false;
    return Object.keys(d).length > 0;
  }

  function switchTab(id) {
    submitDay(activeTab, true);
    activeTab = id;
    renderTabs();
    renderContent();
    window.scrollTo(0, 0);
  }

  function renderContent() {
    const root = $("#content");
    root.innerHTML = "";
    DAY_RENDERERS[activeTab](root);
    const bar = el("div", "save-bar");
    const saveBtn = el("button", "btn btn-primary", '<i class="fa-solid fa-floppy-disk"></i> Сақтау');
    saveBtn.addEventListener("click", () => submitDay(activeTab, false));
    bar.appendChild(saveBtn);
    root.appendChild(bar);
  }

  async function startApp(p) {
    participant = p;
    localStorage.setItem("tulga_participant", JSON.stringify(p));
    $("#whoami").textContent = p.name + " · " + p.group;
    let serverData = {};
    try {
      serverData = await fetchSubmissions(p.id);
    } catch (e) {}
    const local = loadDraftLocal();
    answers = Object.assign({}, local, serverData);
    $("#reg-screen").classList.add("hidden");
    $("#app-screen").classList.remove("hidden");
    renderTabs();
    renderContent();
  }

  // ---------- MENTOR DASHBOARD ----------
  let mentorParticipants = [];
  let mentorActiveId = null;

  async function loadMentorList() {
    mentorParticipants = await apiGet("/participants");
    const list = $("#mentor-participant-list");
    list.innerHTML = "";
    if (!mentorParticipants.length) {
      list.appendChild(el("div", "empty-hint", "Әзірге қатысушы жоқ"));
      return;
    }
    mentorParticipants.forEach((p) => {
      const item = el("div", "mentor-item" + (p.id === mentorActiveId ? " active" : ""));
      item.appendChild(el("div", "mname", p.name));
      item.appendChild(el("div", "mgroup", p.group));
      item.appendChild(el("div", "mprogress", "Тіркелген: " + new Date(p.createdAt).toLocaleDateString("kk-KZ")));
      item.addEventListener("click", () => { mentorActiveId = p.id; loadMentorList(); loadMentorDetail(p); });
      list.appendChild(item);
    });
  }

  function answerText(v) {
    if (v === undefined || v === null || v === "") return "—";
    if (Array.isArray(v)) return v.filter(Boolean).join("; ") || "—";
    if (typeof v === "object") return Object.entries(v).map(([k, val]) => k + ": " + val).join("; ") || "—";
    if (v === true) return "Иә";
    if (v === false) return "Жоқ";
    return String(v);
  }

  function renderAnswerBlock(container, title, obj) {
    if (!obj || !Object.keys(obj).length) return;
    const block = el("div", "mentor-day-block");
    block.appendChild(el("h3", null, title));
    Object.entries(obj).forEach(([k, v]) => {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        renderAnswerBlock(block, k, v);
        return;
      }
      const row = el("div", "answer-row");
      row.appendChild(el("span", "qlabel", k));
      row.appendChild(el("span", null, answerText(v)));
      block.appendChild(row);
    });
    container.appendChild(block);
  }

  async function loadMentorDetail(p) {
    const detail = $("#mentor-detail");
    detail.innerHTML = "<div class='empty-hint'>Жүктелуде...</div>";
    let subs = {};
    let scorecard = null;
    try { subs = await apiGet("/submissions/" + p.id); } catch (e) {}
    try { scorecard = await apiGet("/scorecard/" + p.id); } catch (e) {}

    detail.innerHTML = "";
    const head = el("div", "section");
    head.appendChild(el("h2", null, p.name + " — " + p.group));
    detail.appendChild(head);

    TABS.forEach((t) => renderAnswerBlock(detail, t.label, subs[t.id]));

    const scoreSection = section(C.scorecard.title, C.scorecard.max);
    const scores = (scorecard && scorecard.scores) ? scorecard.scores : {};
    const inputs = {};
    C.scorecard.criteria.forEach((crit) => {
      const row = el("div", "score-grid");
      row.appendChild(el("label", null, crit));
      const input = el("input");
      input.type = "number";
      input.min = 0;
      input.max = C.scorecard.perCriterionMax;
      input.value = scores[crit] !== undefined ? scores[crit] : "";
      inputs[crit] = input;
      input.addEventListener("input", updateTotal);
      row.appendChild(input);
      scoreSection.appendChild(row);
    });
    const totalBar = el("div", "sum-bar");
    scoreSection.appendChild(totalBar);
    function updateTotal() {
      let total = 0;
      C.scorecard.criteria.forEach((c) => { total += parseInt(inputs[c].value, 10) || 0; });
      totalBar.textContent = "Жалпы: " + total + " / " + C.scorecard.max;
      return total;
    }
    updateTotal();

    const noteWrap = fieldWrap("Жетекшінің пікірі");
    const noteTa = el("textarea", "input");
    noteTa.value = (scorecard && scorecard.note) || "";
    noteWrap.appendChild(noteTa);
    scoreSection.appendChild(noteWrap);

    const saveBtn = el("button", "btn btn-primary", '<i class="fa-solid fa-floppy-disk"></i> Scorecard сақтау');
    saveBtn.addEventListener("click", async () => {
      const scoresOut = {};
      C.scorecard.criteria.forEach((c) => { scoresOut[c] = parseInt(inputs[c].value, 10) || 0; });
      const total = updateTotal();
      try {
        await apiPost("/scorecard", { participantId: p.id, module: C.moduleTitle, scores: scoresOut, total, note: noteTa.value });
        toast("Scorecard сақталды ✓");
      } catch (e) { toast("Қате шықты"); }
    });
    scoreSection.appendChild(saveBtn);
    detail.appendChild(scoreSection);
  }

  // ---------- BOOTSTRAP ----------
  function init() {
    $("#reg-start-btn").addEventListener("click", async () => {
      const name = $("#reg-name").value.trim();
      const group = $("#reg-group").value.trim();
      if (!name || !group) { toast("Аты-жөні мен тобыңызды толтырыңыз"); return; }
      try {
        const p = await registerParticipant(name, group);
        startApp(p);
      } catch (e) { toast("Серверге қосылу қатесі"); }
    });

    $("#mentor-login-btn").addEventListener("click", () => {
      $("#mentor-error").classList.add("hidden");
      $("#mentor-passcode").value = "";
      $("#mentor-modal").classList.remove("hidden");
    });
    $("#mentor-cancel-btn").addEventListener("click", () => $("#mentor-modal").classList.add("hidden"));
    $("#mentor-submit-btn").addEventListener("click", () => {
      const code = $("#mentor-passcode").value.trim();
      if (MENTOR_PASSCODES.includes(code)) {
        $("#mentor-modal").classList.add("hidden");
        $("#reg-screen").classList.add("hidden");
        $("#mentor-screen").classList.remove("hidden");
        loadMentorList();
      } else {
        $("#mentor-error").classList.remove("hidden");
      }
    });

    $("#logout-btn").addEventListener("click", () => {
      submitDay(activeTab, true);
      localStorage.removeItem("tulga_participant");
      location.reload();
    });
    $("#mentor-logout-btn").addEventListener("click", () => location.reload());

    window.addEventListener("beforeunload", () => { if (participant) submitDay(activeTab, true); });

    const saved = localStorage.getItem("tulga_participant");
    if (saved) {
      try { startApp(JSON.parse(saved)); } catch (e) {}
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
