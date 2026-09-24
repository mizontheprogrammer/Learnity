# Practice

A private, browser-based quiz maker. Paste questions, mark correct answers with `(SELECTED)`, and start practicing immediately.

## Features

- Parses pasted multiple-choice questions
- Immediate correct/incorrect feedback
- Progress and score tracking
- Retry missed questions
- Shuffle questions and answers
- Keyboard shortcuts and accessible focus states
- Light and dark themes
- Saves quiz text locally in the browser
- Responsive layout with no build step

## Run locally

Open `index.html` in a browser, or serve the folder with any static file server.

```powershell
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Question format

```text
Question 1
What does MVC stand for?
Answer Choices:
 A. Model View Controller (SELECTED)
 B. Main Visual Component
 C. Multiple View Connection
 D. Model Version Control
```

Questions using `Your Answer: ...` are also recognized and converted into a practice question.
