# Grok Bot tasks (SpaceXSI raffle)

Per `docs/KICKOFF.md` section 9 and `docs/HUMANS.md` section 0: the SpaceXSI raffle requires Cursor as the core coding agent **plus** a Grok Bot automation, both described accurately on Devpost. This file is the ready-to-paste prompt plus a log of what the bot actually did — fill the log in after running it, and only describe on Devpost what actually happened here.

**Do not claim Grok Bot (or Cursor) use on Devpost that didn't actually happen.** If the Cursor requirement in `docs/HUMANS.md` section 0 wasn't met, skip the raffle rather than misrepresent the stack.

## Chosen task

QA-test the deployed site and file issues for anything broken — a good fit for a bot because it's mechanical, repeatable, and doesn't need deep codebase context: hit the live URL, exercise the core loop, report what fails.

## Ready-to-paste Grok Bot prompt

```
You are QA-testing a live web app for a hackathon demo. The app is T-City, deployed at:

  https://tcity-xi.vercel.app

It's a mobile-first MBTA transit game. The core loop is: join with a name and home
line -> start a ride -> see live vehicles on a map -> a line's city district grows
with points -> a delay banner can open a find-it-in-the-station hunt -> hunt/landmark
completions earn CitiTokens -> tokens redeem for perks with a QR code.

Please, on a phone-sized viewport (375x812):

1. Open the site and confirm it loads without console errors.
2. Join with a test name and pick a home line.
3. Check each of the 5 bottom-nav tabs (Ride, City, Hunt, Perks, Me) loads without
   a blank screen or crash.
4. On the Ride tab, confirm the live map renders (it may show few/no vehicles
   outside MBTA service hours - that's expected, not a bug).
5. On the City tab, confirm each of the 5 line districts renders a grid of
   building tiles.
6. On the Perks tab, try tapping "Redeem" on a perk and confirm a QR code appears.
7. Check basic accessibility: do interactive elements have visible labels, is
   text readable, are tap targets reasonably sized?

For anything broken (blank screen, console error, obviously wrong layout,
unreadable text, a button that does nothing), file a GitHub issue at
https://github.com/tandonlurk/bostonhacks_lw/issues/new with:
  - a clear title
  - steps to reproduce
  - what you expected vs. what happened
  - label it `agent:any` and `type:bug`

Do not file issues for things that are explicitly placeholder/demo content
(e.g. "coming soon" states, unverified hunt clues marked as demo content) -
those are intentional. Do not modify any code or merge anything; only observe
and file issues.
```

## Log (fill in after running)

| When | What it checked | Issues filed | Notes |
|---|---|---|---|
| <!-- TODO --> | | | |

<!-- TODO (human): after running the bot, paste a 2-3 sentence honest summary here of what it actually found, for the Devpost "how we used Grok Bot" description. -->
