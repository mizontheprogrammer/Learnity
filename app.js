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
 D. It configures the Composer autoloader
------------------------------------------
Question 6
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
    return { id: blockIndex, question, choices, type, correctCount, selectionCount };
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
  localStorage.setItem('learnityQuizText', els.input.value);
  startQuiz(parsed);
});
$('#nextQuestion').addEventListener('click', advance);
$('#exitQuiz').addEventListener('click', () => showView(els.setup));
$('#restartQuiz').addEventListener('click', () => showView(els.setup));
$('#retryMissed').addEventListener('click', () => startQuiz(responses.filter(r => !r.correct).map(r => r.question)));

document.addEventListener('keydown', event => {
  if (!els.quiz.hidden && !answered && questions[current]?.type !== 'identification' && /^[1-9]$/.test(event.key)) {
    els.answers.children[Number(event.key) - 1]?.click();
  } else if (!els.quiz.hidden && answered && event.key === 'Enter') {
    event.preventDefault();
    advance();
  }
});

const savedTheme = localStorage.getItem('learnityTheme') || localStorage.getItem('practiceTheme');
if (savedTheme === 'dark') document.documentElement.dataset.theme = 'dark';
function syncThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  $('#themeToggle').setAttribute('aria-pressed', dark);
  $('#themeToggle').setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
}
$('#themeToggle').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = dark ? '' : 'dark';
  localStorage.setItem('learnityTheme', dark ? 'light' : 'dark');
  syncThemeButton();
});
syncThemeButton();

els.input.value = localStorage.getItem('learnityQuizText') || localStorage.getItem('practiceQuizText') || '';
updateEstimate();
