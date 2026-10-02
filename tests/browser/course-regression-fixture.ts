// Synthetic native structures only. No student/course content is captured.
const diagram =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><path d="M25 120V40H130L145 30L155 50L165 30L175 50L190 40H290V120H25" stroke="black" fill="none"/><text x="150" y="95" font-size="24">R</text></svg>',
  );
const originalIcon =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="white"/><path d="M9 6H19L23 10V26H9Z M12 14H20 M12 18H20" fill="none" stroke="black"/></svg>',
  );
export function courseRegressionFixture(kind: 'course' | 'quiz' | 'courses') {
  return `<!doctype html><html data-bs-theme="dark"><head>
    <link rel="stylesheet" href="/bootstrap.css"><link rel="stylesheet" href="/native-aalto.css">
    <style>
    body{margin:0}.main-inner{max-width:1100px;margin:auto;padding:24px}
    #page-header{background-image:url('${diagram}');padding:24px}
    #legacy-title{background-color:rgba(255,255,255,.85)!important}
    .course-section{padding:16px 12px}.summary,.generalbox{padding:12px 16px;margin:16px 8px;line-height:1.5}
    .activity-item{padding:12px;margin:8px;border:0;border-radius:0}
    .icon{font-family:'Font Awesome 6 Free';font-size:16px}
    .fas{font-family:'Font Awesome 6 Free';font-weight:900;color:#212529}
    .fa::before{content:'\\f15c'}.fas::before{content:'\\f201'}
    .activityicon{width:32px;height:32px}.activityiconcontainer{display:inline-flex;align-items:center;justify-content:center}
    .que .info{padding:12px;border:1px solid #eee}.que .content{background:white}
    .que .formulation{background:white;padding:16px}.que .outcome{background:#fff6da;padding:12px}
    .que .questionflag label{color:#007bff}
    .que input[type=text]{color:#212529;background:white;border:2px inset #ccc}
    .stackinputfeedback{background:white;padding:.5em;margin:.2em 3em .5em;border:1px solid white}
    .stackinputfeedback.empty{display:none}.othernav a{display:block;background:white;color:#aaa}
    .block-cards{padding:16px}.course-listitem{padding:16px}.course-listitem a{display:block}
    </style></head><body id="${kind === 'courses' ? 'page-my-courses' : kind === 'quiz' ? 'page-mod-quiz-review' : 'page-course-view-topics'}">
    ${
      kind !== 'courses'
        ? `<header id="page-header"><div><section id="legacy-title" style="background-color:rgba(255,255,255,.85)!important;padding:16px;margin:12px">
      <div><h1>Synthetic course title</h1></div><ol class="breadcrumb"><li class="breadcrumb-item"><a href="#main">Main course page</a></li><li class="breadcrumb-item active">Week 1</li></ol>
    </section></div></header>`
        : ''
    }
    <main id="region-main" class="main-inner">
    ${
      kind === 'course'
        ? `
      <div class="course-content"><section class="course-section section"><h2 class="sectionname">Week 1</h2>
      <div class="section-summary-activities"><span class="icon fa fa-file" id="file-icon"></span> Files: 3 <span class="icon fa fa-question" id="quiz-icon"></span> Quiz: 1 <span class="icon fa fa-external-link" id="tool-icon"></span> External tool: 1</div>
      <div class="section-summary-progress"><span class="fas" id="progress-icon"></span> Progress: 0 / 0</div>
      <div class="section_goto"><a href="#main" aria-label="Open week"><span class="icon fa fa-arrow-right" id="week-arrow"></span></a></div>
      <div class="summary"><h3>Course information</h3><p>Native summaries and activities keep their original dimensions and order.</p></div>
      <div class="activity-item"><div class="activityiconcontainer assessment"><img id="original-activity-icon" class="activityicon" src="${originalIcon}" alt="Original file icon"/></div> Lecture materials</div>
      </section></div><div class="generalbox"><p>Page resource text keeps its native spacing.</p></div>
      <aside class="block_calendar_upcoming"><div class="event"><div class="activityiconcontainer assessment"><img id="original-event-icon" class="icon" src="${originalIcon}" alt="Original quiz icon" width="32" height="32"/></div> Exercise closes</div></aside>`
        : kind === 'quiz'
          ? `
      <h2 id="activity-title">Exercise 1</h2><hr id="activity-separator"/><div class="activity-header" id="activity-intro">Synthetic quiz information</div>
      <div class="que"><div class="info">Question 1 <span class="questionflag"><label for="flag"><span>Flag question</span></label><input type="checkbox" id="flag"/></span></div>
      <div class="content"><div class="formulation">
      <img id="diagram" src="${diagram}" width="320" height="180" role="presentation" alt="Synthetic circuit"/>
      <svg id="inline-diagram" width="160" height="80" role="img" aria-label="Inline circuit"><path d="M10 65V15H150V65H10" fill="none" stroke="black"/></svg>
      <img id="quiz-icon" class="icon" src="${originalIcon}" width="16" height="16" alt="Question icon"/>
      <img id="equation" class="texrender" src="${diagram}" width="24" height="14" alt="Equation"/>
      <div class="ddarea"><img id="drag-question" src="${diagram}" width="160" height="90" alt="Drag question background"/></div>
      <p>Find the resistance. <input id="answer" type="text" value="100" aria-label="Resistance"/></p>
      <div class="stackinputfeedback standard">Your last answer was interpreted as follows: <span>100</span></div><div class="stackinputfeedback empty"></div>
      <button class="btn btn-secondary">Check</button></div><div class="outcome">Question feedback</div></div></div>
      <aside class="block block_quiz_nav"><div class="othernav"><a class="mod_quiz-next-nav" href="#finished">Finish review</a></div></aside>`
          : `<section class="block block_myoverview"><div class="block-cards"><div class="course-listitem"><a class="aalink coursename" href="#course">Synthetic course name</a><span class="categoryname">Department of Computer Science</span></div></div></section>`
    }
    <section class="no-overflow" aria-label="Shared link regression"><p style="color:#ff4437;font-style:italic" id="authored-copy">Instructor-authored notice: <a class="autolink" id="authored-link" href="#materials">course materials</a></p><p><a class="aalink" id="plain-aalink" href="#materials">Plain Moodle link</a></p><p><a class="arrow_link" id="arrow-link" href="#materials">Arrow link</a></p><p><a id="classless-link" href="#materials">Classless link</a></p><div role="link" tabindex="0" id="role-link">Role link</div></section></main></body></html>`;
}
