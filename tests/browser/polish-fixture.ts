// Synthetic regression markup using Aalto title classes and upstream Moodle/
// STACK question styles. No authenticated course content is included.
const diagram =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><path d="M30 120V40H130L140 30L150 50L160 30L170 50L180 40H290V120H30" fill="none" stroke="black" stroke-width="2"/><text x="140" y="95" fill="black" font-size="24">R</text></svg>',
  );

export function polishFixture(kind: 'course' | 'quiz') {
  return `<!doctype html><html data-bs-theme="dark"><head><style>
    body{margin:0} .navbar{min-height:64px;padding:0 24px}
    .navbar .nav-link{padding:20px 18px;border:4px solid transparent}
    .navbar .nav-link.active{border-bottom-color:#d7b77a}
    .navbar .nav-link:focus{outline:5px solid #555;background:#dfe4e8}
    .contextpage-context-header-content{margin:24px auto;max-width:1100px;padding:16px;background:rgba(255,255,255,.85)}
    .contextpage-context-header-content h1{white-space:normal;font-size:42px}
    #region-main{max-width:1100px;margin:auto;padding:0 16px 40px}
    .que .content{background:white;border:1px solid #ced4da;margin-bottom:24px}
    .que .info{padding:12px}.que .formulation{background:white;padding:12px}
    .que .outcome,.que .comment{background:#fff6da;color:#997404;padding:12px}
    .que.stack .stackinputfeedback.standard,.que.stack .stackinputfeedback.compact,.que.stack .stackinputfeedback.equiv,.que.stack .stackinputfeedback.loading{background:white;border:1px solid white;padding:.5em;margin:.2em 3em .5em}
    .que.stack .stackinputfeedback.empty{display:none}
    table.quizreviewsummary{width:100%}table.quizreviewsummary th.cell{background:#f0f0f0}table.quizreviewsummary td.cell{background:#393e4f}
    .block:has(.qn_buttons){margin:20px 0;padding:20px;border:1px solid #ddd}
    .othernav a{display:block;background:white;color:#999}
    .qnbutton{display:inline-block;width:34px;height:44px;margin:4px;text-align:center;background:#ccc}
    .qnbutton .trafficlight{display:block;height:18px;border-bottom:3px solid #080}
    .qnbutton.correct .trafficlight{background:#cfc}.qnbutton.incorrect .trafficlight{background:#fcc}
    .qnbutton.partiallycorrect .trafficlight{background:#ffa}
    .drawercontent{height:120px;overflow-y:auto;outline:0}.scroll-content{height:500px}
    .course-listitem{padding:8px;border-bottom:1px solid #ddd}
    .course-listitem .menu{padding:0}.generalbox{margin-block:24px}
    @media(max-width:700px){.contextpage-context-header-content{margin:20px 16px}}
  </style></head><body class="path-mod ${kind === 'quiz' ? 'path-mod-quiz' : 'path-mod-page'}" id="page-mod-${kind === 'quiz' ? 'quiz-review' : 'page-view'}">
  <nav class="navbar navbar-expand"><ul class="navbar-nav flex-row"><li><a class="nav-link active" href="#main">Home</a></li><li><a class="nav-link" href="#main">Dashboard</a></li></ul></nav>
  <div class="contextpage-context-header-content" style="background-color:rgba(255,255,255,.85)"><div class="page-context-header"><div class="page-header-headings"><h1>ELEC-C9620 · Synthetic course with a long header and readable wrapping</h1></div></div><ol class="breadcrumb"><li class="breadcrumb-item"><a href="#main">Main course page</a></li><li class="breadcrumb-item active">Week 5</li></ol></div>
  <main id="region-main">
  ${
    kind === 'quiz'
      ? `
    <table class="quizreviewsummary"><tbody><tr><th class="cell">Grade</th><td class="cell">6.00 out of 6.00</td></tr></tbody></table>
    <div class="que stack"><div class="info">Question 1</div><div class="content"><div class="formulation"><div class="qtext"><img id="diagram" src="${diagram}" width="320" height="180" role="presentation" alt="Synthetic circuit"/><p>Find the resistance of the circuit.</p><img class="icon" id="question-icon" src="${diagram}" width="16" height="16" alt="Icon"/><img class="texrender" id="equation" src="${diagram}" width="24" height="14" alt="Equation"/></div><div class="answer"><label>R = <input class="form-control d-inline-block w-auto" value="100" /></label></div>
    ${['standard', 'compact', 'equiv', 'loading', 'empty'].map((state) => `<div class="stackinputfeedback ${state}">Your last answer was interpreted as follows: <span>100</span></div>`).join('')}
    <button class="btn btn-secondary">Check</button></div><div class="outcome"><span class="text-success">Correct</span><div class="stackprtfeedback">Feedback: the response is correct.</div></div><div class="comment">Review comment</div></div></div>
    <aside class="block card"><h3>Quiz navigation</h3><div class="qn_buttons">${['correct', 'incorrect', 'partiallycorrect'].map((state, n) => `<a class="qnbutton ${state}" href="#main"><span class="thispageholder">${n + 1}</span><span class="trafficlight"></span></a>`).join('')}</div><div class="othernav"><a class="mod_quiz-next-nav" href="#finished">Finish review</a></div></aside><div class="submitbtns"><a class="mod_quiz-next-nav" href="#finished">Finish review</a></div>`
      : `
    <h2>Week 5</h2><div class="generalbox"><div class="no-overflow"><p>This synthetic course introduction describes the weekly learning goals and links to existing materials. Its paragraphs need consistent line length and comfortable spacing.</p><h3>Learning goals</h3><ul><li>Read the lecture materials.</li><li>Complete the exercises.</li></ul><p><a href="#main">Weekly course content</a></p></div></div>
    <div class="course-content"><section class="section"><div class="summary"><h3>Course information</h3><p>Weekly information and existing content remain in their original order.</p></div><div class="activity-item">Lecture materials</div></section></div>
    <ul class="list-group"><li class="course-listitem list-group-item px-2"><div class="row"><div class="col-10">Synthetic course</div><div class="col-2 menu p-0 d-flex"><div class="ms-auto dropdown"><button class="btn btn-link coursemenubtn" aria-label="Course actions">⋮</button></div></div></div></li></ul>`
  }
  <div class="drawercontent" tabindex="0" aria-label="Scrollable sidebar"><div class="scroll-content">Sidebar content</div></div>
  <div style="height:500px">End of fixture</div></main></body></html>`;
}
