

const state = {
    step: 0,
    sessionId: null,
    resumeFile: null,
    resumeFileName: '',
    jobRole: '',
    candidateName: '',
    difficulty: 'medium',
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


    cheatingStats: {
        lookedAwayCount: 0,
        multipleFacesCount: 0,
        mobileDetectedCount: 0,
        secondsLookedAway: 0
    },


    simulations: {
        lookAway: false,
        noFace: false,
        multipleFaces: false,
        phoneUsage: false
    },


    lastEvaluation: null,
    evaluations: [],


    resumeRawText: '',
    tempExtracted: null,
    reportData: null,
    sessionEnded: false
};


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
    // These are assigned dynamically by upload.js / results.js. Without clearing
    // them, a new interview inherited the previous run's resume text and report.
    state.resumeRawText = '';
    state.tempExtracted = null;
    state.reportData = null;
    // Left true after the first interview, this silently suppressed the
    // end-session call (and therefore the saved score) on every later run.
    state.sessionEnded = false;
}


