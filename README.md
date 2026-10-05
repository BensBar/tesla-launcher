# Parked Launcher

A tiny personal streaming launcher for a parked Tesla (built for a 2024 Model 3, also works on desktop and phone). Plain HTML, CSS and JavaScript: no build step, backend, analytics, ads, API keys, remote fonts or dependencies.

Default tiles: **YouTube TV**, **YouTube**, **Netflix**. You can add, edit, remove and reorder services in **Settings**.

Every tile is an ordinary same-tab link to the official site. No iframes, no popups.

## What this does and does not do

- It does **not** bypass DRM, subscriptions, regional limits or Tesla's parked-only video restriction.
- It does **not** log you in, and never collects or stores passwords, cookies, tokens or Google account emails.
- Separate buttons do **not** create separate login sessions. YouTube and YouTube TV are different sites but share the browser's Google sign-in state, so which account each one uses is decided on those sites. See [Separate Google accounts](#separate-google-accounts).
- It cannot guarantee Tesla Theater fullscreen. See [Fullscreen](#fullscreen).

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page, help and settings dialogs. Includes a static copy of the default links so they work even if JavaScript fails. |
| `styles.css` | Dark, touch-friendly layout. |
| `app.js` | Rendering, validation, settings, optional fullscreen. |
| `favicon.svg` | Icon. |
| `.nojekyll` | Tells GitHub Pages to serve files as-is. |

All paths are relative, so the site works at a project URL such as `https://<user>.github.io/<repo>/`.

## Publish with GitHub Pages (main branch, root)

1. Push this repository to GitHub (default branch `main`).
2. Repository **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Branch: **main**, folder: **/ (root)**. Click **Save**.
5. Wait a minute or two. The page shows the URL: `https://<your-username>.github.io/<repo-name>/`.

Command-line alternative:

```sh
gh api -X POST repos/<owner>/<repo>/pages -f 'source[branch]=main' -f 'source[path]=/'
```

### Private repository caveat

GitHub Pages from a **private** repository requires a paid plan (GitHub Pro, Team or Enterprise); free personal accounts can publish Pages only from public repositories. Also, a published Pages site is reachable by anyone who knows the URL, even when the repository is private (private Pages access control is an Enterprise Cloud feature). This project contains nothing sensitive (no accounts, no secrets), so a public repository is a reasonable choice. The page is marked `noindex`, but that is not access control.

GitHub logs visitor IP addresses for Pages sites ([GitHub Docs: What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), retrieved 2026-10-05).

## Bookmark it in the Tesla

1. While parked, open the Tesla **Web Browser** from the car's app launcher (menu names vary by software version).
2. Type your Pages URL into the address bar and open it.
3. Save it as a bookmark using the browser's bookmark control (the exact control depends on your software version).
4. Sign in to each service once on its own website.

Settings are stored in each browser's own local storage. Your phone's list and the car's list are separate. To change the defaults for every browser, edit `DEFAULT_SERVICES` in `app.js` **and** the static links in `index.html`, then push.

## Fullscreen

There are two different things:

- **Browser fullscreen**: the standard web Fullscreen API. The **Fullscreen** button appears only if the browser reports support. If the browser refuses, the page says so and everything else keeps working. Fullscreen is tied to the page, so it may end when you navigate to a streaming service.
- **Tesla Theater fullscreen**: Tesla's own borderless video view. A web page cannot request this through any standard API.

### Research on Tesla fullscreen launch methods (retrieved 2026-10-05)

I found **no Tesla-published method** for launching Theater-style fullscreen from a web page. Only community reports:

| Source | Date | What it says |
| --- | --- | --- |
| [Netflix Help Center: How to use Netflix on your Tesla display](https://help.netflix.com/en/node/112323) | undated, retrieved 2026-10-05 | Netflix is available through the Tesla touch screen when the vehicle is parked. |
| [EVBytes: Tesla Theater might be getting plenty more streaming platforms](https://www.evbytes.net/news/2026-08-28-tesla-theater-might-be-getting-plenty-more-streaming-platforms/) | 2026-08-28 | Owners report some services (Apple TV, HBO Max, Paramount+, Peacock, Disney+, Prime Video) launching in a fullscreen app-like view from the car browser. No formal Tesla release notes; Park only. Does not mention YouTube, YouTube TV or Netflix in the browser. |
| [stan1eycc/tesla-theater](https://github.com/stan1eycc/tesla-theater) (third-party GitHub project, no license, no code copied here) | created 2026-03-23 | Claims Tesla's browser grants fullscreen to YouTube, and that `youtube.com/redirect?q=<url>` opens other sites in fullscreen. Lists a limitation: not working in Park with hazards flashing. |
| [Alvaro Trigo: Tesla browser full-screen](https://alvarotrigo.com/blog/tesla-model-y-browser/) | published 2023-02-04, modified 2024-07-22 | Describes the same YouTube-redirect trick and the third-party "A Better Theater" site; notes some users say the latter no longer works. |

I tried to read Tesla's Model 3 owner's manual page for Theater, but tesla.com returned HTTP 403, so nothing here is cited from it.

**Conclusion:** the YouTube-redirect method is the only credible lead, and it is community-reported, not official, and I could not verify it on current Tesla software. **Tesla fullscreen requires in-car verification.** Desktop testing says nothing about Tesla compatibility.

### Optional experimental method

In **Settings → Launch method**, you can switch from **Direct links** (default, recommended) to **Experimental: via YouTube redirect**. Tiles then open `https://www.youtube.com/redirect?q=<encoded service link>`. Limits:

- Unofficial, may stop working at any time, and may show a YouTube "Go to site" confirmation.
- YouTube is told which link you are opening.
- Links to `youtube.com`, `www.youtube.com` and `m.youtube.com` stay direct. YouTube TV (`tv.youtube.com`) and other sites go through the redirect.
- It does not change which account a service uses.
- If it misbehaves, switch back to Direct links. Reset to defaults also switches back.

## Separate Google accounts

You use different Google accounts for YouTube and YouTube TV. This launcher cannot see, choose or isolate those accounts.

- Sign in on the official sites (`youtube.com`, `tv.youtube.com`) and pick the correct account **inside each service**.
- Both are Google services, and the car browser may share one Google sign-in state across them. You may have to switch accounts when you move between YouTube and YouTube TV, and whether the choice persists must be **tested in the car**.
- The launcher adds no account-selection URL parameters and never stores credentials or emails.
- Tip: put a hint in the tile name (for example "YouTube (personal)") but do not type an email address or password.

## In-car checklist

Do this once parked, with the car in Park and on Wi-Fi or a good connection.

**Setup**
- [ ] Launcher URL loads in the Tesla browser; layout fits the screen without scrolling.
- [ ] Bookmark is saved and reopens the launcher.
- [ ] Tapping **Settings** works; adding a test service survives closing and reopening the browser.

**YouTube TV**
- [ ] Opens in the same tab from the tile.
- [ ] Login: signed in with the intended Google account (check the profile icon).
- [ ] Playback starts and has sound.
- [ ] Fullscreen behavior noted: borderless Theater-style, ordinary browser, or neither.
- [ ] Returning to the launcher (back button or bookmark) works.

**YouTube**
- [ ] Opens in the same tab from the tile.
- [ ] Login: signed in with the intended (different) Google account.
- [ ] Playback starts and has sound.
- [ ] Fullscreen behavior noted.
- [ ] Returning to the launcher works.

**Netflix**
- [ ] Opens in the same tab from the tile; sign in on netflix.com.
- [ ] Playback starts and has sound.
- [ ] Fullscreen behavior noted.
- [ ] Returning to the launcher works.

**Accounts**
- [ ] Open YouTube, then YouTube TV, then YouTube again. Did each keep its intended account?
- [ ] After closing and reopening the browser, did each still keep its account?
- [ ] If an account switched, note what you had to do to switch back.

**Fullscreen**
- [ ] Does the **Fullscreen** button appear? If it does, does it work, and does it survive opening a service?
- [ ] Try **Experimental: via YouTube redirect** for each service. Record whether it gives Tesla fullscreen, shows a prompt, or breaks login/playback.

## Customizing and maintaining

- Defaults live in `DEFAULT_SERVICES` in `app.js` (and the static fallback in `index.html`).
- Storage key: `parked-launcher:v1` (JSON with the service list and launch method). Clearing site data resets the launcher.
- Input validation: only `http:`/`https:` links; no embedded usernames/passwords; names are 1-40 characters and always rendered as text. A link typed without a scheme gets `https://`.
- A strict Content-Security-Policy meta tag blocks inline scripts and external resources.

## Local testing

```sh
python3 -m http.server 8000   # from the repository's parent folder to mimic a project subpath
# open http://localhost:8000/<repo-folder>/
```
