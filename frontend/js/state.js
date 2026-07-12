/* ============================================================
   InterviewAI — State Management  (js/state.js)
   ============================================================ */

const state = {
    step: 0, // 0:landing 1:upload 2:analysis 3:setup 4:interview 5:results
    sessionId: null,
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
    totalQuestions: 0,
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
    state.sessionId = null;
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
    state.totalQuestions = 0;
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


