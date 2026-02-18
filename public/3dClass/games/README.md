# 🎮 Games Folder

Each clickable component image in the classroom opens its own isolated game page inside a fullscreen iframe.

---

## 📁 Folder Structure

```
games/
├── _template/        ← Copy this to start a new game
│   └── index.html
├── laptop/           ← Opens when you click the Laptop image
│   └── index.html
├── redbackpack/      ← Opens when you click the Redbackpack image
│   └── index.html
└── README.md
```

---

## ➕ How to Add a New Game (3 steps)

### Step 1 — Add the image
Drop your PNG into `ComponentImages/`.  
Example: `ComponentImages/Globe.png`

### Step 2 — Create the game folder
Create a folder in `games/` whose name matches the image filename (lowercase, no extension).  
Example: `games/globe/`

Then copy `games/_template/index.html` into it and build your game there.

```
games/
└── globe/
    └── index.html   ← your game
```

### Step 3 — Done!
Clicking the Globe image in the classroom will automatically open `games/globe/index.html`.  
No configuration needed — the routing is automatic.

---

## 🔁 Name Mapping Rules

The classroom maps image filenames → game folders automatically:

| ComponentImages file | Game folder |
|---|---|
| `Laptop.png` | `games/laptop/` |
| `Redbackpack.png` | `games/redbackpack/` |
| `Globe.png` | `games/globe/` |
| `My Cool Thing.png` | `games/my-cool-thing/` |

**Rule:** lowercase the filename, strip the extension, replace spaces/symbols with `-`.

---

## ❌ How to Remove a Game

Delete (or empty) the folder: `games/<name>/`  
The image will still be clickable but will show a browser "page not found" — so also remove the image from `ComponentImages/` if you don't want it clickable.

---

## ✏️ How to Edit a Game

Open `games/<name>/index.html` and edit freely.  
Each game is a fully self-contained HTML page — no build step required.

---

## 🔒 Close / Back Button

Every game **must** include this close logic so the ✕ button and Escape key work:

```js
function closeGame() {
  if (window.parent !== window) {
    // Running inside the classroom iframe — tell parent to close us
    window.parent.postMessage({ type: "LAHS_GAME_CLOSE" }, "*");
  } else {
    // Opened directly in a tab — go back
    history.back();
  }
}
```

The `_template/index.html` already includes this — just copy it and you're set.
