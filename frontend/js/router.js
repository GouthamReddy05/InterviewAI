

const app = document.getElementById('app');

function logoutUser() {
    localStorage.removeItem('interviewai_token');
    state.step = 0;
    render();
}

function render() {
    switch (state.step) {
        case 0: renderLanding();         break;
        case 1: renderUpload();          break;
        case 2: renderAnalysis();        break;
        case 3: renderInterviewSetup();  break;
        case 4: renderActiveInterview(); break;
        case 5: renderResults();         break;
        case 6: renderLogin();           break;
        case 7: renderSignup();          break;
        case 8: renderAdmin();           break;
        default: renderLanding();
    }


    if (window.lucide) {
        lucide.createIcons();
    }
}
