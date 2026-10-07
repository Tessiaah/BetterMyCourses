// Synthetic student report in Moodle's native category/rowspan structure.
// Markup follows gradereport_user/report/user.php and its category template;
// colors and navigation width conflicts reproduce the public Aalto stylesheet.
export const courseDestinations = [
  {
    path: '/course/view.php?id=1',
    body: 'page-course-view-topics',
    classes: 'path-course',
    tab: 'Course',
  },
  {
    path: '/grade/report/user/index.php?id=1',
    body: 'page-grade-report-user-index',
    classes: 'path-grade path-grade-report path-grade-report-user',
    tab: 'Grades',
  },
  {
    path: '/report/outline/index.php?id=1',
    body: 'page-report-outline-index',
    classes: 'path-report path-report-outline',
    tab: 'Activities',
  },
  {
    path: '/mod/feedback/view.php?id=1',
    body: 'page-mod-feedback-view',
    classes: 'path-mod path-mod-feedback',
    tab: 'Course feedback',
  },
] as const;

export function gradesFixture(
  destination: (typeof courseDestinations)[number],
) {
  return `<!doctype html><html data-bs-theme="dark"><head><meta charset="utf-8"><style>
    body{margin:0}#page{margin:0 280px 0 220px}
    #page-header{padding:24px 0;background:#0d0d0f}
    .contextpage-context-header-content{max-width:1024px!important;margin:auto!important;padding:20px;background:#000}
    .secondary-navigation{padding-bottom:15px}
    .secondary-navigation .navigation{background:white;margin:0 -.5rem;padding:0 calc(.5rem + 15px);border-bottom:1px solid #ddd}
    .secondary-navigation .navigation .nav-tabs{max-width:830px;margin:0 auto;border:0}
    .secondary-navigation .navigation .nav-tabs .nav-link{padding:20px 24px}
    [data-bs-theme=dark] .secondary-navigation .navigation .nav-tabs .nav-item .nav-link{background:transparent!important;border-width:0!important;border-radius:0!important;color:#e9ecef!important}
    [data-bs-theme=dark] .secondary-navigation .navigation .nav-tabs .nav-item .nav-link.active{background:#1e1e25!important;color:white!important}
    #page-content{padding:24px}
    .path-grade-report-user .user-report-container{margin:20px 0 30px;padding:10px;background:#f8f9fa}
    .user-grade{width:100%}.user-grade td{min-width:4.5em;vertical-align:middle}
    .user-grade .b1l{width:24px;min-width:24px;padding:0}
    .user-grade tbody .column-itemname{padding-left:24px;padding-right:8px}
    .user-grade th.category{font-weight:bold;padding-left:10px}.user-grade .category-content{min-height:30px;align-items:center;justify-content:end}
    .user-grade .toggle-category{height:24px;width:24px;font-size:12px;line-height:24px;padding:0}
    .user-grade .toggle-category .icon{color:#1d2125}
    .user-grade th.category a[aria-expanded=true] .expanded,.user-grade th.category a[aria-expanded=false] .collapsed{display:none}
    .user-grade tr[data-hidden=true]{display:none}.user-grade tr.spacer{height:.5rem}
    .path-grade-report-user .user-grade :is(thead,tbody,tr,th,td){background:#393e4f!important;box-shadow:inset 0 0 0 9999px #393e4f!important;color:#b3b3b3;border-color:#ddd}
    .user-grade .column-itemname .small{font-size:70%}.user-grade .action-menu{display:inline-block}
    @media(max-width:1000px){#page{margin:0}}
  </style></head><body id="${destination.body}" class="${destination.classes}">
  <div id="page" class="drawers"><div id="topofscroll" class="main-inner">
    <header id="page-header"><div class="contextpage-context-header-content"><div class="page-context-header"><div class="page-header-headings"><h1>Synthetic electronics course</h1></div></div></div></header>
    <div class="secondary-navigation"><nav class="moremenu navigation" aria-label="Course navigation"><ul class="nav nav-tabs">${courseDestinations.map((d) => `<li class="nav-item"><a class="nav-link ${d.tab === destination.tab ? 'active' : ''}" ${d.tab === destination.tab ? 'aria-current="page"' : ''} href="${d.path}">${d.tab}</a></li>`).join('')}<li class="nav-item dropdown"><a class="nav-link dropdown-toggle" href="#more" data-bs-toggle="dropdown">More</a><div class="dropdown-menu"><a class="dropdown-item" href="#reports">Reports</a></div></li></ul></nav></div>
    <div id="page-content"><main id="region-main">
    ${
      destination.tab === 'Grades'
        ? `<div class="tertiary-navigation"><h2>User report</h2></div><h3>Synthetic student</h3><div class="user-report-container" id="user-report-1"><table class="generaltable table user-grade"><caption class="visually-hidden">Grades for this course</caption><thead><tr><th colspan="3" class="header column-itemname" id="itemname1">Grade item</th><th class="header column-grade" id="grade1">Grade</th><th class="header column-feedback" id="feedback1">Feedback</th></tr></thead><tbody>
    <tr data-hidden="false"><th colspan="5" class="category level1" id="cat_1_1"><div class="d-flex category-content"><a class="btn btn-icon toggle-category" href="#" role="button" aria-label="Toggle course" aria-expanded="true" data-categoryid="1"><span class="collapsed"><i class="icon fa fa-chevron-down">⌄</i></span><span class="expanded"><i class="icon fa fa-chevron-right">›</i></span></a><span>Electronics</span></div></th></tr>
    <tr class="cat_1 spacer" data-hidden="false"><td rowspan="7" class="level1 b1l"></td></tr>
    <tr class="cat_1" data-hidden="false"><th colspan="4" class="category level2" id="cat_2_1"><div class="d-flex category-content"><a class="btn btn-icon toggle-category" href="#" role="button" aria-label="Toggle exercises" aria-expanded="true" data-categoryid="2"><span class="collapsed"><i class="icon fa fa-chevron-down">⌄</i></span><span class="expanded"><i class="icon fa fa-chevron-right">›</i></span></a><span>Exercises</span></div></th></tr>
    <tr class="cat_1 cat_2 spacer" data-hidden="false"><td rowspan="5" class="level2 b1l"></td></tr>
    ${[1, 3, 4, 5].map((n, i) => `<tr class="cat_1 cat_2" data-hidden="false"><th class="level3 item column-itemname" id="row_${n}_1"><div class="item d-flex align-items-center"><div class="me-1"><i class="icon fa fa-list" aria-hidden="true">▤</i></div><div><span class="d-block text-uppercase small">Quiz</span><div class="rowtitle"><a href="/mod/quiz/view.php?id=${n}">Exercise ${n}</a></div></div></div></th><td class="level3 item column-grade" headers="grade1 row_${n}_1"><span class="${i === 0 ? 'gradepass' : i === 1 ? 'gradefail' : ''}">${i === 0 ? '6.00' : i === 1 ? '2.00' : '-'}</span><div class="action-menu dropdown"><a class="btn dropdown-toggle" href="#menu" role="button" data-bs-toggle="dropdown" aria-label="Exercise ${n} details">⋯</a><div class="dropdown-menu"><a class="dropdown-item" href="#details">Grade details</a></div></div></td><td class="level3 item column-feedback" headers="feedback1 row_${n}_1">${i === 0 ? 'Well done' : ''}</td></tr>`).join('')}
    <tr class="cat_1" data-hidden="false"><th colspan="3" class="column-itemname baggb">Exercise total</th><td class="column-grade baggb">8.00</td><td class="column-feedback baggb"></td></tr>
    </tbody></table></div>`
        : `<h2>${destination.tab}</h2><p>Native course content stays in place.</p>`
    }
    </main></div></div></div><script>
      document.querySelectorAll('.toggle-category').forEach(toggle=>toggle.addEventListener('click',event=>{
        event.preventDefault();const expanded=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!expanded));document.querySelectorAll('tr.cat_'+toggle.dataset.categoryid).forEach(row=>row.dataset.hidden=String(expanded));
      }));
    </script></body></html>`;
}
