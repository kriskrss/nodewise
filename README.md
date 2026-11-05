# Nodewise

A mind map task manager.

Plan on a map. Do the work from lists. Tasks live as boxes on a dark mind map, joined by coloured lines. The same tasks show in a project list and in a Today list. Nothing is entered twice.

Inspired by VISUEL, shown in r/ProductivityApps. This is an original build. It does not copy their code, name, or art.

## Live app

https://kriskrss.github.io/nodewise/

Open it on a phone and add it to the home screen. Data is saved in the browser on that device. No account.

## What it does

- Map: root projects with branches left or right, curved coloured lines, pan and zoom, fold a branch, press and hold a box for a round menu (add, schedule, colour, tag, done, cut).
- Quick add: title, note, date, slot (Quick Wins, Morning, Afternoon), tags such as Important or Waiting, and Not Now.
- Lists home: Inbox, Today, Upcoming, Not Now, Up Next, Logbook, Tags, and Deadlines, with live counts, plus your projects.
- Project list: check tasks off, drag to reorder, notes shown in place.
- Today: the day grouped into Quick Wins, Morning, and Afternoon.
- Search, export and import as JSON, and example data that matches the video on first open.

## Docs

- [PRD](PRD.md) — plain language product requirements, v1 scope and rules.

## Stack

One static web app: HTML, CSS, and JavaScript. No build step. Hosted on GitHub Pages.
Data stays on the device in v1 (local storage). Sync is a v2 choice.
