# UX/UI Refactor Plan — BhaashAI

## Design Style: The Drew Barrymore
Warm, approachable, rounded, bouncy. Translation is about human connection — the UI should feel like a helpful friend, not a tool.

## Guiding Principles
- **Warmth first**: Every screen should feel inviting (cream/terracotta accents, soft shadows, curved corners)
- **Bouncy micro-interactions**: Tap feedback, screen transitions, state changes — all animated with spring easing
- **Human-centered copy**: Replace cold errors ("Something went wrong") with warm ones ("Oops, that didn't go through — tap to retry")
- **Data-over-labels**: Make the value prominent, the label subtle (e.g., "₹99" big, "/month" small)

---

## Task List (sequential, non-breaking)

### Step 1: Color System Refinement
- Add warm secondary palette: `terracotta (#D4764A)`, `cream (#FFF8F0)`, `amber (#F59E0B)`, `sage (#84A98C)`
- Update shadows: replace black/gray with tinted versions (e.g., `rgba(255,107,0,0.15)` for primary-colored surfaces)
- Update `Colors.light` and `Colors.dark` with warmer surface tones

### Step 2: Tab Bar — Active State Enhancement
- Add icon fill animation (outline → filled on selection) using Feather icon families
- Add background highlight pill behind active tab (small capsule with primary tint)
- Add spring scale bounce on tap (0.95 → 1.0)
- Ensure ≥2 visual changes for active state (color + fill + pill background)

### Step 3: Micro-interactions Everywhere
- Add `Pressable` scale animation (0.97 → 1.0 spring) to all touchable elements
- Add `FadeInDown` / `FadeInUp` entrance animations to cards and content sections
- Add smooth tab transition animation (slide horizontal)
- Add success/failure haptics to all async operations

### Step 4: Data-over-Labels Typography
- Refactor credit display: `₹{credits.toFixed(2)}` → `₹{credits.toFixed(0)}` bold 20px, `balance` below in 10px muted
- Refactor pricing cards: make price the hero, description the secondary
- Refactor history: make credit amount the hero, transaction type the secondary

### Step 5: Warm Error/Empty States
- Add illustration component for empty states (using Feather icons as large artistic elements)
- Rewrite all error messages with warm, human copy
- Add "Oops, let's fix that" retry flows
- Empty history: warm illustration + "Your translations will appear here" → "Nothing yet! Start translating and your history will light up."

### Step 6: Credit UX — Loss Aversion
- When prompting to add credits, use loss framing: "You'll lose access to voice translation" instead of "Add credits to continue"
- Replace full-screen zero-credits overlay with bottom sheet (less aggressive)
- Add countdown or urgency element when credits are low

### Step 7: Onboarding Enhancements
- Add animated progress indicator (curved path or expanding dots)
- Add Goal Gradient: show "Day 1 of your free trial" with a visual timeline
- Add interactive element — let users tap through a sample translation on slide 2
- Use Reciprocity: show "You've already earned ₹100 free credits" before asking to sign up

### Step 8: Pricing Page — Contrast Effect
- Anchor each price next to a larger number: e.g., "₹99 — that's less than a coffee" or "₹599 — just ₹1.6/day"
- Use sensory language: "Unlock unlimited voice translation"
- Add monthly/yearly toggle with savings highlight
- Ensure no price ranges (one clear number per option)

### Step 9: Soft Tinted Shadows
- Create a shadow utility: `tintedShadow(color, opacity, radius)` returning proper shadow styles
- Replace all hardcoded `shadowColor: "#000"` with dynamically tinted versions
- Apply to cards, modals, buttons, mic button

### Step 10: Personalization — Adaptive UI
- New users (first 3 sessions): Show simplified landing with prominent "Try a translation" CTA, hide advanced features
- Returning users (4-20 sessions): Show recent languages, history snippet, daily tip
- Power users (20+ sessions): Show stats, usage graphs, advanced settings prominence
- Track session count in AsyncStorage

### Step 11: Conversation Screen Redesign
- Remove 180° rotation — use color differentiation instead (Speaker A = saffron right, Speaker B = teal/sage left)
- Add animated microphone transition when switching speakers
- Add auto-scroll to latest bubble with spring animation
- Add typing indicator while translation is processing

### Step 12: Smooth Screen Transitions
- Add `Animated.View` wrapping for all tab screens with slide/fade transitions
- Add spring-based language picker modal entrance
- Add shared element transitions for language pill → picker

### Step 13: Mic Button — Contextual Background
- When recording, tint the entire screen background to a warm pulse (subtle)
- Add waveform visualization behind mic button during recording
- Add recording duration display below mic

### Step 14: Search — Instant Suggestions
- When tapping language search in picker, show recent and popular languages immediately (not blank)
- Add "Auto Detect" as first suggestion always

### Step 15: Final Polish
- Audit all font sizes for consistency (headings 22px, body 15px, caption 12px)
- Audit all spacing for 8px grid alignment
- Add safe area handling polish
- Verify 44x44px minimum tap targets everywhere
