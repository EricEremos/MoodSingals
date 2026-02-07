export type MoodOption = {
  label: string
  emoji: string
  valence: number
  arousal: number
}

export const MOODS: MoodOption[] = [
  { label: 'Calm', emoji: '🫧', valence: 1, arousal: 0 },
  { label: 'Content', emoji: '🙂', valence: 1, arousal: 0 },
  { label: 'Focused', emoji: '🎯', valence: 1, arousal: 1 },
  { label: 'Excited', emoji: '⚡', valence: 2, arousal: 2 },
  { label: 'Proud', emoji: '🏆', valence: 2, arousal: 1 },
  { label: 'Stressed', emoji: '😮‍💨', valence: -1, arousal: 2 },
  { label: 'Anxious', emoji: '😬', valence: -2, arousal: 2 },
  { label: 'Tired', emoji: '🥱', valence: -1, arousal: 0 },
  { label: 'Sad', emoji: '😔', valence: -2, arousal: 0 },
  { label: 'Irritated', emoji: '😤', valence: -1, arousal: 1 },
]

export const TAGS = [
  'work',
  'study',
  'deadline',
  'social',
  'family',
  'health',
  'travel',
  'boredom',
  'celebration',
  'money-stress',
]
