/* ============================================================
   InterviewAI — Upload Page  (pages/upload.js)
   ============================================================ */

function renderUpload() {
    app.innerHTML = `
    <div class="min-h-screen bg-surface-950">
        <!-- Progress Bar -->
        <div class="fixed top-0 w-full z-40 bg-surface-950/90 backdrop-blur-sm border-b border-surface-800">
            <div class="max-w-3xl mx-auto px-4 py-4">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-3">
                        <button onclick="state.step=0;render()" class="text-surface-400 hover:text-white transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                            </svg>
                        </button>
                        <span class="text-white text-sm font-medium">Setup Interview</span>
                    </div>
                    <span class="text-surface-500 text-xs">Step 1 of 5</span>
                </div>
                <div class="w-full bg-surface-800 rounded-full h-1.5">
                    <div class="bg-accent-600 h-1.5 rounded-full transition-all duration-500" style="width:20%"></div>
                </div>
            </div>
        </div>
 
        <div class="max-w-2xl mx-auto px-4 pt-24 pb-16">
            <h1 class="text-2xl font-bold text-white mb-2">Set up your interview</h1>
            <p class="text-surface-400 text-sm mb-8">Upload your resume or pick a quick start sample to begin immediately.</p>

            <!-- Name -->
            <div class="mb-6">
                <label class="block text-sm font-medium text-surface-300 mb-2">Your Name</label>
                <input type="text" id="nameInput" placeholder="e.g., Goutham" value="${state.candidateName}"
                    class="w-full bg-surface-900 border border-surface-700 rounded-lg px-4 py-3 text-white placeholder-surface-500
                           focus:outline-none focus:border-accent-600 focus:ring-1 focus:ring-accent-600 transition-all text-sm"
                    onchange="state.candidateName=this.value">
            </div>

            <!-- Resume Upload -->
            <div class="mb-6">
                <label class="block text-sm font-medium text-surface-300 mb-2">Upload Resume PDF</label>
                <div id="dropZone" onclick="document.getElementById('fileInput').click()"
                    class="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                           ${state.resumeFile ? 'border-accent-600/50 bg-surface-900/30' : 'border-surface-700 hover:border-accent-600/50 hover:bg-surface-900/50'}">
                    <input type="file" id="fileInput" accept=".pdf,.doc,.docx" onchange="handleFileUpload(this)">
                    <div id="uploadContent">
                        ${state.resumeFile ? `
                            <div class="flex items-center justify-center gap-3">
                                <div class="w-10 h-10 bg-accent-600/20 rounded-lg flex items-center justify-center">
                                    <svg class="w-5 h-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                </div>
                                <div class="text-left">
                                    <div class="text-white text-sm font-medium">${state.resumeFileName}</div>
                                    <div class="text-surface-500 text-xs">Click to change file</div>
                                </div>
                            </div>
                        ` : `
                            <div class="w-10 h-10 bg-surface-800 rounded-lg flex items-center justify-center mx-auto mb-3">
                                <svg class="w-5 h-5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                                </svg>
                            </div>
                            <div class="text-white text-sm font-medium mb-1">Drop your resume here or click to browse</div>
                            <div class="text-surface-500 text-xs">PDF, DOC, or DOCX (max 5MB)</div>
                        `}
                    </div>
                </div>
            </div>



            <!-- Job Role -->
            <div class="mb-10">
                <label class="block text-sm font-medium text-surface-300 mb-3">Job Role</label>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    ${state.jobRoles.map(role => `
                    <button onclick="selectJobRole('${role}')"
                        class="p-2.5 rounded-lg border text-center transition-all text-xs
                               ${state.jobRole === role
                                   ? 'border-accent-600 bg-accent-600/10 text-white font-medium'
                                   : 'border-surface-700 bg-surface-900/50 text-surface-300 hover:border-surface-600 hover:bg-surface-800/50'}">
                        <div>${role}</div>
                    </button>
                    `).join('')}
                </div>
            </div>

            <!-- Continue -->
            <button onclick="startAnalysis()" id="continueBtn"
                class="w-full py-3.5 rounded-xl font-medium transition-all text-white
                       ${(!state.resumeFile || !state.jobRole)
                           ? 'bg-surface-800 text-surface-600 cursor-not-allowed'
                           : 'bg-accent-600 hover:bg-accent-700 hover:shadow-lg hover:shadow-accent-600/20'}"
                ${(!state.resumeFile || !state.jobRole) ? 'disabled' : ''}>
                Continue
            </button>
        </div>
    </div>
    `;

    _attachDropZone();
}

/* ---- event handlers ---- */

async function handleFileUpload(input) {
    if (input.files.length) {
        const file = input.files[0];
        state.resumeFile     = file;
        state.resumeFileName = file.name;
        
        // Auto extract name from filename if empty
        if (!state.candidateName) {
            let base = state.resumeFileName.split('.')[0];
            base = base.replace(/[-_]/g, ' ');
            base = base.replace(/resume|cv|biodata|pdf/gi, '').trim();
            if (base) {
                state.candidateName = base.charAt(0).toUpperCase() + base.slice(1);
            }
        }
        
        // Reset sample caches
        state.tempExtracted = null;
        state.resumeRawText = "Extracting text from PDF...";
        renderUpload();
        
        // Extract raw text asynchronously in the background
        try {
            state.resumeRawText = await extractTextFromPDF(file);
            console.log("PDF parsed successfully. Characters:", state.resumeRawText.length);
        } catch (e) {
            console.error("PDF parsing error", e);
            state.resumeRawText = `Resume PDF: ${state.resumeFileName}. Candidate: ${state.candidateName}.`;
        }
        
        renderUpload();
    }
}

function selectJobRole(role) {
    state.jobRole = role;
    renderUpload();
}

/**
 * Upload resume to backend to create interview session
 */
async function uploadResumeToBackend() {
    try {
        const formData = new FormData();
        formData.append('resume', state.resumeFile);
        formData.append('job_role', state.jobRole);
        if (state.resumeRawText) {
            formData.append('resume_text', state.resumeRawText);
        }
        
        const response = await API.uploadResume(formData);
        
        if (response.status === 'success') {
            // Store session ID
            state.sessionId = response.session_id;
            state.totalQuestions = response.total_questions;
            
            // Load all questions from backend
            if (response.questions && response.questions.length > 0) {
                state.questions = response.questions.map((q, idx) => ({
                    id: idx + 1,
                    text: q.primary_question,
                    category: q.category,
                    name: q.name,
                    primary_question: q.primary_question,
                    context: q.context,
                    difficulty_level: q.difficulty_level,
                    ideal: `Context: ${q.context}`,
                    concepts: []
                }));
                
                // Use explicitly extracted profile from LLM
                const profile = response.extracted_profile || {};
                state.skills = profile.skills || [];
                state.projects = profile.projects || [];
                
                const exp = profile.experience || [];
                state.experience = exp.length > 0 ? exp.join(', ') : 'Professional Experience';
            }
            
            console.log('Resume uploaded successfully, session created:', state.sessionId);
            console.log('Loaded questions:', state.questions.length);
        } else {
            console.error('Resume upload failed:', response);
        }
    } catch (error) {
        console.error('Error uploading resume:', error);
    }
}

function loadSampleResume(name, role, skills, projects, experience) {
    state.candidateName = name;
    state.jobRole = role;
    state.resumeFileName = `${name}_Resume.pdf`;
    state.resumeFile = { name: state.resumeFileName, size: 124500 }; 
    
    // Set matching pre-computed raw text to mimic PDF extraction
    state.resumeRawText = `
        CANDIDATE: ${name}
        TARGET ROLE: ${role}
        EXPERIENCE: ${experience}
        SKILLS DETECTED: ${skills.join(', ')}
        COMPLETED PROJECTS:
        - ${projects.join('\n        - ')}
    `.trim();
    
    state.tempExtracted = { skills, projects, experience };
    renderUpload();
}

/**
 * Text Extractor utility using PDF.js
 */
async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }
    return fullText.trim();
}

function startAnalysis() {
    if (!state.resumeFile || !state.jobRole) return;
    
    state.step = 2;
    render();
    simulateAnalysis();
}

/* ---- private ---- */

function _attachDropZone() {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-accent-600'); });
    dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('border-accent-600'); });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-accent-600');
        if (e.dataTransfer.files.length) {
            state.resumeFile     = e.dataTransfer.files[0];
            state.resumeFileName = state.resumeFile.name;
            state.tempExtracted = null;
            renderUpload();
        }
    });
}
