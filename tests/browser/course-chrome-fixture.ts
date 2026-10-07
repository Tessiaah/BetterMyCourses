// Synthetic content in Aalto/Boost wrappers. Native geometry/paint conflicts
// are taken from the public stylesheet and Moodle's discussion-list template.
export function courseChromeFixture(kind: 'course' | 'section' | 'forum') {
  const avatar =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="35" height="35"><circle cx="17" cy="17" r="17" fill="#aaa"/></svg>',
    );
  const author = `<div class="d-flex"><div class="align-middle p-0"><img class="rounded-circle userpicture" src="${avatar}" alt="Synthetic author" width="35" height="35"/></div><div class="author-info align-middle"><div class="mb-1 text-truncate">Course staff</div><div><time>5 Oct 2026</time></div></div></div>`;
  const sidebar = `<aside class="block block_news_items card"><div class="card-body"><h3>Latest announcements</h3><div class="content"><ul class="unlist">${['Exam information', 'Next lecture', 'Optional practice'].map((t) => `<li class="post"><div class="head clearfix"><div class="date">5 October 2026, 6:08 PM</div><div class="name">Course staff</div></div><div class="info"><a href="#post">${t}</a></div></li>`).join('')}</ul></div></div></aside>`;
  return `<!doctype html><html data-bs-theme="dark"><head><style>
    body{margin:0}#page{margin:0 280px 0 220px}#topofscroll{width:100%}
    #page-header{min-height:230px;background-image:linear-gradient(100deg,#6793a5,#956b9a);display:flex;align-items:end;padding:24px 0}
    .contextpage-context-header-content{padding:0 1em;background:#fff}
    #page-course-view-topics .contextpage-context-header-content,#page-course-view-section-topics .contextpage-context-header-content{max-width:1024px!important;margin:auto!important}
    .page-context-header{padding:.25rem 0}.page-header-headings h1{font-size:30px}
    .breadcrumb-button{display:flex;gap:16px;padding:12px;justify-content:end;background:#0e0e11}
    .header-courseend{height:32px;margin:12px 36px;background:#000}
    .secondary-navigation{padding-bottom:15px}.secondary-navigation .navigation{margin:0 -.5rem;padding:0 calc(.5rem + 15px);border-bottom:1px solid #ddd}
    .secondary-navigation .navigation .nav-tabs{max-width:830px;margin:0 auto;border:none}
    .secondary-navigation .navigation .nav-link{padding:20px 24px}
    [data-bs-theme=dark] .secondary-navigation .navigation .nav-tabs .nav-item .nav-link{background:transparent!important;border-width:0!important;border-radius:0!important;color:#e9ecef!important}
    [data-bs-theme=dark] .secondary-navigation .navigation .nav-tabs .nav-item .nav-link.active{background-color:#1e1e25!important;color:#fff!important}
    #page-content{padding:32px}.course-content{padding:24px}.summary{padding:16px}
    aside.block_news_items{position:absolute;right:16px;top:24px;width:248px}.block_news_items h3{font-size:20px}.block_news_items .card-body{padding:16px}
    .block_news_items .post{padding:0}.block_news_items .info a{color:#b3b3b3}
    .no-overflow{overflow:auto}.discussion-list{width:100%}.discussion-list .userpicture{width:35px;height:35px}.discussion-list th,.discussion-list td{background:#393e4f!important;box-shadow:inset 0 0 0 9999px #393e4f!important}
    .discussion-list .fit-content{width:1%;white-space:nowrap}.discussion-list .btn{min-width:40px}
    @media(max-width:1000px){#page{margin:0}aside.block_news_items{position:static;width:auto;margin:16px}}
  </style></head><body id="${kind === 'course' ? 'page-course-view-topics' : kind === 'section' ? 'page-course-view-section-topics' : 'page-mod-forum-view'}" class="${kind === 'forum' ? 'path-mod path-mod-forum' : 'path-course'}">
  <nav class="navbar"><a class="nav-link active" href="#home">Home</a></nav>
  <div id="page" class="drawers"><div id="topofscroll" class="main-inner">
    ${kind !== 'forum' ? `<header id="page-header"><div class="contextpage-context-header-content"><div class="page-context-header m-2"><div class="page-header-headings"><h1>Synthetic Calculus course title</h1></div></div><ol class="breadcrumb"><li class="breadcrumb-item"><a href="#course">Main course page</a></li><li class="breadcrumb-item">Week 6</li></ol></div></header>` : ''}
    <div class="breadcrumb-button"><a class="btn btn-secondary" href="#feedback">Course feedback</a><a class="btn btn-secondary" href="#syllabus">Syllabus</a></div>
    ${kind !== 'forum' ? `<div class="contextpage-context-header-content" id="section-title"><div class="page-context-header m-2"><div class="page-header-headings"><h1>Welcome to Calculus 1</h1></div></div></div>` : ''}
    <div class="header-courseend"></div>
    ${kind === 'course' ? `<div class="secondary-navigation"><nav class="moremenu navigation" aria-label="Course navigation"><ul class="nav nav-tabs"><li class="nav-item"><a class="nav-link active" href="#course" aria-current="page">Course</a></li><li class="nav-item"><a class="nav-link" href="#grades">Grades</a></li><li class="nav-item"><a class="nav-link" href="#activities">Activities</a></li><li class="nav-item"><a class="nav-link" href="#feedback">Course feedback</a></li><li class="nav-item dropdown"><a class="nav-link dropdown-toggle" href="#more" data-bs-toggle="dropdown">More</a><div class="dropdown-menu"><a class="dropdown-item" href="#reports">Reports</a></div></li></ul></nav></div>` : ''}
    <div id="page-content"><div id="region-main-box"><main id="region-main">
    ${kind !== 'forum' ? `<div class="course-content"><section class="course-section"><h2>Course information</h2><div class="summary"><p>Native course information and weekly activities keep their order.</p><a href="#materials">Lecture materials</a></div></section></div>` : `<h2>Announcements</h2><div class="activity-header">General news and announcements</div><div id="discussion-list-fixture"><div class="position-relative"><div class="no-overflow"><table class="table discussion-list generaltable"><caption class="visually-hidden">Course announcements</caption><thead><tr><th scope="col"></th><th class="ps-0" scope="col"><a href="#sort">Discussion</a></th><th class="author px-3" scope="col">Started by</th><th class="lastpost px-3" scope="col">Last post</th><th scope="col">Replies</th><th scope="col" class="discussionsubscription"></th></tr></thead><tbody>${['Exam information with a long title that needs to wrap cleanly without colliding with its star', 'Next lecture', 'Practice problems'].map((title, i) => `<tr class="discussion" data-region="discussion-list-item" data-discussionid="${i}"><td class="p-0 text-center align-middle icon-no-margin" style="width:1px"><a class="btn btn-link" role="button" data-action="toggle-favourite" aria-label="Star discussion" aria-pressed="false" href="#star"><span class="icon fa fa-star" aria-hidden="true">☆</span></a></td><th scope="row" class="topic p-0 align-middle"><div class="p-3 ps-0"><div class="d-flex"><a class="w-100 h-100 d-block" href="#post">${title}</a></div></div></th><td class="author align-middle fit-content px-3">${author}</td><td class="text-start align-middle fit-content px-3">${author}</td><td class="text-center align-middle fit-content px-2">0</td><td class="p-0 align-middle fit-content" data-container="discussion-summary-actions"><div class="d-flex flex-wrap justify-content-end icon-no-margin"><div class="dropdown"><a class="btn dropdown-toggle" role="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Discussion actions" href="#menu">⋮</a><ul class="dropdown-menu"><li><a class="dropdown-item" href="#subscribe">Subscribe</a></li></ul></div></div></td></tr>`).join('')}</tbody></table></div></div></div>`}
    </main></div></div>
  </div></div>${sidebar}</body></html>`;
}
