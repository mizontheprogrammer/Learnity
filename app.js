const sampleQuiz = `Question 1
A developer writes all of an application's HTML directly inside controller methods using echo statements, without using any View files. Why is this generally considered poor practice under the MVC pattern?
Answer Choices:
 A. It mixes presentation code with request-handling logic, making the application harder to maintain (SELECTED)
 B. It prevents the use of static PHP arrays
 C. CodeIgniter does not allow echo inside controllers
 D. It causes routes to stop working entirely
------------------------------------------
Question 2
A developer runs composer create-project codeigniter4/appstarter myproject in the terminal. What is the most likely purpose of this command?
Answer Choices:
 A. To update an existing CodeIgniter installation
 B. To create a new CodeIgniter 4 project using Composer (SELECTED)
 C. To generate a new controller file
 D. To install XAMPP
------------------------------------------
Question 3
In a default CodeIgniter 4 installation, which folder should be set as the web server's document root for production hosting?
Answer Choices:
 A. public (SELECTED)
 B. app
 C. writable
 D. system
------------------------------------------
Question 4
What is the name of the function used inside a CodeIgniter controller to load a View file and optionally pass data to it?
Your Answer: view()
------------------------------------------
Question 5
What is the purpose of the .htaccess file in the public folder of a CodeIgniter project?
Answer Choices:
 A. It removes index.php from the URL through URL rewriting (SELECTED)
 B. It defines routes for the application
 C. It stores database credentials
 D. It configures the Composer autoloader`;

const $ = (selector) => document.querySelector(selector);
const els = {
  setup: $('#setupView'), quiz: $('#quizView'), results: $('#resultsView'), input: $('#quizInput'),
  estimate: $('#questionEstimate'), error: $('#parseError'), questionText: $('#questionText'),
  questionNumber: $('#questionNumber'), answers: $('#answers'), feedback: $('#feedback'), next: $('#nextQuestion'),
  progressText: $('#progressText'), scoreText: $('#scoreText'), progressBar: $('#progressBar')
};

let questions = [];
let current = 0;
let score = 0;
let responses = [];
let answered = false;

function normalize(text) {
  return text.replace(/\r/g, '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();
}

function parseQuiz(raw) {
  const text = normalize(raw);
  if (!text) return [];
  const blocks = text.split(/(?=^\s*Question\s+\d+\b)/gim).filter(b => /^\s*Question\s+\d+\b/i.test(b));
  return blocks.map((block, blockIndex) => {
    const cleaned = block.replace(/^-{5,}\s*$/gm, '').trim();
    const lines = cleaned.split('\n').map(line => line.trim()).filter(Boolean);
    lines.shift();
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
        choices.forEach(choice => { choice.correct = choice.text.toLowerCase() === directAnswer.toLowerCase(); });
      } else {
        choices = [{ text: directAnswer, correct: true }];
      }
    }

    const question = questionLines.join(' ').trim();
    if (!question || !choices.some(choice => choice.correct)) return null;
    return { id: blockIndex, question, choices, direct: choices.length === 1 };
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

function updateEstimate() {
  const count = parseQuiz(els.input.value).length;
  els.estimate.textContent = `${count} question${count === 1 ? '' : 's'} found`;
}

function showView(view) {
  [els.setup, els.quiz, els.results].forEach(section => section.hidden = section !== view);
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
  els.progressText.textContent = `Question ${current + 1} of ${questions.length}`;
  els.scoreText.textContent = `${score} correct`;
  els.progressBar.style.width = `${percent}%`;
  els.progressBar.parentElement.setAttribute('aria-valuenow', Math.round(percent));
  els.feedback.hidden = true;
  els.next.hidden = true;
  els.answers.innerHTML = '';

  if (item.direct) {
    const decoys = ['None of the above', 'Not available in this framework', 'This requires a database'];
    item.choices = shuffle([item.choices[0], ...decoys.map(text => ({ text, correct: false }))]);
  }

  item.choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'answer-button';
    button.dataset.correct = choice.correct;
    button.innerHTML = `<span class="answer-key">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(choice.text)}</span>`;
    button.addEventListener('click', () => selectAnswer(button, choice));
    els.answers.appendChild(button);
  });
  els.answers.querySelector('button')?.focus();
}

function selectAnswer(button, choice) {
  if (answered) return;
  answered = true;
  const isCorrect = choice.correct;
  if (isCorrect) score++;
  responses.push({ question: questions[current], correct: isCorrect });
  els.answers.querySelectorAll('button').forEach(answer => {
    answer.disabled = true;
    if (answer.dataset.correct === 'true') answer.classList.add('correct');
  });
  if (!isCorrect) button.classList.add('incorrect');
  els.feedback.className = `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
  els.feedback.textContent = isCorrect ? 'Correct — you’ve got it.' : 'Not quite — the correct answer is highlighted.';
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
  showView(els.results);
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

$('#loadSample').addEventListener('click', () => { els.input.value = sampleQuiz; updateEstimate(); els.input.focus(); });
els.input.addEventListener('input', updateEstimate);
$('#startQuiz').addEventListener('click', () => {
  let parsed = parseQuiz(els.input.value);
  if (!parsed.length) {
    els.error.textContent = 'I couldn’t find a complete question. Include “Question 1”, answer choices, and mark the correct answer with “(SELECTED)”.';
    els.error.hidden = false;
    els.input.focus();
    return;
  }
  els.error.hidden = true;
  if ($('#shuffleAnswers').checked) parsed = parsed.map(q => ({ ...q, choices: shuffle(q.choices) }));
  if ($('#shuffleQuestions').checked) parsed = shuffle(parsed);
  localStorage.setItem('practiceQuizText', els.input.value);
  startQuiz(parsed);
});
$('#nextQuestion').addEventListener('click', advance);
$('#exitQuiz').addEventListener('click', () => showView(els.setup));
$('#restartQuiz').addEventListener('click', () => showView(els.setup));
$('#retryMissed').addEventListener('click', () => startQuiz(responses.filter(r => !r.correct).map(r => r.question)));

document.addEventListener('keydown', event => {
  if (!els.quiz.hidden && !answered && /^[1-9]$/.test(event.key)) {
    els.answers.children[Number(event.key) - 1]?.click();
  } else if (!els.quiz.hidden && answered && event.key === 'Enter') advance();
});

const savedTheme = localStorage.getItem('practiceTheme');
if (savedTheme === 'dark') document.documentElement.dataset.theme = 'dark';
function syncThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  $('#themeToggle').setAttribute('aria-pressed', dark);
  $('#themeToggle').setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
}
$('#themeToggle').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = dark ? '' : 'dark';
  localStorage.setItem('practiceTheme', dark ? 'light' : 'dark');
  syncThemeButton();
});
syncThemeButton();

els.input.value = localStorage.getItem('practiceQuizText') || '';
updateEstimate();
