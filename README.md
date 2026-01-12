# ZenWeek — Focus on 3

ZenWeek is a small, minimalist weekly todo app built with vanilla JavaScript, HTML, and CSS designed for procrastinators and habit builders: focus on only 3 important tasks per day.

## Features

- 7-day weekly view (Monday–Sunday) with current dates
- Strict 3-task limit per day with visual warnings when limit reached
- Local storage persistence (with graceful error handling and memory fallback)
- Clean minimalist UI with calming colors
- Weekly progress tracker with completion percentage
- Motivational quotes shown when tasks are completed
- Mobile-responsive grid layout
- Mark tasks complete (strikethrough)

## Usage

1. Open `index.html` in a modern browser.
2. Add up to 3 tasks per day. When you mark tasks complete, you'll see a small motivational quote.
3. Days are shown in a vertical, collapsible list (click a day header to expand its tasks and controls; today's day opens by default). By default, only one day is expanded at a time (accordion behavior); your selection is saved and restored across reloads.
4. There are small, unobtrusive controls in the bottom-right to "expand all" or "collapse all" days for quick adjustments.
5. Your tasks are saved in localStorage (in-browser) and will persist between sessions unless storage is unavailable.

## Notes on localStorage

- The app attempts to save to `localStorage`. If it is unavailable (private mode or quota errors), the app falls back to an in-memory store and shows a toast notification so you know data won't persist.

## Implementation

- Modern ES6+ features (modules, arrow functions)
- Minimal external dependencies (none)

License: MIT
