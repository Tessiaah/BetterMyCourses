// Synthetic Moodle structure from its question/multichoice renderers.
// The clear-choice hidden radio remains inside the native answer fieldset.
export const quizControlsFixture = `<!doctype html><html><head><style>
  body{margin:0}.contextpage-context-header-content{padding:20px;margin:20px;background:rgba(255,255,255,.85)}
  main{max-width:1080px;margin:0 auto;padding:20px}.que{margin-bottom:28px}
  .que .info{padding:12px}.que .content{border:1px solid #ccc}
  .que .formulation{background:#e7f3f5;padding:20px}.que .outcome{background:#fff6da;padding:12px}
  .que .qtext{margin-bottom:1.5em}.que .ablock{margin:.7em 0 .3em}
  .que .answer > div{display:flex;align-items:center;gap:12px;padding:8px 0}
  .que .im-controls{margin-top:.5em;text-align:left}.que input[type=text],.que input[type=number]{width:100px;background:white;border:2px inset #555}
  .que .stackprtfeedback{background:#fcf8e3;display:inline-block;padding:3px;margin:3px}
  .que .stackinputfeedback{background:white;padding:8px}.que .specificfeedback{margin-bottom:.5em}
  .sr-only{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  .mt-n1{margin-top:-.25rem!important}
  .que .correct{color:#155724}.que .partiallycorrect{color:#856404}.que .incorrect{color:#721c24}
</style></head><body class="path-mod path-mod-quiz" id="page-mod-quiz-attempt">
  <div class="contextpage-context-header-content"><h1>Synthetic course title</h1><a href="#questions">Main course page</a></div>
  <main id="questions"><form id="quiz-form">
    <div class="que multichoice interactive correct" id="choice-question"><div class="info">Question 1</div><div class="content">
      <div class="formulation clearfix"><h4 class="sr-only">Question text</h4><input type="hidden" name="sequencecheck" value="1">
        <div class="qtext" id="choice-text">Choose one of these synthetic answers.</div>
        <fieldset class="ablock no-overflow visual-scroll-x" aria-describedby="choice-text"><legend class="prompt h6 fw-normal sr-only">Select one</legend>
          <div class="answer" id="choices"><div class="r0"><input type="radio" name="answer" value="a" id="answer-a"><label for="answer-a">A. First answer</label></div><div class="r1"><input type="radio" name="answer" value="b" id="answer-b" checked><label for="answer-b">B. Second answer</label></div></div>
          <div class="qtype_multichoice_clearchoice" id="clear-choice"><input type="radio" name="answer" value="-1" id="clear-radio" class="sr-only" aria-hidden="true"><label for="clear-radio"><a href="#" role="button" class="btn btn-link ms-3 mt-n1" id="clear-button">Clear my choice</a></label></div>
        </fieldset>
        <div class="im-controls"><input type="submit" name="check" value="Check" class="submit btn btn-secondary" id="check-button"></div>
      </div><div class="outcome" id="choice-feedback"><h4 class="sr-only">Feedback</h4><div class="feedback"><div class="specificfeedback">Your answer is correct.</div></div><div class="im-feedback"><span class="correctness correct badge bg-success">Correct</span><p>Marks for this submission: 2.00/2.00.</p></div></div>
    </div></div>
    <div class="que numerical interactive partiallycorrect" id="numeric-question"><div class="info">Question 2</div><div class="content"><div class="formulation"><div class="qtext"><label for="numeric-answer">Average value: </label><input type="text" name="numeric-answer" value="8.5" id="numeric-answer" size="5"> V</div><div class="im-controls"><input type="submit" value="Check" class="submit btn btn-secondary" disabled></div></div><div class="outcome" id="partial-feedback"><div class="feedback"><p>Partially correct.</p></div><div class="im-feedback">Marks: 1.00/2.00.</div></div></div></div>
    <div class="que stack interactive incorrect" id="wrong-question"><div class="info">Question 3</div><div class="content"><div class="formulation"><label for="long-answer">Explain the result.</label><textarea id="long-answer" name="long-answer" rows="2" cols="30">Synthetic response</textarea></div><div class="outcome" id="wrong-feedback"><div class="feedback">Your answer is incorrect.</div></div></div></div>
    <div class="que stack answersaved" id="pending-question"><div class="info">Pending question</div><div class="content"><div class="formulation"><div class="answer"><span class="correct">A choice-level marker</span></div><div class="stackinputfeedback standard" id="interpretation">Your last answer was interpreted as follows: 8.5</div></div><div class="outcome" id="pending-feedback"><span class="badge bg-success">Your answer is correct.</span><p>Synthetic text is not grading data.</p></div></div></div>
    <div class="que stack partiallycorrect" id="mixed-question"><div class="info">Question with graded parts</div><div class="content"><div class="formulation"><div class="stackprtfeedback" id="part-right"><div class="correct">This part is correct.</div><p>Feedback for the first part.</p></div><div class="stackprtfeedback" id="part-wrong"><span class="incorrect">This part is incorrect.</span><p>Feedback for the second part.</p></div></div><div class="outcome" id="mixed-feedback">The site's overall result is partially correct.</div></div></div>
  </form></main></body></html>`;
