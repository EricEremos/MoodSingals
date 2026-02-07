export type MoodOption = {
  label: string
  emoji: string
  valence: number
  arousal: number
}

export const MOODS: MoodOption[] = [
  { label: 'Calm', emoji: '🫧', valence: 0.6, arousal: -0.4 },
  { label: 'Relaxed', emoji: '🪷', valence: 0.7, arousal: -0.5 },
  { label: 'Content', emoji: '🙂', valence: 0.7, arousal: -0.1 },
  { label: 'Happy', emoji: '😄', valence: 0.9, arousal: 0.4 },
  { label: 'Grateful', emoji: '🙏', valence: 0.8, arousal: 0.1 },
  { label: 'Hopeful', emoji: '🌤️', valence: 0.6, arousal: 0.2 },
  { label: 'Excited', emoji: '⚡', valence: 0.8, arousal: 0.8 },
  { label: 'Motivated', emoji: '🚀', valence: 0.7, arousal: 0.6 },
  { label: 'Focused', emoji: '🎯', valence: 0.4, arousal: 0.5 },
  { label: 'Curious', emoji: '🔍', valence: 0.3, arousal: 0.4 },
  { label: 'Confident', emoji: '🛡️', valence: 0.6, arousal: 0.3 },
  { label: 'Neutral', emoji: '😐', valence: 0.0, arousal: 0.0 },
  { label: 'Bored', emoji: '🫥', valence: -0.2, arousal: -0.4 },
  { label: 'Tired', emoji: '🥱', valence: -0.3, arousal: -0.5 },
  { label: 'Restless', emoji: '🌀', valence: -0.1, arousal: 0.6 },
  { label: 'Stressed', emoji: '😮‍💨', valence: -0.5, arousal: 0.6 },
  { label: 'Anxious', emoji: '😬', valence: -0.6, arousal: 0.7 },
  { label: 'Overwhelmed', emoji: '🧯', valence: -0.7, arousal: 0.8 },
  { label: 'Irritated', emoji: '😤', valence: -0.6, arousal: 0.5 },
  { label: 'Frustrated', emoji: '😣', valence: -0.6, arousal: 0.6 },
  { label: 'Sad', emoji: '😔', valence: -0.8, arousal: -0.2 },
  { label: 'Down', emoji: '☁️', valence: -0.7, arousal: -0.2 },
  { label: 'Lonely', emoji: '🌙', valence: -0.6, arousal: -0.3 },
  { label: 'Uncertain', emoji: '❓', valence: -0.3, arousal: 0.2 },
]

export const TAGS = [
  'Work',
  'Family',
  'Social',
  'Health',
  'Money',
  'Sleep',
  'Travel',
  'Food',
  'Home',
  'Unexpected',
]
