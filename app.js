const sampleQuiz = `Question 1
Topic: MVC
A developer writes all of an application's HTML directly inside controller methods using echo statements, without using any View files. Why is this generally considered poor practice under the MVC pattern?
Answer Choices:
 A. It mixes presentation code with request-handling logic, making the application harder to maintain (SELECTED)
 B. It prevents the use of static PHP arrays
 C. CodeIgniter does not allow echo inside controllers
 D. It causes routes to stop working entirely
------------------------------------------
Question 2
Topic: CodeIgniter Setup
A developer runs composer create-project codeigniter4/appstarter myproject in the terminal. What is the most likely purpose of this command?
Answer Choices:
 A. To update an existing CodeIgniter installation
 B. To create a new CodeIgniter 4 project using Composer (SELECTED)
 C. To generate a new controller file
 D. To install XAMPP
------------------------------------------
Question 3
Topic: CodeIgniter Hosting
In a default CodeIgniter 4 installation, which folder should be set as the web server's document root for production hosting?
Answer Choices:
 A. public (SELECTED)
 B. app
 C. writable
 D. system
------------------------------------------
Question 4
Topic: MVC Views
What is the name of the function used inside a CodeIgniter controller to load a View file and optionally pass data to it?
Your Answer: view()
------------------------------------------
Question 5
Topic: URL Routing
What is the purpose of the .htaccess file in the public folder of a CodeIgniter project?
Answer Choices:
 A. It removes index.php from the URL through URL rewriting (SELECTED)
 B. It defines routes for the application
 C. It stores database credentials
 D. It configures the Composer autoloader
------------------------------------------
Question 6
Topic: MVC Models
Matching type. Match the term with the correct description.
Prompts:
 1. Model
Answer Choices:
 A. Decides what should happen when a specific URL is requested
 B. A dependency manager used to install CodeIgniter and its packages
 C. Manages data and communicates with the database
 D. Displays information to the user, usually as HTML
 E. Maps an incoming URL to a specific controller and method
 F. The single entry point that should be exposed to the web server
Your Answer: Manages data and communicates with the database
------------------------------------------
Question 7
Topic: Networking
Which four steps are needed to configure a voice VLAN on a switch port? (Choose four).
Answer Choices:
 A. Activate spanning-tree PortFast on the interface.
 B. Ensure that voice traffic is trusted and tagged with a CoS priority value. (SELECTED)
 C. Add a voice VLAN. (SELECTED)
 D. Configure the interface as an IEEE 802.1Q trunk.
 E. Configure the switch port in access mode. (SELECTED)
 F. Assign a data VLAN to the switch port.
 G. Assign the voice VLAN to the switch port. (SELECTED)
 H. Configure the switch port interface with subinterfaces.`;

const $ = (selector) => document.querySelector(selector);
const HISTORY_KEY = 'learnityProgressHistory';
const LIBRARY_KEY = 'learnityQuizLibrary';
const els = {
  setup: $('#setupView'), quiz: $('#quizView'), results: $('#resultsView'), input: $('#quizInput'),
  estimate: $('#questionEstimate'), error: $('#parseError'), questionText: $('#questionText'),
  questionNumber: $('#questionNumber'), answers: $('#answers'), feedback: $('#feedback'), next: $('#nextQuestion'),
  progressText: $('#progressText'), scoreText: $('#scoreText'), progressBar: $('#progressBar'),
  keyboardHint: $('#keyboardHint')
};

let questions = [];
let current = 0;
let score = 0;
let responses = [];
let answered = false;
let activeLibrarySubject = null;

function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    // The quiz remains usable when browser storage is unavailable.
    return false;
  }
}

function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to clear when browser storage is unavailable.
  }
}

function normalize(text) {
  return text.replace(/\r/g, '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();
}

function requestedChoiceCount(question) {
  const match = question.match(/(?:choose|select)\s+(?:the\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i);
  if (!match) return 0;
  const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  return Number(match[1]) || words[match[1].toLowerCase()] || 0;
}

function parseQuiz(raw) {
  const text = normalize(raw);
  if (!text) return [];
  let blocks = text.split(/(?=^\s*Question\s+\d+\b)/gim).filter(b => /^\s*Question\s+\d+\b/i.test(b));
  if (!blocks.length) blocks = [`Question 1\n${text}`];
  return blocks.map((block, blockIndex) => {
    const cleaned = block.replace(/^-{5,}\s*$/gm, '').trim();
    let lines = cleaned.split('\n').map(line => line.trim()).filter(Boolean);
    lines.shift();
    const topicLine = lines.find(line => /^Topic\s*:/i.test(line));
    const topic = topicLine ? topicLine.replace(/^Topic\s*:\s*/i, '').trim() || 'General' : 'General';
    lines = lines.filter(line => line !== topicLine);
    const choicesIndex = lines.findIndex(line => /^Answer Choices\s*:/i.test(line));
    const yourAnswerIndex = lines.findIndex(line => /^Your Answer\s*:/i.test(line));
    const promptsIndex = lines.findIndex(line => /^Prompts\s*:/i.test(line));
    let questionLines;
    let choiceLines = [];
    let directAnswer = '';

    if (choicesIndex >= 0) {
      questionLines = lines.slice(0, promptsIndex >= 0 ? promptsIndex : choicesIndex);
      choiceLines = lines.slice(choicesIndex + 1).filter(line => /^[A-Z][.)]\s+/.test(line));
      if (yourAnswerIndex >= 0) {
        directAnswer = lines[yourAnswerIndex].replace(/^Your Answer\s*:\s*/i, '').trim();
      }
    } else if (yourAnswerIndex >= 0) {
      questionLines = lines.slice(0, promptsIndex >= 0 ? promptsIndex : yourAnswerIndex);
      directAnswer = lines[yourAnswerIndex].replace(/^Your Answer\s*:\s*/i, '').trim();
    } else {
      return null;
    }

    let choices = choiceLines.map(line => {
      const correct = /\(SELECTED\)\s*$/i.test(line);
      return { text: line.replace(/^[A-Z][.)]\s+/, '').replace(/\s*\(SELECTED\)\s*$/i, '').trim(), correct };
    });

    if (directAnswer) {
      if (choices.length) {
        if (!choices.some(choice => choice.correct)) {
          const exactIndex = choices.findIndex(choice => normalizeAnswer(choice.text) === normalizeAnswer(directAnswer));
          if (exactIndex >= 0) {
            choices[exactIndex].correct = true;
          } else {
            const answerParts = directAnswer.split(/\s*(?:,|;|\||\band\b)\s*/i).filter(Boolean);
            answerParts.forEach(part => {
              const letterMatch = part.match(/^([A-Z])(?:[.)]|$)/i);
              const choiceIndex = letterMatch ? letterMatch[1].toUpperCase().charCodeAt(0) - 65 : -1;
              if (choiceIndex >= 0 && choices[choiceIndex]) choices[choiceIndex].correct = true;
              else {
                const textMatch = choices.find(choice => normalizeAnswer(choice.text) === normalizeAnswer(part));
                if (textMatch) textMatch.correct = true;
              }
            });
          }
        }
      } else {
        choices = [{ text: directAnswer, correct: true }];
      }
    }

    const promptEnd = choicesIndex >= 0 ? choicesIndex : yourAnswerIndex;
    const promptText = promptsIndex >= 0
      ? lines.slice(promptsIndex + 1, promptEnd).map(line => line.replace(/^\d+[.)]\s*/, '')).join(' ').trim()
      : '';
    const question = `${questionLines.join(' ').trim()}${promptText ? ` — ${promptText}` : ''}`;
    if (!question || !choices.some(choice => choice.correct)) return null;
    const correctCount = choices.filter(choice => choice.correct).length;
    const requestedCount = requestedChoiceCount(question);
    const selectionCount = requestedCount > 1 ? requestedCount : correctCount;
    const type = choiceLines.length === 0 ? 'identification' : (correctCount > 1 || selectionCount > 1 ? 'multiple' : 'single');
    return { id: blockIndex, question, choices, type, correctCount, selectionCount, topic };
  }).filter(Boolean);
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function prepareQuestions(raw) {
  let parsed = parseQuiz(raw);
  if ($('#shuffleAnswers').checked) parsed = parsed.map(question => ({ ...question, choices: shuffle(question.choices) }));
  if ($('#shuffleQuestions').checked) parsed = shuffle(parsed);
  return parsed;
}

function updateEstimate() {
  const count = parseQuiz(els.input.value).length;
  els.estimate.textContent = `${count} question${count === 1 ? '' : 's'} found`;
}

function showView(view) {
  [els.setup, els.quiz, els.results].forEach(section => section.hidden = section !== view);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchWorkspace(panelName) {
  showView(els.setup);
  document.querySelectorAll('[data-workspace-panel]').forEach(panel => {
    panel.hidden = panel.dataset.workspacePanel !== panelName;
  });
  document.querySelectorAll('.nav-tab').forEach(tab => {
    const active = tab.dataset.panel === panelName;
    tab.classList.toggle('active', active);
    if (active) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
}

function startQuiz(questionSet) {
  questions = questionSet;
  current = 0;
  score = 0;
  responses = [];
  showView(els.quiz);
  renderQuestion();
}

function renderQuestion() {
  answered = false;
  const item = questions[current];
  const percent = (current / questions.length) * 100;
  els.questionNumber.textContent = `Question ${String(current + 1).padStart(2, '0')}`;
  els.questionText.textContent = item.question;
  $('#questionInstruction').textContent = item.type === 'identification'
    ? 'Type your answer below'
    : item.type === 'multiple'
      ? `Select ${item.selectionCount} answers, then check your choices`
      : 'Choose the best answer';
  els.progressText.textContent = `Question ${current + 1} of ${questions.length}`;
  els.scoreText.textContent = `${score} correct`;
  els.progressBar.style.width = `${percent}%`;
  els.progressBar.parentElement.setAttribute('aria-valuenow', Math.round(percent));
  els.feedback.hidden = true;
  els.next.hidden = true;
  els.answers.innerHTML = '';
  els.answers.classList.toggle('dense-answers', item.type !== 'identification' && item.choices.length >= 7);
  updateKeyboardHint(item);

  if (item.type === 'identification') {
    renderIdentification(item);
    return;
  }

  item.choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'answer-button';
    button.dataset.correct = choice.correct;
    button.dataset.index = index;
    if (item.type === 'multiple') button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `<span class="answer-key">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(choice.text)}</span>`;
    button.addEventListener('click', () => item.type === 'multiple' ? toggleMultiple(button, item) : selectAnswer(button, choice));
    els.answers.appendChild(button);
  });
  if (item.type === 'multiple') {
    const submit = document.createElement('button');
    submit.type = 'button';
    submit.className = 'primary-button check-button';
    submit.textContent = 'Check selected answers';
    submit.disabled = true;
    submit.addEventListener('click', () => gradeMultiple(item));
    els.answers.appendChild(submit);
  }
  els.answers.querySelector('button')?.focus();
}

function updateKeyboardHint(item) {
  if (item.type === 'identification') {
    els.keyboardHint.innerHTML = '<kbd>Enter</kbd> to check <span>•</span> <kbd>Esc</kbd> to exit';
  } else {
    els.keyboardHint.innerHTML = '<kbd>1–9</kbd> or <kbd>A–I</kbd> to select <span>•</span> <kbd>Enter</kbd> to check or continue <span>•</span> <kbd>Esc</kbd> to exit';
  }
}

function renderIdentification(item) {
  const form = document.createElement('form');
  form.className = 'identification-form';
  form.innerHTML = `
    <label for="typedAnswer">Your answer</label>
    <div class="answer-input-row">
      <input id="typedAnswer" type="text" autocomplete="off" placeholder="Type your answer…" required>
      <button class="primary-button check-button" type="submit">Check answer</button>
    </div>`;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const input = form.querySelector('input');
    const expected = item.choices[0].text;
    const isCorrect = normalizeAnswer(input.value) === normalizeAnswer(expected);
    input.disabled = true;
    input.classList.add(isCorrect ? 'correct-input' : 'incorrect-input');
    form.querySelector('button').disabled = true;
    finishAnswer(isCorrect, isCorrect ? 'Correct — exact match.' : `Not quite — the correct answer is “${expected}”.`);
  });
  els.answers.appendChild(form);
  form.querySelector('input').focus();
}

function normalizeAnswer(value) {
  return value.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!?]+$/g, '');
}

function toggleMultiple(button, item) {
  if (answered) return;
  const selected = button.getAttribute('aria-pressed') === 'true';
  const currentCount = els.answers.querySelectorAll('.answer-button[aria-pressed="true"]').length;
  if (!selected && currentCount >= item.selectionCount) return;
  button.setAttribute('aria-pressed', String(!selected));
  button.classList.toggle('selected', !selected);
  const selectedCount = els.answers.querySelectorAll('.answer-button[aria-pressed="true"]').length;
  const submit = els.answers.querySelector('.check-button');
  submit.disabled = selectedCount !== item.selectionCount;
  submit.textContent = selectedCount === item.selectionCount
    ? 'Check selected answers'
    : `Select ${item.selectionCount - selectedCount} more`;
}

function gradeMultiple(item) {
  if (answered) return;
  const buttons = [...els.answers.querySelectorAll('.answer-button')];
  const isCorrect = buttons.every(button => (button.getAttribute('aria-pressed') === 'true') === (button.dataset.correct === 'true'));
  buttons.forEach(button => {
    button.disabled = true;
    const selected = button.getAttribute('aria-pressed') === 'true';
    button.classList.remove('selected');
    if (button.dataset.correct === 'true') {
      button.classList.add('correct');
      button.insertAdjacentHTML('beforeend', '<span class="answer-result">Correct</span>');
    } else if (selected) {
      button.classList.add('incorrect');
      button.insertAdjacentHTML('beforeend', '<span class="answer-result">Incorrect</span>');
    }
  });
  els.answers.querySelector('.check-button').disabled = true;
  finishAnswer(isCorrect, isCorrect ? 'Correct — you selected the complete set.' : 'Not quite — the correct choices are highlighted.');
}

function selectAnswer(button, choice) {
  if (answered) return;
  const isCorrect = choice.correct;
  els.answers.querySelectorAll('button').forEach(answer => {
    answer.disabled = true;
    if (answer.dataset.correct === 'true') answer.classList.add('correct');
  });
  if (!isCorrect) button.classList.add('incorrect');
  finishAnswer(isCorrect, isCorrect ? 'Correct — you’ve got it.' : 'Not quite — the correct answer is highlighted.');
}

function finishAnswer(isCorrect, message) {
  answered = true;
  if (isCorrect) score++;
  responses.push({ question: questions[current], correct: isCorrect });
  els.feedback.className = `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
  els.feedback.textContent = message;
  els.feedback.hidden = false;
  els.next.textContent = current === questions.length - 1 ? 'See results' : 'Next question';
  const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  arrow.setAttribute('viewBox', '0 0 24 24');
  arrow.setAttribute('aria-hidden', 'true');
  arrow.innerHTML = '<path d="M5 12h14M13 6l6 6-6 6"/>';
  els.next.appendChild(arrow);
  els.next.hidden = false;
  els.scoreText.textContent = `${score} correct`;
  els.next.focus();
}

function advance() {
  if (!answered) return;
  if (current < questions.length - 1) {
    current++;
    renderQuestion();
  } else showResults();
}

function showResults() {
  const total = questions.length;
  const percent = Math.round((score / total) * 100);
  $('#resultPercent').textContent = `${percent}%`;
  $('#resultRing').style.setProperty('--percent', `${percent * 3.6}deg`);
  $('#correctStat').textContent = score;
  $('#incorrectStat').textContent = total - score;
  $('#totalStat').textContent = total;
  $('#resultTitle').textContent = percent === 100 ? 'Perfect score!' : percent >= 80 ? 'Great work!' : percent >= 60 ? 'Good progress!' : 'Keep practicing!';
  $('#resultSummary').textContent = `You answered ${score} of ${total} questions correctly.`;
  $('#retryMissed').hidden = score === total;
  saveProgressAttempt();
  showView(els.results);
}

function getProgressHistory() {
  try {
    const saved = JSON.parse(safeGetItem(HISTORY_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveProgressAttempt() {
  const topicStats = {};
  responses.forEach(response => {
    const topic = response.question.topic || 'General';
    if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0 };
    topicStats[topic].total++;
    if (response.correct) topicStats[topic].correct++;
  });

  const history = getProgressHistory();
  history.unshift({
    completedAt: new Date().toISOString(),
    correct: score,
    total: questions.length,
    topics: topicStats
  });
  safeSetItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
  renderProgressDashboard();
}

function renderProgressDashboard() {
  const history = getProgressHistory();
  const empty = $('#dashboardEmpty');
  const content = $('#dashboardContent');
  const clearButton = $('#clearProgress');
  const hasHistory = history.length > 0;
  empty.hidden = hasHistory;
  content.hidden = !hasHistory;
  clearButton.hidden = !hasHistory;
  if (!hasHistory) return;

  const totals = history.reduce((summary, attempt) => {
    summary.correct += Number(attempt.correct) || 0;
    summary.questions += Number(attempt.total) || 0;
    Object.entries(attempt.topics || {}).forEach(([topic, stats]) => {
      if (!summary.topics[topic]) summary.topics[topic] = { correct: 0, total: 0 };
      summary.topics[topic].correct += Number(stats.correct) || 0;
      summary.topics[topic].total += Number(stats.total) || 0;
    });
    return summary;
  }, { correct: 0, questions: 0, topics: {} });

  const topicRows = Object.entries(totals.topics).map(([name, stats]) => ({
    name,
    correct: stats.correct,
    total: stats.total,
    accuracy: stats.total ? Math.round((stats.correct / stats.total) * 100) : 0
  })).sort((a, b) => b.accuracy - a.accuracy || b.total - a.total || a.name.localeCompare(b.name));

  $('#attemptMetric').textContent = history.length;
  $('#accuracyMetric').textContent = `${totals.questions ? Math.round((totals.correct / totals.questions) * 100) : 0}%`;
  $('#strongestMetric').textContent = topicRows[0]?.name || '—';
  $('#weakestMetric').textContent = topicRows[topicRows.length - 1]?.name || '—';

  $('#topicList').innerHTML = topicRows.map(topic => `
    <div class="topic-row">
      <span class="topic-name" title="${escapeHtml(topic.name)}">${escapeHtml(topic.name)}</span>
      <span class="topic-track" role="progressbar" aria-label="${escapeHtml(topic.name)} accuracy" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${topic.accuracy}"><span style="width:${topic.accuracy}%"></span></span>
      <span class="topic-score">${topic.accuracy}%</span>
    </div>`).join('');

  $('#attemptList').innerHTML = history.slice(0, 5).map(attempt => {
    const date = new Date(attempt.completedAt);
    const label = Number.isNaN(date.getTime()) ? 'Previous attempt' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const accuracy = attempt.total ? Math.round((attempt.correct / attempt.total) * 100) : 0;
    return `<div class="attempt-row"><span class="attempt-date">${escapeHtml(label)}</span><span class="attempt-score">${accuracy}% · ${attempt.correct}/${attempt.total}</span></div>`;
  }).join('');
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function getSavedQuizzes() {
  try {
    const saved = JSON.parse(safeGetItem(LIBRARY_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function showLibraryMessage(message, isError = false) {
  const element = $('#libraryMessage');
  element.textContent = message;
  element.hidden = false;
  element.style.color = isError ? 'var(--danger)' : '';
  element.style.background = isError ? 'var(--danger-soft)' : '';
}

function quizCardMarkup(quiz, showSubject = false) {
  const parsed = parseQuiz(quiz.content);
  const topics = [...new Set(parsed.map(question => question.topic || 'General'))];
  const updated = new Date(quiz.updatedAt);
  const dateLabel = Number.isNaN(updated.getTime()) ? 'Saved quiz' : `Updated ${updated.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const detail = showSubject ? quiz.subject : topics.join(' · ');
  return `<article class="library-card" data-quiz-id="${quiz.id}">
    <h3 title="${escapeHtml(quiz.name)}">${escapeHtml(quiz.name)}</h3>
    <p class="library-meta">${parsed.length} question${parsed.length === 1 ? '' : 's'} · ${escapeHtml(dateLabel)}</p>
    <p class="library-topics" title="${escapeHtml(detail)}">${escapeHtml(detail)}</p>
    <div class="library-actions">
      <button class="secondary-button open-quiz" type="button">Open</button>
      <button class="primary-button practice-quiz" type="button">Practice</button>
      <button class="delete-quiz" type="button" aria-label="Delete ${escapeHtml(quiz.name)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>
      </button>
    </div>
  </article>`;
}

function renderQuizLibrary(filter = $('#librarySearch').value) {
  const quizzes = getSavedQuizzes().map(quiz => ({ ...quiz, subject: quiz.subject?.trim() || 'General' }));
  const query = filter.trim().toLowerCase();
  const empty = $('#libraryEmpty');
  const grid = $('#libraryGrid');
  const subjects = [...new Set(quizzes.map(quiz => quiz.subject))].sort((a, b) => a.localeCompare(b));
  $('#libraryCount').textContent = `${quizzes.length} quiz${quizzes.length === 1 ? '' : 'zes'} · ${subjects.length} subject${subjects.length === 1 ? '' : 's'}`;
  $('#libraryBack').hidden = !activeLibrarySubject && !query;

  let markup = '';
  if (query) {
    const matches = quizzes.filter(quiz => quiz.name.toLowerCase().includes(query) || quiz.subject.toLowerCase().includes(query));
    $('#libraryTitle').textContent = 'Search results';
    markup = matches.map(quiz => quizCardMarkup(quiz, true)).join('');
    empty.textContent = 'No subjects or quizzes match your search.';
  } else if (activeLibrarySubject) {
    const subjectQuizzes = quizzes.filter(quiz => quiz.subject === activeLibrarySubject);
    $('#libraryTitle').textContent = activeLibrarySubject;
    markup = subjectQuizzes.map(quiz => quizCardMarkup(quiz)).join('');
    empty.textContent = 'This subject has no saved quizzes yet.';
  } else {
    $('#libraryTitle').textContent = 'My subjects';
    markup = subjects.map(subject => {
      const count = quizzes.filter(quiz => quiz.subject === subject).length;
      return `<button class="subject-card" type="button" data-subject="${escapeHtml(subject)}">
        <span class="subject-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h7l2 2h9v10H3Z"/><path d="M3 7V5h7l2 2"/></svg></span>
        <h3>${escapeHtml(subject)}</h3>
        <p>${count} quiz${count === 1 ? '' : 'zes'}</p>
      </button>`;
    }).join('');
    empty.textContent = 'Your subjects will appear here after you save a quiz.';
  }

  empty.hidden = Boolean(markup);
  grid.hidden = !markup;
  grid.innerHTML = markup;
}

function openSaveModal() {
  const parsed = parseQuiz(els.input.value);
  if (!parsed.length) {
    els.error.textContent = 'Paste at least one complete question before saving it.';
    els.error.hidden = false;
    els.input.focus();
    return;
  }
  const subjects = [...new Set(getSavedQuizzes().map(quiz => quiz.subject?.trim() || 'General'))].sort((a, b) => a.localeCompare(b));
  $('#subjectSuggestions').innerHTML = subjects.map(subject => `<option value="${escapeHtml(subject)}"></option>`).join('');
  $('#saveModalError').hidden = true;
  $('#saveQuizModal').hidden = false;
  document.body.classList.add('modal-open');
  ($('#quizSubject').value.trim() ? $('#quizName') : $('#quizSubject')).focus();
}

function closeSaveModal(restoreFocus = true) {
  $('#saveQuizModal').hidden = true;
  document.body.classList.remove('modal-open');
  if (restoreFocus) $('#saveQuizShortcut').focus();
}

function saveCurrentQuiz() {
  const name = $('#quizName').value.trim();
  const subject = $('#quizSubject').value.trim();
  const content = els.input.value.trim();
  const parsed = parseQuiz(content);
  const modalError = $('#saveModalError');
  if (!subject) {
    modalError.textContent = 'Enter a subject name, such as Networking.';
    modalError.hidden = false;
    $('#quizSubject').focus();
    return;
  }
  if (!name) {
    modalError.textContent = 'Give this quiz a name, such as Formative 1.';
    modalError.hidden = false;
    $('#quizName').focus();
    return;
  }
  if (!parsed.length) {
    modalError.textContent = 'The current quiz does not contain a complete question.';
    modalError.hidden = false;
    return;
  }

  const quizzes = getSavedQuizzes();
  const existing = quizzes.find(quiz => (quiz.subject?.trim() || 'General').toLowerCase() === subject.toLowerCase() && quiz.name.toLowerCase() === name.toLowerCase());
  if (existing && !window.confirm(`Replace the saved quiz “${existing.name}”?`)) return;
  const savedQuiz = {
    id: existing?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    subject,
    content,
    updatedAt: new Date().toISOString()
  };
  const next = existing ? quizzes.map(quiz => quiz.id === existing.id ? savedQuiz : quiz) : [savedQuiz, ...quizzes];
  if (!safeSetItem(LIBRARY_KEY, JSON.stringify(next))) {
    modalError.textContent = 'This browser could not save the quiz. Check whether site storage is allowed.';
    modalError.hidden = false;
    return;
  }
  $('#quizName').value = '';
  $('#quizSubject').value = '';
  $('#librarySearch').value = '';
  closeSaveModal(false);
  activeLibrarySubject = subject;
  showLibraryMessage(existing ? 'Saved quiz updated.' : 'Quiz saved to your library.');
  renderQuizLibrary('');
  switchWorkspace('library');
}

$('#loadSample').addEventListener('click', () => { els.input.value = sampleQuiz; updateEstimate(); els.input.focus(); });
els.input.addEventListener('input', updateEstimate);
$('#startQuiz').addEventListener('click', () => {
  const parsed = prepareQuestions(els.input.value);
  if (!parsed.length) {
    els.error.textContent = 'I couldn’t find a complete question. Include “Question 1”, answer choices, and mark the correct answer with “(SELECTED)”.';
    els.error.hidden = false;
    els.input.focus();
    return;
  }
  els.error.hidden = true;
  safeSetItem('learnityQuizText', els.input.value);
  startQuiz(parsed);
});
$('#nextQuestion').addEventListener('click', advance);
$('#exitQuiz').addEventListener('click', () => switchWorkspace('create'));
$('#restartQuiz').addEventListener('click', () => switchWorkspace('create'));
$('#retryMissed').addEventListener('click', () => startQuiz(responses.filter(r => !r.correct).map(r => r.question)));
$('#saveQuiz').addEventListener('click', saveCurrentQuiz);
$('#saveQuizShortcut').addEventListener('click', openSaveModal);
$('#closeSaveModal').addEventListener('click', closeSaveModal);
$('#cancelSaveQuiz').addEventListener('click', closeSaveModal);
$('#saveQuizModal').addEventListener('click', event => {
  if (event.target === $('#saveQuizModal')) closeSaveModal();
});
$('#quizSubject').addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    $('#quizName').focus();
  }
});
$('#quizName').addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    saveCurrentQuiz();
  }
});
$('#librarySearch').addEventListener('input', event => renderQuizLibrary(event.target.value));
$('#libraryBack').addEventListener('click', () => {
  activeLibrarySubject = null;
  $('#librarySearch').value = '';
  renderQuizLibrary('');
});
$('#libraryGrid').addEventListener('click', event => {
  const subjectCard = event.target.closest('.subject-card');
  if (subjectCard) {
    activeLibrarySubject = subjectCard.dataset.subject;
    renderQuizLibrary('');
    return;
  }
  const card = event.target.closest('.library-card');
  if (!card) return;
  const quizzes = getSavedQuizzes();
  const quiz = quizzes.find(item => item.id === card.dataset.quizId);
  if (!quiz) return;

  if (event.target.closest('.open-quiz')) {
    els.input.value = quiz.content;
    $('#quizName').value = quiz.name;
    $('#quizSubject').value = quiz.subject?.trim() || 'General';
    updateEstimate();
    safeSetItem('learnityQuizText', quiz.content);
    switchWorkspace('create');
    document.querySelector('.import-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
    showLibraryMessage(`Opened “${quiz.name}”.`);
  } else if (event.target.closest('.practice-quiz')) {
    const parsed = prepareQuestions(quiz.content);
    if (!parsed.length) {
      showLibraryMessage('This saved quiz no longer contains a complete question.', true);
      return;
    }
    els.input.value = quiz.content;
    updateEstimate();
    safeSetItem('learnityQuizText', quiz.content);
    startQuiz(parsed);
  } else if (event.target.closest('.delete-quiz')) {
    if (!window.confirm(`Delete “${quiz.name}” from your library?`)) return;
    const remaining = quizzes.filter(item => item.id !== quiz.id);
    safeSetItem(LIBRARY_KEY, JSON.stringify(remaining));
    showLibraryMessage('Quiz deleted.');
    renderQuizLibrary();
  }
});
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => switchWorkspace(tab.dataset.panel));
});
$('.brand').addEventListener('click', event => {
  event.preventDefault();
  switchWorkspace('create');
});
$('#clearProgress').addEventListener('click', () => {
  if (!window.confirm('Clear all saved Learnity progress? This cannot be undone.')) return;
  safeRemoveItem(HISTORY_KEY);
  renderProgressDashboard();
});

document.addEventListener('keydown', event => {
  if (!$('#saveQuizModal').hidden && event.key === 'Escape') {
    event.preventDefault();
    closeSaveModal();
    return;
  }
  const target = event.target;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;

  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !els.setup.hidden) {
    event.preventDefault();
    $('#startQuiz').click();
    return;
  }

  if (!isTyping && event.key.toLowerCase() === 't') {
    event.preventDefault();
    $('#themeToggle').click();
    return;
  }

  if (els.quiz.hidden) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    $('#exitQuiz').click();
    return;
  }

  const item = questions[current];
  if (!answered && item?.type !== 'identification' && !isTyping) {
    const numericIndex = /^[1-9]$/.test(event.key) ? Number(event.key) - 1 : -1;
    const letterIndex = /^[a-i]$/i.test(event.key) ? event.key.toLowerCase().charCodeAt(0) - 97 : -1;
    const answerIndex = numericIndex >= 0 ? numericIndex : letterIndex;
    if (answerIndex >= 0) {
      event.preventDefault();
      els.answers.querySelectorAll('.answer-button')[answerIndex]?.click();
      return;
    }
  }

  if (event.key === 'Enter' && !isTyping) {
    if (answered) {
      event.preventDefault();
      advance();
    } else if (item?.type === 'multiple') {
      const checkButton = els.answers.querySelector('.check-button');
      if (checkButton && !checkButton.disabled) {
        event.preventDefault();
        checkButton.click();
      }
    }
  }
});

const savedTheme = safeGetItem('learnityTheme') || safeGetItem('practiceTheme');
if (savedTheme === 'dark') document.documentElement.dataset.theme = 'dark';
function syncThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  $('#themeToggle').setAttribute('aria-pressed', dark);
  $('#themeToggle').setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  $('#themeColor').setAttribute('content', dark ? '#0e1218' : '#f7f9f3');
}
$('#themeToggle').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = dark ? '' : 'dark';
  safeSetItem('learnityTheme', dark ? 'light' : 'dark');
  syncThemeButton();
});
syncThemeButton();

els.input.value = safeGetItem('learnityQuizText') || safeGetItem('practiceQuizText') || '';
updateEstimate();
renderProgressDashboard();
renderQuizLibrary();
