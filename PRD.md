# Nodewise — Product Requirements Document

Working name: Nodewise. It can be renamed later in one step.
Inspired by: VISUEL, a mind map task manager shown in r/ProductivityApps.
This is our own build. It does not copy their code, name, or art.

Version: v1 draft, 4 Nov 2026
Status: Build v1 now.

## The problem

Most task apps are lists.
A list hides how tasks connect.

Some people think in pictures.
They plan better when they see a project and all its parts on one screen.

A trip is a good example.
"Trip to Austria" is one idea.
Under it sit Book Flight, Itinerary, Pack luggage, and Accommodation.
Under Pack luggage sit Passport, Camera, Clothing, and Phone charger.
In a list, that shape is hard to see.
On a map, it is clear at a glance.

## The idea in one line

Tasks live on a mind map.
The same tasks also appear in normal lists.
You plan on the map. You do the work from the lists.

Nothing is entered twice.
A task added on the map shows in its project list and in Today.
A task checked off in a list checks off on the map.

## Who it is for

One person in v1. Sai.
A visual thinker who wants to plan trips, home jobs, and hobbies in one place.

No account. No team use. No sharing in v1.

## What the video shows, in plain words

These are the parts worth building. They come from watching the app in the video.

1. A dark map screen. Projects sit as boxes, joined by curved lines.
2. Each project has its own colour. Its branches use that colour.
3. Tap a box to open it. Tap the plus sign to add a box inside it.
4. A quick add box asks "What's on your mind?" You type the task, add a note, and pick where it belongs.
5. A task can hold smaller tasks. Pack luggage holds Passport and Camera.
6. A task can hold a note. The Camera note says to charge both batteries the night before.
7. A task can have a date. A calendar picker sets it. You can also pick Today, Quick Wins, Morning, or Afternoon.
8. A task can have labels, such as Important or Waiting.
9. Press and hold a box and a round menu opens. It offers Schedule, Change colour, Cut, Search, and Tag.
10. A colour picker changes a branch colour and the line thickness.
11. The map can be moved, zoomed, folded, and unfolded. A folded branch hides its tasks until you open it.
12. A home screen shows smart lists: Inbox, Today, Upcoming, Not Now, Up Next, Logbook, Tags, and Deadlines.
13. The same home screen lists your areas and projects, such as Personal, Home, and Trip to Austria.
14. A project also opens as a list. You can check tasks off and drag them into a new order there.
15. A Today screen groups the day into Quick Wins, Morning, and Afternoon.

## V1 scope

Build all of this in v1:

### Map view

- Projects as root boxes on a dark canvas.
- Branches grow left or right from the root. Each root keeps its direction.
- Curved lines join parent and child. Line colour matches the root colour.
- Tap a box to select it. The selected box is outlined.
- Pan by dragging the empty canvas. Zoom with buttons, a mouse wheel, or a pinch.
- The zoom level shows on screen, as in the video (for example, 34%).
- An undo button reverses the last delete.
- Fold or unfold a branch from its box.
- Press and hold a box, or tap its round menu button, to open the round menu: Add child, Schedule, Colour, Tag, Done, and Cut.
- Colour picker with a set palette, plus line thickness: Thin, Medium, or Thick.

### Quick add and edit

- One big plus button adds a root project.
- The plus on a box adds a task inside that box.
- The edit sheet has: title, note, done check, date, time slot (Quick Wins, Morning, Afternoon, or none), labels, and its parent.
- The sheet offers "Add inside" and "Add another" so adding a run of tasks is fast.
- Delete is in the edit sheet and in the round menu. Undo brings a deleted task back.

### Project list view

- Tap a project on the home screen to open it as a list.
- The header shows the project name, its date if it has one, and its note.
- Label counts show at the top, for example "Important 2" and "Waiting 1".
- Tasks show in their tree order, indented by level.
- Check a task off. Done tasks show struck through.
- Drag a task by its handle to change its order among its brothers and sisters.
- Tap a task to edit it, or to add a note to it.

### Home screen

- Search box at the top. Search finds tasks and projects by title or note.
- Smart list cards with live counts: Inbox, Today, Upcoming, Not Now, Up Next, Logbook, Tags, and Deadlines.
- Tap a smart list to see its tasks as a simple list. Check them off there.
- Projects list below, grouped under Personal. Each row shows how many tasks are open.

### Today view

- Shows tasks dated today, plus tasks put in Not Now never shows here.
- Grouped in this order: Quick Wins, Morning, Afternoon, then Any time.
- Each row shows its labels and its project path, for example "Personal / Trip to Austria".
- Check tasks off here. The map and the project list update at once.

### Data

- Data is saved on the device, encrypted with your passcode. The encrypted copy syncs to Supabase. See Sync below.
- First open loads example data that matches the video: Home, Trip to Austria, and Hobbies, with the same tasks.
- Export saves all data as one JSON file. Import reads that file back.
- A Reset option restores the example data. It asks first.

## Out of scope for v1

- Accounts and sharing with other people. Sync between your own devices is in. See Sync.
- Push reminders. The app stores the date and slot. It does not send alerts yet.
- Calendar sync, email, and links to other apps.
- A native iPhone or Android app. V1 is a web app you add to the home screen.
- Hand drawn maps, free hand box positions, images, and file attachments.
- Paying features of any kind.

These are later choices, not v1 gaps. Sync is the most likely v2 item.

## Screens

1. Map. The first screen. The full mind map.
2. Home. Smart lists and projects.
3. Project. One project as a list.
4. Today. The day grouped by slot.
5. Smart list. One smart list as a simple task list.
6. Edit sheet. Slides up over any screen.
7. Round menu. Opens over the map for one box.

Move between Map, Home, and Today with a bottom bar.

## Look and feel

- Dark screen, near black with a purple tint, as in the video.
- Boxes are dark with a thin coloured edge. Text is white.
- The round plus button is orange. It sits at the bottom right.
- Type is a clean sans. No decoration that slows reading.
- Works on a phone first. It must also work on a desktop screen.
- Boxes never overlap. The app works out the layout itself.

## How the layout works

- Each root sits in a middle column.
- Its tasks spread left or right, one level per step.
- Each branch takes the height its tasks need. No more, no less.
- When a branch folds, its height is given back to the others.
- You do not drag boxes to set their place in v1. The app keeps the map tidy.

## Data shape

One list of nodes. Each node has:

- id: a unique string.
- title: text.
- note: text, can be empty. Lines that start with "- " show as bullets.
- parentId: the node above it, or none for a root.
- emoji: one emoji or icon character, can be empty.
- color: the branch colour. Roots set it. Children use their root colour unless changed.
- direction: roots only, left or right.
- isTask: true if it can be checked off.
- done: true or false.
- due: a date, or none.
- slot: quick, morning, afternoon, or none.
- notNow: true if parked in Not Now.
- tags: a list of short words, for example Important, Waiting.
- order: its place among its brothers and sisters.
- collapsed: true if its branch is folded.

Smart lists are worked out from these fields. They are not stored lists.

- Inbox: tasks with no date, no slot, and no tags.
- Today: due today, or slot set and not done and not parked.
- Upcoming: due after today.
- Not Now: notNow is true.
- Up Next: not done, not parked, and due within 7 days or tagged Important.
- Logbook: done tasks.
- Deadlines: not done tasks with a due date, soonest first.
- Tags: all tasks grouped by tag.

## Rules

- Checking off a parent does not check off its children. Each task is its own.
- Deleting a node deletes its whole branch. Undo restores the whole branch.
- A done task stays on the map, dimmed, until it is deleted.
- Dates use the phone local date. Today means today where the user is.
- Keep dates calm. A past due task shows "overdue by Xd" as plain text in its list row. Never as an alert, never in red.

## Sync (added Nov 5, 2026)

Sai's call: give Nodewise its own Supabase project, separate from Break down.

- Project: nodewise, ref vfgxyxftnjupuxxzsnvt, West US (Oregon), free plan, in kriskrss's Org.
- The map is encrypted in the browser with a passcode before it is stored or synced. The method is PBKDF2 plus AES-GCM, through Web Crypto. The passcode is never stored or sent. There is no passcode reset.
- Supabase holds one encrypted envelope per passcode in a vaults table. The app finds it by a locator made from the passcode. The locator string starts "nodewise/", so Nodewise and Break down can never read each other's data.
- On a new device, type the same passcode and the newest copy loads on its own. No file steps.
- Export now downloads an encrypted backup file. Import asks for that backup's passcode.
- The project's database password was generated at creation and is not held by Sai this time, at his call on Nov 5, 2026. It is not needed for the app or for dashboard work. It can be reset in the dashboard later if a direct database connection is ever wanted.
- Status Nov 5, 2026: project created, vaults table set up, anon key wired into the app, and the sync path tested end to end (write, read, delete) against the live project.

## Tech plan

- One static web app: HTML, CSS, and JavaScript. No build step.
- Hosted on GitHub Pages from the repo kriskrss/nodewise.
- Data in local storage on the device.
- Works offline once loaded.
- Add to home screen works on iPhone and Android.
- The same screens and data shape can move to a native app later with no rethink.

## Assumptions made to start the build

These were picked so the build could start. Each can be changed in one place.

1. Name: Nodewise, following the Boxwise pattern. The repo and the app use it.
2. Solo in v1. At first it was local only. On Nov 5, 2026 Sai chose sync too, done the same way as Break down. See Sync.
3. Web app on GitHub Pages, like Break down and the workout coach.
4. Layout is worked out by the app. Boxes are not free to drag in v1.
5. Example data matches the video, so the first screen looks and feels like the video.

## Done means

V1 is done when all of this is true:

- The live GitHub Pages link opens the map with the example data.
- A new task can be added on the map, in a project list, and from Today.
- A task can be checked off in any view and shows done in all views.
- A date, a slot, a tag, a note, and a branch colour can be set and saved.
- The map can be panned and zoomed, and a branch can be folded.
- Search finds a task by part of its title.
- Data is still there after the page is closed and reopened.
- Export downloads a JSON file that Import can read back.
