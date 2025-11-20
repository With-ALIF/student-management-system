document.addEventListener("DOMContentLoaded", () => {
  // --- safer fetch with clearer error messaging ---
  fetch("../src/data.html")
    .then(response => {
      if (!response.ok) throw new Error("Network error: " + response.status + " " + response.statusText);
      return response.text();
    })
    .then(html => {
      const target = document.getElementById("data");
      if (!target) {
        console.error("Target element #data not found in DOM. Can't insert fetched HTML.");
        return;
      }
      target.innerHTML = html;
    })
    .catch(err => {
      console.error("Fetch failed:", err);
      const target = document.getElementById("data");
      if (target) {
        target.innerHTML =
          "<p style='color:red'>Failed to load attendance template. Check console for details.</p>";
      }
      // Helpful hint if file:// issue suspected
      if (location.protocol === "file:") {
        console.warn("You're loading the page using file://. fetch() to local files can be blocked. Try running a local HTTP server (e.g., VSCode Live Server).");
      }
    });
});

// Student management localStorage script (defensive / with null-checks)
(function(){
  // ---------- config / selectors ----------
  const LS_KEY = 'students';
  const LS_NEXTID = 'students_nextId';

  // find inputs safely
  const nameInput = document.querySelector('input[placeholder="Type Student Name"]');
  const contactInput = document.querySelector('input[placeholder="11 digit mobile number"]');
  const sectionSelect = document.getElementById('option'); // make sure HTML has id="option"
  const salaryInput = document.getElementById('salary');
  const dateInput = document.getElementById('attendanceDate');
  const addBtn = document.getElementById('addBtn');
  const clearBtn = document.getElementById('clearForm');
  const errorMsg = document.getElementById('errorMsg');

  const searchInput = document.getElementById('searchInput');
  const sectionFilter = document.getElementById('sectionFilter');
  const resetFilterBtn = document.getElementById('resetFilter');
  const summaryText = document.getElementById('summaryText');

  const studentTableBody = document.getElementById('studentTable');

  // quick null-check: if any required element missing, stop and log
  const required = [
    ['nameInput', nameInput],
    ['contactInput', contactInput],
    ['sectionSelect', sectionSelect],
    ['salaryInput', salaryInput],
    ['dateInput', dateInput],
    ['addBtn', addBtn],
    ['studentTableBody', studentTableBody],
  ];
  const missing = required.filter(([,el]) => !el).map(([k]) => k);
  if (missing.length) {
    console.error("Student script aborted. Missing required elements:", missing.join(', '));
    // optionally show visible message on page
    const body = document.body;
    const warn = document.createElement('div');
    warn.style.background = '#fee';
    warn.style.color = '#900';
    warn.style.padding = '8px';
    warn.textContent = 'Some required elements for student-management are missing: ' + missing.join(', ');
    body.insertBefore(warn, body.firstChild);
    return; // abort script so errors don't crash
  }

  let students = [];
  let editingId = null; // id when editing

  // ---------- util ----------
  function loadStudents(){
    try {
      const raw = localStorage.getItem(LS_KEY);
      students = raw ? JSON.parse(raw) : [];
    } catch(e){
      console.warn("Failed parsing students from localStorage, resetting to empty.", e);
      students = [];
    }
  }
  function saveStudents(){
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(students));
    } catch(e){
      console.error("Failed to save students to localStorage:", e);
    }
  }
  function getNextId(){
    let id = parseInt(localStorage.getItem(LS_NEXTID) || '1', 10);
    if (isNaN(id) || id < 1) id = 1;
    localStorage.setItem(LS_NEXTID, (id + 1).toString());
    return id;
  }
  function formatDateISOToDisplay(iso){
    if(!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString();
  }
  function todayISO(){
    const d = new Date();
    const yy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${yy}-${mm}-${dd}`;
  }

  // ---------- validation ----------
  function validateForm(){
    errorMsg.textContent = '';
    const name = nameInput.value.trim();
    const contact = contactInput.value.trim();
    const salary = salaryInput.value.trim();
    if(!name){
      errorMsg.textContent = 'Student name is required.';
      return false;
    }
    // ensure contact is digits only and exactly 11
    if(!/^\d{11}$/.test(contact)){
      errorMsg.textContent = 'Contact should be exactly 11 digits.';
      return false;
    }
    if(salary && isNaN(Number(salary))){
      errorMsg.textContent = 'Salary must be a number.';
      return false;
    }
    return true;
  }

  // ---------- CRUD ----------
  function addOrUpdateStudent(){
    if(!validateForm()) return;
    const name = nameInput.value.trim();
    const contact = contactInput.value.trim();
    const section = sectionSelect.value;
    const salary = salaryInput.value ? Number(salaryInput.value) : 0;
    const joiningDate = dateInput.value || todayISO();

    if(editingId !== null){
      // update
      const idx = students.findIndex(s => s.id === editingId);
      if(idx !== -1){
        students[idx] = { ...students[idx], name, contact, section, salary, joiningDate };
        saveStudents();
        renderTable();
        resetForm();
        addBtn.textContent = 'Add / Save Student';
        editingId = null;
      } else {
        errorMsg.textContent = 'Editing failed: record not found.';
      }
    } else {
      // create
      const id = getNextId();
      const student = { id, name, contact, section, salary, joiningDate };
      students.push(student);
      saveStudents();
      renderTable();
      resetForm();
    }
  }

  function editStudent(id){
    const s = students.find(x => x.id === id);
    if(!s) return;
    nameInput.value = s.name;
    contactInput.value = s.contact;
    sectionSelect.value = s.section;
    salaryInput.value = s.salary || '';
    dateInput.value = s.joiningDate || todayISO();
    editingId = id;
    addBtn.textContent = 'Update Student';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function deleteStudent(id){
    if(!confirm('Are you sure you want to delete this student?')) return;
    students = students.filter(s => s.id !== id);
    saveStudents();
    renderTable();
  }

  // ---------- rendering / filtering ----------
  function getFilterValues(){
    const q = (searchInput && searchInput.value.trim().toLowerCase()) || '';
    const section = (sectionFilter && sectionFilter.value) || '';
    return { q, section };
  }

  function renderTable(){
    // apply filters
    const { q, section } = getFilterValues();
    let filtered = students.slice();

    if(section){
      filtered = filtered.filter(s => s.section === section);
    }
    if(q){
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.contact.toLowerCase().includes(q)
      );
    }

    // build rows
    studentTableBody.innerHTML = '';
    if(filtered.length === 0){
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 7;
      td.style.textAlign = 'center';
      td.textContent = 'No students found.';
      tr.appendChild(td);
      studentTableBody.appendChild(tr);
    } else {
      filtered.forEach(s => {
        const tr = document.createElement('tr');

        const idTd = document.createElement('td');
        idTd.textContent = s.id;
        tr.appendChild(idTd);

        const nameTd = document.createElement('td');
        nameTd.textContent = s.name;
        tr.appendChild(nameTd);

        const contactTd = document.createElement('td');
        contactTd.textContent = s.contact;
        tr.appendChild(contactTd);

        const sectionTd = document.createElement('td');
        sectionTd.textContent = s.section;
        tr.appendChild(sectionTd);

        const salaryTd = document.createElement('td');
        salaryTd.textContent = s.salary != null ? s.salary : '';
        tr.appendChild(salaryTd);

        const dateTd = document.createElement('td');
        dateTd.textContent = formatDateISOToDisplay(s.joiningDate);
        tr.appendChild(dateTd);

        const actionsTd = document.createElement('td');
        // edit button
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.className = 'btn btn-sm';
        editBtn.style.marginRight = '8px';
        editBtn.addEventListener('click', () => editStudent(s.id));
        actionsTd.appendChild(editBtn);
        // delete button
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.className = 'btn btn-sm btn-danger';
        delBtn.addEventListener('click', () => deleteStudent(s.id));
        actionsTd.appendChild(delBtn);

        tr.appendChild(actionsTd);
        studentTableBody.appendChild(tr);
      });
    }

    // update summary
    updateSummary(filtered);
    fillSectionFilterOptions(); // keep filter options synced
  }

  // ---------- summary ----------
  function updateSummary(currentList){
    const totalAll = students.length;
    const totalFiltered = currentList.length;
    const totalSalary = currentList.reduce((acc, s) => acc + (Number(s.salary) || 0), 0);
    if (summaryText) {
      summaryText.innerHTML = `Total students: <strong>${totalAll}</strong> &nbsp;|&nbsp; Showing: <strong>${totalFiltered}</strong> &nbsp;|&nbsp; Total salary (shown): <strong>${totalSalary}</strong>`;
    }
  }

  // ---------- form helpers ----------
  function resetForm(){
    nameInput.value = '';
    contactInput.value = '';
    sectionSelect.value = sectionSelect.options[0]?.value || '';
    salaryInput.value = '';
    dateInput.value = todayISO();
    if (errorMsg) errorMsg.textContent = '';
    editingId = null;
    addBtn.textContent = 'Add / Save Student';
  }

  function clearAllData(){
    if(!confirm('This will remove all saved students from local device. Continue?')) return;
    students = [];
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_NEXTID);
    renderTable();
  }

  // ---------- filter dropdown populate ----------
  function fillSectionFilterOptions(){
    // get options from sectionSelect (HTML)
    const options = Array.from(sectionSelect.options).map(o => ({val:o.value, text:o.textContent}));
    // clear current
    sectionFilter.innerHTML = '';
    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = 'All Sections';
    sectionFilter.appendChild(allOpt);
    options.forEach(op => {
      const opt = document.createElement('option');
      opt.value = op.val;
      opt.textContent = op.text;
      sectionFilter.appendChild(opt);
    });
  }

  // ---------- events ----------
  addBtn.addEventListener('click', addOrUpdateStudent);
  clearBtn && clearBtn.addEventListener('click', resetForm);

  searchInput && searchInput.addEventListener('input', renderTable);
  sectionFilter && sectionFilter.addEventListener('change', renderTable);

  resetFilterBtn && resetFilterBtn.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (sectionFilter) sectionFilter.value = '';
    renderTable();
  });

  // initialize
  (function init(){
    loadStudents();
    fillSectionFilterOptions();
    // set date default
    if(!dateInput.value) dateInput.value = todayISO();
    renderTable();
    console.info("Student-management initialized. Students loaded:", students.length);
  })();

  // expose clearAllData to window for debug (optional)
  window.__students_clearAllLocal = clearAllData;

})();