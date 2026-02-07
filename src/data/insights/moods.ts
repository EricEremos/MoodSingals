export type MoodOption = {
  label: string
  emoji: string
  valence: number
  arousal: number
}

export const MOODS: MoodOption[] = [
  { label: 'Calm', emoji: '🫧', valence: 0.6, arousal: -0.4 },
  { label: 'Content', emoji: '🙂', valence: 0.7, arousal: -0.1 },
  { label: 'Happy', emoji: '😄', valence: 0.9, arousal: 0.4 },
  { label: 'Hopeful', emoji: '🌤️', valence: 0.6, arousal: 0.2 },
  { label: 'Focused', emoji: '🎯', valence: 0.4, arousal: 0.5 },
  { label: 'Stressed', emoji: '😮‍💨', valence: -0.5, arousal: 0.6 },
  { label: 'Anxious', emoji: '😬', valence: -0.6, arousal: 0.7 },
  { label: 'Tired', emoji: '🥱', valence: -0.3, arousal: -0.5 },
  { label: 'Down', emoji: '☁️', valence: -0.7, arousal: -0.2 },
  { label: 'Irritated', emoji: '😤', valence: -0.6, arousal: 0.5 },
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
