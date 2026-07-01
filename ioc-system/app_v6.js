const API_URL = 'https://script.google.com/macros/s/AKfycbwBUdlvFBAgDH10Hmkjo1r1Ab-dbnRos_qLjXPL2R0S5ikyGlc2-ctwE7RnAkk9R9HE/exec';

// ==========================================
// STATE
// ==========================================

// global state
// UI Helper
function renderImageLink(url) {
    if(!url) return '';
    return `<a href="${url}" target="_blank" class="img-badge inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg text-xs font-medium transition-colors border border-indigo-200 mr-2"><svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> ดูรูปภาพ</a>`;
}
let currentTeacherCode = sessionStorage.getItem('teac_code') || null;
let currentTeacherGroup = sessionStorage.getItem('subject_group') || null;

let expertMode = false;
let expertProjectId = null;
let currentReviewerCode = null;
let currentTeacherName = sessionStorage.getItem('teacher_name') || null;

let subjectsData = [];
let expertsData = [];
let myExistingProjects = []; // Store existing projects for duplicate prevention

let indicatorOptions = [];
let parsedQuestions = [];

let currentReviewQuestions = [];
let reviewIndex = 0;
let currentReviews = [];

let currentReportData = [];
let currentPrintProjectInfo = null;
let currentPrintTeachers = [];
let currentEditingProjectId = null;

// ==========================================
// DOM ELEMENTS
// ==========================================
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const expertSection = document.getElementById('expertSection');
const reportSection = document.getElementById('reportSection');
const userInfo = document.getElementById('userInfo');
const teacherCodeDisplay = document.getElementById('teacherCodeDisplay');
const pendingCountBadge = document.getElementById('pendingCountBadge');
const headerPendingBadge = document.getElementById('headerPendingBadge');
const logoutBtn = document.getElementById('logoutBtn');
const tableContainer = document.getElementById('tableContainer');
const rawExamInput = document.getElementById('rawExamInput');
const rawSubjectiveInput = document.getElementById('rawSubjectiveInput');
const indicatorsInput = document.getElementById('indicatorsInput');

// Utilities
function showToast(msg, type='info') {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toastMessage');
    const iconEl = document.getElementById('toastIcon');
    msgEl.textContent = msg;
    if(type==='success') { iconEl.textContent = '✅'; toast.className = 'fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all duration-300 transform translate-y-0 opacity-100 z-50 bg-green-50 border-green-200 text-green-800'; }
    else if(type==='error') { iconEl.textContent = '❌'; toast.className = 'fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all duration-300 transform translate-y-0 opacity-100 z-50 bg-red-50 border-red-200 text-red-800'; }
    else { iconEl.textContent = 'ℹ️'; toast.className = 'fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all duration-300 transform translate-y-0 opacity-100 z-50 bg-white border-gray-200 text-gray-800'; }
    
    toast.classList.remove('hidden');
    setTimeout(() => { toast.classList.add('hidden'); }, 3000);
}

// ==========================================
// INITIALIZATION
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const pid = urlParams.get('project_id');
    const vpid = urlParams.get('view_results');
    
    // Check for SSO via LocalStorage (Shared from AssessmentHub on same domain)
    const ssoCode = localStorage.getItem('teacher_code');
    if (ssoCode) {
        currentTeacherCode = ssoCode;
        sessionStorage.setItem('teac_code', ssoCode);
        // Note: In real world we might want to also fetch name and group.
        // For now, autoLogin will fetch it if name is missing in sessionStorage.
    }
    
    if (pid) {
        expertMode = true;
        expertProjectId = pid;
    } else if (vpid) {
        setTimeout(() => window.viewReport(vpid), 500);
    }
    
    if (currentTeacherCode) {
        const tName = sessionStorage.getItem('teacher_name') || '';
        if (tName) {
            handleLoginSuccess(currentTeacherCode, sessionStorage.getItem('subject_group') || '', tName);
        } else {
            // We have code but no name (e.g. fresh SSO), so we must fetch name from server
            autoLoginWithCode(currentTeacherCode);
        }
    } else {
        if(loginSection) loginSection.classList.remove('hidden');
        // No code, no token -> show restricted access message
    }
    
    const pendingTasksBtn = document.getElementById('pendingTasksBtn');
    if (pendingTasksBtn) {
        pendingTasksBtn.addEventListener('click', () => {
            const container = document.getElementById('pendingEvaluationsContainer');
            if (container && !container.classList.contains('hidden')) {
                container.scrollIntoView({ behavior: 'smooth' });
            } else {
                showToast('ไม่มีงานประเมินค้างครับ', 'info');
            }
        });
    }

    const btnBackToDashboard = document.getElementById('btnBackToDashboard');
    if (btnBackToDashboard) {
        btnBackToDashboard.addEventListener('click', () => {
            const tinderArea = document.getElementById('tinderArea');
            const dashboardSection = document.getElementById('dashboardSection');
            if(tinderArea) tinderArea.classList.add('hidden');
            if(dashboardSection) dashboardSection.classList.remove('hidden');
            // Refresh pending tasks just in case
            fetchPendingEvaluations(currentTeacherCode);
        });
    }
});

// ==========================================
// LOGIN & LOGOUT
// ==========================================
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const loginLoader = document.getElementById('loginLoader');
const loginError = document.getElementById('loginError');

let loginTeachersData = [];

async function fetchTeacherListForLogin() {
    const select = document.getElementById('teacherLoginSelect');
    if (!select) return;
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getTeachers', payload: {} })
        });
        if (!response.ok) throw new Error('Network response error');
        const data = await response.json();
        if (data.status === 'success' && data.data) {
            loginTeachersData = data.data;
            select.innerHTML = '<option value="">-- เลือกชื่อของคุณ --</option>';
            data.data.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.teac_code;
                opt.textContent = t.name;
                select.appendChild(opt);
            });
        } else {
            select.innerHTML = '<option value="">-- โหลดข้อมูลล้มเหลว --</option>';
        }
    } catch (error) {
        console.error('Error fetching teachers for login:', error);
        select.innerHTML = '<option value="">-- เกิดข้อผิดพลาด --</option>';
    }
}

if(loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const select = document.getElementById('teacherLoginSelect');
        if(!select) return;
        const selectedCode = select.value;
        
        if (!selectedCode) {
            loginError.textContent = 'กรุณาเลือกชื่อก่อนเข้าสู่ระบบ';
            loginError.classList.remove('hidden');
            return;
        }
        
        loginBtn.disabled = true;
        loginLoader.classList.remove('hidden');
        loginError.classList.add('hidden');
        
        const teacher = loginTeachersData.find(t => String(t.teac_code) === String(selectedCode));
        if (teacher) {
            const tName = teacher.name;
            const subjGroup = teacher.subject_group || '';
            sessionStorage.setItem('teac_code', teacher.teac_code);
            sessionStorage.setItem('subject_group', subjGroup);
            sessionStorage.setItem('teacher_name', tName);
            handleLoginSuccess(teacher.teac_code, subjGroup, tName);
            showToast('เข้าระบบสำเร็จ', 'success');
        } else {
            loginError.textContent = 'ไม่พบข้อมูลครู';
            loginError.classList.remove('hidden');
        }
        loginLoader.classList.add('hidden');
        loginBtn.disabled = false;
    });
}

if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        sessionStorage.clear();
        localStorage.removeItem('teacher_code');
        window.location.href = window.location.pathname; // Reload without query params
    });
}

function handleLoginSuccess(teacCode, subjectGroup, teacherName) {
    currentTeacherCode = teacCode;
    currentTeacherGroup = subjectGroup;
    currentTeacherName = teacherName;
    
    if(teacherCodeDisplay) {
        teacherCodeDisplay.textContent = `ครู: ${teacherName || teacCode}`;
    }
    
    if(loginSection) loginSection.classList.add('hidden');
    if(userInfo) userInfo.classList.remove('hidden');
    
    if (expertMode && expertProjectId) {
        if(expertSection) expertSection.classList.remove('hidden');
        // Pre-fill reviewer as current user
        currentReviewerCode = teacCode;
        setTimeout(() => {
            const startReviewBtn = document.getElementById('startReviewBtn');
            if(startReviewBtn) startReviewBtn.click();
        }, 300);
    } else {
        if(dashboardSection) dashboardSection.classList.remove('hidden');
        fetchSubjects(teacCode);
        fetchMyProjects(teacCode, teacherName);
        fetchExperts(teacCode, subjectGroup);
        fetchPendingEvaluations(teacCode);
    }
}

// ==========================================
// SPA NAVIGATION
// ==========================================
window.openExpertReview = function(pid) {
    expertMode = true;
    expertProjectId = pid;
    if(document.getElementById('dashboardSection')) document.getElementById('dashboardSection').classList.add('hidden');
    if(document.getElementById('expertSection')) document.getElementById('expertSection').classList.remove('hidden');
    
    currentReviewerCode = currentTeacherCode;
    setTimeout(() => {
        const startReviewBtn = document.getElementById('startReviewBtn');
        if(startReviewBtn) startReviewBtn.click();
    }, 300);
};

// ==========================================
// API FETCHERS (DASHBOARD)
// ==========================================
async function fetchSubjects(teacCode) {
    const subjectSelect = document.getElementById('subjectSelect');
    if(!subjectSelect) return;
    subjectSelect.innerHTML = '<option value="">-- กำลังโหลดวิชา --</option>';
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getSubjects', payload: { teac_code: teacCode } })
        });
        const data = await response.json();
        if (data.status === 'success' && data.data) {
            // Frontend fallback to ensure uniqueness
            const uniqueSubjects = [];
            const seenCodes = new Set();
            data.data.forEach(sub => {
                const sCode = String(sub.subject_code).trim().toLowerCase();
                if (!seenCodes.has(sCode)) {
                    seenCodes.add(sCode);
                    uniqueSubjects.push(sub);
                }
            });
            subjectsData = uniqueSubjects;
            window.updateSubjectDropdownOptions();
        } else {
            subjectSelect.innerHTML = '<option value="">-- ไม่พบวิชา --</option>';
        }
    } catch (error) {
        console.error('Fetch subjects error:', error);
        subjectSelect.innerHTML = '<option value="">-- ข้อผิดพลาด --</option>';
    }
}

window.updateSubjectDropdownOptions = () => {
    const subjectSelect = document.getElementById('subjectSelect');
    if (!subjectSelect || !subjectsData) return;
    
    const currentVal = subjectSelect.value;
    
    // Get the currently selected examType
    const examRadios = document.getElementsByName('examType');
    let selectedExamType = 'สอบกลางภาค';
    for (let r of examRadios) {
        if (r.checked) selectedExamType = 'สอบ' + r.value;
    }
    
    subjectSelect.innerHTML = '<option value="">-- เลือกวิชา --</option>';
    subjectsData.forEach(sub => {
        const sCodeLower = String(sub.subject_code).trim().toLowerCase();
        // Check if there's a project for this subject AND this exam type
        const hasProject = myExistingProjects && myExistingProjects.some(p => 
            String(p.subject_code).trim().toLowerCase() === sCodeLower &&
            String(p.exam_type).trim() === String(selectedExamType).trim()
        );
        
        if (!hasProject) {
            const opt = document.createElement('option');
            opt.value = sub.subject_code;
            opt.textContent = `[${sub.subject_code}] ${sub.subject_name}`;
            subjectSelect.appendChild(opt);
        }
    });
    
    if (subjectSelect.options.length === 1 && subjectsData.length > 0) {
        subjectSelect.options[0].textContent = '-- ท่านส่งข้อสอบครบทุกวิชาแล้ว --';
    }
    
    // Restore value if it still exists
    const stillExists = Array.from(subjectSelect.options).some(o => o.value === currentVal);
    if (stillExists) {
        subjectSelect.value = currentVal;
    } else {
        subjectSelect.value = "";
    }
};

async function fetchExperts(teacCode, subjectGroup) {
    const expert1 = document.getElementById('expert1Select');
    const expert2 = document.getElementById('expert2Select');
    const expert3 = document.getElementById('expert3Select');
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getTeachers', payload: {} })
        });
        const data = await response.json();
        if (data.status === 'success' && data.data) {
            expertsData = data.data;
            const populate = (select) => {
                if(!select) return;
                select.innerHTML = '<option value="">-- เลือกผู้เชี่ยวชาญ --</option>';
                data.data.forEach(t => {
                    // Filter: Must be same subjectGroup and not self
                    const isSameGroup = subjectGroup ? (t.subject_group === subjectGroup) : true;
                    if (isSameGroup && String(t.teac_code) !== String(teacCode)) {
                        const opt = document.createElement('option');
                        opt.value = t.teac_code;
                        opt.textContent = t.name + (t.subject_group ? ` (${t.subject_group})` : '');
                        select.appendChild(opt);
                    }
                });
            };
            populate(expert1); populate(expert2); populate(expert3);
        }
    } catch (error) {
        console.error('Fetch experts error:', error);
    }
}

async function fetchMyProjects(teacCode, teacherName) {
    const tbody = document.getElementById('myProjectsTableBody');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">กำลังโหลด...</td></tr>';
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getMyProjects', payload: { teac_code: teacCode, teacher_name: teacherName } })
        });
        const data = await response.json();
        if (data.status === 'success' && data.data) {
            myExistingProjects = data.data; // Store globally
            renderMyProjects(data.data);
        } else {
            myExistingProjects = [];
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">ไม่พบโครงการ</td></tr>';
        }
    } catch (error) {
        myExistingProjects = [];
        console.error('Fetch projects error:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-red-500">เกิดข้อผิดพลาดในการโหลด</td></tr>';
    }
}

function renderMyProjects(projects) {
    const tbody = document.getElementById('myProjectsTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (!projects || projects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">ไม่พบชุดข้อสอบ</td></tr>';
        return;
    }
    
    projects.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    
    projects.forEach(p => {
        const tr = document.createElement('tr');
        const isCompleted = p.status === 'completed';
        const dateStr = new Date(p.created_at).toLocaleDateString('th-TH');
        
        tr.innerHTML = `
            <td class="px-4 py-3 border-b text-sm">
                <div class="font-medium text-gray-700 flex items-center gap-2">
                    ${p.subject_code} 
                    ${p.exam_type ? `<span class="text-[10px] font-normal text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">${p.exam_type}</span>` : ''}
                </div>
                <div class="text-xs text-gray-500 mt-0.5">${dateStr}</div>
            </td>
            <td class="px-4 py-3 border-b text-sm">
                <span class="px-2 py-1 rounded text-xs font-medium ${isCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                    ${isCompleted ? 'เสร็จสมบูรณ์' : 'รอประเมิน'}
                </span>
            </td>
            <td class="px-4 py-3 border-b text-sm font-mono text-xs text-gray-500 text-center">
                ${p.project_id}
            </td>
            <td class="px-4 py-3 border-b text-sm text-center">
                <div class="flex gap-1 justify-center">
                    <button onclick="viewReport('${p.project_id}')" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded text-xs font-medium transition-colors border border-indigo-200">
                        ดูรายงาน
                    </button>
                        <button onclick="deleteProject('${p.project_id}')" class="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded text-xs font-medium transition-colors border border-red-200 ml-2">
                            ลบ
                        </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateGeneratedProjectName = () => {
    const disp = document.getElementById('generatedProjectName');
    if (!disp) return;
    
    const subjSel = document.getElementById('subjectSelect');
    const subjCode = subjSel ? subjSel.value : '';
    if (!subjCode) {
        disp.textContent = 'โปรดเลือกวิชา';
        return;
    }
    
    const selSubj = subjectsData.find(s => s.subject_code === subjCode);
    
    const examRadios = document.getElementsByName('examType');
    let eType = 'สอบกลางภาค';
    for (let r of examRadios) {
        if (r.checked) eType = 'สอบ' + r.value;
    }
    
    let pYear = new Date().getFullYear() + 543;
    let pSem = '1';
    if (selSubj) {
        pYear = selSubj.academic_year || pYear;
        pSem = selSubj.semester || pSem;
    }
    
    disp.textContent = `ชื่อชุด: สอบ ${subjCode} ${eType} เทอม ${pSem}/${pYear}`;
};

window.editProject = async (projectId) => {
    showToast('กำลังโหลดข้อมูลข้อสอบ...', 'info');
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getProjectResults', payload: { project_id: projectId } })
        });
        const data = await response.json();
        
        if (data.status === 'success' && data.data) {
            let pInfo = data.data.project_info;
            
            // Fallback: หาจาก myProjects ตามที่ครูแนะนำ
            if (!pInfo && typeof myProjects !== 'undefined') {
                pInfo = myProjects.find(p => p.project_id === projectId);
            }
            
            const qList = data.data.questions;
            
            // Populate form if pInfo exists
            if (pInfo) {
                currentEditingProjectId = pInfo.project_id || projectId;
                const subjSel = document.getElementById('subjectSelect');
                if(subjSel && pInfo.subject_code) subjSel.value = pInfo.subject_code;

                const pNameText = pInfo.project_name || '';
                if (pNameText.includes('กลางภาค')) {
                    const e = document.querySelector('input[name="examType"][value="กลางภาค"]');
                    if(e) e.checked = true;
                } else if (pNameText.includes('ปลายภาค')) {
                    const e = document.querySelector('input[name="examType"][value="ปลายภาค"]');
                    if(e) e.checked = true;
                }
                
                if (pInfo.subject_type) {
                    const st = document.querySelector(`input[name="subjectType"][value="${pInfo.subject_type}"]`);
                    if(st) st.checked = true;
                }
                
                if (window.updateGeneratedProjectName) {
                    window.updateGeneratedProjectName();
                }
                
                const pName = document.getElementById('projectNameInput');
                if(pName && pInfo.project_name) pName.value = pInfo.project_name;
                
                const e1 = document.getElementById('expert1Select');
                const e2 = document.getElementById('expert2Select');
                const e3 = document.getElementById('expert3Select');
                if(e1 && pInfo.expert_1) e1.value = pInfo.expert_1;
                if(e2 && pInfo.expert_2) e2.value = pInfo.expert_2;
                if(e3 && pInfo.expert_3) e3.value = pInfo.expert_3;
            } else {
                currentEditingProjectId = projectId;
            }
            
            // Populate questions
            parsedQuestions = qList.map((q, i) => ({
                question_num: q.question_num || q.question_no || (i + 1),
                question_text: q.question_text || '',
                choice_a: q.choice_a || '',
                choice_b: q.choice_b || '',
                choice_c: q.choice_c || '',
                choice_d: q.choice_d || '',
                correct_answer: q.correct_choice || q.correct_answer || '',
                indicator: q.matched_indicator || q.indicator || '',
                image_url: q.image_url || '',
                passage_text: q.passage_text || '',
                is_subjective: (!q.choice_a && !q.choice_b && !q.choice_c && !q.choice_d)
            }));
            
            // Reconstruct raw text and update indicatorOptions
            let rawText = '';
            const indicators = new Set();
            parsedQuestions.forEach((q, i) => {
                if (q.indicator && !indicators.has(q.indicator)) {
                    rawText += `[${q.indicator}]\n`;
                    indicators.add(q.indicator);
                }
                rawText += `${i + 1}. ${q.question_text}\n`;
                if (!q.is_subjective) {
                    rawText += `ก. ${q.choice_a}\n`;
                    rawText += `ข. ${q.choice_b}\n`;
                    rawText += `ค. ${q.choice_c}\n`;
                    rawText += `ง. ${q.choice_d}\n`;
                    if (q.correct_answer) {
                        rawText += `เฉลย: ${q.correct_answer}\n`;
                    }
                }
                rawText += '\n';
            });
            const textInput = document.getElementById('rawExamInput');
            if (textInput) textInput.value = rawText.trim();
            indicatorOptions = Array.from(indicators);
            
            renderTable();
            
            // Change button text
            const saveBtn = document.getElementById('saveProjectBtn');
            if(saveBtn) saveBtn.innerHTML = '✏️ บันทึกการแก้ไขชุดข้อสอบ';
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
            showToast('โหลดข้อมูลสำหรับการแก้ไขเรียบร้อยแล้ว', 'success');
        } else {
            showToast('ไม่พบข้อมูลโครงการนี้: ' + (data.message || ''), 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('การเชื่อมต่อล้มเหลว: ' + error.message, 'error');
    }
};

window.copyReviewLink = (projectId) => {
    const url = new URL(window.location.href);
    url.searchParams.set('project_id', projectId);
    navigator.clipboard.writeText(url.toString()).then(() => {
        showToast('คัดลอกลิงก์สำเร็จ', 'success');
    });
};

async function fetchPendingEvaluations(teacCode) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getPendingEvaluations', payload: { teac_code: teacCode } })
        });
        const data = await response.json();
        const badge1 = document.getElementById('pendingCountBadge');
        const badge2 = document.getElementById('headerPendingBadge');
        const list = document.getElementById('pendingEvaluationsList');
        
        if (data.status === 'success' && data.data && data.data.length > 0) {
            const cnt = data.data.length;
            if(badge1) { badge1.textContent = cnt; badge1.classList.remove('hidden'); }
            if(badge2) { badge2.textContent = cnt; badge2.classList.remove('hidden'); }
            const container = document.getElementById('pendingEvaluationsContainer');
            if(container) container.classList.remove('hidden');
            
            if(list) {
                list.innerHTML = '';
                data.data.forEach(p => {
                    const el = document.createElement('div');
                    el.className = 'flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg';
                    el.innerHTML = `
                        <div>
                            <div class="font-medium text-red-800 text-sm">${p.project_name}</div>
                            <div class="text-xs text-red-600">ครู: ${p.teacher_name}</div>
                        </div>
                        <button onclick="openExpertReview('${p.project_id}')" class="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors">
                            ประเมินเลย
                        </button>
                    `;
                    list.appendChild(el);
                });
            }
        } else {
            if(badge1) badge1.classList.add('hidden');
            if(badge2) badge2.classList.add('hidden');
            if(list) list.innerHTML = '<div class="text-sm text-gray-500 p-3">ไม่มีรายการประเมินค้าง</div>';
        }
    } catch (error) {
        console.error('Fetch pending error:', error);
    }
}

// ==========================================
// EXAM PARSER
// ==========================================
const parseBtn = document.getElementById('parseBtn');
if(parseBtn) {
    parseBtn.addEventListener('click', () => {
        const rawText = rawExamInput ? rawExamInput.value : '';
        const subjText = rawSubjectiveInput ? rawSubjectiveInput.value : '';
        const indsText = indicatorsInput ? indicatorsInput.value : '';
        
        if (!rawText.trim() && !subjText.trim()) {
            showToast('กรุณาวางข้อสอบก่อน', 'error');
            return;
        }
        
        parseIndicators(indsText);
        
        let qIndex = 1;
        parsedQuestions = [];
        
        // Parse Objective Questions
        if (rawText.trim()) {
            const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
            let currentPassage = '';
            let currentQ = null;
            
            const pushCurrentQ = () => {
                if (currentQ && (currentQ.hasChoices || currentQ.question_text)) {
                    parsedQuestions.push({
                        q_num: qIndex++,
                        question_text: currentQ.question_text,
                        choice_a: currentQ.choices[0],
                        choice_b: currentQ.choices[1],
                        choice_c: currentQ.choices[2],
                        choice_d: currentQ.choices[3],
                        correct_answer: currentQ.ans || 'ก',
                        indicator: currentQ.indicator || '',
                        is_subjective: false,
                        image_url: '',
                        passage_text: currentPassage
                    });
                }
            };
            
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i];
                let isAns = false;
                let ansChar = '';
                
                // Check if line indicates correct answer e.g. *① or *ก
                if (line.startsWith('*')) {
                    const ansMatch = line.match(/^\*([ก-ฮa-dA-D①-⑤]|[1-5]\))/);
                    if (ansMatch) {
                        isAns = true;
                        let rawChar = ansMatch[1].toLowerCase().replace(')', '');
                        if (rawChar === 'ก' || rawChar === 'a' || rawChar === '①' || rawChar === '1') ansChar = 'ก';
                        if (rawChar === 'ข' || rawChar === 'b' || rawChar === '②' || rawChar === '2') ansChar = 'ข';
                        if (rawChar === 'ค' || rawChar === 'c' || rawChar === '③' || rawChar === '3') ansChar = 'ค';
                        if (rawChar === 'ง' || rawChar === 'd' || rawChar === '④' || rawChar === '4') ansChar = 'ง';
                        if (rawChar === 'จ' || rawChar === 'e' || rawChar === '⑤' || rawChar === '5') ansChar = 'จ';
                        line = line.replace(/^\*([ก-ฮa-dA-D①-⑤][\.\)]?|[1-5]\))\s*/, '').trim();
                    } else {
                        line = line.substring(1).trim();
                    }
                }
                
                const choiceStartMatch = line.match(/^([ก-ฮa-dA-D①-⑤][\.\)]?|[1-5]\))\s*/);
                if (choiceStartMatch) {
                    if (!currentQ) currentQ = { question_text: '', choices: ['', '', '', '', ''], ans: '', hasChoices: false };
                    currentQ.hasChoices = true;
                    
                    const choiceRegex = /(?:^|\s+)([ก-ฮa-dA-D①-⑤][\.\)]?|[1-5]\))\s*(.*?)(?=\s+(?:[ก-ฮa-dA-D①-⑤][\.\)]?|[1-5]\))\s*|$)/g;
                    let cMatch;
                    while ((cMatch = choiceRegex.exec(line)) !== null) {
                        let char = cMatch[1].toLowerCase().replace(/[\.\)]/g, '');
                        let idx = -1;
                        if (char === 'ก' || char === 'a' || char === '①' || char === '1') idx = 0;
                        if (char === 'ข' || char === 'b' || char === '②' || char === '2') idx = 1;
                        if (char === 'ค' || char === 'c' || char === '③' || char === '3') idx = 2;
                        if (char === 'ง' || char === 'd' || char === '④' || char === '4') idx = 3;
                        if (char === 'จ' || char === 'e' || char === '⑤' || char === '5') idx = 4;
                        
                        if (idx !== -1 && idx < 5) {
                            currentQ.choices[idx] = cMatch[2].trim();
                            if (isAns || ansChar) {
                                currentQ.ans = (idx===0?'ก':idx===1?'ข':idx===2?'ค':idx===3?'ง':'จ');
                                isAns = false;
                                ansChar = '';
                            }
                        }
                    }
                } else {
                    // Not a choice
                    const qMatch = line.match(/^(\d+)[\.\)]\s*(.*)/);
                    if (qMatch) {
                        pushCurrentQ();
                        currentQ = { question_text: qMatch[2].trim(), choices: ['', '', '', ''], ans: '', hasChoices: false };
                    } else {
                        // Could be Passage OR Question without number
                        let nextIsChoice = false;
                        if (i + 1 < lines.length) {
                             if (lines[i+1].match(/^([ก-ฮa-dA-D①-④])[\.\)]?\s*(.*)/) || lines[i+1].match(/^\*([ก-ฮa-dA-D①-④])[\.\)]?\s*(.*)/)) {
                                 nextIsChoice = true;
                             }
                        }
                        
                        if (nextIsChoice) {
                            pushCurrentQ();
                            currentQ = { question_text: line, choices: ['', '', '', ''], ans: '', hasChoices: false };
                        } else {
                            if (currentQ && !currentQ.hasChoices) {
                                currentQ.question_text += '\n' + line;
                            } else {
                                pushCurrentQ();
                                currentQ = null;
                                // Append if previous line was also passage, or overwrite? Usually overwrite or append
                                currentPassage = currentPassage ? currentPassage + '\n' + line : line;
                            }
                        }
                    }
                }
            }
            pushCurrentQ();
        }
        
        // Parse Subjective Questions
        if (subjText.trim()) {
            const lines = subjText.split('\n').map(l => l.trim()).filter(l => l);
            let currentSubjQ = '';
            
            const pushSubj = () => {
                if (currentSubjQ.trim()) {
                    let qText = currentSubjQ.replace(/^\d+[\.\)]\s*/, '').trim();
                    parsedQuestions.push({
                        q_num: qIndex++,
                        question_text: qText,
                        choice_a: '',
                        choice_b: '',
                        choice_c: '',
                        choice_d: '',
                        correct_answer: '',
                        indicator: '',
                        is_subjective: true,
                        image_url: '',
                        passage_text: ''
                    });
                }
            };

            for (let line of lines) {
                if (line.match(/^\d+[\.\)]\s*/)) {
                    pushSubj();
                    currentSubjQ = line;
                } else {
                    currentSubjQ = currentSubjQ ? currentSubjQ + '\n' + line : line;
                }
            }
            pushSubj();
        }
        
        renderTable();
        showToast(`แยกข้อสอบได้ ${parsedQuestions.length} ข้อ`, 'success');
    });
}

function parseIndicators(text) {
    indicatorOptions = [];
    if (!text.trim()) return;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    lines.forEach(l => {
        indicatorOptions.push(l);
    });
}

function renderTable() {
    const tbody = document.getElementById('examTableBody');
    const tableContainer = document.getElementById('tableContainer');
    const qCount = document.getElementById('questionCount');
    
    if(!tbody || !tableContainer) return;
    
    tbody.innerHTML = '';
    
    if (parsedQuestions.length === 0) {
        tableContainer.classList.add('hidden');
        return;
    }
    
    if(qCount) qCount.textContent = `ทั้งหมด ${parsedQuestions.length} ข้อ`;
    
    let indOptionsHtml = indicatorOptions.map(ind => `<option value="${ind}">${ind}</option>`).join('');
    
    parsedQuestions.forEach((q, idx) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition-colors';
        
        let choiceHtml = '';
        if (!q.is_subjective) {
            choiceHtml = `
                <div class="mt-2 space-y-1">
                    <label class="flex items-center gap-2 cursor-pointer hover:bg-green-50 p-1.5 rounded transition-colors w-full border ${q.correct_answer === 'ก' || q.correct_answer === 'a' ? 'bg-green-50 border-green-300' : 'border-transparent'}">
                        <input type="radio" name="ans_${idx}" value="ก" ${q.correct_answer === 'ก' || q.correct_answer === 'a' ? 'checked' : ''} onchange="updateAns(${idx}, 'ก'); renderTable();" class="sr-only">
                        <span class="text-sm font-medium ${q.correct_answer === 'ก' || q.correct_answer === 'a' ? 'text-green-800' : 'text-gray-700'} w-4">①</span>
                        <span class="flex-1 text-sm ${q.correct_answer === 'ก' || q.correct_answer === 'a' ? 'text-green-800 font-medium' : 'text-gray-700'} p-1 border border-transparent hover:border-gray-300 hover:bg-white rounded cursor-text" contenteditable="true" onclick="event.preventDefault(); event.stopPropagation(); this.focus();" onblur="updateChoiceText(${idx}, 'a', this.innerText)">${q.choice_a}</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer hover:bg-green-50 p-1.5 rounded transition-colors w-full border ${q.correct_answer === 'ข' || q.correct_answer === 'b' ? 'bg-green-50 border-green-300' : 'border-transparent'}">
                        <input type="radio" name="ans_${idx}" value="ข" ${q.correct_answer === 'ข' || q.correct_answer === 'b' ? 'checked' : ''} onchange="updateAns(${idx}, 'ข'); renderTable();" class="sr-only">
                        <span class="text-sm font-medium ${q.correct_answer === 'ข' || q.correct_answer === 'b' ? 'text-green-800' : 'text-gray-700'} w-4">②</span>
                        <span class="flex-1 text-sm ${q.correct_answer === 'ข' || q.correct_answer === 'b' ? 'text-green-800 font-medium' : 'text-gray-700'} p-1 border border-transparent hover:border-gray-300 hover:bg-white rounded cursor-text" contenteditable="true" onclick="event.preventDefault(); event.stopPropagation(); this.focus();" onblur="updateChoiceText(${idx}, 'b', this.innerText)">${q.choice_b}</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer hover:bg-green-50 p-1.5 rounded transition-colors w-full border ${q.correct_answer === 'ค' || q.correct_answer === 'c' ? 'bg-green-50 border-green-300' : 'border-transparent'}">
                        <input type="radio" name="ans_${idx}" value="ค" ${q.correct_answer === 'ค' || q.correct_answer === 'c' ? 'checked' : ''} onchange="updateAns(${idx}, 'ค'); renderTable();" class="sr-only">
                        <span class="text-sm font-medium ${q.correct_answer === 'ค' || q.correct_answer === 'c' ? 'text-green-800' : 'text-gray-700'} w-4">③</span>
                        <span class="flex-1 text-sm ${q.correct_answer === 'ค' || q.correct_answer === 'c' ? 'text-green-800 font-medium' : 'text-gray-700'} p-1 border border-transparent hover:border-gray-300 hover:bg-white rounded cursor-text" contenteditable="true" onclick="event.preventDefault(); event.stopPropagation(); this.focus();" onblur="updateChoiceText(${idx}, 'c', this.innerText)">${q.choice_c}</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer hover:bg-green-50 p-1.5 rounded transition-colors w-full border ${q.correct_answer === 'ง' || q.correct_answer === 'd' ? 'bg-green-50 border-green-300' : 'border-transparent'}">
                        <input type="radio" name="ans_${idx}" value="ง" ${q.correct_answer === 'ง' || q.correct_answer === 'd' ? 'checked' : ''} onchange="updateAns(${idx}, 'ง'); renderTable();" class="sr-only">
                        <span class="text-sm font-medium ${q.correct_answer === 'ง' || q.correct_answer === 'd' ? 'text-green-800' : 'text-gray-700'} w-4">④</span>
                        <span class="flex-1 text-sm ${q.correct_answer === 'ง' || q.correct_answer === 'd' ? 'text-green-800 font-medium' : 'text-gray-700'} p-1 border border-transparent hover:border-gray-300 hover:bg-white rounded cursor-text" contenteditable="true" onclick="event.preventDefault(); event.stopPropagation(); this.focus();" onblur="updateChoiceText(${idx}, 'd', this.innerText)">${q.choice_d}</span>
                    </label>
                </div>
            `;
        } else {
            choiceHtml = `<div class="mt-2 text-sm text-gray-500 italic">ข้อสอบอัตนัย</div>`;
        }
        
        tr.innerHTML = `
            <td class="px-4 py-4 text-center font-medium">${q.q_num || q.question_num || (idx + 1)}</td>
            <td class="px-4 py-4 align-top">
                <div class="text-sm font-medium text-gray-800 break-words whitespace-pre-wrap p-1 border border-transparent hover:border-gray-300 hover:bg-white rounded cursor-text focus:outline-blue-500" contenteditable="true" onblur="updateQText(${idx}, this.innerText)">${q.question_text}</div>
                <div class="mt-3 flex gap-2">
                    <button onclick="openMediaModal(${idx}, 'image')" class="text-xs bg-gray-50 hover:bg-gray-200 text-gray-700 py-1 px-2 rounded flex items-center gap-1 border">🖼️ แนบรูป</button>
                    <button onclick="openMediaModal(${idx}, 'passage')" class="text-xs bg-gray-50 hover:bg-gray-200 text-gray-700 py-1 px-2 rounded flex items-center gap-1 border">📝 บทความ</button>
                </div>
                <div id="media-preview-${idx}" class="mt-2 text-sm text-blue-600 space-y-1">
                    ${renderImageLink(q.image_url)}
                    ${q.passage_text ? '<div class="pass-badge bg-blue-50 px-2 py-1 rounded inline-block text-xs">📝 บทความแนบ</div>' : ''}
                </div>
            </td>
            <td class="px-4 py-4 align-top">
                ${choiceHtml}
            </td>
            <td class="px-4 py-4 align-top">
                <div class="flex flex-col gap-2">
                    <select class="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" onchange="updateInd(${idx}, this.value)">
                        <option value="">-- ระบุตัวชี้วัด --</option>
                        ${indOptionsHtml}
                    </select>
                    ${q.indicator ? `<div class="mt-1 text-xs text-green-600 break-words font-medium px-2 py-1 bg-green-50 rounded">${q.indicator}</div>` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
        
        // Auto-select indicator if matches
        if (q.indicator) {
            const sel = tr.querySelector('select');
            if(sel) sel.value = q.indicator;
        }
    });
    
    tableContainer.classList.remove('hidden');
    updateAnswerStats();
}

window.updateAns = (idx, val) => { parsedQuestions[idx].correct_answer = val; updateAnswerStats(); };
window.updateInd = (idx, val) => { parsedQuestions[idx].indicator = val; };
window.updateQText = (idx, text) => { parsedQuestions[idx].question_text = text.trim(); };
window.updateChoiceText = (idx, letter, text) => { parsedQuestions[idx]['choice_' + letter] = text.trim(); };

function updateAnswerStats() {
    if (!parsedQuestions || parsedQuestions.length === 0) return;
    let counts = { 'ก': 0, 'ข': 0, 'ค': 0, 'ง': 0, 'none': 0 };
    parsedQuestions.forEach(q => {
        if(!q.is_subjective) {
            let a = (q.correct_answer || '').toLowerCase().trim();
            if(a==='a' || a==='ก') counts['ก']++;
            else if(a==='b' || a==='ข') counts['ข']++;
            else if(a==='c' || a==='ค') counts['ค']++;
            else if(a==='d' || a==='ง') counts['ง']++;
            else counts['none']++;
        }
    });
    
    const panel = document.getElementById('answerStatsPanel');
    if (panel) {
        panel.classList.remove('hidden');
        const sg = document.getElementById('stat-ก'); if(sg) sg.textContent = counts['ก'];
        const sk = document.getElementById('stat-ข'); if(sk) sk.textContent = counts['ข'];
        const sc = document.getElementById('stat-ค'); if(sc) sc.textContent = counts['ค'];
        const sng = document.getElementById('stat-ง'); if(sng) sng.textContent = counts['ง'];
        const snone = document.getElementById('stat-none'); if(snone) snone.textContent = counts['none'];
    }
}

// ==========================================
// SAVE EXAM PROJECT
// ==========================================
const saveProjectBtn = document.getElementById('saveProjectBtn');
const saveLoader = document.getElementById('saveLoader');
if (saveProjectBtn) {
    saveProjectBtn.addEventListener('click', async () => {
        const subjectSelect = document.getElementById('subjectSelect');
        const projectName = (document.getElementById('generatedProjectName') && document.getElementById('generatedProjectName').textContent) ? document.getElementById('generatedProjectName').textContent.replace('ชื่อชุด:', '').trim() : (document.getElementById('projectNameInput') ? document.getElementById('projectNameInput').value : (document.getElementById('expectedQuestionsInput') ? document.getElementById('expectedQuestionsInput').value : '')); // Using this for project name/desc
        const expert1 = document.getElementById('expert1Select');
        const expert2 = document.getElementById('expert2Select');
        const expert3 = document.getElementById('expert3Select');
        
        if (!subjectSelect || !subjectSelect.value) {
            showToast('กรุณาเลือกวิชา', 'error'); return;
        }

        const indicatorsInput = document.getElementById('indicatorsInput');
        if (!indicatorsInput || indicatorsInput.value.trim() === '') {
            showToast('ไม่สามารถบันทึกได้ กรุณาระบุตัวชี้วัดหรือผลการเรียนรู้', 'error'); return;
        }

        const expectedQuestionsInput = document.getElementById('expectedQuestionsInput');
        if (!expectedQuestionsInput || !expectedQuestionsInput.value || expectedQuestionsInput.value.trim() === '') {
            showToast('ไม่สามารถบันทึกได้ กรุณาระบุจำนวนข้อ', 'error'); return;
        }
        const expectedCount = parseInt(expectedQuestionsInput.value, 10);

        if (parsedQuestions.length === 0) {
            showToast('ไม่มีข้อสอบให้บันทึก', 'error'); return;
        }
        
        if (parsedQuestions.length !== expectedCount) {
            showToast(`ไม่สามารถบันทึกได้ จำนวนข้อไม่ตรง (มี ${parsedQuestions.length} ข้อ แต่ระบุไว้ ${expectedCount} ข้อ)`, 'error'); return;
        }

        const missingIndQIndex = parsedQuestions.findIndex(q => { 
            const ind = (q.indicator || '').trim(); 
            return ind === '' || ind === 'ไม่ระบุตัวชี้วัด' || ind === '-'; 
        });
        if (missingIndQIndex !== -1) { 
            showToast(`ไม่สามารถบันทึกได้ ข้อสอบข้อที่ ${missingIndQIndex + 1} ยังไม่ได้ระบุตัวชี้วัด`, 'error'); return; 
        }
        
        const subjCode = subjectSelect.value;
        const e1 = expert1 ? expert1.value : '';
        const e2 = expert2 ? expert2.value : '';
        const e3 = expert3 ? expert3.value : '';
        
        if (!e1 || !e2 || !e3) {
            showToast('กรุณาเลือกผู้เชี่ยวชาญให้ครบ 3 ท่าน', 'error'); 
            return;
        }
        if (e1 === e2 || e1 === e3 || e2 === e3) {
            showToast('กรุณาเลือกผู้เชี่ยวชาญ 3 ท่านที่ไม่ซ้ำกัน', 'warning');
            return;
        }
        
        saveProjectBtn.disabled = true;
        if(saveLoader) saveLoader.classList.remove('hidden');
        
        let finalProjectName = projectName;
        let pYear = new Date().getFullYear() + 543;
        let pSem = '1';
        let examTypeVal = 'กลางภาค';
        const examRadios = document.getElementsByName('examType');
        for (let r of examRadios) {
            if (r.checked) examTypeVal = r.value;
        }
        let eType = 'สอบ' + examTypeVal;
        
        let subjTypeVal = 'พื้นฐาน';
        const subjRadios = document.getElementsByName('subjectType');
        if (subjRadios && subjRadios.length > 0) {
            for (let r of subjRadios) {
                if (r.checked) subjTypeVal = r.value;
            }
        }
        
        const selSubj = subjectsData.find(s => s.subject_code === subjCode);
        if (selSubj) {
            if(!finalProjectName) {
                finalProjectName = `ข้อสอบ ${subjCode} ${eType} เทอม ${selSubj.semester || '1'}/${selSubj.academic_year || pYear}`;
            }
            pYear = selSubj.academic_year || pYear;
            pSem = selSubj.semester || pSem;
        } else if (!finalProjectName) {
            finalProjectName = 'สอบ ' + subjCode;
        }
        
        const payload = {
            projectInfo: {
                project_id: currentEditingProjectId || '',
                teac_code: currentTeacherCode,
                subject_code: subjCode,
                project_name: finalProjectName,
                expert_1: e1,
                expert_2: e2,
                expert_3: e3,
                subject_type: subjTypeVal,
                exam_type: eType,
                academic_year: pYear,
                semester: pSem
            },
            questions: parsedQuestions
        };
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'saveExamProject', payload: payload })
            });
            const data = await response.json();
            if (data.status === 'success') {
                showToast('บันทึกโครงการสอบสำเร็จ!', 'success');
                fetchMyProjects(currentTeacherCode, currentTeacherName);
                parsedQuestions = [];
                renderTable();
            } else {
                showToast('เกิดข้อผิดพลาด: ' + data.message, 'error');
            }
        } catch (error) {
            showToast('เครือข่ายขัดข้อง: ' + error, 'error');
        } finally {
            saveProjectBtn.disabled = false;
            if(saveLoader) saveLoader.classList.add('hidden');
        }
    });
}

// ==========================================
// IOC EXPERT REVIEW (TINDER)
// ==========================================
const startReviewBtn = document.getElementById('startReviewBtn');
const startReviewLoader = document.getElementById('startReviewLoader');

if (startReviewBtn) {
    startReviewBtn.addEventListener('click', async () => {
        const reviewerCode = currentReviewerCode || document.getElementById('reviewerSelect').value;
        if (!reviewerCode) {
            showToast('กรุณาระบุตัวผู้ประเมิน', 'error'); return;
        }
        currentReviewerCode = reviewerCode;
        
        startReviewBtn.disabled = true;
        if(startReviewLoader) startReviewLoader.classList.remove('hidden');
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'getProjectQuestions', payload: { project_id: expertProjectId } })
            });
            const data = await response.json();
            if (data.status === 'success') {
                currentReviewQuestions = data.data;
                reviewIndex = 0;
                currentReviews = [];
                
                document.getElementById('expertSetup').classList.add('hidden');
                document.getElementById('tinderArea').classList.remove('hidden');
                
                const disp = document.getElementById('reviewerNameDisplay');
                if(disp) disp.textContent = 'ผู้ประเมินรหัส: ' + reviewerCode;
                
                renderTinderCard();
            } else {
                showToast('ไม่สามารถดึงข้อสอบได้', 'error');
            }
        } catch (error) {
            showToast('เชื่อมต่อล้มเหลว', 'error');
        } finally {
            startReviewBtn.disabled = false;
            if(startReviewLoader) startReviewLoader.classList.add('hidden');
        }
    });
}

function renderTinderCard() {
    const container = document.getElementById('cardsContainer');
    const progress = document.getElementById('reviewProgress');
    const controls = document.getElementById('tinderControls');
    const completed = document.getElementById('reviewCompleted');
    
    if(!container) return;
    container.innerHTML = '';
    
    if (reviewIndex >= currentReviewQuestions.length) {
        // Finished
        if(controls) controls.classList.add('hidden');
        if(progress) progress.classList.add('hidden');
        if(completed) completed.classList.remove('hidden');
        saveReviewsToServer();
        return;
    }
    
    if(progress) progress.textContent = `ข้อที่ ${reviewIndex + 1} จาก ${currentReviewQuestions.length}`;
    
    const q = currentReviewQuestions[reviewIndex];
    const card = document.createElement('div');
    card.className = 'bg-white rounded-3xl shadow-xl p-8 border border-gray-100 max-w-lg mx-auto transform transition-all duration-300';
    
    let choicesHtml = '';
    if (q.choice_a) {
        choicesHtml = `
            <div class="mt-4 space-y-2 text-sm text-gray-700">
                <div class="p-2 ${q.correct_choice === 'ก' ? 'bg-green-50 border border-green-200 rounded' : ''}">ก. ${q.choice_a}</div>
                <div class="p-2 ${q.correct_choice === 'ข' ? 'bg-green-50 border border-green-200 rounded' : ''}">ข. ${q.choice_b}</div>
                <div class="p-2 ${q.correct_choice === 'ค' ? 'bg-green-50 border border-green-200 rounded' : ''}">ค. ${q.choice_c}</div>
                <div class="p-2 ${q.correct_choice === 'ง' ? 'bg-green-50 border border-green-200 rounded' : ''}">ง. ${q.choice_d}</div>
            </div>
        `;
    }
    
    let mediaHtml = '';
    if(q.image_url) {
      mediaHtml += `<div class="mt-2">
        <a href="${q.image_url}" target="_blank" class="inline-flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-indigo-200">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          ดูรูปภาพประกอบ (เปิดในแท็บใหม่)
        </a>
      </div>`;
    }
    if(q.passage_text) mediaHtml += `<div class="mt-2 p-3 bg-gray-50 text-sm border rounded">${q.passage_text}</div>`;
    
    card.innerHTML = `
        <div id="swipeStamp" class="absolute top-8 right-8 border-4 rounded-xl px-4 py-2 text-3xl font-bold opacity-0 transform transition-opacity duration-200 pointer-events-none z-10"></div>
        <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">ข้อที่ ${q.question_id || (reviewIndex+1)}</div>
        <div class="text-lg text-gray-800 font-medium whitespace-pre-wrap">${q.question_text}</div>
        ${mediaHtml}
        ${choicesHtml}
        <div class="mt-6 pt-4 border-t border-gray-100">
            <div class="text-xs text-gray-500 mb-1">ตัวชี้วัด / จุดประสงค์:</div>
            <div class="text-sm font-medium text-blue-700 bg-blue-50 p-3 rounded-lg">${q.indicator || 'ไม่ระบุ'}</div>
        </div>
        <div class="mt-4">
            <textarea id="reviewComment" class="w-full text-sm border-gray-300 rounded-lg p-3" placeholder="ข้อเสนอแนะเพิ่มเติม (ถ้ามี)..." rows="2"></textarea>
        </div>
    `;
    
    container.appendChild(card);
    
    // Initialize Swipe Physics
    initTinderCard(card);
}

const btnMinusOne = document.getElementById('btnMinusOne');
const btnZero = document.getElementById('btnZero');
const btnPlusOne = document.getElementById('btnPlusOne');

function handleSwipe(score) {
    if (reviewIndex >= currentReviewQuestions.length) return;
    
    const cmt = document.getElementById('reviewComment');
    const q = currentReviewQuestions[reviewIndex];
    currentReviews.push({
        project_id: expertProjectId,
        question_id: q.question_id || (reviewIndex+1),
        question_num: reviewIndex + 1,
        reviewer_code: currentReviewerCode,
        score: score,
        comment: cmt ? cmt.value.trim() : ''
    });
    
    reviewIndex++;
    renderTinderCard();
}

if(btnMinusOne) btnMinusOne.addEventListener('click', () => flyOut('left', -1));
if(btnZero) btnZero.addEventListener('click', () => flyOut('up', 0));
if(btnPlusOne) btnPlusOne.addEventListener('click', () => flyOut('right', 1));

async function saveReviewsToServer() {
    document.getElementById('savingReviewsContainer').classList.remove('hidden');
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'saveIOCReviews', payload: { reviews: currentReviews } })
        });
        const data = await response.json();
        
        document.getElementById('savingReviewsContainer').classList.add('hidden');
        if (data.status === 'success') {
            document.getElementById('savedSuccessContainer').classList.remove('hidden');
        } else {
            showToast('เกิดข้อผิดพลาดในการบันทึก: ' + data.message, 'error');
        }
    } catch (error) {
        document.getElementById('savingReviewsContainer').classList.add('hidden');
        showToast('การเชื่อมต่อล้มเหลว', 'error');
    }
}

// ==========================================
// REPORTS & EXPORT
// ==========================================
window.viewReport = async (projectId) => {
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('reportSection').classList.remove('hidden');
    
    if (subjectsData.length === 0 && currentTeacherCode) {
        await fetchSubjects(currentTeacherCode);
    }
    
    const tbody = document.getElementById('reportTableBody');
    if(tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">กำลังโหลดข้อมูล...</td></tr>';
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getProjectResults', payload: { project_id: projectId } })
        });
        const data = await response.json();
        
        if (data.status === 'success' && data.data) {
            currentReportData = data.data.questions;
            currentPrintProjectInfo = data.data.project_info;
            currentPrintTeachers = data.data.all_teachers || [];
            
            // Map reviews to questions
            const reviews = data.data.reviews || [];
            const rMap = {};
            reviews.forEach(r => {
                const qId = String(r.question_id);
                if (!rMap[qId]) rMap[qId] = [];
                rMap[qId].push(r);
            });
            
            let totalPassed = 0;
            let totalReviewers = new Set();
            
            const qList = [];
            currentReportData.forEach(q => {
                const revs = rMap[String(q.question_id)] || [];
                let scoreSum = 0;
                let cmtList = [];
                revs.forEach(r => {
                    scoreSum += parseInt(r.score) || 0;
                    totalReviewers.add(r.reviewer_code);
                    if(r.comment) cmtList.push(r.comment);
                });
                const ioc = (scoreSum / 3).toFixed(2);
                const isPassed = parseFloat(ioc) >= 0.5;
                if (isPassed) totalPassed++;
                

                let qTextFull = q.question_text || '';
                qList.push({
                    question_id: q.question_id,
                    project_id: q.project_id || projectId,
                    q_num: q.question_num || q.question_id, // fallback
                    text: qTextFull,
                    a: q.choice_a,
                    b: q.choice_b,
                    c: q.choice_c,
                    d: q.choice_d,
                    ans: q.correct_choice || q.correct_answer,
                    ind: q.indicator,
                    ioc: ioc,
                    isPassed: isPassed,
                    comments: cmtList,
                    scores: revs.map(r => r.score),
                    image_url: q.image_url,
                    passage_text: q.passage_text
                });
            });
            
            currentReportData = qList; // For export
            
            // Render Stats
            const stTotal = document.getElementById('statTotalQ');
            const stPass = document.getElementById('statPassed');
            const stFail = document.getElementById('statFailed');
            const stRev = document.getElementById('statReviewers');
            const prjName = document.getElementById('reportProjectName');
            const prjId = document.getElementById('reportProjectId');
            
            if(stTotal) stTotal.textContent = qList.length;
            if(stPass) stPass.textContent = totalPassed;
            if(stFail) stFail.textContent = qList.length - totalPassed;
            if(stRev) stRev.textContent = totalReviewers.size;
            if(prjName) prjName.textContent = currentPrintProjectInfo ? currentPrintProjectInfo.project_name : 'รายงานผล IOC';
            if(prjId) prjId.textContent = projectId;
            
            // Render Table
            if(tbody) {
                tbody.innerHTML = '';
                qList.forEach((q, idx) => {
                    const tr = document.createElement('tr');
                    const badge = q.isPassed 
                        ? `<span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">นำไปใช้ได้</span>`
                        : `<span class="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">ปรับปรุง</span>`;
                    
                    let sHtml = q.scores.map(s => `<span class="inline-block w-6 text-center ${s>0?'text-green-600':(s<0?'text-red-600':'text-gray-500')}">${s}</span>`).join('');
                    if(!sHtml) sHtml = '-';
                    
                    let cHtml = q.comments.map(c => `<div class="text-xs text-gray-500">- ${c}</div>`).join('');
tr.innerHTML = `
                        <td class="px-4 py-3 text-center border-b">${q.q_num}</td>
                        <td class="px-4 py-3 border-b">
                            <div class="text-sm text-gray-800 font-medium">${q.text}</div>
                            ${q.ind ? `<div class="text-xs text-blue-600 mt-1">${q.ind}</div>` : ''}
                        </td>
                        <td class="px-4 py-3 border-b">${cHtml}</td>
                        <td class="px-4 py-3 border-b">
                            <div class="flex gap-1 text-sm font-mono bg-gray-50 px-2 py-1 rounded border">${sHtml}</div>
                        </td>
                        <td class="px-4 py-3 text-center font-medium border-b ${q.isPassed ? 'text-green-600' : 'text-red-600'}">${q.ioc}</td>
                        <td class="px-4 py-3 text-center border-b">
                            <div class="flex items-center justify-center gap-2">
                                ${badge}
                                <button onclick="openEditQuestionModal('${q.question_id || q.q_num}')" class="text-gray-400 hover:text-blue-500 transition-colors" title="แก้ไขข้อสอบ">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </button>
                            </div>
                        </td>
                        
                    `;
                    tbody.appendChild(tr);
                });
            }
            
        } else {
            console.error("getProjectResults failed:", data);
            if(tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-red-500">เกิดข้อผิดพลาด: ${data.message || 'ไม่ทราบสาเหตุ'}</td></tr>`;
        }
    } catch (error) {
        console.error('Fetch report error:', error);
        if(tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-red-500">การเชื่อมต่อขัดข้อง</td></tr>';
    }
};

const backToDashboardBtn = document.getElementById('backToDashboardBtn');
if (backToDashboardBtn) {
    backToDashboardBtn.addEventListener('click', () => {
        document.getElementById('reportSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
    });
}

// ==========================================
// DOCXTEMPLATER EXPORT LOGIC
// ==========================================
function base64ToUint8Array(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
}

const printReportBtn = document.getElementById('printReportBtn');
if (printReportBtn) {
    printReportBtn.addEventListener('click', () => {
        if (!currentReportData || currentReportData.length === 0) {
            showToast('ไม่มีข้อมูลสำหรับส่งออก', 'error'); return;
        }
        
        try {
            const content = base64ToUint8Array(templateDocxBase64);
            const zip = new PizZip(content);
            
            let xml = zip.file("word/document.xml").asText();
            
            // Use DOMParser to safely inject loop tags inside the table row and fix repeated tags
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, "text/xml");

            let expertCount = 0;
            const tTags = xmlDoc.getElementsByTagName("w:t");
            for(let i=0; i<tTags.length; i++) {
                if(tTags[i].textContent.includes("ระดับคะแนนผู้เชียวชาญคนที่ 1")) {
                    expertCount++;
                    if(expertCount === 2) tTags[i].textContent = tTags[i].textContent.replace("คนที่ 1", "คนที่ 2");
                    if(expertCount === 3) tTags[i].textContent = tTags[i].textContent.replace("คนที่ 1", "คนที่ 3");
                }
            }
            
            // Fix the repeated expert tags: the user pasted `คนที่ 1` three times
            // Find the table row containing [[ข้อสอบ]]
            const rows = xmlDoc.getElementsByTagName("w:tr");
            let targetRow = null;
            for(let i=0; i<rows.length; i++) {
                if(rows[i].textContent.includes("ข้อสอบ")) {
                    targetRow = rows[i];
                    break;
                }
            }

            if (targetRow) {
                const cells = targetRow.getElementsByTagName("w:tc");
                if(cells.length > 0) {
                    // Inject [[#questions]] into the first cell
                    const firstCell = cells[0];
                    const pStart = xmlDoc.createElement("w:p");
                    const rStart = xmlDoc.createElement("w:r");
                    const tStart = xmlDoc.createElement("w:t");
                    tStart.textContent = "[[#questions]]";
                    rStart.appendChild(tStart);
                    pStart.appendChild(rStart);
                    firstCell.insertBefore(pStart, firstCell.firstChild);

                    // Inject [[/questions]] into the last cell
                    const lastCell = cells[cells.length - 1];
                    const pEnd = xmlDoc.createElement("w:p");
                    const rEnd = xmlDoc.createElement("w:r");
                    const tEnd = xmlDoc.createElement("w:t");
                    tEnd.textContent = "[[/questions]]";
                    rEnd.appendChild(tEnd);
                    pEnd.appendChild(rEnd);
                    lastCell.appendChild(pEnd);
                }
            }
            
            const serializer = new XMLSerializer();
            xml = serializer.serializeToString(xmlDoc);
            zip.file("word/document.xml", xml);

            const doc = new window.docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                nullGetter: function(part) { return ''; },
                delimiters: { start: '[[', end: ']]' }
            });
            
            const pInfo = currentPrintProjectInfo || {};
            let objCount = 0; let subjCount = 0;
            let objPass = 0; let subjPass = 0;
            
            let sortedReportData = [...currentReportData].sort((a, b) => {
                let indA = a.ind || a.passage_text || '';
                let indB = b.ind || b.passage_text || '';
                if (indA === indB) return 0;
                let idxA = currentReportData.findIndex(q => (q.ind || q.passage_text || '') === indA);
                let idxB = currentReportData.findIndex(q => (q.ind || q.passage_text || '') === indB);
                return idxA - idxB;
            });
            
            const qList = sortedReportData.map((q, i) => {
                const isSubj = (!q.a && !q.b && !q.c && !q.d);
                if (isSubj) { subjCount++; if(q.isPassed) subjPass++; }
                else { objCount++; if(q.isPassed) objPass++; }
                
                let textOut = q.text;
                if (!isSubj) {
                    if (q.a) textOut += `\n① ${q.a}`;
                    if (q.b) textOut += `\n② ${q.b}`;
                    if (q.c) textOut += `\n③ ${q.c}`;
                    if (q.d) textOut += `\n④ ${q.d}`;
                    let ansMap = { 'ก':'①', 'ข':'②', 'ค':'③', 'ง':'④' };
                    let displayAns = ansMap[q.ans] || q.ans || '-';
                    textOut += `\nเฉลย: ${displayAns}`;
                }
                
                return {
                    'ข้อสอบ': (i + 1) + '. ' + textOut,
                    'เลขตัวชี้วัด หรือมาตรฐาน': q.ind || '-',
                    'ระดับคะแนนผู้เชียวชาญคนที่ 1': q.scores[0] !== undefined ? q.scores[0] : '',
                    'ระดับคะแนนผู้เชียวชาญคนที่ 2': q.scores[1] !== undefined ? q.scores[1] : '',
                    'ระดับคะแนนผู้เชียวชาญคนที่ 3': q.scores[2] !== undefined ? q.scores[2] : '',
                    'คะแนนรวม': q.scores.reduce((a,b)=>a+(isNaN(parseInt(b))?0:parseInt(b)), 0)
                };
            });

            const semStr = pInfo.semester || '';
            const getExamType = (pName) => {
                if(!pName) return 'กลางภาค';
                if(pName.includes('ปลายภาค')) return 'ปลายภาค';
                return 'กลางภาค';
            };
            const examTypeStr = getExamType(pInfo.project_name);
            
            const sSubj = (typeof subjectsData !== 'undefined') ? subjectsData.find(s => String(s.subject_code).trim().toLowerCase() === String(pInfo.subject_code).trim().toLowerCase()) : null;
            const getExpertName = (val) => {
                if(!val) return '';
                if(typeof expertsData !== 'undefined' && expertsData.length > 0) {
                    const ex = expertsData.find(e => String(e.teac_code) === String(val) || String(e.name) === String(val));
                    if(ex) return ex.name;
                }
                return val;
            };
            const eType = pInfo.exam_type ? String(pInfo.exam_type).toLowerCase() : '';
            const isMidterm = eType.includes('mid') || eType === 'กลางภาค' || examTypeStr === 'กลางภาค';
            let targetTime = pInfo['เวลาสอบ'] || pInfo.test_time || pInfo['เวลา'];

            let targetScore = pInfo['คะแนนกลางภาค/ปลายภาค'] || pInfo['คะแนน'] || pInfo.test_score || pInfo.score || pInfo.full_score;

            let targetItems = pInfo['จำนวนข้อ'] || (isMidterm ? pInfo.midterm_items : pInfo.final_items);
            // Set values
            doc.render({
                'ชื่อวิชา': pInfo.subject_name || pInfo.project_name || '',
                    'วิชา': pInfo.subject_name || pInfo.project_name || '',
                'รหัสวิชา': pInfo.subject_code || '',
                'ชั้นมัธยมศึกษาปีที่': pInfo.class_level || pInfo.class_room || (sSubj && sSubj.class_room ? sSubj.class_room : ''),
                    'ชั้นห้อง': pInfo.class_level || pInfo.class_room || (sSubj && sSubj.class_room ? sSubj.class_room : ''),
                    'ชั้นทับ': pInfo.class_room || (sSubj && sSubj.class_room ? sSubj.class_room : ''),
                    'ชั้น': pInfo.class_room || (sSubj && sSubj.class_room ? sSubj.class_room : ''),
                'กลางภาค/ปลายภาค': examTypeStr,
                'ภาคเรียน': semStr,
                'ปีการศึกษา': pInfo.academic_year || '',
                'ชื่อครู': pInfo.teacher_name || '',
                'ครูคนต่อไป(ถ้ามี)': '',
                'กลุ่มสาระ': pInfo.department || (sSubj && sSubj.department ? sSubj.department : (typeof currentTeacherGroup !== 'undefined' ? currentTeacherGroup : '')),
                'จำนวนข้อสอบปรนัย': objCount,
                'จำนวนปรนัยค่า IOC 0.5 ขึ้นไป': objPass,
                'จำนวนข้อสอบอัตนัย': subjCount,
                'จำนวนอัตนัยค่า IOC .5 ขึ้นไป': subjPass,
                'ชื่อผู้เชี่ยวชาญคนที่ 1': getExpertName(pInfo.expert_1) || '',
                'ชื่อผู้เชี่ยวชาญคนที่ 2': getExpertName(pInfo.expert_2) || '',
                'ชื่อผู้เชี่ยวชาญคนที่ 3': getExpertName(pInfo.expert_3) || '',
                'ชื่อครูคนที่ 2 ถ้ามี': '',
                'questions': qList
            });
            
            const out = doc.getZip().generate({
                type: "blob",
                mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            });
            
            const fName = `รายงาน_IOC_${pInfo.subject_code || 'Project'}.docx`;
            window.saveAs(out, fName);
            showToast('ส่งออกเอกสารสำเร็จ!', 'success');
            
        } catch (error) {
            console.error('Docx error:', error);
            let eMsg = error.message || String(error);
            if (error.properties && error.properties.errors) {
                eMsg = error.properties.errors.map(e => e.message).join(', ');
            }
            showToast('ไม่สามารถสร้างเอกสารได้: ' + eMsg, 'error');
        }
    });
}

// window.editProject = editProject; // Removed to fix edit button bug


// Export Modal Logic
const exportSettingsModal = document.getElementById('exportSettingsModal');
const closeExportModalBtn = document.getElementById('closeExportModalBtn');
const cancelExportModalBtn = document.getElementById('cancelExportModalBtn');
const confirmExportBtn = document.getElementById('confirmExportBtn');

const exportObjCount = document.getElementById('exportObjCount');
const exportObjScore = document.getElementById('exportObjScore');
const exportSubjCount = document.getElementById('exportSubjCount');
const exportSubjScore = document.getElementById('exportSubjScore');

let currentObjCount = 0;
let currentSubjCount = 0;
let currentTargetScore = 0;

function validateExportScore() {
    const obj = parseFloat(exportObjScore.value) || 0;
    const subj = parseFloat(exportSubjScore.value) || 0;
    const statusEl = document.getElementById('exportScoreStatus');
    
    if (currentTargetScore > 0 && Math.abs(obj + subj - currentTargetScore) > 0.01) {
        if(statusEl) statusEl.classList.remove('hidden');
        if(confirmExportBtn) {
            confirmExportBtn.disabled = true;
            confirmExportBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    } else {
        if(statusEl) statusEl.classList.add('hidden');
        if(confirmExportBtn) {
            confirmExportBtn.disabled = false;
            confirmExportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}

if(exportObjScore) exportObjScore.addEventListener('input', validateExportScore);
if(exportSubjScore) exportSubjScore.addEventListener('input', validateExportScore);

function showExportModal() {
    if (!currentReportData || currentReportData.length === 0) {
        showToast('ไม่มีข้อมูลสำหรับส่งออก', 'error'); return;
    }
    if (typeof templateTestDocxBase64 === 'undefined' || !templateTestDocxBase64) {
        showToast('ไม่พบไฟล์เทมเพลตข้อสอบ', 'error'); return;
    }

    const hasMissingInd = currentReportData.some(q => {
        const ind = (q.ind || q.passage_text || '').trim();
        return ind === '' || ind === 'ไม่ระบุตัวชี้วัด';
    });
    
    if (hasMissingInd) {
        showToast('ไม่สามารถสร้างข้อสอบได้ กรุณาระบุตัวชี้วัดหรือผลการเรียนรู้ให้ครบทุกข้อก่อน', 'error');
        return;
    }

    currentObjCount = 0;
    currentSubjCount = 0;

    currentReportData.forEach(q => {
        const a = (q.a || q.choice_a || '') ? '   ' + (q.a || q.choice_a) : '';
                    const b = (q.b || q.choice_b || '') ? '   ' + (q.b || q.choice_b) : '';
                    const c = (q.c || q.choice_c || '') ? '   ' + (q.c || q.choice_c) : '';
                    const d = (q.d || q.choice_d || '') ? '   ' + (q.d || q.choice_d) : '';
        if (!a && !b && !c && !d) {
            currentSubjCount++;
        } else {
            currentObjCount++;
        }
    });

    const pInfo = currentPrintProjectInfo || {};
    const sCode = pInfo.subject_code || '';
    const examTypeStr = pInfo.exam_type || '';
    const sSubj = subjectsData.find(s => String(s.subject_code).trim().toLowerCase() === String(sCode).trim().toLowerCase()) || {};
    let midScore = sSubj.midterm_score || sSubj.mid_score || pInfo.midterm_score || pInfo.mid_score || '';
    let finScore = sSubj.final_score || sSubj.fin_score || pInfo.final_score || pInfo.fin_score || '';
    currentTargetScore = parseFloat(examTypeStr.includes('กลางภาค') ? midScore : finScore) || 0;

    const targetEl = document.getElementById('exportTargetScore');
    if (targetEl) targetEl.textContent = currentTargetScore > 0 ? currentTargetScore : '-';

    exportObjCount.value = currentObjCount;
    exportObjScore.value = currentObjCount > 0 ? (currentObjCount / 2) : 0;
    
    exportSubjCount.value = currentSubjCount;
    exportSubjScore.value = currentSubjCount > 0 ? (currentSubjCount * 5) : 0;
    
    validateExportScore();

    exportSettingsModal.classList.remove('hidden');
}

function hideExportModal() {
    exportSettingsModal.classList.add('hidden');
}

const exportTestPaperBtn = document.getElementById('exportTestPaperBtn');
if (exportTestPaperBtn) {
    exportTestPaperBtn.addEventListener('click', showExportModal);
}

if (closeExportModalBtn) closeExportModalBtn.addEventListener('click', hideExportModal);
if (cancelExportModalBtn) cancelExportModalBtn.addEventListener('click', hideExportModal);

if (confirmExportBtn) {
    confirmExportBtn.addEventListener('click', () => {
        hideExportModal();
        const exportIncludeFailed = document.getElementById('includeFailedQuestions') ? document.getElementById('includeFailedQuestions').checked : false;
        proceedExport(exportIncludeFailed);
    });
}

function proceedExport(includeFailed) {
    console.log("INSIDE proceedExport");
            try {
                const pInfo = currentPrintProjectInfo || {};
                const content = base64ToUint8Array(templateTestDocxBase64);
                const zip = new PizZip(content);
                const doc = new window.docxtemplater(zip, {
                    paragraphLoop: true,
                    linebreaks: true,
                    delimiters: { start: '[[', end: ']]' },
                    nullGetter: function(part) { return ''; }
                });
                console.log("INSIDE proceedExport 5 - Docxtemplater initialized");
                
                let passedQuestions = [...currentReportData];
                
                // Sort by passage_text (ระบบเรียงข้อใหม่)
                passedQuestions.sort((a, b) => {
                    let indA = a.ind || a.passage_text || '';
                    let indB = b.ind || b.passage_text || '';
                    if (indA === indB) return 0;
                    let idxA = currentReportData.findIndex(q => (q.ind || q.passage_text || '') === indA);
                    let idxB = currentReportData.findIndex(q => (q.ind || q.passage_text || '') === indB);
                    return idxA - idxB;
                });
                
                // --- Grouping logic ---
                const groupedData = {};
                passedQuestions.forEach(q => {
                    const indicator = q.ind || q.passage_text || '[ไม่ได้ระบุตัวชี้วัด]';
                    if (!groupedData[indicator]) groupedData[indicator] = { objective: [], subjective: [] };
                    
                    const a = (q.a || q.choice_a || '') ? '   ' + (q.a || q.choice_a) : '';
                    const b = (q.b || q.choice_b || '') ? '   ' + (q.b || q.choice_b) : '';
                    const c = (q.c || q.choice_c || '') ? '   ' + (q.c || q.choice_c) : '';
                    const d = (q.d || q.choice_d || '') ? '   ' + (q.d || q.choice_d) : '';
                    const isSubj = (!a && !b && !c && !d);
                    
                    if (isSubj) groupedData[indicator].subjective.push(q);
                    else groupedData[indicator].objective.push(q);
                });

                let currentObjectiveNum = 1;
                let currentSubjectiveNum = 1;
                
                const objective_groups = [];
                const subjective_groups = [];
                
                const uniqueIndicators = [...new Set(passedQuestions.map(q => q.ind || q.passage_text || '[ไม่ได้ระบุตัวชี้วัด]'))];
                
                uniqueIndicators.forEach(ind => {
                    const g = groupedData[ind];
                    if (g.objective.length > 0) {
                        const start = currentObjectiveNum;
                        const questions = g.objective.map(q => {
                            const num = currentObjectiveNum++;
                            return {
                                question_num: num,
                                question_text: q.text || q.question_text || '',
                                choice_a: q.a || q.choice_a || '',
                                choice_b: q.b || q.choice_b || '',
                                choice_c: q.c || q.choice_c || '',
                                choice_d: q.d || q.choice_d || ''
                            };
                        });
                        objective_groups.push({
                            indicator: ind,
                            start_num: start,
                            end_num: currentObjectiveNum - 1,
                            questions: questions
                        });
                    }
                    
                    if (g.subjective.length > 0) {
                        const start = currentSubjectiveNum;
                        const questions = g.subjective.map(q => {
                            const num = currentSubjectiveNum++;
                            return {
                                question_num: num,
                                question_text: q.text || q.question_text || ''
                            };
                        });
                        subjective_groups.push({
                            indicator: ind,
                            start_num: start,
                            end_num: currentSubjectiveNum - 1,
                            questions: questions
                        });
                    }
                });
            
                const getExamType2 = (pName) => {
                    if(!pName) return 'กลางภาค';
                    if(pName.includes('ปลายภาค')) return 'ปลายภาค';
                    return 'กลางภาค';
                };
                let examTypeStr2 = getExamType2(pInfo.project_name);
                
                let midTime = ''; let finTime = ''; let midScore = ''; let finScore = '';
                let acaYear = pInfo.academic_year || ''; let sem = pInfo.semester || '';
                
                const sSubj = subjectsData.find(s => String(s.subject_code).trim().toLowerCase() === String(pInfo.subject_code).trim().toLowerCase());
                if (sSubj) {
                    midTime = sSubj.midterm_time || sSubj.mid_time || pInfo.midterm_time || pInfo.mid_time || '';
                    finTime = sSubj.final_time || sSubj.fin_time || pInfo.final_time || pInfo.fin_time || '';
                    midScore = sSubj.midterm_score || sSubj.mid_score || pInfo.midterm_score || pInfo.mid_score || '';
                    finScore = sSubj.final_score || sSubj.fin_score || pInfo.final_score || pInfo.fin_score || '';
                }
                
                let teachersStr = '';
                if (currentPrintTeachers && currentPrintTeachers.length > 0) {
                    teachersStr = currentPrintTeachers.map(t => typeof t === 'string' ? t : (t.teacher_name || t.name || '')).filter(n => n).join(', ');
                } else if (pInfo.teacher_name) {
                    teachersStr = pInfo.teacher_name;
                }
                
                
                let currentQNum = 1;
                const questionsList = passedQuestions.map(q => {
                    const a = (q.a || q.choice_a || '') ? '   ' + (q.a || q.choice_a) : '';
                    const b = (q.b || q.choice_b || '') ? '   ' + (q.b || q.choice_b) : '';
                    const c = (q.c || q.choice_c || '') ? '   ' + (q.c || q.choice_c) : '';
                    const d = (q.d || q.choice_d || '') ? '   ' + (q.d || q.choice_d) : '';
                    const isSubj = (!a && !b && !c && !d);
                    
                    return {
                        question_num: currentQNum++,
                        question_text: q.text || q.question_text || '',
                        choice_a: a,
                        choice_b: b,
                        choice_c: c,
                        choice_d: d,
                        is_objective: !isSubj,
                        is_subjective: isSubj
                    };
                });

                console.log("INSIDE proceedExport 6 - calling doc.render");
                doc.render({
                    'questions': questionsList,
                    semester: sem,
                    academic_year: acaYear,
                    'กลางภาค/ปลายภาค': examTypeStr2,
                    'ชื่อวิชา': pInfo.subject_name || pInfo.project_name || '',
                    'วิชา': pInfo.subject_name || pInfo.project_name || '',
                    'รหัสวิชา': pInfo.subject_code || '',
                    subject_name: pInfo.subject_name || '',
                    class_level: pInfo.class_level || '',
                    mid_score: midScore,
                    mid_time: midTime,
                    final_score: finScore,
                    final_time: finTime,
                    teacher_names: teachersStr,
                    objective_groups: objective_groups,
                    subjective_groups: subjective_groups,
                    'obj_count': document.getElementById('exportObjCount') ? document.getElementById('exportObjCount').value : 0,
                    'obj_choices': 4,
                    'obj_score': document.getElementById('exportObjScore') ? document.getElementById('exportObjScore').value : 0,
                    'subj_count': document.getElementById('exportSubjCount') ? document.getElementById('exportSubjCount').value : 0,
                    'subj_score': document.getElementById('exportSubjScore') ? document.getElementById('exportSubjScore').value : 0,
                    'ภาคเรียน': sem,
                    'เทอม': sem,
                    'ปี': acaYear,
                    'ปีการศึกษา': acaYear,
                    'ชั้นมัธยมศึกษาปีที่': pInfo.class_level || pInfo.class_room || (sSubj && sSubj.class_room ? sSubj.class_room : ''),
                    'ชั้นห้อง': pInfo.class_level || pInfo.class_room || (sSubj && sSubj.class_room ? sSubj.class_room : ''),
                    'ชั้นทับ': pInfo.class_room || (sSubj && sSubj.class_room ? sSubj.class_room : ''),
                    'ชั้น': pInfo.class_room || (sSubj && sSubj.class_room ? sSubj.class_room : ''),
                    'กลุ่มสาระ': pInfo.department || (sSubj && sSubj.department ? sSubj.department : (typeof currentTeacherGroup !== 'undefined' ? currentTeacherGroup : '')),
                    'คะแนนกลางภาค/ปลายภาค': examTypeStr2 === 'กลางภาค' ? midScore : finScore,
                    'เวลาสอบ': examTypeStr2 === 'กลางภาค' ? midTime : finTime,
                    'จำนวนข้อ': passedQuestions.length
                });
                
                const out = doc.getZip().generate({
                    type: "blob",
                    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                });
                
                window.saveAs(out, `ข้อสอบ_${pInfo.subject_code || 'Exam'}.docx`);
                showToast(`ส่งออกข้อสอบสำเร็จ (${passedQuestions.length} ข้อ)`, 'success');
                
            } catch (error) {
                console.error('Docx error:', error);
                let eMsg = error.message || String(error);
                if (error.properties && error.properties.errors) {
                    eMsg = error.properties.errors.map(e => e.message).join(', ');
                }
                showToast('ไม่สามารถสร้างเอกสารข้อสอบได้: ' + eMsg, 'error');
            }
        }
function copyExamToClipboard(includeAnswers) {
    if (!currentReportData || currentReportData.length === 0) {
        showToast('ไม่มีข้อมูลข้อสอบ', 'error'); return;
    }
    let passedQuestions = [...currentReportData];
    
    let text = '';
    let objCount = 1;
    let subjCount = 1;
    passedQuestions.forEach(q => {
        const a = (q.a || q.choice_a || '') ? '   ' + (q.a || q.choice_a) : '';
                    const b = (q.b || q.choice_b || '') ? '   ' + (q.b || q.choice_b) : '';
                    const c = (q.c || q.choice_c || '') ? '   ' + (q.c || q.choice_c) : '';
                    const d = (q.d || q.choice_d || '') ? '   ' + (q.d || q.choice_d) : '';
        const isSubj = (!a && !b && !c && !d);
        
        let qText = q.text || q.question_text || '';
        if(q.passage_text) qText = q.passage_text + '\n' + qText;
        
        const num = q.question_id || (isSubj ? subjCount++ : objCount++);
        text += num + '. ' + qText + '\n';
        if (!isSubj) {
            if (a) text += '   ก. ' + a + '\n';
            if (b) text += '   ข. ' + b + '\n';
            if (c) text += '   ค. ' + c + '\n';
            if (d) text += '   ง. ' + d + '\n';
        }
        if (includeAnswers) {
            const ans = q.ans || q.correct_choice || q.correct_answer || '-';
            text += '   เฉลย: ' + ans + '\n';
        }
        text += '\n';
    });
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('คัดลอกข้อสอบเรียบร้อยแล้ว', 'success');
    }).catch(err => {
        showToast('ไม่สามารถคัดลอกข้อสอบได้', 'error');
    });
}

const copyExamBtn = document.getElementById('copyExamBtn');
if (copyExamBtn) {
    copyExamBtn.addEventListener('click', () => copyExamToClipboard(false));
}

const copyExamWithAnsBtn = document.getElementById('copyExamWithAnsBtn');
if (copyExamWithAnsBtn) {
    copyExamWithAnsBtn.addEventListener('click', () => copyExamToClipboard(true));
}

window.openEditQuestionModal = function(qId) {
    const q = currentReportData.find(item => String(item.question_id) === String(qId) || String(item.question_num) === String(qId) || String(item.q_num) === String(qId) || String(item.id) === String(qId));
    if (!q) { showToast('ไม่พบข้อมูลข้อสอบ (ID: ' + qId + ')', 'error'); console.error('Question not found:', qId, currentReportData); return; }

    document.getElementById('editQId').value = q.question_id || q.question_num || q.q_num || qId;
    document.getElementById('editPId').value = q.project_id || currentPrintProjectInfo.project_id;
    document.getElementById('editQText').value = q.text || '';
    
    const isSubj = (!q.a && !q.b && !q.c && !q.d);
    if (isSubj) {
        document.getElementById('editChoicesContainer').classList.add('hidden');
    } else {
        document.getElementById('editChoicesContainer').classList.remove('hidden');
        document.getElementById('editQA').value = q.a || '';
        document.getElementById('editQB').value = q.b || '';
        document.getElementById('editQC').value = q.c || '';
        document.getElementById('editQD').value = q.d || '';
    }

    document.getElementById('editQuestionModal').classList.remove('hidden');
};

document.getElementById('closeEditModalBtn')?.addEventListener('click', () => {
    document.getElementById('editQuestionModal').classList.add('hidden');
});

document.getElementById('cancelEditModalBtn')?.addEventListener('click', () => {
    document.getElementById('editQuestionModal').classList.add('hidden');
});

document.getElementById('saveEditModalBtn')?.addEventListener('click', async () => {
    const qId = document.getElementById('editQId').value;
    const pId = document.getElementById('editPId').value;
    const qText = document.getElementById('editQText').value;
    const qA = document.getElementById('editQA').value;
    const qB = document.getElementById('editQB').value;
    const qC = document.getElementById('editQC').value;
    const qD = document.getElementById('editQD').value;
    
    if(!qText.trim()) {
        showToast('กรุณาระบุโจทย์คำถาม', 'error');
        return;
    }

    const loader = document.getElementById('saveEditLoader');
    const btn = document.getElementById('saveEditModalBtn');
    
    try {
        loader.classList.remove('hidden');
        btn.disabled = true;
        
        const payload = {
            action: 'updateQuestionData',
            payload: {
                project_id: pId,
                question_id: qId,
                question_text: qText,
                choice_a: qA,
                choice_b: qB,
                choice_c: qC,
                choice_d: qD
            }
        };
        
        const resp = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        const result = await resp.json();
        
        if(result.status === 'success') {
            showToast('บันทึกการแก้ไขสำเร็จ', 'success');
            document.getElementById('editQuestionModal').classList.add('hidden');
            // Reload the report
            if (pId) {
                await viewReport(pId);
            }
        } else {
            throw new Error(result.message || 'Unknown error');
        }
        
    } catch(err) {
        console.error('Error saving question:', err);
        showToast('เกิดข้อผิดพลาดในการบันทึก: ' + err.message, 'error');
    } finally {
        loader.classList.hidden('hidden');
        btn.disabled = false;
    }
});


window.updateIndicatorHeader = function() {
    const hdr = document.getElementById('indicatorHeader');
    if (!hdr) return;
    const isBasic = document.querySelector('input[name="subjectType"][value="พื้นฐาน"]')?.checked;
    hdr.textContent = isBasic ? 'มาตรฐานตัวชี้วัด' : 'ผลการเรียนรู้';
};



function initTinderCard(card) {
    const mc = new Hammer(card);
    mc.add(new Hammer.Pan({ direction: Hammer.DIRECTION_ALL, threshold: 0 }));
    
    mc.on('pan', function (ev) {
        card.style.transition = 'none';
        const rotate = ev.deltaX * 0.03;
        card.style.transform = `translate(${ev.deltaX}px, ${ev.deltaY}px) rotate(${rotate}deg)`;

        const stamp = card.querySelector('#swipeStamp');
        if (stamp) {
            if (ev.deltaX > 50) {
                stamp.textContent = '+1 สอดคล้อง';
                stamp.className = 'absolute top-8 left-8 border-4 rounded-xl px-4 py-2 text-3xl font-bold opacity-100 transform transition-opacity duration-200 pointer-events-none z-10 text-green-500 border-green-500 rotate-[-15deg]';
            } else if (ev.deltaX < -50) {
                stamp.textContent = '-1 ไม่สอดคล้อง';
                stamp.className = 'absolute top-8 right-8 border-4 rounded-xl px-4 py-2 text-3xl font-bold opacity-100 transform transition-opacity duration-200 pointer-events-none z-10 text-red-500 border-red-500 rotate-[15deg]';
            } else if (ev.deltaY < -50 && Math.abs(ev.deltaX) < 50) {
                stamp.textContent = '0 ไม่แน่ใจ';
                stamp.className = 'absolute bottom-8 left-1/2 -translate-x-1/2 border-4 rounded-xl px-4 py-2 text-3xl font-bold opacity-100 transform transition-opacity duration-200 pointer-events-none z-10 text-amber-500 border-amber-500';
            } else {
                stamp.style.opacity = '0';
            }
        }
    });

    mc.on('panend', function (ev) {
        card.style.transition = 'transform 0.4s ease-out';
        
        if (ev.deltaX > 100) {
            flyOut('right', 1);
        } else if (ev.deltaX < -100) {
            flyOut('left', -1);
        } else if (ev.deltaY < -100 && Math.abs(ev.deltaX) < 100) {
            flyOut('up', 0);
        } else {
            card.style.transform = '';
            const stamp = card.querySelector('#swipeStamp');
            if (stamp) stamp.style.opacity = '0';
        }
    });
}

function flyOut(direction, score) {
    const card = document.querySelector('#cardsContainer > div');
    if(!card) return;
    
    card.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';
    if(direction === 'right') {
        card.style.transform = 'translate(1000px, 0) rotate(30deg)';
    } else if(direction === 'left') {
        card.style.transform = 'translate(-1000px, 0) rotate(-30deg)';
    } else if(direction === 'up') {
        card.style.transform = 'translate(0, -1000px)';
    }
    card.style.opacity = '0';
    
    const q = currentReviewQuestions[reviewIndex];
    const comment = document.getElementById('reviewComment') ? document.getElementById('reviewComment').value : '';
    
    currentReviews.push({
        project_id: q.project_id || expertProjectId,
        question_id: q.question_id,
        question_num: q.question_num || q.q_num || (reviewIndex+1),
        reviewer_code: currentReviewerCode,
        score: score,
        comment: comment
    });
    
    setTimeout(() => {
        reviewIndex++;
        renderTinderCard();
    }, 400);
}

async function autoLoginWithCode(code) {
    if(loginSection) loginSection.classList.remove('hidden');
    const loader = document.getElementById('loginLoader');
    const errEl = document.getElementById('loginError');
    if(loader) loader.classList.remove('hidden');
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getTeachers' })
        });
        const data = await response.json();
        
        if(loader) loader.classList.add('hidden');
        
        if (data.status === 'success' && data.data) {
            const teacher = data.data.find(t => String(t.teac_code) === String(code));
            if (teacher) {
                const subjGroup = teacher.subject_group || teacher.group || '';
                const tName = teacher.name || teacher.teacher_name || '';
                sessionStorage.setItem('teac_code', teacher.teac_code);
                sessionStorage.setItem('subject_group', subjGroup);
                sessionStorage.setItem('teacher_name', tName);
                handleLoginSuccess(teacher.teac_code, subjGroup, tName);
            } else {
                if(errEl) { errEl.textContent = 'ไม่พบรหัสครูนี้ในระบบ (Token Invalid)'; errEl.classList.remove('hidden'); }
            }
        } else {
            if(errEl) { errEl.textContent = 'โหลดข้อมูลครูล้มเหลว'; errEl.classList.remove('hidden'); }
        }
    } catch (e) {
        if(loader) loader.classList.add('hidden');
        if(errEl) { errEl.textContent = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'; errEl.classList.remove('hidden'); }
    }
}

// ==========================================
// MEDIA MODAL (Image / Passage)
// ==========================================

let _mediaCurrentIdx = null;   // which question index is being edited
let _mediaCurrentType = null;  // 'image' or 'passage'
let _mediaPendingBase64 = null; // base64 of image before upload
let _mediaPendingMime = null;

/** Open media modal for a given question index and type */
window.openMediaModal = function(idx, type) {
    _mediaCurrentIdx  = idx;
    _mediaCurrentType = type;
    _mediaPendingBase64 = null;
    _mediaPendingMime   = null;

    const modal      = document.getElementById('mediaModal');
    const imgArea    = document.getElementById('mediaImageArea');
    const passArea   = document.getElementById('mediaPassageArea');
    const titleEl    = document.getElementById('mediaModalTitle');
    const iconEl     = document.getElementById('mediaModalIcon');
    const hiddenIdx  = document.getElementById('mediaQuestionIndex');
    const hiddenType = document.getElementById('mediaType');

    if (!modal) return;

    // Clear previous state
    const preview   = document.getElementById('imagePreviewContainer');
    const placeholder = document.getElementById('imagePlaceholder');
    const imgEl     = document.getElementById('imagePreview');
    const fileInput = document.getElementById('imageFileInput');
    const passInput = document.getElementById('passageInput');
    const applyTo   = document.getElementById('applyToQuestionInput');

    if (preview)     { preview.classList.add('hidden'); }
    if (placeholder) { placeholder.classList.remove('hidden'); }
    if (imgEl)       { imgEl.src = ''; }
    if (fileInput)   { fileInput.value = ''; }
    if (applyTo)     { applyTo.value = ''; }

    // Show existing value if any
    const q = parsedQuestions[idx] || {};
    if (type === 'image') {
        if (imgArea)  imgArea.classList.remove('hidden');
        if (passArea) passArea.classList.add('hidden');
        if (titleEl)  titleEl.textContent = 'แนบรูปภาพ';
        if (iconEl)   iconEl.textContent  = '🖼️';
        hiddenIdx.value  = idx;
        hiddenType.value = 'image';
        // Show existing image if present
        if (q.image_url && imgEl && preview && placeholder) {
            // Hide the image element and show a link button instead
            imgEl.style.display = 'none';
            imgEl.src = '';
            
            // Clear any existing link
            const existingLink = preview.querySelector('.img-link-btn');
            if(existingLink) existingLink.remove();
            
            const a = document.createElement('a');
            a.className = 'img-link-btn inline-flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-indigo-200';
            a.href = q.image_url;
            a.target = '_blank';
            a.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> ดูรูปภาพประกอบ (เปิดในแท็บใหม่)';
            preview.appendChild(a);
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');
        }
    } else {
        if (passArea) passArea.classList.remove('hidden');
        if (imgArea)  imgArea.classList.add('hidden');
        if (titleEl)  titleEl.textContent = 'แนบบทความ/ข้อความ';
        if (iconEl)   iconEl.textContent  = '📝';
        hiddenIdx.value  = idx;
        hiddenType.value = 'passage';
        if (passInput) passInput.value = q.passage_text || '';
    }

    modal.classList.remove('hidden');
};

/** Close media modal */
window.closeMediaModal = function() {
    const modal = document.getElementById('mediaModal');
    if (modal) modal.classList.add('hidden');
    _mediaPendingBase64 = null;
    _mediaPendingMime   = null;
};

/** Handle file selected via file picker */
window.handleImageFileSelect = function(event) {
    const file = event.target.files[0];
    if (file) _loadImageFile(file);
};

/** Clear image preview */
window.clearImagePreview = function(event) {
    if (event) event.stopPropagation();
    _mediaPendingBase64 = null;
    _mediaPendingMime   = null;
    const preview     = document.getElementById('imagePreviewContainer');
    const placeholder = document.getElementById('imagePlaceholder');
    const imgEl       = document.getElementById('imagePreview');
    const fileInput   = document.getElementById('imageFileInput');
    if (preview)     preview.classList.add('hidden');
    if (placeholder) placeholder.classList.remove('hidden');
    if (imgEl)       imgEl.src = '';
    if (fileInput)   fileInput.value = '';
};

/** Internal: load a File/Blob as base64 and show preview */
function _loadImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
        showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result; // "data:image/png;base64,XXXX"
        const parts   = dataUrl.split(',');
        _mediaPendingBase64 = parts[1];
        _mediaPendingMime   = file.type;

        const imgEl     = document.getElementById('imagePreview');
        const preview   = document.getElementById('imagePreviewContainer');
        const placeholder = document.getElementById('imagePlaceholder');
        if (imgEl)       imgEl.src = dataUrl;
        if (preview)     preview.classList.remove('hidden');
        if (placeholder) placeholder.classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

/** Paste image with Ctrl+V inside the media modal */
document.addEventListener('paste', function(event) {
    const modal = document.getElementById('mediaModal');
    if (!modal || modal.classList.contains('hidden')) return;
    if (_mediaCurrentType !== 'image') return;

    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            _loadImageFile(blob);
            event.preventDefault();
            break;
        }
    }
});

/** Save media to question (called by modal "บันทึก" button) */
window.saveMediaToQuestion = async function() {
    const idx  = _mediaCurrentIdx;
    const type = _mediaCurrentType;
    if (idx === null || idx === undefined) return;

    const applyToInput = document.getElementById('applyToQuestionInput');
    const applyToNum   = parseInt(applyToInput ? applyToInput.value : '') || 0;
    // Questions to apply to: from idx to applyToNum-1 (1-based input), inclusive
    const endIdx = (applyToNum > idx + 1) ? applyToNum - 1 : idx;

    if (type === 'image') {
        if (!_mediaPendingBase64) {
            // No new image selected; if there was one already, just close
            closeMediaModal();
            return;
        }

        // Show uploading state
        const saveBtn = document.querySelector('#mediaModal button[onclick="saveMediaToQuestion()"]');
        const origText = saveBtn ? saveBtn.textContent : '';
        if (saveBtn) { saveBtn.textContent = '⏳ กำลังอัปโหลด...'; saveBtn.disabled = true; }

        try {
            const fileName = `exam_img_q${idx + 1}_${Date.now()}.${_mediaPendingMime.split('/')[1] || 'png'}`;

            const res = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'uploadImage',
                    payload: {
                        base64:   _mediaPendingBase64,
                        mimeType: _mediaPendingMime,
                        fileName: fileName
                    }
                })
            });
            const data = await res.json();

            if (data.status === 'success') {
                const url = data.url;
                // Apply to range of questions
                for (let i = idx; i <= endIdx && i < parsedQuestions.length; i++) {
                    parsedQuestions[i].image_url = url;
                    // Update preview badge in table
                    const previewDiv = document.getElementById(`media-preview-${i}`);
                    if (previewDiv) {
                        let html = previewDiv.innerHTML;
                        if (!html.includes('มีรูปภาพแนบแล้ว')) {
                            previewDiv.innerHTML = `<div class="bg-blue-50 px-2 py-1 rounded inline-block">🖼️ มีรูปภาพแนบแล้ว</div>` + html;
                        }
                    }
                }
                showToast('อัปโหลดรูปภาพสำเร็จ!', 'success');
                closeMediaModal();
            } else {
                showToast('อัปโหลดล้มเหลว: ' + (data.message || 'ไม่ทราบสาเหตุ'), 'error');
            }
        } catch (err) {
            showToast('เชื่อมต่อล้มเหลว: ' + err.message, 'error');
        } finally {
            if (saveBtn) { saveBtn.textContent = origText; saveBtn.disabled = false; }
        }

    } else {
        // Passage
        const passInput = document.getElementById('passageInput');
        const text = passInput ? passInput.value.trim() : '';

        for (let i = idx; i <= endIdx && i < parsedQuestions.length; i++) {
            parsedQuestions[i].passage_text = text;
            const previewDiv = document.getElementById(`media-preview-${i}`);
            if (previewDiv) {
                let existImg = previewDiv.querySelector('.img-badge') ? previewDiv.querySelector('.img-badge').outerHTML : '';
                previewDiv.innerHTML = existImg + (text ? `<div class="bg-blue-50 px-2 py-1 rounded inline-block">📝 มีบทความแนบแล้ว</div>` : '');
            }
        }
        showToast('บันทึกบทความสำเร็จ!', 'success');
        closeMediaModal();
    }
};


window.deleteProject = async (projectId) => {
    if (!confirm('คุณต้องการลบชุดข้อสอบนี้ใช่หรือไม่? \n(ลบแล้วไม่สามารถกู้คืนได้)')) return;
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'deleteProject',
                payload: { project_id: projectId }
            })
        });
        const data = await response.json();
        if (data.status === 'success') {
            alert('ลบชุดข้อสอบแล้ว');
            if (typeof currentTeacherCode !== 'undefined' && typeof currentTeacherName !== 'undefined') {
                fetchMyProjects(currentTeacherCode, currentTeacherName);
            }
        } else {
            alert('เกิดข้อผิดพลาด: ' + data.message);
        }
    } catch (error) {
        console.error('Delete project error:', error);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
};
