/* ============================================================
   InterviewAI — API Service Layer  (js/api-service.js)
   ============================================================ */

/**
 * Centralized API service for communicating with backend
 */
const API = {
    BASE_URL: '/api',

    getHeaders(extraHeaders = {}) {
        const token = localStorage.getItem('interviewai_token');
        const headers = { ...extraHeaders };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    /**
     * Upload resume and create interview session
     */
    async uploadResume(formData) {
        try {
            const response = await fetch(`${this.BASE_URL}/upload-resume`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: formData
            });
            if (response.status === 401) {
                this.handleUnauthorized();
                return { status: 'error', detail: 'Unauthorized' };
            }
            return await response.json();
        } catch (error) {
            console.error('Resume upload error:', error);
            throw error;
        }
    },

    handleUnauthorized() {
        localStorage.removeItem('interviewai_token');
        if (typeof state !== 'undefined' && typeof render !== 'undefined') {
            state.step = 6; // Login page
            render();
        } else {
            window.location.reload();
        }
    },

    /**
     * Get current question for a session
     */
    async getCurrentQuestion(sessionId) {
        const response = await fetch(`${this.BASE_URL}/session/${sessionId}/question`, { headers: this.getHeaders() });
        return await response.json();
    },

    /**
     * Submit answer to current question
     */
    async submitAnswer(sessionId, answer) {
        const response = await fetch(`${this.BASE_URL}/session/${sessionId}/answer`, {
            method: 'POST',
            headers: this.getHeaders({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify({ answer })
        });
        return await response.json();
    },

    /**
     * Move to next question
     */
    async nextQuestion(sessionId) {
        const response = await fetch(`${this.BASE_URL}/session/${sessionId}/next-question`, {
            method: 'POST',
            headers: this.getHeaders()
        });
        return await response.json();
    },

    /**
     * Get interview progress
     */
    async getProgress(sessionId) {
        const response = await fetch(`${this.BASE_URL}/session/${sessionId}/progress`, { headers: this.getHeaders() });
        return await response.json();
    },

    /**
     * Get interview scores
     */
    async getScores(sessionId) {
        const response = await fetch(`${this.BASE_URL}/session/${sessionId}/scores`, { headers: this.getHeaders() });
        return await response.json();
    },

    /**
     * Get comprehensive report
     */
    async getComprehensiveReport(sessionId) {
        const response = await fetch(`${this.BASE_URL}/session/${sessionId}/comprehensive-report`, { headers: this.getHeaders() });
        return await response.json();
    },

    /**
     * End interview session and save score
     */
    async endSession(sessionId, finalScore) {
        try {
            const response = await fetch(`${this.BASE_URL}/session/${sessionId}/end`, {
                method: 'POST',
                headers: this.getHeaders({
                    'Content-Type': 'application/json'
                }),
                body: JSON.stringify({ score: finalScore })
            });
            return await response.json();
        } catch (error) {
            console.error('End session error:', error);
            return { status: 'error' };
        }
    },

    // ========================================
    // FACE DETECTION & MONITORING
    // ========================================

    /**
     * Detect face in video frame
     */
    async detectFace(frameBlob) {
        const formData = new FormData();
        formData.append('frame', frameBlob, 'frame.jpg');
        
        try {
            const response = await fetch(`${this.BASE_URL}/detect-face`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error('Face detection error:', error);
            return {
                status: 'error',
                face_detection: { status: 'error' }
            };
        }
    },

    /**
     * Detect objects (person, phone) in frame
     */
    async detectObjects(frameBlob) {
        const formData = new FormData();
        formData.append('frame', frameBlob, 'frame.jpg');
        
        try {
            const response = await fetch(`${this.BASE_URL}/detect-objects`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error('Object detection error:', error);
            return {
                status: 'error',
                object_detection: { status: 'error' }
            };
        }
    },

    /**
     * Analyze frame for both face and object detection
     */
    async analyzeFrame(frameBlob) {
        const formData = new FormData();
        formData.append('frame', frameBlob, 'frame.jpg');
        
        try {
            const response = await fetch(`${this.BASE_URL}/analyze-frame`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error('Frame analysis error:', error);
            return {
                status: 'error',
                cheating_detected: false,
                warnings: []
            };
        }
    },

    // ========================================
    // AUDIO PROCESSING
    // ========================================

    /**
     * Transcribe audio to text
     */
    async transcribeAudio(audioBlob) {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.wav');
        
        try {
            const response = await fetch(`${this.BASE_URL}/transcribe-audio`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error('Transcription error:', error);
            return {
                status: 'error',
                transcription: { text: '', confidence: 0 }
            };
        }
    },

    /**
     * Generate speech from text
     */
    async generateSpeech(text, voiceId = 'JBFqnCBsd6RMkjVDRZzb') {
        const formData = new FormData();
        formData.append('text', text);
        formData.append('voice_id', voiceId);
        
        try {
            const response = await fetch(`${this.BASE_URL}/generate-speech`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error('Speech generation error:', error);
            return {
                status: 'error',
                audio: null
            };
        }
    },

    /**
     * Get available TTS voices
     */
    async getTTSVoices() {
        try {
            const response = await fetch(`${this.BASE_URL}/tts-voices`);
            return await response.json();
        } catch (error) {
            console.error('TTS voices error:', error);
            return {
                status: 'error',
                voices: []
            };
        }
    },

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.BASE_URL}/health`);
            return await response.json();
        } catch (error) {
            console.error('Health check error:', error);
            return { status: 'unhealthy' };
        }
    }
};

/**
 * Convert canvas to blob (for frame capture)
 */
function canvasToBlob(canvas, mimeType = 'image/jpeg', quality = 0.8) {
    return new Promise((resolve) => {
        canvas.toBlob(resolve, mimeType, quality);
    });
}

/**
 * Play audio from base64 string (from TTS response)
 */
function playAudioFromBase64(base64String) {
    try {
        const audioData = base64String;
        const audio = new Audio();
        audio.src = 'data:audio/mp3;base64,' + audioData;
        audio.play();
        return audio;
    } catch (error) {
        console.error('Error playing audio:', error);
        return null;
    }
}

/**
 * Capture frame from video element
 */
function captureFrame(videoElement) {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0);
    return canvas;
}

/**
 * Capture frame from canvas (for CV simulation)
 */
function captureCanvasFrame(canvasElement) {
    return canvasElement;
}
