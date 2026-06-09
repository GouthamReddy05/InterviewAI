/* ============================================================
   InterviewAI — Router  (js/router.js)
   ============================================================ */

const app = document.getElementById('app');

function render() {
    switch (state.step) {
        case 0: renderLanding();         break;
        case 1: renderUpload();          break;
        case 2: renderAnalysis();        break;
        case 3: renderInterviewSetup();  break;
        case 4: renderActiveInterview(); break;
        case 5: renderResults();         break;
        default: renderLanding();
    }
}
