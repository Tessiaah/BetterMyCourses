/** Native quiz-navigation variants used by the simulated and real installs. */
export const quizSidebar =
  '<aside id="block-region-side-pre" aria-label="Quiz side panel" style="position:fixed;right:16px;top:16px;width:min(240px,calc(100% - 32px));z-index:2"><section id="mod_quiz_navblock" class="block block_quiz_nav card"><div class="card-body"><h2 class="card-title">Quiz navigation</h2><div class="content"><div class="qn_buttons" style="min-height:44px"><a href="#first">1</a> <a href="#second">2</a></div><a href="#finish" class="mod_quiz-next-nav">Finish attempt ...</a></div></div></section></aside>';
export function withQuizSidebar(html: string): string {
  return html.replace('</body>', quizSidebar + '</body>');
}
