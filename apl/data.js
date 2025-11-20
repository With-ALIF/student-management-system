/* ======= Storage Key & Data ======= */
const STORAGE_KEY = 'students_v1_alif';

/* ======= State ======= */
let students = []; // {id, name, contact, section, salary, joinDate}
let editId = null;

/* ======= Helpers ======= */
function generateAutoId() {
    // ST-001, ST-002 ...
    if (!students.length) return 'ST-001';
    // find max numeric part
    let max = 0;
    students.forEach(s => {
        const m = s.id.match(/ST-(\d+)/);
        if (m) {
            const n = parseInt(m[1],10);
            if (n > max) max = n;
        }
    });
    const next = (max + 1).toString().padStart(3, '0');
    return 'ST-' + next;
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
}

function loadFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            students = JSON.parse(raw);
        } catch(e) {
            students = [];
        }
    } else students = [];
}

function formatDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toISOString().split('T')[0];
}

/* ======= Validation ======= */
function validateForm({name, contact, section, salary, joinDate}) {
    // name: letters and spaces only, at least 2 chars
    if (!name || name.trim().length < 2) return 'নাম অন্তত ২ অক্ষর হওয়া উচিত।';
    if (!/^[\p{L} ]+$/u.test(name.trim())) return 'নাম শুধু অক্ষর ও স্পেস থাকতে হবে।';

    // contact: numeric, 11 digits
    if (!/^\d{11}$/.test(contact)) return 'মোবাইল নম্বর অবশ্যই ১১ সংখ্যার হতে হবে (শুধু ডিজিট)।';

    // section: required
    if (!section || !section.trim()) return 'Section খালি রাখা যাবে না।';

    // salary: number and >=0
    if (salary === '' || salary === null || salary === undefined) return 'Salary দিন।';
    const salN = Number(salary);
    if (isNaN(salN) || salN < 0) return 'Salary একটি ধনাত্মক সংখ্যা হতে হবে বা 0।';

    // joinDate: required
    if (!joinDate) return 'Joining Date দিন।';

    return null;
}

/* ======= Render ======= */
function renderTable(filterText = '', filterSection = '') {
    const tbody = document.getElementById('studentTable');
    tbody.innerHTML = '';

    const ft = filterText.trim().toLowerCase();

    const filtered = students.filter(s => {
        const matchesText = ft === '' ||
            s.name.toLowerCase().includes(ft) ||
            s.contact.toLowerCase().includes(ft);
        const matchesSection = !filterSection || s.section === filterSection;
        return matchesText && matchesSection;
    });

    if (filtered.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="7" style="text-align:center;color:#555">কোনো রেকর্ড নেই</td>`;
        tbody.appendChild(tr);
    } else {
        filtered.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.id}</td>
                <td>${escapeHtml(s.name)}</td>
                <td>${escapeHtml(s.contact)}</td>
                <td>${escapeHtml(s.section)}</td>
                <td>${s.salary}</td>
                <td>${formatDate(s.joinDate)}</td>
                <td>
                    <button class="btn btn-warning" onclick="startEdit('${s.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="deleteStudent('${s.id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // update section filter dropdown options
    populateSectionFilter();

    // summary
    const summary = document.getElementById('summaryText');
    const total = filtered.length;
    const totalSalary = filtered.reduce((acc, x) => acc + Number(x.salary || 0), 0);
    summary.textContent = `Showing: ${total} | Total Salary: ${totalSalary}`;
}

function populateSectionFilter() {
    const sel = document.getElementById('sectionFilter');
    const present = new Set(students.map(s => s.section));
    // keep current selection
    const cur = sel.value;
    sel.innerHTML = `<option value="">All Sections</option>`;
    Array.from(present).sort().forEach(sec => {
        const opt = document.createElement('option');
        opt.value = sec;
        opt.textContent = sec;
        sel.appendChild(opt);
    });
    // restore selection if available
    if (cur) sel.value = cur;
}

/* ======= CRUD ======= */
function addOrUpdateStudent() {
    const name = document.getElementById('name').value.trim();
    const contact = document.getElementById('contact').value.trim();
    const section = document.getElementById('section').value.trim();
    const salary = document.getElementById('salary').value;
    const joinDate = document.getElementById('joinDate').value;

    const error = validateForm({name, contact, section, salary, joinDate});
    const errEl = document.getElementById('errorMsg');
    if (error) { errEl.textContent = error; return; }
    errEl.textContent = '';

    if (editId) {
        // update existing
        const idx = students.findIndex(s => s.id === editId);
        if (idx !== -1) {
            students[idx].name = name;
            students[idx].contact = contact;
            students[idx].section = section;
            students[idx].salary = Number(salary);
            students[idx].joinDate = joinDate;
        }
        editId = null;
        document.getElementById('addBtn').textContent = 'Add / Save Student';
    } else {
        // new
        const newId = generateAutoId();
        students.push({
            id: newId,
            name,
            contact,
            section,
            salary: Number(salary),
            joinDate
        });
    }

    saveToStorage();
    renderTable(document.getElementById('searchInput').value, document.getElementById('sectionFilter').value);
    clearFormFields();
}

function deleteStudent(id) {
    if (!confirm('আপনি কি এই রেকর্ড মুছতে চান?')) return;
    students = students.filter(s => s.id !== id);
    saveToStorage();
    renderTable(document.getElementById('searchInput').value, document.getElementById('sectionFilter').value);
}

function startEdit(id) {
    const s = students.find(x => x.id === id);
    if (!s) return;
    editId = id;
    document.getElementById('name').value = s.name;
    document.getElementById('contact').value = s.contact;
    document.getElementById('section').value = s.section;
    document.getElementById('salary').value = s.salary;
    document.getElementById('joinDate').value = s.joinDate;
    document.getElementById('addBtn').textContent = 'Update Student';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearFormFields() {
    editId = null;
    document.getElementById('name').value = '';
    document.getElementById('contact').value = '';
    document.getElementById('section').value = '';
    document.getElementById('salary').value = '';
    document.getElementById('joinDate').value = '';
    document.getElementById('addBtn').textContent = 'Add / Save Student';
    document.getElementById('errorMsg').textContent = '';
}

/* ======= Utilities ======= */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
        return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]);
    });
}

/* ======= Events ======= */
document.getElementById('addBtn').addEventListener('click', addOrUpdateStudent);
document.getElementById('clearForm').addEventListener('click', clearFormFields);

document.getElementById('searchInput').addEventListener('input', (e) => {
    renderTable(e.target.value, document.getElementById('sectionFilter').value);
});

document.getElementById('sectionFilter').addEventListener('change', (e) => {
    renderTable(document.getElementById('searchInput').value, e.target.value);
});

document.getElementById('resetFilter').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('sectionFilter').value = '';
    renderTable();
});

/* ======= Init ======= */
(function init(){
    loadFromStorage();
    renderTable();
})();