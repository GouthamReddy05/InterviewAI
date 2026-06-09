/* ============================================================
   InterviewAI — State Management  (js/state.js)
   ============================================================ */

const state = {
    step: 0, // 0:landing 1:upload 2:analysis 3:setup 4:interview 5:results
    resumeFile: null,
    resumeFileName: '',
    jobRole: '',
    candidateName: '',
    difficulty: 'medium', // easy, medium, hard
    skills: [],
    projects: [],
    experience: '',
    currentQuestion: 0,
    questions: [],
    answers: [],
    metrics: {
        technicalScore: 0,
        communicationScore: 0,
        confidenceScore: 0,
        eyeContactScore: 0,
        resumeKnowledge: 0,
        problemSolving: 0,
        fillerWords: 0,
        speakingSpeed: 0,
        averagePause: 0,
        emotion: 'Neutral'
    },
    interviewActive: false,
    stream: null,
    faceDetected: true,
    eyeContactLost: false,
    warnings: [],
    agentStatus: {
        resumeAnalyzer: 'idle',
        questionGenerator: 'idle',
        technicalEvaluator: 'idle',
        communicationEvaluator: 'idle',
        faceMonitor: 'idle',
        feedbackGenerator: 'idle',
        reportGenerator: 'idle'
    },
    chatMessages: [],
    isRecording: false,
    transcript: '',
    cheatingAlerts: [],
    typing: false,
    
    // Cheating statistics
    cheatingStats: {
        lookedAwayCount: 0,
        multipleFacesCount: 0,
        mobileDetectedCount: 0,
        secondsLookedAway: 0
    },
    
    // Simulation triggers
    simulations: {
        lookAway: false,
        noFace: false,
        multipleFaces: false,
        phoneUsage: false
    },
    
    // RAG Technical Evaluator details
    lastEvaluation: null, // Stores evaluation of last answered question
    evaluations: []       // Stores history of all evaluations
};

/** Reset all mutable fields for a fresh interview without reloading the page. */
function resetState() {
    state.step = 0;
    state.resumeFile = null;
    state.resumeFileName = '';
    state.jobRole = '';
    state.candidateName = '';
    state.difficulty = 'medium';
    state.skills = [];
    state.projects = [];
    state.experience = '';
    state.currentQuestion = 0;
    state.questions = [];
    state.answers = [];
    state.metrics = {
        technicalScore: 0, communicationScore: 0, confidenceScore: 0,
        eyeContactScore: 0, resumeKnowledge: 0, problemSolving: 0,
        fillerWords: 0, speakingSpeed: 0, averagePause: 0, emotion: 'Neutral'
    };
    state.interviewActive = false;
    state.stream = null;
    state.faceDetected = true;
    state.eyeContactLost = false;
    state.warnings = [];
    state.agentStatus = {
        resumeAnalyzer: 'idle', questionGenerator: 'idle', technicalEvaluator: 'idle',
        communicationEvaluator: 'idle', faceMonitor: 'idle', feedbackGenerator: 'idle',
        reportGenerator: 'idle'
    };
    state.chatMessages = [];
    state.isRecording = false;
    state.transcript = '';
    state.cheatingAlerts = [];
    state.typing = false;
    state.cheatingStats = {
        lookedAwayCount: 0,
        multipleFacesCount: 0,
        mobileDetectedCount: 0,
        secondsLookedAway: 0
    };
    state.simulations = {
        lookAway: false,
        noFace: false,
        multipleFaces: false,
        phoneUsage: false
    };
    state.lastEvaluation = null;
    state.evaluations = [];
}

// Gemini 1.5 Flash client connection
state.geminiKey = 'AQ.Ab8RN6LqI7s7pyuzLXNEfvJ5JPbXFiX57xluZ5HE5ZElvDi8oA';

async function callGemini(prompt, systemInstruction = "") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.geminiKey}`;
    
    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }]
    };
    
    if (systemInstruction) {
        requestBody.systemInstruction = {
            parts: [{ text: systemInstruction }]
        };
    }
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API Response Error: ${response.status} - ${errText}`);
        }
        
        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
            return data.candidates[0].content.parts[0].text.trim();
        } else {
            console.error("Gemini Response structure:", data);
            throw new Error("Empty or malformed candidates list from Gemini");
        }
    } catch (e) {
        console.error("Failed to execute Gemini API call:", e);
        throw e;
    }
}
