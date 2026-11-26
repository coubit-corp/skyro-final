import { describe, expect, it } from 'vitest'
import { timeAgo, toPost, topicLabel } from './community'

describe('timeAgo', () => {
  const now = new Date('2026-11-27T12:00:00Z')
  it('mostra minutos, horas e dias', () => {
    expect(timeAgo('2026-11-27T11:59:40Z', now)).toBe('agora')
    expect(timeAgo('2026-11-27T11:55:00Z', now)).toBe('há 5 min')
    expect(timeAgo('2026-11-27T09:00:00Z', now)).toBe('há 3 h')
    expect(timeAgo('2026-11-26T11:00:00Z', now)).toBe('há 1 dia')
    expect(timeAgo('2026-11-24T12:00:00Z', now)).toBe('há 3 dias')
  })
  it('depois de uma semana, mostra a data', () => {
    expect(timeAgo('2026-11-10T12:00:00Z', now)).toBe('10/11')
  })
})

describe('toPost', () => {
  it('conta curtidas, comentários e se eu curti', () => {
    const post = toPost(
      {
        id: 'p',
        author_id: 'a',
        topic: 'treino',
        body: 'oi',
        photos: [],
        created_at: '2026-11-27T12:00:00Z',
        community_likes: [{ user_id: 'x' }, { user_id: 'me' }],
        community_comments: [{ count: 3 }],
      },
      'me',
    )
    expect(post).toMatchObject({ likes: 2, likedByMe: true, comments: 3, topic: 'treino' })
  })
  it('sem comentários vira 0', () => {
    const post = toPost(
      { id: 'p', author_id: 'a', topic: 'geral', body: 'oi', photos: [], created_at: '', community_likes: [], community_comments: [] },
      'me',
    )
    expect(post).toMatchObject({ likes: 0, likedByMe: false, comments: 0 })
  })
})

describe('topicLabel', () => {
  it('traduz o tema', () => {
    expect(topicLabel('nutricao')).toBe('Nutrição')
  })
})
