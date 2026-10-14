# RepLens user flows — review draft

Planned mobile web experience; these diagrams describe intended behavior, not implemented functionality.

Destination board: https://www.figma.com/board/WGyMKSzknb1WjZQKjZk1fG/Untitled

Current scope is the lifter-facing app. A researcher workspace is out of scope for now.

Main navigation: **Home · Live session · History · Profile**. Exercise guides are accessible from Home and camera setup. Supported live analysis starts with simultaneous two-arm dumbbell curls.

Use rounded nodes for entry/exit, rectangles for screens/actions, diamonds for decisions, and labeled branches. On FigJam, arrange the numbered flows in separate sections with consistent colors: neutral screens, teal successful outcomes, amber decisions, and coral recovery paths. Each diagram has a local Home node to avoid long lines across the board.

## 1. Account access and introduction

```mermaid
flowchart TD
  open([Open RepLens]) --> signed{Signed in?}
  signed -->|Yes| home([Home])
  signed -->|No| welcome[Welcome]
  welcome --> login[Sign in]
  welcome --> signup[Create account]
  signup --> form{Details accepted?}
  form -->|No| correct[Explain field errors or existing account]
  correct --> signup
  form -->|Yes| verify[Check email to verify account]
  verify --> link{Verification link valid?}
  link -->|No or expired| resend[Resend verification email]
  resend --> verify
  link -->|Yes| intro[Introduction: live feedback, supported curls, camera and data use]
  intro --> home
  login --> valid{Credentials accepted?}
  valid -->|No| retry[Show error and retry or recover account]
  retry --> login
  valid -->|Yes| verified{Email verified?}
  verified -->|No| verify
  verified -->|Yes| home
  login -->|Forgot password| reset[Request password reset email]
  reset --> resetlink{Reset link valid?}
  resetlink -->|No or expired| reset
  resetlink -->|Yes| password[Set new password]
  password --> login
```

## 2. Exercise guide and live-session setup

```mermaid
flowchart TD
  home([Home]) --> guide[Open curl guide]
  guide --> instructions[Exercise explanation, example and camera-position guide]
  instructions --> start[Start live session]
  home --> start
  start --> info[Explain camera processing and what is saved]
  info --> enable[Enable camera]
  enable --> permission{Permission granted?}
  permission -->|No| help[Explain browser permission steps]
  help --> choice{Try again?}
  choice -->|Yes| enable
  choice -->|No| home
  permission -->|Yes| available{Camera available?}
  available -->|No| fix[Close other camera apps or select another camera]
  fix --> enable
  available -->|Yes| preview[Camera preview and framing guide]
  preview --> visible{Both arms visible with usable tracking?}
  visible -->|No| position[Adjust position, lighting or phone placement]
  position --> preview
  visible -->|Yes| ready[Ready: Start live session]
  ready --> countdown[Countdown: move into position]
  countdown -->|Cancel| preview
  countdown --> live([Live feedback — flow 3])
```

The data-use wording must match the eventual implementation. The live-session name does not promise on-device processing or no storage. No automatic research enrollment.

## 3. Live feedback and recovery

```mermaid
flowchart TD
  start([Live session begins]) --> view[Camera preview, tracking overlay and rep count]
  view --> tracking{Tracking usable?}
  tracking -->|No| lost[Show positioning help; withhold new estimates]
  lost --> action{User choice}
  action -->|Continue trying| tracking
  action -->|End session| stop[Stop camera and live processing]
  tracking -->|Yes| rep{Complete rep detected?}
  rep -->|No| view
  rep -->|Yes| count[Update detected rep count]
  count --> service{Prediction service and model available?}
  service -->|No| unavailable[Show estimate unavailable and retry status]
  unavailable --> next{Continue or end?}
  service -->|Yes| quality{Enough reliable input for this estimate?}
  quality -->|No| insufficient[Show estimate unavailable for this rep]
  insufficient --> next
  quality -->|Yes| estimate[Display estimated reps left for the completed rep]
  estimate --> next
  next -->|Continue| view
  next -->|End session| stop
  view -->|End session at any time| stop
  view -->|Camera or browser interrupted| interrupted[Mark interruption and stop feedback]
  interrupted --> resume{Resume with camera checks or finish?}
  resume -->|Resume| checks[Recheck camera; flag movement-data gap]
  checks --> view
  resume -->|Finish| stop
  stop --> summary([Session summary — flow 4])
```

If predictions use a server, loss of connection must make stale estimates visibly unavailable. Do not invent missing reps or treat an interrupted interval as observed movement. The model must use only information available by the current rep. Actual phone performance and the feedback-delay target require testing.

## 4. Summary and history

```mermaid
flowchart TD
  ended([Session ended]) --> reps{Any complete reps detected?}
  reps -->|No| empty[Explain that there are no rep results]
  empty --> again{Try another session?}
  again -->|Yes| setup([Camera setup])
  again -->|No| home([Home])
  reps -->|Yes| summary[Rep count, available RIR estimates, speed summary and quality gaps]
  summary --> save{Save summary?}
  save -->|No| discard{Discard results?}
  discard -->|Cancel| summary
  discard -->|Confirm| home
  save -->|Yes| stored{Save successful?}
  stored -->|No| error[Explain save failure; retain current view for retry]
  error --> save
  stored -->|Yes| detail[Saved session detail]
  detail --> setup
  detail --> history[History]
  home --> history
  history --> any{Saved sessions exist?}
  any -->|No| first[Empty state: Start live session]
  first --> setup
  any -->|Yes| list[Browse sessions]
  list --> detail
  list --> compare[Compare compatible curl sets]
  compare --> list
  detail --> delete{Delete this saved summary?}
  delete -->|Cancel| detail
  delete -->|Confirm| deleted{Deletion successful?}
  deleted -->|Yes| history
  deleted -->|No| detail
```

Saving a summary does not mean saving video. Video replay is available only where an explicitly disclosed, permitted video-save option exists; it is not assumed for ordinary live sessions.

## 5. Profile and privacy

```mermaid
flowchart TD
  home([Home]) --> profile[Profile]
  profile --> edit[Edit display name]
  edit --> valid{Changes valid and saved?}
  valid -->|Yes| profile
  valid -->|No| edit
  profile --> password[Change password with identity verification]
  password --> profile
  profile --> privacy[Read camera, saved-summary and research-data information]
  privacy --> profile
  profile --> delete[Request account deletion]
  delete --> explain[Explain affected data and any applicable research-retention rules]
  explain --> confirm{Confirm and verify identity?}
  confirm -->|Cancel| profile
  confirm -->|Confirm| outcome[Show deletion status and next steps]
  profile --> logout[Sign out]
  logout --> welcome([Welcome])
```

## Decisions to resolve during implementation

- Actual phone versus server processing and behavior when connectivity is lost.
- Whether ordinary live sessions offer optional video saving at all; storage, disclosure and deletion must match the decision.
- Exact account-deletion and research-retention handling under the approved protocol.
- How much interrupted movement history each tested model needs before reliable predictions can resume.

These are review decisions, not completed product capabilities.
