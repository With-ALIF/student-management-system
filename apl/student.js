document.addEventListener("DOMContentLoaded", () => {
  fetch("../src/data.html")
    .then(response => {
      if (!response.ok) throw new Error("Network error: " + response.status);
      return response.text();
    })
    .then(html => {
      const target = document.getElementById("data");
      if (!target) throw new Error("#data element not found");
      target.innerHTML = html;

      // IMPORTANT: start the student module AFTER the HTML has been inserted
      startStudentModule();
    })
    .catch(err => {
      console.error("Fetch failed:", err);
      const target = document.getElementById("data");
      if (target) target.innerHTML = "<p style='color:red'>Failed to load attendance template. Check console for details.</p>";
    });
});

// --- move all your student-management code inside this function ---
function startStudentModule(){
  // ---------- config / selectors ----------
  const LS_KEY = 'students';
  const LS_NEXTID = 'students_nextId';

  // prefer stable IDs in HTML, e.g. <input id="studentName" ...>
  const nameInput = document.getElementById('studentName') || document.querySelector('input[placeholder="Type Student Name"]');
  const contactInput = document.getElementById('contact') || document.querySelector('input[placeholder="11 digit mobile number"]');
  const sectionSelect = document.getElementById('option') || document.getElementById('section') || document.querySelector('select');
  const salaryInput = document.getElementById('salary') || document.querySelector('input[placeholder="Salary"]');
  const dateInput = document.getElementById('attendanceDate');
  const addBtn = document.getElementById('addBtn');
  const clearBtn = document.getElementById('clearForm');
  const errorMsg = document.getElementById('errorMsg');

  const searchInput = document.getElementById('searchInput');
  const sectionFilter = document.getElementById('sectionFilter');
  const resetFilterBtn = document.getElementById('resetFilter');
  const summaryText = document.getElementById('summaryText');

  const studentTableBody = document.getElementById('studentTable');

  // quick null-check: if any required element missing, show visible message and abort
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
    const body = document.body;
    const warn = document.createElement('div');
    warn.style.background = '#fee';
    warn.style.color = '#900';
    warn.style.padding = '8px';
    warn.textContent = 'Some required elements for student-management are missing: ' + missing.join(', ');
    body.insertBefore(warn, body.firstChild);
    return; // abort so no runtime errors
  }

  // --- (sketch) rest of your module: load/save/render etc ---
  let students = [];
  let editingId = null;

  function loadStudents(){
    try {
      const raw = localStorage.getItem(LS_KEY);
      students = raw ? JSON.parse(raw) : [];
    } catch(e){
      students = [];
    }
  }
  function saveStudents(){
    localStorage.setItem(LS_KEY, JSON.stringify(students));
  }
  function getNextId(){
    let id = parseInt(localStorage.getItem(LS_NEXTID) || '1', 10);
    if (isNaN(id) || id < 1) id = 1;
    localStorage.setItem(LS_NEXTID, (id + 1).toString());
    return id;
  }
  function todayISO(){
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function validateForm(){
    errorMsg.textContent = '';
    const name = nameInput.value.trim();
    const contact = contactInput.value.trim();
    const salary = salaryInput.value.trim();
    if(!name){ errorMsg.textContent = 'Student name is required.'; return false; }
    if(!/^\d{11}$/.test(contact)){ errorMsg.textContent = 'Contact should be exactly 11 digits.'; return false; }
    if(salary && isNaN(Number(salary))){ errorMsg.textContent = 'Salary must be a number.'; return false; }
    return true;
  }

  function renderTable(){
    studentTableBody.innerHTML = '';
    if(students.length === 0){
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 7;
      td.style.textAlign = 'center';
      td.textContent = 'No students found.';
      tr.appendChild(td);
      studentTableBody.appendChild(tr);
      return;
    }
    students.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${s.id}</td><td>${s.name}</td><td>${s.contact}</td><td>${s.section||''}</td><td>${s.salary||''}</td><td>${s.joiningDate||''}</td><td></td>`;
      // add action buttons...
      studentTableBody.appendChild(tr);
    });
  }

  // minimal init
  loadStudents();
  if(!dateInput.value) dateInput.value = todayISO();
  renderTable();

  // wire add button
  addBtn.addEventListener('click', () => {
    if(!validateForm()) return;
    const student = {
      id: getNextId(),
      name: nameInput.value.trim(),
      contact: contactInput.value.trim(),
      section: sectionSelect.value,
      salary: salaryInput.value ? Number(salaryInput.value) : 0,
      joiningDate: dateInput.value || todayISO()
    };
    students.push(student);
    saveStudents();
    renderTable();
    nameInput.value = contactInput.value = salaryInput.value = '';
  });
}