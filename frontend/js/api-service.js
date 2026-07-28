


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
        if (typeof state !== 'undefined' && typeof render !== 'undefined') {
            logoutUser();
        } else {
            localStorage.removeItem('interviewai_token');
            window.location.reload();
        }
    },

    /**
     * Single place where every authenticated call is made.
     *
     * Previously only uploadResume checked for 401, so an expired token during a
     * live interview produced a silent failure instead of sending the user back
     * to the login screen. This also normalises non-JSON error bodies (e.g. a
     * proxy's HTML 502 page) into a usable object rather than throwing on parse.
     */
    async _request(path, { method = 'GET', body = null, json = false } = {}) {
        const extra = json ? { 'Content-Type': 'application/json' } : {};
        const response = await fetch(`${this.BASE_URL}${path}`, {
            method,
            headers: this.getHeaders(extra),
            body
        });

        if (response.status === 401) {
            this.handleUnauthorized();
            return { status: 'error', detail: 'Unauthorized' };
        }

        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            return {
                status: 'error',
                detail: `Server returned an unexpected response (HTTP ${response.status})`
            };
        }

        if (!response.ok) {
            return {
                status: 'error',
                httpStatus: response.status,
                detail: (typeof formatApiError === 'function')
                    ? formatApiError(data, `Request failed (HTTP ${response.status})`)
                    : (data && data.detail) || `Request failed (HTTP ${response.status})`
            };
        }
        return data;
    },


    async getCurrentQuestion(sessionId) {
        return this._request(`/session/${encodeURIComponent(sessionId)}/question`);
    },


    async submitAnswer(sessionId, answer) {
        return this._request(`/session/${encodeURIComponent(sessionId)}/answer`, {
            method: 'POST',
            json: true,
            body: JSON.stringify({ answer })
        });
    },


    async nextQuestion(sessionId) {
        return this._request(`/session/${encodeURIComponent(sessionId)}/next-question`, {
            method: 'POST'
        });
    },


    async getProgress(sessionId) {
        return this._request(`/session/${encodeURIComponent(sessionId)}/progress`);
    },


    async getScores(sessionId) {
        return this._request(`/session/${encodeURIComponent(sessionId)}/scores`);
    },


    async getComprehensiveReport(sessionId) {
        return this._request(`/session/${encodeURIComponent(sessionId)}/comprehensive-report`);
    },


    async endSession(sessionId, finalScore) {
        try {
            return await this._request(`/session/${encodeURIComponent(sessionId)}/end`, {
                method: 'POST',
                json: true,
                body: JSON.stringify({ score: finalScore })
            });
        } catch (error) {
            console.error('End session error:', error);
            return { status: 'error' };
        }
    },






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


function canvasToBlob(canvas, mimeType = 'image/jpeg', quality = 0.8) {
    return new Promise((resolve) => {
        canvas.toBlob(resolve, mimeType, quality);
    });
}


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


function captureFrame(videoElement) {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0);
    return canvas;
}


function captureCanvasFrame(canvasElement) {
    return canvasElement;
}
