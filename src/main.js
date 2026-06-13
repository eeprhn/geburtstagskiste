import './style.css'

const DATABASE_URL = "https://geburtstagskiste-new-default-rtdb.europe-west1.firebasedatabase.app"

let allLists = []
let appData = null
let restoringHistory = false

function pushAppHistory(view) {
  if (restoringHistory) return

  const state = { view }
  if (view !== 'home' && appData?.visitorCode) {
    state.visitorCode = appData.visitorCode
  }

  let url = '#/'
  if (state.visitorCode) {
    url = `#/${view}/${state.visitorCode}`
  }

  history.pushState(state, '', url)
}

function goBack() {
  history.back()
}

async function restoreFromHistory(state) {
  restoringHistory = true
  try {
    if (!state || state.view === 'home') {
      showHome()
      return
    }

    await loadAll()
    const found = allLists.find(l => l.visitorCode === state.visitorCode)
    if (!found) {
      showHome()
      return
    }

    appData = found
    if (state.view === 'visitor') {
      showVisitor({ skipHistory: true })
    } else {
      showWishList({ skipHistory: true })
    }
  } finally {
    restoringHistory = false
  }
}

async function saveAll() {
  try {
    const response = await fetch(`${DATABASE_URL}/birthdayLists.json`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(allLists)
    })

    if (!response.ok) {
      throw new Error("Firebase Antwort war nicht OK")
    }

    console.log("✅ Firebase gespeichert:", allLists)
  } catch (error) {
    console.error("❌ Speichern fehlgeschlagen:", error)
    alert("Firebase speichern fehlgeschlagen")
  }
}

async function loadAll() {
  try {
    const response = await fetch(`${DATABASE_URL}/birthdayLists.json`)
    const data = await response.json()

    allLists = Array.isArray(data) ? data : []
    console.log("✅ Firebase geladen:", allLists)
  } catch (error) {
    console.error("❌ Laden fehlgeschlagen:", error)
    allLists = []
  }
}

function makeCode(text) {
  return text.trim().toUpperCase().replace(/\s+/g, '')
}

function createShareLink() {
  return `${window.location.origin}/?code=${encodeURIComponent(appData.visitorCode)}`
}

function showHome() {
  document.querySelector('#app').innerHTML = `
    <div class="page">
      <section class="hero">
        <div class="heroSearch">
          <img src="/Friends.png" class="searchIcon" />
          <input id="navVisitorCode" placeholder="Freunde-Code eingeben" />
          <button id="navVisitorBtn" class="codeBtn">Freunde-Wunschliste finden</button>
        </div>

        <div class="formCard">
          <h2>Erstelle deine <span class="green">Geburtstagskiste</span></h2>

          <div class="formField formFieldRow">
            <img src="/Profile.png" />
            <div>
              <div class="formFieldLabel">Spitzname des Geburtstagskindes</div>
              <input id="nickname" placeholder="z. B. Leonie" />
            </div>
          </div>

          <!-- Besucher-Code entfernt; wird automatisch generiert -->

          <div class="formField formFieldRow">
            <img src="/key.png" />
            <div>
              <div class="formFieldLabel">Kisten-Schlüssel</div>
              <input id="boxKey" placeholder="z. B. SONNE123" />
              <div class="formFieldHint">Damit kannst nur du deine Kiste bearbeiten</div>
            </div>
          </div>

            <div class="formField formFieldRow">
              <img src="/Gift.png" />
              <div>
                <div class="formFieldLabel">Geburtstagsthema</div>
              <select id="theme">
                <option>Allgemein</option>
                <option>Sport</option>
                <option>Musik</option>
                <option>Kunst</option>
                <option>Gaming</option>
                <option>Mode</option>
                <option value="__new__">➕ Neues Thema...</option>
              </select>
            </div>
          </div>

          <button id="createBtn" class="mainBtn">Meine Kiste erstellen ✨</button>
        </div>
      </section>
    </div>
  `

  document.querySelector('#navVisitorBtn').addEventListener('click', async () => {
    const code = document.querySelector('#navVisitorCode').value.trim()
    if (!code) return alert('Bitte Freunde-Code eingeben')

    await loadAll()

    const found = allLists.find(l => l.visitorCode === makeCode(code))
    if (!found) return alert('Liste nicht gefunden')

    appData = found
    showVisitor()
  })

  // Create or open existing box
document.querySelector('#createBtn').addEventListener('click', async () => {
  const nickname = document.querySelector('#nickname').value.trim()
  const boxKey = document.querySelector('#boxKey').value.trim()
  const theme = document.querySelector('#theme').value

  if (!nickname || !boxKey) {
    return alert('Bitte Spitzname und Kisten-Schlüssel eingeben.')
  }

  const existing = allLists.find(l =>
    makeCode(l.nickname) === makeCode(nickname) &&
    makeCode(l.boxKey) === makeCode(boxKey)
  )

  if (existing) {
    appData = existing
    showWishList()
    return
  }

  let base = makeCode(nickname || 'GUEST')
  let codeCheck = ''

  do {
    const rnd = Math.floor(1000 + Math.random() * 9000)
    codeCheck = base + rnd
  } while (allLists.some(l => l.visitorCode === codeCheck))

  appData = { nickname, visitorCode: codeCheck, boxKey, theme, wishes: [] }
  allLists.push(appData)

  showWishList()
  saveAll()
})
  // Allow creating a new theme from the dropdown option
  const themeSelect = document.querySelector('#theme')
  let prevTheme = themeSelect.value
  themeSelect.addEventListener('focus', () => { prevTheme = themeSelect.value })
  themeSelect.addEventListener('change', () => {
    if (themeSelect.value === '__new__') {
      const newTheme = prompt('Neues Thema eingeben:')
      if (!newTheme || !newTheme.trim()) {
        themeSelect.value = prevTheme
        return
      }
      const trimmedTheme = newTheme.trim()
      const options = Array.from(themeSelect.options).map(o => o.value)
      if (!options.includes(trimmedTheme)) {
        const newOption = document.createElement('option')
        newOption.value = trimmedTheme
        newOption.textContent = trimmedTheme
        // insert before the special new-option (last item)
        themeSelect.insertBefore(newOption, themeSelect.querySelector('option[value="__new__"]'))
        themeSelect.value = trimmedTheme
      } else {
        themeSelect.value = trimmedTheme
      }
    }
    prevTheme = themeSelect.value
  })
}

function showWishList(options = {}) {
  if (!options.skipHistory) pushAppHistory('wishlist')

  document.querySelector('#app').innerHTML = `
    <div class="page">
      <header class="nav">
        <div class="logo">
          Geburtstags<span>kiste</span>.de
        </div>

        <div style="display:flex;gap:10px;align-items:center">
          <input id="visitorCodeInput" placeholder="Freunde-Liste Code" style="height:45px;padding:10px;border-radius:12px;border:1px solid #ddd;width:150px">
          <button id="openVisitorBtn" class="codeBtn">Öffnen</button>
        </div>
      </header>

      <section class="hero" style="flex-direction:column;background-image:none;background:#f5f5f5">
        <div style="width:100%;max-width:900px;padding:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h2><span class="nameColor">${appData.nickname}s</span> Geburtstagskiste </h2>
            <button id="backBtn" class="codeBtn">← Zurück</button>
          </div>

          <div style="background:white;padding:20px;border-radius:20px;margin-bottom:20px;box-shadow:0 2px 10px rgba(0,0,0,0.05)">
           <p><strong>Code an Freunde senden:</strong> ${appData.visitorCode}</p>
           <p><strong>🔑 Kisten-Schlüssel:</strong> ${appData.boxKey}</p>

           <div class="shareBox">
             <p><strong>Teile deine Wunschliste mit Freunden:</strong></p>
             <div class="shareButtons">
               <button id="copyShareLinkBtn" class="codeBtn">Link kopieren</button>
               <button id="showQrBtn" class="codeBtn">QR-Code anzeigen</button>
             </div>
             <div id="qrBox"></div>
           </div>
           </div>

          <div style="background:white;padding:20px;border-radius:20px;box-shadow:0 2px 10px rgba(0,0,0,0.05);margin-bottom:20px">
            <h3>Füge einen Wunsch hinzu</h3>

            <label>🎁 Wunschname</label>
            <input id="wishTitle" placeholder="z. B. Lego Friends" style="width:100%;height:45px;padding:10px;border-radius:12px;border:1px solid #ddd;margin-bottom:12px" />

            <label>📝 Beschreibung</label>
            <textarea id="wishText" placeholder="Beschreibe deinen Wunsch..." style="width:100%;padding:10px;border-radius:12px;border:1px solid #ddd;margin-bottom:12px;resize:vertical;font-family:Arial,sans-serif"></textarea>

            <label>🔗 Produkt-Link (optional)</label>
            <input id="wishLink" placeholder="https://..." style="width:100%;height:45px;padding:10px;border-radius:12px;border:1px solid #ddd;margin-bottom:12px" />

            <label>🖼 Bild hochladen (optional)</label>
            <input id="wishImage" type="file" accept="image/*" style="width:100%;height:45px;padding:10px;border-radius:12px;border:1px solid #ddd;margin-bottom:12px" />
            <div id="imagePreview" style="width:100%;height:120px;border:2px dashed #ddd;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;background:#fafafa;color:#999">
              Bildvorschau
            </div>

            <button id="addWishBtn" class="mainBtn">Wunsch speichern</button>
          </div>

          <h3>Meine Wünsche (${appData.wishes.length}/20)</h3>
          <div id="wishList" style="display:grid;gap:12px"></div>
        </div>
      </section>
    </div>
  `

  document.querySelector('#backBtn').addEventListener('click', goBack)

  document.querySelector('#copyShareLinkBtn').addEventListener('click', () => {
    const shareLink = createShareLink()
    navigator.clipboard.writeText(shareLink)
    alert('Link kopiert')
  })

  document.querySelector('#showQrBtn').addEventListener('click', () => {
    const shareLink = createShareLink()
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareLink)}`
    document.querySelector('#qrBox').innerHTML = `
      <img src="${qrUrl}" alt="QR-Code zur Wunschliste" />
      <a href="${qrUrl}" download="geburtstagskiste-qr.png" class="codeBtn">QR-Code speichern</a>
      <p style="font-size:13px;color:#666;word-break:break-all">${shareLink}</p>
    `
  })

  // Open visitor
  document.querySelector('#openVisitorBtn').addEventListener('click', () => {
    const code = document.querySelector('#visitorCodeInput').value.trim()
    if (!code) return alert('Bitte Besucher-Code eingeben')
    const found = allLists.find(l => l.visitorCode === makeCode(code))
    if (!found) return alert('Liste nicht gefunden')
    appData = found
    showVisitor()
  })

  // Image preview
  let uploadedImage = ''
  document.querySelector('#wishImage').addEventListener('change', (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      uploadedImage = reader.result
      const preview = document.querySelector('#imagePreview')
      preview.innerHTML = `<img src="${uploadedImage}" style="max-width:100%;max-height:100%;border-radius:8px" />`
    }
    reader.readAsDataURL(file)
  })

  // Add wish
  document.querySelector('#addWishBtn').addEventListener('click', () => {
    const title = document.querySelector('#wishTitle').value.trim()
    const text = document.querySelector('#wishText').value.trim()
    const link = document.querySelector('#wishLink').value.trim()

    if (!title) return alert('Bitte Wunschname eingeben')
    if (appData.wishes.length >= 20) return alert('Maximal 20 Wünsche möglich')

    appData.wishes.push({
      title,
      text,
      link,
      image: uploadedImage,
      reserved: false
    })

    saveAll()

    // Clear form
    document.querySelector('#wishTitle').value = ''
    document.querySelector('#wishText').value = ''
    document.querySelector('#wishLink').value = ''
    document.querySelector('#wishImage').value = ''
    uploadedImage = ''
    document.querySelector('#imagePreview').innerHTML = 'Bildvorschau'

    renderWishes()
  })

  renderWishes()
}

function renderWishes() {
  const list = document.querySelector('#wishList')
  list.innerHTML = appData.wishes.map((wish, i) => `
    <div style="background:white;padding:15px;border-radius:15px;box-shadow:0 2px 10px rgba(0,0,0,0.05)">
      ${wish.image ? `<img src="${wish.image}" style="width:100%;max-height:150px;object-fit:cover;border-radius:10px;margin-bottom:10px" />` : ''}
      <h4 style="margin:0 0 6px 0">${wish.title}</h4>
      <p style="color:#666;margin:0 0 8px 0;font-size:14px">${wish.text}</p>
      ${wish.link ? `<p style="margin:0"><a href="${wish.link}" target="_blank">🔗 Link</a></p>` : ''}
      <button onclick="deleteWish(${i})" class="codeBtn" style="margin-top:10px;width:100%">Löschen</button>
    </div>
  `).join('')
}

window.deleteWish = function(i) {
  appData.wishes.splice(i, 1)
  saveAll()
  renderWishes()
}

function showVisitor(options = {}) {
  if (!options.skipHistory) pushAppHistory('visitor')

  document.querySelector('#app').innerHTML = `
    <div class="page">
      <header class="nav">
        <div class="logo">
          <span>Geburtstagskiste.de</span>
        </div>

        <div style="display:flex;gap:10px;align-items:center">
          <input id="visitorCodeInput" placeholder="Besucher-Code" style="height:45px;padding:10px;border-radius:12px;border:1px solid #ddd;width:150px">
          <button id="openVisitorBtn" class="codeBtn">Öffnen</button>
        </div>
      </header>

      <section class="hero" style="flex-direction:column;background-image:none;background:#f5f5f5">
        <div style="width:100%;max-width:900px;padding:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h2><span class="nameColor">${appData.nickname}s</span> Wunschliste </h2>
            <button id="backBtn" class="codeBtn">← Zurück</button>
          </div>

          <div style="background:white;padding:20px;border-radius:20px;margin-bottom:20px;box-shadow:0 2px 10px rgba(0,0,0,0.05)">
            <p><strong>Thema:</strong> ${appData.theme}</p>
          </div>

          <div style="background:white;padding:20px;border-radius:20px;margin-bottom:20px;box-shadow:0 2px 10px rgba(0,0,0,0.05)">
            <p><strong>💝 Hinweis:</strong> Bitte markiere einen Wunsch nur dann als reserviert, wenn du ihn wirklich verschenken möchtest. Falls du versehentlich geklickt hast, kannst du die Reservierung durch erneutes Anklicken wieder aufheben.</p>
          </div>

          <div id="visitorWishes" style="display:grid;gap:12px"></div>
        </div>
      </section>
    </div>
  `

  document.querySelector('#backBtn').addEventListener('click', goBack)

  // Open visitor
  document.querySelector('#openVisitorBtn').addEventListener('click', () => {
    const code = document.querySelector('#visitorCodeInput').value.trim()
    if (!code) return alert('Bitte Besucher-Code eingeben')
    const found = allLists.find(l => l.visitorCode === makeCode(code))
    if (!found) return alert('Liste nicht gefunden')
    appData = found
    showVisitor()
  })

  renderVisitorWishes()
}

function renderVisitorWishes() {
  const list = document.querySelector('#visitorWishes')
  list.innerHTML = appData.wishes.map((wish, i) => `
    <div style="background:white;padding:15px;border-radius:15px;box-shadow:0 2px 10px rgba(0,0,0,0.05);border:3px solid ${wish.reserved ? '#00D084' : 'transparent'}">
      ${wish.image ? `<img src="${wish.image}" style="width:100%;max-height:150px;object-fit:cover;border-radius:10px;margin-bottom:10px" />` : ''}
      <h4 style="margin:0 0 6px 0">${wish.title}</h4>
      <p style="color:#666;margin:0 0 8px 0;font-size:14px">${wish.text}</p>
      ${wish.link ? `<p style="margin:0"><a href="${wish.link}" target="_blank">🔗 Link</a></p>` : ''}
      <button onclick="toggleReserve(${i})" class="mainBtn" style="margin-top:10px;width:100%">
        ${wish.reserved ? '✅ Reserviert – erneut klicken zum Aufheben' : '🤍 Reservieren'}
      </button>
    </div>
  `).join('')
}

window.toggleReserve = function(i) {
  appData.wishes[i].reserved = !appData.wishes[i].reserved
  saveAll()
  renderVisitorWishes()
}

// Initialize
history.replaceState({ view: 'home' }, '', '#/')
window.addEventListener('popstate', (e) => restoreFromHistory(e.state))

showHome()

loadAll()
  .then(() => {
    const codeFromUrl = new URLSearchParams(window.location.search).get('code')

    if (codeFromUrl) {
      const found = allLists.find(l => makeCode(l.visitorCode) === makeCode(codeFromUrl))

      if (found) {
        appData = found
        showVisitor()
      } else {
        alert('Wunschliste aus Link nicht gefunden')
      }
    }

    console.log('Firebase geladen')
  })
  .catch((error) => {
    console.error('Firebase Fehler:', error)
  })