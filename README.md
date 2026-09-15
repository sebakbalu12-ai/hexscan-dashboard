# HexScan Dashboard

Anti-cheat / forensic scanner web dashboard — sötét, modern UI (Ocean Anti-Cheat stílus), teljes
licenszkezeléssel és PIN-alapú szkennelési folyamattal.

```
dashboard/
├── package.json          # workspace szkriptek (dev / build / seed / kulcsgenerálás)
├── server/               # Express + SQLite REST API  (port: 4310)
└── web/                  # Vite + React + TypeScript + Tailwind SPA (port: 4311)
```

---

## 1. Architektúra

```
┌──────────────────────────── HexScan Web ────────────────────────────┐
│                                                                     │
│  web/ (SPA)                          server/ (REST API)             │
│  ┌─────────────────────────┐         ┌───────────────────────────┐  │
│  │ React Router            │  /api   │ Express routers           │  │
│  │  AuthContext            │ ──────► │  auth · pins · license    │  │
│  │  LicenseContext         │  fetch  │  scans · stats · admin    │  │
│  │  ToastContext           │ ◄────── │                           │  │
│  │  pages + components      │  JSON   │ middleware:               │  │
│  └─────────────────────────┘         │  requireAuth              │  │
│         ▲                            │  requireLicense  ← 402    │  │
│         │ vite proxy /api           └───────────┬───────────────┘  │
│         │                                        │                  │
└─────────┼────────────────────────────────────────┼─────────────────┘
          │                                        ▼
          │                            ┌───────────────────────┐
          │                            │ SQLite (better-sqlite3)│
          │                            │  users · sessions      │
          │                            │  licenses · pins       │
          │                            │  detections · pc_info  │
          │                            │  audit_log             │
          │                            └───────────────────────┘
          │                                        ▲
          │                                        │ POST /api/ingest/:token
          └──────── böngésző (ügyfél)              │
                                        ┌──────────┴───────────┐
                                        │ HexScan collector    │
                                        │ (a gyanúsított PC-n) │
                                        └──────────────────────┘
```

### Rétegek

| Réteg | Fájlok | Felelősség |
| --- | --- | --- |
| **Adat** | `server/src/db.js` | SQLite séma + migrációk (egy fájl, `data/hexscan.sqlite`) |
| **Domain** | `server/src/lib/{licenses,pins,plans}.js` | Licensz-életciklus, PIN-generálás, szkennelési státuszgépezet |
| **HTTP** | `server/src/routes/*.js` | REST végpontok, validáció, hibakódok |
| **Middleware** | `server/src/middleware/*.js` | `requireAuth`, `requireLicense`, hibakezelő |
| **UI mag** | `web/src/components/ui/*` | Design system: Card, Button, Badge, Modal, Toast, Toggle, Table, Progress, Radar |
| **UI réteg** | `web/src/components/{layout,pins,scan,license}/*` | Sidebar, Topbar, táblázat, PIN modalok, riport nézetek |
| **Oldalak** | `web/src/pages/*` | Login, Overview, Pins, PinDetail, Detections, Settings, Admin, Support |
| **Állapot** | `web/src/context/*` | `AuthContext` (bejelentkezés), `LicenseContext` (jogosultság), `ToastContext` |

### Állapotgép — egy PIN életúrta

```
Create Pin ──► pending ──(a collector rákapcsolódik)──► running ──► finished
                  │                                        │
                  │ 24h lejárat                             └─ verdict: cheating | legit
                  ▼
               expired
```

| Státusz | UI | Szín |
| --- | --- | --- |
| `pending` | „Waiting for the tool to connect…” + progress bar | amber |
| `running` | ugyanaz, élő progress | blue |
| `finished` | Scan Results oldal (radar, PC info, detektálások) | green / red (verdikt) |
| `expired` | letiltott sor, „Expired” pill | grey / red |

---

## 2. Licenszelési modell (kritikus üzleti logika)

| Csomag | Kulcs (`licenses.plan`) | Időtartam | PIN limit |
| --- | --- | --- | --- |
| Free | `free` | — | **0** — a *Create Pin* gomb letiltva, kattintásra upgrade popup |
| 1 hónap | `monthly` | 30 nap | végtelen |
| 3 hónap | `quarterly` | 90 nap | végtelen |
| 6 hónap | `semiannual` | 180 nap | végtelen |
| Örökös | `lifetime` | ∞ (`expires_at = NULL`) | végtelen |

- **Free tier:** bejelentkezés, dashboard, demo adatok böngészése — PIN generálás nélkül.
- **Aktiválás:** `POST /api/license/activate { key }` — a kulcs a fiókhoz kötődik (egyszer aktiválható).
- **Kikényszerítés:** a `POST /api/pins` végpont `402 { code: "LICENSE_REQUIRED" }` választ ad licensz
  nélkül, tehát a tiltás nem csak a UI-ban, hanem a szerveren is érvényes.
- **Hátralévő idő:** `GET /api/license` → `{ plan, active, expiresAt, daysRemaining, unlimited }`,
  a Beállítások oldal progress bar-t és lejárati dátumot mutat.

Kulcsformátum: `HEX-XXXXX-XXXXX-XXXXX-XXXXX` (Crockford base32, `0/O` és `1/I` nélkül).
Kulcsgenerálás (admin):

```bash
npm run key -- --plan lifetime --count 5
npm run key -- --plan monthly --note "Discord: 76jcb"
```

### 2.1 UI nézetek (referencia → route)

| Referencia képernyő | Route | Fájl |
| --- | --- | --- |
| Dashboard (Daily / Total / Pending / Finished / Expired + előző checkek) | `/dashboard` | `web/src/pages/Overview.tsx` |
| My Pins táblázat (Pin, Players, Game, Status, Result, Visibility) | `/dashboard/pins` | `web/src/pages/Pins.tsx` + `components/pins/PinsTable.tsx` |
| Create Pin ablak (Private Pin kapcsoló, RUIN/ÆGIR locked) | „Create Pin” gomb | `components/pins/CreatePinModal.tsx` |
| Pin Created Successfully (kód + Download URL + queue állapot) | létrehozás után | `components/pins/PinCreatedModal.tsx` |
| Actions legördülő (View Results / Edit / Manage Access / Delete / Copy Pin) | táblázat sor „…” | `components/pins/PinActionsMenu.tsx` |
| Waiting for the tool to connect | `/dashboard/pins/:code` (`pending`/`running`) | `components/scan/WaitingScreen.tsx` |
| Scan Results (radar, PC Information, detektálások) | `/dashboard/pins/:code` (`finished`) | `components/scan/ScanResults.tsx` + `RadarChart.tsx` |
| Detection adatbázis (severity szűrők) | `/dashboard/detections` | `web/src/pages/Detections.tsx` |
| Licenszkezelő (státusz, aktiválás, csomagok, előzmények) | `/dashboard/settings` | `web/src/pages/Settings.tsx` + `components/license/*` |
| Admin kulcsgenerátor + platform statisztika | `/dashboard/admin` | `web/src/pages/Admin.tsx` |
| Bejelentkezés / regisztráció | `/login` | `web/src/pages/Login.tsx` |

### 2.2 A fizetős kapu működése a UI-ban

1. `AuthContext` minden válaszból kiolvassa a `license` objektumot (`active`, `unlimited`, `daysRemaining`, `lifetime`).
2. A `Create Pin` gomb `canCreatePin = license.active && license.unlimited` alapján aktív vagy zárolt (`Button` + lakat ikon).
3. Zárolt állapotban a kattintás **nem** hívja a `POST /api/pins` végpontot, hanem a globális `UpgradeProvider`.
   `open()` metódusán keresztül megnyitja a `components/license/UpgradeModal`-t (1 / 3 / 6 hónapos és lifetime csomagok,
   valamint kulcsaktiválás ugyanabban az ablakban).
4. Ha a fióknak mégis sikerülne licensz nélkül hívnia az API-t, a szerver `402 LICENSE_REQUIRED`-dal válaszol, amit a
   `Pins.tsx` szintén a licenszablakra fordít le — a tiltás tehát kliens- és szerveroldalon is érvényes.
5. Aktív licensznél a fejléc badge, a Settings oldal és a `GET /api/license` egyaránt a hátralévő napokat /
   lifetime állapotot mutatja, PIN-generálás pedig korlátlan.

---

## 3. Futtatás

```bash
cd dashboard
npm install                 # server + web függőségek
npm run seed                # demo fiók + demó pinek (DEMOPIN riport)
npm run dev                 # API :4310  +  UI :4311  egyszerre
```

Demo belépés: **demo@hexscan.app / demo1234** (1 hónapos licensz)
Admin belépés: **pro@hexscan.app / demo1234** (lifetime licensz + admin, `/dashboard/admin`)
Demó licensz kulcsok (a `seed` generálja, a konzolra is kiírja): 1 / 3 / 6 hónapos és lifetime.

> **Megjegyzés a `better-sqlite3`-hoz:** natív modul, ezért a telepítéshez vagy előre fordított binary kell (Linux /
> Pterodactyl node, illetve Windows-on build eszközök), vagy Python + C++ toolchain. Ha a `npm install` emiatt elhasal,
> a `server/node_modules/better-sqlite3/index.js` egy fejlesztői shim, ami a `bun:sqlite` fölé képezi ugyanazt az API-t,
> így a szerver build nélkül is elindul. A `node_modules` git-ignored, tehát éles környezetbe sosem kerül be, és egy
> normál hoston az `npm install` automatikusan a valódi csomagra cseréli.

Éles build:

```bash
npm run build               # web/dist  +  a szerver a dist-et is kiszolgálja
npm start                   # egyetlen folyamat, egy porton (PORT env)
```

Környezeti változók (`.env` a `server/` mappában):

```env
PORT=4310
DB_PATH=./data/hexscan.sqlite
PUBLIC_BASE_URL=https://hexscan.gg      # a letöltési linkekhez
SESSION_DAYS=30
ADMIN_EMAILS=you@example.com            # admin jog a kulcsgenerátorhoz
SEED_DEMO_DATA=true
```
