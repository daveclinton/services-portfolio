export type AnimationVocabularyEntry = {
  id: string
  name: string
  description: string
  implementation?: AnimationImplementation
  defaults?: AnimationOptions
}

export type AnimationUnit = 's' | 'ms'

export type AnimationOptions = {
  target: 'card' | 'dot' | 'label'
  duration: number
  durationUnit: AnimationUnit
  timingFunction: string
  useSteps: boolean
  steps: number
  stepsPosition: 'start' | 'end'
  delay: number
  delayUnit: AnimationUnit
  iterationCount: number
  infinite: boolean
  direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse'
  fillMode: 'none' | 'forwards' | 'backwards' | 'both'
  manualOnly: boolean
}

export type AnimationImplementation = {
  keyframes: string
}

export type AnimationVocabularyCategory = {
  id: string
  name: string
  description: string
  entries: AnimationVocabularyEntry[]
}

export const defaultAnimationOptions: AnimationOptions = {
  target: 'card',
  duration: 700,
  durationUnit: 'ms',
  timingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
  useSteps: false,
  steps: 4,
  stepsPosition: 'end',
  delay: 0,
  delayUnit: 'ms',
  iterationCount: 1,
  infinite: false,
  direction: 'normal',
  fillMode: 'both',
  manualOnly: false,
}

function entry(
  name: string,
  description: string,
  defaults: Partial<AnimationOptions> = {}
): AnimationVocabularyEntry {
  return {
    id: name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    name,
    description,
    defaults: { ...defaultAnimationOptions, ...defaults },
  }
}

export const animationVocabulary: AnimationVocabularyCategory[] = [
  {
    id: 'entrances-exits',
    name: 'Entrances & Exits',
    description: 'How elements appear and disappear.',
    entries: [
      entry('Fade in / Fade out', 'Element appears or disappears by changing opacity.'),
      entry('Slide in', 'Element enters by sliding in from off-screen: left, right, top, or bottom.'),
      entry('Scale in', 'Element grows from smaller to full size as it appears, often paired with a fade.'),
      entry('Pop in', 'Element appears with a slight overshoot, like it bounces into place.'),
      entry('Reveal', 'Content is uncovered gradually, often by animating a clip-path or mask.'),
      entry('Enter / Exit', 'The animation an element plays when it is added to or removed from the screen.'),
    ],
  },
  {
    id: 'sequencing-timing',
    name: 'Sequencing & Timing',
    description: 'Coordinating multiple elements or moments.',
    entries: [
      entry('Keyframes', 'Defined points in an animation, such as 0%, 50%, and 100%, that the browser fills the gaps between.'),
      entry('Interpolation / Tween', 'Generating all the in-between frames between a start and end value, so motion is continuous.'),
      entry('Stagger', 'Animate several items one after another with a small delay between each, creating a cascade.'),
      entry('Orchestration', 'Deliberately timing multiple animations so they feel like one coordinated motion.'),
      entry('Delay', 'Time before an animation starts.'),
      entry('Duration', 'How long an animation takes.'),
      entry('Fill mode', "Whether an element keeps its first or last frame's styles before the animation starts or after it ends, such as forwards."),
      entry('Stepped animation', 'An animation that is divided into discrete steps, like a countdown timer.'),
    ],
  },
  {
    id: 'movement-transforms',
    name: 'Movement & Transforms',
    description: "Changing an element's position, size, or angle.",
    entries: [
      entry('Translate', 'Move an element along the X or Y axis.'),
      entry('Scale', 'Make an element bigger or smaller.'),
      entry('Rotate', 'Spin an element around a point.'),
      entry('Skew', 'Slant an element along the X or Y axis, shearing it out of its rectangular shape.'),
      entry('3D tilt / Flip', 'Rotate in 3D space with rotateX or rotateY to add depth.'),
      entry('Perspective', 'How strong the 3D effect looks. A lower value exaggerates depth, like the viewer is closer.'),
      entry('Transform origin', 'The anchor point a scale or rotation grows or spins from.'),
      entry('Origin-aware animation', 'An element animates out of its trigger, like a popover growing from the button that opened it instead of from its own center.'),
    ],
  },
  {
    id: 'transitions-between-states',
    name: 'Transitions Between States',
    description: 'Connecting one state, view, or element to another.',
    entries: [
      entry('Crossfade', 'One element fades out as another fades in, in the same spot.'),
      entry('Continuity transition', 'A change that keeps the user oriented by visually connecting before and after, such as making the same rectangle bigger or smaller.'),
      entry('Morph', 'One shape smoothly turns into another shape, such as Dynamic Island.'),
      entry('Shared element transition', 'An element travels and transforms from one position into another, like a thumbnail expanding into a card.'),
      entry('Layout animation', "When an element's size or position changes, it animates to the new spot instead of snapping."),
      entry('Accordion / Collapse', 'A section smoothly expands and collapses its height to show or hide content.'),
      entry('Direction-aware transition', 'Content slides one way going forward and the opposite way going back, so navigation has a sense of direction.'),
    ],
  },
  {
    id: 'scroll',
    name: 'Scroll',
    description: 'Motion tied to scrolling or navigating between views.',
    entries: [
      entry('Scroll reveal', 'Elements fade or slide into place as they enter the viewport.'),
      entry('Scroll-driven animation', 'An animation whose progress is tied directly to scroll position.'),
      entry('Parallax', 'Background and foreground move at different speeds while scrolling, creating depth.'),
      entry('Page transition', 'An animation that plays when navigating from one page or route to another.'),
      entry('View transition', 'The browser morphs between two states or pages, connecting shared elements.'),
    ],
  },
  {
    id: 'feedback-interaction',
    name: 'Feedback & Interaction',
    description: "Responding to the user's actions.",
    entries: [
      entry('Hover effect', 'Visual change when the cursor moves over an element.'),
      entry('Press / Tap feedback', 'A subtle scale-down when an element is clicked, so it feels physical.'),
      entry('Hold to confirm', 'A progress effect that fills up while the user holds a button.'),
      entry('Drag', 'Moving an element by grabbing it, often with momentum when released.'),
      entry('Drag to reorder', 'Dragging items in a list to rearrange them, while the others shift to make room.'),
      entry('Swipe to dismiss', 'Dragging an element off-screen to close it, like a drawer or toast.'),
      entry('Rubber-banding', 'Resistance and snap-back when you drag past a boundary, like the iOS overscroll feel.'),
      entry('Shake / Wiggle', 'A quick side-to-side jitter signaling an error or rejected input.'),
      entry('Ripple', 'A circle expanding from the point of a tap, confirming the press.'),
    ],
  },
  {
    id: 'easing',
    name: 'Easing',
    description: 'How speed changes over an animation.',
    entries: [
      entry('Easing', 'The rate at which an animation speeds up or slows down.'),
      entry('Ease-out', 'Starts fast, ends slow. The default for most UI and anything responding to the user.'),
      entry('Ease-in', 'Starts slow, ends fast. Usually avoided because it can feel sluggish.'),
      entry('Ease-in-out', 'Slow, fast, slow. Good for elements already on screen moving from A to B.'),
      entry('Linear', 'Constant speed. Avoid for UI; reserve for spinners or marquees.'),
      entry('Cubic-bezier', 'A custom easing curve you define for precise control.'),
      entry('Asymmetric easing', 'A curve that accelerates and decelerates at different rates. Feels more alive than a symmetric one.'),
    ],
  },
  {
    id: 'spring-animations',
    name: 'Spring Animations',
    description: 'Physics-based motion as an alternative to fixed-duration easing.',
    entries: [
      entry('Spring', 'Motion driven by physics: tension, mass, and damping, rather than a set duration.'),
      entry('Stiffness / Tension', 'How strongly the spring pulls toward its target. Higher feels snappier.'),
      entry('Damping', 'How quickly a spring settles. Lower damping means more bounce and oscillation.'),
      entry('Mass', 'How heavy the animated element feels. More mass makes it slower and more sluggish.'),
      entry('Bounce', 'A spring that overshoots and settles, adding playfulness.'),
      entry('Perceptual duration', 'How long a spring feels finished, even though it keeps micro-settling underneath.'),
      entry('Momentum', 'Motion that carries velocity, especially after a drag or interruption.'),
      entry('Velocity', 'How fast and in which direction an element is moving. A spring carries it into the next animation when interrupted.'),
      entry('Interruptible animation', 'An animation that can be smoothly redirected mid-flight instead of finishing first.'),
    ],
  },
  {
    id: 'looping-ambient-motion',
    name: 'Looping & Ambient Motion',
    description: 'Animations that run on their own.',
    entries: [
      entry('Marquee', 'Text or content that scrolls continuously in a loop.'),
      entry('Loop', 'An animation that repeats, a set number of times or infinitely.'),
      entry('Alternate (yoyo)', 'A loop that plays forward then reverses each iteration, instead of jumping back to the start.'),
      entry('Orbit', 'An element circling around another in a continuous path.'),
      entry('Pulse', 'A gentle repeating scale or opacity change to draw attention.'),
      entry('Float', 'A gentle, continuous up-and-down drift that makes a static element feel alive and weightless.'),
      entry('Idle animation', 'Subtle motion that plays while an element is just sitting there, waiting to be interacted with.'),
    ],
  },
  {
    id: 'polish-effects',
    name: 'Polish & Effects',
    description: 'The small touches that separate good from great.',
    entries: [
      entry('Blur', 'A blur filter used to soften an element or mask tiny imperfections.'),
      entry('Clip-path', 'Clipping an element to a shape, used for reveals, masks, and before/after sliders.'),
      entry('Mask', 'Hiding or revealing parts of an element using a shape or gradient, like clip-path but with soft, fadeable edges.'),
      entry('Before / after slider', 'A draggable divider that wipes between two overlaid images to compare them.'),
      entry('Line drawing', 'An SVG path that draws itself in, like an invisible pen tracing it.'),
      entry('Text morph', 'Text that animates character by character when it changes, drawing attention to the new value.'),
      entry('Skeleton / Shimmer', 'A placeholder with a moving sheen shown while content loads.'),
      entry('Number ticker', 'Digits rolling or counting up to a value.'),
      entry('Tabular numbers', "Fixed-width digits so numbers do not shift around as they change. Essential for tickers, timers, and counters."),
      entry('Typewriter', 'Text appearing one character at a time, as if being typed.'),
    ],
  },
  {
    id: 'performance',
    name: 'Performance',
    description: 'What keeps motion smooth instead of stuttering.',
    entries: [
      entry('Frame rate (FPS)', 'Frames drawn per second. 60fps is the baseline for smooth motion; 120fps on newer displays.'),
      entry('Jank', "Visible stutter when the browser drops frames because it cannot keep up with the animation."),
      entry('Dropped frame', 'A frame the browser missed its deadline to draw, causing a tiny hitch in motion.'),
      entry('Compositing', 'Letting the GPU move or fade an element on its own layer without redoing layout or paint.'),
      entry('will-change', 'A CSS hint that an element is about to animate, so the browser can promote it to its own layer ahead of time.'),
      entry('Layout thrashing', 'Animating properties like width, height, top, or left that force the browser to recalculate layout every frame, causing jank.'),
    ],
  },
  {
    id: 'principles-to-know',
    name: 'Principles to Know',
    description: 'Concepts that guide when and how to animate.',
    entries: [
      entry('Purposeful animation', 'Motion should serve a function: orient, give feedback, show relationships, not just decorate.'),
      entry('Anticipation', "A small wind-up in the opposite direction before a move, hinting at what's about to happen."),
      entry('Follow-through', 'Parts of an element keep moving and settle slightly after the main motion stops, adding weight.'),
      entry('Squash & stretch', 'Deforming an element as it moves to convey weight, speed, and flexibility.'),
      entry('Perceived performance', "The right animation makes an interface feel faster, even when it is not."),
      entry('Frequency of use', 'The more often a user sees an animation, the shorter and subtler it should be.'),
      entry('Spatial consistency', 'Animating so an element keeps its identity and position across states, so users never lose track of where things went.'),
      entry('Hardware acceleration', 'Animating transform and opacity lets the GPU keep motion smooth.'),
      entry('Reduced motion', "Respecting the user's prefers-reduced-motion setting by toning down or removing motion."),
    ],
  },
]

export function getAllVocabularyEntries() {
  return animationVocabulary.flatMap((category) =>
    category.entries.map((entry) => ({ category, entry }))
  )
}
